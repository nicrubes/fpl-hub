// Runs the Challenge pick logic on today's data and prints the six, without building the site.
// Run: node tools/test-challenge.js [rule]   e.g. rule = 3 to try GW3's "All Out Attack" on this week's data.
// Set FPL_CACHE=folder to reuse downloads, FPL_FORM_CSV=path to use a local FPL Form file.
import fs from 'node:fs';
import { buildModel } from '../lib/analyse.js';
import { buildChallenge } from '../lib/challenge.js';
import { parseRule } from '../lib/challenge-rules.js';

const cfg = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const { raw } = await buildModel(cfg, { now: new Date(), state: {}, passcode: null });
const tryGw = process.argv[2] ? Number(process.argv[2]) : null;
const state = {};
if (tryGw) {
  // Borrow another week's rule to see how the logic reacts (written as a temporary override).
  const { loadRuleCopy } = await import('../lib/challenge-data.js');
  const copy = await loadRuleCopy({});
  const teams = raw.classic.teams.map(t => ({ id: t.id, short: t.short_name, name: t.name }));
  const r = parseRule(copy.rules[tryGw], teams);
  const dir = 'preview/test-data'; fs.mkdirSync(dir, { recursive: true });
  const events = await (await import('../lib/challenge-data.js')).challengeApi.events();
  const gw = (events.find(e => e.can_manage && !e.finished) || events.find(e => e.is_next)).id;
  fs.writeFileSync(dir + '/challenge-rule.json', JSON.stringify({ gw, recipe: { group: r.group, points: r.points, defconPts: r.defconPts, actions: r.actions, thresholds: r.thresholds } }));
  process.env.FPL_DATA_DIR = dir;
  console.log(`Trying GW${tryGw}'s rule "${copy.rules[tryGw].title}" on GW${gw} data\n`);
}
const { model: C } = await buildChallenge({ raw, state, dataDir: process.env.FPL_DATA_DIR || 'data' });
if (C.none) { console.log(C.message); process.exit(0); }
console.log(`GW${C.gw} ${C.title}: ${C.description}`);
console.log(`Read as: ${C.readAs}  (${C.ruleSource})`);
console.log(`${C.rules.text.join(' | ')} | ${C.rules.shape}`);
console.log(`First kick-off ${C.firstKickoff}, final deadline ${C.finalDeadline}. Predictions: ${C.predictions || 'none (own estimate)'}`);
console.log(`\nBest six (${C.formation}, total ${C.total} incl. captain):`);
for (const p of C.picks) console.log(`  ${p.pos.padEnd(3)} ${(p.name + (p.id === C.captain ? ' (C)' : '')).padEnd(20)} ${p.team} v ${p.fx.padEnd(9)} adj ${String(p.adj).padStart(4)} (base ${p.base}, rule ${p.boost >= 0 ? '+' : ''}${p.boost}) start ${p.start}% sub ${p.sub}% own ${p.own}% [${p.tag}]${p.flag ? ' ! ' + p.flag : ''}\n        ${p.why.join(' | ')}`);
console.log('\nFormations:', C.formations.map(f => `${f.name} ${f.total}`).join(', '));
console.log('Captain alt:', C.picks.find(p => p.id === C.captainAlt)?.name);
console.log('\nDifferentials:'); for (const p of C.differentials) console.log(`  ${p.pos} ${p.name} ${p.team} v ${p.fx} adj ${p.adj} own ${p.own}% start ${p.start}% ${p.flag || ''}`);
console.log('\nTop attacks:', C.attacks.map(a => `${a.team} ${a.goals} v ${a.vs}`).join('; '));
console.log('Clean sheets:', C.cleanSheets.map(a => `${a.team} ${a.cs}% v ${a.vs}`).join('; '));
console.log('Dilemmas:', C.dilemmas.join('; ') || 'none');
for (const pos of ['GK', 'DEF', 'MID', 'FWD']) console.log(`\n${pos} pool:`, C.pool[pos].map(p => `${p.name} ${p.team} ${p.adj}`).join(', '));
