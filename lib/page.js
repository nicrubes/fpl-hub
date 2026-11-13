// Builds the website. The page draws itself from the data in the browser.
export function renderPage(model) {
  const data = JSON.stringify(model).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FPL Hub</title>
<style>
:root{--bg:#f6f6f3;--card:#fff;--text:#1d1d1b;--muted:#6b6a65;--line:#e4e2db;--accent:#37003c;--accent-soft:#efe6f0;--good:#1f7a4d;--good-soft:#e3f3ea;--warn:#9a5b00;--warn-soft:#fbf0dc;--bad:#a32d2d;--bad-soft:#fbe7e7;
--d1:#1f7a4d;--d2:#5fae74;--d3:#c9c6bb;--d4:#e08a5a;--d5:#a32d2d}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1e1e1c;--text:#ecebe6;--muted:#a3a29b;--line:#34332f;--accent:#e3b7e8;--accent-soft:#3a2a3c;--good:#7fd1a2;--good-soft:#1d3327;--warn:#f0c070;--warn-soft:#3a2f18;--bad:#f09595;--bad-soft:#3d2020;--d3:#55534c}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:16px}
header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin-bottom:16px}
header h1{font-size:20px;margin:0 8px 0 0}
.tab{padding:4px 12px;border-radius:999px;font-size:13px;border:1px solid var(--line);color:var(--muted)}
.tab.on{background:var(--accent);color:var(--card);border-color:var(--accent)}
h2{font-size:17px;margin:28px 0 10px}
.sub{color:var(--muted);font-size:13px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.stat .k{font-size:12px;color:var(--muted)}.stat .v{font-size:19px;font-weight:600}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.alert{border-color:var(--warn);background:var(--warn-soft)}
.ok{border-color:var(--good);background:var(--good-soft)}
.pill{display:inline-block;font-size:11px;padding:1px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent);white-space:nowrap}
.pill.warn{background:var(--warn-soft);color:var(--warn)}.pill.bad{background:var(--bad-soft);color:var(--bad)}.pill.good{background:var(--good-soft);color:var(--good)}
.tablewrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}
th{font-weight:600;color:var(--muted);font-size:12px;cursor:pointer;user-select:none;position:sticky;top:0;background:var(--card)}
th.num,td.num{text-align:right}
tr:last-child td{border-bottom:0}
.fx{display:inline-block;min-width:44px;text-align:center;font-size:11px;padding:1px 4px;border-radius:4px;margin-right:3px;color:#fff}
.fx.d1{background:var(--d1)}.fx.d2{background:var(--d2)}.fx.d3{background:var(--d3);color:var(--text)}.fx.d4{background:var(--d4)}.fx.d5{background:var(--d5)}.fx.dn{background:var(--line);color:var(--text)}
.postabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center}
button{font:inherit;font-size:13px;padding:5px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer}
button.on{background:var(--accent);color:var(--card);border-color:var(--accent)}
label{font-size:13px;color:var(--muted)}
.news{color:var(--muted);font-size:12px;max-width:260px;overflow:hidden;text-overflow:ellipsis}
.me td{background:var(--accent-soft)}
footer{margin:32px 0 8px;color:var(--muted);font-size:12px}
</style>
</head>
<body>
<div class="wrap" id="app"></div>
<script id="data" type="application/json">${data}</script>
<script>
const M = JSON.parse(document.getElementById('data').textContent);
const TZ = 'Europe/London';
const fmt = (iso, o) => new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: TZ }, o)).format(new Date(iso));
const when = iso => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function until(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return 'passed';
  const h = Math.floor(ms / 36e5), d = Math.floor(h / 24);
  return d >= 1 ? 'in ' + d + 'd ' + (h % 24) + 'h' : 'in ' + h + 'h ' + Math.floor(ms % 36e5 / 6e4) + 'm';
}
const fxHtml = p => p.fixtures.map(f => '<span class="fx ' + (f.diff ? 'd' + f.diff : 'dn') + '" title="GW' + f.gw + '">' + esc(f.opp) + (f.home ? ' (H)' : ' (a)') + '</span>').join('') || '<span class="sub">none</span>';
const statusPill = p => p.status === 'a' ? '' : '<span class="pill ' + (p.status === 'd' ? 'warn' : 'bad') + '">' + esc(p.statusText) + (p.chance != null ? ' ' + p.chance + '%' : '') + '</span>';

const gw = M.schedule.gameweeks.find(r => r.gw === M.targetGw) || {};
const mr = M.mustRelease;
let html = '';

html += '<header><h1>FPL Hub</h1><span class="tab on">Draft</span><span class="tab">Superbru · coming later</span><span class="tab">Challenge · coming later</span></header>';
html += '<div class="sub">' + esc(M.league.name) + ' · ' + esc(M.me.team) + ' · preparing for GW' + M.targetGw + '</div>';

html += '<div class="grid" style="margin-top:12px">';
if (gw.waivers) html += '<div class="stat"><div class="k">Waivers close</div><div class="v">' + when(gw.waivers) + '</div><div class="sub">' + until(gw.waivers) + '</div></div>';
if (gw.deadline) html += '<div class="stat"><div class="k">GW' + M.targetGw + ' deadline</div><div class="v">' + when(gw.deadline) + '</div><div class="sub">' + until(gw.deadline) + '</div></div>';
html += '<div class="stat"><div class="k">Your waiver spot</div><div class="v">' + M.me.waiverPick + ' of ' + M.me.teams + '</div><div class="sub">' + (M.me.waiverPick - 1) + ' teams pick before you</div></div>';
if (gw.emailAt) html += '<div class="stat"><div class="k">Reminder email</div><div class="v">' + when(gw.emailAt) + '</div><div class="sub">' + (gw.tight ? 'Tight week: sent 48h early' : '24h before waivers') + '</div></div>';
html += '</div>';

for (const r of M.schedule.redrafts) {
  html += '<div class="card alert" style="margin-top:12px"><b>Redraft:</b> ' + when(r.at) + ' (before GW' + r.beforeGw + '). Reminder email ' + when(r.remindAt) + '.</div>';
}

html += '<h2>You must release</h2>';
if (!mr) html += '<div class="card">Could not find your team for GW' + M.lastGw + '.</div>';
else {
  const names = mr.players.map(p => '<b>' + esc(p.name) + '</b> <span class="sub">' + p.pos + ' · ' + esc(p.team) + '</span>').join(' or ');
  html += '<div class="card ' + (mr.released ? 'ok' : 'alert') + '">' + names + ' · ' + mr.points + ' pts in GW' + M.lastGw +
    (mr.players.length > 1 ? ' <span class="pill warn">Tie: you choose</span>' : '') +
    (M.lastGwFinal ? '' : ' <span class="pill warn">Provisional: GW' + M.lastGw + ' still being played</span>') +
    '<div class="sub" style="margin-top:6px">' + (mr.released ? 'Done: no longer in your squad.' : 'Not released yet. Swaps are same position, so you must bring in a ' + [...new Set(mr.players.map(p => p.pos))].join(' or ') + '.') +
    (mr.autoSubs ? ' Auto-subs were counted.' : '') + '</div></div>';
}
const pc = M.positionsContested;
html += '<div class="sub" style="margin-top:8px">Teams picking before you that must also replace a: GK ' + pc.GK + ' · DEF ' + pc.DEF + ' · MID ' + pc.MID + ' · FWD ' + pc.FWD + '</div>';

html += '<h2>Best available</h2><div class="sub" style="margin-bottom:8px">Every unowned player, ranked by FPL draft rank (lower is better). Click a column to sort. "Wanted by" = managers who put in a claim for him in the last 3 waiver rounds.</div>';
html += '<div class="postabs" id="postabs"></div><div class="tablewrap"><table id="avail"></table></div><div style="margin-top:8px"><button id="more"></button></div>';

html += '<h2>Hidden picks</h2><div class="sub" style="margin-bottom:8px">Unowned, highly ranked players people forget: injured or returning, recently released, or barely played yet.</div>';
html += '<div class="tablewrap"><table><tr><th>Player</th><th>Pos</th><th>Team</th><th class="num">Draft rank</th><th class="num">Pts</th><th>Why</th><th>Next 3</th></tr>' +
  M.hidden.map(p => '<tr><td>' + esc(p.name) + ' ' + statusPill(p) + '</td><td>' + p.pos + '</td><td>' + esc(p.team) + '</td><td class="num">' + p.draftRank + '</td><td class="num">' + p.total + '</td><td class="news" title="' + esc(p.why) + '">' + esc(p.why) + '</td><td>' + fxHtml(p) + '</td></tr>').join('') + '</table></div>';

html += '<h2>Coming next week</h2><div class="sub" style="margin-bottom:8px">Each rival\\'s top scorer from GW' + M.lastGw + '. Under the house rule they release him now; he is locked for a week, then claimable for GW' + (M.targetGw + 1) + '.</div>';
html += '<div class="tablewrap"><table><tr><th>Player</th><th>Pos</th><th>Team</th><th class="num">Draft rank</th><th class="num">GW' + M.lastGw + '</th><th class="num">Season</th><th>From</th></tr>' +
  M.comingNextWeek.map(p => '<tr><td>' + esc(p.name) + (p.tie ? ' <span class="pill warn">tie</span>' : '') + '</td><td>' + p.pos + '</td><td>' + esc(p.team) + '</td><td class="num">' + p.draftRank + '</td><td class="num">' + p.lastGwPts + '</td><td class="num">' + p.total + '</td><td>' + esc(p.from) + '</td></tr>').join('') + '</table></div>';

html += '<h2>Waiver order and rivals</h2><div class="tablewrap"><table><tr><th class="num">Pick</th><th>Team</th><th>Manager</th><th>Must release</th><th>So must buy</th><th class="num">Claims last GW</th></tr>' +
  M.waiverOrder.map(w => {
    const r = M.rivals.find(x => x.team === w.team);
    const rel = w.me ? (mr ? mr.players.map(p => p.name).join(' / ') : '') : (r ? r.players.map(p => p.name).join(' / ') : '');
    const buy = w.me ? (mr ? [...new Set(mr.players.map(p => p.pos))].join(' or ') : '') : (r ? r.mustBuy : '');
    return '<tr class="' + (w.me ? 'me' : '') + '"><td class="num">' + w.pick + '</td><td>' + esc(w.team) + '</td><td>' + esc(w.manager) + '</td><td>' + esc(rel) + '</td><td>' + esc(buy) + '</td><td class="num">' + (r ? r.lastClaims : '') + '</td></tr>';
  }).join('') + '</table></div>';

html += '<h2>Your squad</h2><div class="tablewrap"><table><tr><th>Player</th><th>Pos</th><th>Team</th><th class="num">Draft rank</th><th class="num">GW' + M.lastGw + '</th><th class="num">Season</th><th class="num">Form</th><th>Next 3</th></tr>' +
  M.squad.map(p => '<tr><td>' + esc(p.name) + ' ' + statusPill(p) + '</td><td>' + p.pos + '</td><td>' + esc(p.team) + '</td><td class="num">' + p.draftRank + '</td><td class="num">' + p.lastGwPts + '</td><td class="num">' + p.total + '</td><td class="num">' + p.form.toFixed(1) + '</td><td>' + fxHtml(p) + '</td></tr>').join('') + '</table></div>';

html += '<h2>Upcoming deadlines</h2><div class="tablewrap"><table><tr><th>GW</th><th>Previous GW ends</th><th>Waivers close</th><th>Deadline</th><th class="num">Gap</th><th>Email</th></tr>' +
  M.schedule.gameweeks.map(r => '<tr><td>' + r.gw + '</td><td>' + (r.prevGwEnds ? when(r.prevGwEnds) : '') + '</td><td>' + when(r.waivers) + '</td><td>' + when(r.deadline) + '</td><td class="num">' + (r.gapHours != null ? Math.round(r.gapHours) + 'h' : '') + (r.tight ? ' <span class="pill warn">tight</span>' : '') + '</td><td>' + when(r.emailAt) + '</td></tr>').join('') + '</table></div>';

html += '<footer>Updated ' + when(M.generatedAt) + ' UK time · data from the public FPL Draft site · waiver plan builder and line-up tips coming in the next stage</footer>';
document.getElementById('app').innerHTML = html;

// ----- sortable "best available" table
const cols = [
  ['name', 'Player'], ['team', 'Team'], ['draftRank', 'Draft rank', 1], ['total', 'Pts', 1], ['form', 'Form', 1],
  ['ppg', 'Pts/game', 1], ['minutes', 'Mins', 1], ['xgi', 'xGI', 1], ['demand', 'Wanted by', 1], ['fx', 'Next 3'], ['news', 'News'],
];
let pos = 'FWD', sortKey = 'draftRank', asc = true, showAll = false, hideOut = false;
const tabs = document.getElementById('postabs');
function drawTabs() {
  tabs.innerHTML = ['FWD', 'MID', 'DEF', 'GK'].map(p => '<button data-p="' + p + '" class="' + (p === pos ? 'on' : '') + '">' + p + ' (' + M.available[p].length + ')</button>').join('') +
    '<label style="margin-left:8px"><input type="checkbox" id="hideout"' + (hideOut ? ' checked' : '') + '> Hide injured / suspended</label>';
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => { pos = b.dataset.p; showAll = false; drawTabs(); drawTable(); });
  document.getElementById('hideout').onchange = e => { hideOut = e.target.checked; drawTable(); };
}
function drawTable() {
  let rows = M.available[pos].filter(p => !hideOut || p.status === 'a' || p.status === 'd');
  rows = rows.slice().sort((a, b) => {
    const x = a[sortKey], y = b[sortKey];
    const r = typeof x === 'string' ? x.localeCompare(y) : x - y;
    return asc ? r : -r;
  });
  const total = rows.length;
  if (!showAll) rows = rows.slice(0, ${20});
  const t = document.getElementById('avail');
  t.innerHTML = '<tr>' + cols.map(c => '<th data-k="' + c[0] + '" class="' + (c[2] ? 'num' : '') + '">' + c[1] + (c[0] === sortKey ? (asc ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr>' +
    rows.map(p => '<tr><td>' + esc(p.name) + ' ' + statusPill(p) + (p.locked ? ' <span class="pill bad">locked</span>' : '') + (p.released ? ' <span class="pill">released GW' + p.released.gw + '</span>' : '') + '</td><td>' + esc(p.team) + '</td><td class="num">' + p.draftRank + '</td><td class="num">' + p.total + '</td><td class="num">' + p.form.toFixed(1) + '</td><td class="num">' + p.ppg.toFixed(1) + '</td><td class="num">' + p.minutes + '</td><td class="num">' + p.xgi.toFixed(1) + '</td><td class="num">' + (p.demand || '') + '</td><td>' + fxHtml(p) + '</td><td class="news" title="' + esc(p.news) + '">' + esc(p.news) + '</td></tr>').join('');
  t.querySelectorAll('th').forEach(th => th.onclick = () => {
    const k = th.dataset.k; if (k === 'fx') return;
    if (k === sortKey) asc = !asc; else { sortKey = k; asc = ['draftRank', 'name', 'team', 'news'].includes(k); }
    drawTable();
  });
  const more = document.getElementById('more');
  more.textContent = showAll ? 'Show top 20' : 'Show all ' + total;
  more.style.display = total > 20 ? '' : 'none';
  more.onclick = () => { showAll = !showAll; drawTable(); };
}
drawTabs(); drawTable();
</script>
</body>
</html>`;
}
