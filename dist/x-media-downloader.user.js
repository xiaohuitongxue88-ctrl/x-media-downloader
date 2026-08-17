// ==UserScript==
// @name         X Media Downloader
// @namespace    https://github.com/xiaohuitongxue88-ctrl/x-media-downloader
// @version      0.1.0
// @description  X / Twitter 浏览器媒体下载与轻量增强工具。
// @author       xiaohuitongxue
// @license      GPL-3.0-only
// @homepageURL  https://github.com/xiaohuitongxue88-ctrl/x-media-downloader
// @supportURL   https://github.com/xiaohuitongxue88-ctrl/x-media-downloader/issues
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      video.twimg.com
// @connect      pbs.twimg.com
// ==/UserScript==

/*
 * X Media Downloader
 * Copyright (C) 2026 xiaohuitongxue
 *
 * 本程序依据 GNU General Public License v3.0 only 发布。
 * 官方仓库：https://github.com/xiaohuitongxue88-ctrl/x-media-downloader
 */

(() => {
    'use strict';

    // =============================================================================
    // XMD · 启动边界
    // =============================================================================
    // 所有运行时对象都封装在当前 IIFE 内，避免向 X 页面注入无关全局变量。
    // 后续模块只通过 XMD 命名空间协作，保持职责边界和审计路径清晰。
    const XMD = Object.create(null);

    // =============================================================================
    // XMD · 项目身份与基础配置
    // =============================================================================
    // 该对象仅保存静态项目身份，不联网、不参与授权、不限制任何功能。
    XMD.build = Object.freeze({
        project: 'x-media-downloader',
        owner: 'xiaohuitongxue',
        repository: 'xiaohuitongxue88-ctrl/x-media-downloader',
        version: '0.1.0'
    });

    XMD.config = Object.freeze({
        downloadConcurrency: 2,
        repositoryUrl: 'https://github.com/xiaohuitongxue88-ctrl/x-media-downloader',
        issuesUrl: 'https://github.com/xiaohuitongxue88-ctrl/x-media-downloader/issues'
    });

    // =============================================================================
    // XMD · 主入口
    // =============================================================================
    // 当前阶段只完成 Clean-Room 基础设施；功能模块将在各自测试通过后接入。
    Object.freeze(XMD);
})();
