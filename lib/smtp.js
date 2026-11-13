// A tiny email sender for Gmail (or any SMTP server that uses SSL on port 465).
// Uses only what is built into Node, so nothing extra has to be downloaded.
import tls from 'node:tls';

const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const wrap = s => s.replace(/.{1,76}/g, '$&\r\n');

function buildMessage({ from, to, subject, html, text }) {
  const boundary = 'fplhub-' + Date.now().toString(36);
  return [
    `From: FPL Hub <${from}>`,
    `To: ${to.join(', ')}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@fplhub>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(text)),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(html)),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export function sendMail({ host = 'smtp.gmail.com', port = 465, user, pass, to, subject, html, text }) {
  const recipients = to.split(',').map(s => s.trim()).filter(Boolean);
  const steps = [
    { send: null, expect: 220 },
    { send: 'EHLO fplhub', expect: 250 },
    { send: 'AUTH LOGIN', expect: 334 },
    { send: b64(user), expect: 334 },
    { send: b64(pass), expect: 235, hide: true },
    { send: `MAIL FROM:<${user}>`, expect: 250 },
    ...recipients.map(r => ({ send: `RCPT TO:<${r}>`, expect: 250 })),
    { send: 'DATA', expect: 354 },
    { send: buildMessage({ from: user, to: recipients, subject, html, text }) + '\r\n.', expect: 250 },
    { send: 'QUIT', expect: 221 },
  ];
  return new Promise((resolve, reject) => {
    const sock = tls.connect(port, host, { servername: host });
    sock.setTimeout(30000, () => { sock.destroy(); reject(new Error('Email server timed out')); });
    let buf = '';
    let i = 0;
    sock.on('error', reject);
    sock.on('data', chunk => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\r\n');
      const done = lines.find(l => /^\d{3} /.test(l));
      if (!done) return;
      buf = '';
      const code = Number(done.slice(0, 3));
      const step = steps[i];
      if (code !== step.expect) {
        sock.destroy();
        return reject(new Error(`Email server said ${done}${step.hide ? ' (check the app password)' : ''}`));
      }
      i++;
      if (i >= steps.length) { sock.end(); return resolve(); }
      sock.write(steps[i].send + '\r\n');
    });
  });
}
