# X Media Downloader

**X Media Downloader（XMD）** 是面向 X / Twitter 的轻量浏览器媒体下载与页面增强 userscript。项目由 **xiaohuitongxue** 维护，目标是以可审阅、低资源、证据驱动的方式完成视频、GIF 和原图下载，不依赖本地 PowerShell、Native Host 或独立下载后端。

> 当前仓库处于 `0.1.0` 开发验证阶段。通过 Chrome + Tampermonkey 现场验证后，才会进入首个正式 `v1.0.0` Release 与 Greasy Fork 首发。

## 核心能力

- 当前 Tweet 媒体识别：DOM 直接证据 → 当前 React/Fiber 结构化证据 → 严格归属的 Performance 弱证据兜底。
- 视频优先选择同一媒体身份的最高码率 MP4；GIF 以 X 明确的 `animated_gif` 类型识别；图片转换为 `pbs.twimg.com` 原图 `name=orig`。
- `GM_download` 浏览器原生下载，不把大型媒体默认读取为 Blob，降低内存占用。
- 默认并发 2；支持单任务/全部暂停、继续、取消和失败重试。
- 活动任务“暂停”会调用 `abort()` 真正断开当前下载连接；“继续”会先检查/自愈媒体地址，再从该文件起点重新下载。**不宣称字节级断点续传。**
- shadcn 风格的媒体选择 Dialog、右侧下载任务中心与最小化 Progress Dock，媒体列表使用真实缩略图。
- 页面增强使用一个共享 MutationObserver 和 microtask 批处理，无永久 `setInterval`、无持续 rAF、无 fetch/XHR 网络 Hook。
- 广告、敏感媒体和成人引流垃圾采用独立 Clean-Room 证据决策；成人内容本身不是隐藏条件。

## 隐私与网络行为

XMD **无遥测、无统计上报、无广告、无返佣、无挖矿、无付费解锁**。项目支持提示只把真实下载成功计数保存在本机 `localStorage`，不会上传使用次数、媒体地址、Tweet、账号或下载历史。

脚本仅在实际下载或按需验证媒体时访问 `video.twimg.com` / `pbs.twimg.com`。GitHub 与未来的 Greasy Fork 链接只有用户主动点击时才会打开。

## 项目支持提示

只有真实 `GM_download.onload` 成功后才累计成功证据和有效会话。提示分为 3 天 / 14 天 / 45 天三个递增阶段；关闭按钮只关闭当前阶段，点击项目 GitHub 或 Greasy Fork 后永久停止后续提示。该模块不影响任何下载和页面增强能力。

## 构建与验证

需要 Node.js 22 或兼容版本，无 npm 运行时依赖：

```bash
node --test
node scripts/build.mjs
node scripts/release-gate.mjs dist/x-media-downloader.user.js
node scripts/sha256.mjs dist/x-media-downloader.user.js
```

构建产物保持未压缩、未混淆并保留中文注释，便于 Greasy Fork 用户与审核者直接审阅。

## 许可证与官方来源

本项目以 **GNU General Public License v3.0 only (`GPL-3.0-only`)** 发布。完整许可证见 `LICENSE`；官方来源和哈希验证说明见 `AUTHENTICITY.md`；版权和真实性声明见 `NOTICE`。

唯一官方 GitHub 仓库：`xiaohuitongxue88-ctrl/x-media-downloader`
