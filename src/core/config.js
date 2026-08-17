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
        issuesUrl: 'https://github.com/xiaohuitongxue88-ctrl/x-media-downloader/issues',
        // Greasy Fork 首发完成并取得正式 Script ID 后再填写；为空时 UI 自动隐藏入口。
        greasyForkUrl: ''
    });
