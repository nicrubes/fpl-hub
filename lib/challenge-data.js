// Reads the public FPL Challenge data (no sign-in), plus the main game's full fixture list.
// Nic accepted the FPL Challenge terms risk (clause on "automated systems") on 17 Nov 2026.
// Kept light: three small reads per run; the game's big page script is only read when it changes.
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://fplchallenge.premierleague.com/';
const CLASSIC = 'https://fantasy.premierleague.com/api/';
const cacheDir = process.env.FPL_CACHE || null; // local testing only

async function get(url, { text = false, optional = false } = {}) {
  const cacheFile = cacheDir ? path.join(cacheDir, url.replace(/[^a-z0-9]+/gi, '_') + (text ? '.txt' : '.json')) : null;
  if (cacheFile && fs.existsSync(cacheFile)) {
    const body = fs.readFileSync(cacheFile, 'utf8');
    return text ? body : JSON.parse(body);
  }
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'fpl-hub-personal/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = await res.text();
      const out = text ? body : JSON.parse(body);
      if (cacheFile) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, body); }
      return out;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  if (optional) return null;
  throw lastErr;
}

export const challengeApi = {
  events: async () => { const e = await get(BASE + 'api/events/'); return Array.isArray(e) ? e : e.events; },
  elements: gw => get(`${BASE}api/elements/${gw}/`, { optional: true }),
  fixtures: gw => get(`${BASE}api/fixtures/?event=${gw}`, { optional: true }),
  home: () => get(BASE + 'en/', { text: true, optional: true }),
  script: name => get(BASE + 'assets/' + name, { text: true, optional: true }),
  classicFixtures: () => get(CLASSIC + 'fixtures/'),
};

// The weekly rule wording lives in the game's page script, keyed by gameweek.
// Only re-read it when the script's file name changes (it changes when the game is updated).
export async function loadRuleCopy(cache = {}) {
  const html = await challengeApi.home();
  const name = html && (html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/) || [])[1];
  if (!name) return { ...cache, checkedAt: new Date().toISOString(), error: 'Could not find the game\'s page script' };
  if (cache.script === name && cache.rules && Object.keys(cache.rules).length) return cache;
  const js = await challengeApi.script(name);
  if (!js) return { ...cache, error: 'Could not read the game\'s page script' };
  const rules = parseRuleCopy(js);
  if (!Object.keys(rules).length) return { ...cache, error: 'No challenge wording found in the game\'s page script' };
  return { script: name, fetchedAt: new Date().toISOString(), rules };
}

// Finds entries like 11:{copy:{description:`...`,filterLabel:`...`,title:`Make the Call`},...,featuredElementStatSort:`form`}
export function parseRuleCopy(js) {
  const out = {};
  const re = /(\d{1,2}):\{copy:\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(js))) {
    const gw = Number(m[1]);
    if (gw < 1 || gw > 38 || out[gw]) continue;
    const body = m[2];
    const field = k => (body.match(new RegExp('\\b' + k + ':`([^`]*)`')) || body.match(new RegExp('\\b' + k + ':"((?:[^"\\\\]|\\\\.)*)"')) || [])[1] || '';
    const title = field('title'), description = field('description');
    if (!title || !description) continue;
    const after = js.slice(re.lastIndex, re.lastIndex + 400).split(/\}\s*,\s*\d{1,2}:\{copy/)[0];
    const stat = (after.match(/featuredElementStatSort:[`"]([a-z_0-9]+)[`"]/) || [])[1] || null;
    out[gw] = { title, description, filterLabel: field('filterLabel'), stat };
  }
  return out;
}
