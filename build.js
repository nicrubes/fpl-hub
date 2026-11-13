// FPL Hub – runs every hour in the cloud.
// 1. Pulls the public league data (+ your FPL Form predictions, if uploaded).
// 2. Rebuilds the locked website.  3. Sends the reminder email if one is due.
//
// Secrets come from environment variables (stored in GitHub's secret store):
//   FPL_PASSCODE  – the website passcode (also unlocks the uploaded FPL Form files)
//   SMTP_USER     – Gmail address the email is sent from
//   SMTP_PASS     – Gmail "app password" (not the normal Gmail password)
//   EMAIL_TO      – where the reminder goes (can be the same address)
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

const args = new Set(process.argv.slice(2));
const cfg = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const statePath = new URL('./state.json', import.meta.url);
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
state.sent ||= {};
const now = process.env.FPL_NOW ? new Date(process.env.FPL_NOW) : new Date();
const siteUrl = process.env.SITE_URL || cfg.siteUrl || '';
const passcode = process.env.FPL_PASSCODE || null;

const { model, state: tracked } = await buildModel(cfg, { now, state, passcode });
state.status = tracked.status;
state.fitSince = tracked.fitSince;
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
if (args.has('--test-email')) {
  const gw = model.schedule.gameweeks.find(r => r.gw === model.targetGw);
  if (gw) due.push({ key: null, kind: 'gameweek', gw, test: true });
}
for (const d of due) {
  const e = d.kind === 'gameweek' ? gameweekEmail(model, d.gw, siteUrl) : redraftEmail(model, d.redraft, siteUrl);
  if (d.test) e.subject = '[Test] ' + e.subject;
  if (!mailReady) { console.log(`Email due (${d.key || 'test'}) but email secrets are not set: "${e.subject}"`); continue; }
  if (args.has('--preview') && !d.test) { console.log(`Would send: ${e.subject}`); continue; }
  try {
    await sendMail({ user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, to: process.env.EMAIL_TO, ...e });
    console.log('Sent:', e.subject);
    if (d.key) state.sent[d.key] = now.toISOString();
  } catch (err) {
    console.error('Email failed:', err.message);
    process.exitCode = 1;
  }
}
if (!args.has('--preview')) fs.writeFileSync(statePath, JSON.stringify(state) + '\n');
