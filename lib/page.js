// Builds the website (Kit room design). The page draws itself from the data in the browser.
export function renderPage(model) {
  const data = JSON.stringify(model).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#071F4D">
<title>FPL Hub</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Public+Sans:wght@400;500;600&family=Permanent+Marker&display=swap" rel="stylesheet">
<style>
:root{--royal:#0B3D91;--deep:#071F4D;--paper:#F2F5FA;--white:#FFFFFF;--gold:#D9A21B;--flag:#C8102E;--ink:#0E1B33;--muted:#5B6B86;--rule:#D8E0EC;--pitch:#E4EFE9;--line:#BFD8CC;--good:#11633A;--goodbg:#D9F0E2;--warn:#8A5A00;--warnbg:#FBF0D6;--badbg:#F6D3D8;--bad:#8E1022}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 "Public Sans",system-ui,sans-serif}
.disp{font-family:"Big Shoulders Display",sans-serif}
.top{background:var(--deep);color:#C9D6EE;font-size:13px}
.top .in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:18px;padding:12px 18px}
.top b{font:800 22px/1 "Big Shoulders Display";color:var(--white);letter-spacing:.5px;margin-right:auto}
.top span.on{color:var(--white);box-shadow:inset 0 -2px var(--gold);padding-bottom:3px}
.hero{background:var(--royal);color:var(--white);position:relative;overflow:hidden}
.hero .in{max-width:1120px;margin:0 auto;padding:22px 18px 26px;position:relative}
.hero .lead{font-size:14px;color:#C9D6EE}
.hero .name{font:900 96px/.86 "Big Shoulders Display";text-transform:uppercase;letter-spacing:1px;margin:8px 0 10px;white-space:nowrap;position:relative;z-index:1}
.hero .num{position:absolute;right:14px;top:4px;font:900 150px/1 "Big Shoulders Display";color:rgba(255,255,255,.12);pointer-events:none}
.hero .meta{font-size:14px;color:#DCE5F5;max-width:46ch}
.flag{display:inline-block;margin-top:12px;background:var(--gold);color:var(--deep);font-weight:600;font-size:13px;padding:4px 10px;border-radius:3px}
.flag.done{background:#9FE0B8;color:#0B3D24}
.strip{background:var(--white);border-bottom:1px solid var(--rule)}
.strip .in{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.strip .in>div{padding:14px 18px;border-left:1px solid var(--rule)}
.strip .in>div:first-child{border-left:0}
.strip small{display:block;color:var(--muted);font-size:12px}
.strip strong{font:800 28px/1.05 "Big Shoulders Display";color:var(--royal)}
.strip span{font-size:13px;color:var(--muted)}
main{max-width:1120px;margin:0 auto;padding:0 0 32px}
section{padding:26px 18px 4px}
h2{font:800 28px/1 "Big Shoulders Display";margin:0 0 4px;color:var(--deep)}
.sub{color:var(--muted);font-size:13px;margin:0 0 12px;max-width:68ch}
.notice{background:var(--warnbg);color:var(--warn);border-radius:8px;padding:10px 12px;font-size:13px;margin:12px 18px 0}
.two{display:grid;gap:0 8px;grid-template-columns:minmax(0,1fr)}
.two>section,.leftcol{min-width:0}
@media (min-width:980px){.leftcol{position:sticky;top:12px;align-self:start}}
.leftcol table{font-size:12px}.leftcol th,.leftcol td{padding:6px 7px;white-space:normal}.leftcol td.big{font-size:16px}
@media (min-width:980px){.two{grid-template-columns:minmax(0,5fr) minmax(0,6fr)}}
@media (max-width:420px){.disc{width:64px}.pline{margin:4px 0 10px}}
.tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center}
.tabs button{font:800 17px/1 "Big Shoulders Display";padding:8px 14px;border:1.5px solid var(--royal);background:transparent;color:var(--royal);border-radius:20px;cursor:pointer}
.tabs button.on{background:var(--royal);color:var(--white)}
.tabs label{font-size:13px;color:var(--muted);margin-left:6px}
.list{background:var(--white);border:1px solid var(--rule);border-radius:10px;overflow:hidden}
.row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:10px 12px;border-top:1px solid var(--rule)}
.row:first-child{border-top:0}
.rank{font:800 20px/1 "Big Shoulders Display";color:var(--royal);text-align:center}
.who strong{font-weight:600}
.who .s{display:block;font-size:12px;color:var(--muted)}
.why{display:block;font-size:12px;color:var(--good);margin-top:2px}
.fx{display:flex;gap:3px;margin-top:4px;flex-wrap:wrap}.fx i{font-style:normal;font-size:11px;padding:1px 5px;border-radius:3px;background:var(--paper);color:var(--ink)}
.fx i.d1,.fx i.d2{background:var(--goodbg);color:var(--good)}.fx i.d4{background:#FBE3D9;color:#8A3A12}.fx i.d5{background:var(--badbg);color:var(--bad)}
.xp{text-align:right;min-width:52px}.xp strong{font:800 24px/1 "Big Shoulders Display";color:var(--deep)}.xp span{display:block;font-size:11px;color:var(--muted)}
.tag{display:inline-block;font-size:11px;font-weight:600;padding:1px 6px;border-radius:3px;margin-left:4px;vertical-align:1px}
.tag.inj{background:var(--badbg);color:var(--bad)}.tag.dbt{background:var(--warnbg);color:var(--warn)}.tag.rel{background:#E3EAF7;color:var(--royal)}.tag.lock{background:#EEE;color:#555}
/* team sheet */
.pitch{background:var(--pitch);border:2px solid var(--line);border-radius:14px 14px 0 0;padding:14px 4px 6px;position:relative}
.pitch::before{content:"";position:absolute;left:50%;top:-2px;width:120px;height:46px;transform:translateX(-50%);border:2px solid var(--line);border-top:0;border-radius:0 0 60px 60px}
.pline{display:flex;justify-content:space-evenly;margin:6px 0 12px;position:relative}
.disc{display:flex;flex-direction:column;align-items:center;width:76px;text-align:center;position:relative}
.disc i{width:34px;height:34px;border-radius:50%;background:var(--royal);box-shadow:inset 0 -3px rgba(0,0,0,.2);display:block}
.disc.gk i{background:var(--gold)}
.disc span{font-size:11px;line-height:1.15;margin-top:4px;font-weight:600;overflow-wrap:anywhere}
.disc em{font-style:normal;font-size:10px;color:var(--muted)}
.disc.out i{outline:3px solid var(--flag);outline-offset:4px}
.disc.inc i{background:transparent;border:2px dashed var(--royal);box-shadow:none}
.marker{font-family:"Permanent Marker",cursive;color:var(--flag);font-size:19px;line-height:1;position:absolute;top:-16px;left:52px;white-space:nowrap;transform:rotate(-8deg)}
.bench{display:flex;justify-content:space-evenly;flex-wrap:wrap;gap:6px 0;padding:10px 4px;border:2px dashed var(--line);border-top:0;border-radius:0 0 14px 14px;background:var(--white)}
.bench .disc i{opacity:.55}
.sheetnote{font-size:13px;color:var(--muted);margin:10px 0 0}
/* waiver plan */
.outs{display:grid;gap:8px;margin-bottom:12px}
.outc{background:var(--white);border:1px solid var(--rule);border-left:4px solid var(--royal);border-radius:0 8px 8px 0;padding:8px 12px;font-size:13px}
.outc.forced{border-left-color:var(--flag)}
.outc b{font-size:14px}
.claim{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:start;padding:10px 12px;border-top:1px solid var(--rule)}
.claim:first-child{border-top:0}
.claim .n{font:800 20px/1.2 "Big Shoulders Display";color:var(--royal);text-align:center}
.claim .mv{font-weight:600}
.claim .mv s{text-decoration:none;color:var(--muted);font-weight:400}
.claim .r{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.claim.split{border-top:3px solid var(--paper)}
.ch{font-size:11px;font-weight:600;padding:2px 7px;border-radius:10px;white-space:nowrap}
.ch.gone{background:var(--badbg);color:var(--bad)}.ch.cont{background:var(--warnbg);color:var(--warn)}.ch.there{background:var(--goodbg);color:var(--good)}
.copy{font:600 13px "Public Sans";border:1.5px solid var(--royal);background:var(--white);color:var(--royal);border-radius:6px;padding:6px 12px;cursor:pointer;margin:10px 0 0}
/* tables */
.tablewrap{overflow-x:auto;background:var(--white);border:1px solid var(--rule);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--rule);white-space:nowrap}
th{font-weight:600;color:var(--muted);font-size:12px;cursor:pointer;user-select:none;background:var(--white)}
th.num,td.num{text-align:right}
td.big{font:800 18px/1 "Big Shoulders Display";color:var(--deep)}
tr:last-child td{border-bottom:0}
tr.me td{background:#E3EAF7}
.news{color:var(--muted);font-size:12px;max-width:240px;overflow:hidden;text-overflow:ellipsis}
.more{font:600 13px "Public Sans";border:0;background:none;color:var(--royal);padding:10px 0;cursor:pointer;text-decoration:underline}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.card{background:var(--white);border:1px solid var(--rule);border-radius:10px;padding:12px;border-top:4px solid var(--gold)}
.card strong{font-weight:600}.card .s{display:block;font-size:12px;color:var(--muted)}
.card .xp{text-align:left;margin-top:8px}
.upl{background:var(--white);border:1px solid var(--rule);border-radius:10px;padding:14px;display:grid;gap:10px;max-width:520px}
.upl input[type=password],.upl input[type=file]{font:inherit;font-size:15px;width:100%;padding:8px 10px;border:1.5px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink)}
.upl ol{margin:0;padding-left:18px;font-size:13px;color:var(--muted)}
.upl a{color:var(--royal)}
.upl .copy{margin:0;justify-self:start}
.st{font-size:13px;min-height:18px}.st.ok{color:var(--good)}.st.bad{color:var(--flag)}
.linkbtn{font:500 12px "Public Sans";border:0;background:none;color:var(--muted);padding:0;cursor:pointer;text-decoration:underline;justify-self:start}
footer a{color:var(--royal)}
footer{max-width:1120px;margin:0 auto;padding:12px 18px 40px;color:var(--muted);font-size:12px}
button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
@media (prefers-reduced-motion:no-preference){.hero .name{animation:rise .5s ease-out both}@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}}
</style>
</head>
<body>
<nav class="top"><div class="in"><b>FPL Hub</b><span class="on">Draft</span><span>Superbru</span><span>Challenge</span></div></nav>
<div id="app"></div>
<script id="data" type="application/json">${data}</script>
<script>
(() => {
const M = JSON.parse(document.getElementById('data').textContent);
const TZ = 'Europe/London';
const F = o => new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: TZ }, o));
const when = iso => F({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const date = iso => F({ day: 'numeric', month: 'short' }).format(new Date(iso));
const dayTime = iso => F({ weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const left = iso => { const ms = Math.max(0, new Date(iso) - Date.now()), h = Math.floor(ms / 36e5); return h >= 24 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : h + 'h ' + Math.floor(ms % 36e5 / 6e4) + 'm'; };
const pv = p => p.pred ? p.pred.n3.toFixed(1) : '–';
const fx = p => '<div class="fx">' + p.fixtures.map(f => '<i class="d' + (f.diff || 3) + '">' + esc(f.opp) + ' ' + (f.home ? 'H' : 'A') + '</i>').join('') + '</div>';
const tags = p => (p.status === 'i' || p.status === 's' ? '<span class="tag inj">' + esc(p.statusText) + '</span>' : p.status === 'd' ? '<span class="tag dbt">Doubtful' + (p.chance != null ? ' ' + p.chance + '%' : '') + '</span>' : '') +
  (p.locked ? '<span class="tag lock">Locked</span>' : '') + (p.released ? '<span class="tag rel">Released GW' + p.released.gw + '</span>' : '');
const mins3 = p => p.mins.slice(3).join(' ');
const gw = M.schedule.gameweeks.find(r => r.gw === M.targetGw) || {};
const mr = M.mustRelease;
const hasPred = !!M.predictions;
const predWord = hasPred ? 'predicted' : 'estimate';
let h = '';

// ---------- hero
if (mr && mr.players.length) {
  const p0 = mr.players[0];
  h += '<header class="hero"><div class="in"><div class="num" aria-hidden="true">' + mr.points + '</div>' +
    '<div class="lead">Gameweek ' + M.lastGw + ' top scorer' + (M.lastGwFinal ? '' : ' so far (gameweek still being played)') + '. House rule says he goes.</div>' +
    '<div class="name" id="hname">' + esc(mr.players.map(p => p.name).join(' / ')) + '</div>' +
    '<div class="meta">' + p0.pos + ' for ' + esc(p0.team) + ', ' + mr.points + ' points' + (mr.players.length > 1 ? '. It\\'s a tie, so you choose who goes' : '') + '. Swap him for another ' + p0.pos + (mr.autoSubs ? '. Auto-subs counted' : '') + '.</div>' +
    '<div class="flag ' + (mr.released ? 'done' : '') + '">' + (mr.released ? 'Released. Nice one' : 'Not released yet') + '</div></div></header>';
} else {
  h += '<header class="hero"><div class="in"><div class="lead">Gameweek ' + M.targetGw + '</div><div class="name" id="hname">Waivers</div><div class="meta">No forced release found for you this week.</div></div></header>';
}
h += '<div class="strip"><div class="in">' +
  (gw.waivers ? '<div><small>Waivers close</small><strong>' + left(gw.waivers) + '</strong><br><span>' + when(gw.waivers) + '</span></div>' : '') +
  (gw.deadline ? '<div><small>GW' + M.targetGw + ' deadline</small><strong>' + date(gw.deadline) + '</strong><br><span>' + dayTime(gw.deadline) + '</span></div>' : '') +
  '<div><small>Your waiver pick</small><strong>' + M.me.waiverPick + ' of ' + M.me.teams + '</strong><br><span>' + (M.me.waiverPick - 1) + ' teams go before you</span></div>' +
  (gw.emailAt ? '<div><small>Reminder email</small><strong>' + date(gw.emailAt) + '</strong><br><span>' + (gw.tight ? 'Tight week, sent 48h early' : '24h before waivers') + '</span></div>' : '') +
  '</div></div>';
for (const r of M.schedule.redrafts) h += '<div class="notice"><b>Redraft</b> ' + when(r.at) + ', before GW' + r.beforeGw + '. Reminder email ' + when(r.remindAt) + '.</div>';
if (!hasPred) h += '<div class="notice">No FPL Form file uploaded yet, so "predicted" numbers are estimates from points per game. Add the file with <a href="#addpred">Add predictions</a> at the bottom of this page, or the desktop shortcut.</div>';
h += '<main>';

// ---------- waiver order (shown under the team sheet, next to the waiver plan)
const orderHtml = '<section><h2>Waiver order</h2><div class="tablewrap"><table><tr><th class="num">Pick</th><th>Team</th><th>Must release</th><th>So must buy</th><th class="num">Claims last GW</th></tr>' +
  M.waiverOrder.map(w => {
    const r = M.rivals.find(x => x.team === w.team);
    const rel = w.me ? (mr ? mr.players.map(p => p.name).join(' / ') : '') : (r ? r.players.map(p => p.name).join(' / ') : '');
    const buy = w.me ? (mr ? [...new Set(mr.players.map(p => p.pos))].join(' or ') : '') : (r ? r.mustBuy : '');
    return '<tr class="' + (w.me ? 'me' : '') + '"><td class="num big">' + w.pick + '</td><td>' + esc(w.team) + '<br><span style="color:var(--muted);font-size:12px">' + esc(w.manager) + '</span></td><td>' + esc(rel) + '</td><td>' + esc(buy) + '</td><td class="num">' + (r ? r.lastClaims : '') + '</td></tr>';
  }).join('') + '</table></div></section>';

// ---------- team sheet + waiver order (left), waiver plan (right)
h += '<div class="two"><div class="leftcol"><section><h2>Team sheet</h2>';
const S = M.sheet;
if (S) {
  const ring = new Set((mr ? mr.players : []).map(p => p.id));
  const disc = (p, out) => '<div class="disc ' + (p.pos === 'GK' ? 'gk ' : '') + (out ? 'out ' : '') + (p.incoming ? 'inc' : '') + '"><i></i><span>' + esc(p.name) + '</span><em>' + (p.pred ? p.pred.n1.toFixed(1) : p.val1.toFixed(1)) + ' pts</em>' + (out ? '<b class="marker">out!</b>' : '') + '</div>';
  h += '<p class="sub">Your best ' + S.formation + ' for GW' + M.targetGw + ' by ' + predWord + ' points (' + S.predicted + ' in total).' + (S.lines.DEF.concat(S.lines.MID, S.lines.FWD).some(p => p.incoming) ? ' The dashed player is the likeliest waiver signing.' : '') + '</p>';
  h += '<div class="pitch">' + ['FWD', 'MID', 'DEF', 'GK'].map(pos => '<div class="pline">' + S.lines[pos].map(p => disc(p, false)).join('') + '</div>').join('') + '</div>';
  h += '<div class="bench">' + S.bench.map(p => disc(p, false)).join('') + (S.forced || []).map(p => disc(p, true)).join('') + '</div>';
  h += '<p class="sheetnote">Ringed in red: the player you have to release. Bench is in order.</p>';
} else h += '<p class="sub">Not enough data for a team sheet yet.</p>';
h += '</section>' + orderHtml + '</div><section><h2>Waiver plan</h2><p class="sub">Enter these claims in this order on the FPL Draft site. Your first turn goes where waiting would cost you most. If a claim works, the game cancels the rest for that player automatically.</p>';
const P = M.plan;
if (P.outs.length) {
  h += '<div class="outs">' + P.outs.map(o => '<div class="outc ' + (o.forced ? 'forced' : '') + '"><b>' + esc(o.out.name) + '</b> ' + o.out.pos + ', ' + (o.forced ? 'must go (house rule)' : 'optional. ' + esc(o.reasons.join('. '))) + '</div>').join('') + '</div>';
  let prevOut = null;
  h += '<div class="list">' + P.claims.map(c => {
    const split = prevOut && prevOut !== c.out.id; prevOut = c.out.id;
    const ch = c.chance === 'likely gone' ? 'gone' : c.chance === 'contested' ? 'cont' : 'there';
    return '<div class="claim' + (split ? ' split' : '') + '"><div class="n">' + c.n + '</div><div><span class="mv"><s>' + esc(c.out.name) + ' out,</s> ' + esc(c.in.name) + ' in</span> <span class="s" style="font-size:12px;color:var(--muted)">' + esc(c.in.team) + ', ' + pv(c.in) + ' ' + predWord + '</span><span class="r">' + esc(c.reason) + '</span></div><span class="ch ' + ch + '">' + esc(c.chance) + '</span></div>';
  }).join('') + '</div><button class="copy" id="copy">Copy plan as text</button>';
} else h += '<p class="sub">Nothing to claim this week.</p>';
h += '</section></div>';

// ---------- hidden picks
h += '<section><h2>Hidden picks</h2><p class="sub">Unowned players who are easy to miss: coming back from injury, breaking into the team, or getting more involved. Sorted by ' + predWord + ' points for the next 3 gameweeks, with a nudge for highly rated players.</p><div class="tabs" id="htabs"></div><div class="cards" id="hcards"></div></section>';

// ---------- best available
h += '<section><h2>Best available</h2><p class="sub">Every unowned player. Sorted by draft rank; tap a column to sort by something else. Minutes are the last 3 gameweeks.</p><div class="tabs" id="atabs"></div><div class="tablewrap"><table id="atable"></table></div><button class="more" id="amore"></button></section>';

// ---------- coming next week
h += '<section><h2>Coming next week</h2><p class="sub">Each rival\\'s GW' + M.lastGw + ' top scorer. They release him now; he\\'s locked for a week, then claimable for GW' + (M.targetGw + 1) + '.</p><div class="list">' +
  M.comingNextWeek.slice(0, 12).map(p => '<div class="row"><div class="rank">' + p.draftRank + '</div><div class="who"><strong>' + esc(p.name) + '</strong>' + (p.tie ? '<span class="tag dbt">tie</span>' : '') + '<span class="s">' + p.pos + ' ' + esc(p.team) + ', from ' + esc(p.from) + ', ' + p.lastGwPts + ' pts in GW' + M.lastGw + '</span></div><div class="xp"><strong>' + pv(p) + '</strong><span>' + predWord + '</span></div></div>').join('') + '</div></section>';

// ---------- deadlines
h += '<section><h2>Coming deadlines</h2><div class="tablewrap"><table><tr><th>GW</th><th>Waivers close</th><th>Deadline</th><th class="num">Time to act</th><th>Email</th></tr>' +
  M.schedule.gameweeks.map(r => '<tr><td class="big">' + r.gw + '</td><td>' + when(r.waivers) + '</td><td>' + when(r.deadline) + '</td><td class="num">' + (r.gapHours != null ? Math.round(r.gapHours) + 'h' : '') + (r.tight ? '<span class="tag dbt">tight</span>' : '') + '</td><td>' + when(r.emailAt) + '</td></tr>').join('') + '</table></div></section>';
// ---------- add predictions (works on a phone; the file is locked on this device before upload)
h += '<section id="addpred"><h2>Add predictions</h2><p class="sub">Download the FPL Form file (<a href="https://fplform.com/export-fpl-form-data" style="color:var(--royal)">Just Predicted Points, then Generate CSV</a>), then pick it here. It is locked with your passcode on this device before it is uploaded. The site updates about 2 minutes later.</p><div class="upl" id="upl"></div></section>';
h += '</main><footer>Updated ' + when(M.generatedAt) + '. League data from the public FPL Draft site. ' +
  (hasPred ? 'Predicted points from FPL Form (' + esc(M.predictions.label) + ', uploaded ' + date(M.predictions.uploadedAt) + '). ' : '') + '<a href="#addpred">Add predictions</a></footer>';
document.getElementById('app').innerHTML = h;

// fit the shirt name on one line
function fitName() {
  const el = document.getElementById('hname'); if (!el) return;
  const cs = getComputedStyle(el.parentElement);
  const max = el.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
  el.style.fontSize = '96px';
  if (el.scrollWidth > max) el.style.fontSize = Math.max(34, Math.floor(96 * max / el.scrollWidth)) + 'px';
}
(document.fonts ? document.fonts.ready : Promise.resolve()).then(fitName); addEventListener('resize', fitName);

// keep the left column (team sheet + waiver order) in view while scrolling the waiver plan;
// if it's taller than the screen, let it stick by its bottom edge so nothing is hidden
function stick() {
  const el = document.querySelector('.leftcol'); if (!el) return;
  el.style.top = Math.min(12, innerHeight - el.offsetHeight - 12) + 'px';
}
(document.fonts ? document.fonts.ready : Promise.resolve()).then(stick); addEventListener('resize', stick);

// copy plan
const cp = document.getElementById('copy');
if (cp) cp.onclick = async () => {
  const t = P.claims.map(c => c.n + '. ' + c.out.name + ' out, ' + c.in.name + ' in').join('\\n');
  try { await navigator.clipboard.writeText(t); cp.textContent = 'Plan copied'; } catch (e) { cp.textContent = 'Copy failed. Select the list instead'; }
};

// hidden picks tabs
let hpos = 'ALL';
function drawHidden() {
  const list = M.hidden.filter(p => hpos === 'ALL' || p.pos === hpos).slice(0, 12);
  document.getElementById('htabs').innerHTML = ['ALL', 'FWD', 'MID', 'DEF', 'GK'].map(p => '<button class="' + (p === hpos ? 'on' : '') + '" data-p="' + p + '">' + (p === 'ALL' ? 'All' : p) + '</button>').join('');
  document.querySelectorAll('#htabs button').forEach(b => b.onclick = () => { hpos = b.dataset.p; drawHidden(); });
  document.getElementById('hcards').innerHTML = list.length ? list.map(p => '<div class="card"><strong>' + esc(p.name) + '</strong>' + tags(p) + '<span class="s">' + p.pos + ' ' + esc(p.team) + ', draft rank ' + p.draftRank + ', minutes ' + mins3(p) + '</span><span class="why">' + esc(p.why) + '</span><div class="xp"><strong>' + pv(p) + '</strong><span>' + predWord + ', next 3</span></div>' + fx(p) + '</div>').join('') : '<p class="sub">None in this position right now.</p>';
}
drawHidden();

// best available table
const cols = [['draftRank', 'Rank', 1], ['name', 'Player'], ['val', hasPred ? 'Predicted' : 'Estimate', 1], ['total', 'Pts', 1], ['form', 'Form', 1], ['m3', 'Mins', 1], ['fx', 'Next 3'], ['news', 'News']];
let apos = 'FWD', sortKey = 'draftRank', asc = true, showAll = false, hideOut = false;
function drawTabs() {
  document.getElementById('atabs').innerHTML = ['FWD', 'MID', 'DEF', 'GK'].map(p => '<button class="' + (p === apos ? 'on' : '') + '" data-p="' + p + '">' + p + '</button>').join('') +
    '<label><input type="checkbox" id="hideout"' + (hideOut ? ' checked' : '') + '> Hide injured</label>';
  document.querySelectorAll('#atabs button').forEach(b => b.onclick = () => { apos = b.dataset.p; showAll = false; drawTabs(); drawTable(); });
  document.getElementById('hideout').onchange = e => { hideOut = e.target.checked; drawTable(); };
}
function drawTable() {
  let rows = M.available[apos].filter(p => !hideOut || p.status === 'a' || p.status === 'd');
  rows = rows.slice().sort((a, b) => { const x = a[sortKey], y = b[sortKey]; const r = typeof x === 'string' ? x.localeCompare(y) : x - y; return asc ? r : -r; });
  const total = rows.length;
  if (!showAll) rows = rows.slice(0, 20);
  const t = document.getElementById('atable');
  t.innerHTML = '<tr>' + cols.map(c => '<th data-k="' + c[0] + '" class="' + (c[2] ? 'num' : '') + '">' + c[1] + (c[0] === sortKey ? (asc ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr>' +
    rows.map(p => '<tr><td class="num big">' + p.draftRank + '</td><td>' + esc(p.name) + tags(p) + '<br><span style="color:var(--muted);font-size:12px">' + esc(p.team) + '</span></td><td class="num big">' + pv(p) + '</td><td class="num">' + p.total + '</td><td class="num">' + p.form.toFixed(1) + '</td><td class="num">' + mins3(p) + '</td><td>' + fx(p) + '</td><td class="news" title="' + esc(p.news) + '">' + esc(p.news) + '</td></tr>').join('');
  t.querySelectorAll('th').forEach(th => th.onclick = () => { const k = th.dataset.k; if (k === 'fx') return; if (k === sortKey) asc = !asc; else { sortKey = k; asc = ['draftRank', 'name', 'news'].includes(k); } drawTable(); });
  const more = document.getElementById('amore');
  more.textContent = showAll ? 'Show top 20' : 'Show all ' + total;
  more.style.display = total > 20 ? '' : 'none';
  more.onclick = () => { showAll = !showAll; drawTable(); };
}
drawTabs(); drawTable();

// ---------- add predictions: lock the FPL Form file here, upload it to GitHub, ask the site to rebuild
const REPO = 'nicrubes/fpl-hub';
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} },
};
const savedPass = () => { let p = ls.get('fplhub-pass'); if (!p) { try { p = sessionStorage.getItem('fplhub-pass'); } catch (e) {} } return p; };
const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };
const ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function aesKey(pw, salt, n, use) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: n, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [use]);
}
async function lockText(text, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), n = 600000;
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(pw, salt, n, 'encrypt'), new TextEncoder().encode(text)));
  return { s: b64(salt), i: b64(iv), c: b64(c), n };
}
// A typed passcode is checked against the site's own lock, so a typo can't upload a file the site can't open.
async function passWorks(pw) {
  const html = await (await fetch(location.href.split('#')[0], { cache: 'no-store' })).text();
  const m = html.match(/const P = (\\{[^\\n]*\\});/);
  if (!m) return true;
  const L = JSON.parse(m[1]);
  try { await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(L.i) }, await aesKey(pw, ub64(L.s), L.n, 'decrypt'), ub64(L.c)); return true; } catch (e) { return false; }
}
function parseCsv(text) {
  const lines = text.replace(/^\\uFEFF/, '').trim().split(/\\r?\\n/);
  const cols = lines[0].split(',').map(s => s.trim());
  const gws = cols.map(c => (c.match(/^(\\d+)_pts$/) || [])[1]).filter(Boolean).map(Number);
  if (!cols.includes('ID') || !gws.length || lines.length < 50) throw new Error('not FPL Form');
  return gws;
}
async function gh(token, method, path, body) {
  const r = await fetch('https://api.github.com/repos/' + REPO + path, {
    method, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 404 && method === 'GET') return null;
  if (!r.ok) { const e = new Error('GitHub said ' + r.status); e.status = r.status; throw e; }
  return r.status === 204 ? {} : r.json();
}
function drawUpload() {
  const box = document.getElementById('upl');
  const token = ls.get('fplhub-gh');
  const say = (msg, cls) => { const s = document.getElementById('ust'); s.textContent = msg; s.className = 'st ' + (cls || ''); };
  if (!token) {
    box.innerHTML = '<ol><li><a href="https://github.com/settings/personal-access-tokens/new">Make a phone key on GitHub</a>: only the fpl-hub project, with Contents and Actions set to Read and write.</li><li>Copy it and paste it here. It is kept on this phone only.</li></ol>' +
      '<input type="password" id="ghkey" placeholder="github_pat_…" autocomplete="off" aria-label="GitHub key"><button class="copy" id="ghsave">Save key</button><div class="st" id="ust" role="status"></div>';
    document.getElementById('ghsave').onclick = async () => {
      const v = document.getElementById('ghkey').value.trim();
      if (!/^(github_pat_|ghp_)/.test(v)) return say('That doesn\\'t look like a GitHub key. It starts with github_pat_.', 'bad');
      say('Checking the key…');
      try {
        const repo = await gh(v, 'GET', '');
        if (!repo || !(repo.permissions || {}).push) return say('That key can\\'t change fpl-hub. Make one with Contents and Actions set to Read and write.', 'bad');
      } catch (e) { return say(e.status === 401 ? 'GitHub didn\\'t accept that key. Check you copied all of it.' : 'Couldn\\'t reach GitHub. Try again.', 'bad'); }
      if (!ls.set('fplhub-gh', v)) return say('This browser won\\'t let the page save the key. Turn off private browsing and try again.', 'bad');
      drawUpload();
    };
    return;
  }
  box.innerHTML = '<input type="file" id="ufile" aria-label="FPL Form file">' +
    (savedPass() ? '' : '<input type="password" id="upass" placeholder="Site passcode" aria-label="Site passcode">') +
    '<button class="copy" id="ugo">Lock and upload</button><div class="st" id="ust" role="status"></div>' +
    '<button class="linkbtn" id="ghforget">Remove the GitHub key from this phone</button>';
  document.getElementById('ghforget').onclick = () => { ls.del('fplhub-gh'); drawUpload(); };
  let busy = false;
  document.getElementById('ugo').onclick = async () => {
    if (busy) return;
    const f = document.getElementById('ufile').files[0];
    if (!f) return say('Choose the FPL Form file first.', 'bad');
    const typed = document.getElementById('upass');
    const pw = savedPass() || (typed && typed.value);
    if (!pw) return say('Type your site passcode.', 'bad');
    busy = true;
    try {
      const text = await f.text();
      let gws;
      try { gws = parseCsv(text); } catch (e) { return say('That file doesn\\'t look like an FPL Form predicted points file.', 'bad'); }
      if (typed) { say('Checking passcode…'); if (!(await passWorks(pw))) return say('That passcode doesn\\'t open the site. Try again.', 'bad'); }
      say('Locking the file…');
      const slot = gws.length >= 20 ? 'season' : 'weekly';
      const label = f.name + ' (GW' + gws[0] + '-' + gws[gws.length - 1] + ')';
      const stored = JSON.stringify({ label, uploadedAt: new Date().toISOString(), payload: await lockText(text, pw) });
      say('Uploading…');
      const path = '/contents/data/predictions-' + slot + '.json';
      const existing = await gh(token, 'GET', path);
      await gh(token, 'PUT', path, { message: 'Update ' + slot + ' predictions (from phone)', content: b64(new TextEncoder().encode(stored)), sha: existing ? existing.sha : undefined });
      try { await gh(token, 'POST', '/actions/workflows/hourly.yml/dispatches', { ref: 'main' }); say('Done: ' + label + '. Reload this page in about 2 minutes to see it.', 'ok'); }
      catch (e) { say('Uploaded ' + label + '. The site will show it at its next update.', 'ok'); }
    } catch (e) {
      say(e.status === 401 ? 'GitHub didn\\'t accept the key. It may have expired: remove it below and add a new one.'
        : e.status === 403 || e.status === 404 ? 'The key isn\\'t allowed to change fpl-hub. Make a new one with Contents and Actions set to Read and write.'
        : 'Upload failed (' + (e.message || 'unknown problem') + '). Try again, or use the desktop shortcut.', 'bad');
    } finally { busy = false; }
  };
}
drawUpload();
})();
</script>
</body>
</html>`;
}
