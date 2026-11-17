// Checks that every weekly Challenge rule the game has published is read correctly.
// Run: node tools/test-challenge-rules.js   (set FPL_CACHE=folder to reuse downloads)
import { loadRuleCopy } from '../lib/challenge-data.js';
import { parseRule, readAs, simpleTerms } from '../lib/challenge-rules.js';

const teams = [
  [1, 'ARS', 'Arsenal'], [2, 'AVL', 'Aston Villa'], [3, 'BOU', 'Bournemouth'], [4, 'BRE', 'Brentford'], [5, 'BHA', 'Brighton'],
  [6, 'CHE', 'Chelsea'], [7, 'COV', 'Coventry'], [8, 'CRY', 'Crystal Palace'], [9, 'EVE', 'Everton'], [10, 'FUL', 'Fulham'],
  [11, 'HUL', 'Hull'], [12, 'IPS', 'Ipswich'], [13, 'LEE', 'Leeds'], [14, 'LIV', 'Liverpool'], [15, 'MCI', 'Man City'],
  [16, 'MUN', 'Man Utd'], [17, 'NEW', 'Newcastle'], [18, 'NFO', "Nott'm Forest"], [19, 'TOT', 'Spurs'], [20, 'SUN', 'Sunderland'],
].map(([id, short, name]) => ({ id, short, name }));
const short = id => teams.find(t => t.id === id)?.short || id;

// What each published rule should come out as (checked by hand against the wording).
const expected = {
  1: 'summer signings score double points',
  2: 'players from COV, HUL, IPS score double points',
  3: 'goals ×2, assists ×2',
  4: 'players from MCI, MUN score double points',
  5: 'defensive contributions score 10 points',
  6: '+10 per winning goal',
  7: 'players playing away score double points',
  8: 'players at their club 5+ years score double points',
  9: '+3 per successful dribble; -1 per time tackled',
  10: '+1 per shot on target from outside the box; +5 per goal from outside the box',
  11: 'players who come off the bench score triple points',
  12: 'players aged 23 or under score double points',
  13: '+1 per successful dribble; +5 one-off for 3+ successful dribbles',
};

const copy = await loadRuleCopy({});
if (copy.error) { console.error('Could not load the rules:', copy.error); process.exit(1); }
console.log(`Read ${Object.keys(copy.rules).length} weekly rules from ${copy.script}\n`);
let bad = 0;
for (const [gw, info] of Object.entries(copy.rules)) {
  const r = parseRule(info, teams);
  const got = readAs(r, short);
  const want = expected[gw];
  const ok = want ? got === want : r.understood;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} GW${gw} ${info.title} (${info.stat || '-'})\n     game: ${info.description}\n     read: ${got}${want && !ok ? '\n     want: ' + want : ''}\n     ${simpleTerms(r)}`);
}
console.log(bad ? `\n${bad} rule(s) not read as expected.` : '\nAll rules read as expected.');
process.exitCode = bad ? 1 : 0;
