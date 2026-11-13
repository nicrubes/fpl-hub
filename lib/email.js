// Writes the reminder emails (HTML + plain text).
const TZ = 'Europe/London';
const when = iso => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fx = p => p.fixtures.map(f => `${f.opp}${f.home ? '(H)' : '(a)'}`).join(' ');

const box = 'border:1px solid #e4e2db;border-radius:10px;padding:12px 14px;margin:12px 0';
const th = 'text-align:left;padding:4px 8px;border-bottom:1px solid #e4e2db;color:#6b6a65;font-size:12px';
const td = 'padding:4px 8px;border-bottom:1px solid #f0eee8;font-size:13px';

function table(rows, cols) {
  return `<table style="border-collapse:collapse;width:100%">` +
    `<tr>${cols.map(c => `<th style="${th}">${c[0]}</th>`).join('')}</tr>` +
    rows.map(r => `<tr>${cols.map(c => `<td style="${td}">${c[1](r)}</td>`).join('')}</tr>`).join('') + '</table>';
}

export function gameweekEmail(model, gw, siteUrl) {
  const mr = model.mustRelease;
  const names = mr ? mr.players.map(p => p.name).join(' or ') : 'your top scorer';
  const provisional = !model.lastGwFinal;
  const subject = `FPL Draft GW${gw.gw}: ${mr?.released ? 'release done' : `release ${names}`}, waivers close ${when(gw.waivers)}`;

  const playerCols = [
    ['Player', p => `${esc(p.name)}${p.status !== 'a' ? ` <span style="color:#a32d2d">(${esc(p.statusText)}${p.chance != null ? ' ' + p.chance + '%' : ''})</span>` : ''}`],
    ['Team', p => esc(p.team)], ['Rank', p => p.draftRank], ['Pts', p => p.total], ['Form', p => p.form.toFixed(1)], ['Next 3', p => esc(fx(p))],
  ];
  const depth = { FWD: 8, MID: 8, DEF: 8, GK: 4 };
  let html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1b;max-width:680px">`;
  html += `<h2 style="margin:0 0 4px;font-size:19px">GW${gw.gw} waiver reminder</h2>`;
  html += `<div style="color:#6b6a65;font-size:13px">Waivers close <b>${when(gw.waivers)}</b> · GW deadline ${when(gw.deadline)} · you pick ${model.me.waiverPick} of ${model.me.teams}</div>`;

  if (gw.tight) {
    html += `<div style="${box};background:#fbf0dc;border-color:#e0b25c">Tight week: only ${Math.round(gw.gapHours)} hours between the end of GW${gw.gw - 1} and waivers closing, so this email comes 48 hours early. ` +
      `Get your optional claims in now. Once GW${gw.gw - 1} ends, do your forced release (by waiver if there's time, otherwise by free agency after waivers run).</div>`;
  }

  html += `<div style="${box};background:${mr?.released ? '#e3f3ea' : '#fbf0dc'}"><b>You must release:</b> ${esc(names)} (${mr?.points ?? '?'} pts in GW${model.lastGw})` +
    `${mr && mr.players.length > 1 ? ' · tie, you choose' : ''}${provisional ? ` · <b>provisional</b>, GW${model.lastGw} still being played` : ''}` +
    `<br><span style="font-size:13px;color:#6b6a65">${mr?.released ? 'Done: he is no longer in your squad.' : `Same-position swap, so bring in a ${[...new Set((mr?.players || []).map(p => p.pos))].join(' or ')}.`}</span></div>`;

  const pc = model.positionsContested;
  html += `<div style="font-size:13px;color:#6b6a65">Teams picking before you that must also replace a: GK ${pc.GK} · DEF ${pc.DEF} · MID ${pc.MID} · FWD ${pc.FWD}</div>`;

  for (const pos of ['FWD', 'MID', 'DEF', 'GK']) {
    const list = model.available[pos].filter(p => p.status === 'a' || p.status === 'd').slice(0, depth[pos]);
    html += `<h3 style="font-size:15px;margin:18px 0 6px">Best available ${pos} <span style="color:#6b6a65;font-weight:400;font-size:12px">by draft rank</span></h3>` + table(list, playerCols);
  }

  if (model.hidden.length) {
    html += `<h3 style="font-size:15px;margin:18px 0 6px">Hidden picks</h3>` + table(model.hidden.slice(0, 8), [
      ['Player', p => esc(p.name)], ['Pos', p => p.pos], ['Rank', p => p.draftRank], ['Why', p => esc(p.why)],
    ]);
  }
  if (model.comingNextWeek.length) {
    html += `<h3 style="font-size:15px;margin:18px 0 6px">Coming next week (locked now, claimable for GW${gw.gw + 1})</h3>` + table(model.comingNextWeek.slice(0, 12), [
      ['Player', p => esc(p.name) + (p.tie ? ' (tie)' : '')], ['Pos', p => p.pos], ['Rank', p => p.draftRank], ['From', p => esc(p.from)],
    ]);
  }

  const soon = model.schedule.redrafts.filter(r => new Date(r.at) - new Date(gw.waivers) < 21 * 864e5);
  for (const r of soon) {
    html += `<div style="${box};background:#efe6f0"><b>Redraft coming:</b> ${when(r.at)}, before GW${r.beforeGw}. You'll get a separate reminder the day before.</div>`;
  }

  if (siteUrl) html += `<p style="margin-top:18px"><a href="${esc(siteUrl)}" style="color:#37003c">Open FPL Hub for the full lists</a></p>`;
  html += `<p style="color:#6b6a65;font-size:12px">Sent automatically by FPL Hub. Waiver plan builder and line-up tips are coming in the next stage.</p></div>`;

  const text = [
    `GW${gw.gw} waiver reminder`,
    `Waivers close ${when(gw.waivers)}. GW deadline ${when(gw.deadline)}. You pick ${model.me.waiverPick} of ${model.me.teams}.`,
    `You must release: ${names} (${mr?.points ?? '?'} pts)${provisional ? ' - provisional' : ''}${mr?.released ? ' - done' : ''}`,
    ...['FWD', 'MID', 'DEF'].map(pos => `${pos}: ` + model.available[pos].filter(p => p.status === 'a').slice(0, 6).map(p => `${p.name} (#${p.draftRank})`).join(', ')),
    siteUrl ? `Full lists: ${siteUrl}` : '',
  ].join('\n');

  return { subject, html, text };
}

export function redraftEmail(model, r, siteUrl) {
  const subject = `FPL Draft: redraft ${when(r.at)}`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1b">` +
    `<h2 style="font-size:19px">Redraft tomorrow</h2><p>The league redraft starts <b>${when(r.at)}</b> (before GW${r.beforeGw}). Set your draft list and make sure you can be online.</p>` +
    (siteUrl ? `<p><a href="${esc(siteUrl)}" style="color:#37003c">Open FPL Hub</a></p>` : '') + '</div>';
  return { subject, html, text: `Redraft starts ${when(r.at)} (before GW${r.beforeGw}).` };
}
