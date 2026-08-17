import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadXMD(files) {
  const context = vm.createContext({ URL, console });
  const source = [
    'const XMD = Object.create(null);',
    ...files.map(file => fs.readFileSync(path.join(root, file), 'utf8')),
    'globalThis.__xmd = XMD;'
  ].join('\n');
  new vm.Script(source).runInContext(context);
  return context.__xmd;
}

test('同一视频身份优先最高码率 MP4 而不是低码率或 HLS', () => {
  const XMD = loadXMD(['src/core/utils.js', 'src/core/evidence.js', 'src/media/media-collector.js']);
  const candidates = [
    { id: 'video:123', kind: 'video', url: 'https://video.twimg.com/ext_tw_video/123/pu/vid/640x360/a.mp4', format: 'mp4', bitrate: 832000, width: 640, height: 360, evidence: 'direct' },
    { id: 'video:123', kind: 'video', url: 'https://video.twimg.com/ext_tw_video/123/pu/vid/1280x720/a.mp4', format: 'mp4', bitrate: 2176000, width: 1280, height: 720, evidence: 'strong' },
    { id: 'video:123', kind: 'video', url: 'https://video.twimg.com/ext_tw_video/123/pu/pl/a.m3u8', format: 'hls', bitrate: 0, width: 0, height: 0, evidence: 'direct' }
  ];

  const items = XMD.media.selectBest(candidates);
  assert.equal(items.length, 1);
  assert.equal(items[0].bitrate, 2176000);
  assert.equal(items[0].format, 'mp4');
});

test('pbs 图片地址规范化为原图 name=orig 且保留 format', () => {
  const XMD = loadXMD(['src/core/utils.js', 'src/core/evidence.js', 'src/media/media-collector.js']);
  const items = XMD.media.selectBest([
    { id: 'image:AbCd', kind: 'image', url: 'https://pbs.twimg.com/media/AbCd?format=jpg&name=small', format: 'jpg', evidence: 'direct' }
  ]);
  const parsed = new URL(items[0].url);
  assert.equal(parsed.searchParams.get('name'), 'orig');
  assert.equal(parsed.searchParams.get('format'), 'jpg');
});

test('明确 animated_gif 的媒体对象分类为 gif，其他 MP4 保持 video', () => {
  const XMD = loadXMD(['src/core/utils.js', 'src/core/evidence.js', 'src/media/media-collector.js']);
  assert.equal(XMD.media.kindFromTwitterType('animated_gif'), 'gif');
  assert.equal(XMD.media.kindFromTwitterType('video'), 'video');
  assert.equal(XMD.media.kindFromTwitterType('unknown'), 'video');
});

test('DOM 采集器只读取传入 Tweet 作用域内的真实媒体节点', () => {
  const XMD = loadXMD(['src/core/utils.js', 'src/core/evidence.js', 'src/media/media-collector.js', 'src/media/dom-collector.js']);
  const video = { currentSrc: 'https://video.twimg.com/ext_tw_video/777/pu/vid/1280x720/demo.mp4', src: '', poster: 'https://pbs.twimg.com/ext_tw_video_thumb/777/pu/img/demo.jpg', videoWidth: 1280, videoHeight: 720, querySelectorAll: () => [] };
  const image = { src: 'https://pbs.twimg.com/media/Img777?format=jpg&name=small', currentSrc: '' };
  const article = { querySelectorAll(selector) { if (selector === 'video') return [video]; if (selector === 'img[src*="pbs.twimg.com/media/"]') return [image]; return []; } };
  const candidates = XMD.domCollector.collect(article);
  assert.equal(candidates.length, 2);
  assert.equal(candidates.find(x => x.kind === 'video').id, 'video:777');
  assert.equal(candidates.find(x => x.kind === 'image').id, 'image:Img777');
  assert.ok(candidates.every(x => x.evidence === 'direct'));
});

test('Fiber 采集器在硬预算内读取结构化 variants 并保留 animated_gif 类型', () => {
  const XMD = loadXMD(['src/core/utils.js', 'src/core/evidence.js', 'src/media/media-collector.js', 'src/media/fiber-collector.js']);
  const anchor = { __reactProps$abc: { children: { payload: { legacy: { id_str: '888', type: 'animated_gif', video_info: { variants: [ { content_type: 'video/mp4', bitrate: 320000, url: 'https://video.twimg.com/tweet_video/888/low.mp4' }, { content_type: 'video/mp4', bitrate: 832000, url: 'https://video.twimg.com/tweet_video/888/high.mp4' } ] } } } } } };
  const candidates = XMD.fiberCollector.collect(anchor, { maxNodes: 100, maxDepth: 8 });
  assert.equal(candidates.length, 2);
  assert.ok(candidates.every(x => x.id === 'gif:888'));
  assert.ok(candidates.every(x => x.kind === 'gif'));
  assert.ok(candidates.every(x => x.evidence === 'strong'));
});

test('Performance 兜底只接受与当前 Tweet 媒体身份匹配的资源', () => {
  const XMD = loadXMD(['src/core/utils.js', 'src/core/evidence.js', 'src/media/media-collector.js', 'src/media/performance-collector.js']);
  const entries = [ { name: 'https://video.twimg.com/ext_tw_video/999/pu/vid/640x360/a.mp4', startTime: 10 }, { name: 'https://video.twimg.com/ext_tw_video/123/pu/vid/1280x720/b.mp4', startTime: 20 } ];
  const candidates = XMD.performanceCollector.collect({ mediaIds: new Set(['123']) }, entries);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, 'video:123');
  assert.equal(candidates[0].evidence, 'weak');
});

test('Tweet 上下文提取 tweetId、作者并附加到最终 MediaItem', () => {
  const XMD = loadXMD(['src/core/utils.js', 'src/core/evidence.js', 'src/media/tweet-context.js', 'src/media/dom-collector.js', 'src/media/fiber-collector.js', 'src/media/performance-collector.js', 'src/media/media-collector.js']);
  const statusAnchor = { href: 'https://x.com/alice/status/555' };
  const time = { closest: () => statusAnchor };
  const image = { src: 'https://pbs.twimg.com/media/Photo555?format=png&name=medium', currentSrc: '' };
  const article = { querySelector(selector) { if (selector === 'time') return time; if (selector === '[data-testid="User-Name"]') return { innerText: 'Alice\n@alice' }; if (selector === '[data-testid="tweetText"]') return { innerText: '示例正文' }; return null; }, querySelectorAll(selector) { if (selector === 'video') return []; if (selector === 'img[src*="pbs.twimg.com/media/"]') return [image]; if (selector === 'a[href*="/status/"]') return [statusAnchor]; return []; } };
  const items = XMD.media.collectCurrent({ article, fiberAnchor: null, performanceEntries: [] });
  assert.equal(items.length, 1);
  assert.equal(items[0].tweetId, '555');
  assert.equal(items[0].author, 'alice');
  assert.equal(items[0].text, '示例正文');
  assert.equal(items[0].id, 'image:Photo555');
});
