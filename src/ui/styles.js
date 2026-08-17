    // =============================================================================
    // XMD · 隔离式界面样式
    // =============================================================================
    // 全部界面运行在 Shadow DOM 内，避免污染 X 页面，也不依赖外部字体或样式资源。
    XMD.uiStyles = Object.freeze({
        css() {
            return `
:host{color-scheme:light dark}
*{box-sizing:border-box}
#xmd-root{--xmd-bg:#fff;--xmd-fg:#111827;--xmd-muted:#64748b;--xmd-line:#e5e7eb;--xmd-soft:#f8fafc;--xmd-accent:#111827;--xmd-shadow:0 18px 55px rgba(15,23,42,.16);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI","Microsoft YaHei",Arial,sans-serif;color:var(--xmd-fg);font-size:13px;line-height:1.5;pointer-events:none}
@media(prefers-color-scheme:dark){#xmd-root{--xmd-bg:#18181b;--xmd-fg:#fafafa;--xmd-muted:#a1a1aa;--xmd-line:#34343a;--xmd-soft:#222227;--xmd-accent:#fafafa;--xmd-shadow:0 18px 55px rgba(0,0,0,.42)}}
button,a,input{font:inherit}.xmd-fill{fill:currentColor;stroke:none!important}.xmd-icon-button svg,.xmd-feedback-link svg,.xmd-floating-trigger svg,.xmd-media-thumb svg,.xmd-task-thumb svg{width:18px;height:18px;display:block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.xmd-dialog-overlay{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.28);backdrop-filter:blur(3px);pointer-events:auto}.xmd-dialog{width:min(720px,calc(100vw - 32px));max-height:min(760px,calc(100vh - 40px));overflow:hidden;background:var(--xmd-bg);border:1px solid var(--xmd-line);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.24)}
.xmd-dialog-head{display:flex;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid var(--xmd-line)}.xmd-dialog-head h2{margin:0;font-size:18px;line-height:1.3}.xmd-dialog-head p{margin:5px 0 0;color:var(--xmd-muted);font-size:12px}.xmd-icon-button{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--xmd-line);border-radius:9px;background:transparent;color:inherit;cursor:pointer}.xmd-icon-button:hover{background:var(--xmd-soft)}
.xmd-picker-toolbar{display:flex;align-items:center;gap:8px;padding:12px 20px;border-bottom:1px solid var(--xmd-line)}.xmd-picker-count{margin-left:auto;color:var(--xmd-muted);font-size:12px}.xmd-button{height:36px;padding:0 13px;border-radius:9px;font-weight:600;cursor:pointer}.xmd-button:disabled{opacity:.45;cursor:not-allowed}.xmd-button-secondary{border:1px solid var(--xmd-line);background:var(--xmd-bg);color:inherit}.xmd-button-secondary:hover{background:var(--xmd-soft)}.xmd-button-primary{border:1px solid var(--xmd-accent);background:var(--xmd-accent);color:var(--xmd-bg)}
.xmd-media-list{display:grid;gap:9px;max-height:470px;overflow:auto;padding:12px 20px}.xmd-media-row{display:grid;grid-template-columns:18px 92px minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px;border:1px solid var(--xmd-line);border-radius:12px;background:var(--xmd-bg);cursor:pointer}.xmd-media-row[data-selected="true"]{border-color:var(--xmd-fg)}.xmd-media-row input{width:17px;height:17px;accent-color:var(--xmd-accent)}.xmd-media-thumb{width:92px;height:60px;border-radius:9px;overflow:hidden;display:grid;place-items:center;background:var(--xmd-soft);color:var(--xmd-muted)}.xmd-media-thumb img,.xmd-task-thumb img{width:100%;height:100%;object-fit:cover}.xmd-media-meta{min-width:0;display:grid;gap:3px}.xmd-media-meta strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}.xmd-media-meta span{color:var(--xmd-muted);font-size:11px}.xmd-badge{padding:3px 8px;border:1px solid var(--xmd-line);border-radius:999px;color:var(--xmd-muted);font-size:10px;white-space:nowrap}.xmd-dialog-footer{display:flex;justify-content:flex-end;gap:9px;padding:16px 20px 20px;border-top:1px solid var(--xmd-line)}
.xmd-task-center{position:fixed;z-index:30;right:20px;top:72px;width:360px;max-height:calc(100vh - 104px);overflow:hidden;padding:14px;background:color-mix(in srgb,var(--xmd-bg) 96%,transparent);border:1px solid var(--xmd-line);border-radius:14px;box-shadow:var(--xmd-shadow);backdrop-filter:blur(14px);pointer-events:auto}.xmd-task-center[hidden]{display:none}.xmd-feedback{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;margin-bottom:12px;padding:12px;border:1px solid #d9e4ef;border-radius:11px;background:linear-gradient(135deg,rgba(239,246,255,.86),rgba(248,250,252,.96))}.xmd-feedback p{margin:0;color:#52677c;font-size:13px;font-weight:500;line-height:1.65}.xmd-feedback-actions{display:flex;flex-direction:column;gap:7px}.xmd-feedback-link{position:relative;width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--xmd-line);border-radius:9px;background:var(--xmd-bg);color:inherit;text-decoration:none}.xmd-feedback-link::after{content:attr(data-tooltip);position:absolute;right:calc(100% + 8px);top:50%;transform:translate(4px,-50%);padding:6px 8px;border-radius:7px;background:var(--xmd-fg);color:var(--xmd-bg);font-size:11px;font-weight:600;white-space:nowrap;opacity:0;pointer-events:none;transition:.14s ease;box-shadow:0 8px 22px rgba(0,0,0,.18)}.xmd-feedback-link:hover::after,.xmd-feedback-link:focus-visible::after{opacity:1;transform:translate(0,-50%)}
@media(prefers-color-scheme:dark){.xmd-feedback{border-color:#334155;background:linear-gradient(135deg,#18212b,#1d2733)}.xmd-feedback p{color:#b8c6d3}}
.xmd-task-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:11px}.xmd-task-head>div:first-child{display:grid;gap:2px}.xmd-task-head strong{font-size:14px}.xmd-task-head span{font-size:11px;color:var(--xmd-muted)}.xmd-inline-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.xmd-small-button{height:28px;padding:0 8px;border:1px solid var(--xmd-line);border-radius:7px;background:transparent;color:inherit;font-size:10.5px;cursor:pointer}.xmd-small-button:hover{background:var(--xmd-soft)}
.xmd-task-list{display:grid;gap:9px;max-height:calc(100vh - 330px);overflow:auto;padding-right:2px}.xmd-task-row{padding:10px;border:1px solid var(--xmd-line);border-radius:11px;background:var(--xmd-bg)}.xmd-task-top{display:flex;align-items:center;gap:9px}.xmd-task-thumb{width:48px;height:35px;flex:0 0 auto;overflow:hidden;display:grid;place-items:center;border-radius:7px;background:var(--xmd-soft);color:var(--xmd-muted)}.xmd-task-body{min-width:0;flex:1;display:grid;gap:2px}.xmd-task-body strong{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xmd-task-body span{font-size:10.5px;color:var(--xmd-muted)}.xmd-task-top>b{font-size:11px;font-variant-numeric:tabular-nums}.xmd-progress{height:6px;overflow:hidden;border-radius:999px;background:var(--xmd-line)}.xmd-progress i{display:block;height:100%;border-radius:inherit;background:var(--xmd-accent);transition:width .18s ease}.xmd-task-row>.xmd-progress{margin-top:8px}.xmd-task-actions{display:flex;gap:6px;margin-top:8px}.xmd-task-summary{position:relative;display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:11px;padding:10px;border-radius:10px;background:var(--xmd-soft);font-size:11px;color:var(--xmd-muted);overflow:hidden}.xmd-task-summary>i{grid-column:1/-1;height:5px;border-radius:999px;background:var(--xmd-accent)}
.xmd-progress-dock{position:fixed;z-index:31;right:20px;bottom:20px;width:320px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:12px 13px;border:1px solid var(--xmd-line);border-radius:13px;background:color-mix(in srgb,var(--xmd-bg) 96%,transparent);color:inherit;box-shadow:var(--xmd-shadow);backdrop-filter:blur(14px);pointer-events:auto;cursor:pointer}.xmd-progress-dock[hidden]{display:none}.xmd-dock-copy{min-width:0;display:grid;text-align:left}.xmd-dock-copy strong{font-size:12px}.xmd-dock-copy span{font-size:10.5px;color:var(--xmd-muted)}.xmd-progress-dock>b{font-size:12px}.xmd-progress-dock>.xmd-progress{grid-column:1/-1}
.xmd-floating-trigger{position:fixed;z-index:25;width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.22);border-radius:11px;background:rgba(15,23,42,.78);color:#fff;box-shadow:0 8px 25px rgba(0,0,0,.28);backdrop-filter:blur(9px);pointer-events:auto;cursor:pointer;transition:opacity .14s ease,transform .14s ease}.xmd-floating-trigger:hover{background:rgba(15,23,42,.9);transform:translateY(-1px)}.xmd-floating-trigger[hidden]{display:none}.xmd-floating-trigger.xmd-busy{opacity:.58;cursor:wait}
@media(max-width:640px){.xmd-task-center{left:12px;right:12px;top:auto;bottom:82px;width:auto;max-height:68vh}.xmd-task-list{max-height:34vh}.xmd-progress-dock{left:12px;right:12px;bottom:12px;width:auto}.xmd-media-row{grid-template-columns:18px 70px minmax(0,1fr)}.xmd-media-thumb{width:70px;height:52px}.xmd-badge{grid-column:3;justify-self:start}}
            `.trim();
        },

        install(shadowRoot) {
            if (!shadowRoot || shadowRoot.querySelector?.('#xmd-style')) return;
            const style = document.createElement('style');
            style.id = 'xmd-style';
            style.textContent = this.css();
            shadowRoot.prepend(style);
        }
    });

    XMD.uiRoot = Object.freeze({
        ensure() {
            if (typeof document === 'undefined') return null;
            let host = document.getElementById('xmd-host');
            if (!host) {
                host = document.createElement('div');
                host.id = 'xmd-host';
                host.dataset.xmdProject = 'x-media-downloader';
                host.dataset.xmdOwner = 'xiaohuitongxue';
                host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483000;pointer-events:none;';
                (document.documentElement || document.body).appendChild(host);
            }
            const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
            XMD.uiStyles.install(shadow);
            let root = shadow.getElementById('xmd-root');
            if (!root) {
                root = document.createElement('div');
                root.id = 'xmd-root';
                shadow.appendChild(root);
            }
            return root;
        }
    });
