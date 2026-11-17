// Superbru reminders, kept short.
// 1. One line in the weekly Draft email (which goes about two days before the round).
// 2. A short "final picks" email about 3 hours before the round's first kick-off, because odds and team news
//    move a lot in those two days. Matches later in the round stay open on Superbru until their own kick-off.
const TZ = 'Europe/London';
const when = iso => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const HOUR = 3600e3;
const ok = S => S && !S.error && !S.none && S.weeks;
const problem = S => (S.banner || []).find(b => b[0] === 'bad');

export function superbruLine(model, gwNum) {
  const S = model.superbru;
  if (!ok(S)) return S?.error ? 'Superbru: the tab could not update this time, so check it before entering picks.' : null;
  const w = S.weeks.find(x => x.gw === gwNum && x.status !== 'played');
  if (!w) return null;
  const missing = w.matches.length - w.ready;
  return `Superbru GW${w.gw}: ${w.ready} of ${w.matches.length} picks ready${missing ? ` (${missing} with no odds yet, so no pick)` : ''}. ` +
    `First match locks ${when(w.firstKo)}; picks keep updating until each kick-off. They're on the Superbru tab.` +
    (problem(S) ? ' Odds problem: see the tab.' : '');
}

export function superbruDue(model, state, now, lead = 3) {
  const S = model.superbru;
  if (!ok(S)) return null;
  const w = S.weeks[S.currentIdx];
  if (!w || !w.firstKo) return null;
  const key = `sb-${w.gw}`;
  if (state.sent[key]) return null;
  const first = new Date(w.firstKo);
  if (now < new Date(first - lead * HOUR) || now >= first) return null;
  return { key, kind: 'superbru' };
}

export function superbruEmail(model, siteUrl) {
  const S = model.superbru;
  const w = S.weeks[S.currentIdx];
  const link = siteUrl ? siteUrl.replace(/#.*$/, '') + '#superbru' : '';
  const subject = `Superbru GW${w.gw}: final picks, first match locks ${when(w.firstKo)}`;
  const row = m => `${m.home} <b>${m.pickText || '–'}</b> ${m.away}${m.a ? '' : ' (no odds, no pick)'}${m.prev ? ` <span style="color:#C8102E">(changed, was ${esc(m.prev)})</span>` : ''}`;
  const open = w.matches.filter(m => m.state === 'open');
  const lines = [
    `First match locks <b>${esc(when(w.firstKo))}</b>. Each match locks at its own kick-off.`,
    ...(problem(S) ? [`<span style="color:#C8102E">${esc(problem(S)[1])}</span>`] : []),
    '',
    ...open.map(m => row({ ...m, home: esc(m.home), away: esc(m.away) })),
  ];
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0E1B33;max-width:560px">` +
    `<div style="background:#0B3D91;color:#fff;padding:18px"><div style="font-size:28px;font-weight:900;text-transform:uppercase;line-height:1.05">GW${w.gw} Superbru picks</div></div>` +
    `<div style="padding:14px 18px;font-size:15px;line-height:1.7">${lines.join('<br>')}</div>` +
    (link ? `<div style="padding:0 18px 18px"><a href="${esc(link)}" style="display:inline-block;background:#0B3D91;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:6px">Open the Superbru tab</a></div>` : '') +
    `</div>`;
  const text = [`GW${w.gw} Superbru picks. First match locks ${when(w.firstKo)}.`, '', ...open.map(m => `${m.home} ${m.pickText || '–'} ${m.away}${m.a ? '' : ' (no odds, no pick)'}${m.prev ? ` (changed, was ${m.prev})` : ''}`), '', link].join('\n');
  return { subject, html, text };
}
