// ==UserScript==
// @name         DEV.to Clean Reader (Centered, No Sidebars)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Remove both sidebars on dev.to and center/enlarge the content column
// @match        https://dev.to/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  // Adjust this to your preferred max width (e.g., 1000–1200px)
  const css = `
    :root { --tm-content-max: 1100px; }

    /* 1) Hide both sidebars (use broad selectors for future-proofing) */
    .crayons-layout__sidebar-left,
    .crayons-layout__sidebar-right,
    aside[aria-label="Left sidebar"],
    aside[aria-label="Right sidebar"],
    [data-testid="sidebar-left"],
    [data-testid="sidebar-right"],
    #sidebar-nav,
    .sidebar { display: none !important; }

    /* 2) Force the layout container to a single centered column */
    .crayons-layout,
    .container--layout,
    .layout {
      display: grid !important;
      grid-template-columns: 1fr !important;
      justify-content: center !important;
      gap: 0 !important;
    }

    /* 3) Make the main content span full grid and center it */
    .crayons-layout__content,
    main.crayons-layout__content,
    main#main-content,
    main[role="main"] {
      grid-column: 1 / -1 !important;
      width: min(100%, var(--tm-content-max)) !important;
      max-width: var(--tm-content-max) !important;
      margin-inline: auto !important;
      flex: none !important;          /* undo any flex-basis shrinking */
    }

    /* 4) Ensure article/feed blocks obey the same width & centering */
    .crayons-article,
    .crayons-article__main,
    .articles-list,
    .listing,
    .home--feed {
      width: min(100%, var(--tm-content-max)) !important;
      max-width: var(--tm-content-max) !important;
      margin-inline: auto !important;
    }

    /* Optional: make header/outer wrapper center its child column */
    #page-content,
    .container {
      justify-content: center !important;
    }
  `;

  // Inject once
  if (!document.getElementById('tm-devto-clean-reader')) {
    const style = document.createElement('style');
    style.id = 'tm-devto-clean-reader';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // DEV.to is an SPA—ensure styles keep applying after nav changes
  const mo = new MutationObserver(() => {
    if (!document.getElementById('tm-devto-clean-reader')) {
      const style = document.createElement('style');
      style.id = 'tm-devto-clean-reader';
      style.textContent = css;
      document.head.appendChild(style);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
