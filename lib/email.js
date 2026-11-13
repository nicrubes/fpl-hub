// Writes the reminder emails. Deliberately short: the details live on the website.
const TZ = 'Europe/London';
const when = iso => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const font = 'font-family:Arial,Helvetica,sans-serif';

function shell(title, lines, siteUrl) {
  return `<div style="${font};color:#0E1B33;max-width:560px">` +
    `<div style="background:#0B3D91;color:#fff;padding:18px">` +
    `<div style="font-size:28px;font-weight:900;text-transform:uppercase;line-height:1.05">${esc(title)}</div></div>` +
    `<div style="padding:14px 18px;font-size:15px;line-height:1.6">${lines.join('<br>')}</div>` +
    (siteUrl ? `<div style="padding:0 18px 18px"><a href="${esc(siteUrl)}" style="display:inline-block;background:#0B3D91;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:6px">Open FPL Hub</a></div>` : '') +
    `</div>`;
}

export function gameweekEmail(model, gw, siteUrl) {
  const mr = model.mustRelease;
  const names = mr && mr.players.length ? mr.players.map(p => p.name).join(' or ') : null;
  const subject = `FPL Draft GW${gw.gw}: waivers close ${when(gw.waivers)}`;
  const lines = [
    `<b>Waivers close ${when(gw.waivers)}</b>`,
    names ? (mr.released ? `Forced release done (${esc(names)}).` : `Release this week: <b>${esc(names)}</b>${model.lastGwFinal ? '' : ' (provisional)'}.`) : '',
    `Your waiver plan is ready (${model.plan.claims.length} claims). Say "Waiver Assist" to enter it.`,
    gw.tight ? `Tight week: GW${gw.gw - 1} finishes late, so check the site again once it ends.` : '',
    ...model.schedule.redrafts.filter(r => new Date(r.at) - new Date(gw.waivers) < 21 * 864e5).map(r => `Redraft coming: ${when(r.at)}.`),
  ].filter(Boolean);
  const text = [`GW${gw.gw}: waivers close ${when(gw.waivers)}.`, names ? `Release: ${names}.` : '', 'Say "Waiver Assist" to enter your claims.', siteUrl].filter(Boolean).join('\n');
  return { subject, html: shell(`GW${gw.gw} waivers`, lines, siteUrl), text };
}

export function redraftEmail(model, r, siteUrl) {
  const subject = `FPL Draft: redraft ${when(r.at)}`;
  const lines = [`The league redraft starts <b>${when(r.at)}</b> (before GW${r.beforeGw}).`, 'Set your draft list and make sure you can be online.'];
  return { subject, html: shell('Redraft tomorrow', lines, siteUrl), text: `Redraft starts ${when(r.at)} (before GW${r.beforeGw}).\n${siteUrl || ''}` };
}
