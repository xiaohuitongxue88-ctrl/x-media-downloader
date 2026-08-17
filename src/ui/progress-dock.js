    // =============================================================================
    // XMD · 最小化下载进度 Dock
    // =============================================================================
    XMD.progressDock = {
        element: null,
        latestTasks: [],
        model(tasks) { return XMD.taskCenter.summarize(tasks); },
        mount(onRestore) {
            if (typeof document === 'undefined' || !XMD.uiRoot?.ensure) return null;
            if (this.element) return this.element;
            const button = document.createElement('button');
            button.id = 'xmd-progress-dock';
            button.className = 'xmd-progress-dock';
            button.type = 'button';
            button.hidden = true;
            button.addEventListener('click', () => { this.hide(); if (typeof onRestore === 'function') onRestore(); });
            XMD.uiRoot.ensure().appendChild(button);
            this.element = button;
            this.update([]);
            return button;
        },
        update(tasks) {
            this.latestTasks = [...(tasks || [])];
            if (!this.element) return;
            const model = this.model(this.latestTasks);
            this.element.replaceChildren();
            const text = document.createElement('div');
            text.className = 'xmd-dock-copy';
            const title = document.createElement('strong'); title.textContent = `下载任务 · ${model.total}`;
            const sub = document.createElement('span'); sub.textContent = `${model.downloading} 下载中 · ${model.waiting} 等待 · ${model.paused} 暂停`;
            text.append(title, sub);
            const pct = document.createElement('b'); pct.textContent = `${model.percent}%`;
            const progress = document.createElement('div'); progress.className = 'xmd-progress'; const fill = document.createElement('i'); fill.style.width = `${model.percent}%`; progress.appendChild(fill);
            this.element.append(text, pct, progress);
        },
        show() { if (this.element && this.model(this.latestTasks).total > 0) this.element.hidden = false; },
        hide() { if (this.element) this.element.hidden = true; },
        isVisible() { return Boolean(this.element && !this.element.hidden); }
    };
