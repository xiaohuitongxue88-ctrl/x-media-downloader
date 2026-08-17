import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function sha256File(filePath) {
  const bytes = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function createSha256Manifest(files, outputFile = 'SHA256SUMS.txt') {
  const entries = (files || []).map(filePath => `${sha256File(filePath)}  ${path.basename(filePath)}`);
  fs.writeFileSync(outputFile, `${entries.join('\n')}\n`, 'utf8');
  return { outputFile, entries };
}

function main() {
  const files = process.argv.slice(2);
  const targets = files.length ? files : ['dist/x-media-downloader.user.js'];
  const outputFile = path.resolve(process.cwd(), 'SHA256SUMS.txt');
  const result = createSha256Manifest(targets.map(file => path.resolve(process.cwd(), file)), outputFile);
  console.log(`XMD SHA-256: ${result.entries.length} file(s) -> ${result.outputFile}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
