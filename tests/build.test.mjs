import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildUserscript } from '../scripts/build.mjs';

test('构建器按固定顺序拼接源码并保留中文注释', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xmd-build-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', '00-bootstrap.js'), '// ==UserScript==\n// ==/UserScript==\n(() => {\n// 中文：启动\n');
  fs.writeFileSync(path.join(root, 'src', 'core.js'), '// 中文：核心\nconst core = 1;\n');
  fs.writeFileSync(path.join(root, 'src', '99-main.js'), '// 中文：结束\n})();\n');

  const output = path.join(root, 'dist', 'x.user.js');
  const result = buildUserscript({
    rootDir: root,
    outputFile: output,
    sourceOrder: ['src/00-bootstrap.js', 'src/core.js', 'src/99-main.js']
  });

  assert.equal(result.outputFile, output);
  const built = fs.readFileSync(output, 'utf8');
  assert.ok(built.indexOf('// 中文：启动') < built.indexOf('// 中文：核心'));
  assert.ok(built.indexOf('// 中文：核心') < built.indexOf('// 中文：结束'));
  assert.match(built, /中文：启动/);
});
