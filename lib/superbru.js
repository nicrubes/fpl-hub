// Superbru tab (part 2): score picks for every Premier League match, from live bookmakers' odds.
//
// The rules that stop made-up predictions (plan section 4):
//  1. No odds, no pick. A match only gets a score if real prices came back from the odds service.
//  2. Right match, right week. Only matches that haven't kicked off get odds; the odds service's match must
//     agree with the official fixture on both teams and the kick-off time.
//  3. A pick freezes at kick-off. Final scores only ever come from the official FPL results.
//  4. At least 3 bookmakers, and odds older than 24 hours are marked stale.
//  5. Prices must be sensible, outlier bookmakers are dropped, and the goals model must match the chances.
//  6. The raw prices are shown on every card.
//  7. Every sentence is filled from a data field; no field, no sentence. Nothing here is written by an AI.
//  8. The season record only counts picks frozen before kick-off.
//  9. Problems are shown in a banner on the tab and in the email.
import fs from 'node:fs';
import { api } from './api.js';
import { encryptText, decryptText } from './crypto.js';
import { pullOdds, sameTeam, consensus } from './superbru-odds.js';
import { analyse, points } from './superbru-model.js';

const HOUR = 3600e3;
const DIR = new URL('../data/superbru/', import.meta.url);
const DEF = { minBooks: 3, staleHours: 24, matchdayLeadHours: 3, kickoffToleranceMins: 60, lowCredits: 60 };
const TZ = 'Europe/London';
const F = o => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o });
const when = iso => F({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso)) + ', ' + F({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const pc = p => Math.round(p * 100) + '%';

// ---------- locked storage in data/superbru (the GitHub project is public)
async function readLocked(name, passcode) {
  const file = new URL(name, DIR);
  if (!passcode || !fs.existsSync(file)) return null;
  try { return JSON.parse(await decryptText(JSON.parse(fs.readFileSync(file, 'utf8')), passcode)); }
  catch { console.log(`Superbru: could not unlock ${name} (different passcode?) – starting it fresh.`); return null; }
}
export async function loadStore(passcode) {
  const live = (await readLocked('live.json', passcode)) || {};
  live.snaps ||= {}; live.first ||= {}; live.emailPicks ||= {};
  const gws = {};
  if (passcode && fs.existsSync(DIR)) {
    for (const f of fs.readdirSync(DIR).filter(f => /^gw-\d+\.json$/.test(f))) {
      const g = await readLocked(f, passcode);
      if (g) gws[g.gw] = g;
    }
  }
  return { live, gws, dirty: new Set() };
}
export async function saveStore(store, passcode) {
  if (!passcode || !store?.dirty.size) return 0;
  fs.mkdirSync(DIR, { recursive: true });
  for (const name of store.dirty) {
    const obj = name === 'live' ? store.live : store.gws[Number(name.slice(3))];
    fs.writeFileSync(new URL(name + '.json', DIR), JSON.stringify(await encryptText(JSON.stringify(obj), passcode)) + '\n');
  }
  const n = store.dirty.size; store.dirty.clear(); return n;
}

// ---------- when to ask for odds (each request costs 2 of the 500 free monthly credits)
export function shouldPull(live, nextKo, now) {
  if (!nextKo) return false;
  const hrs = (new Date(nextKo) - now) / HOUR;
  if (hrs > 7 * 24) return false;
  const rem = live.lastPull?.remaining ?? live.lastError?.remaining ?? null;
  if (rem != null && rem < 10) return false;
  let every = hrs <= 3 ? 1 : hrs <= 6 ? 2 : hrs <= 48 ? 6 : 12;
  if (rem != null && rem < 150 && hrs <= 3) every = 2;
  if (rem != null && rem < DEF.lowCredits) every = hrs <= 6 ? 3 : 24;
  const last = live.lastPull?.at || live.lastError?.at;
  const age = last ? (now - new Date(last)) / HOUR : Infinity;
  return age >= every - 0.25;
}

// ---------- facts for the sentences, all from the official FPL data
function teamFacts({ fixtures, classic, raw }) {
  const teams = Object.fromEntries(classic.teams.map(t => [t.id, t]));
  const done = fixtures.filter(f => f.finished && f.team_h_score != null).sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time));
  const res = {};
  for (const f of done) {
    (res[f.team_h] ||= []).push({ gf: f.team_h_score, ga: f.team_a_score, home: true });
    (res[f.team_a] ||= []).push({ gf: f.team_a_score, ga: f.team_h_score, home: false });
  }
  // expected goals for and against over the last 6 gameweeks (players' xG added up per club)
  const teamOfCode = Object.fromEntries((classic.elements || []).map(e => [e.code, e.team]));
  const draftTeam = Object.fromEntries((raw.draftElements || []).map(e => [e.id, teamOfCode[e.code]]));
  const xg = {};
  (raw.recentGws || []).forEach((gw, i) => {
    const live = raw.lives?.[i];
    if (!live?.elements || gw < 1) return;
    const per = {};
    for (const [id, el] of Object.entries(live.elements)) {
      const t = draftTeam[id]; const v = Number(el?.stats?.expected_goals || 0);
      if (t && v) per[t] = (per[t] || 0) + v;
    }
    for (const f of fixtures.filter(x => x.event === gw && x.finished)) {
      for (const [t, o] of [[f.team_h, f.team_a], [f.team_a, f.team_h]]) {
        const r = (xg[t] ||= { for: 0, against: 0, games: 0 });
        r.for += per[t] || 0; r.against += per[o] || 0; r.games += 1;
      }
    }
  });
  // missing players who matter: a regular starter, or 4+ goals and assists
  const played = id => (res[id] || []).length;
  const out = {};
  for (const e of classic.elements || []) {
    const doubt = e.status === 'd' && (e.chance_of_playing_next_round ?? 100) <= 50;
    if (!(['i', 's'].includes(e.status) || doubt)) continue;
    const big = e.minutes >= 0.45 * 90 * played(e.team) || (e.goals_scored + e.assists) >= 4;
    if (!big) continue;
    (out[e.team] ||= []).push({ name: e.web_name, minutes: e.minutes, what: e.status === 'i' ? 'injured' : e.status === 's' ? 'suspended' : `${e.chance_of_playing_next_round}%`, doubt });
  }
  for (const k in out) out[k] = out[k].sort((a, b) => b.minutes - a.minutes).slice(0, 3);
  return { teams, res, xg, missing: out };
}

function formSentence(name, rs, venue) {
  if (!rs?.length) return null;
  const l5 = rs.slice(0, 5);
  const letters = l5.map(r => (r.gf > r.ga ? 'W' : r.gf === r.ga ? 'D' : 'L')).reverse(); // oldest first, latest last
  const w = letters.filter(x => x === 'W').length;
  const run = w === 0 ? `are without a win in their last ${l5.length}` : `have won ${w} of their last ${l5.length}`;
  let s = `${name} ${run} (${letters.join(' ')}), scoring ${l5.reduce((s, r) => s + r.gf, 0)} and conceding ${l5.reduce((s, r) => s + r.ga, 0)}.`;
  const v = rs.filter(r => r.home === (venue === 'home')).slice(0, 5);
  if (v.length >= 3) {
    const vw = v.filter(r => r.gf > r.ga).length, vd = v.filter(r => r.gf === r.ga).length;
    s += ` ${venue === 'home' ? 'At home' : 'Away'} they've won ${vw} and drawn ${vd} of their last ${v.length}.`;
  }
  return s;
}
function xgSentence(name, x) {
  if (!x || x.games < 3) return null;
  return `Over their last ${x.games} games ${name} have averaged ${(x.for / x.games).toFixed(1)} expected goals and allowed ${(x.against / x.games).toFixed(1)}.`;
}
function missingSentence(name, list) {
  if (!list?.length) return null;
  const and = xs => xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1) : xs[0];
  const out = list.filter(p => !p.doubt), dbt = list.filter(p => p.doubt);
  const parts = [];
  if (out.length) parts.push(`${name} are without ${and(out.map(p => `${p.name} (${p.what})`))}`);
  if (dbt.length) parts.push(`${out.length ? '' : name + ': '}${and(dbt.map(p => `${p.name} (${p.what} chance)`))} ${dbt.length > 1 ? 'are' : 'is'} doubtful`);
  return parts.join('; ') + '.';
}

// ---------- one open match: odds snapshot -> pick + sentences
function liveMatch(fx, snap, facts, ctx) {
  const home = facts.teams[fx.team_h].name, away = facts.teams[fx.team_a].name;
  const m = { fid: fx.id, home, away, hs: facts.teams[fx.team_h].short_name, as: facts.teams[fx.team_a].short_name, kickoff: fx.kickoff_time };
  const formLines = [formSentence(home, facts.res[fx.team_h], 'home'), formSentence(away, facts.res[fx.team_a], 'away')].filter(Boolean);
  if (!snap || snap.error) {
    m.noPick = { kind: ctx.next && !snap ? 'notyet' : 'none', reason: snap?.error || (ctx.next ? 'Bookmakers haven\'t priced this match yet.' : 'No odds were found for this match.') };
    m.story = formLines;
    return m;
  }
  const a = analyse(snap.c);
  if (a.error) { m.noPick = { kind: 'none', reason: `No pick: ${a.error}.` }; m.story = formLines; return m; }
  m.a = {
    pH: a.pH, pD: a.pD, pA: a.pA, pOver: a.pOver, tg: a.tg, xh: a.xh, xa: a.xa, fav: a.fav,
    pick: [a.pick.h, a.pick.a], pickP: a.pick.p, pickEv: a.pick.ev, alt: [a.alt.h, a.alt.a], altEv: a.alt.ev,
    prices: snap.c.prices, books: snap.c.books, pulled: snap.at,
  };
  m.conf = a.conf;
  m.pickText = `${a.pick.h}-${a.pick.a}`;
  m.resultName = a.fav === 0 ? 'Draw' : `${a.fav === 1 ? home : away} win`;
  const favName = a.fav === 1 ? home : a.fav === -1 ? away : null;
  const favP = Math.max(a.pH, a.pD, a.pA);
  const s0 = favP < 0.45
    ? `Bookmakers can barely split them: ${home} ${pc(a.pH)}, draw ${pc(a.pD)}, ${away} ${pc(a.pA)}, with about ${a.tg.toFixed(1)} goals expected.`
    : `Bookmakers make ${favName ? favName + ' ' + pc(favP) + ' favourites' : 'a draw the most likely result (' + pc(favP) + ')'} and expect about ${a.tg.toFixed(1)} goals.`;
  m.news = [missingSentence(home, facts.missing[fx.team_h]), missingSentence(away, facts.missing[fx.team_a])].filter(Boolean);
  const story = [s0, ...formLines, xgSentence(home, facts.xg[fx.team_h]), xgSentence(away, facts.xg[fx.team_a]), ...m.news];
  const first = ctx.first;
  if (first) {
    const now = a.fav === 1 ? a.pH : a.fav === -1 ? a.pA : a.pD, was = a.fav === 1 ? first.pH : a.fav === -1 ? first.pA : first.pD;
    if (Math.abs(now - was) >= 0.05) story.push(`${favName ? favName + '\'s chance' : 'The chance of a draw'} has moved from ${pc(was)} to ${pc(now)} since ${when(first.at)}.`);
  }
  m.story = story.filter(Boolean);
  m.tie = `The odds make ${a.fav === 0 ? 'a draw' : (a.fav === 1 ? home : away) + ' winning'} most likely, and ${m.pickText} earns the most points on average of those scores (${a.pick.ev.toFixed(2)}). Next best: ${a.alt.h}-${a.alt.a}.`;
  if (ctx.staleHours && ctx.now - new Date(snap.at) > ctx.staleHours * HOUR && !ctx.frozen) m.a.stale = true;
  return m;
}

// ---------- the round summary (plain sentences from the numbers)
function roundSummary(w, prevWeek) {
  const out = [];
  const odds = w.matches.filter(m => m.a);
  const favP = m => Math.max(m.a.pH, m.a.pD, m.a.pA);
  const label = m => `${m.home} ${m.pickText} ${m.away}`;
  if (w.status === 'played') {
    const scored = odds.filter(m => m.pts != null);
    if (scored.length) {
      const best = [...scored].sort((x, y) => y.pts - x.pts || favP(x) - favP(y))[0];
      out.push(['The round', `${w.total} points from ${scored.length} picks, ${w.exact} exact score${w.exact === 1 ? '' : 's'}. Best call: ${label(best)} (result ${best.res.join('-')}, ${best.pts} pts).`]);
      const miss = scored.filter(m => m.pts === 0);
      if (miss.length) out.push(['Missed', miss.map(m => `${m.home} ${m.res.join('-')} ${m.away} (picked ${m.pickText})`).join('; ') + '.']);
    }
    const none = w.matches.filter(m => !m.a);
    if (none.length) out.push(['No pick', none.map(m => `${m.home} v ${m.away}`).join(', ') + '.']);
    return out;
  }
  if (!odds.length) return [['Waiting for odds', 'No bookmakers have priced this round yet. Picks appear as soon as they do.']];
  const open = odds.filter(m => m.state === 'open');
  if (open.length) {
    out.push(['Safest picks', [...open].sort((x, y) => favP(y) - favP(x)).slice(0, 3).map(m => `${label(m)} (${pc(favP(m))})`).join(', ') + '.']);
    const toss = open.filter(m => favP(m) < 0.45);
    if (toss.length) out.push(['Toss-ups', toss.map(m => `${m.home} v ${m.away} (${pc(m.a.pH)} / ${pc(m.a.pD)} / ${pc(m.a.pA)})`).join(', ') + '. Picks here are worth little more than a result point.']);
    const up = open.filter(m => favP(m) >= 0.45 && m.a.fav !== 0).map(m => ({ m, u: m.a.fav === 1 ? m.a.pA : m.a.pH })).sort((x, y) => y.u - x.u)[0];
    if (up && up.u >= 0.2) out.push(['Upset watch', `${up.m.a.fav === 1 ? up.m.away : up.m.home} win ${pc(up.u)} of the time at these prices (${up.m.home} v ${up.m.away}).`]);
    const g = [...open].sort((x, y) => y.a.tg - x.a.tg);
    if (g.length > 1) out.push(['Goals', `Most expected: ${g[0].home} v ${g[0].away} (${g[0].a.tg.toFixed(1)}). Fewest: ${g.at(-1).home} v ${g.at(-1).away} (${g.at(-1).a.tg.toFixed(1)}).`]);
    const news = open.flatMap(m => m.news || []);
    if (news.length) out.push(['Team news', news.join(' ')]);
  }
  const changed = w.matches.filter(m => m.prev);
  if (changed.length) out.push(['Changed since the email', changed.map(m => `${m.home} v ${m.away}: now ${m.pickText} (was ${m.prev})`).join('; ') + '.']);
  const stale = w.matches.filter(m => m.a?.stale && m.state === 'open');
  if (stale.length) out.push(['Stale odds', `${stale.length} pick${stale.length === 1 ? ' uses' : 's use'} odds more than a day old. Check again nearer kick-off.`]);
  const none = w.matches.filter(m => !m.a && m.state === 'open');
  if (none.length) out.push([w.status === 'next' ? 'Waiting for odds' : 'No pick', none.map(m => `${m.home} v ${m.away}`).join(', ') + (w.status === 'next' ? '. Picks appear once bookmakers price them.' : '. No usable odds, so no pick. Enter your own or leave it.')]);
  const scored = w.matches.filter(m => m.pts != null);
  if (scored.length) out.push(['So far', `${w.total} points from ${scored.length} finished match${scored.length === 1 ? '' : 'es'}, ${w.exact} exact.`]);
  if (w.status === 'current' && prevWeek?.status === 'played') out.push(['Last round', `GW${prevWeek.gw}: ${prevWeek.total} points, ${prevWeek.exact} exact.`]);
  return out;
}

const oddsLine = m => `Home ${m.a.prices.h.toFixed(2)} / Draw ${m.a.prices.d.toFixed(2)} / Away ${m.a.prices.a.toFixed(2)}` + (m.a.prices.o25 ? ` · Over 2.5 ${m.a.prices.o25.toFixed(2)}` : '');

function copyText(w) {
  return [`GW${w.gw} Superbru picks`, ...w.matches.map(m => `${m.home} ${m.pickText || '–'} ${m.away}${m.a ? (m.a.stale ? ' (stale odds)' : '') : ' (no odds, no pick)'}`)].join('\n');
}
function claudeText(w) {
  const pulled = w.matches.filter(m => m.a).map(m => m.a.pulled).sort().at(-1);
  const stamp = pulled ? when(pulled) + ' (UK time)' : 'not yet';
  const lines = [
    `Please write a short analysis of my Superbru picks for Premier League GW${w.gw}.`,
    'Rules:',
    '- Use ONLY the fact sheet below. Do not search the web or use news from memory.',
    '- Do not change, second-guess or re-pick any score. The picks come from the betting odds.',
    '- A match marked "no odds" stays "no odds". Do not estimate odds for it.',
    '- If something is not in the fact sheet, say "not in the data" rather than guess.',
    `- End with: "Every number above is from the fact sheet, odds pulled ${stamp}."`,
    '',
    `FACT SHEET – GW${w.gw}, odds pulled ${stamp}`,
  ];
  w.matches.forEach((m, i) => {
    lines.push('', `${i + 1}. ${m.home} v ${m.away}, ${when(m.kickoff)}`);
    if (m.res) lines.push(`   Final score ${m.res.join('-')}.`);
    if (!m.a) { lines.push('   No odds – no pick.'); m.story.forEach(s => lines.push('   ' + s)); return; }
    lines.push(`   Pick ${m.pickText} (${m.conf[1]}). Chances: ${m.home} ${pc(m.a.pH)}, draw ${pc(m.a.pD)}, ${m.away} ${pc(m.a.pA)}. Goals expected ${m.a.tg.toFixed(1)}. Exact-score chance ${pc(m.a.pickP)}.`);
    lines.push(`   Prices: ${oddsLine(m)} (${m.a.books} bookmakers).`);
    m.story.slice(1).forEach(s => lines.push('   ' + s));
  });
  return lines.join('\n');
}

// ---------- main
export async function buildSuperbru({ cfg = {}, raw, now = new Date(), key = null, store, fixtures: fxIn = null, pull: pullFn = pullOdds }) {
  const C = { ...DEF, ...(cfg.superbru || {}) };
  const classic = raw.classic;
  if (!classic?.teams) throw new Error('the official FPL team list could not be read');
  const fixtures = (fxIn || await api.allFixtures()).filter(f => f.event && f.kickoff_time);
  const facts = teamFacts({ fixtures, classic, raw });
  const started = f => f.started || now >= new Date(f.kickoff_time);
  const live = store.live;
  const banner = [];
  const log = [];

  // rule 2: only rounds that aren't finished; current = the earliest round with a match still to finish
  const unfinished = fixtures.filter(f => !f.finished);
  if (!unfinished.length) return { model: { none: true, message: 'The season is over.' }, log };
  const current = Math.min(...unfinished.map(f => f.event));
  const nextGw = fixtures.some(f => f.event === current + 1) ? current + 1 : null;
  const roundFx = gw => fixtures.filter(f => f.event === gw).sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time) || a.id - b.id);
  const openFx = [...roundFx(current), ...(nextGw ? roundFx(nextGw) : [])].filter(f => !started(f));
  const nextKo = openFx.map(f => f.kickoff_time).sort()[0] || null;

  // ---------- odds
  if (!key) banner.push(['bad', 'No odds key found (GitHub secret ODDS_API_KEY), so there are no new picks. Old picks stay as they were.']);
  else if (shouldPull(live, nextKo, now)) {
    try {
      const pull = await pullFn(key);
      live.lastPull = { at: pull.at, remaining: pull.remaining, used: pull.used };
      live.lastError = null;
      const unknown = new Set();
      for (const ev of pull.events) {
        if (!classic.teams.some(t => sameTeam(ev.home_team, t.name))) unknown.add(ev.home_team);
        if (!classic.teams.some(t => sameTeam(ev.away_team, t.name))) unknown.add(ev.away_team);
      }
      if (unknown.size) log.push('Team names not recognised: ' + [...unknown].join(', '));
      for (const f of openFx) {
        const h = facts.teams[f.team_h].name, a = facts.teams[f.team_a].name;
        const evs = pull.events.filter(e => sameTeam(e.home_team, h) && sameTeam(e.away_team, a));
        const ev = evs.find(e => Math.abs(new Date(e.commence_time) - new Date(f.kickoff_time)) <= C.kickoffToleranceMins * 60e3);
        let snap;
        if (!evs.length) snap = live.snaps[f.id]?.c ? null : { at: pull.at, error: 'No odds were found for this match.' };
        else if (!ev) snap = { at: pull.at, error: `Kick-off times don't match (bookmakers say ${when(evs[0].commence_time)}), so no pick until they agree.` };
        else {
          const c = consensus(ev, { minBooks: C.minBooks });
          snap = c.error ? { at: pull.at, error: `No pick: ${c.error}.` } : { at: pull.at, c };
        }
        if (snap) live.snaps[f.id] = snap;
        if (snap?.c && !live.first[f.id]) live.first[f.id] = { at: pull.at, pH: snap.c.pH, pD: snap.c.pD, pA: snap.c.pA };
      }
      store.dirty.add('live');
      log.push(`Odds pulled: ${pull.events.length} matches, ${pull.remaining ?? '?'} credits left this month.`);
    } catch (err) {
      live.lastError = { at: now.toISOString(), message: err.message, remaining: err.remaining ?? live.lastPull?.remaining ?? null };
      store.dirty.add('live');
      log.push('Odds pull failed: ' + err.message);
    }
  }
  if (live.lastError && (!live.lastPull || new Date(live.lastError.at) > new Date(live.lastPull.at)))
    banner.push(['bad', `The odds service had a problem at ${when(live.lastError.at)}: ${live.lastError.message}. Picks below use the last good odds${live.lastPull ? ' from ' + when(live.lastPull.at) : ''}.`]);
  const rem = live.lastPull?.remaining;
  if (rem != null && rem < C.lowCredits) banner.push(['warn', `Only ${rem} odds credits left this month, so updates have slowed down. They reset at the start of next month.`]);

  // ---------- rule 3: freeze picks at kick-off; add official final scores
  for (const f of [...roundFx(current), ...(nextGw ? roundFx(nextGw) : [])].filter(started)) {
    const gw = f.event;
    const g = (store.gws[gw] ||= { gw, matches: {} });
    if (g.matches[f.id]) continue;
    const snap = live.snaps[f.id];
    const usable = snap?.c && new Date(snap.at) < new Date(f.kickoff_time);
    const m = liveMatch(f, usable ? snap : (snap?.error ? snap : { at: null, error: 'No odds were saved before kick-off, so there was no pick.' }), facts, { first: live.first[f.id], frozen: true });
    const prev = live.emailPicks[gw]?.[f.id];
    if (prev && m.pickText && prev !== m.pickText) m.prev = prev;
    m.frozenAt = now.toISOString();
    g.matches[f.id] = m;
    delete live.snaps[f.id]; delete live.first[f.id];
    store.dirty.add('gw-' + gw); store.dirty.add('live');
  }
  const fxById = Object.fromEntries(fixtures.map(f => [f.id, f]));
  for (const g of Object.values(store.gws)) for (const m of Object.values(g.matches)) {
    const f = fxById[m.fid];
    if (m.res || !f?.finished || f.team_h_score == null) continue;
    m.res = [f.team_h_score, f.team_a_score];
    if (m.a) m.pts = points(m.a.pick[0], m.a.pick[1], m.res[0], m.res[1]);
    store.dirty.add('gw-' + g.gw);
  }

  // ---------- the weeks shown: every round with saved picks, plus the current and next round
  const gwList = [...new Set([...Object.keys(store.gws).map(Number).filter(g => Object.keys(store.gws[g].matches).length), current, ...(nextGw ? [nextGw] : [])])].sort((a, b) => a - b);
  const weeks = [];
  for (const gw of gwList) {
    const status = gw < current ? 'played' : gw === current ? 'current' : 'next';
    const matches = roundFx(gw).map(f => {
      const saved = store.gws[gw]?.matches[f.id];
      let m;
      if (saved) m = { ...saved, state: f.finished ? 'done' : 'locked' };
      else if (started(f)) m = { ...liveMatch(f, { at: null, error: 'Started before FPL Hub was tracking it, so there was no pick.' }, facts, {}), state: f.finished ? 'done' : 'locked' };
      else {
        m = { ...liveMatch(f, live.snaps[f.id], facts, { next: status === 'next', first: live.first[f.id], staleHours: C.staleHours, now }), state: 'open' };
        const prev = live.emailPicks[gw]?.[f.id];
        if (prev && m.pickText && prev !== m.pickText) m.prev = prev;
      }
      if (!m.res && f.finished && f.team_h_score != null) m.res = [f.team_h_score, f.team_a_score];
      return m;
    });
    const scored = matches.filter(m => m.pts != null);
    weeks.push({
      gw, status, matches,
      firstKo: matches[0]?.kickoff || null,
      firstOpenKo: matches.find(m => m.state === 'open')?.kickoff || null,
      ready: matches.filter(m => m.a).length,
      open: matches.filter(m => m.state === 'open').length,
      total: scored.reduce((s, m) => s + m.pts, 0), exact: scored.filter(m => m.pts === 3).length,
    });
  }
  weeks.forEach((w, i) => { w.summary = roundSummary(w, weeks[i - 1]); w.copy = copyText(w); w.claude = claudeText(w); });
  const currentIdx = weeks.findIndex(w => w.gw === current);
  const cw = weeks[currentIdx];
  log.push(`Superbru GW${current}: ${cw.ready} of ${cw.matches.length} picks` + (cw.open ? `, ${cw.open} still open` : '') + `. Saved rounds: ${Object.keys(store.gws).join(', ') || 'none yet'}.`);
  return {
    model: { weeks, currentIdx, lastPull: live.lastPull || null, banner, generatedAt: now.toISOString() },
    log,
  };
}

// Remember the picks as they were when the weekly email went, to flag changes later.
export function markEmailPicks(store, model, gw) {
  const w = model.superbru?.weeks?.find(x => x.gw === gw);
  if (!w || !store) return;
  store.live.emailPicks[gw] = Object.fromEntries(w.matches.filter(m => m.pickText && m.state === 'open').map(m => [m.fid, m.pickText]));
  for (const g of Object.keys(store.live.emailPicks)) if (Number(g) < gw - 2) delete store.live.emailPicks[g];
  store.dirty.add('live');
}
