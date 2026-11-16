// Writes the reminder emails. Deliberately short: the details live on the website.
const TZ = 'Europe/London';
const when = iso => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const font = 'font-family:Arial,Helvetica,sans-serif';

// The weekly routine, repeated in every gameweek email so it's never forgotten.
const ROUTINE = [
  'Download the FPL Form file (phone or laptop): fplform.com/export-fpl-form-data, "Just Predicted Points", Generate CSV.',
  'Phone: open FPL Hub, scroll to "Add predictions" at the bottom, choose the file and tap "Lock and upload". Laptop: double-click "FPL Hub - add predictions" on your desktop instead. Reload the site about 2 minutes later.',
  'Open FPL Hub (button above) and check the waiver plan.',
  'Enter your claims. Phone: in FPL Hub tap "Copy plan for FPL", open the FPL Draft Transactions page in Safari, tap your "Enter waivers" bookmark and paste. Laptop: say "Waiver Assist" to Claude.',
  'Before the gameweek deadline, set your team yourself using the team sheet.',
];

function shell(title, lines, siteUrl, routine = false) {
  return `<div style="${font};color:#0E1B33;max-width:560px">` +
    `<div style="background:#0B3D91;color:#fff;padding:18px">` +
    `<div style="font-size:28px;font-weight:900;text-transform:uppercase;line-height:1.05">${esc(title)}</div></div>` +
    `<div style="padding:14px 18px;font-size:15px;line-height:1.6">${lines.join('<br>')}</div>` +
    (siteUrl ? `<div style="padding:0 18px 18px"><a href="${esc(siteUrl)}" style="display:inline-block;background:#0B3D91;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:6px">Open FPL Hub</a></div>` : '') +
    (routine ? `<div style="margin:0 18px 18px;padding:12px 14px;background:#F2F5FA;border-radius:8px;font-size:14px;line-height:1.5">` +
      `<b>Your weekly checklist</b><ol style="margin:6px 0 6px 18px;padding:0">${ROUTINE.map(s => `<li style="margin:3px 0">${esc(s)}</li>`).join('')}</ol>` +
      `<span style="color:#C8102E"><b>Never</b> make changes between the waiver deadline and the gameweek deadline. Moves then go through instantly.</span></div>` : '') +
    `</div>`;
}

export function gameweekEmail(model, gw, siteUrl) {
  const mr = model.mustRelease;
  const names = mr && mr.players.length ? mr.players.map(p => p.name).join(' or ') : null;
  const subject = `FPL Draft GW${gw.gw}: waivers close ${when(gw.waivers)}`;
  const lines = [
    `<b>Waivers close ${when(gw.waivers)}</b>`,
    names ? (mr.released ? `Forced release done (${esc(names)}).` : `Release this week: <b>${esc(names)}</b>${model.lastGwFinal ? '' : ' (provisional)'}.`) : '',
    `Your waiver plan is ready (${model.plan.claims.length} claims). Enter it with your "Enter waivers" bookmark on your phone, or say "Waiver Assist" on the laptop.`,
    gw.tight ? `Tight week: GW${gw.gw - 1} finishes late, so check the site again once it ends.` : '',
    ...model.schedule.redrafts.filter(r => new Date(r.at) - new Date(gw.waivers) < 21 * 864e5).map(r => `Redraft coming: ${when(r.at)}.`),
  ].filter(Boolean);
  const text = [`GW${gw.gw}: waivers close ${when(gw.waivers)}.`, names ? `Release: ${names}.` : '', siteUrl, '', 'Weekly checklist:', ...ROUTINE.map((s, i) => `${i + 1}. ${s}`),
    'Never make changes between the waiver deadline and the gameweek deadline.'].filter(x => x !== null && x !== undefined).join('\n');
  return { subject, html: shell(`GW${gw.gw} waivers`, lines, siteUrl, true), text };
}

export function redraftEmail(model, r, siteUrl) {
  const subject = `FPL Draft: redraft ${when(r.at)}`;
  const lines = [`The league redraft starts <b>${when(r.at)}</b> (before GW${r.beforeGw}).`, 'Set your draft list and make sure you can be online.'];
  return { subject, html: shell('Redraft tomorrow', lines, siteUrl), text: `Redraft starts ${when(r.at)} (before GW${r.beforeGw}).\n${siteUrl || ''}` };
}
