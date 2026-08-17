    // =============================================================================
    // XMD · 按需媒体自愈
    // =============================================================================
    // 只在下载动作需要时验证 video.twimg.com。单次 401/403 不直接判死，必须普通 GET 再复核。
    XMD.recovery = {
        classifyHttpStatus(status) {
            const code = Number(status || 0);
            if (code === 200 || code === 206) return { state: 'valid', status: code };
            if (code === 401 || code === 403) return { state: 'forbidden', status: code };
            if (code === 404 || code === 410) return { state: 'gone', status: code };
            return { state: 'unknown', status: code };
        },

        requestOnce(rawUrl, useRange, request) {
            return new Promise(resolve => {
                let settled = false;
                const finish = result => {
                    if (settled) return;
                    settled = true;
                    resolve(result);
                };
                const headers = { Accept: '*/*' };
                if (useRange) headers.Range = 'bytes=0-1';

                try {
                    request({
                        method: 'GET',
                        url: rawUrl,
                        headers,
                        timeout: 8000,
                        onload: response => finish(this.classifyHttpStatus(response?.status)),
                        onerror: () => finish({ state: 'unknown', status: 0, reason: 'network' }),
                        ontimeout: () => finish({ state: 'unknown', status: 0, reason: 'timeout' })
                    });
                } catch {
                    finish({ state: 'unknown', status: 0, reason: 'exception' });
                }
            });
        },

        async probeTwitterUrl(rawUrl, request = GM_xmlhttpRequest) {
            const ranged = await this.requestOnce(rawUrl, true, request);
            if (ranged.state === 'forbidden') {
                return this.requestOnce(rawUrl, false, request);
            }
            return ranged;
        },

        async validate(media, request = GM_xmlhttpRequest) {
            if (!media?.url) return { state: 'unknown', status: 0, reason: 'empty-url' };
            const url = XMD.utils.toUrl(media.url);
            if (!url || url.hostname !== 'video.twimg.com') {
                return { state: 'unknown', status: 0, reason: 'not-video-cdn' };
            }
            return this.probeTwitterUrl(url.href, request);
        },

        async prepare(media, options = {}) {
            if (!media?.url) return { media, recovered: false, validation: { state: 'unknown', status: 0 } };
            const validation = await this.validate(media, options.request);

            // 网络未知时保持 fail-open：不把可用 URL 因探针异常而提前丢弃。
            if (validation.state === 'valid' || validation.state === 'unknown') {
                return { media, recovered: false, validation };
            }

            if (typeof options.collectFresh !== 'function') {
                return { media, recovered: false, validation };
            }

            const fresh = await options.collectFresh();
            const sameIdentity = (fresh || []).filter(item => item?.id && item.id === media.id);
            if (!sameIdentity.length) {
                return { media, recovered: false, validation };
            }

            let next = sameIdentity[0];
            if (XMD.media?.selectBest) {
                next = XMD.media.selectBest(sameIdentity)[0] || next;
            }
            return { media: next, recovered: next.url !== media.url, validation };
        }
    };
