// Fetches public FPL data. No login is needed for anything here.
import fs from 'node:fs';
import path from 'node:path';

const DRAFT = 'https://draft.premierleague.com/api/';
const CLASSIC = 'https://fantasy.premierleague.com/api/';

// Set FPL_CACHE=some/folder to reuse downloads while testing locally.
const cacheDir = process.env.FPL_CACHE || null;

async function getJSON(url, { optional = false } = {}) {
  const cacheFile = cacheDir ? path.join(cacheDir, url.replace(/[^a-z0-9]+/gi, '_') + '.json') : null;
  if (cacheFile && fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'fpl-hub-personal/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const json = await res.json();
      if (cacheFile) {
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(json));
      }
      return json;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  if (optional) return null;
  throw lastErr;
}

export const api = {
  bootstrap: () => getJSON(DRAFT + 'bootstrap-static'),
  leagueDetails: id => getJSON(`${DRAFT}league/${id}/details`),
  elementStatus: id => getJSON(`${DRAFT}league/${id}/element-status`),
  transactions: id => getJSON(`${DRAFT}draft/league/${id}/transactions`),
  picks: (entry, gw) => getJSON(`${DRAFT}entry/${entry}/event/${gw}`, { optional: true }),
  live: gw => getJSON(`${DRAFT}event/${gw}/live`, { optional: true }),
  fixtures: gw => getJSON(`${DRAFT}event/${gw}/fixtures`, { optional: true }),
  // The main FPL game has fixture difficulty ratings and the player IDs FPL Form uses.
  classicFixtures: gw => getJSON(`${CLASSIC}fixtures/?event=${gw}`, { optional: true }),
  classicBootstrap: () => getJSON(`${CLASSIC}bootstrap-static/`, { optional: true }),
  // Every fixture of the season with scores (used by the Superbru tab).
  allFixtures: () => getJSON(`${CLASSIC}fixtures/`),
};
