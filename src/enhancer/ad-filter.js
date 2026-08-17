    // =============================================================================
    // XMD · 广告证据决策器
    // =============================================================================
    // 每条规则只产出证据，不直接修改页面。只有 direct / strong 证据可触发隐藏。
    XMD.adFilter = Object.freeze({
        decideEvidence(evidence) {
            const list = Array.isArray(evidence) ? evidence : [];
            const direct = list.filter(item => item?.level === 'direct');
            const strong = list.filter(item => item?.level === 'strong');
            const decisive = direct.length ? direct : strong;
            return {
                action: decisive.length ? 'hide' : 'keep',
                confidence: direct.length ? 'direct' : strong.length ? 'strong' : 'weak',
                reasons: decisive.map(item => item.reason).filter(Boolean)
            };
        },

        collectArticleEvidence(article) {
            if (!article?.querySelectorAll) return [];
            const evidence = [];

            // X 自身用于推广展示计数的 impression 标记属于直接证据。
            const marked = [...article.querySelectorAll('[data-testid]')].some(node => {
                const value = String(node.getAttribute?.('data-testid') || '');
                return /impression-pixel$/i.test(value);
            });
            if (marked) evidence.push({ level: 'direct', reason: 'impression-marker' });

            // 标签必须位于正文之外，避免用户正文中提到“广告”时被误判。
            for (const node of article.querySelectorAll('span, [dir="ltr"]')) {
                if (node.closest?.('[data-testid="tweetText"]')) continue;
                const text = String(node.textContent || '').trim();
                if (text.length > 0 && text.length <= 16 && /^(?:广告|推广|ad|promoted)$/i.test(text)) {
                    evidence.push({ level: 'strong', reason: 'promoted-label' });
                    break;
                }
            }
            return evidence;
        },

        processArticle(article) {
            if (!article?.classList) return { action: 'keep', confidence: 'weak', reasons: [] };
            const decision = this.decideEvidence(this.collectArticleEvidence(article));
            article.classList.toggle('xmd-page-ad-hidden', decision.action === 'hide');
            return decision;
        },

        process(root) {
            if (XMD.config?.hideAds === false || !root?.querySelectorAll) return;
            const articles = new Set();
            if (root.matches?.('article')) articles.add(root);
            const owner = root.closest?.('article');
            if (owner) articles.add(owner);
            for (const article of root.querySelectorAll('article')) articles.add(article);
            for (const article of articles) this.processArticle(article);

            // 独立 SSP 广告位本身就是直接证据，不需要推断普通容器类名。
            const standalones = [];
            if (root.matches?.('[data-testid$="SspAd"]')) standalones.push(root);
            for (const node of root.querySelectorAll('[data-testid$="SspAd"]')) standalones.push(node);
            for (const node of standalones) node.classList?.add('xmd-page-ad-hidden');
        }
    });
