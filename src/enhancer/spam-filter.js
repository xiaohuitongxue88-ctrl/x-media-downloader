    // =============================================================================
    // XMD · 成人引流垃圾双轴决策器
    // =============================================================================
    // 成人内容轴只说明内容属性，永远不能单独触发隐藏；必须叠加明确引流/机器人行为证据。
    XMD.spamFilter = Object.freeze({
        normalize(value) {
            return String(value || '')
                .normalize?.('NFKC')
                ?.toLowerCase()
                ?.replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
                ?.replace(/\s+/g, ' ')
                ?.trim() || String(value || '').toLowerCase().trim();
        },

        syntheticHandle(username) {
            const value = String(username || '').replace(/^@/, '').toLowerCase();
            if (value.length < 10) return false;
            const digits = (value.match(/\d/g) || []).length;
            const letters = (value.match(/[a-z]/g) || []).length;
            return digits >= 5 && digits > letters * 0.7;
        },

        extractSignals(input = {}) {
            const text = this.normalize(`${input.displayName || ''} ${input.text || ''}`);
            const adultHits = [
                /\bnsfw\b|\b18\+\b|\bporn\b/i,
                /成人|色情|裸聊|约炮|成人视频|情色/i,
                /onlyfans|裸照|性爱/i
            ].reduce((sum, rule) => sum + Number(rule.test(text)), 0);

            const contact = /\btelegram\b|\bwhatsapp\b|(?:^|\W)tg(?:群|频道|\W)|电报/i.test(text);
            const conversion = /点击.{0,6}(?:主页|简介)|(?:进|加).{0,4}(?:群|频道)|私聊|私信|联系|领取|订阅/i.test(text);
            const commerce = /(?:频道|群组|资源).{0,6}(?:入口|领取|合集)|(?:上门|包夜|付费|可约)|福利视频/i.test(text);
            const antiAbuse = /举报|屏蔽|反诈|诈骗|机器人太多|垃圾账号|治理|谨防/i.test(text);
            const external = Math.max(0, Number(input.externalLinkCount || 0));
            const synthetic = this.syntheticHandle(input.username);
            return { adultHits, contact, conversion, commerce, antiAbuse, external, synthetic };
        },

        decide(input = {}) {
            if (input.followingEvidence) {
                return { action: 'keep', confidence: 'direct', reasons: ['已关注直接证据'] };
            }
            const s = this.extractSignals(input);
            if (s.antiAbuse && !s.contact && !s.conversion && !s.commerce) {
                return { action: 'keep', confidence: 'strong', reasons: ['举报或反诈语境'] };
            }

            let funnel = 0;
            const reasons = [];
            if (s.contact) { funnel += 2; reasons.push('站外联系方式'); }
            if (s.conversion) { funnel += 1; reasons.push('转化动作'); }
            if (s.commerce) { funnel += 2; reasons.push('资源或交易引流'); }
            if (s.external > 0) { funnel += 1; reasons.push('外部链接'); }
            if (s.synthetic) { funnel += 1; reasons.push('异常账号结构'); }

            const adultWithAnchor = s.adultHits > 0 && funnel >= 2;
            const extremeFunnel = s.contact && s.commerce && s.conversion && s.external > 0;
            return {
                action: adultWithAnchor || extremeFunnel ? 'hide' : 'keep',
                confidence: adultWithAnchor || extremeFunnel ? 'strong' : 'weak',
                reasons: adultWithAnchor || extremeFunnel ? reasons : []
            };
        },

        readArticle(article) {
            if (!article?.querySelectorAll) return null;
            const text = [...article.querySelectorAll('[data-testid="tweetText"]')]
                .map(node => String(node.innerText || node.textContent || '').trim())
                .filter(Boolean)
                .join('\n')
                .slice(0, 3000);
            const status = article.querySelector('a[href*="/status/"]');
            const href = String(status?.href || status?.getAttribute?.('href') || '');
            const match = href.match(/\/(?:x\.com\/|twitter\.com\/)?([a-z0-9_]{1,15})\/status\//i);
            const username = match?.[1] || '';
            const displayName = String(article.querySelector('[data-testid="User-Name"]')?.innerText || '').slice(0, 180);
            const links = [...article.querySelectorAll('a[href]')];
            const externalLinkCount = links.filter(link => {
                const value = String(link.href || link.getAttribute?.('href') || '');
                return /^https?:\/\//i.test(value) && !/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i.test(value);
            }).length;
            const followingEvidence = Boolean(article.querySelector('[data-testid$="-unfollow"]'));
            return { text, displayName, username, externalLinkCount, followingEvidence };
        },

        processArticle(article) {
            if (!article?.classList) return { action: 'keep', confidence: 'weak', reasons: [] };
            const input = this.readArticle(article);
            if (!input) return { action: 'keep', confidence: 'weak', reasons: [] };
            const decision = this.decide(input);
            article.classList.toggle('xmd-page-spam-hidden', decision.action === 'hide');
            return decision;
        },

        process(root) {
            if (XMD.config?.hideAdultSpam === false || !root?.querySelectorAll) return;
            const articles = new Set();
            if (root.matches?.('article')) articles.add(root);
            const owner = root.closest?.('article');
            if (owner) articles.add(owner);
            for (const article of root.querySelectorAll('article')) articles.add(article);
            for (const article of articles) this.processArticle(article);
        }
    });
