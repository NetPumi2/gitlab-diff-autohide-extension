const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];
const RELOAD_URL_RE = /^https:\/\/gitlab\.wallee\.com\/.*\/merge_requests/;

const textarea = document.getElementById('patterns');
const status = document.getElementById('status');
const enabledCheckbox = document.getElementById('enabled');
const revealBtn = document.getElementById('reveal');
const revealStatus = document.getElementById('revealStatus');

chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS, enabled: true }, (data) => {
  textarea.value = data.patterns.join('\n');
  enabledCheckbox.checked = data.enabled;
});

document.getElementById('save').addEventListener('click', () => {
  const patterns = textarea.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  chrome.storage.sync.set({ patterns }, () => {
    status.textContent = 'Saved!';
    setTimeout(() => (status.textContent = ''), 1500);
  });
});

enabledCheckbox.addEventListener('change', () => {
  const enabled = enabledCheckbox.checked;
  chrome.storage.sync.set({ enabled }, () => {
    if (!enabled) return;
    // Re-enabling: reload the active tab if it's a page the extension acts on,
    // so the content script re-applies its effects right away.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.id && RELOAD_URL_RE.test(tab.url || '')) {
        chrome.tabs.reload(tab.id);
      }
    });
  });
});

revealBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'GITLAB_AUTOHIDE_REVEAL' }, () => {
      // Swallow "no receiving end" errors when the active tab has no content script.
      const err = chrome.runtime.lastError;
      revealStatus.textContent = err ? 'Not on a GitLab MR page' : 'Revealed!';
      setTimeout(() => (revealStatus.textContent = ''), 1500);
    });
  });
});
