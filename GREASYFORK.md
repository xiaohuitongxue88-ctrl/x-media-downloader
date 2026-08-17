# X Media Downloader — Greasy Fork 发布说明

X Media Downloader 是 X / Twitter 的浏览器媒体下载与轻量增强脚本，支持视频、GIF、原图、多任务队列、真实下载进度、暂停断连、继续自愈，以及低资源页面增强。无需本地后端。

## 功能说明

视频会优先选择当前 Tweet 证据中同一媒体身份的最高质量 MP4；图片请求原图 `name=orig`；GIF 按 X 的 `animated_gif` 类型识别。下载由 Tampermonkey `GM_download` 交给浏览器完成。

“暂停”会终止当前活动下载连接并保留任务；“继续”会重新校验或自愈媒体地址，然后从该文件起点重新开始，因此本脚本不把它描述为字节级断点续传。

脚本附带广告过滤、敏感媒体显示增强和成人引流垃圾过滤。**正常成人内容本身不会作为垃圾内容隐藏条件。** 由于功能涉及敏感/成人媒体的显示处理，Greasy Fork 首发时必须在发布页面正确标记为含成人内容。

## 隐私

- 无遥测、无用户行为上传。
- 无广告、无返佣链接、无挖矿、无付费解锁。
- 不远程加载可执行代码，不使用 `@require`。
- 项目支持提示的数据只保存在浏览器本机 `localStorage`。
- 支持/反馈链接完全自愿，不影响任何功能。

## 发布前检查

1. `node --test` 全部通过。
2. `node scripts/build.mjs` 生成未压缩、未混淆的 `dist/x-media-downloader.user.js`。
3. `node scripts/release-gate.mjs dist/x-media-downloader.user.js` 必须 PASS。
4. 代码大小低于 Greasy Fork 2.0 MB 上限；`@match` 只包含 `x.com` 与 `twitter.com`。
5. 不含 `eval`、`new Function`、动态远程 `<script>`、永久 `setInterval`、fetch/XHR Hook 或 `unsafeWindow`。
6. 检查许可证、作者、官方仓库、描述、更新日志和成人内容标记。
7. Chrome + Tampermonkey LIVE 验证通过后再发布；GitHub Release 与 Greasy Fork 必须使用同一份 dist 文件。
8. Greasy Fork 首发取得 Script ID 后，将唯一正式地址写入 `AUTHENTICITY.md` 和 `XMD.config.greasyForkUrl`。

## 项目支持提示

提示仅在真实成功使用后按多阶段阈值出现，不遮挡页面、不阻断下载。× 只结束当前阶段提示；用户主动点击 GitHub 或 Greasy Fork 后永久停止后续支持提示。该模块无遥测，也不要求关注、点赞、入群、登录或付费才能使用脚本。
