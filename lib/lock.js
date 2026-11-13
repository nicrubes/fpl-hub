// Locks the website with a passcode. The published file is scrambled (AES-256)
// and can only be unscrambled in the browser by someone who knows the passcode.
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 600000;
const b64 = buf => Buffer.from(buf).toString('base64');

export async function lockPage(innerHtml, passcode) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(innerHtml));
  const payload = JSON.stringify({ s: b64(salt), i: b64(iv), c: b64(cipher), n: ITERATIONS });

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>FPL Hub</title>
<style>
:root{--bg:#f6f6f3;--card:#fff;--text:#1d1d1b;--muted:#6b6a65;--line:#e4e2db;--accent:#37003c;--bad:#a32d2d}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1e1e1c;--text:#ecebe6;--muted:#a3a29b;--line:#34332f;--accent:#e3b7e8;--bad:#f09595}}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px}
form{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px;width:100%;max-width:320px}
h1{font-size:20px;margin:0 0 4px}p{color:var(--muted);font-size:13px;margin:0 0 16px}
input[type=password]{width:100%;box-sizing:border-box;font:inherit;font-size:18px;letter-spacing:4px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text)}
button{margin-top:12px;width:100%;font:inherit;padding:10px;border:0;border-radius:8px;background:var(--accent);color:var(--card);cursor:pointer}
label{display:block;margin-top:10px;font-size:13px;color:var(--muted)}
.err{color:var(--bad);font-size:13px;min-height:18px;margin-top:8px}
</style>
</head>
<body>
<form id="f">
<h1>FPL Hub</h1>
<p>Enter the passcode to open.</p>
<input type="password" id="pw" inputmode="numeric" autocomplete="current-password" autofocus>
<label><input type="checkbox" id="rem" checked> Remember on this device</label>
<button type="submit">Open</button>
<div class="err" id="err"></div>
</form>
<script>
const P = ${payload};
const ub = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function unlock(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: ub(P.s), iterations: P.n, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub(P.i) }, key, ub(P.c));
  return new TextDecoder().decode(plain);
}
function show(html) { document.open(); document.write(html); document.close(); }
let saved = null;
try { saved = localStorage.getItem('fplhub-pass'); } catch (e) {}
if (saved) unlock(saved).then(show).catch(() => { try { localStorage.removeItem('fplhub-pass'); } catch (e) {} });
document.getElementById('f').onsubmit = async e => {
  e.preventDefault();
  const pw = document.getElementById('pw').value;
  document.getElementById('err').textContent = 'Unlocking…';
  try {
    const html = await unlock(pw);
    try { if (document.getElementById('rem').checked) localStorage.setItem('fplhub-pass', pw); } catch (e) {}
    show(html);
  } catch (err) {
    document.getElementById('err').textContent = 'Wrong passcode. Try again.';
  }
};
</script>
</body>
</html>`;
}
