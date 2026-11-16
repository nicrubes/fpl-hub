// Waiver Assist – browser helpers. Paste into the FPL Draft transactions page
// (https://draft.premierleague.com/team/transactions) with the javascript tool.
// Every action that saves anything checks the waiver window first and stops if it is closed.
window.__wa = {
  ENTRY: 208225,
  MARGIN_MS: 10 * 60 * 1000, // stop 10 minutes before waivers close
  sleep: ms => new Promise(r => setTimeout(r, ms)),

  // Throws (and so stops everything) unless we are safely inside the waiver window.
  async guard() {
    const b = await (await fetch('/api/bootstrap-static', { cache: 'no-store' })).json();
    const ev = b.events.data.find(e => e.id === b.events.next);
    if (!ev || Date.now() >= new Date(ev.waivers_time).getTime() - this.MARGIN_MS) {
      throw new Error('WAIVER WINDOW CLOSED - STOPPING, NOTHING SAVED');
    }
    return ev.id;
  },
  async signedIn() {
    const d = await (await fetch('/api/bootstrap-dynamic', { cache: 'no-store' })).json();
    return !!(d.player && d.player.id);
  },
  async pending() {
    const d = await (await fetch(`/api/draft/entry/${this.ENTRY}/transactions`, { cache: 'no-store' })).json();
    return d.waivers.filter(w => w.result === 'p').sort((a, b) => a.priority - b.priority);
  },
  rowWith(btnText, test) {
    return [...document.querySelectorAll('tr')].find(tr =>
      [...tr.querySelectorAll('button')].some(x => x.innerText.trim() === btnText) && test(tr.innerText.replace(/\s+/g, ' ')));
  },
  click(tr, btnText) { [...tr.querySelectorAll('button')].find(x => x.innerText.trim() === btnText).click(); },
  setInput(el, v) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  },
  async view(name) { // 'All players' or 'Proposed'
    const link = [...document.querySelectorAll('a')].find(a => a.innerText.trim().startsWith(name));
    if (link) { link.click(); await this.sleep(900); }
  },

  // Step 1 of a claim: find the incoming player and press Sign.
  async sign(inName, team, pos) {
    await this.guard();
    await this.view('All players');
    const term = inName.split(/[ .]+/).filter(Boolean).sort((a, b) => b.length - a.length)[0];
    const s = document.getElementById('search');
    if (!s) throw new Error('Search box not found');
    this.setInput(s, term);
    let row;
    for (let i = 0; i < 8 && !row; i++) { await this.sleep(500); row = this.rowWith('Sign', t => t.includes(inName) && t.includes(team + pos)); }
    if (!row) throw new Error(`No Sign button for ${inName} (${team} ${pos}) - owned, locked or name differs`);
    this.click(row, 'Sign');
    await this.sleep(1300);
  },
  // Step 2: choose who goes out. FPL saves the claim at this click, so guard again.
  async replace(outName, inId, outId) {
    await this.guard();
    const before = (await this.pending()).length;
    const row = this.rowWith('Replace', t => t.includes(outName + ' '));
    if (!row) throw new Error('No Replace button for ' + outName);
    this.click(row, 'Replace');
    for (let i = 0; i < 10; i++) {
      await this.sleep(700);
      const p = await this.pending();
      if (p.length > before) {
        const last = p[p.length - 1];
        return { ok: last.element_in === inId && last.element_out === outId, priority: last.priority, count: p.length };
      }
    }
    throw new Error('Claim did not appear in the pending list');
  },
  // One full claim from the plan JSON (tools/waiver-plan.js).
  async claim(c) {
    const pos = c.outPos === 'GK' ? 'GKP' : c.outPos;
    await this.sign(c.in, c.inTeam, pos);
    return Object.assign({ n: c.n, move: `${c.out} -> ${c.in}` }, await this.replace(c.out, c.inId, c.outId));
  },
  async run(claims) {
    const results = [];
    for (const c of claims) {
      try { results.push(await this.claim(c)); } catch (e) { results.push({ n: c.n, error: e.message }); break; }
    }
    return results;
  },
  // Cancel one pending claim by player names (Proposed view).
  async cancel(outName, inName) {
    await this.guard();
    await this.view('Proposed');
    const before = (await this.pending()).length;
    const row = this.rowWith('Cancel', t => t.includes(inName) && t.includes(outName));
    if (!row) throw new Error(`No pending claim ${outName} -> ${inName}`);
    this.click(row, 'Cancel');
    for (let i = 0; i < 10; i++) { await this.sleep(700); if ((await this.pending()).length < before) return true; }
    throw new Error('Cancel did not go through');
  },
  async cancelAll() {
    await this.guard();
    let left = await this.pending();
    for (let guardLoop = 0; left.length && guardLoop < 60; guardLoop++) {
      await this.view('Proposed');
      const row = this.rowWith('Cancel', () => true);
      if (!row) break;
      this.click(row, 'Cancel');
      await this.sleep(1000);
      left = await this.pending();
    }
    return left.length;
  },
  // Compare what's saved on FPL with the plan (in order).
  async compare(claims) {
    const p = await this.pending();
    const mismatches = [];
    for (let i = 0; i < Math.max(p.length, claims.length); i++) {
      const w = p[i], c = claims[i];
      if (!w || !c || w.element_in !== c.inId || w.element_out !== c.outId) mismatches.push({ position: i + 1, saved: w ? [w.element_out, w.element_in] : null, plan: c ? [c.outId, c.inId] : null });
    }
    return { saved: p.length, planned: claims.length, matches: mismatches.length === 0, mismatches };
  },
};
'Waiver Assist helpers loaded';
