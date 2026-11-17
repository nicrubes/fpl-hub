// Turns the raw FPL Draft data into everything the website and email need.
import { api } from './api.js';
import { buildSchedule } from './schedule.js';
import { loadPredictions, matchPredictions } from './predictions.js';
import { addSignals, hiddenPicks, waiverPlan, teamSheet } from './scout.js';

const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const STATUS_TEXT = { a: 'Fit', d: 'Doubtful', i: 'Injured', s: 'Suspended', u: 'Unavailable', n: 'Not in squad' };

// The 11 players who actually counted, after automatic substitutions.
function finalEleven(picksResp) {
  if (!picksResp?.picks) return [];
  const xi = picksResp.picks.filter(p => p.position <= 11).map(p => p.element);
  for (const s of picksResp.subs || []) {
    const i = xi.indexOf(s.element_out);
    if (i >= 0) xi[i] = s.element_in;
  }
  return xi;
}

export async function buildModel(cfg, { now = new Date(), state = {}, passcode = null } = {}) {
  const { leagueId, entryId } = cfg;
  const [boot, details, status, trans, classic] = await Promise.all([
    api.bootstrap(), api.leagueDetails(leagueId), api.elementStatus(leagueId), api.transactions(leagueId), api.classicBootstrap(),
  ]);

  const events = boot.events.data;
  const lastGw = boot.events.current;
  const targetGw = boot.events.next;
  const lastGwFinal = !!events.find(e => e.id === lastGw)?.finished;

  const teams = Object.fromEntries(boot.teams.map(t => [t.id, t]));
  const entries = details.league_entries.filter(e => e.entry_id);
  const entryById = Object.fromEntries(entries.map(e => [e.entry_id, e]));
  const nameOf = e => `${e.player_first_name} ${e.player_last_name}`.trim();

  // ---------- FPL Form predictions
  const pred = await loadPredictions({ passcode, targetGw });
  const { byDraftId: predOf, matched } = matchPredictions(pred, classic?.elements || [], boot.elements, targetGw);

  // ---------- fixtures for the next 3 gameweeks (with difficulty where available)
  const fixtureGws = [targetGw, targetGw + 1, targetGw + 2].filter(g => g && g <= 38);
  const fixturesByTeam = {};
  for (const gw of fixtureGws) {
    const [fx, cfx] = await Promise.all([api.fixtures(gw), api.classicFixtures(gw)]);
    const diff = {};
    for (const c of cfx || []) diff[`${c.kickoff_time}|${c.team_h}|${c.team_a}`] = [c.team_h_difficulty, c.team_a_difficulty];
    for (const f of fx || []) {
      const d = diff[`${f.kickoff_time}|${f.team_h}|${f.team_a}`] || [null, null];
      (fixturesByTeam[f.team_h] ||= []).push({ gw, opp: teams[f.team_a]?.short_name, home: true, diff: d[0] });
      (fixturesByTeam[f.team_a] ||= []).push({ gw, opp: teams[f.team_h]?.short_name, home: false, diff: d[1] });
    }
  }

  // ---------- last 6 gameweeks of minutes, points and xGI
  const recentGws = [5, 4, 3, 2, 1, 0].map(k => lastGw - k);
  const lives = await Promise.all(recentGws.map(g => (g >= 1 ? api.live(g) : null)));
  const stat = (i, id, key) => Number(lives[i]?.elements?.[id]?.stats?.[key] ?? 0);

  // ---------- ownership, demand, releases
  const ownerOf = {}, leagueStatus = {};
  for (const s of status.element_status) { ownerOf[s.element] = s.owner; leagueStatus[s.element] = s.status; }
  const tx = trans.transactions || [];
  const demand = {};
  for (const t of tx) if (t.kind === 'w' && t.event >= lastGw - 2) (demand[t.element_in] ||= new Set()).add(t.entry);
  const recentlyReleased = {};
  for (const t of tx) if (t.result === 'a' && t.event >= lastGw - 1) recentlyReleased[t.element_out] = { by: t.entry, gw: t.event };

  // ---------- injury tracking between runs ("declared fit again")
  const prevStatus = state.status || {};
  const fitSince = { ...(state.fitSince || {}) };
  const newStatus = {};
  for (const e of boot.elements) {
    newStatus[e.id] = e.status;
    if (prevStatus[e.id] && ['i', 'd', 's'].includes(prevStatus[e.id]) && e.status === 'a') fitSince[e.id] = now.toISOString();
  }
  for (const [id, at] of Object.entries(fitSince)) if (now - new Date(at) > 21 * 864e5) delete fitSince[id];

  const players = {};
  for (const e of boot.elements) {
    const owner = ownerOf[e.id] || null;
    players[e.id] = addSignals({
      id: e.id,
      name: e.web_name,
      pos: POS[e.element_type],
      team: teams[e.team]?.short_name,
      draftRank: e.draft_rank,
      total: e.total_points,
      form: Number(e.form) || 0,
      ppg: Number(e.points_per_game) || 0,
      minutes: e.minutes,
      lastGwPts: stat(5, e.id, 'total_points'),
      mins: recentGws.map((_, i) => stat(i, e.id, 'minutes')),
      pts: recentGws.map((_, i) => stat(i, e.id, 'total_points')),
      xgis: recentGws.map((_, i) => stat(i, e.id, 'expected_goal_involvements')),
      pred: predOf[e.id] || null,
      status: e.status,
      statusText: STATUS_TEXT[e.status] || e.status,
      chance: e.chance_of_playing_next_round,
      news: e.news || '',
      owner,
      ownerName: owner ? entryById[owner]?.entry_name : null,
      locked: !owner && leagueStatus[e.id] && leagueStatus[e.id] !== 'a',
      demand: demand[e.id]?.size || 0,
      fixtures: fixturesByTeam[e.team] || [],
      released: recentlyReleased[e.id] ? { by: entryById[recentlyReleased[e.id].by]?.entry_name, gw: recentlyReleased[e.id].gw } : null,
    }, { lastGw, now, fitSince });
  }

  // ---------- each manager's forced release (top scorer in their final 11)
  const live = lives[5];
  const ptsOf = id => live?.elements?.[id]?.stats?.total_points ?? 0;
  const picksAll = await Promise.all(entries.map(e => api.picks(e.entry_id, lastGw)));
  const forced = entries.map((e, i) => {
    const xi = finalEleven(picksAll[i]);
    const top = Math.max(...xi.map(ptsOf), -99);
    return {
      entryId: e.entry_id, team: e.entry_name, manager: nameOf(e), waiverPick: e.waiver_pick, points: top,
      players: xi.filter(id => ptsOf(id) === top).map(id => players[id]),
      autoSubs: (picksAll[i]?.subs || []).length,
    };
  });
  const mine = forced.find(f => f.entryId === entryId);
  const rivals = forced.filter(f => f.entryId !== entryId).map(f => ({
    ...f,
    mustBuy: [...new Set(f.players.map(p => p.pos))].join(' or '),
    lastClaims: tx.filter(t => t.entry === f.entryId && t.kind === 'w' && t.event === lastGw).length,
  }));
  const squad = Object.values(players).filter(p => p.owner === entryId);
  const released = mine ? mine.players.some(p => p.owner !== entryId) : false;
  const forcedPlayers = mine && !released ? mine.players.filter(p => p.owner === entryId) : [];

  // ---------- free agents, hidden picks, waiver plan, team sheet
  const free = Object.values(players).filter(p => !p.owner && p.status !== 'u');
  const available = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of free.slice().sort((a, b) => a.draftRank - b.draftRank)) available[p.pos].push(p);
  const hidden = hiddenPicks(free, lastGw);
  const plan = waiverPlan({ squad, free, forced: forcedPlayers, rivals, myPick: mine?.waiverPick ?? 99, hidden });
  const likelyIn = plan.claims.find(c => c.forced && c.chance !== 'likely gone')?.in || null;
  const sheet = teamSheet(squad, forcedPlayers, likelyIn);

  const order = ['GK', 'DEF', 'MID', 'FWD'];
  const schedule = await buildSchedule(cfg, events, details, now);

  return {
    model: {
      generatedAt: now.toISOString(),
      league: { id: leagueId, name: details.league.name },
      me: { entryId, team: mine?.team, manager: mine?.manager, waiverPick: mine?.waiverPick, teams: entries.length },
      lastGw, targetGw, lastGwFinal,
      predictions: pred ? { label: pred.label, uploadedAt: pred.uploadedAt, firstGw: pred.gws[0], lastGw: pred.gws[pred.gws.length - 1], matched } : null,
      mustRelease: mine ? { points: mine.points, players: mine.players, released, autoSubs: mine.autoSubs } : null,
      positionsContested: plan.needAhead,
      available,
      hidden,
      plan,
      sheet,
      comingNextWeek: rivals.flatMap(r => r.players.map(p => ({ ...p, from: r.team, tie: r.players.length > 1 }))).sort((a, b) => b.val - a.val),
      rivals,
      waiverOrder: [...forced].sort((a, b) => a.waiverPick - b.waiverPick).map(f => ({ team: f.team, manager: f.manager, pick: f.waiverPick, me: f.entryId === entryId })),
      squad: squad.sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos) || b.val - a.val),
      schedule,
    },
    state: { status: newStatus, fitSince },
    // Raw data already downloaded here, reused by the Challenge tab (lib/challenge.js) so it isn't fetched twice.
    raw: { pred, classic, lives, recentGws, draftElements: boot.elements },
  };
}
