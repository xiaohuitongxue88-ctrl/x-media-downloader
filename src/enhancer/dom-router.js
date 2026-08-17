    // =============================================================================
    // XMD · 页面增强共享事件路由
    // =============================================================================
    // 全部增强模块共用一个 MutationObserver。新增节点先进入 Set，再用一次 microtask 合并处理。
    XMD.domRouter = {
        observer: null,
        queuedRoots: new Set(),
        flushScheduled: false,
        started: false,

        installStyle() {
            if (document.getElementById('xmd-page-style')) return;
            const style = document.createElement('style');
            style.id = 'xmd-page-style';
            style.textContent = `
.xmd-page-ad-hidden,.xmd-page-spam-hidden,.xmd-page-sensitive-mask-hidden{display:none!important}
.xmd-page-sensitive-media{max-width:100%;overflow:hidden;border-radius:12px}
.xmd-page-sensitive-media video{display:block;width:100%;height:auto;max-height:80vh;background:#000}
            `.trim();
            (document.head || document.documentElement).appendChild(style);
        },

        processRoot(root) {
            if (!root?.querySelectorAll) return;
            try { XMD.adFilter?.process?.(root); } catch {}
            try { XMD.sensitiveMedia?.process?.(root); } catch {}
            try { XMD.spamFilter?.process?.(root); } catch {}
        },

        queue(root) {
            if (!root?.querySelectorAll) return;
            this.queuedRoots.add(root);
            if (this.flushScheduled) return;
            this.flushScheduled = true;
            queueMicrotask(() => {
                this.flushScheduled = false;
                const batch = [...this.queuedRoots];
                this.queuedRoots.clear();
                for (const item of batch) this.processRoot(item);
            });
        },

        start() {
            if (this.started || XMD.config?.pageEnhancer === false) return;
            if (!document.body) {
                document.addEventListener('DOMContentLoaded', () => this.start(), { once: true });
                return;
            }
            this.started = true;
            this.installStyle();
            this.processRoot(document);
            this.observer = new MutationObserver(records => {
                for (const record of records) {
                    for (const node of record.addedNodes) {
                        if (node?.nodeType === 1) this.queue(node);
                    }
                }
            });
            this.observer.observe(document.body, { childList: true, subtree: true });
        }
    };
