// ==UserScript==
// @name         Medium Topics Bar (with Toggle) v1.6
// @namespace    https://tampermonkey.net/users/you
// @version      1.6
// @description  Followed Topics bar, wide layout for feed and articles, and auto-reveal of the Recommended/Latest dropdown.
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
    { name: 'Self Improvement', slug: 'self-improvement' },
    { name: 'Personal Development', slug: 'personal-development' },
    { name: 'Software Development', slug: 'software-development' },
    { name: 'Addiction', slug: 'addiction' },
    { name: 'Comics', slug: 'comics' },
    { name: 'Health', slug: 'health' },
    { name: 'Productivity', slug: 'productivity' },
    { name: 'Technology', slug: 'technology' },
    { name: 'Software Engineering', slug: 'software-engineering' },
    { name: 'Programming', slug: 'programming' }
  ];

  /*************** WIDTH SETTINGS ***************/
  // Max width of the feed column (home, following, topic pages).
  // 'none' = use all space next to the left sidebar. Or try '1200px'.
  const FEED_MAX = 'none';
  // Max width of the text column when reading a single article.
  // Very long lines are hard to read, so default is 1000px. Use 'none' for full width.
  const READER_MAX = '1000px';
  // Only columns Medium caps between these widths get widened.
  const CAP_MIN = 400;
  const CAP_MAX = 1400;

  const STORAGE_KEY_ENABLED = 'tm_medium_topics_bar_enabled_v1_5';
  const STORAGE_KEY_LAST_TOP = 'tm_medium_topics_bar_last_header_top_v1_5';
  const STORAGE_KEY_WIDE = 'tm_medium_wide_enabled_v1_6';

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
    --tm-feed-max: none;
    --tm-reader-max: 1000px;
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

  .tm-toggle {
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
    flex-shrink: 0 !important;
  }
  .tm-toggle.tm-first { margin-left: auto !important; }
  .tm-toggle input { accent-color: #1a8917; cursor: pointer; }
  .tm-toggle span { color: #242424; }

  /* Wide layout: elements get tagged by applyWide() */
  [data-tm-wide="feed"] {
    max-width: var(--tm-feed-max) !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  [data-tm-wide="reader"] {
    max-width: var(--tm-reader-max) !important;
  }

  @media (prefers-color-scheme: dark) {
    .tm-topics-bar { background: #242424 !important; border-bottom-color: #3c3c3c !important; }
    .tm-topic { background: #3c3c3c !important; border-color: #4c4c4c !important; color: #efefef !important; }
    .tm-topic:hover { background: #4c4c4c !important; border-color: #5c5c5c !important; }
    .tm-toggle { background: #242424 !important; border-color: #3c3c3c !important; color: #efefef !important; }
    .tm-toggle span { color: #efefef !important; }
  }
  `;

  function addStyles() {
    if (document.getElementById('tm-topics-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-topics-style';
    style.textContent = CSS;
    document.head.appendChild(style);
    document.documentElement.style.setProperty('--tm-feed-max', FEED_MAX);
    document.documentElement.style.setProperty('--tm-reader-max', READER_MAX);
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

  function getHeaderHeight() {
    const header = findHeader();
    if (header) {
      const r = header.getBoundingClientRect();
      return Math.max(40, Math.round(r.height));
    }
    return 56;
  }

  function setTopOffset(px) {
    document.documentElement.style.setProperty('--topics-top-offset', px + 'px');
    localStorage.setItem(STORAGE_KEY_LAST_TOP, String(px));
  }

  function applyBodyPadding(totalPx) {
    document.body.style.setProperty('padding-top', totalPx + 'px', 'important');
  }

  function clearBodyPadding() {
    document.body.style.removeProperty('padding-top');
  }

  /*************** WIDE LAYOUT ***************/
  function isWide() {
    const raw = localStorage.getItem(STORAGE_KEY_WIDE);
    return raw === null ? true : raw === 'true';
  }

  function setWide(v) {
    localStorage.setItem(STORAGE_KEY_WIDE, String(!!v));
  }

  function isCapped(el) {
    if (el.hasAttribute('data-tm-wide')) return false;
    const mw = getComputedStyle(el).maxWidth;
    if (!mw || !mw.endsWith('px')) return false;
    const v = parseFloat(mw);
    return v >= CAP_MIN && v <= CAP_MAX;
  }

  function isReaderPage(articles) {
    return articles.length === 1 && !!qs('h1', articles[0]);
  }

  function applyWide() {
    if (!isWide()) {
      qsa('[data-tm-wide]').forEach(n => n.removeAttribute('data-tm-wide'));
      return;
    }
    const articles = qsa('article');
    if (!articles.length) return;

    const reader = isReaderPage(articles);
    const tag = reader ? 'reader' : 'feed';
    const seen = new Set();
    let count = 0;

    // Walk up from each article and lift any width cap on its containers.
    articles.forEach(a => {
      let n = a;
      while (n && n !== document.body && !seen.has(n)) {
        seen.add(n);
        if (isCapped(n)) { n.setAttribute('data-tm-wide', tag); count++; }
        n = n.parentElement;
      }
    });

    // In reading view, the text column cap sits inside the article.
    if (reader) {
      qsa('div, section', articles[0]).forEach(n => {
        if (isCapped(n)) { n.setAttribute('data-tm-wide', 'reader'); count++; }
      });
    }

    if (count) log('wide: tagged', count, 'elements as', tag);
  }

  let wideTimer = null;
  function scheduleWide(delay = 250) {
    clearTimeout(wideTimer);
    wideTimer = setTimeout(applyWide, delay);
  }

  /*************** SORT DROPDOWN REVEAL ***************/
  // Scrolls Medium's chip row so the Recommended/Latest control is visible.
  function revealSortDropdown() {
    const re = /^(Recommended|Latest)\b/i;
    const ctl = qsa('button, [role="button"], [aria-haspopup]').find(el =>
      re.test((el.textContent || '').trim()) && el.offsetParent !== null
    );
    if (!ctl) return false;

    let sc = ctl.parentElement;
    while (sc && sc !== document.body) {
      const ox = getComputedStyle(sc).overflowX;
      if (/(auto|scroll|hidden)/.test(ox) && sc.scrollWidth > sc.clientWidth + 1) break;
      sc = sc.parentElement;
    }
    if (!sc || sc === document.body) return true;

    const sr = sc.getBoundingClientRect();
    const cr = ctl.getBoundingClientRect();
    if (cr.right > sr.right) sc.scrollLeft += cr.right - sr.right + 16;
    else if (cr.left < sr.left) sc.scrollLeft -= sr.left - cr.left + 16;
    log('sort dropdown revealed');
    return true;
  }

  function scheduleRevealSort() {
    // Medium renders the chip row late, so try a few times.
    [500, 1200, 2500].forEach(ms => setTimeout(revealSortDropdown, ms));
  }

  /*************** TOPICS BAR ***************/
  function buildTopicsBar() {
    qsa('.tm-topics-bar').forEach(n => n.remove());
    const bar = document.createElement('div');
    bar.className = 'tm-topics-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Followed topics (Tampermonkey)');

    const label = document.createElement('span');
    label.className = 'tm-topics-label';
    label.textContent = 'Following:';
    bar.appendChild(label);

    const home = document.createElement('a');
    home.className = 'tm-topic';
    home.textContent = 'All';
    home.href = 'https://medium.com/';
    if (location.hostname === 'medium.com' && (location.pathname === '/' || location.pathname === '')) {
      home.classList.add('active');
    }
    bar.appendChild(home);

    FOLLOWED_TOPICS.forEach(t => {
      const a = document.createElement('a');
      a.className = 'tm-topic';
      a.textContent = t.name;
      a.href = `https://medium.com/me/following-feed/topics/${t.slug}`;
      if (location.pathname.startsWith(`/me/following-feed/topics/${t.slug}`)) {
        a.classList.add('active');
      }
      bar.appendChild(a);
    });

    document.body.appendChild(bar);
    log('topics bar built');
    return bar;
  }

  function makeToggle(cls, labelOn, labelOff, title, getter, setter, onChange) {
    const wrap = document.createElement('label');
    wrap.className = 'tm-toggle ' + cls;
    wrap.title = title;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = getter();

    const txt = document.createElement('span');
    txt.textContent = input.checked ? labelOn : labelOff;

    input.addEventListener('change', () => {
      setter(input.checked);
      txt.textContent = input.checked ? labelOn : labelOff;
      onChange();
    });

    wrap.appendChild(input);
    wrap.appendChild(txt);
    return wrap;
  }

  function buildToggles(bar) {
    qsa('.tm-toggle', bar).forEach(n => n.remove());
    bar.appendChild(makeToggle('tm-first', 'Wide: On', 'Wide: Off', 'Wide layout (Shift+W)',
      isWide, setWide, applyWide));
    bar.appendChild(makeToggle('', 'Topics: On', 'Topics: Off', 'Show/Hide Topics Bar (Shift+T)',
      isEnabled, setEnabled, render));
  }

  function isEnabled() {
    const raw = localStorage.getItem(STORAGE_KEY_ENABLED);
    return raw === null ? true : raw === 'true';
  }

  function setEnabled(v) {
    localStorage.setItem(STORAGE_KEY_ENABLED, String(!!v));
  }

  function render() {
    try {
      addStyles();

      const headerHeight = getHeaderHeight();
      setTopOffset(headerHeight);

      if (!isEnabled()) {
        const existingBar = qs('.tm-topics-bar');
        if (existingBar) existingBar.style.display = 'none';
        clearBodyPadding();
        scheduleWide();
        return;
      }

      let bar = qs('.tm-topics-bar');
      if (!bar) bar = buildTopicsBar();
      bar.style.display = 'flex';
      bar.style.top = headerHeight + 'px';

      buildToggles(bar);

      requestAnimationFrame(() => {
        const barHeight = Math.round(bar.getBoundingClientRect().height) || 50;
        applyBodyPadding(headerHeight + barHeight);
      });

      scheduleWide();
    } catch (err) {
      console.error('[tm-topics] render error', err);
    }
  }

  function isTyping(e) {
    const t = e.target;
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  function onNavigate() {
    // Rebuild bar so the active chip matches the new URL.
    qsa('.tm-topics-bar').forEach(n => n.remove());
    render();
    scheduleRevealSort();
  }

  function init() {
    const lastTop = parseInt(localStorage.getItem(STORAGE_KEY_LAST_TOP) || '0', 10);
    if (!isNaN(lastTop) && lastTop > 0) setTopOffset(lastTop);

    render();
    scheduleRevealSort();

    const header = findHeader();
    if (header && 'ResizeObserver' in window) {
      try { new ResizeObserver(() => render()).observe(header); } catch (e) {}
    }

    // SPA navigation + new feed items (infinite scroll).
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(onNavigate, 300);
      }
      scheduleWide();
    }).observe(document, { childList: true, subtree: true });

    window.addEventListener('popstate', () => setTimeout(onNavigate, 200));
    window.addEventListener('hashchange', () => setTimeout(render, 200));
    window.addEventListener('resize', () => scheduleWide(300));

    // Shift+T toggles bar, Shift+W toggles wide. Ignored while typing.
    window.addEventListener('keydown', (e) => {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (k === 't') { setEnabled(!isEnabled()); render(); }
      else if (k === 'w') { setWide(!isWide()); render(); applyWide(); }
    });

    setTimeout(render, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();