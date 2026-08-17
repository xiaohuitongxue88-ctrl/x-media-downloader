import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadSupport() {
  const context = vm.createContext({ console, Date });
  const source = [
    'const XMD = Object.create(null);',
    fs.readFileSync(path.join(root, 'src/support/support-prompt.js'), 'utf8'),
    'globalThis.__xmd=XMD;'
  ].join('\n');
  new vm.Script(source).runInContext(context);
  return context.__xmd.supportPrompt;
}

const DAY = 86400000;
const base = Date.UTC(2026, 0, 1, 12, 0, 0);

test('没有真实下载成功时有效会话保持为 0', () => {
  const support = loadSupport();
  const state = support.defaultState();
  assert.equal(state.sessionCount, 0);
  assert.equal(state.successCount, 0);
  assert.equal(state.firstSuccessAt, 0);
});

test('同一天多次真实成功只累计一个有效会话，跨日成功才增加会话', () => {
  const support = loadSupport();
  let state = support.recordSuccessInState(support.defaultState(), 'video', base);
  state = support.recordSuccessInState(state, 'image', base + 60_000);
  assert.equal(state.sessionCount, 1);
  assert.equal(state.successCount, 2);
  assert.deepEqual(Array.from(state.featureKinds).sort(), ['image', 'video']);
  state = support.recordSuccessInState(state, 'gif', base + DAY);
  assert.equal(state.sessionCount, 2);
  assert.equal(state.successCount, 3);
});

test('3天/14天/45天三级阈值按顺序判定，并遵守阶段间隔', () => {
  const support = loadSupport();
  const state = support.defaultState();
  state.firstSuccessAt = base;
  state.sessionCount = 3;
  state.successCount = 5;
  state.featureKinds = ['video', 'image'];
  assert.equal(support.eligibleStage(state, base + 3 * DAY)?.id, 's1');

  state.dismissedStages.s1 = true;
  state.lastPromptAt = base + 3 * DAY;
  state.sessionCount = 10;
  state.successCount = 25;
  state.featureKinds = ['video', 'image', 'gif'];
  assert.equal(support.eligibleStage(state, base + 12 * DAY), null);
  assert.equal(support.eligibleStage(state, base + 14 * DAY)?.id, 's2');

  state.dismissedStages.s2 = true;
  state.lastPromptAt = base + 14 * DAY;
  state.sessionCount = 25;
  state.successCount = 80;
  assert.equal(support.eligibleStage(state, base + 43 * DAY), null);
  assert.equal(support.eligibleStage(state, base + 45 * DAY)?.id, 's3');
});

test('× 只关闭当前阶段；项目链接会永久停止后续提示', () => {
  const support = loadSupport();
  let state = support.defaultState();
  state.activeStage = 's1';
  state = support.dismissCurrentStage(state);
  assert.equal(state.dismissedStages.s1, true);
  assert.equal(state.permanentStop, false);
  state = support.stopPermanently(state);
  assert.equal(state.permanentStop, true);
  assert.equal(support.eligibleStage(state, base + 100 * DAY), null);
});

test('支持提示实现只使用本地状态和事件，不使用定时轮询或持续动画', () => {
  const source = fs.readFileSync(path.join(root, 'src/support/support-prompt.js'), 'utf8');
  assert.match(source, /xiaohuitongxue\.xmd\.support\.v1/);
  assert.match(source, /xmd:download-success/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|GM_xmlhttpRequest/);
});

test('主入口挂载支持提示模块', () => {
  const main = fs.readFileSync(path.join(root, 'src/99-main.js'), 'utf8');
  assert.match(main, /XMD\.supportPrompt\.mount\s*\(/);
});
