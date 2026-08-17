    // =============================================================================
    // XMD · 内置矢量图标
    // =============================================================================
    // 图标随脚本发布，不加载字体、图标 CDN 或第三方运行时资源。
    XMD.icons = Object.freeze({
        get(name) {
            const icons = {
                download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"/></svg>',
                github: '<svg viewBox="0 0 24 24" aria-hidden="true" class="xmd-fill"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.15c-3.14.68-3.8-1.34-3.8-1.34-.51-1.31-1.26-1.66-1.26-1.66-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.53-2.51-.29-5.15-1.25-5.15-5.57 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.44.11-2.99 0 0 .94-.3 3.06 1.16A10.6 10.6 0 0 1 12 5.9c.95 0 1.9.13 2.79.37 2.11-1.46 3.06-1.16 3.06-1.16.61 1.55.23 2.7.11 2.99.72.79 1.16 1.8 1.16 3.03 0 4.33-2.65 5.28-5.17 5.56.4.35.77 1.03.77 2.09v3.15c0 .3.21.65.78.54A11.2 11.2 0 0 0 12 .8Z"/></svg>',
                userscript: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 8h8M8 12h8v5H8z"/></svg>',
                close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
                pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>',
                play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
                retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M19 12a7 7 0 1 0-2 5"/></svg>',
                trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg>',
                chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>'
            };
            return icons[name] || '';
        }
    });
