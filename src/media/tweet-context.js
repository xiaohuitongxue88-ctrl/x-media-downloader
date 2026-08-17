    // =============================================================================
    // XMD · 当前 Tweet 上下文
    // =============================================================================
    // 只从传入 article 读取状态链接、作者与正文；找不到直接证据时返回空字段，不跨 Tweet 猜测。
    XMD.tweetContext = Object.freeze({
        read(article) {
            if (!article?.querySelector) {
                return { tweetId: '', tweetUrl: '', author: '', text: '' };
            }

            let statusAnchor = null;
            const time = article.querySelector('time');
            if (time?.closest) {
                statusAnchor = time.closest('a[href*="/status/"]');
            }
            if (!statusAnchor) {
                const links = article.querySelectorAll?.('a[href*="/status/"]') || [];
                statusAnchor = links[0] || null;
            }

            const href = String(statusAnchor?.href || '');
            const statusMatch = href.match(/\/status\/(\d+)(?:[/?#]|$)/);
            const userMatch = href.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([a-z0-9_]{1,15})\/status\//i);

            const userBox = article.querySelector('[data-testid="User-Name"]');
            const lines = String(userBox?.innerText || userBox?.textContent || '')
                .split(/\r?\n/)
                .map(value => value.trim())
                .filter(Boolean);
            const handle = lines.find(value => /^@[a-z0-9_]{1,15}$/i.test(value));

            const textNode = article.querySelector('[data-testid="tweetText"]');
            const text = String(textNode?.innerText || textNode?.textContent || '').trim();

            return {
                tweetId: statusMatch?.[1] || '',
                tweetUrl: href,
                author: (handle ? handle.slice(1) : userMatch?.[1] || '').toLowerCase(),
                text
            };
        }
    });
