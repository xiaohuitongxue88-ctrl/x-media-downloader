import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFICIAL_NAMESPACE = 'https://github.com/xiaohuitongxue88-ctrl/x-media-downloader';
const ALLOWED_MATCHES = new Set([
  'https://x.com/*',
  'https://twitter.com/*'
]);
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

export function auditUserscript(source) {
  const text = String(source ?? '');
  const errors = [];
  const metadata = parseMetadata(text);

  if (!metadata) {
    errors.push('缺少完整 Userscript 元数据块。');
    return { ok: false, errors, metadata: {} };
  }

  if (first(metadata, 'namespace') !== OFFICIAL_NAMESPACE) {
    errors.push(`@namespace 必须为官方仓库：${OFFICIAL_NAMESPACE}`);
  }
  if (first(metadata, 'author') !== 'xiaohuitongxue') {
    errors.push('@author 必须为 xiaohuitongxue。');
  }
  if (first(metadata, 'license') !== 'GPL-3.0-only') {
    errors.push('@license 必须为 GPL-3.0-only。');
  }

  const matches = metadata.values.get('match') || [];
  if (matches.length !== ALLOWED_MATCHES.size || matches.some(value => !ALLOWED_MATCHES.has(value))) {
    errors.push('@match 仅允许 https://x.com/* 与 https://twitter.com/*。');
  }

  if ((metadata.values.get('require') || []).length > 0) {
    errors.push('禁止使用 @require 加载外部可执行代码。');
  }

  if (/\beval\s*\(/.test(text)) {
    errors.push('禁止使用 eval 动态执行代码。');
  }
  if (/\bnew\s+Function\s*\(/.test(text)) {
    errors.push('禁止使用 new Function 动态执行代码。');
  }
  if (/createElement\s*\(\s*['"]script['"]\s*\)/i.test(text)) {
    errors.push('禁止动态创建 script 元素加载远程代码。');
  }

  if (LEGACY_MARKERS.some(pattern => pattern.test(text))) {
    errors.push('检测到旧项目身份痕迹；Clean-Room 首发源码不得包含 BetterX/XVault/xvault/xsn 标识。');
  }

  return {
    ok: errors.length === 0,
    errors,
    metadata: Object.fromEntries([...metadata.values.entries()])
  };
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
