import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function load(files) {
  const context = vm.createContext({ URL, console });
  const source = ['const XMD=Object.create(null);', ...files.map(f => fs.readFileSync(path.join(root, f), 'utf8')), 'globalThis.__xmd=XMD;'].join('\n');
  new vm.Script(source).runInContext(context);
  return context.__xmd;
}

test('媒体选择器生成稳定的 Windows 安全文件名', () => {
  const XMD = load(['src/ui/icons.js', 'src/ui/media-picker.js']);
  assert.equal(XMD.mediaPicker.filenameFor({ kind: 'video', author: 'alice', tweetId: '555', format: 'mp4' }, 0), '@alice_555_video_01.mp4');
  assert.equal(XMD.mediaPicker.filenameFor({ kind: 'gif', author: 'a:b', tweetId: '555', format: 'mp4' }, 1), '@a b_555_gif_02.mp4');
  assert.equal(XMD.mediaPicker.filenameFor({ kind: 'image', author: 'alice', tweetId: '555', format: 'jpg' }, 2), '@alice_555_image_03.jpg');
});

test('任务中心汇总下载/等待/暂停状态和总进度', () => {
  const XMD = load(['src/ui/icons.js', 'src/ui/task-center.js']);
  const model = XMD.taskCenter.summarize([
    { state: 'active', progress: { percent: 80 } },
    { state: 'queued', progress: { percent: 0 } },
    { state: 'paused', progress: { percent: 40 } }
  ]);
  assert.equal(model.downloading, 1);
  assert.equal(model.waiting, 1);
  assert.equal(model.paused, 1);
  assert.equal(model.percent, 40);
});

test('Greasy Fork URL 未配置时反馈入口只显示 GitHub', () => {
  const XMD = load(['src/ui/icons.js', 'src/ui/task-center.js']);
  const links = XMD.taskCenter.feedbackLinks({ issuesUrl: 'https://github.com/owner/repo/issues', greasyForkUrl: '' });
  assert.equal(links.length, 1);
  assert.equal(links[0].kind, 'github');
  assert.equal(links[0].tooltip, 'GitHub · 问题反馈');
});

test('Progress Dock 与任务中心使用同一汇总语义', () => {
  const XMD = load(['src/ui/icons.js', 'src/ui/task-center.js', 'src/ui/progress-dock.js']);
  const model = XMD.progressDock.model([
    { state: 'active', progress: { percent: 60 } },
    { state: 'queued', progress: { percent: 0 } }
  ]);
  assert.equal(model.percent, 30);
  assert.equal(model.downloading, 1);
  assert.equal(model.waiting, 1);
});

test('UI 样式完全内置且覆盖 Dialog、任务中心和 Dock', () => {
  const XMD = load(['src/ui/icons.js', 'src/ui/styles.js']);
  const css = XMD.uiStyles.css();
  assert.match(css, /\.xmd-dialog\b/);
  assert.match(css, /\.xmd-task-center\b/);
  assert.match(css, /\.xmd-progress-dock\b/);
  assert.match(css, /Segoe UI/);
  assert.doesNotMatch(css, /@import|https?:\/\//);
});

test('浮动触发器锚点优先内部 videoPlayer，再真实 video，再媒体外层', () => {
  const XMD = load(['src/ui/icons.js', 'src/ui/floating-trigger.js']);
  const inner = { tag: 'inner' };
  const video = { tag: 'video' };
  const outer = { tag: 'outer' };
  const article = {
    querySelector(selector) {
      if (selector === '[data-testid="videoPlayer"]') return inner;
      if (selector === 'video') return video;
      if (selector === '[data-testid="tweetPhoto"], [data-testid="videoComponent"]') return outer;
      return null;
    }
  };
  assert.equal(XMD.floatingTrigger.anchorFor(article), inner);
});


test('浮动触发器可穿透播放器同级覆盖层，用几何范围锁定当前媒体', () => {
  const XMD = load(['src/ui/icons.js', 'src/ui/floating-trigger.js']);
  const anchor = {
    getBoundingClientRect() { return { left: 100, top: 200, right: 500, bottom: 425, width: 400, height: 225 }; }
  };
  const article = {
    querySelector(selector) {
      if (selector === '[data-testid="videoPlayer"]') return anchor;
      return null;
    }
  };
  const overlay = {
    closest(selector) {
      if (selector === 'article') return article;
      return null;
    }
  };
  const hit = XMD.floatingTrigger.resolvePointerTarget({ target: overlay, clientX: 320, clientY: 260 });
  assert.equal(hit.article, article);
  assert.equal(hit.anchor, anchor);
  assert.equal(XMD.floatingTrigger.resolvePointerTarget({ target: overlay, clientX: 40, clientY: 40 }), null);
});

test('正式配置在 Greasy Fork Script ID 未生成前保持入口为空', () => {
  const XMD = load(['src/core/config.js']);
  assert.equal(XMD.config.greasyForkUrl, '');
});

test('主入口将媒体采集、选择器、下载队列、任务中心和 Dock 串联', () => {
  const main = fs.readFileSync(path.join(root, 'src/99-main.js'), 'utf8');
  assert.match(main, /XMD\.download\.createManager/);
  assert.match(main, /XMD\.progressDock\.mount/);
  assert.match(main, /XMD\.taskCenter\.mount/);
  assert.match(main, /XMD\.floatingTrigger\.mount/);
  assert.match(main, /XMD\.media\.collectCurrent/);
  assert.match(main, /XMD\.mediaPicker\.open/);
  assert.match(main, /xmd:download-success/);
  assert.doesNotMatch(main, /setInterval\s*\(/);
});

test('主入口把当前媒体锚点交给 Fiber 采集，并且空结果也打开选择器反馈', () => {
  const main = fs.readFileSync(path.join(root, 'src/99-main.js'), 'utf8');
  assert.match(main, /async \(\{ article, anchor \}\)/);
  assert.match(main, /fiberAnchor:\s*anchor\s*\|\|\s*article/);
  assert.doesNotMatch(main, /if \(!mediaItems\.length\) return/);
});
