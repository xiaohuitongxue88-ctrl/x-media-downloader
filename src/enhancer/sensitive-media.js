    // =============================================================================
    // XMD · 敏感媒体安全揭罩
    // =============================================================================
    // 不使用固定祖先层数。算法寻找“当前分支没有媒体、父级首次出现真实媒体”的最小边界。
    XMD.sensitiveMedia = Object.freeze({
        warningPattern: /(?:年龄|成人|敏感).{0,14}(?:限制|内容|媒体|查看)|(?:verify|confirm).{0,12}age|sensitive.{0,8}media/i,

        hasRenderableMedia(node) {
            if (!node?.querySelector) return false;
            return Boolean(
                node.querySelector('video') ||
                node.querySelector('img[src*="pbs.twimg.com/media/"]') ||
                node.querySelector('[data-testid="videoPlayer"]') ||
                node.querySelector('[data-testid^="card."]')
            );
        },

        findWarning(article) {
            if (!article?.querySelectorAll) return null;
            for (const node of article.querySelectorAll('span, [dir="ltr"]')) {
                if (node.closest?.('[data-testid="tweetText"]')) continue;
                const text = String(node.textContent || '').trim();
                if (text && text.length <= 320 && this.warningPattern.test(text)) return node;
            }
            return null;
        },

        findBoundary(warning, article, containsMedia = node => this.hasRenderableMedia(node)) {
            if (!warning || !article) return null;
            let branch = warning;
            while (branch && branch !== article) {
                const parent = branch.parentElement;
                if (!parent) return null;
                if (!containsMedia(branch) && containsMedia(parent)) return branch;
                branch = parent;
            }
            return null;
        },

        injectConfirmedVideo(article, warning) {
            if (!XMD.media?.collectCurrent) return false;
            const items = XMD.media.collectCurrent({ article, fiberAnchor: article });
            const media = items.find(item => (item.kind === 'video' || item.kind === 'gif') && item.format === 'mp4' && item.url);
            if (!media) return false;

            const anchor = warning.closest?.('[role="button"]') || warning.parentElement;
            if (!anchor || anchor === article || !anchor.parentElement) return false;
            const box = document.createElement('div');
            box.className = 'xmd-page-sensitive-media';
            const video = document.createElement('video');
            video.src = media.url;
            video.poster = media.poster || '';
            video.controls = true;
            video.playsInline = true;
            video.preload = 'metadata';
            box.appendChild(video);
            anchor.classList?.add('xmd-page-sensitive-mask-hidden');
            anchor.insertAdjacentElement?.('afterend', box);
            return true;
        },

        processArticle(article) {
            if (XMD.config?.unlockSensitiveMedia === false || !article?.querySelector) return false;
            if (article.querySelector('.xmd-page-sensitive-media')) return true;
            const warning = this.findWarning(article);
            if (!warning) return false;

            const boundary = this.findBoundary(warning, article);
            if (boundary) {
                boundary.classList?.add('xmd-page-sensitive-mask-hidden');
                return true;
            }

            // DOM 没有可安全揭出的实体时，只接受 XMD 当前 Tweet 采集器确认的 MP4 证据。
            return this.injectConfirmedVideo(article, warning);
        },

        process(root) {
            if (XMD.config?.unlockSensitiveMedia === false || !root?.querySelectorAll) return;
            const articles = new Set();
            if (root.matches?.('article')) articles.add(root);
            const owner = root.closest?.('article');
            if (owner) articles.add(owner);
            for (const article of root.querySelectorAll('article')) articles.add(article);
            for (const article of articles) this.processArticle(article);
        }
    });
