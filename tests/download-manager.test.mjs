import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadManager() {
  const context = vm.createContext({ console, setTimeout, clearTimeout, queueMicrotask });
  const source = ['const XMD = Object.create(null);', fs.readFileSync(path.join(root, 'src/download/download-manager.js'), 'utf8'), 'globalThis.__xmd=XMD;'].join('\n');
  new vm.Script(source).runInContext(context);
  return context.__xmd;
}

function fakeTransport() {
  const calls = [];
  const transport = options => {
    const call = { options, aborted: false };
    calls.push(call);
    return { abort() { call.aborted = true; } };
  };
  return { calls, transport };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('默认并发 2：三个任务进入 2 active + 1 queued', () => {
  const XMD = loadManager();
  const fake = fakeTransport();
  const manager = XMD.download.createManager({ transport: fake.transport, recovery: { prepare: async media => ({ media }) } });
  manager.enqueue({ id: 'video:1', url: 'https://v/1.mp4' }, '1.mp4');
  manager.enqueue({ id: 'video:2', url: 'https://v/2.mp4' }, '2.mp4');
  manager.enqueue({ id: 'video:3', url: 'https://v/3.mp4' }, '3.mp4');
  assert.equal(fake.calls.length, 2);
  assert.deepEqual(Array.from(manager.list(), t => t.state), ['active', 'active', 'queued']);
});

test('活动任务暂停调用 abort 并释放并发槽位；等待任务暂停不发请求', () => {
  const XMD = loadManager();
  const fake = fakeTransport();
  const manager = XMD.download.createManager({ concurrency: 1, transport: fake.transport, recovery: { prepare: async media => ({ media }) } });
  const first = manager.enqueue({ id: 'video:1', url: 'https://v/1.mp4' }, '1.mp4');
  const second = manager.enqueue({ id: 'video:2', url: 'https://v/2.mp4' }, '2.mp4');
  manager.pause(second.id);
  assert.equal(fake.calls.length, 1);
  manager.pause(first.id);
  assert.equal(fake.calls[0].aborted, true);
  assert.equal(manager.get(first.id).state, 'paused');
  assert.equal(manager.get(second.id).state, 'paused');
});

test('继续暂停任务先执行 recovery，成功后进度归零并重新下载', async () => {
  const XMD = loadManager();
  const fake = fakeTransport();
  const recovered = [];
  const recovery = { prepare: async media => { recovered.push(media.url); return { media: { ...media, url: media.url.replace('old', 'new') }, recovered: true }; } };
  const manager = XMD.download.createManager({ concurrency: 1, transport: fake.transport, recovery });
  const task = manager.enqueue({ id: 'video:1', url: 'https://v/old.mp4' }, '1.mp4');
  fake.calls[0].options.onprogress({ loaded: 70, total: 100, lengthComputable: true });
  assert.equal(manager.get(task.id).progress.percent, 70);
  manager.pause(task.id);
  manager.resume(task.id);
  await tick();
  assert.equal(recovered.length, 1);
  assert.equal(manager.get(task.id).progress.percent, 0);
  assert.equal(fake.calls.at(-1).options.url, 'https://v/new.mp4');
});

test('只有 transport onload 才触发真实成功事件', () => {
  const XMD = loadManager();
  const fake = fakeTransport();
  const success = [];
  const manager = XMD.download.createManager({ transport: fake.transport, recovery: { prepare: async media => ({ media }) }, onSuccess: task => success.push(task.id) });
  const task = manager.enqueue({ id: 'image:1', url: 'https://p/1.jpg' }, '1.jpg');
  assert.deepEqual(success, []);
  fake.calls[0].options.onprogress({ loaded: 100, total: 100, lengthComputable: true });
  assert.deepEqual(success, []);
  fake.calls[0].options.onload({});
  assert.deepEqual(success, [task.id]);
  assert.equal(manager.get(task.id).state, 'completed');
});

test('全部暂停与全部继续保持队列语义，并支持取消和失败重试', async () => {
  const XMD = loadManager();
  const fake = fakeTransport();
  const manager = XMD.download.createManager({ concurrency: 2, transport: fake.transport, recovery: { prepare: async media => ({ media }) } });
  const a = manager.enqueue({ id: 'video:1', url: 'https://v/1.mp4' }, '1.mp4');
  const b = manager.enqueue({ id: 'video:2', url: 'https://v/2.mp4' }, '2.mp4');
  const c = manager.enqueue({ id: 'video:3', url: 'https://v/3.mp4' }, '3.mp4');
  manager.pauseAll();
  assert.deepEqual(Array.from(manager.list(), t => t.state), ['paused', 'paused', 'paused']);
  assert.equal(fake.calls[0].aborted, true);
  assert.equal(fake.calls[1].aborted, true);

  manager.resumeAll();
  await tick();
  assert.equal(manager.get(a.id).state, 'active');
  assert.equal(manager.get(b.id).state, 'active');
  assert.equal(manager.get(c.id).state, 'queued');

  manager.cancel(c.id);
  assert.equal(manager.get(c.id).state, 'cancelled');

  fake.calls.at(-2).options.onerror({ error: 'network' });
  assert.equal(manager.get(a.id).state, 'failed');
  assert.equal(manager.retry(a.id), true);
  await tick();
  assert.ok(['preparing', 'active', 'queued'].includes(manager.get(a.id).state));
});

test('任务管理器支持订阅状态变化并清理已完成任务', () => {
  const XMD = loadManager();
  const fake = fakeTransport();
  const snapshots = [];
  const manager = XMD.download.createManager({ transport: fake.transport, recovery: { prepare: async media => ({ media }) } });
  const unsubscribe = manager.subscribe(tasks => snapshots.push(Array.from(tasks, t => t.state)));
  const task = manager.enqueue({ id: 'image:9', url: 'https://p/9.jpg' }, '9.jpg');
  fake.calls[0].options.onload({});
  assert.ok(snapshots.some(states => states.includes('completed')));
  manager.clearCompleted();
  assert.equal(manager.get(task.id), null);
  unsubscribe();
});
