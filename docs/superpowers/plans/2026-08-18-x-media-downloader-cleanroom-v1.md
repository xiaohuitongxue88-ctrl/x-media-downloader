# X Media Downloader Clean-Room V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 从零实现原创 X / Twitter 浏览器媒体下载器：视频/GIF/原图、多任务、暂停断连、继续自愈、低资源页面增强，并满足 GPL-3.0-only 与 Greasy Fork 发布规则。

**Architecture:** 新仓库不复制旧 V1.0.6.1、BetterX 或其他公开脚本源码。旧脚本只作为行为回归样本；公开同类项目只用于确认共同问题。源码按职责拆分，使用 Node.js 零依赖脚本拼接为一份未压缩、未混淆、保留中文注释的 userscript。

**Tech Stack:** JavaScript ES2022、Tampermonkey `GM_download`/`GM_xmlhttpRequest`、DOM/React Fiber 只读证据、Performance API、MutationObserver、Node.js `node:test`/`vm`/`crypto`。

## Global Constraints

- 身份：`xiaohuitongxue`；代号 `XMD`；仓库 `xiaohuitongxue88-ctrl/x-media-downloader`。
- 许可证：`GPL-3.0-only`；必须有 `LICENSE`、`NOTICE`、`AUTHENTICITY.md`。
- 0 运行时第三方依赖；不 `@require`；不 `eval`；不远程加载可执行代码。
- 只匹配 `x.com` / `twitter.com`；媒体 CDN 仅用于下载与按需验证。
- 单共享 MutationObserver；无永久 `setInterval`；无持续 rAF；无 fetch/XHR hook。
- `GM_download` 为主下载通道；禁止大媒体默认走 XHR->Blob。
- 并发默认 2。活动任务“暂停”= `abort()` 真实断连；“继续”= URL 校验/自愈后从 0 重新开始该文件，不声称字节级续传。
- 支持提示只在 `GM_download.onload` 真实成功后累计；页面打开、入队、开始请求、失败、取消均不计成功。
- 三级支持提示：3/14/45 天；× 仅关闭当前阶段；点击 GitHub/Greasy Fork 后永久停止；本地状态，无遥测。
- 全部正式注释重新写中文；禁止旧项目注释、BetterX/XVault/xvault/xsn 身份痕迹。
- 发布前必须通过自动测试、相似度复核、Greasy Fork Gate、Chrome+Tampermonkey LIVE 验证。

## Clean-Room Boundary

**只继承行为需求：** 当前 Tweet 媒体识别、最高比特率 MP4、图片 `name=orig`、GIF MP4、DOM/Fiber/Performance 分层证据、过期/403/404 自愈、多任务 UI、广告/敏感媒体/成人引流过滤目标。

**禁止继承源码：** 不复制旧 V1.0.6.1 的 PageEnhancer/广告/敏感遮罩/成人垃圾实现；不复制任何公开脚本词表、正则、固定祖先层数、函数结构、CSS 类名、变量名、注释或 UI 文案；不得靠改变量名或删注释伪装原创。

**高风险区必须重写：**
1. 广告过滤改成 XMD 的“证据规则表 -> 决策器”。
2. 敏感遮罩改成“最小边界关系”算法，不使用固定 14 层上溯。
3. 成人垃圾改成“成人内容风险轴 + 引流/机器人行为轴”；成人内容单独出现永不隐藏。
4. 共享 Observer 改成 `Set + queueMicrotask(flush)` 批处理。

## File Map

```text
src/core/{config,utils,evidence}.js
src/media/{tweet-context,dom-collector,fiber-collector,performance-collector,media-collector,recovery}.js
src/download/download-manager.js
src/ui/{icons,styles,floating-trigger,media-picker,task-center,progress-dock}.js
src/enhancer/{dom-router,ad-filter,sensitive-media,spam-filter}.js
src/support/support-prompt.js
src/00-bootstrap.js
src/99-main.js
scripts/{build,release-gate,sha256}.mjs
tests/*.test.mjs
dist/x-media-downloader.user.js
LICENSE NOTICE AUTHENTICITY.md README.md GREASYFORK.md CHANGELOG.md
```

## Task 1 — 项目骨架与元数据门禁

- [ ] 先写 `tests/release-gate.test.mjs`，要求 `@namespace` 指向官方仓库、`@author xiaohuitongxue`、`@license GPL-3.0-only`、`@match` 仅 x/twitter。
- [ ] 运行 `node --test`，确认因 gate 未实现而失败。
- [ ] 实现 `scripts/release-gate.mjs`：拒绝 `eval`、`new Function`、非空 `@require`、动态远程 script、无关 `@match`、旧项目身份标识。
- [ ] 实现 `scripts/build.mjs`，按固定顺序拼接 src，输出一个 IIFE userscript，保留全部中文注释。
- [ ] Header 使用 `GM_download`、`GM_xmlhttpRequest`、`GM_openInTab`，`@connect` 仅 `video.twimg.com` / `pbs.twimg.com`。
- [ ] 运行 `node --test && node scripts/build.mjs && node scripts/release-gate.mjs dist/x-media-downloader.user.js`，必须 PASS。
- [ ] Commit: `chore: establish XMD clean-room foundation`。

## Task 2 — 当前 Tweet 媒体证据采集

- [ ] 先写排序测试：同一视频身份同时存在低码率 MP4、高码率 MP4、HLS 时必须选高码率 MP4。
- [ ] DOM 快速路径只读当前 article/player 内真实 video/source/poster 和 pbs 图片。
- [ ] Fiber 只在当前节点范围内读取已有 React 属性，设置节点数/深度硬预算；禁止网络 hook。
- [ ] Performance 仅在 DOM+Fiber 不足时读取近期条目，并必须有当前 Tweet 媒体 ID/poster/player 归属证据。
- [ ] 图片只修改 pbs URL 的 `name=orig`；GIF 仅在媒体对象明确 `animated_gif` 时分类，否则按 video。
- [ ] 输出统一 `MediaItem {id,kind,url,poster,bitrate,width,height,evidence,tweetId,author}`。
- [ ] 测试 PASS 后 Commit: `feat: add evidence-driven media collector`。

## Task 3 — MediaRecovery

- [ ] 写 200/206=valid、401/403=forbidden、404/410=gone 的失败测试。
- [ ] 对 `video.twimg.com` 按需 Range 0-1；只有 401/403 再普通 GET 复核；网络未知不得直接判死。
- [ ] 明确失效时 fresh 重扫当前 Tweet，按同一媒体身份取新最高质量候选。
- [ ] 探针异常但原 URL 存在时 fail-open，让 `GM_download` 最终尝试。
- [ ] Commit: `feat: add on-demand media recovery`。

## Task 4 — 下载队列与断连自愈

- [ ] 写并发测试：3 个任务入队时默认 2 active + 1 queued。
- [ ] `GM_download` transport 保存 abort handle；onprogress 更新进度；只有 onload 标 completed。
- [ ] 活动任务 pause 调用 abort 并释放槽位；queued pause 不发请求。
- [ ] resume 先 `recovery.prepare()`，成功后 attempt 进度归零重新入队。
- [ ] 支持 pauseAll/resumeAll/cancel/retry；暂停任务不占并发。
- [ ] 只有真实 onload 派发 `xmd:download-success`。
- [ ] Commit: `feat: add browser download task engine`。

## Task 5 — shadcn 风格 UI

- [ ] Floating Trigger 视觉锚点：内部 videoPlayer -> 真实 video -> 外层媒体容器；位置更新只做事件触发的单帧合并。
- [ ] Media Picker 是独立中央 Dialog：真实缩略图、默认全选、全选/视频GIF/图片筛选、加入队列后关闭。
- [ ] 右侧 Task Center：单任务进度、暂停/继续、取消、重试、全部暂停/继续、清理完成；顶部 GitHub Issues + Greasy Fork 入口。
- [ ] Greasy Fork Script ID 未产生前隐藏该入口，禁止拿 Tampermonkey 首页冒充脚本页。
- [ ] Task Center 隐藏后保留右下角 Progress Dock；点击恢复。
- [ ] 所有 CSS 限定 XMD 根节点；不改变 X 原生播放器布局。
- [ ] Commit: `feat: add XMD download user interface`。

## Task 6 — Clean-Room Page Enhancer

- [ ] 单 Observer 只收集新增根节点到 Set；一次 `queueMicrotask(flush)` 批处理。
- [ ] 广告模块返回 `{action, confidence, reasons}`；只有 direct/strong 证据才隐藏，弱证据 fail-open。
- [ ] 敏感遮罩算法：沿祖先链找“自身无真实媒体、父级开始有真实媒体”的最小遮罩；若 DOM 已有媒体只隐藏遮罩，否则只允许使用 XMD collector 确认的 MP4 补画。
- [ ] 成人垃圾建立全新两轴特征，不迁移旧词表/旧正则/旧分值：adultRisk 单独永远 KEEP；adultRisk+solicitation 或多项极强机器人引流证据才 HIDE。
- [ ] 必测：普通成人内容 KEEP；成人+Telegram营销 HIDE；“黄推机器人太多，注意举报” KEEP；已关注账号 KEEP。
- [ ] Commit: `feat: add clean-room page enhancer`。

## Task 7 — 三级低打扰支持提示

- [ ] localStorage key 固定 `xiaohuitongxue.xmd.support.v1`。
- [ ] 没有真实下载成功时 sessionCount 必须为 0；第一次真实成功才登记有效会话。
- [ ] 阈值：s1=3天/3会话/5成功/2类别；s2=14天/10会话/25成功/3类别/间隔10天；s3=45天/25会话/80成功/3类别/间隔30天。
- [ ] × 仅 dismiss 当前 stage；点击 GitHub/Greasy Fork 后 `permanentStop=true`。
- [ ] 只在真实成功事件和初始化状态恢复时判断资格；无 interval、无持续 rAF、无遥测。
- [ ] Commit: `feat: add evidence-driven support prompt`。

## Task 8 — GPL、防伪与 Greasy Fork Gate

- [ ] `LICENSE` 使用官方 GNU GPL v3 完整文本；源码版权头绑定 xiaohuitongxue 与官方仓库。
- [ ] `NOTICE`/`AUTHENTICITY.md` 声明唯一官方 GitHub；Greasy Fork ID 发布后补入；修改版不得冒充官方发布。
- [ ] 静态 `XMD.build={project:'x-media-downloader',owner:'xiaohuitongxue',version:'1.0.0'}`，不联网、不锁功能。
- [ ] `scripts/sha256.mjs` 生成 `SHA256SUMS.txt`。
- [ ] Gate 拒绝 >2MB、旧身份标识、混淆/疑似 minified 主体、永久 interval、远程代码、无关 match、缺失许可证/作者/namespace/supportURL。
- [ ] README/GREASYFORK 准确说明暂停断连、继续重新开始文件、无遥测、支持提示规则，并按 Greasy Fork 要求标记成人内容相关属性。
- [ ] Commit: `docs: add release authenticity and policy`。

## Task 9 — 首发验证

- [ ] `node --test`。
- [ ] `node scripts/build.mjs`。
- [ ] `node scripts/release-gate.mjs dist/x-media-downloader.user.js`。
- [ ] `node scripts/sha256.mjs dist/x-media-downloader.user.js`。
- [ ] 对旧 V1.0.6.1、BetterX、Greasy Fork/GitHub 代表脚本做结构/长片段复核；发现独特实现重合必须重写，禁止只改变量名。
- [ ] Chrome + Tampermonkey LIVE：视频/GIF/1-4图、时间线/详情页/SPA、敏感媒体、广告不误杀、成人内容保留/引流过滤、并发2、暂停断连、继续自愈、Dock、支持计数。
- [ ] 建议新仓库首发 `v1.0.0`，旧 UBD 版本不进入此仓库版本链。
- [ ] GitHub Release 与 Greasy Fork 发布同一份未压缩 dist；Release 附 SHA256SUMS。
- [ ] Commit: `release: prepare X Media Downloader v1.0.0`；Tag: `v1.0.0`。

## Self-Review

- 所有已确认功能均有实施任务。
- 高相似旧模块全部要求从需求重写。
- 没有把公共脚本源码作为新仓库 source input。
- 单 Observer、无永久 interval、无持续 rAF、无网络 hook、无大 Blob。
- 发布采用自动 Gate + 相似度复核 + LIVE 三重门禁。
