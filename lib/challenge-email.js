// Challenge reminders, kept short. Normally just one line in the weekly Draft email.
// A separate Challenge email only goes when the Draft email came (or will come) more than 60 hours
// before the first Challenge kick-off, or there wasn't one; it is sent 24 hours before that kick-off.
const TZ = 'Europe/London';
const when = iso => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const HOUR = 3600e3;
const ready = C => C && !C.none && !C.error && C.gw;

// "Players who come on as a substitute earn triple points." (without the squad rules)
const ruleOnly = C => (C.understood ? C.description.replace(/\s*(One|Up to \w+|Maximum \w+) players? per (club|team)\.?/gi, '').replace(/\s*Unlimited budget\.?/gi, '').trim()
  : 'FPL Hub couldn\'t read the rule, so check it on the Challenge tab.');

export function challengeLine(model, gwNum) {
  const C = model.challenge;
  if (!ready(C) || C.gw !== gwNum) return null;
  return `Challenge GW${C.gw}, ${C.title}: ${ruleOnly(C)} Your six and the Reddit post brief are on the Challenge tab.`;
}

export function challengeDue(model, state, now) {
  const C = model.challenge;
  if (!ready(C) || !C.firstKickoff) return null;
  const key = `ch-${C.gw}`;
  if (state.sent[key]) return null;
  const first = new Date(C.firstKickoff);
  if (now < new Date(first - 24 * HOUR) || now >= first) return null;
  const draftSent = state.sent[`gw-${C.gw}`];
  const draftRow = model.schedule.gameweeks.find(r => r.gw === C.gw);
  const draftAt = draftSent ? new Date(draftSent) : draftRow ? new Date(draftRow.emailAt) : null;
  const covered = draftAt && draftAt <= now && first - draftAt <= 60 * HOUR;
  return covered ? null : { key, kind: 'challenge' };
}

export function challengeEmail(model, siteUrl) {
  const C = model.challenge;
  const six = C.picks.map(p => p.name + (p.id === C.captain ? ' (C)' : '')).join(', ');
  const subject = `FPL Challenge GW${C.gw}: ${C.title}, first kick-off ${when(C.firstKickoff)}`;
  const link = siteUrl ? siteUrl.replace(/#.*$/, '') + '#challenge' : '';
  const lines = [
    `<b>${esc(C.title)}:</b> ${esc(ruleOnly(C))}`,
    `First kick-off ${esc(when(C.firstKickoff))}. Players lock at their own kick-off.`,
    `Your six: ${esc(six)}.`,
    'For the Reddit post, tap "Copy brief for Claude" on the Challenge tab and paste it into Claude.',
  ];
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0E1B33;max-width:560px">` +
    `<div style="background:#0B3D91;color:#fff;padding:18px"><div style="font-size:28px;font-weight:900;text-transform:uppercase;line-height:1.05">GW${C.gw} Challenge</div></div>` +
    `<div style="padding:14px 18px;font-size:15px;line-height:1.6">${lines.join('<br>')}</div>` +
    (link ? `<div style="padding:0 18px 18px"><a href="${esc(link)}" style="display:inline-block;background:#0B3D91;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:6px">Open the Challenge tab</a></div>` : '') +
    `</div>`;
  const text = [`GW${C.gw} Challenge, ${C.title}: ${ruleOnly(C)}`, `First kick-off ${when(C.firstKickoff)}.`, `Your six: ${six}.`, link].filter(Boolean).join('\n');
  return { subject, html, text };
}
