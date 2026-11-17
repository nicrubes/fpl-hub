// FPL Challenge pick helper: "Nic's Challenge method" (Notes\03 FPL Hub\Nic's Challenge method.md) as code.
// Steps: read the week's rule -> project every team's goals and clean-sheet chance -> work out each
// player's expected points in parts (goals, assists, clean sheet, ...) -> apply the rule -> pick the best
// legal six (Nic's lean-in and spread rules) -> captain, formations, differentials and reasons.
import fs from 'node:fs';
import { challengeApi, loadRuleCopy } from './challenge-data.js';
import { parseRule, readAs, simpleTerms, STAT_LABELS } from './challenge-rules.js';

const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const GOAL = { 1: 10, 2: 6, 3: 5, 4: 4 };   // FPL 2026/27 scoring (same in Challenge)
const CS = { 1: 4, 2: 4, 3: 1, 4: 0 };
const DC_AT = { 2: 10, 3: 12, 4: 12 };      // defensive contribution thresholds (2 points)
const SEASON_START = '2026-06-01';          // joined on or after this = summer signing
export const CHALLENGE_INFO = { leagueCode: 'sv69tv', lastSeasonRank: 140 };

// Method settings. Change only with Nic's OK (see the method notes, section 2).
const SET = {
  leanIn: 0.25,      // rule 3: in "a group scores more" weeks, rule points count 25% extra
  spread: 0.85,      // rule 12: a 3rd+ player from one club (when allowed) counts 85%
  home: 1.1, away: 0.9, // rule 11: home advantage
  minPlay: 0.2,      // rule 5: ignore players with under 20% chance of playing
  doubt: 0.7,        // rule 5: below 70% chance of starting -> "check the team sheet"
  pool: 14,          // best candidates per position given to the optimiser
  show: 12,          // kept per position (swap choices; the brief lists the top 6)
  diffOwn: 5,        // rule 14: in under 5% of Challenge teams = differential
  csTilt: { 1: 2, 2: 1 }, // rules 9-10: keeper (and a little for defenders) leans to the best clean-sheet chance
};

const pois = (k, l) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
const atLeast = (k, l) => { let s = 0; for (let i = 0; i < k; i++) s += pois(i, l); return Math.max(0, 1 - s); };
const halfFloor = l => { let s = 0; for (let k = 2; k <= 14; k++) s += Math.floor(k / 2) * pois(k, l); return s; };
const avg = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;
const pct = x => Math.round(x * 100);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- teams: projected goals and clean-sheet chance (rule 6)
function teamModel(classic, cfx) {
  const T = {};
  for (const t of classic.teams) T[t.id] = { id: t.id, short: t.short_name, name: t.name, gp: 0, gf: 0, ga: 0, xg: 0, xga: 0, played: new Set() };
  for (const f of cfx) {
    if (!f.finished || !T[f.team_h] || !T[f.team_a]) continue;
    const h = T[f.team_h], a = T[f.team_a];
    h.gp++; a.gp++; h.gf += f.team_h_score; h.ga += f.team_a_score; a.gf += f.team_a_score; a.ga += f.team_h_score;
    h.played.add(f.event); a.played.add(f.event);
  }
  for (const e of classic.elements) {
    const t = T[e.team]; if (!t) continue;
    t.xg += Number(e.expected_goals) || 0;
    if (e.element_type === 1) t.xga += Number(e.expected_goals_conceded) || 0;
  }
  const list = Object.values(T);
  // Mostly underlying numbers (xG), partly real goals; early-season numbers pulled towards average.
  const raw = t => (t.gp ? { att: 0.7 * t.xg / t.gp + 0.3 * t.gf / t.gp, def: 0.7 * t.xga / t.gp + 0.3 * t.ga / t.gp } : null);
  const rs = list.map(raw).filter(Boolean);
  const muA = rs.length ? avg(rs.map(r => r.att)) : 1.35, muD = rs.length ? avg(rs.map(r => r.def)) : 1.35;
  for (const t of list) {
    const r = raw(t) || { att: muA, def: muD };
    t.att = (t.gp * r.att + 3 * muA) / (t.gp + 3);
    t.def = (t.gp * r.def + 3 * muD) / (t.gp + 3);
  }
  [...list].sort((a, b) => b.att - a.att).forEach((t, i) => { t.attRank = i + 1; });
  [...list].sort((a, b) => a.def - b.def).forEach((t, i) => { t.defRank = i + 1; });
  return { T, mu: (muA + muD) / 2 };
}

// ---------- the week's squad rules (from the game's data)
function squadRules(ev) {
  const o = ev?.overrides || {};
  const r = o.rules || {};
  const min = { 1: 1, 2: 1, 3: 1, 4: 1 }, max = { 1: 1, 2: 3, 3: 3, 4: 3 };
  for (const t of o.element_types || []) { min[t.id] = t.squad_min_select; max[t.id] = t.squad_max_select; }
  const size = r.squad_squadsize || 6;
  const teamLimit = r.squad_team_limit || 1;
  const spend = r.squad_total_spend || 9999;
  return {
    size, teamLimit, min, max,
    budget: spend >= 2000 ? Infinity : spend,
    published: !!Object.keys(r).length,
    text: [`${size} players`, teamLimit === 1 ? 'Maximum 1 player per club' : `Up to ${teamLimit} players per club`, spend >= 2000 ? 'Unlimited budget' : `£${(spend / 10).toFixed(1)}m budget`],
    shape: `1 goalkeeper, ${min[2]}–${max[2]} defenders, ${min[3]}–${max[3]} midfielders, ${min[4]}–${max[4]} forwards`,
  };
}

// ---------- one player's expected points, in parts (rules 4, 5, 9, 10)
function playerModel(e, c, did, ctx) {
  const pos = e.element_type, team = ctx.T[e.team];
  const fixtures = ctx.fxOf[e.team] || [];
  const chance = e.chance_of_playing_next_round;
  const avail = !e.can_select || ['i', 's', 'u', 'n'].includes(e.status) ? 0 : chance != null ? chance / 100 : e.status === 'd' ? 0.5 : 1;

  // recent games (only gameweeks his team played), from the Draft data part 1 already reads
  const rec = [];
  ctx.recentGws.forEach((g, i) => {
    if (g < 1 || !team?.played.has(g)) return;
    const s = ctx.lives[i]?.elements?.[did]?.stats || {};
    rec.push({ gw: g, min: Number(s.minutes) || 0, st: Number(s.starts) || 0, dc: Number(s.defensive_contribution) || 0 });
  });
  const last4 = rec.slice(-4);
  const gp = Math.max(1, team?.gp || 1);
  const seasonStart = clamp((c?.starts ?? e.starts ?? 0) / gp, 0, 1);
  const recentStart = last4.length ? last4.filter(r => r.st > 0).length / last4.length : seasonStart;
  const pStart = last4.length ? 0.65 * recentStart + 0.35 * seasonStart : seasonStart;
  const subApps = rec.filter(r => r.st === 0 && r.min > 0).length;
  const pSub = Math.min((subApps + 0.1) / (rec.length + 1), Math.max(0, 1 - pStart));
  const startMins = avg(rec.filter(r => r.st > 0).map(r => r.min)) ?? (pos === 1 ? 90 : 80);
  const subMins = avg(rec.filter(r => r.st === 0 && r.min > 0).map(r => r.min)) ?? 20;

  // season rates per 90, pulled towards the usual for his position when he hasn't played much
  const mins = c?.minutes ?? e.minutes ?? 0;
  const per90 = (v, prior, k = 270) => ((Number(v) || 0) * 90 + prior * k) / (mins + k);
  const xg90 = per90(c?.expected_goals, { 1: 0, 2: 0.04, 3: 0.12, 4: 0.3 }[pos]);
  const xa90 = per90(c?.expected_assists, { 1: 0.01, 2: 0.05, 3: 0.1, 4: 0.1 }[pos]);
  const bonus90 = per90(c?.bonus ?? e.bonus, 0.12);
  const saves90 = pos === 1 ? per90(c?.saves ?? e.saves, 2.8) : 0;
  const yel90 = per90(c?.yellow_cards ?? e.yellow_cards, 0.1, 450);
  const dc90 = per90(c?.defensive_contribution ?? e.defensive_contribution, { 1: 0, 2: 9, 3: 7, 4: 3 }[pos]);
  const thr = DC_AT[pos];
  const starts = rec.filter(r => r.st > 0);
  const dcHits = thr ? starts.filter(r => r.dc >= thr).length : 0;
  const pDC = thr ? (dcHits + 2 * atLeast(thr, dc90 * startMins / 90)) / (starts.length + 2) : 0;

  const zero = () => ({ app: 0, goals: 0, assists: 0, cs: 0, conceded: 0, saves: 0, defcon: 0, bonus: 0, cards: 0 });
  const comp = zero(), sub = zero();
  const fx = [];
  for (const f of fixtures) {
    const af = f.lf / team.att, df = f.la / team.def, csP = Math.exp(-f.la);
    const mS = startMins / 90, mB = subMins / 90;
    const S = {
      app: 1 + (startMins >= 60 ? 0.95 : 0.4),
      goals: xg90 * mS * af * GOAL[pos],
      assists: xa90 * mS * af * 3,
      cs: (startMins >= 60 ? 0.95 : 0.3) * csP * CS[pos],
      conceded: pos <= 2 ? -halfFloor(f.la * mS) : 0,
      saves: pos === 1 ? Math.max(0, saves90 * mS * df / 3 - 0.2) : 0,
      defcon: thr ? 2 * pDC : 0,
      bonus: bonus90 * mS * (pos >= 3 ? 0.5 + 0.5 * af : 0.5 + 0.5 * csP / Math.exp(-team.def)),
      cards: -yel90 * mS,
    };
    const B = { app: 1, goals: xg90 * mB * af * GOAL[pos], assists: xa90 * mB * af * 3, cs: 0, conceded: 0, saves: 0, defcon: 0, bonus: bonus90 * mB * 0.4, cards: -yel90 * mB };
    let fe = 0;
    for (const k in comp) {
      const v = avail * (pStart * S[k] + pSub * B[k]);
      comp[k] += v; sub[k] += avail * pSub * B[k]; fe += v;
    }
    fx.push({ opp: f.opp, home: f.home, lf: f.lf, la: f.la, cs: csP, ko: f.ko, e: fe, af });
  }
  const own = Object.values(comp).reduce((s, v) => s + v, 0);
  return {
    e, c, pos, team, fixtures: fx, avail, pStart, pSub, startMins, subMins, rec, subApps, dcHits, starts: starts.length,
    comp, subPts: Object.values(sub).reduce((s, v) => s + v, 0), own,
    xMins: avail * (pStart * startMins + pSub * subMins) * fixtures.length,
  };
}

const ageAt = (birth, at) => {
  if (!birth) return null;
  const b = new Date(birth), d = new Date(at);
  return d.getUTCFullYear() - b.getUTCFullYear() - ((d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) ? 1 : 0);
};

// Share of this player's points that the "group" boost applies to (0 = not in the group, 1 = all).
function groupShare(p, g, ctx) {
  const e = p.e;
  switch (g.type) {
    case 'teams': return (g.teams || []).includes(e.team) ? 1 : 0;
    case 'new': return e.team_join_date && e.team_join_date >= SEASON_START ? 1 : 0;
    case 'service': {
      if (!e.team_join_date) return 0;
      const cut = new Date(ctx.finalDeadline); cut.setUTCFullYear(cut.getUTCFullYear() - (g.years || 5));
      return new Date(e.team_join_date) <= cut ? 1 : 0;
    }
    case 'age': { const a = ageAt(e.birth_date, ctx.finalDeadline); return a != null && a <= g.maxAge ? 1 : 0; }
    case 'pos': return (g.pos || []).includes(p.pos) ? 1 : 0;
    case 'away': case 'home': {
      const tot = p.fixtures.reduce((s, f) => s + f.e, 0);
      const part = p.fixtures.filter(f => (g.type === 'home') === f.home).reduce((s, f) => s + f.e, 0);
      return tot > 0 ? part / tot : 0;
    }
    default: return 0;
  }
}

// Expected count of an action this gameweek (e.g. successful dribbles), from his season rate.
function expectedCount(p, stat, ctx) {
  if (stat === 'winning_goals') return (p.comp.goals * p.scale / GOAL[p.pos]) * 0.35; // about a third of goals win the game
  const mins = p.c?.minutes ?? p.e.minutes ?? 0;
  const prior = ctx.statPrior(stat, p.pos);
  const k = /goals/.test(stat) ? 900 : 450;
  const rate = ((Number(p.e[stat]) || 0) * 90 + prior * k) / (mins + k);
  const attacking = /shot|goal|key_passes|big_chances|headed/.test(stat);
  const af = attacking && p.fixtures.length ? avg(p.fixtures.map(f => f.af)) : 1;
  return rate * p.xMins / 90 * af;
}

function thresholdChance(p, t, ctx) {
  if (t.stat === 'pass_pct') {
    const att = Number(p.e.attempted_passes) || 0, done = Number(p.e.completed_passes) || 0;
    if (att < 50) return 0;
    const pc = 100 * done / att;
    return p.avail * p.pStart * clamp((pc - (t.atLeast - 6)) / 12, 0, 1) * p.fixtures.length;
  }
  const mins = p.c?.minutes ?? p.e.minutes ?? 0;
  const prior = ctx.statPrior(t.stat, p.pos);
  const rate = ((Number(p.e[t.stat]) || 0) * 90 + prior * 450) / (mins + 450);
  return p.avail * p.pStart * atLeast(t.atLeast, rate * p.startMins / 90) * p.fixtures.length;
}

// ---------- apply the week's rule (rules 1-4)
function applyRule(p, R, ctx) {
  let delta = 0;
  const parts = [];
  if (R.group) {
    const g = R.group;
    // Bench points come from FPL Hub's own minutes model, not scaled by FPL Form (which may expect him to start).
    if (g.type === 'sub') { const d = (g.mult - 1) * p.subPts; delta += d; if (d > 0.05) parts.push(['sub', d]); }
    else { const share = groupShare(p, g, ctx); if (share > 0) { const d = (g.mult - 1) * p.base * share; delta += d; parts.push(['group', d, share]); } }
  }
  for (const [k, m] of Object.entries(R.points || {})) { const d = (m - 1) * Math.max(0, p.comp[k] || 0) * p.scale; if (d) { delta += d; parts.push([k, d]); } }
  if (R.defconPts) { const d = (R.defconPts / 2 - 1) * p.comp.defcon * p.scale; delta += d; parts.push(['defcon', d]); }
  for (const a of R.actions || []) { const mu = expectedCount(p, a.stat, ctx); const d = a.per * mu; delta += d; parts.push(['act', d, a.stat, mu]); }
  for (const t of R.thresholds || []) { const pr = thresholdChance(p, t, ctx); const d = t.bonus * pr; delta += d; parts.push(['thr', d, t, pr]); }
  return { delta, parts };
}

// ---------- the best legal six (rules 7, 8, 12, 13)
function optimise(cands, rules) {
  const forms = [];
  for (let d = rules.min[2]; d <= rules.max[2]; d++) for (let m = rules.min[3]; m <= rules.max[3]; m++) for (let f = rules.min[4]; f <= rules.max[4]; f++) {
    const g = rules.size - d - m - f;
    if (g >= rules.min[1] && g <= rules.max[1]) forms.push({ 1: g, 2: d, 3: m, 4: f });
  }
  const out = [];
  for (const need of forms) {
    const pool = cands.filter(p => need[p.pos] > 0).sort((a, b) => b.score - a.score);
    const rem = { 1: [], 2: [], 3: [], 4: [] };
    for (const k of [1, 2, 3, 4]) { let c = 0; for (let i = pool.length; i >= 0; i--) { rem[k][i] = c; if (i > 0 && pool[i - 1].pos === k) c++; } }
    let best = null;
    const chosen = [], club = {}, cnt = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const dfs = (i, sum, mx, cost) => {
      const left = rules.size - chosen.length;
      if (!left) { if (!best || sum + mx > best.v) best = { v: sum + mx, picks: chosen.slice() }; return; }
      if (i >= pool.length) return;
      for (const k of [1, 2, 3, 4]) if (need[k] - cnt[k] > rem[k][i]) return;
      let ub = sum, umx = mx, taken = 0;
      for (let j = i; j < pool.length && taken < left; j++) { if (cnt[pool[j].pos] >= need[pool[j].pos]) continue; ub += pool[j].score; umx = Math.max(umx, pool[j].score); taken++; }
      if (best && ub + umx <= best.v) return;
      const p = pool[i];
      const n = club[p.tid] || 0;
      if (cnt[p.pos] < need[p.pos] && n < rules.teamLimit && cost + p.cost <= rules.budget) {
        chosen.push(p); cnt[p.pos]++; club[p.tid] = n + 1;
        dfs(i + 1, sum + (n >= 2 ? p.score * SET.spread : p.score), Math.max(mx, p.score), cost + p.cost);
        chosen.pop(); cnt[p.pos]--; club[p.tid] = n;
      }
      dfs(i + 1, sum, mx, cost);
    };
    dfs(0, 0, 0, 0);
    if (best) out.push({ need, ...best });
  }
  return out.sort((a, b) => b.v - a.v);
}

// ---------- words: why each player is there
function reasons(p, R, ctx, applied) {
  const why = [];
  const f0 = p.fixtures[0];
  const teamName = p.team.short;
  if (p.pos >= 3) why.push(`${teamName} project ${r1(f0.lf)} goals (${ordinal(ctx.attRankGw[p.e.team])} of ${ctx.nTeams} this week)`);
  else why.push(`${pct(f0.cs)}% clean-sheet chance (${ordinal(ctx.csRankGw[p.e.team])} of ${ctx.nTeams})`);
  for (const [kind, d, a, b] of applied.parts) {
    if (kind === 'sub') why.push(`Came off the bench in ${p.subApps} of his last ${p.rec.length}: ${R.group.mult === 3 ? 'triple' : R.group.mult + 'x'} points if he does again`);
    if (kind === 'group') {
      const g = R.group;
      const label = { new: 'Summer signing', teams: 'From a boosted club', pos: 'Boosted position', age: `Aged ${ageAt(p.e.birth_date, ctx.finalDeadline)}`, service: `At the club since ${String(p.e.team_join_date).slice(0, 4)}`, away: 'Playing away', home: 'Playing at home' }[g.type];
      why.push(`${label}: ${g.mult === 2 ? 'double' : g.mult === 3 ? 'triple' : g.mult + 'x'} points`);
    }
    if (kind === 'act' && d > 0.3) why.push(`About ${r1(b)} ${STAT_LABELS[a] || a} expected`);
    if (kind === 'thr' && b > 0.1) why.push(`${pct(b)}% chance of the one-off bonus`);
  }
  if (R.group?.type === 'sub' && !applied.parts.some(x => x[0] === 'sub') && p.pStart > 0.8) why.push('Starts most weeks, so no boost: picked on his own numbers');
  const xgi = r1((Number(p.c?.expected_goals) || 0) + (Number(p.c?.expected_assists) || 0));
  if (p.pos === 2) {
    if (p.dcHits) why.push(`Defensive contribution in ${p.dcHits} of his last ${p.starts} starts`);
    if (xgi >= 0.8) why.push(`xGI ${xgi} this season`);
  } else if (p.pos >= 3 && xgi >= 1) why.push(`xGI ${xgi} this season`);
  return why.slice(0, 4);
}
const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');

function flagOf(p, R) {
  if (p.e.status === 'd') return `Doubtful${p.e.chance_of_playing_next_round != null ? ' ' + p.e.chance_of_playing_next_round + '%' : ''}${p.e.news ? ': ' + p.e.news : ''}`;
  const lastStarts = p.rec.slice(-4).filter(r => r.st > 0).length;
  if (R.group?.type !== 'sub' && p.pStart < SET.doubt) return `Check the team sheet: started ${lastStarts} of his last ${Math.min(4, p.rec.length)}`;
  if (R.group?.type === 'sub' && p.pStart > 0.45 && p.pSub > 0.2) return 'Could start instead of coming on: check the team sheet';
  return null;
}

// ---------- main entry
export async function buildChallenge({ raw, state = {}, now = new Date(), dataDir = process.env.FPL_DATA_DIR || 'data' }) {
  const events = await challengeApi.events();
  const ev = events.find(e => e.can_manage && !e.finished) || events.find(e => e.is_next) || null;
  const copy = await loadRuleCopy(state.challengeCopy || {});
  if (!ev) return { model: { none: true, message: 'No Challenge gameweek is open right now.' }, copy };
  const gw = ev.id;
  const rules = squadRules(ev);
  const [elements, chFx, cfx] = await Promise.all([challengeApi.elements(gw), challengeApi.fixtures(gw), challengeApi.classicFixtures()]);
  if (!elements) return { model: { gw, none: true, message: `The GW${gw} player list isn't out yet.` }, copy };
  const classic = raw.classic;
  const { T, mu } = teamModel(classic, cfx);
  const teamsList = classic.teams.map(t => ({ id: t.id, short: t.short_name, name: t.name }));

  // the rule: Nic's override if he saved one for this gameweek, otherwise the game's wording
  const info = copy.rules?.[gw] || null;
  let R = parseRule(info, teamsList);
  let ruleSource = info ? 'game' : 'none';
  const ovFile = `${dataDir}/challenge-rule.json`;
  if (fs.existsSync(ovFile)) {
    try {
      const ov = JSON.parse(fs.readFileSync(ovFile, 'utf8'));
      if (ov.gw === gw && ov.recipe) { R = { ...R, group: null, points: {}, defconPts: null, actions: [], thresholds: [], ...ov.recipe, understood: true, unread: [] }; ruleSource = 'override'; }
    } catch (err) { console.error('Could not read challenge-rule.json:', err.message); }
  }

  // A rule that couldn't be read is never half-applied: the picks fall back to normal scoring and the page says so.
  if (!R.understood) R = { ...R, group: null, points: {}, defconPts: null, actions: [], thresholds: [] };

  // this gameweek's fixtures with projected goals
  const fxOf = {};
  const games = [];
  for (const f of chFx || []) {
    const h = T[f.team_h], a = T[f.team_a];
    if (!h || !a) continue;
    const lh = h.att * a.def / mu * SET.home, la = a.att * h.def / mu * SET.away;
    games.push({ h: h.short, a: a.short, lh, la, ko: f.kickoff_time, hid: h.id, aid: a.id });
    (fxOf[h.id] ||= []).push({ opp: a.short, home: true, lf: lh, la, ko: f.kickoff_time });
    (fxOf[a.id] ||= []).push({ opp: h.short, home: false, lf: la, la: lh, ko: f.kickoff_time });
  }
  const kos = games.map(g => g.ko).filter(Boolean).sort();
  const sides = Object.entries(fxOf).map(([tid, fs]) => ({ tid: Number(tid), lf: fs.reduce((s, f) => s + f.lf, 0), cs: Math.max(...fs.map(f => Math.exp(-f.la))), fs }));
  const attRankGw = {}, csRankGw = {};
  [...sides].sort((a, b) => b.lf - a.lf).forEach((s, i) => { attRankGw[s.tid] = i + 1; });
  [...sides].sort((a, b) => b.cs - a.cs).forEach((s, i) => { csRankGw[s.tid] = i + 1; });

  // per-stat averages by position (for players with few minutes)
  const priorCache = {};
  const statPrior = (stat, pos) => {
    const key = stat + pos;
    if (priorCache[key] == null) {
      const reg = elements.filter(x => x.element_type === pos && x.minutes >= 450);
      priorCache[key] = reg.length ? reg.reduce((s, x) => s + (Number(x[stat]) || 0), 0) / reg.reduce((s, x) => s + x.minutes, 0) * 90 : 0;
    }
    return priorCache[key];
  };
  const ctx = { T, fxOf, recentGws: raw.recentGws, lives: raw.lives, finalDeadline: ev.deadline_time, statPrior, attRankGw, csRankGw, nTeams: sides.length };

  const classicByCode = new Map(classic.elements.map(e => [e.code, e]));
  const draftByCode = new Map(raw.draftElements.map(e => [e.code, e.id]));
  const predRows = raw.pred?.rows || null;
  const hasPredGw = !!predRows && raw.pred.gws.includes(gw);

  const all = [];
  for (const e of elements) {
    if (!e.can_select || !fxOf[e.team]) continue;
    const c = classicByCode.get(e.code);
    const p = playerModel(e, c, draftByCode.get(e.code), ctx);
    if (p.avail * (p.pStart + p.pSub) < SET.minPlay) continue;
    const fromForm = hasPredGw && c && predRows[c.id] && predRows[c.id][gw] != null ? predRows[c.id][gw] : null;
    p.base = fromForm ?? p.own;
    p.scale = fromForm != null && p.own > 0.5 ? clamp(fromForm / p.own, 0.7, 1.4) : 1;
    const applied = applyRule(p, R, ctx);
    p.applied = applied;
    p.adj = p.base + applied.delta;
    p.score = p.adj + (R.group ? SET.leanIn * Math.max(0, applied.delta) : 0)
      + (SET.csTilt[p.pos] || 0) * (Math.max(...p.fixtures.map(f => f.cs)) - 0.3);
    p.tid = e.team; p.cost = e.now_cost || 0;
    all.push(p);
  }
  if (!all.length) return { model: { gw, none: true, message: 'No players to pick from yet.' }, copy };

  // candidates per position, then the best six
  const byPos = { 1: [], 2: [], 3: [], 4: [] };
  for (const p of all) byPos[p.pos].push(p);
  for (const k of [1, 2, 3, 4]) byPos[k].sort((a, b) => b.score - a.score);
  const cands = [1, 2, 3, 4].flatMap(k => byPos[k].slice(0, SET.pool));
  const results = optimise(cands, rules);
  const best = results[0];

  const view = p => {
    const f0 = p.fixtures[0];
    const flag = flagOf(p, R);
    const own = Number(p.e.selected_by_percent) || 0;
    return {
      id: p.e.id, name: p.e.web_name, pos: POS[p.pos], team: p.team.short, tid: p.tid,
      fx: p.fixtures.map(f => `${f.opp} (${f.home ? 'H' : 'A'})`).join(', '),
      adj: r1(p.adj), base: r1(p.base), boost: r1(p.applied.delta), score: r2(p.score),
      start: pct(p.pStart), sub: pct(p.pSub), avail: pct(p.avail), own: r1(own),
      cs: p.pos <= 2 ? pct(f0.cs) : null, goals: r2(f0.lf),
      why: reasons(p, R, ctx, p.applied), flag,
      tag: R.group?.type === 'sub' && p.pSub >= 0.4 && p.applied.parts.some(x => x[0] === 'sub') ? 'super-sub' : flag ? 'punt' : own < SET.diffOwn ? 'differential' : 'safe',
      ko: f0.ko,
    };
  };

  const picks = best ? best.picks.slice().sort((a, b) => a.pos - b.pos || b.adj - a.adj) : [];
  const capOrder = picks.slice().sort((a, b) => b.adj - a.adj);
  const pickIds = new Set(picks.map(p => p.e.id));
  const minPickAdj = picks.length ? Math.min(...picks.map(p => p.adj)) : 0;
  const differentials = all
    .filter(p => !pickIds.has(p.e.id) && p.adj >= 0.6 * minPickAdj && ((Number(p.e.selected_by_percent) || 0) < SET.diffOwn || p.pStart < 0.75))
    .sort((a, b) => b.score - a.score).slice(0, 5);
  const formName = need => `${need[1]}-${need[2]}-${need[3]}-${need[4]}`;
  const capBonus = list => Math.max(0, ...list.map(p => p.adj));
  const nextInfo = copy.rules?.[gw + 1] || null;

  const teamName = id => T[id]?.short || id;
  const model = {
    gw, title: info?.title || `Gameweek ${gw}`, description: info?.description || '', stat: info?.stat || null,
    ruleSource, understood: R.understood, readAs: readAs(R, teamName), simple: simpleTerms(R), recipe: { group: R.group, points: R.points, defconPts: R.defconPts, actions: R.actions, thresholds: R.thresholds },
    groupRule: !!R.group,
    rules: { text: rules.text, shape: rules.shape, teamLimit: rules.teamLimit, size: rules.size, min: rules.min, max: rules.max, published: rules.published },
    firstKickoff: kos[0] || null, lastKickoff: kos[kos.length - 1] || null, finalDeadline: ev.deadline_time,
    predictions: hasPredGw ? raw.pred.label : null,
    picks: picks.map(view), captain: capOrder[0]?.e.id || null, captainAlt: capOrder[1]?.e.id || null,
    total: best ? r1(picks.reduce((s, p) => s + p.adj, 0) + capBonus(picks)) : null,
    formation: best ? formName(best.need) : null,
    formations: results.slice(0, 3).map(x => ({ name: formName(x.need), total: r1(x.picks.reduce((s, p) => s + p.adj, 0) + capBonus(x.picks)) })),
    pool: Object.fromEntries([1, 2, 3, 4].map(k => [POS[k], byPos[k].slice(0, SET.show).map(view)])),
    differentials: differentials.map(view),
    attacks: [...sides].sort((a, b) => b.lf - a.lf).slice(0, 6).map(s => ({ team: teamName(s.tid), vs: s.fs.map(f => `${f.opp} (${f.home ? 'H' : 'A'})`).join(', '), goals: r2(s.lf) })),
    cleanSheets: [...sides].sort((a, b) => b.cs - a.cs).slice(0, 8).map(s => ({ team: teamName(s.tid), vs: s.fs.map(f => `${f.opp} (${f.home ? 'H' : 'A'})`).join(', '), cs: pct(s.cs) })),
    dilemmas: games.flatMap(g => {
      const out = [];
      if (T[g.hid].attRank <= 4 && T[g.aid].defRank <= 4) out.push(`${g.h} (H) have a top-4 attack but face ${g.a}, a top-4 defence`);
      if (T[g.aid].attRank <= 4 && T[g.hid].defRank <= 4) out.push(`${g.a} (A) have a top-4 attack but face ${g.h}, a top-4 defence`);
      return out;
    }),
    next: nextInfo ? { gw: gw + 1, title: nextInfo.title, description: nextInfo.description } : null,
    teamIds: Object.fromEntries(classic.teams.map(t => [t.short_name, t.id])),
    info: CHALLENGE_INFO,
    generatedAt: now.toISOString(),
  };
  return { model, copy };
}
