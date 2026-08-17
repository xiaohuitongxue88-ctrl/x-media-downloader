    // =============================================================================
    // XMD · 证据驱动项目支持提示
    // =============================================================================
    // 只记录本机真实下载成功证据。页面打开、入队、失败、取消和暂停均不会增加使用计数。
    XMD.supportPrompt = Object.freeze({
        storageKey: 'xiaohuitongxue.xmd.support.v1',
        stages: Object.freeze([
            Object.freeze({ id: 's1', days: 3, minSessions: 3, minSuccess: 5, minKinds: 2, minGapDays: 0, title: '感谢你的持续使用' }),
            Object.freeze({ id: 's2', days: 14, minSessions: 10, minSuccess: 25, minKinds: 3, minGapDays: 10, title: '感谢你的长期支持' }),
            Object.freeze({ id: 's3', days: 45, minSessions: 25, minSuccess: 80, minKinds: 3, minGapDays: 30, title: '感谢一路使用到现在' })
        ]),

        defaultState() {
            return {
                firstSuccessAt: 0,
                successCount: 0,
                featureKinds: [],
                sessionCount: 0,
                sessionStamp: '',
                dismissedStages: {},
                permanentStop: false,
                activeStage: '',
                lastPromptAt: 0
            };
        },

        normalizeState(value) {
            const base = this.defaultState();
            const input = value && typeof value === 'object' ? value : {};
            return {
                ...base,
                ...input,
                firstSuccessAt: Math.max(0, Number(input.firstSuccessAt || 0)),
                successCount: Math.max(0, Number(input.successCount || 0)),
                featureKinds: [...new Set(Array.isArray(input.featureKinds) ? input.featureKinds.filter(Boolean) : [])],
                sessionCount: Math.max(0, Number(input.sessionCount || 0)),
                sessionStamp: String(input.sessionStamp || ''),
                dismissedStages: { ...(input.dismissedStages || {}) },
                permanentStop: input.permanentStop === true,
                activeStage: String(input.activeStage || ''),
                lastPromptAt: Math.max(0, Number(input.lastPromptAt || 0))
            };
        },

        dayStamp(now) {
            const date = new Date(now);
            const two = number => String(number).padStart(2, '0');
            return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
        },

        recordSuccessInState(current, kind, now = Date.now()) {
            const state = this.normalizeState(current);
            if (!state.firstSuccessAt) state.firstSuccessAt = now;
            state.successCount += 1;
            if (kind && !state.featureKinds.includes(kind)) state.featureKinds.push(kind);

            const stamp = this.dayStamp(now);
            if (state.sessionStamp !== stamp) {
                state.sessionStamp = stamp;
                state.sessionCount += 1;
            }
            return state;
        },

        eligibleStage(current, now = Date.now()) {
            const state = this.normalizeState(current);
            if (state.permanentStop || !state.firstSuccessAt) return null;
            const ageDays = Math.floor((now - state.firstSuccessAt) / 86400000);
            const gapDays = state.lastPromptAt
                ? Math.floor((now - state.lastPromptAt) / 86400000)
                : Number.POSITIVE_INFINITY;

            // 阶段按顺序推进，避免首次达到高阈值时跳过早期阶段。
            for (const stage of this.stages) {
                if (state.dismissedStages[stage.id]) continue;
                const qualified = ageDays >= stage.days
                    && state.sessionCount >= stage.minSessions
                    && state.successCount >= stage.minSuccess
                    && state.featureKinds.length >= stage.minKinds
                    && gapDays >= stage.minGapDays;
                return qualified ? stage : null;
            }
            return null;
        },

        markShown(current, stageId, now = Date.now()) {
            const state = this.normalizeState(current);
            state.activeStage = String(stageId || '');
            state.lastPromptAt = now;
            return state;
        },

        dismissCurrentStage(current) {
            const state = this.normalizeState(current);
            if (state.activeStage) state.dismissedStages[state.activeStage] = true;
            state.activeStage = '';
            return state;
        },

        stopPermanently(current) {
            const state = this.normalizeState(current);
            state.permanentStop = true;
            state.activeStage = '';
            return state;
        },

        read(storage = localStorage) {
            try {
                return this.normalizeState(JSON.parse(storage.getItem(this.storageKey) || '{}'));
            } catch {
                return this.defaultState();
            }
        },

        write(state, storage = localStorage) {
            try { storage.setItem(this.storageKey, JSON.stringify(this.normalizeState(state))); } catch {}
        },

        mount(config = {}) {
            if (typeof document === 'undefined' || !XMD.uiRoot?.ensure) return null;
            const root = XMD.uiRoot.ensure();
            let card = root.querySelector?.('#xmd-support-card');
            if (card) return card.__xmdController || card;

            let state = this.read();
            card = document.createElement('aside');
            card.id = 'xmd-support-card';
            card.className = 'xmd-support-card';
            card.hidden = true;

            const head = document.createElement('div');
            head.className = 'xmd-support-head';
            const content = document.createElement('div');
            const title = document.createElement('strong');
            const copy = document.createElement('p');
            copy.textContent = '如果这款工具确实帮到了你，欢迎留下真实反馈或好评，这会直接帮助后续维护与完善。';
            content.append(title, copy);
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'xmd-icon-button';
            close.setAttribute('aria-label', '关闭当前阶段提示');
            close.innerHTML = XMD.icons.get('close');
            head.append(content, close);

            const actions = document.createElement('div');
            actions.className = 'xmd-support-actions';
            const links = [
                config.greasyForkUrl ? { label: 'Greasy Fork', url: config.greasyForkUrl } : null,
                config.repositoryUrl ? { label: 'GitHub', url: config.repositoryUrl } : null
            ].filter(Boolean);
            for (const item of links) {
                const link = document.createElement('a');
                link.className = 'xmd-support-link';
                link.href = item.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = item.label;
                link.addEventListener('click', () => {
                    state = this.stopPermanently(state);
                    this.write(state);
                    card.hidden = true;
                });
                actions.appendChild(link);
            }
            card.append(head, actions);
            root.appendChild(card);

            const maybeShow = (now = Date.now()) => {
                const stage = this.eligibleStage(state, now);
                if (!stage) return false;
                state = this.markShown(state, stage.id, now);
                this.write(state);
                title.textContent = stage.title;
                card.hidden = false;
                return true;
            };
            const onSuccess = event => {
                state = this.recordSuccessInState(state, event?.detail?.kind || 'media', Date.now());
                this.write(state);
                maybeShow();
            };
            close.addEventListener('click', () => {
                state = this.dismissCurrentStage(state);
                this.write(state);
                card.hidden = true;
            });
            document.addEventListener('xmd:download-success', onSuccess);
            maybeShow();

            const controller = {
                element: card,
                getState: () => this.normalizeState(state),
                destroy() {
                    document.removeEventListener('xmd:download-success', onSuccess);
                    card.remove();
                }
            };
            card.__xmdController = controller;
            return controller;
        }
    });
