import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function load(files, globals = {}) {
  const context = vm.createContext({ console, queueMicrotask, ...globals });
  const source = [
    'const XMD = Object.create(null);',
    ...files.map(file => fs.readFileSync(path.join(root, file), 'utf8')),
    'globalThis.__xmd = XMD;'
  ].join('\n');
  new vm.Script(source).runInContext(context);
  return context.__xmd;
}

test('广告决策器只有 direct/strong 证据才隐藏，弱证据保持页面原状', () => {
  const XMD = load(['src/enhancer/ad-filter.js']);
  assert.equal(XMD.adFilter.decideEvidence([{ level: 'weak', reason: 'generic-placement' }]).action, 'keep');
  assert.equal(XMD.adFilter.decideEvidence([{ level: 'strong', reason: 'promoted-label' }]).action, 'hide');
  assert.equal(XMD.adFilter.decideEvidence([{ level: 'direct', reason: 'impression-marker' }]).action, 'hide');
});

test('敏感媒体遮罩使用最小边界关系，不依赖固定祖先层数', () => {
  const XMD = load(['src/enhancer/sensitive-media.js']);
  const realMedia = { querySelector: selector => selector ? {} : null, parentElement: null };
  const article = { querySelector: () => ({}), parentElement: null };
  const content = { querySelector: () => ({}), parentElement: article };
  const mask = { querySelector: () => null, parentElement: content };
  const warning = { querySelector: () => null, parentElement: mask };
  // content 开始包含真实媒体，而 mask 本身不包含，因此 mask 是最小可隐藏边界。
  assert.equal(XMD.sensitiveMedia.findBoundary(warning, article, node => node === content || node === article || node === realMedia), mask);
  const source = fs.readFileSync(path.join(root, 'src/enhancer/sensitive-media.js'), 'utf8');
  assert.doesNotMatch(source, /<\s*14|<=\s*14|i\s*<\s*14/);
});

test('普通成人内容不隐藏；成人内容叠加 Telegram 引流才隐藏', () => {
  const XMD = load(['src/enhancer/spam-filter.js']);
  const adultOnly = XMD.spamFilter.decide({
    text: '成人内容分享，摄影作品，18+ NSFW',
    displayName: '摄影账号', username: 'photo_user', externalLinkCount: 0, followingEvidence: false
  });
  assert.equal(adultOnly.action, 'keep');

  const funnel = XMD.spamFilter.decide({
    text: '成人福利视频，Telegram 频道入口，点击主页进群领取',
    displayName: '每日分享', username: 'daily_media_2026', externalLinkCount: 1, followingEvidence: false
  });
  assert.equal(funnel.action, 'hide');
  assert.ok(funnel.reasons.length > 0);
});

test('反诈/举报语境与已关注账号始终优先保留', () => {
  const XMD = load(['src/enhancer/spam-filter.js']);
  const report = XMD.spamFilter.decide({
    text: '黄推机器人太多，注意举报和屏蔽，谨防色情诈骗',
    displayName: '社区提醒', username: 'community_notice', externalLinkCount: 0, followingEvidence: false
  });
  assert.equal(report.action, 'keep');

  const following = XMD.spamFilter.decide({
    text: '成人福利视频 Telegram 频道入口 点击主页进群',
    displayName: '已关注账号', username: 'followed_user', externalLinkCount: 1, followingEvidence: true
  });
  assert.equal(following.action, 'keep');
});

test('共享 DOM Router 只有一个 MutationObserver，并用 microtask 合并新增节点', () => {
  const source = fs.readFileSync(path.join(root, 'src/enhancer/dom-router.js'), 'utf8');
  assert.equal((source.match(/new\s+MutationObserver\s*\(/g) || []).length, 1);
  assert.match(source, /queueMicrotask\s*\(/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('主入口启动共享 Page Enhancer 路由器', () => {
  const main = fs.readFileSync(path.join(root, 'src/99-main.js'), 'utf8');
  assert.match(main, /XMD\.domRouter\.start\s*\(/);
});
