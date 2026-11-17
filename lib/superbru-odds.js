// Live Premier League odds from The Odds API (the-odds-api.com, free plan: 500 credits a month).
// One request = all upcoming EPL matches, match odds + over/under, UK bookmakers = 2 credits.
// The key comes from the ODDS_API_KEY secret and is never written anywhere.
// Their terms allow showing odds and values worked out from them; not passing on the raw data,
// so everything saved is locked with the site passcode.
import fs from 'node:fs';
import path from 'node:path';

const URL_ODDS = 'https://api.the-odds-api.com/v4/sports/soccer_epl/odds';
const cacheDir = process.env.FPL_CACHE || null; // local testing only (file name never contains the key)

export async function pullOdds(key) {
  const cacheFile = cacheDir ? path.join(cacheDir, 'the_odds_api_soccer_epl_h2h_totals.json') : null;
  if (cacheFile && fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const u = new URL(URL_ODDS);
  u.searchParams.set('apiKey', key);
  u.searchParams.set('regions', 'uk');
  u.searchParams.set('markets', 'h2h,totals');
  u.searchParams.set('oddsFormat', 'decimal');
  let res;
  try { res = await fetch(u, { headers: { 'User-Agent': 'fpl-hub-personal/1.0' } }); }
  catch (err) { throw new Error('could not reach the odds service (' + err.message + ')'); }
  const remaining = Number(res.headers.get('x-requests-remaining'));
  const used = Number(res.headers.get('x-requests-used'));
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = new Error(res.status === 401 ? 'the odds key was not accepted (it may be wrong or the free plan has run out)' : `the odds service said ${res.status}${body?.message ? ': ' + body.message : ''}`);
    e.status = res.status; e.remaining = Number.isFinite(remaining) ? remaining : null;
    throw e;
  }
  const out = { at: new Date().toISOString(), remaining: Number.isFinite(remaining) ? remaining : null, used: Number.isFinite(used) ? used : null, events: Array.isArray(body) ? body : [] };
  if (cacheFile) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(out)); }
  return out;
}

// ---------- team names: the odds service uses long names, FPL short ones
const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const ALIAS = {
  'manchester city': 'man city', 'manchester united': 'man utd', 'nottingham forest': 'nottm forest',
  'tottenham hotspur': 'spurs', 'tottenham': 'spurs', 'newcastle united': 'newcastle', 'brighton and hove albion': 'brighton',
  'leeds united': 'leeds', 'west ham united': 'west ham', 'wolverhampton wanderers': 'wolves', 'leicester city': 'leicester',
  'sheffield united': 'sheffield utd', 'afc bournemouth': 'bournemouth', 'luton town': 'luton', 'west bromwich albion': 'west brom',
  'norwich city': 'norwich', 'sunderland afc': 'sunderland', 'ipswich': 'ipswich town', 'hull': 'hull city', 'coventry': 'coventry city',
  'stoke city': 'stoke', 'swansea city': 'swansea', 'cardiff city': 'cardiff', 'queens park rangers': 'qpr',
};
const canon = s => { const n = norm(s); return ALIAS[n] || n; };
export function sameTeam(oddsName, fplName) { return canon(oddsName) === canon(fplName); }

// ---------- one match's prices -> consensus chances, with sanity checks
const median = xs => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const r2 = x => Math.round(x * 100) / 100;
const okPrice = p => Number.isFinite(p) && p >= 1.01 && p <= 101;

export function consensus(ev, { minBooks = 3 } = {}) {
  const books = [];
  const overs = [];
  for (const b of ev.bookmakers || []) {
    const h2h = b.markets?.find(m => m.key === 'h2h');
    if (h2h) {
      const price = name => h2h.outcomes.find(o => o.name === name)?.price;
      const h = price(ev.home_team), a = price(ev.away_team), d = price('Draw');
      if ([h, d, a].every(okPrice)) {
        const s = 1 / h + 1 / d + 1 / a;
        if (s >= 1.0 && s <= 1.25) books.push({ title: b.title, h, d, a, pH: 1 / h / s, pD: 1 / d / s, pA: 1 / a / s });
      }
    }
    const tot = b.markets?.find(m => m.key === 'totals');
    if (tot) {
      const o = tot.outcomes.find(x => x.name === 'Over' && x.point === 2.5)?.price;
      const u = tot.outcomes.find(x => x.name === 'Under' && x.point === 2.5)?.price;
      if (okPrice(o) && okPrice(u)) { const s = 1 / o + 1 / u; if (s >= 1.0 && s <= 1.2) overs.push({ o, u, p: 1 / o / s }); }
    }
  }
  // drop bookmakers far away from the rest (a typo or a stale line)
  const mh = median(books.map(b => b.pH)), ma = median(books.map(b => b.pA));
  const kept = books.filter(b => Math.abs(b.pH - mh) <= 0.08 && Math.abs(b.pA - ma) <= 0.08);
  const dropped = books.length - kept.length;
  if (kept.length < minBooks) return { error: `only ${kept.length} bookmaker${kept.length === 1 ? '' : 's'} had sensible prices (need ${minBooks})` };
  const mean = k => kept.reduce((s, b) => s + b[k], 0) / kept.length;
  const pH = mean('pH'), pD = mean('pD'), pA = mean('pA'), t = pH + pD + pA;
  const pOver = overs.length ? overs.reduce((s, x) => s + x.p, 0) / overs.length : null;
  return {
    pH: pH / t, pD: pD / t, pA: pA / t, pOver,
    books: kept.length, dropped, overBooks: overs.length,
    prices: { h: r2(median(kept.map(b => b.h))), d: r2(median(kept.map(b => b.d))), a: r2(median(kept.map(b => b.a))), o25: overs.length ? r2(median(overs.map(x => x.o))) : null, u25: overs.length ? r2(median(overs.map(x => x.u))) : null },
  };
}
