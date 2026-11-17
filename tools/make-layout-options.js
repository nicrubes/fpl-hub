// Preview only: two layout options for the team sheet + waiver plan area, side by side.
import fs from 'node:fs';
const base = fs.readFileSync('preview/site.html', 'utf8');
const inject = (css, js) => base.replace('</body>', `<style>${css}</style><script>${js}</script></body>`);

// A: stacked – team sheet on top (pitch kept to a sensible width), waiver plan full width below.
const stacked = inject(
  `@media (min-width:980px){.two{grid-template-columns:minmax(0,1fr)!important}.two>section:first-child .pitch,.two>section:first-child .bench{max-width:720px}}`,
  `scrollTo(0,0)`);

// B: filled – team sheet + waiver order in the left column, which stays in view while you scroll the plan.
const filled = inject(
  `@media (min-width:980px){.leftcol{position:sticky;top:12px;align-self:start}}`,
  `const two=document.querySelector('.two');const left=two.children[0];const order=[...document.querySelectorAll('main > section')].find(s=>s.querySelector('h2')&&s.querySelector('h2').textContent==='Waiver order');const wrap=document.createElement('div');wrap.className='leftcol';two.insertBefore(wrap,left);wrap.appendChild(left);wrap.appendChild(order);`);

fs.mkdirSync('preview/layout', { recursive: true });
fs.writeFileSync('preview/layout/a-stacked.html', stacked);
fs.writeFileSync('preview/layout/b-filled.html', filled);
fs.writeFileSync('preview/layout/compare.html', `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Layout options</title>
<style>body{margin:0;background:#E9EBEE;font:14px/1.4 system-ui,sans-serif;color:#1d1d1b}.wrap{display:flex;gap:20px;padding:16px;align-items:flex-start}
figure{margin:0}figcaption{margin:0 0 6px;max-width:560px}.frame{width:576px;height:1080px;overflow:hidden;border-radius:10px;box-shadow:0 0 0 1px #c9ccd1;background:#fff}
iframe{width:1440px;height:2700px;border:0;transform:scale(.4);transform-origin:0 0}</style></head><body><div class="wrap">
<figure><figcaption><b>A. Stacked</b><br>Team sheet on top, waiver plan full width underneath. No gap, but more scrolling.</figcaption><div class="frame"><iframe src="a-stacked.html" title="Option A"></iframe></div></figure>
<figure><figcaption><b>B. Filled</b><br>Team sheet and waiver order on the left, staying in view while you scroll the plan on the right.</figcaption><div class="frame"><iframe src="b-filled.html" title="Option B"></iframe></div></figure>
</div></body></html>`);
console.log('Layout options written to preview/layout');
