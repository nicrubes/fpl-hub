// Writes the reminder emails (HTML + plain text) in the Kit room style.
const TZ = 'Europe/London';
const when = iso => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pv = p => (p.pred ? p.pred.n3.toFixed(1) : '–');

const C = { royal: '#0B3D91', deep: '#071F4D', paper: '#F2F5FA', gold: '#D9A21B', ink: '#0E1B33', muted: '#5B6B86', rule: '#D8E0EC', flag: '#C8102E' };
const font = 'font-family:Arial,Helvetica,sans-serif';
const h3 = t => `<h3 style="${font};font-size:17px;color:${C.deep};margin:22px 0 6px">${t}</h3>`;
const td = 'padding:6px 8px;border-bottom:1px solid #EEF1F6;font-size:13px;vertical-align:top';
const th = `padding:6px 8px;border-bottom:1px solid ${C.rule};font-size:11px;color:${C.muted};text-align:left`;

function table(rows, cols) {
  return `<table role="presentation" style="border-collapse:collapse;width:100%;background:#fff;${font}">` +
    `<tr>${cols.map(c => `<th style="${th}">${c[0]}</th>`).join('')}</tr>` +
    rows.map(r => `<tr>${cols.map(c => `<td style="${td}">${c[1](r)}</td>`).join('')}</tr>`).join('') + '</table>';
}

export function gameweekEmail(model, gw, siteUrl) {
  const mr = model.mustRelease;
  const names = mr && mr.players.length ? mr.players.map(p => p.name).join(' or ') : 'nobody';
  const provisional = !model.lastGwFinal;
  const subject = `FPL Draft GW${gw.gw}: ${mr?.released ? 'release done' : `release ${names}`}, waivers close ${when(gw.waivers)}`;
  const word = model.predictions ? 'predicted' : 'estimate';

  let html = `<div style="background:${C.paper};padding:0;margin:0"><div style="max-width:640px;margin:0 auto;${font};color:${C.ink}">`;
  html += `<div style="background:${C.royal};color:#fff;padding:20px 18px">
    <div style="font-size:13px;color:#C9D6EE">GW${model.lastGw} top scorer${provisional ? ' so far' : ''}. House rule says he goes.</div>
    <div style="font-size:40px;line-height:1;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin:6px 0 8px">${esc(names)}</div>
    <div style="font-size:13px;color:#DCE5F5">${mr?.points ?? '?'} points. ${mr?.released ? 'Released already.' : 'Not released yet.'}</div></div>`;
  html += `<div style="background:#fff;padding:12px 18px;border-bottom:1px solid ${C.rule};font-size:14px">
    <b>Waivers close ${when(gw.waivers)}</b><br><span style="color:${C.muted};font-size:13px">GW${gw.gw} deadline ${when(gw.deadline)}. You pick ${model.me.waiverPick} of ${model.me.teams}.</span></div>`;
  html += `<div style="padding:4px 18px 18px">`;

  if (gw.tight) {
    html += `<div style="background:#FBF0D6;color:#8A5A00;border-radius:8px;padding:10px 12px;margin-top:14px;font-size:13px">Tight week: only ${Math.round(gw.gapHours)} hours between the end of GW${gw.gw - 1} and waivers closing, so this email is 48 hours early. Put your claims in now. Once GW${gw.gw - 1} ends, check the site for your confirmed forced release.</div>`;
  }

  const P = model.plan;
  if (P.claims.length) {
    html += h3('Your waiver plan, in order');
    html += `<div style="font-size:13px;color:${C.muted};margin-bottom:6px">Enter these in this order. If one works, the game cancels the rest for that player.</div>`;
    html += table(P.claims, [
      ['#', c => `<b style="color:${C.royal}">${c.n}</b>`],
      ['Claim', c => `<span style="color:${C.muted}">${esc(c.out.name)} out,</span> <b>${esc(c.in.name)} in</b><br><span style="color:${C.muted};font-size:12px">${esc(c.reason)}</span>`],
      ['Chance', c => `<span style="font-size:12px;color:${c.chance === 'likely gone' ? '#8E1022' : c.chance === 'contested' ? '#8A5A00' : '#11633A'}">${esc(c.chance)}</span>`],
    ]);
    const opt = P.outs.filter(o => !o.forced);
    if (opt.length) html += `<div style="font-size:12px;color:${C.muted};margin-top:6px">Optional releases suggested: ${opt.map(o => `${esc(o.out.name)} (${esc(o.reasons[0] || '')})`).join('; ')}.</div>`;
  }

  if (model.hidden.length) {
    html += h3('Hidden picks');
    html += table(model.hidden.slice(0, 8), [
      ['Player', p => `<b>${esc(p.name)}</b> <span style="color:${C.muted}">${p.pos} ${esc(p.team)}</span><br><span style="color:#11633A;font-size:12px">${esc(p.why)}</span>`],
      [word, p => pv(p)],
    ]);
  }

  const S = model.sheet;
  if (S) {
    html += h3(`Suggested team for GW${gw.gw} (${S.formation})`);
    html += `<div style="font-size:13px;line-height:1.7;background:#fff;padding:10px 12px;border-radius:8px">` +
      ['GK', 'DEF', 'MID', 'FWD'].map(pos => `<b>${pos}</b> ${S.lines[pos].map(p => esc(p.name) + (p.incoming ? ' (if signed)' : '')).join(', ')}`).join('<br>') +
      `<br><span style="color:${C.muted}">Bench: ${S.bench.map(p => esc(p.name)).join(', ')}</span></div>`;
  }

  if (model.comingNextWeek.length) {
    html += h3(`Coming next week (claimable for GW${gw.gw + 1})`);
    html += `<div style="font-size:13px">${model.comingNextWeek.slice(0, 10).map(p => `${esc(p.name)} <span style="color:${C.muted}">${p.pos}, from ${esc(p.from)}</span>`).join('<br>')}</div>`;
  }

  const soon = model.schedule.redrafts.filter(r => new Date(r.at) - new Date(gw.waivers) < 21 * 864e5);
  for (const r of soon) html += `<div style="background:#E3EAF7;border-radius:8px;padding:10px 12px;margin-top:16px;font-size:13px"><b>Redraft coming:</b> ${when(r.at)}, before GW${r.beforeGw}. You'll get a separate reminder the day before.</div>`;

  if (!model.predictions) html += `<div style="font-size:12px;color:${C.muted};margin-top:14px">No FPL Form file uploaded yet, so numbers are estimates. Download it from fplform.com/export-fpl-form-data and double-click "FPL Hub – add predictions".</div>`;
  else html += `<div style="font-size:12px;color:${C.muted};margin-top:14px">Predicted points from FPL Form (${esc(model.predictions.label)}). For fresher numbers, download it again from fplform.com/export-fpl-form-data and double-click "FPL Hub – add predictions".</div>`;
  if (siteUrl) html += `<p style="margin:18px 0 0"><a href="${esc(siteUrl)}" style="display:inline-block;background:${C.royal};color:#fff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:6px">Open FPL Hub</a></p>`;
  html += `</div></div></div>`;

  const text = [
    `GW${gw.gw} waiver reminder`,
    `Waivers close ${when(gw.waivers)}. GW deadline ${when(gw.deadline)}. You pick ${model.me.waiverPick} of ${model.me.teams}.`,
    `You must release: ${names} (${mr?.points ?? '?'} pts)${provisional ? ' - provisional' : ''}${mr?.released ? ' - done' : ''}`,
    '', 'Waiver plan:',
    ...P.claims.map(c => `${c.n}. ${c.out.name} out, ${c.in.name} in (${c.chance})`),
    '', 'Hidden picks: ' + model.hidden.slice(0, 6).map(p => `${p.name} (${p.why})`).join('; '),
    siteUrl ? `\nFull details: ${siteUrl}` : '',
  ].join('\n');

  return { subject, html, text };
}

export function redraftEmail(model, r, siteUrl) {
  const subject = `FPL Draft: redraft ${when(r.at)}`;
  const html = `<div style="${font};color:${C.ink};max-width:640px">` +
    `<div style="background:${C.royal};color:#fff;padding:20px 18px"><div style="font-size:34px;font-weight:900;text-transform:uppercase">Redraft tomorrow</div></div>` +
    `<p style="padding:0 18px">The league redraft starts <b>${when(r.at)}</b> (before GW${r.beforeGw}). Set your draft list and make sure you can be online.</p>` +
    (siteUrl ? `<p style="padding:0 18px"><a href="${esc(siteUrl)}" style="color:${C.royal}">Open FPL Hub</a></p>` : '') + '</div>';
  return { subject, html, text: `Redraft starts ${when(r.at)} (before GW${r.beforeGw}).` };
}
