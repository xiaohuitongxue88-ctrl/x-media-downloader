    // =============================================================================
    // XMD · 媒体浮动触发器
    // =============================================================================
    // 位置只在指针进入媒体、滚动或尺寸变化时单帧更新，不运行持续动画循环。
    XMD.floatingTrigger = Object.freeze({
        anchorFor(article) {
            if (!article?.querySelector) return null;
            return article.querySelector('[data-testid="videoPlayer"]')
                || article.querySelector('video')
                || article.querySelector('[data-testid="tweetPhoto"], [data-testid="videoComponent"]')
                || null;
        },

        mount(onActivate) {
            if (typeof document === 'undefined' || !XMD.uiRoot?.ensure) return null;
            const root = XMD.uiRoot.ensure();
            let button = root.querySelector?.('#xmd-floating-trigger');
            if (button) return button.__xmdController || button;

            button = document.createElement('button');
            button.id = 'xmd-floating-trigger';
            button.className = 'xmd-floating-trigger';
            button.type = 'button';
            button.hidden = true;
            button.setAttribute('aria-label', '下载此 Tweet 媒体');
            button.title = '下载此 Tweet 媒体';
            button.innerHTML = XMD.icons.get('download');
            root.appendChild(button);

            let currentArticle = null;
            let currentAnchor = null;
            let frame = 0;

            const position = () => {
                frame = 0;
                if (!currentAnchor?.getBoundingClientRect) return;
                const rect = currentAnchor.getBoundingClientRect();
                if (rect.width < 24 || rect.height < 24 || rect.bottom < 0 || rect.top > innerHeight) {
                    button.hidden = true;
                    return;
                }
                const left = Math.max(8, Math.min(innerWidth - 46, rect.right - 48));
                const top = Math.max(8, Math.min(innerHeight - 46, rect.top + 10));
                button.style.left = `${Math.round(left)}px`;
                button.style.top = `${Math.round(top)}px`;
                button.hidden = false;
            };
            const schedule = () => {
                if (frame || button.hidden) return;
                frame = requestAnimationFrame(position);
            };
            const onPointerOver = event => {
                const path = event.composedPath?.() || [];
                if (path.includes(button)) return;
                const target = event.target;
                if (!target?.closest) return;
                const mediaRegion = target.closest('video, [data-testid="videoPlayer"], [data-testid="videoComponent"], [data-testid="tweetPhoto"]');
                const article = mediaRegion?.closest?.('article');
                if (!mediaRegion || !article) {
                    button.hidden = true;
                    currentArticle = null;
                    currentAnchor = null;
                    return;
                }
                currentArticle = article;
                currentAnchor = this.anchorFor(article) || mediaRegion;
                position();
            };
            const onViewport = () => schedule();
            const onClick = async () => {
                if (!currentArticle || button.classList.contains('xmd-busy')) return;
                button.classList.add('xmd-busy');
                try {
                    await onActivate?.({ article: currentArticle, anchor: currentAnchor });
                } finally {
                    button.classList.remove('xmd-busy');
                }
            };

            document.addEventListener('pointerover', onPointerOver, true);
            window.addEventListener('scroll', onViewport, true);
            window.addEventListener('resize', onViewport, { passive: true });
            button.addEventListener('click', onClick);

            const controller = {
                element: button,
                destroy() {
                    document.removeEventListener('pointerover', onPointerOver, true);
                    window.removeEventListener('scroll', onViewport, true);
                    window.removeEventListener('resize', onViewport);
                    if (frame) cancelAnimationFrame(frame);
                    button.remove();
                }
            };
            button.__xmdController = controller;
            return controller;
        }
    });
