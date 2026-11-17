// Superbru pick maths. No guessing anywhere: everything starts from bookmakers' prices.
// 1. Bookmakers' prices -> chances (margin removed, averaged across bookmakers).
// 2. Find the expected goals for each side that reproduce those chances (goals model).
// 3. For every scoreline, work out the average Superbru points it would earn; pick the best one
//    whose result (home win / draw / away win) is the bookmakers' most likely result.
// Superbru scoring: 3 exact, 1.5 right result + close, 1 right result, 0 wrong result.
// Close = |goal-difference gap| + |total-goals gap| / 2 <= 1.5.

const MAXG = 7;
const RHO = -0.08; // small correction for 0-0, 1-0, 0-1, 1-1 (football has more of these than plain Poisson says)
const fact = [1]; for (let i = 1; i <= MAXG; i++) fact[i] = fact[i - 1] * i;
const pmf = l => Array.from({ length: MAXG + 1 }, (_, k) => Math.exp(-l) * l ** k / fact[k]);

export function grid(lh, la) {
  const ph = pmf(lh), pa = pmf(la), g = [];
  let s = 0;
  for (let h = 0; h <= MAXG; h++) for (let a = 0; a <= MAXG; a++) {
    let p = ph[h] * pa[a];
    if (h === 0 && a === 0) p *= 1 - lh * la * RHO;
    else if (h === 0 && a === 1) p *= 1 + lh * RHO;
    else if (h === 1 && a === 0) p *= 1 + la * RHO;
    else if (h === 1 && a === 1) p *= 1 - RHO;
    g.push({ h, a, p }); s += p;
  }
  for (const c of g) c.p /= s;
  return g;
}

function summarise(g) {
  let pH = 0, pD = 0, pO = 0;
  for (const c of g) { if (c.h > c.a) pH += c.p; else if (c.h === c.a) pD += c.p; if (c.h + c.a >= 3) pO += c.p; }
  return { pH, pD, pA: 1 - pH - pD, pOver: pO };
}

export const sign = (h, a) => Math.sign(h - a);

export function points(ph, pa, h, a) {
  if (ph === h && pa === a) return 3;
  if (sign(ph, pa) !== sign(h, a)) return 0;
  const ci = Math.abs((ph - pa) - (h - a)) + Math.abs((ph + pa) - (h + a)) / 2;
  return ci <= 1.5 ? 1.5 : 1;
}

// Find home/away expected goals that best match the market chances (and over 2.5 goals, if known).
export function fitGoals(m) {
  const err = (lh, la) => {
    const s = summarise(grid(lh, la));
    let e = (s.pH - m.pH) ** 2 + (s.pD - m.pD) ** 2 + (s.pA - m.pA) ** 2;
    if (m.pOver != null) e += (s.pOver - m.pOver) ** 2;
    return e;
  };
  let best = { lh: 1.4, la: 1.1, e: Infinity };
  for (let lh = 0.2; lh <= 4.01; lh += 0.1) for (let la = 0.2; la <= 4.01; la += 0.1) {
    const e = err(lh, la); if (e < best.e) best = { lh, la, e };
  }
  for (let step of [0.02, 0.005]) {
    const c = best;
    for (let dh = -5; dh <= 5; dh++) for (let da = -5; da <= 5; da++) {
      const lh = c.lh + dh * step, la = c.la + da * step;
      if (lh <= 0.05 || la <= 0.05) continue;
      const e = err(lh, la); if (e < best.e) best = { lh, la, e };
    }
  }
  const s = summarise(grid(best.lh, best.la));
  const gap = Math.max(Math.abs(s.pH - m.pH), Math.abs(s.pD - m.pD), Math.abs(s.pA - m.pA));
  return { lh: best.lh, la: best.la, model: s, gap };
}

// The full analysis for one match, from the market chances. Returns null + reason if it can't be trusted.
export function analyse(m, { maxGap = 0.03 } = {}) {
  const fit = fitGoals(m);
  if (fit.gap > maxGap) return { error: `the goals model couldn't match the bookmakers' chances closely enough (off by ${Math.round(fit.gap * 100)} points)` };
  const g = grid(fit.lh, fit.la);
  const fav = m.pH >= m.pD && m.pH >= m.pA ? 1 : m.pA >= m.pD ? -1 : 0; // the bookmakers' most likely result
  const cands = [];
  for (let h = 0; h <= 5; h++) for (let a = 0; a <= 5; a++) {
    if (sign(h, a) !== fav) continue;
    const ev = g.reduce((s, c) => s + c.p * points(h, a, c.h, c.a), 0);
    cands.push({ h, a, ev, p: g.find(c => c.h === h && c.a === a).p });
  }
  cands.sort((x, y) => y.ev - x.ev);
  const favP = Math.max(m.pH, m.pD, m.pA);
  return {
    pH: m.pH, pD: m.pD, pA: m.pA, pOver: m.pOver ?? null, fav,
    xh: fit.lh, xa: fit.la, tg: fit.lh + fit.la,
    pick: cands[0], alt: cands[1],
    conf: favP >= 0.6 ? ['banker', 'Banker'] : favP >= 0.45 ? ['lean', 'Lean'] : ['toss', 'Toss-up'],
  };
}
