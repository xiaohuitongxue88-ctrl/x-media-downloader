import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadRecovery(extra = {}) {
  const context = vm.createContext({ URL, console, setTimeout, clearTimeout, ...extra });
  const files = ['src/core/utils.js', 'src/core/evidence.js', 'src/media/recovery.js'];
  const source = ['const XMD = Object.create(null);', ...files.map(f => fs.readFileSync(path.join(root, f), 'utf8')), 'globalThis.__xmd=XMD;'].join('\n');
  new vm.Script(source).runInContext(context);
  return context.__xmd;
}

test('HTTP 状态分类遵循有效/禁止/消失/未知四态', () => {
  const XMD = loadRecovery();
  assert.equal(XMD.recovery.classifyHttpStatus(200).state, 'valid');
  assert.equal(XMD.recovery.classifyHttpStatus(206).state, 'valid');
  assert.equal(XMD.recovery.classifyHttpStatus(401).state, 'forbidden');
  assert.equal(XMD.recovery.classifyHttpStatus(403).state, 'forbidden');
  assert.equal(XMD.recovery.classifyHttpStatus(404).state, 'gone');
  assert.equal(XMD.recovery.classifyHttpStatus(410).state, 'gone');
  assert.equal(XMD.recovery.classifyHttpStatus(0).state, 'unknown');
});

test('Range 收到 403 时必须再用普通 GET 响应头复核', async () => {
  const XMD = loadRecovery();
  const calls = [];
  const request = options => {
    calls.push({ headers: { ...(options.headers || {}) } });
    queueMicrotask(() => options.onload({ status: calls.length === 1 ? 403 : 200 }));
    return { abort() {} };
  };
  const result = await XMD.recovery.probeTwitterUrl('https://video.twimg.com/ext_tw_video/123/pu/vid/720x720/a.mp4', request);
  assert.equal(result.state, 'valid');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers.Range, 'bytes=0-1');
  assert.equal('Range' in calls[1].headers, false);
});

test('网络错误返回 unknown，不把原媒体地址错误判死', async () => {
  const XMD = loadRecovery();
  const request = options => {
    queueMicrotask(() => options.onerror({}));
    return { abort() {} };
  };
  const result = await XMD.recovery.probeTwitterUrl('https://video.twimg.com/ext_tw_video/123/pu/vid/720x720/a.mp4', request);
  assert.equal(result.state, 'unknown');
});

test('明确 gone 时 fresh 重采集同一媒体身份并返回新地址', async () => {
  const XMD = loadRecovery();
  XMD.recovery.validate = async () => ({ state: 'gone', status: 404 });
  const current = { id: 'video:123', kind: 'video', url: 'https://video.twimg.com/ext_tw_video/123/old.mp4' };
  const fresh = [
    { id: 'video:999', kind: 'video', url: 'https://video.twimg.com/ext_tw_video/999/new.mp4' },
    { id: 'video:123', kind: 'video', url: 'https://video.twimg.com/ext_tw_video/123/new.mp4' }
  ];
  const result = await XMD.recovery.prepare(current, { collectFresh: async () => fresh });
  assert.equal(result.media.url, 'https://video.twimg.com/ext_tw_video/123/new.mp4');
  assert.equal(result.recovered, true);
});
