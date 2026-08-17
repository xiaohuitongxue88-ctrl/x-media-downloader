    // =============================================================================
    // XMD · DOM 直接媒体证据
    // =============================================================================
    // 只读取调用方传入的 Tweet/播放器作用域，不扫描页面其它 Tweet，也不触发网络请求。
    XMD.domCollector = Object.freeze({
        collect(scope) {
            if (!scope?.querySelectorAll) return [];
            const candidates = [];

            for (const video of scope.querySelectorAll('video')) {
                const sources = [];
                if (video.currentSrc) sources.push(video.currentSrc);
                if (video.src) sources.push(video.src);
                for (const source of video.querySelectorAll?.('source') || []) {
                    if (source.src) sources.push(source.src);
                }

                for (const rawUrl of [...new Set(sources)]) {
                    const id = XMD.utils.mediaIdentity(rawUrl, 'video');
                    if (!id) continue;
                    const parsedSize = XMD.utils.resolutionFromUrl(rawUrl);
                    candidates.push({
                        id,
                        kind: 'video',
                        url: rawUrl,
                        poster: video.poster || '',
                        format: XMD.utils.formatFromUrl(rawUrl),
                        bitrate: 0,
                        width: Number(video.videoWidth || parsedSize.width || 0),
                        height: Number(video.videoHeight || parsedSize.height || 0),
                        evidence: 'direct',
                        source: 'dom'
                    });
                }
            }

            for (const image of scope.querySelectorAll('img[src*="pbs.twimg.com/media/"]')) {
                const rawUrl = image.currentSrc || image.src || '';
                const id = XMD.utils.mediaIdentity(rawUrl, 'image');
                if (!id) continue;
                candidates.push({
                    id,
                    kind: 'image',
                    url: XMD.utils.toOriginalImage(rawUrl),
                    poster: rawUrl,
                    format: XMD.utils.formatFromUrl(rawUrl),
                    bitrate: 0,
                    width: Number(image.naturalWidth || 0),
                    height: Number(image.naturalHeight || 0),
                    evidence: 'direct',
                    source: 'dom'
                });
            }

            return XMD.utils.uniqueBy(candidates, item => `${item.id}|${item.url}`);
        }
    });
