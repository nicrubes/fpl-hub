// Turns the raw FPL Draft data into everything the website and email need.
import { api } from './api.js';
import { buildSchedule } from './schedule.js';

const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const STATUS_TEXT = { a: 'Fit', d: 'Doubtful', i: 'Injured', s: 'Suspended', u: 'Unavailable', n: 'Not in squad' };

// The 11 players who actually counted, after automatic substitutions.
function finalEleven(picksResp) {
  if (!picksResp?.picks) return [];
  let xi = picksResp.picks.filter(p => p.position <= 11).map(p => p.element);
  for (const s of picksResp.subs || []) {
    const i = xi.indexOf(s.element_out);
    if (i >= 0) xi[i] = s.element_in;
  }
  return xi;
}

export async function buildModel(cfg, now = new Date()) {
  const { leagueId, entryId } = cfg;
  const [boot, details, status, trans] = await Promise.all([
    api.bootstrap(),
    api.leagueDetails(leagueId),
    api.elementStatus(leagueId),
    api.transactions(leagueId),
  ]);

  const events = boot.events.data;
  const lastGw = boot.events.current; // most recent gameweek that has started
  const targetGw = boot.events.next;  // the gameweek we are preparing for
  const lastEvent = events.find(e => e.id === lastGw);
  const lastGwFinal = !!lastEvent?.finished;

  const teams = Object.fromEntries(boot.teams.map(t => [t.id, t]));
  const entries = details.league_entries.filter(e => e.entry_id);
  const entryById = Object.fromEntries(entries.map(e => [e.entry_id, e]));
  const nameOf = e => `${e.player_first_name} ${e.player_last_name}`.trim();

  // ---------- fixtures for the next 3 gameweeks (with difficulty where available)
  const fixtureGws = [targetGw, targetGw + 1, targetGw + 2].filter(g => g && g <= 38);
  const fixturesByTeam = {}; // teamId -> [{gw, opp, home, diff}]
  for (const gw of fixtureGws) {
    const [fx, cfx] = await Promise.all([api.fixtures(gw), api.classicFixtures(gw)]);
    const diff = {};
    for (const c of cfx || []) {
      diff[`${c.kickoff_time}|${c.team_h}|${c.team_a}`] = [c.team_h_difficulty, c.team_a_difficulty];
    }
    for (const f of fx || []) {
      const d = diff[`${f.kickoff_time}|${f.team_h}|${f.team_a}`] || [null, null];
      (fixturesByTeam[f.team_h] ||= []).push({ gw, opp: teams[f.team_a]?.short_name, home: true, diff: d[0] });
      (fixturesByTeam[f.team_a] ||= []).push({ gw, opp: teams[f.team_h]?.short_name, home: false, diff: d[1] });
    }
  }

  // ---------- ownership and recent waiver demand
  const ownerOf = {};
  const leagueStatus = {};
  for (const s of status.element_status) {
    ownerOf[s.element] = s.owner;
    leagueStatus[s.element] = s.status;
  }
  const tx = trans.transactions || [];
  const demand = {}; // element -> set of managers who claimed him in the last 3 waiver rounds
  for (const t of tx) {
    if (t.kind === 'w' && t.event >= lastGw - 2) (demand[t.element_in] ||= new Set()).add(t.entry);
  }
  const recentlyReleased = {}; // element -> {by, gw}
  for (const t of tx) {
    if (t.result === 'a' && t.event >= lastGw - 1) recentlyReleased[t.element_out] = { by: t.entry, gw: t.event };
  }

  // ---------- points from the last gameweek
  const live = await api.live(lastGw);
  const ptsOf = id => live?.elements?.[id]?.stats?.total_points ?? 0;

  const players = {};
  for (const e of boot.elements) {
    const owner = ownerOf[e.id] || null;
    players[e.id] = {
      id: e.id,
      name: e.web_name,
      fullName: `${e.first_name} ${e.second_name}`,
      pos: POS[e.element_type],
      team: teams[e.team]?.short_name,
      draftRank: e.draft_rank,
      total: e.total_points,
      form: Number(e.form) || 0,
      ppg: Number(e.points_per_game) || 0,
      minutes: e.minutes,
      xgi: Number(e.expected_goal_involvements) || 0,
      lastGwPts: ptsOf(e.id),
      status: e.status,
      statusText: STATUS_TEXT[e.status] || e.status,
      chance: e.chance_of_playing_next_round,
      news: e.news || '',
      owner,
      ownerName: owner ? entryById[owner]?.entry_name : null,
      locked: !owner && leagueStatus[e.id] && leagueStatus[e.id] !== 'a',
      demand: demand[e.id]?.size || 0,
      fixtures: fixturesByTeam[e.team] || [],
      released: recentlyReleased[e.id]
        ? { by: entryById[recentlyReleased[e.id].by]?.entry_name, gw: recentlyReleased[e.id].gw }
        : null,
    };
  }

  // ---------- each manager's forced release (top scorer in their final 11)
  const picksAll = await Promise.all(entries.map(e => api.picks(e.entry_id, lastGw)));
  const forced = entries.map((e, i) => {
    const xi = finalEleven(picksAll[i]);
    const top = Math.max(...xi.map(ptsOf), -99);
    const tied = xi.filter(id => ptsOf(id) === top);
    return {
      entryId: e.entry_id,
      team: e.entry_name,
      manager: nameOf(e),
      waiverPick: e.waiver_pick,
      points: top,
      players: tied.map(id => players[id]),
      autoSubs: (picksAll[i]?.subs || []).length,
    };
  });
  const mine = forced.find(f => f.entryId === entryId);
  const mySquadNow = Object.values(players).filter(p => p.owner === entryId);
  const released = mine ? mine.players.some(p => p.owner !== entryId) : false;

  // ---------- available players by position, ranked by draft rank
  const available = Object.values(players)
    .filter(p => !p.owner && p.status !== 'u')
    .sort((a, b) => a.draftRank - b.draftRank);
  const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of available) byPos[p.pos].push(p);

  // ---------- hidden picks
  const hidden = available.filter(p =>
    p.draftRank <= cfg.hiddenPickMaxDraftRank &&
    (p.status !== 'a' || p.released || p.minutes < 270)
  ).map(p => ({
    ...p,
    why: p.status !== 'a'
      ? (p.news || p.statusText)
      : p.released
        ? `Released by ${p.released.by} in GW${p.released.gw}`
        : 'Highly ranked but few minutes so far',
  })).slice(0, 25);

  // ---------- rivals
  const rivals = forced
    .filter(f => f.entryId !== entryId)
    .map(f => ({
      ...f,
      mustBuy: [...new Set(f.players.map(p => p.pos))].join(' or '),
      lastClaims: tx.filter(t => t.entry === f.entryId && t.kind === 'w' && t.event === lastGw).length,
    }));
  const waiverOrder = [...forced].sort((a, b) => a.waiverPick - b.waiverPick);
  const aheadOfMe = waiverOrder.filter(f => f.waiverPick < (mine?.waiverPick ?? 99));
  const needCount = pos => aheadOfMe.filter(f => f.players.some(p => p.pos === pos)).length;

  // ---------- my squad view
  const squad = mySquadNow
    .sort((a, b) => ['GK', 'DEF', 'MID', 'FWD'].indexOf(a.pos) - ['GK', 'DEF', 'MID', 'FWD'].indexOf(b.pos) || a.draftRank - b.draftRank);

  const schedule = await buildSchedule(cfg, events, details, now);

  return {
    generatedAt: now.toISOString(),
    league: { id: leagueId, name: details.league.name },
    me: { entryId, team: mine?.team, manager: mine?.manager, waiverPick: mine?.waiverPick, teams: entries.length },
    lastGw, targetGw, lastGwFinal,
    mustRelease: mine ? { points: mine.points, players: mine.players, released, autoSubs: mine.autoSubs } : null,
    positionsContested: Object.fromEntries(['GK', 'DEF', 'MID', 'FWD'].map(p => [p, needCount(p)])),
    available: byPos,
    hidden,
    comingNextWeek: rivals.flatMap(r => r.players.map(p => ({ ...p, from: r.team, tie: r.players.length > 1 })))
      .sort((a, b) => a.draftRank - b.draftRank),
    rivals,
    waiverOrder: waiverOrder.map(f => ({ team: f.team, manager: f.manager, pick: f.waiverPick, me: f.entryId === entryId })),
    squad,
    schedule,
  };
}
