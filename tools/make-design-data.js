// Builds preview/design/data.js for the design mock-ups from the last local preview
// plus the FPL Form file in Downloads (matched by name + team + position, preview only).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const html = fs.readFileSync('preview/site.html', 'utf8');
const json = html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const M = JSON.parse(json.replace(/\\u003c/g, '<'));

const csvPath = path.join(os.homedir(), 'Downloads', 'fpl-form-predicted-points.csv');
const xp = {};
if (fs.existsSync(csvPath)) {
  const [head, ...lines] = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  const cols = head.split(',');
  const gwCols = cols.map((c, i) => [c, i]).filter(([c]) => /^\d+_pts$/.test(c)).slice(0, 3).map(([, i]) => i);
  for (const line of lines) {
    const c = line.split(',');
    xp[`${c[1]}|${c[2]}|${c[3]}`] = gwCols.reduce((s, i) => s + Number(c[i] || 0), 0);
  }
}
const add = p => { const k = `${p.name}|${p.team}|${p.pos === 'GK' ? 'GK' : p.pos}`; p.xp3 = xp[k] != null ? Math.round(xp[k] * 10) / 10 : null; return p; };
for (const pos of Object.keys(M.available)) M.available[pos].forEach(add);
M.squad.forEach(add); M.hidden.forEach(add); M.comingNextWeek.forEach(add);
if (M.mustRelease) M.mustRelease.players.forEach(add);

fs.mkdirSync('preview/design', { recursive: true });
fs.writeFileSync('preview/design/data.js', 'window.M = ' + JSON.stringify(M) + ';\n');
const matched = M.available.FWD.filter(p => p.xp3 != null).length;
console.log(`data.js written. FWD with predicted points: ${matched}/${M.available.FWD.length}`);
