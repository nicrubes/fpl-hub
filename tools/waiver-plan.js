// Waiver Assist helper: prints this week's waiver plan and whether the waiver window is open.
// Uses the newest FPL Form files in Downloads (same files the shortcut uploads).
//   node tools/waiver-plan.js           -> plan + window status (JSON)
//   node tools/waiver-plan.js --window  -> window status only (fast; run before EVERY save click)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FPL = 'https://draft.premierleague.com/api/';
const get = async u => (await fetch(u, { headers: { 'User-Agent': 'fpl-hub-personal/1.0' } })).json();
const uk = iso => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

async function windowStatus() {
  const boot = await get(FPL + 'bootstrap-static');
  const ev = boot.events.data.find(e => e.id === boot.events.next);
  const now = Date.now();
  const waivers = new Date(ev.waivers_time).getTime();
  const deadline = new Date(ev.deadline_time).getTime();
  // Safety margin: stop 10 minutes before waivers close, so nothing lands after the cut-off.
  const open = now < waivers - 10 * 60 * 1000;
  return {
    gw: ev.id,
    now: new Date(now).toISOString(),
    waiversClose: ev.waivers_time, waiversCloseUK: uk(ev.waivers_time),
    deadline: ev.deadline_time, deadlineUK: uk(ev.deadline_time),
    status: open ? 'OPEN' : now < deadline ? 'FREE_AGENCY_DO_NOT_TOUCH' : 'GAMEWEEK_UNDER_WAY_DO_NOT_TOUCH',
    minutesLeft: Math.floor((waivers - 10 * 60 * 1000 - now) / 60000),
  };
}

const win = await windowStatus();
if (process.argv.includes('--window')) {
  console.log(JSON.stringify(win, null, 2));
  process.exit(win.status === 'OPEN' ? 0 : 2);
}

// Point the model at the newest weekly + season FPL Form files in Downloads.
const dl = path.join(os.homedir(), 'Downloads');
const csvs = fs.readdirSync(dl).filter(f => /^fpl-form.*\.csv$/i.test(f)).map(f => path.join(dl, f));
if (csvs.length) process.env.FPL_FORM_CSV = csvs.join(';');
const { buildModel } = await import('../lib/analyse.js');
const cfg = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const state = fs.existsSync(new URL('../state.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../state.json', import.meta.url), 'utf8')) : {};
const { model } = await buildModel(cfg, { state });
console.log(JSON.stringify({
  window: win,
  predictions: model.predictions ? model.predictions.label : 'none (estimates)',
  myPick: model.me.waiverPick,
  forcedRelease: model.mustRelease ? model.mustRelease.players.map(p => p.name) : [],
  claims: model.plan.claims.map(c => ({
    n: c.n, outId: c.out.id, out: c.out.name, outPos: c.out.pos, inId: c.in.id, in: c.in.name, inTeam: c.in.team, chance: c.chance, reason: c.reason,
  })),
}, null, 2));
