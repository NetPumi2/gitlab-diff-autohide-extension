const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];
const DEFAULT_ENABLED = true;

const textarea = document.getElementById('patterns');
const status = document.getElementById('status');
const enabledCheckbox = document.getElementById('enabled');

chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS, enabled: DEFAULT_ENABLED }, (data) => {
  textarea.value = data.patterns.join('\n');
  enabledCheckbox.checked = data.enabled;
});

// Written straight to storage so content.js (listening via
// chrome.storage.onChanged) reacts immediately, without needing "Save".
enabledCheckbox.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledCheckbox.checked });
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
