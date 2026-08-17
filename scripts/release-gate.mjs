import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFICIAL_NAMESPACE = 'https://github.com/xiaohuitongxue88-ctrl/x-media-downloader';
const OFFICIAL_HOMEPAGE = OFFICIAL_NAMESPACE;
const OFFICIAL_SUPPORT = `${OFFICIAL_NAMESPACE}/issues`;
const MAX_GREASY_FORK_BYTES = 2_000_000;
const ALLOWED_MATCHES = new Set(['https://x.com/*', 'https://twitter.com/*']);
const REQUIRED_GRANTS = new Set(['GM_download', 'GM_xmlhttpRequest', 'GM_openInTab']);
const ALLOWED_CONNECTS = new Set(['video.twimg.com', 'pbs.twimg.com']);
const LEGACY_MARKERS = [/\bBetterX\b/i, /\bXVault\b/i, /\bxvault\b/i, /\bxsn(?:-|_|\b)/i];

function parseMetadata(source) {
  const begin = source.indexOf('// ==UserScript==');
  const end = source.indexOf('// ==/UserScript==');
  if (begin < 0 || end < 0 || end <= begin) return null;
  const block = source.slice(begin, end + '// ==/UserScript=='.length);
  const values = new Map();
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^\s*\/\/\s*@([\w:-]+)\s+(.+?)\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    const list = values.get(key) || [];
    list.push(value);
    values.set(key, list);
  }
  return { block, values };
}

function first(meta, key) {
  return meta?.values.get(key)?.[0] || '';
}

function exactSet(values, expected) {
  const current = new Set(values || []);
  return current.size === expected.size && [...current].every(value => expected.has(value));
}

function looksMinified(text, metadataBlock) {
  const body = text.slice(text.indexOf(metadataBlock) + metadataBlock.length);
  if (Buffer.byteLength(body, 'utf8') < 50_000) return false;
  const nonEmptyLines = body.split(/\r?\n/).filter(line => line.trim()).length;
  return nonEmptyLines < 100;
}

export function auditUserscript(source) {
  const text = String(source ?? '');
  const errors = [];
  const metadata = parseMetadata(text);

  if (Buffer.byteLength(text, 'utf8') > MAX_GREASY_FORK_BYTES) {
    errors.push('脚本超过 Greasy Fork 2.0 MB 发布上限。');
  }

  if (!metadata) {
    errors.push('缺少完整 Userscript 元数据块。');
    return { ok: false, errors, metadata: {} };
  }

  if (!first(metadata, 'description')) errors.push('必须提供 @description，明确告知用户脚本功能。');
  if (first(metadata, 'namespace') !== OFFICIAL_NAMESPACE) errors.push(`@namespace 必须为官方仓库：${OFFICIAL_NAMESPACE}`);
  if (first(metadata, 'homepageURL') !== OFFICIAL_HOMEPAGE) errors.push(`@homepageURL 必须为官方仓库：${OFFICIAL_HOMEPAGE}`);
  if (first(metadata, 'supportURL') !== OFFICIAL_SUPPORT) errors.push(`@supportURL 必须为官方 Issues：${OFFICIAL_SUPPORT}`);
  if (first(metadata, 'author') !== 'xiaohuitongxue') errors.push('@author 必须为 xiaohuitongxue。');
  if (first(metadata, 'license') !== 'GPL-3.0-only') errors.push('@license 必须为 GPL-3.0-only。');
  if (first(metadata, 'run-at') !== 'document-start') errors.push('@run-at 必须为 document-start。');

  const matches = metadata.values.get('match') || [];
  if (!exactSet(matches, ALLOWED_MATCHES)) errors.push('@match 仅允许 https://x.com/* 与 https://twitter.com/*。');
  const grants = metadata.values.get('grant') || [];
  if (!exactSet(grants, REQUIRED_GRANTS)) errors.push('@grant 必须且仅包含 GM_download、GM_xmlhttpRequest、GM_openInTab。');
  const connects = metadata.values.get('connect') || [];
  if (!exactSet(connects, ALLOWED_CONNECTS)) errors.push('@connect 必须且仅包含 video.twimg.com 与 pbs.twimg.com。');

  if ((metadata.values.get('require') || []).length > 0) errors.push('禁止使用 @require 加载外部可执行代码。');
  if (/\beval\s*\(/.test(text)) errors.push('禁止使用 eval 动态执行代码。');
  if (/\bnew\s+Function\s*\(/.test(text)) errors.push('禁止使用 new Function 动态执行代码。');
  if (/createElement\s*\(\s*['"]script['"]\s*\)/i.test(text)) errors.push('禁止动态创建 script 元素加载远程代码。');
  if (/\bsetInterval\s*\(/.test(text)) errors.push('XMD 正式版禁止永久 setInterval 轮询。');
  if (/\bunsafeWindow\b/.test(text)) errors.push('XMD Clean-Room 正式版不使用 unsafeWindow。');
  if (/(?:window|globalThis)\.fetch\s*=/.test(text) || /XMLHttpRequest\.prototype\.(?:open|send)\s*=/.test(text)) {
    errors.push('禁止改写 fetch/XMLHttpRequest 形成持续网络 Hook。');
  }
  if (LEGACY_MARKERS.some(pattern => pattern.test(text))) {
    errors.push('检测到旧项目身份痕迹；Clean-Room 首发源码不得包含 BetterX/XVault/xvault/xsn 标识。');
  }
  if (looksMinified(text, metadata.block)) errors.push('检测到明显单行压缩主体；Greasy Fork 发布源码必须保持可读、未压缩。');
  if (!/Copyright \(C\) 2026 xiaohuitongxue/.test(text)) errors.push('缺少 xiaohuitongxue 版权声明。');
  if (!/x-media-downloader/.test(text)) errors.push('缺少 XMD 官方项目身份标识。');

  return { ok: errors.length === 0, errors, metadata: Object.fromEntries([...metadata.values.entries()]) };
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('用法: node scripts/release-gate.mjs <userscript>');
    process.exitCode = 2;
    return;
  }
  const fullPath = path.resolve(process.cwd(), target);
  const source = fs.readFileSync(fullPath, 'utf8');
  const result = auditUserscript(source);
  if (!result.ok) {
    console.error('XMD Release Gate: FAIL');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('XMD Release Gate: PASS');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
