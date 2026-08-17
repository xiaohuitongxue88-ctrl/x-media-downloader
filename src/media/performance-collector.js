    // =============================================================================
    // XMD · Performance 弱证据兜底
    // =============================================================================
    // 只有 URL 中的媒体身份与当前 Tweet 已有证据一致时才接纳，避免把时间线其它视频串入当前任务。
    XMD.performanceCollector = Object.freeze({
        collect(context = {}, suppliedEntries) {
            const mediaIds = context.mediaIds instanceof Set ? context.mediaIds : new Set(context.mediaIds || []);
            if (!mediaIds.size) return [];

            let entries = suppliedEntries;
            if (!entries) {
                try {
                    entries = performance.getEntriesByType('resource');
                } catch {
                    entries = [];
                }
            }

            const candidates = [];
            for (const entry of [...(entries || [])].slice(-120)) {
                const rawUrl = String(entry?.name || '');
                const id = XMD.utils.mediaIdentity(rawUrl, 'video');
                const mediaId = id.startsWith('video:') ? id.slice(6) : '';
                if (!mediaId || !mediaIds.has(mediaId)) continue;
                const size = XMD.utils.resolutionFromUrl(rawUrl);
                candidates.push({
                    id,
                    kind: 'video',
                    url: rawUrl,
                    poster: '',
                    format: /\.m3u8(?:$|\?)/i.test(rawUrl) ? 'hls' : XMD.utils.formatFromUrl(rawUrl),
                    bitrate: 0,
                    width: size.width,
                    height: size.height,
                    evidence: 'weak',
                    source: 'performance'
                });
            }
            return XMD.utils.uniqueBy(candidates, item => `${item.id}|${item.url}`);
        }
    });
