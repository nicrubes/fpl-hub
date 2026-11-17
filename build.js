// FPL Hub – runs every hour in the cloud.
// 1. Pulls the public league data (+ your FPL Form predictions, if uploaded).
// 2. Rebuilds the locked website.  3. Sends the reminder email if one is due.
//
// Secrets come from environment variables (stored in GitHub's secret store):
//   FPL_PASSCODE  – the website passcode (also unlocks the uploaded FPL Form files)
//   SMTP_USER     – Gmail address the email is sent from
//   SMTP_PASS     – Gmail "app password" (not the normal Gmail password)
//   EMAIL_TO      – where the reminder goes (can be the same address)
//   ODDS_API_KEY  – The Odds API key for the Superbru tab (free plan)
//
// Options:  --preview     write unlocked preview + email preview to ./preview (never published)
//           --test-email  send the current gameweek email now (to check email works)
// Local testing: set FPL_FORM_CSV to one or more CSV paths separated by ";".
import fs from 'node:fs';
import { buildModel } from './lib/analyse.js';
import { dueEmails } from './lib/schedule.js';
import { renderPage } from './lib/page.js';
import { lockPage } from './lib/lock.js';
import { gameweekEmail, redraftEmail } from './lib/email.js';
import { sendMail } from './lib/smtp.js';
import { buildChallenge } from './lib/challenge.js';
import { challengeDue, challengeEmail } from './lib/challenge-email.js';
import { buildSuperbru, loadStore, saveStore, markEmailPicks } from './lib/superbru.js';
import { superbruDue, superbruEmail } from './lib/superbru-email.js';

const args = new Set(process.argv.slice(2));
const cfg = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const statePath = new URL('./state.json', import.meta.url);
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
state.sent ||= {};
const now = process.env.FPL_NOW ? new Date(process.env.FPL_NOW) : new Date();
const siteUrl = process.env.SITE_URL || cfg.siteUrl || '';
const passcode = process.env.FPL_PASSCODE || null;

const { model, state: tracked, raw } = await buildModel(cfg, { now, state, passcode });
state.status = tracked.status;
state.fitSince = tracked.fitSince;

// ----- Challenge tab (part 3). A Challenge problem must never stop the Draft site or email.
try {
  const ch = await buildChallenge({ raw, state, now });
  model.challenge = ch.model;
  state.challengeCopy = ch.copy;
  const C = ch.model;
  console.log(C.none ? `Challenge: ${C.message}` : `Challenge GW${C.gw} "${C.title}": read as "${C.readAs}" (${C.ruleSource}). Six: ${C.picks.map(p => p.name + (p.id === C.captain ? ' (C)' : '')).join(', ')}.`);
  if (ch.copy?.error) console.log('Challenge rule wording:', ch.copy.error);
} catch (err) {
  console.error('Challenge tab failed:', err.message);
  model.challenge = { error: err.message };
}

// ----- Superbru tab (part 2). Same rule: a Superbru problem must never stop the rest.
let sbStore = null;
try {
  sbStore = await loadStore(passcode);
  const sb = await buildSuperbru({ cfg, raw, now, passcode, key: process.env.ODDS_API_KEY || null, store: sbStore });
  model.superbru = sb.model;
  for (const l of sb.log) console.log(l);
  for (const b of sb.model.banner || []) console.log('Superbru notice:', b[1]);
} catch (err) {
  console.error('Superbru tab failed:', err.message);
  model.superbru = { error: err.message };
}
const inner = renderPage(model);
console.log(`Built data for GW${model.targetGw} (last GW${model.lastGw}, final: ${model.lastGwFinal}).`);
console.log(model.predictions
  ? `Predictions: ${model.predictions.label} (GW${model.predictions.firstGw}-${model.predictions.lastGw}), ${model.predictions.matched} players matched.`
  : 'Predictions: none uploaded yet, using points-per-game instead.');
console.log(`Waiver plan: ${model.plan.claims.length} claims. Hidden picks: ${model.hidden.length}.`);

if (args.has('--preview')) {
  fs.mkdirSync('preview', { recursive: true });
  fs.writeFileSync('preview/site.html', inner);
  const gw = model.schedule.gameweeks.find(r => r.gw === model.targetGw);
  if (gw) {
    const e = gameweekEmail(model, gw, siteUrl);
    fs.writeFileSync('preview/email.html', `<!-- Subject: ${e.subject} -->\n` + e.html);
    console.log('Email subject would be:', e.subject);
  }
  if (model.challenge && !model.challenge.none && !model.challenge.error) {
    const ce = challengeEmail(model, siteUrl);
    fs.writeFileSync('preview/challenge-email.html', `<!-- Subject: ${ce.subject} -->\n` + ce.html);
  }
  if (model.superbru?.weeks) {
    const se = superbruEmail(model, siteUrl);
    fs.writeFileSync('preview/superbru-email.html', `<!-- Subject: ${se.subject} -->\n` + se.html);
  }
  if (passcode) fs.writeFileSync('preview/locked.html', await lockPage(inner, passcode));
  console.log('Preview written to ./preview');
}

// ----- publish the locked website (never publish without a passcode)
if (!args.has('--preview')) {
  if (!passcode) {
    console.error('FPL_PASSCODE is not set, so the website was NOT published. Add it in GitHub > Settings > Secrets.');
  } else {
    fs.mkdirSync('site', { recursive: true });
    fs.writeFileSync('site/index.html', await lockPage(inner, passcode));
    fs.writeFileSync('site/.nojekyll', '');
    console.log('Locked website written to ./site');
  }
}

// ----- emails
const mailReady = process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_TO;
const due = dueEmails(model, state, now);
const chDue = challengeDue(model, state, now);
if (chDue) due.push(chDue);
const sbDue = superbruDue(model, state, now, cfg.superbru?.matchdayLeadHours);
if (sbDue) due.push(sbDue);
if (args.has('--test-email')) {
  const gw = model.schedule.gameweeks.find(r => r.gw === model.targetGw);
  if (gw) due.push({ key: null, kind: 'gameweek', gw, test: true });
}
for (const d of due) {
  const e = d.kind === 'gameweek' ? gameweekEmail(model, d.gw, siteUrl) : d.kind === 'challenge' ? challengeEmail(model, siteUrl)
    : d.kind === 'superbru' ? superbruEmail(model, siteUrl) : redraftEmail(model, d.redraft, siteUrl);
  if (d.test) e.subject = '[Test] ' + e.subject;
  if (!mailReady) { console.log(`Email due (${d.key || 'test'}) but email secrets are not set: "${e.subject}"`); continue; }
  if (args.has('--preview') && !d.test) { console.log(`Would send: ${e.subject}`); continue; }
  try {
    await sendMail({ user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, to: process.env.EMAIL_TO, ...e });
    console.log('Sent:', e.subject);
    if (d.key) state.sent[d.key] = now.toISOString();
    if (d.kind === 'gameweek' && d.key) markEmailPicks(sbStore, model, d.gw.gw); // to flag picks that change later
  } catch (err) {
    console.error('Email failed:', err.message);
    process.exitCode = 1;
  }
}
if (!args.has('--preview')) {
  fs.writeFileSync(statePath, JSON.stringify(state) + '\n');
  try { const n = await saveStore(sbStore, passcode); if (n) console.log(`Superbru: saved ${n} locked file(s) in data/superbru.`); }
  catch (err) { console.error('Superbru: saving failed:', err.message); }
}
