// The Challenge tab (layout 3: your six on the left, the Reddit post brief and rule check on the right;
// stacked on the phone). Drawn in the browser from M.challenge. Kit room design, same colours as the Draft tab.

export const challengeCss = `
.top a{color:#C9D6EE;text-decoration:none}.top a:hover{color:var(--white)}
.top a.on{color:var(--white);box-shadow:inset 0 -2px var(--gold);padding-bottom:3px}
.chchips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.chchips span{background:rgba(255,255,255,.14);color:var(--white);font-size:12px;font-weight:600;padding:3px 9px;border-radius:3px}
.chtwo{display:grid;gap:0 8px;grid-template-columns:minmax(0,1fr)}
.chtwo>div{min-width:0}
@media (min-width:980px){.chtwo{grid-template-columns:minmax(0,6fr) minmax(0,5fr)}}
.chrow{border-top:1px solid var(--rule)}.chrow:first-child{border-top:0}
.chhead{font:inherit;color:inherit;background:none;border:0;text-align:left;width:100%;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;cursor:pointer}
.chhead:focus-visible{outline:3px solid var(--gold);outline-offset:-3px}
.chpos{font:800 15px/1 "Big Shoulders Display",sans-serif;color:var(--white);background:var(--royal);border-radius:4px;text-align:center;padding:6px 0}
.chpos.gk{background:var(--gold);color:var(--deep)}
.cap{display:inline-block;background:var(--flag);color:#fff;font:800 12px/1 "Big Shoulders Display",sans-serif;padding:3px 5px;border-radius:3px;margin-left:6px;vertical-align:2px}
.chtag{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:10px;white-space:nowrap;margin-left:6px;vertical-align:1px}
.t-safe{background:var(--goodbg);color:var(--good)}.t-differential{background:#E3EAF7;color:var(--royal)}.t-super-sub{background:var(--warnbg);color:var(--warn)}.t-punt{background:var(--badbg);color:var(--bad)}
.chbody{display:none;padding:0 12px 12px 64px;font-size:13px}
.chrow.open .chbody{display:block}
.chwhy{margin:0 0 8px;padding-left:16px}.chwhy li{margin:2px 0}
.chflag{color:var(--bad);font-weight:600;margin:0 0 8px}
.chswap{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px}
.chswap>span{color:var(--muted);font-size:12px}
.chswap button,.chsmall{font:600 12px "Public Sans",sans-serif;border:1.5px solid var(--royal);background:var(--white);color:var(--royal);border-radius:14px;padding:4px 10px;cursor:pointer}
.chtot{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;margin:10px 0 0;font-size:13px;color:var(--muted)}
.chtot strong{font:800 26px/1 "Big Shoulders Display",sans-serif;color:var(--deep)}
.chkeys{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.chkeys h3{font:800 18px/1 "Big Shoulders Display",sans-serif;margin:0;padding:10px 10px 6px;color:var(--deep)}
.chpre{white-space:pre-wrap;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;background:var(--paper);border-radius:8px;padding:10px;margin:8px 0 0;overflow-wrap:anywhere}
.rulebox{background:var(--white);border:1px solid var(--rule);border-left:4px solid var(--gold);border-radius:0 10px 10px 0;padding:12px 14px;font-size:14px}
.rulebox .readas{margin-top:6px;color:var(--muted);font-size:13px}
.chform{display:grid;gap:8px;margin-top:10px}
.chform label{display:grid;gap:3px;font-size:13px;color:var(--muted)}
.chform select,.chform input{font:inherit;font-size:15px;padding:7px 9px;border:1.5px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink)}
.chform .copy{margin:0;justify-self:start}
@media (max-width:420px){.chbody{padding-left:12px}.chhead{grid-template-columns:38px minmax(0,1fr) auto;gap:8px;padding:10px}}
`;

// Runs in the browser. Kept as a real function so it can be checked like normal code; the page embeds its text.
function challengeClient() {
  const root = document.getElementById('chapp');
  if (!root) return;
  const M = JSON.parse(document.getElementById('data').textContent);
  const C = M.challenge;
  const TZ = 'Europe/London';
  const F = o => new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: TZ }, o));
  const when = iso => F({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const day = iso => F({ day: 'numeric', month: 'short' }).format(new Date(iso));
  const dayTime = iso => F({ weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const left = iso => { const ms = Math.max(0, new Date(iso) - Date.now()), h = Math.floor(ms / 36e5); return h >= 24 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : h + 'h ' + Math.floor(ms % 36e5 / 6e4) + 'm'; };
  const POSN = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards' };
  const ORDER = ['GK', 'DEF', 'MID', 'FWD'];

  if (!C || C.error || C.none) {
    root.innerHTML = '<header class="hero"><div class="in"><div class="lead">FPL Challenge</div><div class="name" id="chname">Challenge</div><div class="meta">' +
      esc(C && C.error ? 'The Challenge tab could not update this time (' + C.error + '). The Draft tab is fine. It will try again within the hour.' : (C && C.message) || 'Nothing to show yet.') + '</div></div></header>';
    return;
  }

  // ---------- state: your six can be changed here (swaps and captain), the brief follows
  const byId = {};
  for (const pos of ORDER) for (const p of C.pool[pos] || []) byId[p.id] = p;
  for (const p of C.picks.concat(C.differentials)) byId[p.id] = p;
  let six = C.picks.map(p => p.id);
  let cap = C.captain;
  let openId = null;
  const pk = () => six.map(id => byId[id]).sort((a, b) => ORDER.indexOf(a.pos) - ORDER.indexOf(b.pos) || b.adj - a.adj);
  const total = () => { const l = pk(); const c = byId[cap]; return Math.round((l.reduce((s, p) => s + p.adj, 0) + (c ? c.adj : 0)) * 10) / 10; };
  const shape = () => { const l = pk(); return ORDER.map(pos => l.filter(p => p.pos === pos).length).join('-'); };
  const swapsFor = p => {
    const others = pk().filter(x => x.id !== p.id);
    const club = {}; for (const x of others) club[x.tid] = (club[x.tid] || 0) + 1;
    return (C.pool[p.pos] || []).filter(x => !six.includes(x.id) && (club[x.tid] || 0) < C.rules.teamLimit).slice(0, 5);
  };
  const vs = p => p.fx;  // "FUL (H)": opponent and venue, Nic's style

  // ---------- page skeleton
  const ruleChips = C.rules.text.map(t => '<span>' + esc(t) + '</span>').join('');
  let h = '<header class="hero"><div class="in"><div class="num" aria-hidden="true">' + C.gw + '</div>' +
    '<div class="lead">Gameweek ' + C.gw + ' Challenge</div><div class="name" id="chname">' + esc(C.title) + '</div>' +
    '<div class="meta">' + esc(C.description) + '</div><div class="chchips">' + ruleChips + '</div></div></header>';
  h += '<div class="strip"><div class="in">' +
    (C.firstKickoff ? '<div><small>First kick-off</small><strong>' + left(C.firstKickoff) + '</strong><br><span>' + when(C.firstKickoff) + '</span></div>' : '') +
    (C.finalDeadline ? '<div><small>Final deadline</small><strong>' + day(C.finalDeadline) + '</strong><br><span>' + dayTime(C.finalDeadline) + '</span></div>' : '') +
    '<div><small>Your six</small><strong id="chtotal">' + total() + '</strong><br><span>expected points, captain included</span></div>' +
    '<div><small>Rule</small><strong>' + (C.ruleSource === 'override' ? 'Yours' : C.understood ? 'Read' : 'Check') + '</strong><br><span>' + (C.ruleSource === 'override' ? 'set by you' : C.understood ? 'from the game' : 'not understood') + '</span></div>' +
    '</div></div>';
  if (!C.understood) h += '<div class="notice"><b>FPL Hub couldn\'t read this week\'s rule</b>, so the picks below use normal scoring. Set the rule yourself under "This week\'s rule".</div>';
  if (!C.predictions) h += '<div class="notice">No FPL Form file covers GW' + C.gw + ' yet, so expected points are FPL Hub\'s own estimate. Add the file with <a href="#addpred">Add predictions</a> on the Draft tab.</div>';
  h += '<main><div class="chtwo"><div>' +
    '<section><h2>Your six</h2><p class="sub">The best ' + esc(C.formation || '') + ' for GW' + C.gw + ' by your method, using ' + (C.predictions ? 'FPL Form' : 'estimated') + ' expected points with this week\'s rule applied. Tap a player to see why, swap him, or make him captain. Players lock at their own kick-off, so check the team sheets.</p>' +
    '<div class="list" id="chsix"></div><div class="chtot" id="chtot"></div><button class="copy" id="chcopy">Copy team</button></section>' +
    '<section><h2>Differentials</h2><p class="sub">High ceiling, low ownership or a minutes doubt. Worth a look if you want to be different.</p><div class="list" id="chdiff"></div></section>' +
    '<section><h2>Key numbers</h2><div class="chkeys">' +
      '<div class="tablewrap"><h3>Projected goals</h3><table><tr><th>Team</th><th>Opponent</th><th class="num">Goals</th></tr>' + C.attacks.map(a => '<tr><td>' + esc(a.team) + '</td><td>' + esc(a.vs) + '</td><td class="num big">' + a.goals.toFixed(2) + '</td></tr>').join('') + '</table></div>' +
      '<div class="tablewrap"><h3>Clean-sheet chance</h3><table><tr><th>Team</th><th>Opponent</th><th class="num">Chance</th></tr>' + C.cleanSheets.map(a => '<tr><td>' + esc(a.team) + '</td><td>' + esc(a.vs) + '</td><td class="num big">' + a.cs + '%</td></tr>').join('') + '</table></div>' +
    '</div>' + (C.dilemmas.length ? '<p class="sheetnote">To think about: ' + esc(C.dilemmas.join('. ')) + '.</p>' : '') +
    '<p class="sheetnote">Projections are FPL Hub\'s own, from this season\'s expected goals and results in the official FPL data.</p></section>' +
    '</div><div>' +
    '<section><h2>Reddit post</h2><p class="sub">Claude writes your "FPL Challenged" cheat sheet in your style from this brief. It follows any swaps you make on the left.</p>' +
      '<div class="upl"><ol><li>Tap <b>Copy brief for Claude</b>.</li><li>Open the Claude app (phone or laptop), start a new chat, paste and send.</li><li>Fill in the [my take] gaps, then post it on r/FantasyPL yourself.</li></ol>' +
      '<button class="copy" id="chbrief">Copy brief for Claude</button><div class="st" id="chbst" role="status"></div>' +
      '<details class="setup"><summary>See the brief</summary><div class="chpre" id="chbrieftext"></div></details></div></section>' +
    '<section><h2>This week\'s rule</h2><div class="rulebox"><div><b>The game says:</b> ' + esc(C.description || 'nothing yet') + '</div>' +
      '<div class="readas"><b>FPL Hub reads it as:</b> ' + esc(C.readAs) + (C.ruleSource === 'override' ? ' (your setting)' : '') + '</div>' +
      '<details class="setup"><summary>Wrong? Set the rule yourself</summary><div class="chform" id="chform"></div></details></div></section>' +
    (C.next ? '<section><h2>Next week</h2><div class="rulebox"><b>GW' + C.next.gw + ': ' + esc(C.next.title) + '.</b> ' + esc(C.next.description) + '</div></section>' : '') +
    '</div></div></main>';
  root.innerHTML = h;

  // ---------- your six
  function row(p, inSix) {
    const isCap = inSix && p.id === cap;
    const open = openId === p.id;
    const tag = '<span class="chtag t-' + p.tag + '">' + esc(p.tag) + '</span>';
    let r = '<div class="chrow' + (open ? ' open' : '') + '"><button class="chhead" data-open="' + p.id + '" aria-expanded="' + open + '">' +
      '<span class="chpos' + (p.pos === 'GK' ? ' gk' : '') + '">' + p.pos + '</span>' +
      '<span class="who"><strong>' + esc(p.name) + '</strong>' + (isCap ? '<b class="cap" title="Captain">C</b>' : '') + tag +
      '<span class="s">' + esc(p.team) + ' v ' + esc(vs(p)) + ', starts ' + p.start + '%' + (p.sub >= 20 ? ', off the bench ' + p.sub + '%' : '') + ', in ' + p.own + '% of teams</span></span>' +
      '<span class="xp"><strong>' + p.adj.toFixed(1) + '</strong><span>exp. pts</span></span></button><div class="chbody">' +
      (p.flag ? '<p class="chflag">' + esc(p.flag) + '</p>' : '') +
      '<ul class="chwhy">' + p.why.map(w => '<li>' + esc(w) + '</li>').join('') + (p.boost ? '<li>Rule adds about ' + p.boost.toFixed(1) + ' points</li>' : '') + '</ul>';
    if (inSix) {
      const sw = swapsFor(p);
      r += '<div class="chswap"><span>Swap for:</span>' + (sw.length ? sw.map(x => '<button data-swap="' + p.id + ':' + x.id + '">' + esc(x.name) + ' ' + esc(x.team) + ' ' + x.adj.toFixed(1) + '</button>').join('') : '<span>no one else fits</span>') + '</div>' +
        (isCap ? '' : '<button class="chsmall" data-cap="' + p.id + '">Make captain</button>');
    }
    return r + '</div></div>';
  }
  function draw() {
    document.getElementById('chsix').innerHTML = pk().map(p => row(p, true)).join('');
    document.getElementById('chdiff').innerHTML = C.differentials.length ? C.differentials.filter(p => !six.includes(p.id)).map(p => row(p, false)).join('') : '<p class="sub" style="padding:10px 12px;margin:0">None stand out this week.</p>';
    const alt = C.formations.filter(f => f.name !== shape()).map(f => f.name + ' (' + f.total.toFixed(1) + ')').join(', ');
    const capP = byId[cap];
    document.getElementById('chtot').innerHTML = '<strong>' + total().toFixed(1) + '</strong><span>expected points, ' + shape() + ', captain ' + esc(capP ? capP.name : '') + '</span>' + (alt ? '<span>Other shapes: ' + esc(alt) + '</span>' : '');
    document.getElementById('chtotal').textContent = total().toFixed(1);
    document.getElementById('chbrieftext').textContent = brief();
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const id = Number(b.dataset.open); openId = openId === id ? null : id; draw(); });
    root.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => {
      const [out, inn] = b.dataset.swap.split(':').map(Number);
      six = six.map(id => (id === out ? inn : id));
      if (cap === out) cap = pk().slice().sort((a, b2) => b2.adj - a.adj)[0].id;
      openId = inn; draw();
    });
    root.querySelectorAll('[data-cap]').forEach(b => b.onclick = () => { cap = Number(b.dataset.cap); draw(); });
  }

  // ---------- the brief Claude writes the post from
  function brief() {
    const l = pk();
    const capP = byId[cap];
    const alt = l.filter(p => p.id !== cap).sort((a, b) => b.adj - a.adj)[0];
    const line = p => '- ' + p.name + ' ' + p.team + ', ' + vs(p) + ': rating ' + p.adj.toFixed(1) + '; ' + p.why.join('; ') + (p.flag ? '; ' + p.flag : '') + '; starts ' + p.start + '%' + (p.sub >= 20 ? ', comes off the bench ' + p.sub + '%' : '') + '; in ' + p.own + '% of Challenge teams.';
    const rows = ORDER.map(pos => {
      const ps = l.filter(p => p.pos === pos);
      return ps.length ? ps.map(p => p.name + (p.id === cap ? ' (C)' : '') + ' ' + vs(p)).join(' / ') : null;
    }).filter(Boolean);
    const out = [
      'Write my weekly Reddit post for r/FantasyPL: "FPL Challenged - Gameweek ' + C.gw + ' Cheat Sheet".',
      '',
      'HOW I WRITE THESE',
      '- My voice: chatty, first person, opinionated but honest about doubt ("I\'m leaning towards...", "might change before the deadline"), the odd dry joke. UK spelling. 700 to 1,000 words.',
      '- Short plain headings, bullets for the rules and candidate lists, no tables.',
      '- Every player name is followed by his opponent and venue, e.g. "Haaland COV (H)".',
      '- Sections, in this order:',
      '  1. Hello, plus one or two lines looking back at last week (write [my look-back] - I\'ll fill it in).',
      '  2. Rank line: "26/27 season rank: [my rank] | 25/26 end rank: ' + C.info.lastSeasonRank + ' | League code: ' + C.info.leagueCode + '"',
      '  3. Rules for the Gameweek - "' + C.title + '", as bullets, then one "In simple terms..." sentence.',
      '  4. Initial thoughts: the best fixtures, the projected team goals and the one dilemma of the week.',
      '  5. Key formation: two or three shapes written keeper first (e.g. 1-1-3-1), tied to the rule.',
      '  6. Goalkeepers, 7. Defenders, 8. Midfielders, 9. Forwards (midfielders and forwards can share a section): 3 to 6 names each, one line of reasoning per name.',
      '  10. Differentials: 2 to 5 punts, often "if he starts".',
      '  11. Captain pick: one lean plus an alternative.',
      '  12. Meta team, in formation rows with the keeper on top, (C) for the captain and "/" between players on the same row.',
      '  13. Summary: 3 to 5 sentences repeating the plan, ending "Good luck!"',
      '- Remind readers to check the team sheets: players lock at their own kick-off.',
      '- Use only the facts below. Don\'t invent injuries, quotes, form or stats. Where my own take is needed (eye test, manager quotes, jokes), write [my take: ...] for me to fill in.',
      '- Never quote the "rating" numbers: they come from FPL Form, which I\'m not allowed to republish. Say "highest expected points" or rank players instead. Projected goals, clean-sheet %, xGI and defensive contribution counts are fine to quote.',
      '',
      'THIS WEEK\'S FACTS (Gameweek ' + C.gw + ')',
      'Challenge: ' + C.title + ' - ' + C.description,
      'Squad: ' + C.rules.text.join('; ') + '; ' + C.rules.shape + '.',
      C.simple,
      (C.firstKickoff ? 'First kick-off: ' + when(C.firstKickoff) + '. ' : '') + (C.finalDeadline ? 'Final deadline: ' + when(C.finalDeadline) + '. ' : '') + 'Players lock at their own kick-off.',
      'Projected goals (best attacks): ' + C.attacks.map(a => a.team + ' ' + a.goals.toFixed(2) + ' v ' + a.vs).join('; ') + '.',
      'Clean-sheet chance (best defences): ' + C.cleanSheets.map(a => a.team + ' ' + a.cs + '% v ' + a.vs).join('; ') + '.',
      C.dilemmas.length ? 'Fixture to think about: ' + C.dilemmas.join('; ') + '.' : null,
      'Best shapes: ' + C.formations.map(f => f.name).join(', ') + '.',
      '',
      'CANDIDATES (best first; rating = expected points with this week\'s rule - never quote it)',
      ...ORDER.flatMap(pos => [POSN[pos].toUpperCase(), ...(C.pool[pos] || []).slice(0, 6).map(line)]),
      '',
      'DIFFERENTIALS',
      ...(C.differentials.length ? C.differentials.map(line) : ['- None stand out.']),
      '',
      'MY META TEAM (' + shape() + ')',
      ...rows,
      'Captain: ' + (capP ? capP.name + ' ' + vs(capP) : '') + (alt ? '. Alternative: ' + alt.name + ' ' + vs(alt) : '') + '.',
      C.next ? '\nNext week\'s challenge, for a one-line teaser at the end: GW' + C.next.gw + ' ' + C.next.title + ' - ' + C.next.description : null,
    ];
    return out.filter(x => x != null).join('\n');
  }

  async function copyText(btn, text, okText, status) {
    try { await navigator.clipboard.writeText(text); btn.textContent = okText; if (status) status.textContent = ''; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'width:100%;height:120px;font-size:12px;margin-top:8px';
      btn.insertAdjacentElement('afterend', ta); ta.focus(); ta.select();
      btn.textContent = 'Copy failed: select the text below and copy it';
    }
  }
  document.getElementById('chbrief').onclick = e => copyText(e.target, brief(), 'Brief copied. Now paste it into Claude', document.getElementById('chbst'));
  document.getElementById('chcopy').onclick = e => copyText(e.target, 'GW' + C.gw + ' ' + C.title + ' - my six\n' + pk().map(p => p.pos + ' ' + p.name + (p.id === cap ? ' (C)' : '') + ' ' + p.team + ' v ' + vs(p)).join('\n'), 'Team copied');

  // ---------- set the rule yourself (saved to GitHub with the phone key from "Add predictions")
  const STATS = [['dribbles', 'Successful dribbles'], ['tackled', 'Times tackled'], ['outside_box_shots_on_target', 'Shots on target from outside the box'], ['outside_box_goals', 'Goals from outside the box'], ['winning_goals', 'Winning goals'], ['key_passes', 'Key passes'], ['big_chances_created', 'Big chances created'], ['shots_on_target', 'Shots on target'], ['successful_tackles', 'Successful tackles'], ['interceptions', 'Interceptions'], ['recoveries', 'Recoveries'], ['total_headed_attempts', 'Headed attempts'], ['fouls_won', 'Fouls won']];
  const form = document.getElementById('chform');
  form.innerHTML = '<label>Type of rule<select id="rt"><option value="game">Use the game\'s wording (normal)</option><option value="group">A group of players scores extra</option><option value="points">One kind of points is worth more</option><option value="action">Points for each action</option><option value="normal">No special rule</option></select></label>' +
    '<div id="rf"></div><button class="copy" id="rsave">Save rule</button><div class="st" id="rst" role="status"></div>' +
    '<p class="sheetnote">Saving uses the GitHub phone key from "Add predictions" on the Draft tab. The site updates about 2 minutes later. The rule only applies to GW' + C.gw + '.</p>';
  const sel = (id, opts) => '<select id="' + id + '">' + opts.map(o => '<option value="' + o[0] + '">' + esc(o[1]) + '</option>').join('') + '</select>';
  const multSel = sel('rmult', [['2', 'Double'], ['3', 'Triple'], ['4', 'Four times']]);
  function fields() {
    const t = document.getElementById('rt').value;
    const f = document.getElementById('rf');
    if (t === 'group') f.innerHTML = '<label>Who' + sel('rwho', [['sub', 'Players who come off the bench'], ['new', 'Summer signings'], ['teams', 'Players from certain clubs'], ['away', 'Players playing away'], ['home', 'Players playing at home'], ['age', 'Players aged ... or under'], ['service', 'Players at their club ... or more years'], ['pos', 'One position']]) + '</label>' +
      '<label>How much' + multSel + '</label><label>Clubs (short names, e.g. MUN, MCI), age, years or position (GK, DEF, MID, FWD)<input id="rextra" autocomplete="off"></label>';
    else if (t === 'points') f.innerHTML = '<label>Which points' + sel('rwhich', [['ga', 'Goals and assists'], ['goals', 'Goals'], ['assists', 'Assists'], ['cs', 'Clean sheets'], ['saves', 'Saves'], ['bonus', 'Bonus points'], ['defcon', 'Defensive contributions (type the points each is worth)']]) + '</label><label>Times (or points for defensive contributions)<input id="rval" inputmode="decimal" value="2"></label>';
    else if (t === 'action') f.innerHTML = '<label>Action' + sel('rstat', STATS) + '</label><label>Points each (use a minus for a penalty)<input id="rper" inputmode="decimal" value="1"></label>' +
      '<label>Optional one-off bonus points<input id="rbonus" inputmode="decimal"></label><label>... for this many or more<input id="rat" inputmode="numeric"></label>';
    else f.innerHTML = '';
  }
  document.getElementById('rt').onchange = fields;
  fields();
  function recipe() {
    const t = document.getElementById('rt').value;
    const num = id => { const v = Number(String((document.getElementById(id) || {}).value || '').replace(',', '.')); return Number.isFinite(v) ? v : NaN; };
    if (t === 'game') return { clear: true };
    if (t === 'normal') return { recipe: {} };
    if (t === 'group') {
      const who = document.getElementById('rwho').value, mult = Number(document.getElementById('rmult').value), extra = document.getElementById('rextra').value.trim();
      const g = { type: who, mult };
      if (who === 'age') { g.maxAge = Number(extra); if (!g.maxAge) return { error: 'Type the age, e.g. 23.' }; }
      if (who === 'service') { g.years = Number(extra); if (!g.years) return { error: 'Type the number of years, e.g. 5.' }; }
      if (who === 'pos') { const map = { GK: 1, DEF: 2, MID: 3, FWD: 4 }; g.pos = extra.toUpperCase().split(/[ ,]+/).map(x => map[x]).filter(Boolean); if (!g.pos.length) return { error: 'Type a position: GK, DEF, MID or FWD.' }; }
      if (who === 'teams') {
        const ids = extra.toUpperCase().split(/[ ,]+/).filter(Boolean).map(s => C.teamIds[s]);
        if (!ids.length || ids.some(x => !x)) return { error: 'Use club short names like MUN, MCI, separated by commas.' };
        g.teams = ids;
      }
      return { recipe: { group: g } };
    }
    if (t === 'points') {
      const which = document.getElementById('rwhich').value, v = num('rval');
      if (!(v > 0)) return { error: 'Type a number, e.g. 2.' };
      if (which === 'defcon') return { recipe: { defconPts: v } };
      return { recipe: { points: which === 'ga' ? { goals: v, assists: v } : { [which]: v } } };
    }
    const stat = document.getElementById('rstat').value, per = num('rper'), bonus = num('rbonus'), at = num('rat');
    if (!Number.isFinite(per)) return { error: 'Type the points for each action, e.g. 3.' };
    const r = { actions: [{ stat, per }], thresholds: [] };
    if (bonus > 0 && at > 0) r.thresholds.push({ stat, atLeast: at, bonus });
    return { recipe: r };
  }
  const REPO = 'nicrubes/fpl-hub';
  const b64 = str => { const bytes = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };
  async function gh(token, method, path, body) {
    const r = await fetch('https://api.github.com/repos/' + REPO + path, { method, cache: 'no-store', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 404 && method === 'GET') return null;
    if (!r.ok) { const e = new Error('GitHub said ' + r.status); e.status = r.status; throw e; }
    return r.status === 204 ? {} : r.json();
  }
  let busy = false;
  document.getElementById('rsave').onclick = async () => {
    const say = (m, cls) => { const s = document.getElementById('rst'); s.textContent = m; s.className = 'st ' + (cls || ''); };
    if (busy) return;
    const r = recipe();
    if (r.error) return say(r.error, 'bad');
    let token = null; try { token = localStorage.getItem('fplhub-gh'); } catch (e) {}
    if (!token) return say('Add your GitHub phone key first: Draft tab, "Add predictions".', 'bad');
    busy = true;
    try {
      say('Saving…');
      const path = '/contents/data/challenge-rule.json';
      const body = JSON.stringify(r.clear ? { gw: null, clearedAt: new Date().toISOString() } : { gw: C.gw, recipe: r.recipe, savedAt: new Date().toISOString() }, null, 1);
      const existing = await gh(token, 'GET', path);
      await gh(token, 'PUT', path, { message: 'Set Challenge rule for GW' + C.gw + ' (from the site)', content: b64(body), sha: existing ? existing.sha : undefined });
      try { await gh(token, 'POST', '/actions/workflows/hourly.yml/dispatches', { ref: 'main' }); } catch (e) {}
      say('Saved. Reload this page in about 2 minutes.', 'ok');
    } catch (e) {
      say(e.status === 401 ? 'GitHub didn\'t accept the key. It may have expired: replace it in "Add predictions".' : 'Saving failed (' + (e.message || 'unknown problem') + '). Try again.', 'bad');
    } finally { busy = false; }
  };

  // fit the challenge name on one line, like the Draft shirt name
  function fitName() {
    const el = document.getElementById('chname'); if (!el || !el.parentElement.clientWidth) return;
    const cs = getComputedStyle(el.parentElement);
    const max = el.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
    el.style.fontSize = '96px';
    if (el.scrollWidth > max) el.style.fontSize = Math.max(34, Math.floor(96 * max / el.scrollWidth)) + 'px';
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitName);
  addEventListener('resize', fitName);
  draw();
}

export const challengeScript = () => '(' + challengeClient.toString() + ')();';
