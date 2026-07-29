const DEFAULT_PATTERNS = ['*.spec.ts', '*.stories.tsx', '*.snap'];

const textarea = document.getElementById('patterns');
const status = document.getElementById('status');

chrome.storage.sync.get({ patterns: DEFAULT_PATTERNS }, (data) => {
  textarea.value = data.patterns.join('\n');
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
