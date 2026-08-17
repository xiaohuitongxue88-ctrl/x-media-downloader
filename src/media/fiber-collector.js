    // =============================================================================
    // XMD · React 结构化媒体证据
    // =============================================================================
    // 仅在用户动作关联的当前节点范围读取已经存在的 React 数据，并设置节点数与深度硬预算。
    XMD.fiberCollector = Object.freeze({
        collect(anchor, limits = {}) {
            if (!anchor || (typeof anchor !== 'object' && typeof anchor !== 'function')) return [];
            const maxNodes = Math.max(20, Math.min(2000, Number(limits.maxNodes || 700)));
            const maxDepth = Math.max(2, Math.min(20, Number(limits.maxDepth || 10)));
            const roots = [];

            for (const key of Object.keys(anchor)) {
                if (key.startsWith('__reactProps$') || key.startsWith('__reactFiber$')) {
                    roots.push(anchor[key]);
                }
            }
            if (!roots.length) return [];

            const queue = roots.map(value => ({ value, depth: 0 }));
            const seen = new WeakSet();
            const candidates = [];
            let visited = 0;

            while (queue.length && visited < maxNodes) {
                const { value, depth } = queue.shift();
                if (!value || (typeof value !== 'object' && typeof value !== 'function')) continue;
                if (seen.has(value)) continue;
                seen.add(value);
                visited += 1;

                const variants = value?.video_info?.variants;
                if (Array.isArray(variants) && variants.length) {
                    const explicitId = String(value.id_str || value.id || value.media_id_string || value.media_key || '');
                    const kind = XMD.media.kindFromTwitterType(value.type);
                    for (const variant of variants) {
                        const rawUrl = variant?.url || '';
                        if (!rawUrl) continue;
                        const format = /mpegurl|m3u8/i.test(`${variant.content_type || ''} ${rawUrl}`) ? 'hls' : XMD.utils.formatFromUrl(rawUrl);
                        const parsedSize = XMD.utils.resolutionFromUrl(rawUrl);
                        const id = XMD.utils.mediaIdentity(rawUrl, kind, explicitId) || XMD.utils.mediaIdentity(rawUrl, kind);
                        if (!id) continue;
                        candidates.push({
                            id,
                            kind,
                            url: rawUrl,
                            poster: value.media_url_https || '',
                            format,
                            bitrate: Math.max(0, Number(variant.bitrate || 0)),
                            width: Number(value.original_info?.width || parsedSize.width || 0),
                            height: Number(value.original_info?.height || parsedSize.height || 0),
                            evidence: 'strong',
                            source: 'fiber'
                        });
                    }
                }

                if (depth >= maxDepth) continue;
                const values = Array.isArray(value) ? value : Object.values(value);
                for (const child of values) {
                    if (child && (typeof child === 'object' || typeof child === 'function')) {
                        queue.push({ value: child, depth: depth + 1 });
                    }
                }
            }

            return XMD.utils.uniqueBy(candidates, item => `${item.id}|${item.url}`);
        }
    });
