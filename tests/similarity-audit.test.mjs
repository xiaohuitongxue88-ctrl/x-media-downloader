import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSourceSimilarity } from '../scripts/similarity-audit.mjs';

test('24-token 相同长片段会被 Clean-Room 审计识别', () => {
  const common = 'const alpha = object . value ; if ( alpha ) { return alpha ; } const beta = object . next ; return beta ;';
  const result = compareSourceSimilarity(common, common, { shingleSize: 24 });
  assert.ok(result.commonShingles > 0);
  assert.equal(result.pass, false);
});

test('结构不同的实现通过 24-token Clean-Room 长片段审计', () => {
  const a = 'for (const node of nodes) { if (!node) continue; total += node.value; } return total;';
  const b = 'let index = 0; while (index < items.length) { result.push(items[index].name); index += 1; } return result;';
  const result = compareSourceSimilarity(a, b, { shingleSize: 24 });
  assert.equal(result.commonShingles, 0);
  assert.equal(result.pass, true);
});
