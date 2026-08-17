    // =============================================================================
    // XMD · 媒体候选归一化与质量选择
    // =============================================================================
    XMD.media = Object.freeze({
        kindFromTwitterType(type) {
            return String(type || '').toLowerCase() === 'animated_gif' ? 'gif' : 'video';
        },

        normalizeCandidate(candidate) {
            if (!candidate?.url) return null;
            const item = { ...candidate };
            item.kind = item.kind || 'video';
            if (item.kind === 'image') {
                item.url = XMD.utils.toOriginalImage(item.url);
            }
            item.bitrate = Math.max(0, Number(item.bitrate || 0));
            item.width = Math.max(0, Number(item.width || 0));
            item.height = Math.max(0, Number(item.height || 0));
            item.evidence = item.evidence || 'unknown';
            item.format = String(item.format || '').toLowerCase();
            return item;
        },

        compare(a, b) {
            const aMp4 = a.format === 'mp4' ? 1 : 0;
            const bMp4 = b.format === 'mp4' ? 1 : 0;
            if (aMp4 !== bMp4) return bMp4 - aMp4;

            if (a.bitrate !== b.bitrate) return b.bitrate - a.bitrate;

            const areaA = XMD.utils.resolutionArea(a);
            const areaB = XMD.utils.resolutionArea(b);
            if (areaA !== areaB) return areaB - areaA;

            const evidenceA = XMD.evidence[a.evidence] || 0;
            const evidenceB = XMD.evidence[b.evidence] || 0;
            if (evidenceA !== evidenceB) return evidenceB - evidenceA;

            return String(a.url).localeCompare(String(b.url));
        },

        collectCurrent({ article, fiberAnchor = article, performanceEntries } = {}) {
            const context = XMD.tweetContext.read(article);
            const primary = [
                ...XMD.domCollector.collect(article),
                ...XMD.fiberCollector.collect(fiberAnchor)
            ];

            const mediaIds = new Set(
                primary
                    .map(item => String(item.id || '').split(':')[1] || '')
                    .filter(Boolean)
            );
            let candidates = primary;
            const hasVideoEvidence = primary.some(item => item.kind === 'video' || item.kind === 'gif');
            if (!hasVideoEvidence && mediaIds.size) {
                candidates = candidates.concat(
                    XMD.performanceCollector.collect({ mediaIds }, performanceEntries)
                );
            }

            return this.selectBest(candidates).map(item => ({
                ...item,
                tweetId: context.tweetId,
                tweetUrl: context.tweetUrl,
                author: context.author,
                text: context.text
            }));
        },

        selectBest(candidates) {
            const groups = new Map();
            for (const raw of candidates || []) {
                const item = this.normalizeCandidate(raw);
                if (!item?.id) continue;
                const group = groups.get(item.id) || [];
                group.push(item);
                groups.set(item.id, group);
            }

            const selected = [];
            for (const group of groups.values()) {
                group.sort((a, b) => this.compare(a, b));
                selected.push(group[0]);
            }
            return selected;
        }
    });
