let settings = {
  maxTabsPerWindow: 10,
  maxTotalWindows: 3,
  newTabAction: 'focus' // 'focus', 'close', 'redirect'
};

// Store reference to limit notification tab (if any)
let limitNotificationTabId = null;

// Load settings when extension starts
chrome.storage.sync.get(['maxTabsPerWindow', 'maxTotalWindows', 'newTabAction'], (result) => {
  if (result.maxTabsPerWindow) settings.maxTabsPerWindow = result.maxTabsPerWindow;
  if (result.maxTotalWindows) settings.maxTotalWindows = result.maxTotalWindows;
  if (result.newTabAction) settings.newTabAction = result.newTabAction;
});

// Listen for setting changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.maxTabsPerWindow) settings.maxTabsPerWindow = changes.maxTabsPerWindow.newValue;
  if (changes.maxTotalWindows) settings.maxTotalWindows = changes.maxTotalWindows.newValue;
  if (changes.newTabAction) settings.newTabAction = changes.newTabAction.newValue;
});

// Listen for tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    // Check if this is the options page (always allow options page)
    const tabUrl = tab.pendingUrl || tab.url || "";
    if (tabUrl.includes("options.html")) {
      return; // Always allow options page to open
    }

    // Get all browser windows
    const windows = await chrome.windows.getAll({ populate: true });

    // If we exceed the max windows limit
    if (windows.length > settings.maxTotalWindows) {
      handleWindowLimit(windows);
      return;
    }

    // Find the window this tab belongs to
    const currentWindow = windows.find(w => w.id === tab.windowId);

    // Check if this window has too many tabs
    if (currentWindow && currentWindow.tabs.length > settings.maxTabsPerWindow) {
      handleTabLimit(tab);
    }
  } catch (error) {
    console.error('Error in tab limit logic:', error);
  }
});

// Handle excess tabs based on the setting
function handleTabLimit(tab) {
  switch (settings.newTabAction) {
    case 'close':
      chrome.tabs.remove(tab.id);
      break;

    case 'focus':
      // Find the oldest tab and focus it instead
      chrome.tabs.query({ windowId: tab.windowId }, (tabs) => {
        // Sort tabs by creation time (oldest first)
        tabs.sort((a, b) => a.id - b.id);
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.tabs.remove(tab.id);
        }
      });
      break;

    case 'redirect':
      // Check if we already have a limit notification tab
      if (limitNotificationTabId) {
        // Check if the tab still exists
        chrome.tabs.get(limitNotificationTabId, (existingTab) => {
          if (chrome.runtime.lastError) {
            // Tab no longer exists, create a new one
            createLimitNotificationTab(tab);
          } else {
            // Tab exists, focus it and close the new tab
            chrome.tabs.update(limitNotificationTabId, { active: true });
            chrome.tabs.remove(tab.id);
          }
        });
      } else {
        // No existing notification tab, create one
        createLimitNotificationTab(tab);
      }
      break;
  }
}

// Create a limit notification tab
function createLimitNotificationTab(tab) {
  chrome.tabs.update(tab.id, {
    url: chrome.runtime.getURL("limit-reached.html")
  }, (updatedTab) => {
    if (updatedTab) {
      limitNotificationTabId = updatedTab.id;

      // Listen for this tab being closed to reset our reference
      chrome.tabs.onRemoved.addListener(function tabClosedListener(tabId) {
        if (tabId === limitNotificationTabId) {
          limitNotificationTabId = null;
          chrome.tabs.onRemoved.removeListener(tabClosedListener);
        }
      });
    }
  });
}

// Handle excess windows
function handleWindowLimit(windows) {
  // Sort windows by creation time (newest first)
  windows.sort((a, b) => b.id - a.id);

  // Only close the newest window that exceeded the limit
  // We only need to remove the first window in the sorted array (newest)
  if (windows.length > settings.maxTotalWindows) {
    chrome.windows.remove(windows[0].id);
  }
}