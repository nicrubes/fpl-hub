// Test only: lock both FPL Form files with a throwaway code into ./data-test, to check the cloud path.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encryptText } from '../lib/crypto.js';
const code = process.argv[2];
fs.mkdirSync('data-test', { recursive: true });
const dl = path.join(os.homedir(), 'Downloads');
const files = { weekly: 'fpl-form-predicted-points.csv', season: 'fpl-form-predicted-points - GW11 to GW38.csv' };
for (const [slot, f] of Object.entries(files)) {
  const csv = fs.readFileSync(path.join(dl, f), 'utf8');
  fs.writeFileSync(`data-test/predictions-${slot}.json`, JSON.stringify({ label: f, uploadedAt: new Date(Date.now() - (slot === 'weekly' ? 0 : 60000)).toISOString(), payload: await encryptText(csv, code) }));
}
console.log('Locked test files written to ./data-test');
