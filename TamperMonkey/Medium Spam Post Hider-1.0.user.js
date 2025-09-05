// ==UserScript==
// @name         Medium Spam Post Hider
// @namespace    medium-spam-block
// @version      1.0
// @description  Hide spammy posts (phone numbers, Persian spam keywords) in Medium feeds
// @author       you
// @match        https://medium.com/*
// @match        https://*.medium.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const patterns = [
        /\d{8,}/,                                     // long digit strings (phone numbers)
        /شماره|خاله|ساری|گرگان|بابل|کرمان|اصفهان/i, // common spam words
        /call\s*now/i,
        /contact\s*number/i,
        /whats?\s*app/i
    ];

    function isSpam(text) {
        return patterns.some(re => re.test(text));
    }

    function scan() {
        document.querySelectorAll('div, section, article').forEach(el => {
            if (el.dataset.spamChecked) return;
            el.dataset.spamChecked = "1";

            const text = el.innerText || "";
            if (isSpam(text)) {
                el.style.display = "none";
                console.log("🚫 Medium Spam Post Hidden:", text.slice(0, 50));
            }
        });
    }

    // Initial scan
    scan();

    // Observe for new posts loading
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList: true, subtree: true });
})();
