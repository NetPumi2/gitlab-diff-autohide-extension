const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];

const enabledCheckbox = document.getElementById('enabled');
const textarea = document.getElementById('patterns');
const status = document.getElementById('status');

chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS, enabled: true }, (data) => {
  textarea.value = data.patterns.join('\n');
  enabledCheckbox.checked = data.enabled !== false;
});

// The on/off toggle takes effect immediately (no need to hit Save).
enabledCheckbox.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledCheckbox.checked });
});

document.getElementById('save').addEventListener('click', () => {
  const patterns = textarea.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  chrome.storage.sync.set({ patterns, enabled: enabledCheckbox.checked }, () => {
    status.textContent = 'Saved!';
    setTimeout(() => (status.textContent = ''), 1500);
  });
});
