import test from 'node:test';
import assert from 'node:assert/strict';
import { auditUserscript } from '../scripts/release-gate.mjs';

const validHeader = `// ==UserScript==
// @name         X Media Downloader
// @namespace    https://github.com/xiaohuitongxue88-ctrl/x-media-downloader
// @version      0.1.0
// @description  X / Twitter 浏览器媒体下载与轻量增强工具。
// @author       xiaohuitongxue
// @license      GPL-3.0-only
// @homepageURL  https://github.com/xiaohuitongxue88-ctrl/x-media-downloader
// @supportURL   https://github.com/xiaohuitongxue88-ctrl/x-media-downloader/issues
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      video.twimg.com
// @connect      pbs.twimg.com
// ==/UserScript==`;

const validBody = `/* Copyright (C) 2026 xiaohuitongxue */
(() => {'use strict'; const project='x-media-downloader'; return project;})();`;

test('合规元数据与源码通过发布门禁', () => {
  const result = auditUserscript(`${validHeader}\n${validBody}`);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(result.errors, []);
});

test('拒绝无关站点匹配', () => {
  const source = validHeader.replace('// @match        https://twitter.com/*', '// @match        https://twitter.com/*\n// @match        *://*/*');
  const result = auditUserscript(`${source}\n${validBody}`);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /@match/);
});

test('拒绝外部可执行依赖与动态执行', () => {
  const source = validHeader.replace('// @grant        GM_download', '// @require      https://example.com/remote.js\n// @grant        GM_download');
  const result = auditUserscript(`${source}\n${validBody}\neval('1 + 1');`);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /@require/);
  assert.match(result.errors.join('\n'), /eval/);
});

test('拒绝旧项目身份痕迹', () => {
  const result = auditUserscript(`${validHeader}\n${validBody}\nconst legacy = 'BetterX xvault xsn';`);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /旧项目身份/);
});
