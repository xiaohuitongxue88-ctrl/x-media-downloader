    // =============================================================================
    // XMD · 项目支持提示样式
    // =============================================================================
    // 与主 UI 共用 Shadow DOM，但独立维护，避免支持模块改动扩大核心样式变更面。
    XMD.supportStyles = Object.freeze({
        css() {
            return `
.xmd-support-card{position:fixed;z-index:32;right:20px;bottom:92px;width:320px;padding:14px;border:1px solid #d9e4ef;border-radius:13px;background:linear-gradient(135deg,rgba(239,246,255,.96),rgba(248,250,252,.98));box-shadow:var(--xmd-shadow);backdrop-filter:blur(14px);pointer-events:auto}
.xmd-support-card[hidden]{display:none}
.xmd-support-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.xmd-support-head>div{min-width:0}.xmd-support-head strong{font-size:13px}.xmd-support-head p{margin:5px 0 0;color:#52677c;font-size:12px;line-height:1.65}
.xmd-support-actions{display:flex;gap:8px;margin-top:12px}.xmd-support-link{flex:1;height:34px;display:grid;place-items:center;border:1px solid var(--xmd-line);border-radius:8px;background:var(--xmd-bg);color:inherit;font-size:12px;font-weight:600;text-decoration:none}.xmd-support-link:hover{background:var(--xmd-soft)}
@media(prefers-color-scheme:dark){.xmd-support-card{border-color:#334155;background:linear-gradient(135deg,#18212b,#1d2733)}.xmd-support-head p{color:#b8c6d3}}
@media(max-width:640px){.xmd-support-card{left:12px;right:12px;bottom:82px;width:auto}}
            `.trim();
        },
        install(shadowRoot) {
            if (!shadowRoot || shadowRoot.querySelector?.('#xmd-support-style')) return;
            const style = document.createElement('style');
            style.id = 'xmd-support-style';
            style.textContent = this.css();
            shadowRoot.appendChild(style);
        }
    });
