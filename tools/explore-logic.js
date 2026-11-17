// One-off exploration: free agents + my squad with recent minutes, xGI and FPL Form predictions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const get = async u => (await fetch(u)).json();
const D = 'https://draft.premierleague.com/api/';
const [boot, status, classic] = await Promise.all([
  get(D + 'bootstrap-static'), get(D + 'league/39805/element-status'), get('https://fantasy.premierleague.com/api/bootstrap-static/'),
]);
const last = boot.events.current;
const gws = [last - 5, last - 4, last - 3, last - 2, last - 1, last];
const lives = {};
for (const g of gws) lives[g] = (await get(`${D}event/${g}/live`)).elements;

// FPL Form file: classic id -> draft element via shared player "code"
const codeOfClassic = Object.fromEntries(classic.elements.map(e => [e.id, e.code]));
const draftByCode = Object.fromEntries(boot.elements.map(e => [e.code, e]));
const file = path.join(os.homedir(), 'Downloads', 'fpl-form-predicted-points - GW11 to GW38.csv');
const [head, ...rows] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
const cols = head.split(',');
const gwIdx = cols.map((c, i) => [c, i]).filter(([c]) => /^\d+_pts$/.test(c)).map(([, i]) => i);
const xp = {}; let unmatched = 0;
for (const r of rows) {
  const c = r.split(',');
  const d = draftByCode[codeOfClassic[Number(c[0])]];
  if (!d) { unmatched++; continue; }
  const v = gwIdx.map(i => Number(c[i]) || 0);
  xp[d.id] = { n1: v[0], n3: v[0] + v[1] + v[2], n6: v.slice(0, 6).reduce((a, b) => a + b, 0) };
}
console.log(`FPL Form rows: ${rows.length}, matched ${rows.length - unmatched}, unmatched ${unmatched}, GW columns ${gwIdx.length}`);

const owner = Object.fromEntries(status.element_status.map(s => [s.element, s.owner]));
const teams = Object.fromEntries(boot.teams.map(t => [t.id, t.short_name]));
const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const row = e => {
  const mins = gws.map(g => lives[g]?.[e.id]?.stats?.minutes ?? 0);
  const pts = gws.map(g => lives[g]?.[e.id]?.stats?.total_points ?? 0);
  const xgi = gws.map(g => Number(lives[g]?.[e.id]?.stats?.expected_goal_involvements ?? 0));
  const m3 = mins.slice(3).reduce((a, b) => a + b, 0), mPrev = mins.slice(0, 3).reduce((a, b) => a + b, 0);
  return {
    name: e.web_name, team: teams[e.team], pos: POS[e.element_type], rank: e.draft_rank, total: e.total_points, st: e.status,
    mins: mins.join('/'), pts: pts.join('/'), m3, mPrev, xgi3: +xgi.slice(3).reduce((a, b) => a + b, 0).toFixed(2), xgiPrev: +xgi.slice(0, 3).reduce((a, b) => a + b, 0).toFixed(2),
    xp3: xp[e.id] ? +xp[e.id].n3.toFixed(1) : null, xp6: xp[e.id] ? +xp[e.id].n6.toFixed(1) : null, news: (e.news || '').slice(0, 40),
  };
};
const pos = process.argv[2] || 'DEF';
const free = boot.elements.filter(e => !owner[e.id] && POS[e.element_type] === pos && e.status !== 'u').map(row);
console.log(`\nGWs ${gws.join(',')}  (mins / pts per GW, oldest first)\n--- FREE ${pos}: top 30 by FPL Form next 3 ---`);
console.table(free.sort((a, b) => (b.xp3 ?? -1) - (a.xp3 ?? -1)).slice(0, 30));
const names = (process.argv[3] || '').split(',').filter(Boolean);
if (names.length) { console.log('--- named ---'); console.table(boot.elements.filter(e => names.some(n => e.web_name.toLowerCase().includes(n.toLowerCase()))).map(e => ({ ...row(e), owner: owner[e.id] || '' }))); }
console.log('--- MY SQUAD ---');
console.table(boot.elements.filter(e => owner[e.id] === 208225).map(row).sort((a, b) => a.pos.localeCompare(b.pos)));
