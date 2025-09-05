// ==UserScript==
// @name         Medium Topics Bar (with Toggle) v1.4
// @namespace    https://tampermonkey.net/users/you
// @version      1.4
// @description  Restore a customizable "Followed Topics" bar on Medium with an on-page toggle button integrated into the bar.
// @author       You
// @match        https://medium.com/*
// @match        https://*.medium.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const DEBUG = true;
  const FOLLOWED_TOPICS = [
    { name: 'Software Development', slug: 'software-development' },
    { name: 'Comics', slug: 'comics' },
    { name: 'Technology', slug: 'technology' },
    { name: 'Software Engineering', slug: 'software-engineering' },
    { name: 'Programming', slug: 'programming' }
  ];

  const STORAGE_KEY_ENABLED = 'tm_medium_topics_bar_enabled_v1_4';
  const STORAGE_KEY_LAST_TOP = 'tm_medium_topics_bar_last_header_top_v1_4';

  function log(...args) { if (!DEBUG) return; try { console.log('[tm-topics]', ...args); } catch (e) {} }

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  /*************** STYLES ***************/
  const CSS = `
  :root {
    --topics-z: 99999;
    --topics-gap: 10px;
    --topics-pad-y: 10px;
    --topics-pad-x: 16px;
    --topics-radius: 20px;
    --topics-font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    --topics-toggle-height: 28px;
    --topics-top-offset: 56px;
  }
  .tm-topics-bar {
    position: fixed !important;
    top: var(--topics-top-offset) !important;
    left: 0 !important;
    right: 0 !important;
    display: flex !important;
    align-items: center !important;
    gap: var(--topics-gap) !important;
    padding: var(--topics-pad-y) var(--topics-pad-x) !important;
    background: #fff !important;
    border-bottom: 1px solid #e6e6e6 !important;
    z-index: var(--topics-z) !important;
    overflow-x: auto !important;
    box-shadow: 0 2px 6px rgba(0,0,0,.08) !important;
  }
  .tm-topics-bar::-webkit-scrollbar { height: 8px; }
  .tm-topics-bar::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 8px; }

  .tm-topic {
    background: #f7f7f7 !important;
    border: 1px solid #e1e4e8 !important;
    border-radius: var(--topics-radius) !important;
    padding: 6px 14px !important;
    font-size: 14px !important;
    color: #242424 !important;
    text-decoration: none !important;
    white-space: nowrap !important;
    transition: transform .12s ease, background .12s ease, border-color .12s ease !important;
    cursor: pointer !important;
    font-family: var(--topics-font) !important;
  }
  .tm-topic:hover { background: #eee !important; border-color: #d0d7de !important; transform: translateY(-1px); }
  .tm-topic.active { background: #1a8917 !important; border-color: #1a8917 !important; color: #fff !important; }

  .tm-topics-label {
    font-weight: 600 !important;
    color: #6b6b6b !important;
    margin-right: 6px !important;
    font-family: var(--topics-font) !important;
  }

  .tm-topics-spacer {
    width: 100%;
    height: 0px;
    pointer-events: none;
  }

  .tm-toggle {
    margin-left: auto !important; /* push to far right */
    background: #fff !important;
    border: 1px solid #e1e4e8 !important;
    border-radius: 999px !important;
    height: var(--topics-toggle-height) !important;
    padding: 0 10px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    font-size: 12px !important;
    line-height: 1 !important;
    cursor: pointer !important;
    font-family: var(--topics-font) !important;
    box-shadow: 0 2px 6px rgba(0,0,0,.08) !important;
  }
  .tm-toggle input { accent-color: #1a8917; cursor: pointer; }
  .tm-toggle span { color: #242424; }

  @media (prefers-color-scheme: dark) {
    .tm-topics-bar { background: #242424 !important; border-bottom-color: #3c3c3c !important; }
    .tm-topic { background: #3c3c3c !important; border-color: #4c4c4c !important; color: #efefef !important; }
    .tm-topic:hover { background: #4c4c4c !important; border-color: #5c5c5c !important; }
    .tm-toggle { background: #242424 !important; border-color: #3c3c3c !important; color: #efefef !important; }
  }
  `;

  function addStyles() {
    if (document.getElementById('tm-topics-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-topics-style';
    style.textContent = CSS;
    document.head.appendChild(style);
    log('styles added');
  }

  function findHeader() {
    const sel = [
      'header',
      'div[role="banner"]',
      'div[data-testid="siteHeader"]',
      'div[data-test-id="header"]',
      'div[aria-label*="header"]'
    ];
    for (const s of sel) {
      const n = qs(s);
      if (n) return n;
    }
    return null;
  }
  function findMain() {
    return qs('main') || qs('div[role="main"]') || qs('main[role="main"]') || qs('div#root > div');
  }

  function getHeaderHeight() {
    const header = findHeader();
    if (header) {
      const r = header.getBoundingClientRect();
      const h = Math.max(40, Math.round(r.height));
      return h;
    }
    return 56;
  }

  function setTopOffset(px) {
    const root = document.documentElement;
    root.style.setProperty('--topics-top-offset', px + 'px');
    localStorage.setItem(STORAGE_KEY_LAST_TOP, String(px));
  }

  function buildTopicsBar() {
    qsa('.tm-topics-bar').forEach(n => n.remove());
    const bar = document.createElement('div');
    bar.className = 'tm-topics-bar';
    bar.setAttribute('role','navigation');
    bar.setAttribute('aria-label','Followed topics (Tampermonkey)');

    const label = document.createElement('span');
    label.className = 'tm-topics-label';
    label.textContent = 'Following:';
    bar.appendChild(label);

    const home = document.createElement('a');
    home.className = 'tm-topic';
    home.textContent = 'All';
    home.href = 'https://medium.com/';
    if ((location.hostname === 'medium.com' && (location.pathname === '/' || location.pathname === '')) || location.pathname === '/') {
      home.classList.add('active');
    }
    bar.appendChild(home);

    FOLLOWED_TOPICS.forEach(t => {
      const a = document.createElement('a');
      a.className = 'tm-topic';
      a.textContent = t.name;
      a.href = `https://medium.com/me/following-feed/topics/${t.slug}`;
      try {
        if (location.pathname.startsWith(`/me/following-feed/topics/${t.slug}`)) a.classList.add('active');
      } catch (e) {}
      bar.appendChild(a);
    });

    document.body.appendChild(bar);
    return bar;
  }

  function ensureSpacer() {
    let spacer = qs('.tm-topics-spacer');
    if (spacer) return spacer;
    spacer = document.createElement('div');
    spacer.className = 'tm-topics-spacer';
    const header = findHeader();
    if (header && header.parentNode) {
      header.parentNode.insertBefore(spacer, header.nextSibling);
    } else {
      const main = findMain();
      if (main && main.parentNode) {
        main.parentNode.insertBefore(spacer, main);
      } else {
        document.body.insertBefore(spacer, document.body.firstChild);
      }
    }
    return spacer;
  }

  function buildToggle() {
    const prev = qs('.tm-toggle');
    if (prev) prev.remove();

    const wrap = document.createElement('label');
    wrap.className = 'tm-toggle';
    wrap.title = 'Show/Hide Topics Bar';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isEnabled();
    input.addEventListener('change', () => {
      setEnabled(input.checked);
      render();
    });

    const txt = document.createElement('span');
    txt.textContent = input.checked ? 'Topics: On' : 'Topics: Off';
    input.addEventListener('change', () => {
      txt.textContent = input.checked ? 'Topics: On' : 'Topics: Off';
    });

    wrap.appendChild(input);
    wrap.appendChild(txt);

    const bar = qs('.tm-topics-bar');
    if (bar) bar.appendChild(wrap); // << place inside bar
    return wrap;
  }

  function isEnabled() {
    const raw = localStorage.getItem(STORAGE_KEY_ENABLED);
    return raw === null ? true : raw === 'true';
  }
  function setEnabled(v) { localStorage.setItem(STORAGE_KEY_ENABLED, String(!!v)); }

  function render() {
    try {
      addStyles();
      const headerHeight = getHeaderHeight();
      setTopOffset(headerHeight);

      const enabled = isEnabled();
      const existingBar = qs('.tm-topics-bar');
      const bar = enabled ? (existingBar || buildTopicsBar()) : existingBar;
      if (bar) {
        bar.style.display = enabled ? 'flex' : 'none';
        bar.style.top = headerHeight + 'px';
      }

      const spacer = ensureSpacer();
      if (enabled && bar) {
        const h = Math.round(bar.getBoundingClientRect().height) || 50;
        spacer.style.height = h + 'px';
      } else {
        spacer.style.height = '0px';
      }

      if (bar) buildToggle(); // add toggle into bar
    } catch (err) {
      console.error('[tm-topics] render error', err);
    }
  }

  function init() {
    const lastTop = parseInt(localStorage.getItem(STORAGE_KEY_LAST_TOP) || '0', 10);
    if (!isNaN(lastTop) && lastTop > 0) setTopOffset(lastTop);
    render();

    const header = findHeader();
    if (header && 'ResizeObserver' in window) {
      try {
        const ro = new ResizeObserver(() => { render(); });
        ro.observe(header);
      } catch (e) {}
    }

    let lastUrl = location.href;
    const mo = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(render, 300);
      }
    });
    mo.observe(document, { childList: true, subtree: true });

    window.addEventListener('popstate', () => setTimeout(render, 200));
    window.addEventListener('hashchange', () => setTimeout(render, 200));

    window.addEventListener('keydown', (e) => {
      if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
        setEnabled(!isEnabled());
        render();
      }
    });

    setTimeout(render, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
