(() => {
  const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];
  const DEFAULT_ENABLED = true;

  let regexes = [];
  let enabled = DEFAULT_ENABLED;

  function globToRegex(glob) {
    // Escape regex special chars, then turn '*' into '.*'
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$');
  }

  function loadState(callback) {
    chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS, enabled: DEFAULT_ENABLED }, (data) => {
      regexes = data.patterns
        .map((p) => p.trim())
        .filter(Boolean)
        .map(globToRegex);
      enabled = data.enabled;
      callback();
    });
  }

  function matchesPattern(filename) {
    return regexes.some((re) => re.test(filename));
  }

  function getFilename(header) {
    const nameEl = header.querySelector('[data-testid="file-name-content"]');
    if (!nameEl) return null;
    return (nameEl.getAttribute('title') || nameEl.textContent || '').trim();
  }

  // Idempotent: only clicks when the file isn't already in the desired
  // state, so re-running on every mutation/toggle change is safe and
  // converges instead of looping.
  function applyToHeader(header) {
    const filename = getFilename(header);
    if (!filename || !matchesPattern(filename)) return;

    if (enabled) {
      const hideBtn = header.querySelector('button[aria-label="Hide file contents"]');
      if (hideBtn) hideBtn.click();
    } else {
      const showBtn = header.querySelector('button[aria-label="Show file contents"]');
      if (showBtn) showBtn.click();
    }
  }

  function scan() {
    document.querySelectorAll('.file-header-content').forEach(applyToHeader);
  }

  function start() {
    loadState(() => {
      scan();
      const observer = new MutationObserver(() => scan());
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // React live to changes made in the popup (patterns or the on/off toggle)
  // and immediately re-apply the desired state to already-rendered files.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || (!changes.patterns && !changes.enabled)) return;
    loadState(() => scan());
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
