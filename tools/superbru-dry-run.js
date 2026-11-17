// Local check of the Superbru picks without building the site. Never saves anything.
// Needs ODDS_API_KEY in the environment (or skips odds). Set FPL_CACHE to reuse downloads.
import fs from 'node:fs';
import { buildModel } from '../lib/analyse.js';
import { buildSuperbru, loadStore } from '../lib/superbru.js';

const cfg = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const now = process.env.FPL_NOW ? new Date(process.env.FPL_NOW) : new Date();
const { raw } = await buildModel(cfg, { now, state: {}, passcode: null });
const store = await loadStore(null);
const t0 = Date.now();
const { model, log } = await buildSuperbru({ cfg, raw, now, key: process.env.ODDS_API_KEY || null, store });
console.log(log.join('\n'));
console.log('Banner:', model.banner);
console.log(`(${Date.now() - t0} ms)`);
for (const w of model.weeks) {
  console.log(`\nGW${w.gw} ${w.status}: ${w.ready}/${w.matches.length} picks`);
  for (const m of w.matches) console.log(` ${m.home} ${m.pickText || '–'} ${m.away}` + (m.a ? `  [${m.conf[1]}] H${Math.round(m.a.pH * 100)} D${Math.round(m.a.pD * 100)} A${Math.round(m.a.pA * 100)} xG ${m.a.xh.toFixed(2)}-${m.a.xa.toFixed(2)} books ${m.a.books} o25 ${m.a.prices.o25}` : `  (${m.noPick?.reason})`));
  if (w.status === 'current') { console.log(w.matches[0].story.join('\n  ')); console.log(w.summary.map(s => s.join(': ')).join('\n')); }
}
