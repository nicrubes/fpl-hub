// Publish FPL Hub changes to GitHub in ONE step, so the hourly job never sees half the new files.
//   node tools/publish.js --check                 list files that differ from GitHub (changes nothing)
//   node tools/publish.js -m "What changed"       upload them as one commit, run the site update, show the log
//   node tools/publish.js -m "..." lib/a.js b.js  upload only these files
// Safety: stops if GitHub changed a file after your copy on this PC was last saved (someone else's newer work).
// The GitHub key is read from %USERPROFILE%\.fplhub\settings.json and never printed. Never uploads state.json or data/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = 'nicrubes/fpl-hub';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!fs.existsSync(path.join(ROOT, 'build.js'))) { console.log('Could not find the FPL Hub folder at ' + ROOT); process.exit(1); }
const FOLDERS = ['', 'lib', 'tools', '.github/workflows'];
const NEVER = new Set(['state.json']);
const args = process.argv.slice(2);
const check = args.includes('--check');
const mi = args.indexOf('-m');
const message = mi >= 0 ? args[mi + 1] : null;
const only = args.filter((a, i) => !a.startsWith('-') && i !== mi + 1).map(f => f.replace(/\\/g, '/'));
if (!check && !message) { console.log('Add -m "what changed" (or use --check).'); process.exit(1); }

const settings = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.fplhub', 'settings.json'), 'utf8'));
const token = settings.githubToken;
if (!token) { console.log('No GitHub key in settings.json. Run the "add predictions" shortcut with --setup.'); process.exit(1); }
const H = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fpl-hub-publish' };
async function gh(method, url, body) {
  const r = await fetch('https://api.github.com' + url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) { const e = new Error(`${method} ${url} -> ${r.status} ${text.slice(0, 200)}`); e.status = r.status; throw e; }
  return text ? JSON.parse(text) : {};
}
const blobSha = buf => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 1. What differs from GitHub?
const remote = {};
for (const dir of FOLDERS) {
  let items = [];
  try { items = await gh('GET', `/repos/${REPO}/contents/${dir}`); } catch (e) { if (e.status !== 404) throw e; }
  for (const it of items) if (it.type === 'file') remote[it.path] = it.sha;
}
const local = [];
for (const dir of FOLDERS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs)) {
    const rel = (dir ? dir + '/' : '') + name;
    if (fs.statSync(path.join(abs, name)).isFile() && !NEVER.has(rel) && !/\.local\./.test(name)) local.push(rel);
  }
}
let changed = local.filter(f => remote[f] !== blobSha(fs.readFileSync(path.join(ROOT, f))));
if (only.length) {
  const missing = only.filter(f => !local.includes(f));
  if (missing.length) { console.log('Not found or not allowed:', missing.join(', ')); process.exit(1); }
  changed = only.filter(f => changed.includes(f));
}
if (!changed.length) { console.log('Nothing to publish: GitHub already matches this PC.'); process.exit(0); }

// 2. Safety: has GitHub changed any of these after the PC copy was saved?
let clash = false;
for (const f of changed) {
  const commits = await gh('GET', `/repos/${REPO}/commits?path=${encodeURIComponent(f)}&per_page=1`);
  const last = commits[0] ? new Date(commits[0].commit.committer.date) : null;
  const saved = fs.statSync(path.join(ROOT, f)).mtime;
  const tag = remote[f] ? 'changed' : 'new';
  const newer = last && remote[f] && last > saved;
  if (newer) clash = true;
  console.log(`${newer ? 'NEWER ON GITHUB' : tag.padEnd(15)} ${f}${newer ? ` (GitHub ${last.toISOString()}, PC ${saved.toISOString()})` : ''}`);
}
if (clash) { console.log('\nStopped: GitHub has a newer copy of a file above. Check whose change that is before publishing.'); process.exit(2); }
if (check) { console.log(`\n${changed.length} file(s) would be published. Nothing was changed.`); process.exit(0); }

// 3. One commit with all of them (retries if the hourly job pushes state.json at the same moment)
const tree = [];
for (const f of changed) {
  const b = await gh('POST', `/repos/${REPO}/git/blobs`, { content: fs.readFileSync(path.join(ROOT, f)).toString('base64'), encoding: 'base64' });
  tree.push({ path: f, mode: '100644', type: 'blob', sha: b.sha });
}
let sha = null;
for (let attempt = 1; attempt <= 3 && !sha; attempt++) {
  const ref = await gh('GET', `/repos/${REPO}/git/ref/heads/main`);
  const head = await gh('GET', `/repos/${REPO}/git/commits/${ref.object.sha}`);
  const t = await gh('POST', `/repos/${REPO}/git/trees`, { base_tree: head.tree.sha, tree });
  const c = await gh('POST', `/repos/${REPO}/git/commits`, { message: `${message}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, tree: t.sha, parents: [ref.object.sha] });
  try { await gh('PATCH', `/repos/${REPO}/git/refs/heads/main`, { sha: c.sha, force: false }); sha = c.sha; }
  catch (e) { if (e.status !== 422) throw e; console.log('GitHub moved on while publishing; trying again'); }
}
if (!sha) { console.log('Could not publish after 3 tries. Nothing was changed.'); process.exit(1); }
console.log(`\nPublished ${changed.length} file(s) as commit ${sha.slice(0, 7)}.`);

// 4. Run the site update and report how it went
const started = Date.now() - 60e3;
await gh('POST', `/repos/${REPO}/actions/workflows/hourly.yml/dispatches`, { ref: 'main' });
console.log('Site update started. Waiting for it to finish (usually 1-3 minutes)...');
let run = null;
for (let i = 0; i < 40; i++) {
  await sleep(15000);
  const runs = (await gh('GET', `/repos/${REPO}/actions/workflows/hourly.yml/runs?per_page=5`)).workflow_runs;
  run = runs.find(r => new Date(r.created_at).getTime() >= started) || null;
  if (run && run.status === 'completed') break;
}
if (!run || run.status !== 'completed') { console.log('Still running. Check https://github.com/' + REPO + '/actions'); process.exit(0); }
console.log(`Site update ${run.conclusion}: ${run.html_url}`);
const jobs = (await gh('GET', `/repos/${REPO}/actions/runs/${run.id}/jobs`)).jobs;
for (const j of jobs) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/jobs/${j.id}/logs`, { headers: H });
  if (!r.ok) continue;
  const lines = (await r.text()).split('\n').map(l => l.replace(/^\S+Z\s/, ''))
    .filter(l => /^(Challenge|Superbru|Built data|Predictions:|Waiver plan|Locked website|Sent:|Email failed|Would send)|failed|Error:/i.test(l.trim()));
  for (const l of lines.slice(0, 25)) console.log('  ' + l.trim().slice(0, 200));
}
process.exitCode = run.conclusion === 'success' ? 0 : 1;
