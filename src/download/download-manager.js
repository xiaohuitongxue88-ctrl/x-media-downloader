    // =============================================================================
    // XMD · 浏览器下载任务引擎
    // =============================================================================
    // 活动任务暂停会真实终止当前 GM_download 连接；继续时先自愈，再从本次文件起点重新下载。
    XMD.download = Object.freeze({
        createManager(options = {}) {
            const concurrency = Math.max(1, Math.min(6, Number(options.concurrency || 2)));
            const transport = options.transport || GM_download;
            const recovery = options.recovery || XMD.recovery;
            const onSuccess = typeof options.onSuccess === 'function' ? options.onSuccess : () => {};
            const tasks = new Map();
            const order = [];
            const active = new Set();
            const listeners = new Set();
            let sequence = 0;
            let globallyPaused = false;

            const manager = {
                enqueue(media, filename, taskOptions = {}) {
                    const task = {
                        id: `xmd-task-${++sequence}`,
                        media: { ...media },
                        filename: String(filename || `x-media-${sequence}`),
                        state: 'queued',
                        progress: { loaded: 0, total: 0, percent: 0 },
                        handle: null,
                        runToken: 0,
                        started: false,
                        needsRecovery: false,
                        collectFresh: taskOptions.collectFresh || null,
                        error: ''
                    };
                    tasks.set(task.id, task);
                    order.push(task.id);
                    this.pump();
                    this.emit();
                    return task;
                },

                subscribe(listener) {
                    if (typeof listener !== 'function') return () => {};
                    listeners.add(listener);
                    listener(this.list());
                    return () => listeners.delete(listener);
                },

                emit() {
                    const snapshot = this.list();
                    for (const listener of listeners) {
                        try { listener(snapshot); } catch {}
                    }
                },

                get(id) {
                    return tasks.get(id) || null;
                },

                list() {
                    return order.map(id => tasks.get(id)).filter(Boolean);
                },

                pump() {
                    if (globallyPaused) return;
                    while (active.size < concurrency) {
                        const task = this.list().find(item => item.state === 'queued');
                        if (!task) break;
                        this.start(task);
                    }
                },

                start(task) {
                    if (!task || task.state !== 'queued' || active.has(task.id)) return;
                    active.add(task.id);
                    const token = ++task.runToken;

                    if (task.needsRecovery) {
                        task.state = 'preparing';
                        Promise.resolve(recovery.prepare(task.media, {
                            collectFresh: task.collectFresh || undefined
                        })).then(result => {
                            if (task.runToken !== token || task.state !== 'preparing') return;
                            if (result?.media?.url) task.media = { ...result.media };
                            task.needsRecovery = false;
                            this.launch(task, token, true);
                        }).catch(error => {
                            if (task.runToken !== token) return;
                            this.fail(task, token, error);
                        });
                        return;
                    }

                    this.launch(task, token, false);
                },

                launch(task, token, resetProgress) {
                    if (task.runToken !== token || !active.has(task.id)) return;
                    if (resetProgress) {
                        task.progress = { loaded: 0, total: 0, percent: 0 };
                    }
                    task.state = 'active';
                    task.started = true;
                    task.error = '';

                    const isCurrent = () => task.runToken === token && task.state === 'active';
                    try {
                        task.handle = transport({
                            url: task.media.url,
                            name: task.filename,
                            saveAs: false,
                            onprogress: event => {
                                if (!isCurrent()) return;
                                const loaded = Math.max(0, Number(event?.loaded || 0));
                                const total = Math.max(0, Number(event?.total || 0));
                                const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : task.progress.percent;
                                task.progress = { loaded, total, percent };
                                this.emit();
                            },
                            onload: () => {
                                if (!isCurrent()) return;
                                task.state = 'completed';
                                if (task.progress.total > 0) {
                                    task.progress = { ...task.progress, loaded: task.progress.total, percent: 100 };
                                } else {
                                    task.progress = { ...task.progress, percent: 100 };
                                }
                                task.handle = null;
                                active.delete(task.id);
                                onSuccess(task);
                                this.pump();
                                this.emit();
                            },
                            onerror: error => {
                                if (!isCurrent()) return;
                                this.fail(task, token, error);
                            },
                            ontimeout: error => {
                                if (!isCurrent()) return;
                                this.fail(task, token, error || new Error('download-timeout'));
                            }
                        });
                    } catch (error) {
                        this.fail(task, token, error);
                    }
                },

                fail(task, token, error) {
                    if (!task || task.runToken !== token) return;
                    task.state = 'failed';
                    task.error = String(error?.error || error?.message || error || 'download-failed');
                    task.handle = null;
                    active.delete(task.id);
                    this.pump();
                    this.emit();
                },

                pause(id) {
                    const task = tasks.get(id);
                    if (!task || !['queued', 'active', 'preparing'].includes(task.state)) return false;
                    const wasStarted = task.started || task.state === 'active' || task.state === 'preparing';
                    task.state = 'paused';
                    task.needsRecovery = wasStarted;
                    task.runToken += 1;
                    active.delete(task.id);
                    try { task.handle?.abort?.(); } catch {}
                    task.handle = null;
                    this.pump();
                    this.emit();
                    return true;
                },

                resume(id) {
                    const task = tasks.get(id);
                    if (!task || task.state !== 'paused') return false;
                    task.state = 'queued';
                    this.pump();
                    this.emit();
                    return true;
                },

                cancel(id) {
                    const task = tasks.get(id);
                    if (!task || ['completed', 'cancelled'].includes(task.state)) return false;
                    task.state = 'cancelled';
                    task.runToken += 1;
                    active.delete(task.id);
                    try { task.handle?.abort?.(); } catch {}
                    task.handle = null;
                    this.pump();
                    this.emit();
                    return true;
                },

                retry(id) {
                    const task = tasks.get(id);
                    if (!task || task.state !== 'failed') return false;
                    task.state = 'queued';
                    task.needsRecovery = true;
                    task.error = '';
                    this.pump();
                    this.emit();
                    return true;
                },

                pauseAll() {
                    globallyPaused = true;
                    for (const task of this.list()) {
                        if (['queued', 'active', 'preparing'].includes(task.state)) this.pause(task.id);
                    }
                },

                resumeAll() {
                    globallyPaused = false;
                    for (const task of this.list()) {
                        if (task.state === 'paused') task.state = 'queued';
                    }
                    this.pump();
                    this.emit();
                },

                clearCompleted() {
                    for (const id of [...order]) {
                        if (tasks.get(id)?.state !== 'completed') continue;
                        tasks.delete(id);
                        const index = order.indexOf(id);
                        if (index >= 0) order.splice(index, 1);
                    }
                    this.emit();
                }
            };

            return manager;
        }
    });
