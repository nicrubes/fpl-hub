// Reads FPL Form predicted points and matches them to FPL Draft players.
// FPL Form uses the main FPL game's player IDs; both games share a player "code",
// so we map FPL Form ID -> main-game code -> Draft player.
import fs from 'node:fs';
import { decryptText } from './crypto.js';

// Parse an FPL Form CSV ("ID,Name,Team,Pos,Price,11_pts,12_pts,...").
export function parseFplFormCsv(text) {
  const [head, ...lines] = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  const cols = head.split(',').map(s => s.trim());
  const idCol = cols.indexOf('ID');
  const gwCols = cols.map((c, i) => [c.match(/^(\d+)_pts$/), i]).filter(([m]) => m).map(([m, i]) => [Number(m[1]), i]);
  if (idCol < 0 || !gwCols.length) throw new Error('This does not look like an FPL Form predicted points file');
  const rows = {};
  for (const line of lines) {
    const c = line.split(',');
    const id = Number(c[idCol]);
    if (!id) continue;
    rows[id] = Object.fromEntries(gwCols.map(([gw, i]) => [gw, Number(c[i]) || 0]));
  }
  return { gws: gwCols.map(([gw]) => gw), rows };
}

// Pick the best file for the target gameweek: the weekly file if it covers the next 3 gameweeks,
// otherwise the full-season file. Files live in ./data as encrypted JSON.
export async function loadPredictions({ passcode, targetGw, dataDir = process.env.FPL_DATA_DIR || 'data', localCsv = process.env.FPL_FORM_CSV }) {
  const candidates = [];
  if (localCsv) {
    for (const f of localCsv.split(';').filter(Boolean)) {
      candidates.push({ label: f.split(/[\\/]/).pop(), uploadedAt: fs.statSync(f).mtime.toISOString(), csv: fs.readFileSync(f, 'utf8') });
    }
  } else if (passcode) {
    for (const slot of ['weekly', 'season']) {
      const file = `${dataDir}/predictions-${slot}.json`;
      if (!fs.existsSync(file)) continue;
      try {
        const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
        candidates.push({ label: stored.label, uploadedAt: stored.uploadedAt, csv: await decryptText(stored.payload, passcode) });
      } catch (err) {
        console.error(`Could not unlock ${file}. Was it locked with a different passcode? (${err.message})`);
      }
    }
  }
  const parsed = candidates.map(c => ({ ...c, ...parseFplFormCsv(c.csv) }));
  const covers = (p, n) => [0, 1, 2].slice(0, n).every(k => p.gws.includes(targetGw + k));
  const pick = parsed.filter(p => covers(p, 3)).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0]
    || parsed.filter(p => covers(p, 1)).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
  if (!pick) return null;
  return { label: pick.label, uploadedAt: pick.uploadedAt, gws: pick.gws, rows: pick.rows };
}

// Attach predicted points to Draft players. classicElements: main-game bootstrap elements.
export function matchPredictions(pred, classicElements, draftElements, targetGw) {
  if (!pred) return { byDraftId: {}, matched: 0 };
  const codeOfClassic = Object.fromEntries(classicElements.map(e => [e.id, e.code]));
  const draftByCode = Object.fromEntries(draftElements.map(e => [e.code, e.id]));
  const byDraftId = {};
  let matched = 0;
  for (const [cid, gwPts] of Object.entries(pred.rows)) {
    const did = draftByCode[codeOfClassic[cid]];
    if (!did) continue;
    matched++;
    const g = k => gwPts[targetGw + k] ?? null;
    const next = [g(0), g(1), g(2), g(3), g(4), g(5)];
    const sum = n => next.slice(0, n).reduce((s, v) => s + (v ?? 0), 0);
    byDraftId[did] = { n1: g(0) ?? 0, n3: sum(3), n6: sum(6) };
  }
  return { byDraftId, matched };
}
