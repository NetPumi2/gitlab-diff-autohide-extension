const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];

const enabledCheckbox = document.getElementById('enabled');
const coverageEnabledCheckbox = document.getElementById('coverageEnabled');
const textarea = document.getElementById('patterns');
const status = document.getElementById('status');

chrome.storage.sync.get(
  { patterns: DEFAULT_PATTERNS, enabled: true, coverageEnabled: true },
  (data) => {
    textarea.value = data.patterns.join('\n');
    enabledCheckbox.checked = data.enabled !== false;
    coverageEnabledCheckbox.checked = data.coverageEnabled !== false;
  }
);

// Both toggles take effect immediately (no need to hit Save).
enabledCheckbox.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledCheckbox.checked });
});

coverageEnabledCheckbox.addEventListener('change', () => {
  chrome.storage.sync.set({ coverageEnabled: coverageEnabledCheckbox.checked });
});

document.getElementById('save').addEventListener('click', () => {
  const patterns = textarea.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  chrome.storage.sync.set(
    {
      patterns,
      enabled: enabledCheckbox.checked,
      coverageEnabled: coverageEnabledCheckbox.checked,
    },
    () => {
      status.textContent = 'Saved!';
      setTimeout(() => (status.textContent = ''), 1500);
    }
  );
});
