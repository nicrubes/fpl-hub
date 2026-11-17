// Prints the waiver plan and hidden picks from the last local preview (for checking).
import fs from 'node:fs';
const h = fs.readFileSync('preview/site.html', 'utf8');
const M = JSON.parse(h.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1].replace(/\\u003c/g, '<'));
const x = p => (p.pred ? p.pred.n3.toFixed(1) : '-');
console.log('OUTS:');
for (const o of M.plan.outs) console.log(' ', o.out.name, o.out.pos, o.forced ? 'FORCED' : 'optional', o.reasons.join(' | '), 'drop', o.dropOff);
console.log('CLAIMS:');
for (const c of M.plan.claims) console.log(' ', c.n, c.out.name, '->', c.in.name, x(c.in), '|', c.chance, '|', c.reason);
console.log('needAhead', JSON.stringify(M.plan.needAhead), 'needAll', JSON.stringify(M.plan.needAll));
console.log('HIDDEN top 20:');
for (const p of M.hidden.slice(0, 20)) console.log(' ', p.pos, p.name, p.team, 'rank', p.draftRank, 'xp3', x(p), 'mins', p.mins.join('/'), '|', p.why);
