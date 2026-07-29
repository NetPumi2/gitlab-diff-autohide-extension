(() => {
  const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];
  const PROCESSED_ATTR = 'data-autohide-processed';
  const RANDOM_BTN_ID = 'gitlab-random-mr-btn';

  let regexes = [];

  // ---- Diff auto-hide (merge request diffs page) ----

  function globToRegex(glob) {
    // Escape regex special chars, then turn '*' into '.*'
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
    if (!filename) return; // not fully rendered yet, retry on next mutation

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
    // e.g. /frontend/wallee-frontend/-/merge_requests or .../merge_requests/
    // (with or without a query string), but NOT .../merge_requests/1084 or .../diffs
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

  // ---- bootstrap ----

  function tick() {
    scanDiffHeaders();
    handleRoute();
  }

  function start() {
    loadPatterns(() => {
      tick();
      const observer = new MutationObserver(tick);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Re-read patterns if the user updates them in the popup, and re-scan
  // (new headers only, already-processed ones are left alone).
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
