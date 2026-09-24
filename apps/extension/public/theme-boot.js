// Pre-paint theme stamp: chrome.storage is async, so the last known choice
// is mirrored into localStorage (see lib/theme.ts) and applied here before
// the first frame. 'system' means no stamp — the CSS media query decides.
try {
  var t = localStorage.getItem('echofocus-theme')
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t
} catch (e) {}
