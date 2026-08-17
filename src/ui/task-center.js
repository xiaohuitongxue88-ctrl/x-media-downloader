    // =============================================================================
    // XMD · 下载任务中心
    // =============================================================================
    XMD.taskCenter = Object.freeze({
        summarize(tasks) {
            const visible = (tasks || []).filter(task => task.state !== 'cancelled');
            const percent = visible.length
                ? Math.round(visible.reduce((sum, task) => sum + Math.max(0, Math.min(100, Number(task.progress?.percent || 0))), 0) / visible.length)
                : 0;
            return {
                total: visible.length,
                downloading: visible.filter(task => task.state === 'active' || task.state === 'preparing').length,
                waiting: visible.filter(task => task.state === 'queued').length,
                paused: visible.filter(task => task.state === 'paused').length,
                failed: visible.filter(task => task.state === 'failed').length,
                completed: visible.filter(task => task.state === 'completed').length,
                percent
            };
        },

        feedbackLinks(config = {}) {
            const links = [];
            if (config.issuesUrl) links.push({ kind: 'github', url: config.issuesUrl, tooltip: 'GitHub · 问题反馈' });
            if (config.greasyForkUrl) links.push({ kind: 'userscript', url: config.greasyForkUrl, tooltip: 'Greasy Fork · 脚本页面' });
            return links;
        },

        mount(manager, config = {}) {
            if (typeof document === 'undefined' || !XMD.uiRoot?.ensure) return null;
            const root = XMD.uiRoot.ensure();
            let panel = root.querySelector?.('#xmd-task-center');
            if (panel) return panel.__xmdController || panel;

            panel = document.createElement('aside');
            panel.id = 'xmd-task-center';
            panel.className = 'xmd-task-center';
            panel.hidden = true;

            const feedback = document.createElement('div');
            feedback.className = 'xmd-feedback';
            const feedbackText = document.createElement('p');
            feedbackText.textContent = '遇到问题欢迎反馈！每一条真实反馈与好评，都是持续维护与完善的动力。点击图标即可进入。';
            const feedbackActions = document.createElement('div');
            feedbackActions.className = 'xmd-feedback-actions';
            for (const link of this.feedbackLinks(config)) {
                const a = document.createElement('a');
                a.className = 'xmd-feedback-link';
                a.href = link.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.dataset.tooltip = link.tooltip;
                a.setAttribute('aria-label', link.tooltip);
                a.innerHTML = XMD.icons.get(link.kind);
                feedbackActions.appendChild(a);
            }
            feedback.append(feedbackText, feedbackActions);

            const head = document.createElement('header');
            head.className = 'xmd-task-head';
            const titleBox = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = '下载任务中心';
            const meta = document.createElement('span');
            titleBox.append(title, meta);
            const headActions = document.createElement('div');
            headActions.className = 'xmd-inline-actions';
            const pauseAll = document.createElement('button');
            pauseAll.className = 'xmd-small-button';
            pauseAll.type = 'button';
            pauseAll.textContent = '全部暂停';
            const resumeAll = document.createElement('button');
            resumeAll.className = 'xmd-small-button';
            resumeAll.type = 'button';
            resumeAll.textContent = '全部继续';
            const clear = document.createElement('button');
            clear.className = 'xmd-small-button';
            clear.type = 'button';
            clear.textContent = '清理完成';
            const hide = document.createElement('button');
            hide.className = 'xmd-small-button';
            hide.type = 'button';
            hide.textContent = '隐藏';
            headActions.append(pauseAll, resumeAll, clear, hide);
            head.append(titleBox, headActions);

            const list = document.createElement('div');
            list.className = 'xmd-task-list';
            const summary = document.createElement('div');
            summary.className = 'xmd-task-summary';
            const summaryText = document.createElement('span');
            const summaryPercent = document.createElement('strong');
            const summaryBar = document.createElement('i');
            summary.append(summaryText, summaryPercent, summaryBar);
            panel.append(feedback, head, list, summary);
            root.appendChild(panel);

            const stateText = task => ({ queued: '等待中', preparing: '正在自愈检查', active: '正在下载', paused: '已暂停 · 网络连接已释放', completed: '已完成', failed: '下载失败', cancelled: '已取消' }[task.state] || task.state);
            const render = tasks => {
                const model = this.summarize(tasks);
                meta.textContent = `${model.downloading} 下载中 · ${model.waiting} 等待 · ${model.paused} 暂停`;
                list.replaceChildren();
                for (const task of tasks) {
                    if (task.state === 'cancelled') continue;
                    const row = document.createElement('div');
                    row.className = 'xmd-task-row';
                    const top = document.createElement('div');
                    top.className = 'xmd-task-top';
                    const thumb = document.createElement('div');
                    thumb.className = 'xmd-task-thumb';
                    const preview = task.media?.kind === 'image' ? task.media?.url : task.media?.poster;
                    if (preview) {
                        const image = document.createElement('img'); image.src = preview; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; thumb.appendChild(image);
                    } else thumb.innerHTML = XMD.icons.get('download');
                    const body = document.createElement('div');
                    body.className = 'xmd-task-body';
                    const name = document.createElement('strong'); name.textContent = task.filename;
                    const state = document.createElement('span'); state.textContent = stateText(task);
                    body.append(name, state);
                    const pct = document.createElement('b'); pct.textContent = `${task.progress?.percent || 0}%`;
                    top.append(thumb, body, pct);
                    const progress = document.createElement('div'); progress.className = 'xmd-progress'; const fill = document.createElement('i'); fill.style.width = `${task.progress?.percent || 0}%`; progress.appendChild(fill);
                    const actions = document.createElement('div'); actions.className = 'xmd-task-actions';
                    const action = (label, fn) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'xmd-small-button'; button.textContent = label; button.addEventListener('click', fn); actions.appendChild(button); };
                    if (task.state === 'active' || task.state === 'preparing') action('暂停', () => manager.pause(task.id));
                    if (task.state === 'paused') action('继续', () => manager.resume(task.id));
                    if (task.state === 'failed') action('重试', () => manager.retry(task.id));
                    if (!['completed', 'cancelled'].includes(task.state)) action('取消', () => manager.cancel(task.id));
                    row.append(top, progress, actions);
                    list.appendChild(row);
                }
                summaryText.textContent = `${model.total} 个任务`;
                summaryPercent.textContent = `${model.percent}%`;
                summaryBar.style.width = `${model.percent}%`;
                XMD.progressDock?.update?.(tasks);
                if (model.total > 0 && panel.hidden && !XMD.progressDock?.isVisible?.()) XMD.progressDock?.show?.();
            };

            pauseAll.addEventListener('click', () => manager.pauseAll());
            resumeAll.addEventListener('click', () => manager.resumeAll());
            clear.addEventListener('click', () => manager.clearCompleted());
            hide.addEventListener('click', () => { panel.hidden = true; XMD.progressDock?.show?.(); });
            const unsubscribe = manager.subscribe(render);
            const controller = {
                element: panel,
                show() { panel.hidden = false; XMD.progressDock?.hide?.(); },
                hide() { panel.hidden = true; XMD.progressDock?.show?.(); },
                destroy() { unsubscribe(); panel.remove(); }
            };
            panel.__xmdController = controller;
            return controller;
        }
    });
