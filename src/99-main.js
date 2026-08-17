    // =============================================================================
    // XMD · 主入口
    // =============================================================================
    // 初始化只建立事件驱动组件。页面没有媒体操作时，不启动下载探针，也不持续轮询。
    const downloadManager = XMD.download.createManager({
        concurrency: XMD.config.downloadConcurrency,
        onSuccess(task) {
            // 真实成功证据只来自 GM_download.onload；后续支持提示模块只监听这一事件。
            try {
                document.dispatchEvent(new CustomEvent('xmd:download-success', {
                    detail: {
                        taskId: task.id,
                        kind: task.media?.kind || 'media',
                        tweetId: task.media?.tweetId || ''
                    }
                }));
            } catch {}
        }
    });

    let taskCenterController = null;
    XMD.progressDock.mount(() => taskCenterController?.show?.());
    taskCenterController = XMD.taskCenter.mount(downloadManager, XMD.config);

    const collectCurrentMedia = (article, anchor) => XMD.media.collectCurrent({
        article,
        fiberAnchor: anchor || article
    });

    XMD.floatingTrigger.mount(async ({ article, anchor }) => {
        const mediaItems = collectCurrentMedia(article, anchor);

        XMD.mediaPicker.open(mediaItems, {
            onConfirm(selection) {
                for (const entry of selection) {
                    downloadManager.enqueue(entry.media, entry.filename, {
                        // 继续或重试时只重扫同一个 Tweet；不跨时间线寻找替代资源。
                        collectFresh: () => Promise.resolve(collectCurrentMedia(article, XMD.floatingTrigger.anchorFor(article) || anchor))
                    });
                }
                taskCenterController?.show?.();
            }
        });
    });

    XMD.domRouter.start();
    XMD.supportPrompt.mount(XMD.config);

    // 仅提供只读诊断入口，方便现场排查；不上传任何数据。
    XMD.runtime = Object.freeze({
        downloadManager,
        getTaskCount: () => downloadManager.list().length
    });

    Object.freeze(XMD);
})();
