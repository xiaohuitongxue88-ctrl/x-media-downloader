import test from 'node:test';
import assert from 'node:assert/strict';
import { auditUserscript } from '../scripts/release-gate.mjs';

const validHeader = `// ==UserScript==\n// @name         X Media Downloader\n// @namespace    https://github.com/xiaohuitongxue88-ctrl/x-media-downloader\n// @version      0.1.0\n// @author       xiaohuitongxue\n// @license      GPL-3.0-only\n// @match        https://x.com/*\n// @match        https://twitter.com/*\n// @grant        GM_download\n// @grant        GM_xmlhttpRequest\n// @grant        GM_openInTab\n// @connect      video.twimg.com\n// @connect      pbs.twimg.com\n// ==/UserScript==`;

test('合规元数据与源码通过发布门禁', () => {
  const result = auditUserscript(`${validHeader}\n(() => {'use strict';})();`);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('拒绝无关站点匹配', () => {
  const source = validHeader.replace('// @match        https://twitter.com/*', '// @match        https://twitter.com/*\n// @match        *://*/*');
  const result = auditUserscript(`${source}\n(() => {})();`);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /@match/);
});

test('拒绝外部可执行依赖与动态执行', () => {
  const source = validHeader.replace('// @grant        GM_download', '// @require      https://example.com/remote.js\n// @grant        GM_download');
  const result = auditUserscript(`${source}\neval('1 + 1');`);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /@require/);
  assert.match(result.errors.join('\n'), /eval/);
});

test('拒绝旧项目身份痕迹', () => {
  const result = auditUserscript(`${validHeader}\nconst legacy = 'BetterX xvault xsn';`);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /旧项目身份/);
});
