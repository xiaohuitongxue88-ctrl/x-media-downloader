    // =============================================================================
    // XMD · 通用纯函数
    // =============================================================================
    // 这里只放不依赖页面状态的基础能力，便于单元测试和后续审计。
    XMD.utils = Object.freeze({
        toUrl(value, base = 'https://x.com/') {
            try {
                return new URL(String(value || ''), base);
            } catch {
                return null;
            }
        },

        toOriginalImage(rawUrl) {
            const url = this.toUrl(rawUrl);
            if (!url || url.hostname !== 'pbs.twimg.com' || !url.pathname.startsWith('/media/')) {
                return String(rawUrl || '');
            }
            url.searchParams.set('name', 'orig');
            return url.href;
        },

        formatFromUrl(rawUrl) {
            const url = this.toUrl(rawUrl);
            if (!url) return '';
            const queryFormat = url.searchParams.get('format');
            if (queryFormat) return queryFormat.toLowerCase();
            const match = url.pathname.match(/\.([a-z0-9]{2,5})$/i);
            return match ? match[1].toLowerCase() : '';
        },

        resolutionFromUrl(rawUrl) {
            const url = this.toUrl(rawUrl);
            const match = url?.pathname.match(/\/vid\/(\d+)x(\d+)\//i);
            return match
                ? { width: Number(match[1]), height: Number(match[2]) }
                : { width: 0, height: 0 };
        },

        mediaIdentity(rawUrl, kind = 'video', explicitId = '') {
            if (explicitId) return `${kind}:${String(explicitId)}`;
            const url = this.toUrl(rawUrl);
            if (!url) return '';

            if (kind === 'image' && url.hostname === 'pbs.twimg.com') {
                const imageMatch = url.pathname.match(/^\/media\/([^/?]+)/i);
                return imageMatch ? `image:${imageMatch[1]}` : '';
            }

            if (url.hostname === 'video.twimg.com') {
                const videoMatch = url.pathname.match(/\/(?:ext_tw_video|amplify_video|tweet_video)\/(\d+)(?:\/|$)/i);
                if (videoMatch) return `${kind}:${videoMatch[1]}`;
            }
            return '';
        },

        twitterVideoId(rawUrl) {
            const url = this.toUrl(rawUrl);
            if (!url) return '';
            const match = url.pathname.match(/\/(?:ext_tw_video|amplify_video|tweet_video)(?:_thumb)?\/(\d+)(?:\/|$)/i);
            return match?.[1] || '';
        },

        resolutionArea(candidate) {
            return Math.max(0, Number(candidate?.width || 0)) * Math.max(0, Number(candidate?.height || 0));
        },

        uniqueBy(items, keyOf) {
            const out = new Map();
            for (const item of items || []) {
                const key = keyOf(item);
                if (!key || out.has(key)) continue;
                out.set(key, item);
            }
            return [...out.values()];
        }
    });
