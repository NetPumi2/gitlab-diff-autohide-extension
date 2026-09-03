(() => {
  const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];
  const PROCESSED_ATTR = 'data-autohide-processed';
  const RANDOM_BTN_ID = 'gitlab-random-mr-btn';
  const HIDDEN_BADGE_CLASS = 'gitlab-hidden-badge';
  const STYLE_ID = 'gitlab-autohide-styles';
  const COVERAGE_BTN_ID = 'gitlab-coverage-btn';

  let regexes = [];
  let coverageIndex = -1;

  // ---- Diff auto-hide (merge request diffs page) ----

  function globToRegex(glob) {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$');
  }

  function loadPatterns(callback) {
    chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS }, (data) => {
      regexes = data.patterns
        .map((p) => p.trim())
        .filter(Boolean)
        .map(globToRegex);
      callback();
    });
  }

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
  //
  // GitLab re-renders the count text (Vue) whenever the active tab changes,
  // so instead of clearing the text once, we keep it the same size/shape as
  // the original badge and just recolor it via a persistent CSS class - that
  // way it stays hidden no matter how many times the underlying text node
  // gets updated. On hover, the badge reverts to its original look (colors
  // captured before we override them) so you can peek at the real number,
  // then goes back to red once the mouse leaves.

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

  // ---- Jump-to-uncovered-line button (diffs page) ----
  //
  // GitLab marks each diff line's coverage gutter cell with
  // `.line-coverage.coverage` (hit) or `.line-coverage.no-coverage` (miss).
  // We show a floating button with the current miss count; each click jumps
  // to the next uncovered line (wrapping back to the first after the last).

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

  function ensureCoverageButton() {
    if (!isDiffsPage()) {
      document.getElementById(COVERAGE_BTN_ID)?.remove();
      coverageIndex = -1;
      return;
    }

    const count = getUncoveredLines().length;
    if (count === 0) {
      document.getElementById(COVERAGE_BTN_ID)?.remove();
      coverageIndex = -1;
      return;
    }

    let btn = document.getElementById(COVERAGE_BTN_ID);
    if (!btn) btn = createCoverageButton();
    btn.textContent = `🔴 ${count} uncovered`;
  }

  // ---- bootstrap ----

  function tick() {
    scanDiffHeaders();
    scanChangesCount();
    handleRoute();
    ensureCoverageButton();
  }

  function start() {
    injectStyles();
    loadPatterns(() => {
      tick();
      const observer = new MutationObserver(tick);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.patterns) {
      loadPatterns(() => {});
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
