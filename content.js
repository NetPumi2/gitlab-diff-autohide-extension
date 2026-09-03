(() => {
  const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];
  const PROCESSED_ATTR = 'data-autohide-processed';
  const RANDOM_BTN_ID = 'gitlab-random-mr-btn';
  const HIDDEN_BADGE_CLASS = 'gitlab-hidden-badge';
  const STYLE_ID = 'gitlab-autohide-styles';
  const COVERAGE_BTN_ID = 'gitlab-coverage-btn';

  let regexes = [];
  let enabled = true;
  let coverageEnabled = true;
  let coverageIndex = -1;

  // ---- Settings ----

  function globToRegex(glob) {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$');
  }

  function loadSettings(callback) {
    chrome.storage.sync.get(
      { patterns: DEFAULT_PATTERNS, enabled: true, coverageEnabled: true },
      (data) => {
        regexes = data.patterns
          .map((p) => p.trim())
          .filter(Boolean)
          .map(globToRegex);
        enabled = data.enabled !== false;
        coverageEnabled = data.coverageEnabled !== false;
        callback();
      }
    );
  }

  // ---- Diff auto-hide (merge request diffs page) ----

  function shouldHide(filename) {
    return regexes.some((re) => re.test(filename));
  }

  function getFilename(header) {
    const nameEl = header.querySelector('[data-testid="file-name-content"]');
    if (!nameEl) return null;
    return (nameEl.getAttribute('title') || nameEl.textContent || '').trim();
  }

  function processHeader(header) {
    if (header.hasAttribute(PROCESSED_ATTR)) return;

    const filename = getFilename(header);
    if (!filename) return;

    header.setAttribute(PROCESSED_ATTR, 'true');

    if (shouldHide(filename)) {
      const btn = header.querySelector('button[aria-label="Hide file contents"]');
      if (btn) btn.click();
    }
  }

  function scanDiffHeaders() {
    document.querySelectorAll('.file-header-content').forEach(processHeader);
  }

  // ---- Random MR button (merge requests list page) ----

  function isMrListPage() {
    return /\/merge_requests\/?$/.test(location.pathname);
  }

  function getMrLinks() {
    return Array.from(document.querySelectorAll('a[data-testid="issuable-title-link"]')).filter(
      (a) => /\/merge_requests\/\d+/.test(a.getAttribute('href') || '')
    );
  }

  function createRandomButton() {
    const btn = document.createElement('button');
    btn.id = RANDOM_BTN_ID;
    btn.type = 'button';
    btn.textContent = '🎲 Random MR';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '9999',
      padding: '10px 18px',
      borderRadius: '20px',
      border: 'none',
      background: '#6e49cb',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      fontFamily: 'sans-serif',
      cursor: 'pointer',
      boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
    });

    btn.addEventListener('click', () => {
      const links = getMrLinks();
      if (links.length === 0) {
        const original = btn.textContent;
        btn.textContent = 'No MRs found';
        setTimeout(() => (btn.textContent = original), 1500);
        return;
      }
      const chosen = links[Math.floor(Math.random() * links.length)];
      window.location.href = chosen.href;
    });

    document.body.appendChild(btn);
  }

  function ensureRandomButton() {
    if (!document.getElementById(RANDOM_BTN_ID)) createRandomButton();
  }

  function removeRandomButton() {
    document.getElementById(RANDOM_BTN_ID)?.remove();
  }

  function handleRoute() {
    if (isMrListPage()) {
      ensureRandomButton();
    } else {
      removeRandomButton();
    }
  }

  // ---- Hide "Changes" file-count badge (merge request detail page) ----

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HIDDEN_BADGE_CLASS} {
        background-color: #e9322d !important;
        border-color: #e9322d !important;
        position: relative;
        pointer-events: auto !important;
      }
      .${HIDDEN_BADGE_CLASS} .js-changes-tab-count,
      .${HIDDEN_BADGE_CLASS} .gl-badge-content {
        color: transparent !important;
        pointer-events: none;
      }
      .${HIDDEN_BADGE_CLASS}:hover {
        background-color: var(--gitlab-autohide-original-bg, transparent) !important;
        border-color: var(--gitlab-autohide-original-border, transparent) !important;
      }
      .${HIDDEN_BADGE_CLASS}:hover .js-changes-tab-count,
      .${HIDDEN_BADGE_CLASS}:hover .gl-badge-content {
        color: var(--gitlab-autohide-original-color, inherit) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function processChangesCount(countEl) {
    const badge = countEl.closest('.gl-badge') || countEl.parentElement;
    if (!badge) return;

    const text = countEl.textContent.trim();
    if (text) {
      badge.dataset.originalCount = text;
      badge.title = `${text} changed files`;
    }

    if (!badge.classList.contains(HIDDEN_BADGE_CLASS)) {
      const badgeStyle = getComputedStyle(badge);
      badge.style.setProperty('--gitlab-autohide-original-bg', badgeStyle.backgroundColor);
      badge.style.setProperty('--gitlab-autohide-original-border', badgeStyle.borderColor);

      const contentEl = badge.querySelector('.gl-badge-content') || countEl;
      const contentStyle = getComputedStyle(contentEl);
      badge.style.setProperty('--gitlab-autohide-original-color', contentStyle.color);
    }

    badge.classList.add(HIDDEN_BADGE_CLASS);
  }

  function scanChangesCount() {
    document.querySelectorAll('.js-changes-tab-count').forEach(processChangesCount);
  }

  function revertChangesCount() {
    document.querySelectorAll('.' + HIDDEN_BADGE_CLASS).forEach((badge) => {
      badge.classList.remove(HIDDEN_BADGE_CLASS);
      badge.style.removeProperty('--gitlab-autohide-original-bg');
      badge.style.removeProperty('--gitlab-autohide-original-border');
      badge.style.removeProperty('--gitlab-autohide-original-color');
      badge.removeAttribute('title');
      delete badge.dataset.originalCount;
    });
  }

  // ---- Jump-to-uncovered-line button (diffs page) ----
  //
  // GitLab only ever renders diff content that's near the current scroll
  // position (virtualized file list), so there's no reliable way to
  // "pre-scan the whole page" from a content script - trying to drive that
  // programmatically turned out to be slow and fragile. Instead, this just
  // scans whatever's currently in the DOM on every tick(): as the user
  // scrolls through the diff themselves, GitLab mounts new content, tick()
  // fires (via the MutationObserver in start()), and the button updates to
  // match what's visible right now.

  function isDiffsPage() {
    return /\/merge_requests\/\d+\/diffs/.test(location.pathname);
  }

  function getUncoveredLines() {
    return Array.from(document.querySelectorAll('.diff-td.line-coverage.no-coverage'));
  }

  function flashLine(el) {
    const previousOutline = el.style.outline;
    const previousOffset = el.style.outlineOffset;
    el.style.outline = '2px solid #fff';
    el.style.outlineOffset = '-2px';
    setTimeout(() => {
      el.style.outline = previousOutline;
      el.style.outlineOffset = previousOffset;
    }, 1000);
  }

  function goToNextUncoveredLine() {
    const lines = getUncoveredLines();
    if (lines.length === 0) return;
    coverageIndex = (coverageIndex + 1) % lines.length;
    const target = lines[coverageIndex];
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    flashLine(target);
  }

  function createCoverageButton() {
    const btn = document.createElement('button');
    btn.id = COVERAGE_BTN_ID;
    btn.type = 'button';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '9999',
      padding: '10px 18px',
      borderRadius: '20px',
      border: 'none',
      background: '#e9322d',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      fontFamily: 'sans-serif',
      cursor: 'pointer',
      boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
    });
    btn.addEventListener('click', goToNextUncoveredLine);
    document.body.appendChild(btn);
    return btn;
  }

  function removeCoverageButton() {
    document.getElementById(COVERAGE_BTN_ID)?.remove();
    coverageIndex = -1;
  }

  function ensureCoverageButton() {
    if (!coverageEnabled || !isDiffsPage()) {
      removeCoverageButton();
      return;
    }

    const count = getUncoveredLines().length;
    if (count === 0) {
      removeCoverageButton();
      return;
    }

    let btn = document.getElementById(COVERAGE_BTN_ID);
    if (!btn) btn = createCoverageButton();

    const text = String(count);
    // Guard against writing the same text every tick: `.textContent =`
    // always replaces child nodes, even with an identical value, which the
    // MutationObserver (childList + subtree) picks up as a mutation and
    // re-triggers tick() with. Left unconditional, that becomes an infinite
    // self-triggered mutation loop that hangs the tab.
    if (btn.textContent !== text) {
      btn.textContent = text;
    }
  }

  // ---- bootstrap ----

  function disableAll() {
    removeRandomButton();
    removeCoverageButton();
    revertChangesCount();
  }

  function tick() {
    if (!enabled) {
      disableAll();
      return;
    }
    scanDiffHeaders();
    scanChangesCount();
    handleRoute();
    ensureCoverageButton();
  }

  function start() {
    injectStyles();
    loadSettings(() => {
      tick();
      const observer = new MutationObserver(tick);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && (changes.patterns || changes.enabled || changes.coverageEnabled)) {
      loadSettings(tick);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
