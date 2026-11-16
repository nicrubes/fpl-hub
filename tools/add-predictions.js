// "FPL Hub – add predictions": takes the FPL Form file(s) you downloaded, locks them with your
// passcode and puts them in the GitHub project, then asks the site to refresh.
// First run asks for your passcode (and optionally a GitHub key) and saves them in a private
// file in your user folder: %USERPROFILE%\.fplhub\settings.json (never uploaded anywhere).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { encryptText, decryptText } from '../lib/crypto.js';
import { parseFplFormCsv } from '../lib/predictions.js';

const REPO = 'nicrubes/fpl-hub';
const SITE = 'https://nicrubes.github.io/fpl-hub/';
const dir = path.join(os.homedir(), '.fplhub');
const settingsFile = path.join(dir, 'settings.json');
const doneFile = path.join(dir, 'uploaded.json');
const downloads = path.join(os.homedir(), 'Downloads');

function ask(question, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); else rl.output.write('*'.repeat(s.length ? 1 : 0)); };
  return new Promise(res => rl.question(question, a => { rl.close(); if (hidden) process.stdout.write('\n'); res(a.trim()); }));
}

async function sitePasscodeWorks(passcode) {
  try {
    const html = await (await fetch(SITE, { cache: 'no-store' })).text();
    const m = html.match(/const P = (\{[^\n]*\});/);
    if (!m) return null; // site not published yet; can't check
    await decryptText(JSON.parse(m[1]), passcode);
    return true;
  } catch { return false; }
}

async function setup() {
  console.log('\nFirst-time setup for FPL Hub (only needed once).\n');
  let passcode;
  for (;;) {
    passcode = await ask('Type your FPL Hub site passcode and press Enter: ', true);
    const ok = await sitePasscodeWorks(passcode);
    if (ok === false) { console.log("That passcode doesn't open your FPL Hub site. Try again."); continue; }
    if (ok === null) console.log("(Couldn't reach the site to check the passcode, saving it anyway.)");
    break;
  }
  console.log('\nOptional: paste your GitHub key so uploads happen automatically.');
  console.log('Leave it blank and press Enter to upload by hand instead.');
  const githubToken = await ask('GitHub key: ', true);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify({ passcode, githubToken }, null, 2));
  console.log(`\nSaved privately in ${settingsFile}\n`);
  return { passcode, githubToken };
}

async function gh(token, method, url, body) {
  const res = await fetch(`https://api.github.com${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fpl-hub-uploader' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 404) throw new Error(`GitHub said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 || res.status === 404 ? { status: res.status } : res.json();
}

async function main() {
  const forceSetup = process.argv.includes('--setup');
  let settings = !forceSetup && fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : await setup();

  // Find the newest weekly file and the newest full-season file in Downloads.
  const files = fs.readdirSync(downloads)
    .filter(f => /^fpl-form.*\.csv$/i.test(f))
    .map(f => ({ f, full: path.join(downloads, f), mtime: fs.statSync(path.join(downloads, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) {
    console.log('No FPL Form file found in your Downloads folder.');
    console.log('Download it from https://fplform.com/export-fpl-form-data ("Just Predicted Points"), then run this again.');
    return;
  }
  const done = fs.existsSync(doneFile) ? JSON.parse(fs.readFileSync(doneFile, 'utf8')) : {};
  const picked = {};
  for (const file of files) {
    const csv = fs.readFileSync(file.full, 'utf8');
    let parsed;
    try { parsed = parseFplFormCsv(csv); } catch { continue; }
    const slot = parsed.gws.length >= 20 ? 'season' : 'weekly';
    if (!picked[slot]) picked[slot] = { ...file, csv, gws: parsed.gws, hash: crypto.createHash('sha256').update(csv).digest('hex') };
  }
  const toSend = Object.entries(picked).filter(([slot, p]) => done[slot] !== p.hash);
  if (!toSend.length) { console.log('Your latest FPL Form files are already uploaded. Nothing to do.'); return; }

  const outDir = path.join(downloads, 'FPL Hub upload');
  let manual = !settings.githubToken;
  for (const [slot, p] of toSend) {
    const label = `${p.f} (GW${p.gws[0]}-${p.gws[p.gws.length - 1]})`;
    const stored = JSON.stringify({ label, uploadedAt: new Date().toISOString(), payload: await encryptText(p.csv, settings.passcode) });
    const name = `predictions-${slot}.json`;
    console.log(`Locked ${label}.`);
    if (!manual) {
      try {
        const existing = await gh(settings.githubToken, 'GET', `/repos/${REPO}/contents/data/${name}`);
        await gh(settings.githubToken, 'PUT', `/repos/${REPO}/contents/data/${name}`, {
          message: `Update ${slot} predictions`, content: Buffer.from(stored).toString('base64'), sha: existing.sha,
        });
        console.log(`Uploaded ${name} to GitHub.`);
        done[slot] = p.hash;
        continue;
      } catch (err) {
        console.log(`Automatic upload failed (${err.message}). Switching to upload by hand.`);
        manual = true;
      }
    }
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, name), stored);
    done[slot] = p.hash;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(doneFile, JSON.stringify(done, null, 2));

  if (manual) {
    console.log(`\nAlmost done. Drag the file(s) from the folder that just opened onto the GitHub page that just opened, then click "Commit changes".`);
    exec(`start "" "${outDir}"`);
    exec(`start "" "https://github.com/${REPO}/upload/main/data"`);
  } else {
    try {
      await gh(settings.githubToken, 'POST', `/repos/${REPO}/actions/workflows/hourly.yml/dispatches`, { ref: 'main' });
      console.log('\nDone. Your site will show the new predictions in about 2 minutes.');
    } catch {
      console.log('\nDone. Your site will show the new predictions at the next hourly update.');
    }
  }
}

main().catch(err => { console.error('\nSomething went wrong:', err.message); process.exitCode = 1; });
