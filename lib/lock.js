// Locks the website with a passcode. The published file is scrambled (AES-256)
// and can only be unscrambled in the browser by someone who knows the passcode.
import { encryptText } from './crypto.js';

export async function lockPage(innerHtml, passcode) {
  const payload = JSON.stringify(await encryptText(innerHtml, passcode));
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#071F4D">
<title>FPL Hub</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Public+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B3D91;color:#0E1B33;font:15px/1.5 "Public Sans",system-ui,sans-serif;padding:16px}
form{background:#fff;border-radius:14px;padding:26px 24px;width:100%;max-width:330px;border-top:6px solid #D9A21B}
h1{font:900 34px/1 "Big Shoulders Display",sans-serif;margin:0 0 6px;color:#071F4D}
p{color:#5B6B86;font-size:14px;margin:0 0 16px}
input[type=password]{width:100%;box-sizing:border-box;font:inherit;font-size:20px;letter-spacing:4px;padding:10px 12px;border:1.5px solid #D8E0EC;border-radius:8px;background:#F2F5FA;color:#0E1B33}
input[type=password]:focus{outline:3px solid #D9A21B;outline-offset:1px}
button{margin-top:12px;width:100%;font:800 20px/1 "Big Shoulders Display",sans-serif;padding:12px;border:0;border-radius:8px;background:#0B3D91;color:#fff;cursor:pointer}
button:focus-visible{outline:3px solid #D9A21B;outline-offset:2px}
label{display:block;margin-top:10px;font-size:13px;color:#5B6B86}
.err{color:#C8102E;font-size:13px;min-height:18px;margin-top:8px}
</style>
</head>
<body>
<form id="f">
<h1>FPL Hub</h1>
<p>Enter your passcode to open.</p>
<input type="password" id="pw" autocomplete="current-password" aria-label="Passcode" autofocus>
<label><input type="checkbox" id="rem" checked> Remember on this device</label>
<button type="submit">Open</button>
<div class="err" id="err" role="status"></div>
</form>
<script>
const P = ${payload};
// Everything else lives inside this block so nothing clashes with the unlocked page's own code.
(() => {
const ub = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function unlock(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: ub(P.s), iterations: P.n, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub(P.i) }, key, ub(P.c));
  return new TextDecoder().decode(plain);
}
function show(html, pw) { try { sessionStorage.setItem('fplhub-pass', pw); } catch (e) {} document.open(); document.write(html); document.close(); }
let saved = null;
try { saved = localStorage.getItem('fplhub-pass'); } catch (e) {}
if (saved) { document.getElementById('err').textContent = 'Opening…'; unlock(saved).then(html => show(html, saved)).catch(() => { try { localStorage.removeItem('fplhub-pass'); } catch (e) {} document.getElementById('err').textContent = ''; }); }
document.getElementById('f').onsubmit = async e => {
  e.preventDefault();
  const pw = document.getElementById('pw').value;
  document.getElementById('err').textContent = 'Opening…';
  try {
    const html = await unlock(pw);
    try { if (document.getElementById('rem').checked) localStorage.setItem('fplhub-pass', pw); } catch (e) {}
    show(html, pw);
  } catch (err) {
    document.getElementById('err').textContent = 'That passcode didn\\'t work. Try again.';
  }
};
})();
</script>
</body>
</html>`;
}
