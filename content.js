(() => {
  const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];
  const PROCESSED_ATTR = 'data-autohide-processed';

  let regexes = [];

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

  function scan() {
    document.querySelectorAll('.file-header-content').forEach(processHeader);
  }

  function start() {
    loadPatterns(() => {
      scan();
      const observer = new MutationObserver(() => scan());
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
