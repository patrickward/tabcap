// Update stats when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current settings
    const settings = await chrome.storage.sync.get({
      maxTabsPerWindow: 10,
      maxTotalWindows: 3
    });

    document.getElementById('tabsLimit').textContent = settings.maxTabsPerWindow;
    document.getElementById('windowsLimit').textContent = settings.maxTotalWindows;

    // Get all windows to count tabs and windows
    const windows = await chrome.windows.getAll({ populate: true });

    // Update window count
    document.getElementById('currentWindowsCount').textContent = windows.length;

    // Get current window and its tabs
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    if (currentWindow && currentWindow.tabs) {
      document.getElementById('currentTabsCount').textContent = currentWindow.tabs.length;
    }

    // Add event listener for options button
    document.getElementById('openOptions').addEventListener('click', () => {
      // Open options in a new tab even if it fails
      try {
        chrome.runtime.openOptionsPage();
      } catch (error) {
        console.error('Error opening options:', error);
        alert('Please right-click the extension icon and select "Options" to adjust settings.');
      }
    });
  } catch (error) {
    console.error('Error in popup:', error);
  }
});