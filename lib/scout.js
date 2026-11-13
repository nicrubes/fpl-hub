// Nic's scouting method, automated:
//  - hidden picks (back from injury, breaking into the team, more involved lately)
//  - weak spots in the squad
//  - a stacked waiver plan in the best order
//  - a suggested team sheet
const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];
const sum = a => a.reduce((x, y) => x + y, 0);
const r1 = x => Math.round(x * 10) / 10;
const DAY = 864e5;

// ---------- player-level signals
export function addSignals(p, { lastGw, now, fitSince }) {
  const m = p.mins; // last 6 GWs, oldest first
  p.m3 = sum(m.slice(3));
  p.mPrev = sum(m.slice(0, 3));
  p.xgi3 = sum(p.xgis.slice(3));
  p.xgiPrev = sum(p.xgis.slice(0, 3));
  // Value = FPL Form predicted points for the next 3 GWs; fallback uses points per game and recent minutes.
  p.val = p.pred ? p.pred.n3 : p.ppg * 3 * Math.min(1, p.m3 / 180);
  p.val1 = p.pred ? p.pred.n1 : p.ppg * Math.min(1, m[5] / 60);
  p.pedigree = Math.max(0, 300 - Math.min(p.draftRank, 300)) / 100;
  p.popularity = p.val + p.total / 15;

  const out = ['i', 'd', 's'].includes(p.status);
  const sig = [];
  if (out && (/expected back/i.test(p.news) || (p.chance ?? 0) >= 25 || (p.pred && p.pred.n1 >= 1.2))) {
    sig.push({ kind: 'back', text: `Back from injury soon: ${p.news || 'FPL Form expects him to play'}` });
  }
  const since = fitSince?.[p.id];
  if (!out && since && now - new Date(since) < 10 * DAY) {
    sig.push({ kind: 'back', text: `Declared fit again ${new Date(since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })}` });
  }
  if (!out && m[5] > 0 && m[3] + m[4] === 0 && p.mPrev > 0) {
    let missed = 0;
    for (let k = 4; k >= 0 && m[k] === 0; k--) missed++;
    sig.push({ kind: 'back', text: `Back playing in GW${lastGw} after ${missed} games out` });
  }
  if (p.m3 >= 120 && p.mPrev <= 120 && m[5] >= 45 && m[5] >= m[3] - 30) {
    sig.push({ kind: 'minutes', text: `Minutes rising: ${m.slice(2).join(', ')}` });
  }
  if (p.m3 >= 90 && p.xgi3 - p.xgiPrev >= 0.25) {
    sig.push({ kind: 'xgi', text: `More involved: xGI ${r1(p.xgi3)} in last 3 games, ${r1(p.xgiPrev)} in the 3 before` });
  }
  p.signals = sig;
  p.hasBackSignal = sig.some(s => s.kind === 'back');
  return p;
}

// ---------- hidden picks
export function hiddenPicks(free, lastGw) {
  const topByPoints = new Set();
  for (const pos of POSITIONS) {
    free.filter(p => p.pos === pos).sort((a, b) => b.total - a.total).slice(0, 5).forEach(p => topByPoints.add(p.id));
  }
  return free
    .filter(p => p.signals.length)
    .filter(p => !(p.released && p.released.gw === lastGw))
    .filter(p => !topByPoints.has(p.id))
    .filter(p => p.m3 >= 90 || p.hasBackSignal)
    .map(p => ({ ...p, why: p.signals[0].text, hiddenScore: p.val + p.pedigree }))
    .sort((a, b) => b.hiddenScore - a.hiddenScore);
}

// ---------- weak spots in my squad (optional releases, waiver plan only)
export function weakSpots(squad, free, forcedIds) {
  const bestFree = Object.fromEntries(POSITIONS.map(pos => [pos, Math.max(0, ...free.filter(p => p.pos === pos && p.status === 'a').map(p => p.val))]));
  return squad.filter(p => !forcedIds.has(p.id)).map(p => {
    const reasons = [];
    let score = 0;
    if (p.status === 's' || p.status === 'i') { reasons.push(p.news || (p.status === 's' ? 'Suspended' : 'Injured')); score += 100; }
    else if (p.status === 'd' && (p.chance ?? 100) < 75) { reasons.push(p.news || 'Doubtful'); score += 60; }
    if (p.m3 <= 90 && p.status === 'a') { reasons.push(`Only ${p.m3} minutes in the last 3 games`); score += 50; }
    const gap = bestFree[p.pos] - p.val;
    if (gap >= 3) { reasons.push(`Predicted ${r1(gap)} pts fewer than the best free ${p.pos} over the next 3`); score += gap; }
    return { ...p, weakScore: score, weakReasons: reasons, gap: r1(gap) };
  }).filter(p => p.weakReasons.length).sort((a, b) => b.weakScore - a.weakScore);
}

// ---------- waiver plan
export function waiverPlan({ squad, free, forced, rivals, myPick, hidden }) {
  const forcedIds = new Set(forced.map(p => p.id));
  const eligible = free.filter(p => !p.locked && (p.status === 'a' || (p.status === 'd' && (p.chance ?? 0) >= 50) || p.hasBackSignal));
  const needAhead = {}, needAll = {};
  for (const pos of POSITIONS) {
    const needs = r => r.players.some(p => p.pos === pos);
    needAhead[pos] = rivals.filter(r => r.waiverPick < myPick && needs(r)).length;
    needAll[pos] = rivals.filter(needs).length;
  }
  const popRank = {};
  for (const pos of POSITIONS) {
    eligible.filter(p => p.pos === pos).sort((a, b) => b.popularity - a.popularity).forEach((p, i) => { popRank[p.id] = i; });
  }
  const chance = p => popRank[p.id] < needAhead[p.pos] ? 'likely gone' : popRank[p.id] < needAll[p.pos] + 2 ? 'contested' : 'likely there';

  // depth 9 (forced): 4 in-demand + 4 hidden + 1 safe. 5 (second out, same position): 3 + 2. 3: 2 + 1. 1 (GK): best only.
  const split = { 9: [4, 4], 5: [3, 2], 4: [3, 1], 3: [2, 1], 1: [1, 0] };
  const targetsFor = (pos, outVal, depth) => {
    const [nDemand, nHidden] = split[depth] || [depth, 0];
    const pool = eligible.filter(p => p.pos === pos && p.val > outVal + 1);
    const inDemand = pool.slice().sort((a, b) => b.popularity - a.popularity).slice(0, nDemand).sort((a, b) => b.val - a.val);
    let hid = hidden.filter(h => h.pos === pos && pool.some(p => p.id === h.id) && !inDemand.some(d => d.id === h.id)).slice(0, nHidden);
    if (hid.length < nHidden) {
      const extra = pool.filter(p => !inDemand.some(d => d.id === p.id) && !hid.some(x => x.id === p.id)).sort((a, b) => b.popularity - a.popularity).slice(0, nHidden - hid.length);
      inDemand.push(...extra);
    }
    let list = [...inDemand.map(p => ({ p, tier: 'demand' })), ...hid.map(h => ({ p: pool.find(x => x.id === h.id), tier: 'hidden', why: h.why }))];
    if (depth > 6) {
      const spare = pool.filter(p => !list.some(t => t.p.id === p.id) && chance(p) === 'likely there').sort((a, b) => b.val - a.val)[0];
      if (spare) list.push({ p: spare, tier: 'safe' });
    }
    return list.slice(0, depth);
  };

  // Which players go out: forced release first, then the weakest flagged player per position.
  const weak = weakSpots(squad, free, forcedIds);
  const outs = forced.slice(0, 1).map(p => ({ out: p, forced: true }));
  for (const pos of POSITIONS) {
    const w = weak.find(x => x.pos === pos);
    if (w) outs.push({ out: w, forced: false, reasons: w.weakReasons });
  }
  for (const o of outs) {
    const pos = o.out.pos;
    const sharesPos = outs.filter(x => x.out.pos === pos).length > 1;
    const depth = o.forced ? 9 : pos === 'GK' ? 1 : sharesPos ? 5 : pos === 'FWD' ? 4 : 3;
    const outVal = o.forced ? -1 : o.out.val;
    o.targets = targetsFor(pos, outVal, depth);
    // How much is lost by waiting a turn: best upgrade likely there at your first turn
    // vs. at your next turn (after every rival who needs this position has picked).
    const pool = eligible.filter(p => p.pos === pos && p.val > outVal + 1);
    const t1 = Math.max(0, ...pool.filter(p => popRank[p.id] >= needAhead[pos]).map(p => p.val));
    const t2 = Math.max(0, ...pool.filter(p => popRank[p.id] >= needAll[pos] + 2).map(p => p.val));
    o.dropOff = r1(t1 - t2);
  }
  // Order: the claim group where waiting costs most goes first; the forced release never later than
  // second (it has to happen); goalkeepers last (a back-up keeper rarely matters).
  const useful = outs.filter(o => o.targets.length);
  useful.sort((a, b) => (a.out.pos === 'GK') - (b.out.pos === 'GK') || b.dropOff - a.dropOff || (b.forced ? 1 : 0) - (a.forced ? 1 : 0));
  const fi = useful.findIndex(o => o.forced);
  if (fi > 1) useful.splice(1, 0, useful.splice(fi, 1)[0]);
  // Keep a second out in the same position behind the first (same targets, stacked).
  const ordered = [];
  for (const o of useful) if (!ordered.includes(o)) { ordered.push(o); useful.filter(x => x !== o && x.out.pos === o.out.pos).forEach(x => { if (!ordered.includes(x)) ordered.push(x); }); }

  const claims = [];
  for (const o of ordered) {
    o.targets.forEach((t, i) => {
      const c = chance(t.p);
      let reason;
      if (t.tier === 'hidden') reason = `Hidden pick. ${t.why}.`;
      else if (t.tier === 'safe') reason = 'Safe last resort that few rivals will look at.';
      else if (c === 'likely gone') reason = `In demand. ${needAhead[t.p.pos] === 1 ? '1 team ahead of you needs' : needAhead[t.p.pos] + ' teams ahead of you need'} a ${t.p.pos}, so probably gone, but worth a shot.`;
      else if (c === 'contested') reason = `In demand and realistic at your pick.`;
      else reason = 'Strong option few rivals need this week.';
      claims.push({ n: claims.length + 1, out: o.out, in: t.p, forced: o.forced, tier: t.tier, chance: c, reason, first: i === 0 });
    });
  }
  return {
    claims,
    outs: ordered.map(o => ({ out: o.out, forced: o.forced, reasons: o.reasons || [], dropOff: o.dropOff, targetCount: o.targets.length })),
    needAhead, needAll, weak,
  };
}

// ---------- suggested team sheet for the next gameweek
export function teamSheet(squad, forced, likelyIn) {
  const forcedIds = new Set(forced.map(p => p.id));
  const pool = squad.filter(p => !forcedIds.has(p.id)).concat(likelyIn ? [{ ...likelyIn, incoming: true }] : []);
  const score = p => (p.status === 's' || p.status === 'i') ? -1 : p.val1 * ((p.status === 'd' ? (p.chance ?? 50) : 100) / 100);
  const by = pos => pool.filter(p => p.pos === pos).sort((a, b) => score(b) - score(a));
  const G = by('GK'), D = by('DEF'), M = by('MID'), F = by('FWD');
  let best = null;
  for (let d = 3; d <= 5; d++) for (let m = 2; m <= 5; m++) {
    const f = 10 - d - m;
    if (f < 1 || f > 3 || D.length < d || M.length < m || F.length < f || !G.length) continue;
    const xi = [G[0], ...D.slice(0, d), ...M.slice(0, m), ...F.slice(0, f)];
    const total = sum(xi.map(score));
    if (!best || total > best.total) best = { d, m, f, xi, total };
  }
  if (!best) return null;
  const inXi = new Set(best.xi.map(p => p.id));
  const benchOut = pool.filter(p => !inXi.has(p.id) && p.pos !== 'GK').sort((a, b) => score(b) - score(a));
  return {
    formation: `${best.d}-${best.m}-${best.f}`,
    predicted: r1(best.total),
    lines: { GK: [G[0]], DEF: D.slice(0, best.d), MID: M.slice(0, best.m), FWD: F.slice(0, best.f) },
    bench: [...G.slice(1, 2), ...benchOut],
    forced: forced,
  };
}
