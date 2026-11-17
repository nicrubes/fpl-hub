// Broken-case tests for the Superbru tab: every bad situation must give "no pick", never a made-up number.
// Run: node tools/test-superbru.js   (no internet, no odds credits, nothing saved)
import { buildSuperbru } from '../lib/superbru.js';
import { consensus, sameTeam } from '../lib/superbru-odds.js';
import { analyse, points } from '../lib/superbru-model.js';

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra && !ok ? ' -> ' + extra : ''}`); };

// ---------- a tiny made-up league
const teams = ['Man City', 'Fulham', 'Spurs', 'Ipswich Town', "Nott'm Forest", 'Brighton', 'Leeds', 'Hull City', 'Arsenal', 'Chelsea', 'Everton', 'Brentford'].map((name, i) => ({ id: i + 1, name, short_name: name.slice(0, 3).toUpperCase() }));
const raw = { classic: { teams, elements: [] }, lives: [], recentGws: [], draftElements: [] };
const T = n => teams.find(t => t.name === n).id;
const NOW = new Date('2026-11-20T10:00:00Z');
let fid = 100;
const fx = (gw, h, a, ko, extra = {}) => ({ id: fid++, event: gw, team_h: T(h), team_a: T(a), kickoff_time: ko, started: false, finished: false, team_h_score: null, team_a_score: null, ...extra });
const book = (title, h, d, a) => ({ title, markets: [{ key: 'h2h', outcomes: null, _p: [h, d, a] }, { key: 'totals', outcomes: [{ name: 'Over', point: 2.5, price: 1.8 }, { name: 'Under', point: 2.5, price: 2.0 }] }] });
function ev(home, away, time, books) {
  return { id: 'e' + home + away, home_team: home, away_team: away, commence_time: time,
    bookmakers: books.map(b => ({ ...b, markets: b.markets.map(m => m.key === 'h2h' ? { key: 'h2h', outcomes: [{ name: home, price: m._p[0] }, { name: 'Draw', price: m._p[1] }, { name: away, price: m._p[2] }] } : m) })) };
}
const fiveBooks = [book('A', 1.5, 4.3, 6.5), book('B', 1.52, 4.2, 6.3), book('C', 1.48, 4.4, 6.8), book('D', 1.5, 4.25, 6.6), book('E', 1.53, 4.1, 6.2)];

// ---------- 1. the maths
const a = analyse({ pH: 0.66, pD: 0.2, pA: 0.14, pOver: 0.6 });
check('Clear favourite gets a home-win pick', a.pick && a.pick.h > a.pick.a, JSON.stringify(a.pick));
check('Scoring: exact 3, close 1.5, result 1, wrong 0', points(2, 1, 2, 1) === 3 && points(2, 1, 1, 0) === 1.5 && points(2, 1, 4, 0) === 1 && points(2, 1, 1, 1) === 0 && points(1, 1, 2, 2) === 1.5);
const tight = analyse({ pH: 0.4, pD: 0.31, pA: 0.29, pOver: 0.42 });
check('Pick always follows the bookmakers\' most likely result', tight.pick.h > tight.pick.a, JSON.stringify(tight.pick));

// ---------- 2. price checks
check('No bookmakers -> no pick', !!consensus({ home_team: 'X', away_team: 'Y', bookmakers: [] }).error);
check('Only 2 bookmakers -> no pick', !!consensus(ev('Fulham', 'Leeds', '', fiveBooks.slice(0, 2))).error);
check('Silly prices are ignored', !!consensus(ev('Fulham', 'Leeds', '', [book('A', 1.0, 4, 6), book('B', 900, 4, 6), book('C', 1.5, 4.2, 6.5)])).error);
const withOutlier = consensus(ev('Fulham', 'Leeds', '', [...fiveBooks, book('Typo', 6.5, 4.2, 1.5)]));
check('An outlier bookmaker is dropped', withOutlier.books === 5 && withOutlier.dropped === 1, JSON.stringify(withOutlier));

// ---------- 3. team names used by the odds service
const oddsNames = { 'Manchester City': 'Man City', 'Manchester United': 'Man Utd', 'Nottingham Forest': "Nott'm Forest", 'Tottenham Hotspur': 'Spurs', 'Newcastle United': 'Newcastle', 'Brighton and Hove Albion': 'Brighton', 'Leeds United': 'Leeds', 'Ipswich Town': 'Ipswich Town', 'Hull City': 'Hull City', 'Coventry City': 'Coventry City', 'Crystal Palace': 'Crystal Palace', 'Aston Villa': 'Aston Villa', 'Wolverhampton Wanderers': 'Wolves', 'West Ham United': 'West Ham' };
check('All known odds-service names match FPL names', Object.entries(oddsNames).every(([o, f]) => sameTeam(o, f)));
check('Different clubs never match (Man City v Man Utd)', !sameTeam('Manchester City', 'Man Utd') && !sameTeam('Manchester United', 'Man City'));

// ---------- 4. the whole pipeline with made-up fixtures and odds
const fixtures = [
  fx(10, 'Arsenal', 'Chelsea', '2026-11-08T15:00:00Z', { started: true, finished: true, team_h_score: 2, team_a_score: 0 }), // last week, played
  fx(11, 'Man City', 'Fulham', '2026-11-21T12:30:00Z'),     // normal
  fx(11, 'Spurs', 'Ipswich Town', '2026-11-21T15:00:00Z'),  // kick-off time mismatch
  fx(11, "Nott'm Forest", 'Brighton', '2026-11-21T15:00:00Z'), // only one bookmaker
  fx(11, 'Leeds', 'Hull City', '2026-11-21T17:30:00Z'),     // no odds at all
  fx(11, 'Everton', 'Brentford', '2026-11-20T09:00:00Z', { started: true }), // already started, nothing saved
];
const odds = {
  at: '2026-11-20T09:30:00Z', remaining: 400, used: 100,
  events: [
    ev('Manchester City', 'Fulham', '2026-11-21T12:30:00Z', fiveBooks),
    ev('Tottenham Hotspur', 'Ipswich Town', '2026-11-22T15:00:00Z', fiveBooks),
    ev('Nottingham Forest', 'Brighton and Hove Albion', '2026-11-21T15:00:00Z', fiveBooks.slice(0, 1)),
    ev('Arsenal', 'Chelsea', '2026-11-08T15:00:00Z', fiveBooks),   // last week's match must never get a pick
    ev('Everton', 'Brentford', '2026-11-20T09:00:00Z', fiveBooks), // started match must never get a pick
    ev('Manchester City Women', 'Fulham', '2026-11-21T12:30:00Z', fiveBooks),
  ],
};
const store = () => ({ live: { snaps: {}, first: {}, emailPicks: {} }, gws: {}, dirty: new Set() });
const s1 = store();
const r1 = await buildSuperbru({ raw, now: NOW, key: 'test', store: s1, fixtures, pull: async () => odds });
const wk = gw => r1.model.weeks.find(w => w.gw === gw);
const M = (w, h) => w.matches.find(m => m.home === h);
const cur = wk(11);
check('Current round is GW11', r1.model.weeks[r1.model.currentIdx].gw === 11);
check('Normal match gets a pick', !!M(cur, 'Man City').a && /^\d-\d$/.test(M(cur, 'Man City').pickText));
check('Kick-off time mismatch -> no pick', !M(cur, 'Spurs').a && /Kick-off times don't match/.test(M(cur, 'Spurs').noPick.reason), JSON.stringify(M(cur, 'Spurs').noPick));
check('One bookmaker only -> no pick', !M(cur, "Nott'm Forest").a && /only 1 bookmaker/.test(M(cur, "Nott'm Forest").noPick.reason), JSON.stringify(M(cur, "Nott'm Forest").noPick));
check('No odds at all -> no pick', !M(cur, 'Leeds').a && M(cur, 'Leeds').noPick.kind === 'none');
check('Match already started -> no pick, not a "prediction"', !M(cur, 'Everton').a && M(cur, 'Everton').state === 'locked', JSON.stringify(M(cur, 'Everton')));
check('Last week\'s played match never gets a pick', !wk(10) || !M(wk(10), 'Arsenal')?.a);
check('Odds for the women\'s team are not used for the men\'s match', Object.keys(s1.live.snaps).length === 4);
check('No number anywhere for a no-pick match', cur.matches.filter(m => !m.a).every(m => !m.pickText && !/\d-\d/.test(JSON.stringify(m.noPick))));

// stale odds: same snapshot seen 30 hours later
const r2 = await buildSuperbru({ raw, now: new Date('2026-11-21T11:00:00Z'), key: 'test', store: s1, fixtures, pull: async () => { throw Object.assign(new Error('the odds service said 500'), { remaining: 400 }); } });
const cur2 = r2.model.weeks.find(w => w.gw === 11);
check('Odds older than 24 hours are marked stale', M(cur2, 'Man City').a.stale === true);
check('A failed pull shows a red banner', r2.model.banner.some(b => b[0] === 'bad' && /had a problem/.test(b[1])));

// freeze at kick-off, then the official result scores it
const pick = M(cur, 'Man City').a.pick;
const later = fixtures.map(f => f.home === undefined && f.team_h === T('Man City') ? { ...f, started: true } : f);
await buildSuperbru({ raw, now: new Date('2026-11-21T12:40:00Z'), key: null, store: s1, fixtures: later });
const frozen = Object.values(s1.gws[11].matches).find(m => m.home === 'Man City');
check('Pick frozen at kick-off with the pre-kick-off odds', frozen && frozen.a && frozen.a.pick.join() === pick.join());
const done = later.map(f => f.team_h === T('Man City') ? { ...f, started: true, finished: true, team_h_score: pick[0], team_a_score: pick[1] } : f);
const r4 = await buildSuperbru({ raw, now: new Date('2026-11-21T15:00:00Z'), key: null, store: s1, fixtures: done });
const scored = M(r4.model.weeks.find(w => w.gw === 11), 'Man City');
check('Final score comes from the official result and scores 3 for an exact pick', scored.res.join('-') === pick.join('-') && scored.pts === 3, JSON.stringify(scored.res) + ' ' + scored.pts);
check('No key -> red banner, no crash', r4.model.banner.some(b => /No odds key/.test(b[1])));

// credits nearly gone -> no more requests
let calls = 0;
const s5 = store(); s5.live.lastPull = { at: '2026-11-19T00:00:00Z', remaining: 5 };
await buildSuperbru({ raw, now: NOW, key: 'test', store: s5, fixtures, pull: async () => { calls++; return odds; } });
check('With fewer than 10 credits left it stops asking', calls === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
