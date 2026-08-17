import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditUserscript } from '../scripts/release-gate.mjs';
import { createSha256Manifest } from '../scripts/sha256.mjs';

const baseHeader = `// ==UserScript==\n// @name         X Media Downloader\n// @namespace    https://github.com/xiaohuitongxue88-ctrl/x-media-downloader\n// @version      0.1.0\n// @description  X / Twitter 浏览器媒体下载与轻量增强工具。\n// @author       xiaohuitongxue\n// @license      GPL-3.0-only\n// @homepageURL  https://github.com/xiaohuitongxue88-ctrl/x-media-downloader\n// @supportURL   https://github.com/xiaohuitongxue88-ctrl/x-media-downloader/issues\n// @match        https://x.com/*\n// @match        https://twitter.com/*\n// @run-at       document-start\n// @grant        GM_download\n// @grant        GM_xmlhttpRequest\n// @grant        GM_openInTab\n// @connect      video.twimg.com\n// @connect      pbs.twimg.com\n// ==/UserScript==`;

const validSource = `${baseHeader}\n/* Copyright (C) 2026 xiaohuitongxue */\n(() => { 'use strict'; const XMD = { build: { owner: 'xiaohuitongxue', project: 'x-media-downloader' } }; console.debug(XMD.build.project); })();\n`;

test('发布门禁要求官方主页、反馈地址、描述、run-at、授权和连接域名精确匹配', () => {
  assert.equal(auditUserscript(validSource).ok, true);

  const wrongHomepage = validSource.replace(
    'https://github.com/xiaohuitongxue88-ctrl/x-media-downloader\n// @supportURL',
    'https://example.com/fake\n// @supportURL'
  );
  assert.match(auditUserscript(wrongHomepage).errors.join('\n'), /homepageURL/);

  const extraConnect = validSource.replace('// @connect      pbs.twimg.com', '// @connect      pbs.twimg.com\n// @connect      example.com');
  assert.match(auditUserscript(extraConnect).errors.join('\n'), /@connect/);
});

test('发布门禁拒绝超过 Greasy Fork 2 MiB 限制的脚本', () => {
  const oversized = validSource + 'x'.repeat(2 * 1024 * 1024);
  const result = auditUserscript(oversized);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /2\.0 MB|2 MiB/);
});

test('发布门禁拒绝永久 setInterval、unsafeWindow 和网络 Hook 形态', () => {
  for (const body of [
    `setInterval(() => work(), 1000);`,
    `const page = unsafeWindow;`,
    `window.fetch = async (...args) => originalFetch(...args);`,
    `XMLHttpRequest.prototype.open = wrappedOpen;`
  ]) {
    const result = auditUserscript(`${validSource}\n${body}`);
    assert.equal(result.ok, false, body);
  }
});

test('发布门禁拒绝明显压成单行的长主体，但允许正常可读源码', () => {
  assert.equal(auditUserscript(validSource).ok, true);
  const minified = `${baseHeader}\n${'const a=1;'.repeat(9000)}`;
  const result = auditUserscript(minified);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /压缩|可读/);
});

test('SHA-256 清单使用文件真实字节生成并包含 basename', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xmd-sha-'));
  const file = path.join(dir, 'x-media-downloader.user.js');
  const manifest = path.join(dir, 'SHA256SUMS.txt');
  fs.writeFileSync(file, 'xiaohuitongxue-XMD\n', 'utf8');
  const result = createSha256Manifest([file], manifest);
  assert.equal(result.entries.length, 1);
  assert.match(result.entries[0], /^[a-f0-9]{64}  x-media-downloader\.user\.js$/);
  assert.equal(fs.readFileSync(manifest, 'utf8').trim(), result.entries[0]);
});

test('发布治理文档、GPLv3 原文和真实性声明齐全', () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
  assert.match(license, /GNU GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 29 June 2007/);
  for (const name of ['NOTICE', 'AUTHENTICITY.md', 'README.md', 'GREASYFORK.md', 'CHANGELOG.md']) {
    assert.equal(fs.existsSync(path.join(root, name)), true, `${name} missing`);
  }
  assert.match(fs.readFileSync(path.join(root, 'AUTHENTICITY.md'), 'utf8'), /xiaohuitongxue88-ctrl\/x-media-downloader/);
  assert.match(fs.readFileSync(path.join(root, 'GREASYFORK.md'), 'utf8'), /成人内容|成人/);
});
