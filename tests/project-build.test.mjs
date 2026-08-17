import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../scripts/build.mjs';
import { auditUserscript } from '../scripts/release-gate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '..');

test('项目源码构建为符合 XMD 首发元数据的 userscript', () => {
  const outputFile = path.join(rootDir, 'dist', 'x-media-downloader.user.js');
  buildUserscript({ rootDir, outputFile });
  const source = fs.readFileSync(outputFile, 'utf8');
  const gate = auditUserscript(source);

  assert.equal(gate.ok, true, gate.errors.join('\n'));
  assert.deepEqual(gate.metadata.match, ['https://x.com/*', 'https://twitter.com/*']);
  assert.deepEqual(gate.metadata.grant, ['GM_download', 'GM_xmlhttpRequest', 'GM_openInTab']);
  assert.deepEqual(gate.metadata.connect, ['video.twimg.com', 'pbs.twimg.com']);
  assert.match(source, /XMD · 启动边界/);
  assert.match(source, /xiaohuitongxue/);
});
