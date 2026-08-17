    // =============================================================================
    // XMD · 当前 Tweet 媒体选择器
    // =============================================================================
    XMD.mediaPicker = Object.freeze({
        filenameFor(media, index) {
            const clean = value => String(value || '')
                .replace(/[\r\n\\/:*?"<>|]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 80) || 'unknown';
            const author = clean(media?.author || 'unknown');
            const tweetId = clean(media?.tweetId || 'tweet');
            const kind = ['video', 'gif', 'image'].includes(media?.kind) ? media.kind : 'media';
            const ext = kind === 'gif' ? 'mp4' : clean(media?.format || (kind === 'video' ? 'mp4' : 'jpg')).replace(/[^a-z0-9]/gi, '') || 'bin';
            const number = String(Number(index || 0) + 1).padStart(2, '0');
            return `@${author}_${tweetId}_${kind}_${number}.${ext}`;
        },

        open(items, options = {}) {
            if (typeof document === 'undefined' || !XMD.uiRoot?.ensure) return null;
            this.close();
            const root = XMD.uiRoot.ensure();
            const selected = new Set((items || []).map((_, index) => index));
            const overlay = document.createElement('div');
            overlay.className = 'xmd-dialog-overlay';
            overlay.dataset.xmdDialog = 'media-picker';
            const dialog = document.createElement('section');
            dialog.className = 'xmd-dialog';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');

            const header = document.createElement('header');
            header.className = 'xmd-dialog-head';
            const heading = document.createElement('div');
            const title = document.createElement('h2');
            title.textContent = '选择要下载的媒体';
            const subtitle = document.createElement('p');
            subtitle.textContent = `检测到 ${(items || []).length} 个媒体资源。视频优先使用当前证据中的最高质量 MP4。`;
            heading.append(title, subtitle);
            const close = document.createElement('button');
            close.className = 'xmd-icon-button';
            close.type = 'button';
            close.setAttribute('aria-label', '关闭');
            close.innerHTML = XMD.icons.get('close');
            header.append(heading, close);

            const toolbar = document.createElement('div');
            toolbar.className = 'xmd-picker-toolbar';
            const count = document.createElement('span');
            count.className = 'xmd-picker-count';
            const makeFilter = (label, predicate) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'xmd-button xmd-button-secondary';
                button.textContent = label;
                button.addEventListener('click', () => {
                    selected.clear();
                    (items || []).forEach((item, index) => { if (predicate(item)) selected.add(index); });
                    renderSelection();
                });
                return button;
            };
            toolbar.append(
                makeFilter('全选', () => true),
                makeFilter('视频 / GIF', item => item.kind === 'video' || item.kind === 'gif'),
                makeFilter('图片', item => item.kind === 'image'),
                count
            );

            const list = document.createElement('div');
            list.className = 'xmd-media-list';
            const rows = [];
            (items || []).forEach((item, index) => {
                const row = document.createElement('label');
                row.className = 'xmd-media-row';
                const check = document.createElement('input');
                check.type = 'checkbox';
                check.checked = true;
                check.addEventListener('change', () => {
                    check.checked ? selected.add(index) : selected.delete(index);
                    renderSelection();
                });
                const thumb = document.createElement('div');
                thumb.className = 'xmd-media-thumb';
                const preview = item.kind === 'image' ? item.url : item.poster;
                if (preview) {
                    const image = document.createElement('img');
                    image.src = preview;
                    image.alt = '';
                    image.loading = 'lazy';
                    image.referrerPolicy = 'no-referrer';
                    thumb.appendChild(image);
                } else {
                    thumb.innerHTML = XMD.icons.get('download');
                }
                const meta = document.createElement('div');
                meta.className = 'xmd-media-meta';
                const name = document.createElement('strong');
                name.textContent = this.filenameFor(item, index);
                const detail = document.createElement('span');
                const size = item.width && item.height ? `${item.width}×${item.height} · ` : '';
                detail.textContent = `${size}${item.kind === 'image' ? '原图' : item.kind === 'gif' ? 'GIF · MP4' : '视频 · MP4'}`;
                meta.append(name, detail);
                const badge = document.createElement('span');
                badge.className = 'xmd-badge';
                badge.textContent = item.kind === 'image' ? '原图' : item.kind === 'gif' ? 'GIF' : '最高质量';
                row.append(check, thumb, meta, badge);
                list.appendChild(row);
                rows.push({ row, check, index });
            });

            const footer = document.createElement('footer');
            footer.className = 'xmd-dialog-footer';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'xmd-button xmd-button-secondary';
            cancel.textContent = '取消';
            const confirm = document.createElement('button');
            confirm.type = 'button';
            confirm.className = 'xmd-button xmd-button-primary';
            footer.append(cancel, confirm);

            const renderSelection = () => {
                rows.forEach(entry => entry.row.dataset.selected = selected.has(entry.index) ? 'true' : 'false');
                count.textContent = `已选择 ${selected.size} / ${(items || []).length}`;
                confirm.disabled = selected.size === 0;
                confirm.textContent = selected.size ? `加入下载队列 ${selected.size} 项` : '请选择媒体';
            };
            const finish = () => {
                const result = [...selected].sort((a, b) => a - b).map(index => ({ media: items[index], filename: this.filenameFor(items[index], index) }));
                if (typeof options.onConfirm === 'function') options.onConfirm(result);
                this.close();
            };
            const onKey = event => { if (event.key === 'Escape') this.close(); };
            overlay.__xmdKeyHandler = onKey;
            close.addEventListener('click', () => this.close());
            cancel.addEventListener('click', () => this.close());
            confirm.addEventListener('click', finish);
            overlay.addEventListener('mousedown', event => { if (event.target === overlay) this.close(); });
            document.addEventListener('keydown', onKey, true);

            dialog.append(header, toolbar, list, footer);
            overlay.appendChild(dialog);
            root.appendChild(overlay);
            renderSelection();
            return overlay;
        },

        close() {
            if (typeof document === 'undefined' || !XMD.uiRoot?.ensure) return;
            const root = XMD.uiRoot.ensure();
            const current = root.querySelector?.('[data-xmd-dialog="media-picker"]');
            if (!current) return;
            if (current.__xmdKeyHandler) document.removeEventListener('keydown', current.__xmdKeyHandler, true);
            current.remove();
        }
    });
