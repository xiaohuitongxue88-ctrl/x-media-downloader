# X Media Downloader · Clean-Room 首发前审计

审计日期：2026-08-18

状态：**AUTOMATED PASS / 等待 Chrome + Tampermonkey LIVE 验证**

## 审计目标

本审计用于确认 X Media Downloader（XMD）候选构建满足当前项目的 Clean-Room、低资源、发布治理与 Greasy Fork 预发布约束。它不是法律意义上的原创性鉴定，也不声称穷尽互联网全部代码；其作用是建立可重复的工程证据链。

## 自动验证结果

- Node.js 自动测试：51 / 51 PASS。
- 构建器：PASS；24 个源模块合并为单一、未压缩 userscript。
- Release Gate：PASS。
- 候选脚本大小：99,192 bytes。
- 永久 `setInterval`：0。
- fetch/XMLHttpRequest 网络 Hook：0。
- `unsafeWindow`：0。
- 外部 `@require`：0。
- `@match`：仅 `https://x.com/*`、`https://twitter.com/*`。
- `@connect`：仅 `video.twimg.com`、`pbs.twimg.com`。
- 许可证：GPL-3.0-only；仓库含 GNU GPLv3 完整 `LICENSE`。

## Clean-Room 长片段审计

审计工具：`scripts/similarity-audit.mjs`

方法：去除注释后进行 JavaScript 词法近似分词，以连续 24-token shingle 检查新构建与参考源码之间的完全相同长窗口。24-token 为本项目内部的保守工程阈值，不等同于法律相似性标准。

结果：

- 旧稳定参考 `X-Twitter_嗅探与全域特权器_V1.0.6.1...user.js`：**0 个相同 24-token shingle**。
- BetterX 2.4.0：**0 个相同 24-token shingle**。

在第一次审计中，旧稳定参考曾发现 29 个相同 24-token 窗口，集中在 Tweet 外链统计和 `<video>` 属性赋值。随后将两处实现结构独立重写，再次审计后归零。BetterX 在该阈值下自第一次正式检查起即为 0。

## 公开代表项目抽查

通过 GitHub 公开仓库抽查 `zimza1abim/X-Twitter-Media-Downloader-Userscript` 与 `AlttiRi/twitter-click-and-save`，搜索 XMD 独有标识 `xmd-page-sensitive-media`、`findBoundary`、`xiaohuitongxue.xmd.support.v1`，未发现匹配结果。

该结果只说明所抽查索引中未发现这些 XMD 独有标识，不代表互联网范围的绝对唯一性。

## 高相似风险区重写结论

- 广告过滤：使用 XMD “证据列表 → direct/strong/weak 决策”模型；不迁移旧项目或 BetterX 的模块结构。
- 敏感媒体：使用“当前分支无媒体、父级首次出现真实媒体”的最小边界算法；不使用固定 14 层祖先遍历。
- 成人引流垃圾：采用“成人内容轴 + 引流行为轴”；不迁移旧词表、旧模板正则和旧评分表；成人内容单独出现永不触发隐藏。
- DOM 生命周期：单 MutationObserver + Set + queueMicrotask 批处理；无永久轮询。

## 当前候选构建

文件：`dist/x-media-downloader.user.js`

SHA-256：`4374c33ceb5e36148fbfeb89c08e4b6d105c57fb5eee914f52ecb1347d6ae9d7`

该哈希仅对应当前 0.1.0 LIVE 测试候选；若现场测试后修改任何字节，必须重新构建并生成新 SHA-256。

## 尚未完成的发布门禁

唯一未完成项是 **Chrome + Tampermonkey LIVE 验证**。在 LIVE PASS 前：

- 不合并为正式 `v1.0.0` 发布；
- 不创建 `v1.0.0` Tag / Release；
- 不发布 Greasy Fork；
- Greasy Fork 正式 Script ID 仍为空，因此 UI 隐藏对应入口。
