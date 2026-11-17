// The Superbru tab. Design chosen 17 Nov 2026: A (Scoreboard cards) with C's prediction write-up under "Why".
// Drawn in the browser from M.superbru. Kit room colours, same as the Draft and Challenge tabs.

export const superbruCss = `
#sbapp .hero .name{font-size:clamp(50px,14vw,96px);white-space:normal}
.sb-wk{background:var(--white);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:5}
.sb-wk .in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:8px 18px}
.sb-wkb{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--royal);background:var(--white);color:var(--royal);font-size:15px;cursor:pointer;flex:none}
.sb-wkb:disabled{opacity:.3;cursor:default}
.sb-wkname{text-align:center;min-width:110px}
.sb-wkname b{display:block;font:800 26px/1 "Big Shoulders Display",sans-serif;color:var(--deep)}
.sb-wkname span{font-size:12px;color:var(--muted)}
.sb-wksel{margin-left:auto;font:inherit;font-size:13px;padding:7px 8px;border:1.5px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink);flex:0 1 220px;min-width:0;width:0}
.sb-banner{border-radius:8px;padding:10px 12px;font-size:13px;margin:12px 18px 0}
.sb-banner.warn{background:var(--warnbg);color:var(--warn)}.sb-banner.bad{background:var(--badbg);color:var(--bad)}
.sb-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));align-items:start}
.sb-card{background:var(--deep);color:#fff;border-radius:12px;padding:12px 14px;display:grid;gap:10px}
.sb-when{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;color:#AFC0DE}
.sb-when>span:last-child{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.sb-board{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}
.sb-t{font:800 24px/1 "Big Shoulders Display",sans-serif;text-transform:uppercase;letter-spacing:.5px;overflow-wrap:break-word;min-width:0}
.sb-t.long{font-size:19px;letter-spacing:0}
.sb-t:last-child{text-align:right}
.sb-digits{display:flex;gap:6px;align-items:center}
.sb-digits i{font:900 46px/1 "Big Shoulders Display",sans-serif;font-style:normal;width:46px;height:58px;display:grid;place-items:center;background:#0E2B63;color:var(--gold);border-radius:6px;box-shadow:inset 0 -29px rgba(0,0,0,.18),inset 0 1px rgba(255,255,255,.08)}
.sb-digits b{color:#5D73A0;font-size:18px}
.sb-card.no .sb-digits i,.sb-card.stale .sb-digits i{color:#5D73A0}
.sb-bar{display:flex;height:22px;border-radius:5px;overflow:hidden;font-size:11px;font-weight:600}
.sb-bar span{display:flex;align-items:center;padding:0 6px;white-space:nowrap;overflow:hidden;min-width:0}
.sb-bar .h{background:var(--royal);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}.sb-bar .d{background:#3A5287;color:#fff}.sb-bar .a{background:var(--gold);color:var(--deep);justify-content:flex-end}
.sb-nums{font-size:12px;color:#C9D6EE;display:flex;gap:4px 14px;flex-wrap:wrap}
.sb-nums strong{color:#fff}
.sb-tag{display:inline-block;font-size:11px;font-weight:600;padding:2px 7px;border-radius:10px;white-space:nowrap}
.sb-tag.banker{background:var(--goodbg);color:var(--good)}.sb-tag.lean{background:#E3EAF7;color:var(--royal)}.sb-tag.toss{background:var(--warnbg);color:var(--warn)}
.sb-tag.chg{background:var(--badbg);color:var(--bad)}.sb-tag.none{background:#3A5287;color:#DCE5F5}.sb-tag.lock{background:#DCE5F5;color:var(--deep)}
.sb-pts{display:inline-block;min-width:34px;text-align:center;font-weight:700;font-size:12px;padding:2px 6px;border-radius:10px;background:#EEE;color:#555}
.sb-pts.p3{background:var(--gold);color:var(--deep)}.sb-pts.p15{background:var(--goodbg);color:var(--good)}.sb-pts.p1{background:#E3EAF7;color:var(--royal)}.sb-pts.p0{background:var(--badbg);color:var(--bad)}
.sb-res{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.08);border-radius:8px;padding:6px 10px;font-size:13px}
.sb-note{font-size:13px;color:#DCE5F5;margin:0}
.sb-card details{background:rgba(255,255,255,.06);border-radius:8px;padding:8px 10px}
.sb-card summary{cursor:pointer;font-size:13px;font-weight:600;color:#fff}
.sb-card details p{font-size:13px;margin:6px 0 0;color:#DCE5F5}
.sb-card details[open]{background:var(--white);color:var(--ink);padding:10px 12px 12px}
.sb-card details[open] summary{color:var(--royal)}
.sb-card details[open] p{color:var(--ink);font-size:14px}
.sb-src{color:var(--muted)!important;font-size:12px!important}
.sb-pred{border-left:4px solid var(--flag);padding:2px 0 2px 10px}
.sb-mk{font-family:"Permanent Marker",cursive;color:var(--flag);font-size:26px;line-height:1;display:inline-block;transform:rotate(-4deg);margin-right:6px;vertical-align:-3px}
.sb-pred b{color:var(--deep)}
.sb-odds{font:600 13px ui-monospace,Consolas,monospace;color:var(--royal);background:var(--paper);display:inline-block;padding:3px 8px;border-radius:5px;margin-top:8px}
.sb-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.sb-btns .copy{margin:0}
.sb-btns .copy:first-child{background:var(--royal);color:#fff}
.sb-copied textarea{width:100%;font:12px/1.4 ui-monospace,Consolas,monospace;border:1px solid var(--rule);border-radius:8px;padding:8px;background:var(--white);color:var(--ink);margin-top:6px}
.sb-sum td.big{font-size:18px}
.sb-sum tr.noodds td{color:var(--muted)}
.sb-round{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.sb-ri{background:var(--white);border:1px solid var(--rule);border-left:4px solid var(--royal);border-radius:0 8px 8px 0;padding:9px 12px}
.sb-ri b{font-size:13px;color:var(--deep)}
.sb-ri p{margin:2px 0 0;font-size:13px}
@media (max-width:400px){.sb-t{font-size:20px}.sb-t.long{font-size:18px}.sb-digits i{width:40px;height:52px;font-size:40px}.sb-grid{grid-template-columns:1fr}}
`;

// Runs in the browser. Kept as a real function so it can be checked like normal code; the page embeds its text.
function superbruClient() {
  const root = document.getElementById('sbapp');
  if (!root) return;
  const M = JSON.parse(document.getElementById('data').textContent);
  const S = M.superbru;
  const TZ = 'Europe/London';
  const F = o => new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: TZ }, o));
  const ko = iso => F({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso)) + ', ' + F({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const shortKo = iso => F({ weekday: 'short' }).format(new Date(iso)) + ' ' + F({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pc = p => Math.round(p * 100) + '%';
  const ptsCls = p => 'sb-pts p' + String(p).replace('.', '');
  const SHORT = { 'Man City': 'City', 'Man Utd': 'United', "Nott'm Forest": 'Forest', 'Crystal Palace': 'Palace', 'Coventry City': 'Coventry', 'Ipswich Town': 'Ipswich', 'Hull City': 'Hull', 'Aston Villa': 'Villa', 'Brighton': 'Brighton', 'Newcastle': 'Newcastle' };
  const sh = n => SHORT[n] || n;

  if (!S || S.error || S.none) {
    root.innerHTML = '<header class="hero"><div class="in"><div class="lead">Superbru · Premier League predictor</div><div class="name">Superbru</div><div class="meta">' +
      esc(S && S.error ? 'The Superbru tab could not update this time (' + S.error + '). The other tabs are fine. It will try again within the hour.' : (S && S.message) || 'Nothing to show yet.') + '</div></div></header>';
    return;
  }
  const weeks = S.weeks;
  const oddsLine = m => 'Home ' + m.a.prices.h.toFixed(2) + ' / Draw ' + m.a.prices.d.toFixed(2) + ' / Away ' + m.a.prices.a.toFixed(2) + (m.a.prices.o25 ? ' · Over 2.5 ' + m.a.prices.o25.toFixed(2) : '');

  function hero(w) {
    const title = w.status === 'played' ? 'Results' : w.status === 'next' ? 'Preview' : 'Picks';
    let meta, flag;
    if (w.status === 'played') { meta = w.total + ' points · ' + w.exact + ' exact score' + (w.exact === 1 ? '' : 's') + ' · picks frozen at kick-off'; flag = '<span class="flag done">Round finished</span>'; }
    else if (w.status === 'next') { meta = 'First kick-off ' + ko(w.firstKo) + ' · odds in for ' + w.ready + ' of ' + w.matches.length; flag = '<span class="flag">Picks keep updating until each kick-off</span>'; }
    else {
      meta = (w.firstOpenKo ? 'Next kick-off ' + ko(w.firstOpenKo) : 'All matches have kicked off') + (S.lastPull ? ' · odds pulled ' + ko(S.lastPull.at) : '');
      flag = w.open ? '<span class="flag">' + w.ready + ' of ' + w.matches.length + ' picks ready · next match locks ' + shortKo(w.firstOpenKo) + '</span>' : '<span class="flag done">Picks locked · ' + w.total + ' pts so far</span>';
    }
    return '<header class="hero"><div class="in"><div class="num" aria-hidden="true">' + w.gw + '</div><div class="lead">Superbru · Premier League predictor</div>' +
      '<div class="name">GW' + w.gw + ' ' + title + '</div><div class="meta">' + esc(meta) + '</div>' + flag + '</div></header>';
  }
  const label = w => w.status === 'played' ? 'Played · ' + w.total + ' pts' : w.status === 'current' ? 'This week' : 'Next week';
  function switcher(i) {
    const w = weeks[i];
    return '<div class="sb-wk"><div class="in"><button class="sb-wkb" data-go="' + (i - 1) + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Previous week">◀</button>' +
      '<div class="sb-wkname"><b>GW' + w.gw + '</b><span>' + label(w) + '</span></div>' +
      '<button class="sb-wkb" data-go="' + (i + 1) + '"' + (i === weeks.length - 1 ? ' disabled' : '') + ' aria-label="Next week">▶</button>' +
      '<select class="sb-wksel" aria-label="Jump to week">' + weeks.map((x, j) => '<option value="' + j + '"' + (j === i ? ' selected' : '') + '>GW' + x.gw + ' – ' + label(x) + '</option>').join('') + '</select></div></div>';
  }
  function card(m) {
    const t = n => '<div class="sb-t' + (sh(n).length > 8 ? ' long' : '') + '">' + esc(sh(n)) + '</div>';
    const tags = [];
    if (m.state === 'locked') tags.push('<span class="sb-tag lock">In play · locked</span>');
    if (m.a && m.a.stale && m.state === 'open') tags.push('<span class="sb-tag toss">Stale odds</span>');
    else if (m.a) tags.push('<span class="sb-tag ' + m.conf[0] + '">' + m.conf[1] + '</span>');
    else tags.push('<span class="sb-tag none">' + (m.noPick && m.noPick.kind === 'notyet' ? 'No odds yet' : 'No odds') + '</span>');
    if (m.prev) tags.push('<span class="sb-tag chg">Changed, was ' + esc(m.prev) + '</span>');
    const head = '<div class="sb-when"><span>' + ko(m.kickoff) + '</span><span>' + tags.join('') + '</span></div>';
    const res = m.res ? '<div class="sb-res"><span>Result <b>' + m.res.join('-') + '</b></span>' + (m.pts != null ? '<span class="' + ptsCls(m.pts) + '">' + m.pts + ' pts</span>' : '<span>no pick</span>') + '</div>' : '';
    const form = m.story && m.story.length ? '<details><summary>Form</summary>' + m.story.map(s => '<p>' + esc(s) + '</p>').join('') + '</details>' : '';
    if (!m.a) return '<article class="sb-card no">' + head + '<div class="sb-board">' + t(m.home) + '<div class="sb-digits"><i>–</i><b>:</b><i>–</i></div>' + t(m.away) + '</div>' +
      '<p class="sb-note">' + (m.noPick && m.noPick.kind === 'notyet' ? esc(m.noPick.reason) + ' The pick appears when they do.' : '<b>No odds – no pick.</b> ' + esc(m.noPick ? m.noPick.reason : '')) + '</p>' + res + form + '</article>';
    const a = m.a;
    return '<article class="sb-card' + (a.stale && m.state === 'open' ? ' stale' : '') + '">' + head +
      '<div class="sb-board">' + t(m.home) + '<div class="sb-digits"><i>' + a.pick[0] + '</i><b>:</b><i>' + a.pick[1] + '</i></div>' + t(m.away) + '</div>' +
      '<div class="sb-bar" title="Home / draw / away chance"><span class="h" style="width:' + a.pH * 100 + '%">' + pc(a.pH) + '</span><span class="d" style="width:' + a.pD * 100 + '%">' + pc(a.pD) + '</span><span class="a" style="width:' + a.pA * 100 + '%">' + pc(a.pA) + '</span></div>' +
      '<div class="sb-nums"><span>Exact <strong>' + pc(a.pickP) + '</strong></span><span>Avg <strong>' + a.pickEv.toFixed(2) + ' pts</strong></span><span>Goals <strong>' + a.tg.toFixed(1) + '</strong></span></div>' + res +
      '<details><summary>Why ' + a.pick[0] + '-' + a.pick[1] + '</summary>' +
        '<p class="sb-pred"><span class="sb-mk">' + a.pick[0] + '-' + a.pick[1] + '</span><b>Prediction: ' + esc(m.resultName) + ' ' + a.pick[0] + '-' + a.pick[1] + '.</b> ' + esc(m.story[0]) + ' ' + esc(m.tie) + '</p>' +
        (m.story.length > 1 ? '<p>' + esc(m.story.slice(1).join(' ')) + '</p>' : '') +
        '<div class="sb-odds">' + esc(oddsLine(m)) + '</div>' +
        '<p class="sb-src">Exact score ' + pc(a.pickP) + ' · ' + a.books + ' bookmakers · pulled ' + ko(a.pulled) + (a.stale && m.state === 'open' ? ' (more than a day old)' : '') + '</p></details></article>';
  }
  function table(w) {
    const played = w.matches.some(m => m.res);
    return '<div class="tablewrap"><table class="sb-sum"><tr><th class="num">#</th><th>Match</th><th>Odds (H / D / A)</th><th>Pick</th><th>Score</th>' + (played ? '<th>Result</th><th class="num">Pts</th>' : '') + '</tr>' +
      w.matches.map((m, i) => '<tr' + (m.a ? '' : ' class="noodds"') + '><td class="num">' + (i + 1) + '</td><td>' + esc(m.home) + ' v ' + esc(m.away) + '</td><td>' + (m.a ? m.a.prices.h.toFixed(2) + ' / ' + m.a.prices.d.toFixed(2) + ' / ' + m.a.prices.a.toFixed(2) : '–') + '</td>' +
        '<td>' + (m.a ? esc(m.resultName) : m.noPick && m.noPick.kind === 'notyet' ? 'No odds yet' : 'No odds – no pick') + '</td><td class="big">' + (m.pickText || '–') + '</td>' +
        (played ? '<td>' + (m.res ? m.res.join('-') : '') + '</td><td class="num">' + (m.pts != null ? '<span class="' + ptsCls(m.pts) + '">' + m.pts + '</span>' : '') + '</td>' : '') + '</tr>').join('') + '</table></div>';
  }
  function render(i) {
    i = Math.max(0, Math.min(weeks.length - 1, i));
    const w = weeks[i];
    const banners = (S.banner || []).map(b => '<div class="sb-banner ' + b[0] + '">' + esc(b[1]) + '</div>').join('');
    const btns = w.status === 'played' ? '' : '<div class="sb-btns"><button class="copy" data-copy="copy">Copy picks</button><button class="copy" data-copy="claude">Ask Claude for a write-up</button></div>' +
      '<p class="sub" style="margin-top:6px">"Ask Claude" copies this round\'s facts and rules. Paste it into the Claude app: it uses your normal allowance and changes nothing here.</p><div class="sb-copied" hidden><p class="st ok"></p><textarea readonly rows="8"></textarea></div>';
    root.innerHTML = hero(w) + switcher(i) + banners + '<main>' +
      '<section><h2>Matches</h2><p class="sub">The score to enter is on each board. Bar = home / draw / away chance from the bookmakers. Tap "Why" for the prediction, the reasons and the prices. Each match locks at its own kick-off.</p>' +
      '<div class="sb-grid">' + w.matches.map(card).join('') + '</div>' + btns + '</section>' +
      '<section><h2>All ' + w.matches.length + ' at a glance</h2>' + table(w) + '</section>' +
      '<section><h2>Round summary</h2><div class="sb-round">' + w.summary.map(s => '<div class="sb-ri"><b>' + esc(s[0]) + '</b><p>' + esc(s[1]) + '</p></div>').join('') + '</div></section>' +
      '<section><p class="sheetnote">Picks come only from bookmakers\' prices (The Odds API, UK bookmakers). No odds, no pick: nothing is estimated. Each pick is the score with the highest average Superbru points (3 exact, 1.5 close, 1 result) among scores matching the bookmakers\' most likely result.' +
      (S.lastPull ? ' Last odds pull ' + ko(S.lastPull.at) + (S.lastPull.remaining != null ? ', ' + S.lastPull.remaining + ' of 500 free credits left this month.' : '.') : '') + '</p></section></main>';
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { render(Number(b.dataset.go)); scrollTo(0, 0); });
    root.querySelector('.sb-wksel').onchange = e => render(Number(e.target.value));
    root.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
      const text = w[b.dataset.copy];
      const box = root.querySelector('.sb-copied'), st = box.querySelector('.st'), ta = box.querySelector('textarea');
      box.hidden = false; ta.value = text;
      try { await navigator.clipboard.writeText(text); st.textContent = b.dataset.copy === 'copy' ? 'Picks copied. Paste them somewhere handy, or read them off while you enter them on Superbru.' : 'Copied. Open the Claude app, start a new chat and paste it.'; }
      catch (e) { st.textContent = 'Your browser blocked copying. Select the text below and copy it.'; ta.focus(); ta.select(); }
    });
  }
  render(S.currentIdx >= 0 ? S.currentIdx : 0);
}

export const superbruScript = () => '(' + superbruClient.toString() + ')();';
