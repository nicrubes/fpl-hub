// Phone waiver button: a bookmark ("bookmarklet") that runs on the FPL Draft Transactions page in
// Safari on the phone, using Nic's own signed-in session. It enters the FPL Hub waiver plan the same
// way Waiver Assist does (Sign, then Replace), and refuses to save anything outside the waiver window.
// The plan comes from FPL Hub's "Copy plan for FPL" button, pasted when the bookmark asks.
//
// fplHubWaivers is never called here: its source text is turned into the bookmark code.
// Test hooks: set window.__fplHubPlan (the copied text) to skip the paste box, and
// window.__fplHubDryRun = true to check everything without saving or cancelling anything.

async function fplHubWaivers() {
  const MARGIN = 10 * 60 * 1000; // stop 10 minutes before waivers close
  if (location.hostname !== 'draft.premierleague.com') {
    alert('Open the FPL Draft website (draft.premierleague.com) in this browser first, then tap the waiver button again.');
    return;
  }
  if (!/\/team\/transactions/.test(location.pathname)) {
    alert('Taking you to the Transactions page. When it has loaded, tap the waiver button again.');
    location.href = 'https://draft.premierleague.com/team/transactions';
    return;
  }
  if (window.__fplHubBusy) return;
  window.__fplHubBusy = true;
  const dry = !!window.__fplHubDryRun;
  let busy = true, stopped = false;

  // ----- progress panel at the bottom of the screen
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;max-height:55vh;overflow:auto;z-index:2147483647;background:#071F4D;color:#fff;font:14px/1.45 -apple-system,system-ui,sans-serif;padding:12px 14px;border-radius:10px;border-top:5px solid #D9A21B;text-align:left';
  box.innerHTML = '<button type="button" style="float:right;font:inherit;background:#fff;color:#071F4D;border:0;border-radius:6px;padding:4px 10px">Stop</button><b>FPL Hub waivers' + (dry ? ' (test, nothing saved)' : '') + '</b><div></div>';
  const btn = box.querySelector('button'), logEl = box.querySelector('div');
  btn.onclick = () => { if (busy) { stopped = true; say('Stopping after this claim…', '#FAC775'); } else box.remove(); };
  document.body.appendChild(box);
  const say = (t, colour) => { const p = document.createElement('div'); p.textContent = t; if (colour) p.style.color = colour; logEl.appendChild(p); box.scrollTop = box.scrollHeight; };
  const finish = () => { busy = false; window.__fplHubBusy = false; btn.textContent = 'Close'; };

  // ----- helpers (same approach as Waiver Assist)
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const api = async p => { const r = await fetch('/api/' + p, { cache: 'no-store', credentials: 'include' }); if (!r.ok) throw new Error('FPL said ' + r.status + ' for ' + p); return r.json(); };
  const uk = iso => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const norm = s => ' ' + s.replace(/\s+/g, ' ').trim() + ' ';
  let event = null;
  async function guard() {
    const b = await api('bootstrap-static');
    const ev = b.events.data.find(e => e.id === b.events.next);
    event = ev;
    if (!ev || Date.now() >= new Date(ev.waivers_time).getTime() - MARGIN) { const e = new Error('closed'); e.closed = true; throw e; }
    return ev.id;
  }
  let entry = null;
  const pending = async () => (await api('draft/entry/' + entry + '/transactions')).waivers.filter(w => w.result === 'p').sort((a, b) => a.priority - b.priority);
  // Find a button by its label whose row (smallest surrounding block) contains every needle.
  function findRow(label, needles) {
    let best = null;
    for (const b of document.querySelectorAll('button')) {
      if (b.innerText.trim() !== label) continue;
      let el = b;
      for (let i = 0; i < 8 && el; i++) {
        el = el.parentElement;
        if (!el) break;
        const t = norm(el.innerText || '');
        if (needles.every(n => t.includes(n))) { if (!best || t.length < best.len) best = { btn: b, len: t.length }; break; }
      }
    }
    return best && best.btn;
  }
  function setInput(el, v) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function view(name) {
    const link = [...document.querySelectorAll('a')].find(a => a.innerText.trim().startsWith(name));
    if (link) { link.click(); await sleep(900); }
  }
  const pos = c => (c.outPos === 'GK' ? 'GKP' : c.outPos);
  async function sign(c) {
    await guard();
    await view('All players');
    const term = c.in.split(/[ .]+/).filter(Boolean).sort((a, b) => b.length - a.length)[0];
    const s = document.getElementById('search') || document.querySelector('input[type=search],input[placeholder*="earch"]');
    if (!s) throw new Error('Search box not found on the page');
    setInput(s, term);
    let b = null;
    for (let i = 0; i < 8 && !b; i++) { await sleep(500); b = findRow('Sign', [' ' + c.in + ' ', c.inTeam + pos(c)]); }
    if (!b) { const e = new Error(c.in + ' is not available (owned, locked or name differs)'); e.skip = true; throw e; }
    if (!dry) { b.click(); await sleep(1300); }
  }
  async function replace(c) {
    await guard();
    const before = (await pending()).length;
    const b = findRow('Replace', [' ' + c.out + ' ']);
    if (!b) throw new Error('No Replace button for ' + c.out);
    b.click();
    for (let i = 0; i < 12; i++) {
      await sleep(700);
      const p = await pending();
      if (p.length > before) { const last = p[p.length - 1]; if (last.element_in !== c.inId || last.element_out !== c.outId) throw new Error('Claim saved but players do not match. Check Proposed.'); return; }
    }
    throw new Error('Claim did not appear in your pending list');
  }
  async function cancelAll() {
    let left = await pending();
    for (let i = 0; left.length && i < 60; i++) {
      await guard();
      await view('Proposed');
      const b = findRow('Cancel', []);
      if (!b) break;
      b.click();
      await sleep(1000);
      left = await pending();
    }
    return left.length;
  }
  const same = (p, claims) => p.length === claims.length && claims.every((c, i) => p[i].element_in === c.inId && p[i].element_out === c.outId);

  try {
    // 1. Signed in?
    const d = await api('bootstrap-dynamic');
    if (!(d.player && d.player.id)) { say('You are not signed in to FPL Draft in this browser. Sign in, then tap the button again.', '#F09595'); return finish(); }
    // 2. Waiver window open?
    let gw;
    try { gw = await guard(); } catch (e) {
      if (!e.closed) throw e;
      say('Waivers are closed, so nothing was changed.', '#F09595');
      if (event) say('Waivers closed ' + uk(event.waivers_time) + '. Gameweek deadline ' + uk(event.deadline_time) + '. Free agency moves are instant, so this button never makes them.');
      return finish();
    }
    // 3. The plan
    const raw = window.__fplHubPlan || prompt('Paste your FPL Hub plan.\n\n(On FPL Hub, tap "Copy plan for FPL" first.)') || '';
    const m = raw.trim().match(/^FPLHUB-PLAN (\{[\s\S]*\})$/);
    if (!m) { say('That isn\'t an FPL Hub plan. On FPL Hub, tap "Copy plan for FPL", then tap this button again.', '#F09595'); return finish(); }
    const plan = JSON.parse(m[1]);
    entry = plan.entry;
    if (plan.gw !== gw) { say('That plan is for GW' + plan.gw + ', but waivers are open for GW' + gw + '. Copy a fresh plan from FPL Hub.', '#F09595'); return finish(); }
    const claims = plan.claims;
    say('GW' + gw + ': ' + claims.length + ' claims in the plan. Waivers close ' + uk(event.waivers_time) + '. Keep this screen on.');
    // 4. Compare with what is already saved
    const saved = await pending();
    if (same(saved, claims)) { say('Already up to date: all ' + claims.length + ' claims are saved in the right order.', '#97C459'); return finish(); }
    if (saved.length) {
      if (dry) say('You have ' + saved.length + ' saved claims that differ from the plan. A real run would ask before cancelling them.');
      else {
        const ok = confirm('You have ' + saved.length + ' waiver claims saved that don\'t match the FPL Hub plan.\n\nOK = cancel them and enter the plan.\nCancel = leave everything as it is.');
        if (!ok) { say('Left your saved claims as they are. Nothing changed.'); return finish(); }
        say('Cancelling ' + saved.length + ' old claims…');
        const left = await cancelAll();
        if (left) { say(left + ' old claims could not be cancelled. Stopped. Check Proposed.', '#F09595'); return finish(); }
      }
    }
    // 5. Enter the claims in order
    let done = 0, skipped = 0;
    for (const c of claims) {
      if (stopped) { say('Stopped. ' + done + ' claims saved.', '#FAC775'); break; }
      try {
        await sign(c);
        if (dry) { say(c.n + '. ' + c.out + ' out, ' + c.in + ' in: found'); done++; continue; }
        await replace(c);
        done++;
        say(c.n + '. ' + c.out + ' out, ' + c.in + ' in: saved');
      } catch (e) {
        if (e.closed) { say('Waivers are closing, so I stopped. ' + done + ' claims saved.', '#F09595'); break; }
        if (e.skip) { skipped++; say(c.n + '. Skipped: ' + e.message, '#FAC775'); continue; }
        say(c.n + '. Stopped: ' + e.message, '#F09595'); break;
      }
    }
    if (dry) { const s = document.getElementById('search'); if (s) setInput(s, ''); say('Test finished: ' + done + ' found, ' + skipped + ' not available. Nothing was saved.', '#97C459'); return finish(); }
    // 6. Check
    const after = await pending();
    say('Done: ' + after.length + ' claims saved' + (skipped ? ', ' + skipped + ' skipped' : '') + '. Check them under Proposed. You can still change anything until ' + uk(event.waivers_time) + '.', '#97C459');
  } catch (e) {
    say('Something went wrong: ' + e.message + '. Nothing else was changed.', '#F09595');
  }
  finish();
}

// The bookmark code: "javascript:" plus the function, run straight away.
export function waiverBookmarklet() {
  return 'javascript:' + encodeURIComponent('(' + fplHubWaivers.toString() + ')();void 0');
}

// The same code without the "javascript:" wrapper, for testing in a browser console.
export function waiverScript() {
  return '(' + fplHubWaivers.toString() + ')()';
}
