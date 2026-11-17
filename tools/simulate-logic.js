// Dry run of the proposed hidden-picks / waiver logic on live data (exploration only).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const get = async u => (await fetch(u)).json();
const D = 'https://draft.premierleague.com/api/';
const [boot, status, classic, details] = await Promise.all([
  get(D + 'bootstrap-static'), get(D + 'league/39805/element-status'), get('https://fantasy.premierleague.com/api/bootstrap-static/'), get(D + 'league/39805/details'),
]);
const last = boot.events.current;
const gws = [last - 5, last - 4, last - 3, last - 2, last - 1, last];
const lives = {};
for (const g of gws) lives[g] = (await get(`${D}event/${g}/live`)).elements;
const codeOfClassic = Object.fromEntries(classic.elements.map(e => [e.id, e.code]));
const draftByCode = Object.fromEntries(boot.elements.map(e => [e.code, e]));
const [head, ...rows] = fs.readFileSync(path.join(os.homedir(), 'Downloads', 'fpl-form-predicted-points - GW11 to GW38.csv'), 'utf8').trim().split(/\r?\n/);
const gwIdx = head.split(',').map((c, i) => [c, i]).filter(([c]) => /^\d+_pts$/.test(c)).map(([, i]) => i);
const xp = {};
for (const r of rows) { const c = r.split(','); const d = draftByCode[codeOfClassic[Number(c[0])]]; if (d) xp[d.id] = gwIdx.map(i => Number(c[i]) || 0); }
const owner = Object.fromEntries(status.element_status.map(s => [s.element, s.owner]));
const teams = Object.fromEntries(boot.teams.map(t => [t.id, t.short_name]));
const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const sum = a => a.reduce((x, y) => x + y, 0);

const P = boot.elements.filter(e => e.status !== 'u').map(e => {
  const st = g => lives[g]?.[e.id]?.stats || {};
  const mins = gws.map(g => st(g).minutes || 0), xgi = gws.map(g => Number(st(g).expected_goal_involvements || 0));
  const f = xp[e.id] || [];
  return {
    id: e.id, name: e.web_name, team: teams[e.team], pos: POS[e.element_type], rank: e.draft_rank, total: e.total_points, status: e.status,
    chance: e.chance_of_playing_next_round, news: e.news || '', owner: owner[e.id] || null,
    mins, m3: sum(mins.slice(3)), mPrev: sum(mins.slice(0, 3)), xgi3: sum(xgi.slice(3)), xgiPrev: sum(xgi.slice(0, 3)),
    xp1: f[0] || 0, xp3: sum(f.slice(0, 3)), xp6: sum(f.slice(0, 6)),
  };
});

// ---- signals
const pedigree = p => Math.max(0, 300 - Math.min(p.rank, 300)) / 100;         // 0..3, higher = rated pre-season
const rising = p => p.m3 >= 120 && p.m3 - p.mPrev >= 90 && p.mins[5] >= 45;     // breaking into the team
const xgiUp = p => p.m3 >= 90 && p.xgi3 - p.xgiPrev >= 0.25;                     // more involved lately
const injuredNow = p => ['i', 'd', 's'].includes(p.status);
const backSoon = p => injuredNow(p) && (/expected back/i.test(p.news) || (p.chance ?? 0) >= 25 || p.xp1 >= 1.2);
const justReturned = p => p.status === 'a' && p.mins[5] > 0 && p.mins[3] + p.mins[4] === 0 && p.mPrev > 0; // played, missed 2, back
const tag = p => backSoon(p) ? 'back from injury' : justReturned(p) ? 'just returned' : rising(p) ? 'minutes rising' : xgiUp(p) ? 'xGI rising' : '';

const pos = process.argv[2] || 'DEF';
const free = P.filter(p => !p.owner && p.pos === pos);
const hidden = free.filter(p => tag(p) && !(p.status === 'a' && p.m3 < 90 && !justReturned(p)))
  .map(p => ({ ...p, why: tag(p), score: p.xp3 + pedigree(p) }))
  .sort((a, b) => b.score - a.score).slice(0, 10);
console.log(`\n=== HIDDEN ${pos} (score = FPL Form next-3 + pedigree from draft rank) ===`);
console.table(hidden.map(p => ({ name: p.name, team: p.team, rank: p.rank, mins: p.mins.join('/'), xp3: +p.xp3.toFixed(1), why: p.why, score: +p.score.toFixed(1), news: p.news.slice(0, 30) })));

const top = free.filter(p => p.status === 'a' || p.status === 'd').sort((a, b) => b.xp3 - a.xp3).slice(0, 6);
console.log(`=== TOP ${pos} by FPL Form next 3 (the "in demand" tier) ===`);
console.table(top.map(p => ({ name: p.name, team: p.team, rank: p.rank, total: p.total, xp3: +p.xp3.toFixed(1), mins: p.mins.join('/') })));

// ---- weak players in my squad (optional outs)
const mine = P.filter(p => p.owner === 208225);
const bestFree = Object.fromEntries(['GK', 'DEF', 'MID', 'FWD'].map(ps => [ps, Math.max(...P.filter(p => !p.owner && p.pos === ps && p.status === 'a').map(p => p.xp3))]));
console.log('=== MY SQUAD: weakness check (gap = best free agent next-3 minus this player) ===');
console.table(mine.map(p => ({
  name: p.name, pos: p.pos, mins: p.mins.join('/'), xp3: +p.xp3.toFixed(1), gap: +(bestFree[p.pos] - p.xp3).toFixed(1),
  flag: p.status === 's' ? 'suspended' : p.status === 'i' ? 'injured' : p.m3 <= 90 ? 'few minutes' : (bestFree[p.pos] - p.xp3) >= 3 ? 'clear upgrade' : '',
})).sort((a, b) => b.gap - a.gap));

// ---- who must buy what, ahead of me
const me = details.league_entries.find(e => e.entry_id === 208225);
console.log(`My waiver pick: ${me.waiver_pick}. Teams ahead: ${me.waiver_pick - 1}`);
