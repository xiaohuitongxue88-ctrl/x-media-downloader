import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function stripComments(source) {
  return String(source || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

export function tokenizeSource(source) {
  const clean = stripComments(source);
  return clean.match(/[A-Za-z_$][\w$]*|[\u3400-\u9fff]+|\d+|===|!==|=>|&&|\|\||[{}()[\].,:;?+\-*/%<>!=]/g) || [];
}

function shingleKeys(tokens, size) {
  const keys = new Set();
  for (let index = 0; index + size <= tokens.length; index += 1) {
    keys.add(tokens.slice(index, index + size).join('\u001f'));
  }
  return keys;
}

export function compareSourceSimilarity(source, reference, options = {}) {
  const shingleSize = Math.max(8, Number(options.shingleSize || 24));
  const sourceKeys = shingleKeys(tokenizeSource(source), shingleSize);
  const referenceKeys = shingleKeys(tokenizeSource(reference), shingleSize);
  let commonShingles = 0;
  for (const key of sourceKeys) if (referenceKeys.has(key)) commonShingles += 1;
  return {
    pass: commonShingles === 0,
    shingleSize,
    sourceShingles: sourceKeys.size,
    referenceShingles: referenceKeys.size,
    commonShingles,
    overlapPercent: sourceKeys.size ? Number(((commonShingles / sourceKeys.size) * 100).toFixed(4)) : 0
  };
}

function main() {
  const [sourceFile, ...referenceFiles] = process.argv.slice(2);
  if (!sourceFile || referenceFiles.length === 0) {
    console.error('用法: node scripts/similarity-audit.mjs <source> <reference...>');
    process.exitCode = 2;
    return;
  }
  const source = fs.readFileSync(path.resolve(sourceFile), 'utf8');
  let pass = true;
  for (const ref of referenceFiles) {
    const reference = fs.readFileSync(path.resolve(ref), 'utf8');
    const result = compareSourceSimilarity(source, reference, { shingleSize: 24 });
    console.log(`XMD Similarity: ${path.basename(ref)} -> ${result.commonShingles} common 24-token shingles (${result.overlapPercent}%)`);
    if (!result.pass) pass = false;
  }
  if (!pass) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
