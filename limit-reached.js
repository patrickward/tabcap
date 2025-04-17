document.addEventListener('DOMContentLoaded', () => {
  // Display current limits
  chrome.storage.sync.get(['maxTabsPerWindow', 'maxTotalWindows'], (items) => {
    document.getElementById('tabLimit').textContent = items.maxTabsPerWindow || 10;
    document.getElementById('windowLimit').textContent = items.maxTotalWindows || 3;
  });

  // Settings button functionality
  document.getElementById('openSettings').addEventListener('click', () => {
    // Try to open options page
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      // Fallback for browsers that don't support openOptionsPage
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  // Close button functionality
  document.getElementById('closeTab').addEventListener('click', () => {
    window.close();
  });
});