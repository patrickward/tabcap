let settings = {
  maxTabsPerWindow: 10,
  maxTotalWindows: 3,
  newTabAction: 'focus', // 'focus', 'close', 'redirect'
  defaultBookmarkFolder: 'TabCap'
};

// Store reference to limit notification tab (if any)
let limitNotificationTabId = null;

// Load settings when extension starts
chrome.storage.sync.get(['maxTabsPerWindow', 'maxTotalWindows', 'newTabAction', 'defaultBookmarkFolder'], (result) => {
  if (result.maxTabsPerWindow) settings.maxTabsPerWindow = result.maxTabsPerWindow;
  if (result.maxTotalWindows) settings.maxTotalWindows = result.maxTotalWindows;
  if (result.newTabAction) settings.newTabAction = result.newTabAction;
  if (result.defaultBookmarkFolder) settings.defaultBookmarkFolder = result.defaultBookmarkFolder;
});

// Listen for setting changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.maxTabsPerWindow) settings.maxTabsPerWindow = changes.maxTabsPerWindow.newValue;
  if (changes.maxTotalWindows) settings.maxTotalWindows = changes.maxTotalWindows.newValue;
  if (changes.newTabAction) settings.newTabAction = changes.newTabAction.newValue;
  if (changes.defaultBookmarkFolder) settings.defaultBookmarkFolder = changes.defaultBookmarkFolder.newValue;
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
      const tabUrl = tab.pendingUrl || tab.url || "";
      // Check if it's a new tab page
      const isNewTabPage = tabUrl === "chrome://newtab/" ||
        tabUrl === "about:newtab" ||
        tabUrl === "" ||
        tabUrl === "edge://newtab/";

      // Check if we're at window limit too
      chrome.windows.getAll({}, (windows) => {
        const isAtWindowLimit = windows.length >= settings.maxTotalWindows;

        // We'll pass the URL directly as a query parameter
        let redirectUrl = chrome.runtime.getURL("limit-reached.html");

        // Only add URL as parameter if it's not a new tab page
        if (!isNewTabPage) {
          // Encode the URL to make it safe for a query parameter
          const encodedUrl = encodeURIComponent(tabUrl);
          redirectUrl += `?url=${encodedUrl}&windowLimit=${isAtWindowLimit}`;
        } else {
          // Still pass window limit info
          redirectUrl += `?windowLimit=${isAtWindowLimit}`;
        }

        // Check if we already have a limit notification tab
        if (limitNotificationTabId) {
          // Check if the tab still exists
          chrome.tabs.get(limitNotificationTabId, (existingTab) => {
            if (chrome.runtime.lastError) {
              // Tab no longer exists, create a new one
              createLimitNotificationTab(tab, redirectUrl);
            } else {
              // Tab exists, update its URL to refresh with new parameters
              chrome.tabs.update(limitNotificationTabId, {
                url: redirectUrl,
                active: true
              });
              chrome.tabs.remove(tab.id);
            }
          });
        } else {
          // No existing notification tab, create one
          createLimitNotificationTab(tab, redirectUrl);
        }
      });
      break;
  }
}

// Create a limit notification tab
function createLimitNotificationTab(tab, redirectUrl) {
  chrome.tabs.update(tab.id, {
    url: redirectUrl
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

// Helper function to find a bookmark folder by name or create it if it doesn't exist
function findOrCreateBookmarkFolder(folderName, callback) {
  // Search for the folder
  chrome.bookmarks.search({ title: folderName }, (results) => {
    // Filter to only include folders (items without a url)
    const folders = results.filter(item => !item.url);

    if (folders.length > 0) {
      // Found a matching folder, use the first one
      callback(folders[0].id);
    } else {
      // Folder doesn't exist, create it in the Bookmarks Bar
      chrome.bookmarks.getTree((tree) => {
        // Find the Bookmarks Bar folder
        const bookmarksBar = tree[0].children.find(node => node.id === "1");

        // Create the folder
        chrome.bookmarks.create({
          parentId: bookmarksBar ? bookmarksBar.id : "1", // Default to Bookmarks Bar, fallback to "1"
          title: folderName
        }, (newFolder) => {
          callback(newFolder.id);
        });
      });
    }
  });
}

// Handle direct navigation messages from the limit-reached page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openInNewWindow" && request.url) {
    try {
      // Create a new window with the URL
      chrome.windows.create({
        url: request.url,
        focused: true
      }, (newWindow) => {
        // Success
        if (newWindow) {
          // If this message came from our notification tab, clean it up
          if (sender.tab && sender.tab.id === limitNotificationTabId) {
            // Reset the ID first
            const oldTabId = limitNotificationTabId;
            limitNotificationTabId = null;
            // Then close the tab
            chrome.tabs.remove(oldTabId);
          }
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Failed to create new window" });
        }
      });
      return true; // Indicates we'll send a response asynchronously
    } catch (error) {
      console.error("Error opening URL in new window:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  if (request.action === "bookmarkUrl" && request.url && request.title) {
    // Always use the configured folder name (or default to "TabCap")
    const folderName = settings.defaultBookmarkFolder || "TabCap";

    // Find or create the folder, then add the bookmark
    findOrCreateBookmarkFolder(folderName, (folderId) => {
      chrome.bookmarks.create({
        parentId: folderId,
        title: request.title,
        url: request.url
      }, (bookmark) => {
        sendResponse({ success: true, bookmark: bookmark });
      });
    });

    return true; // Indicates we'll send a response asynchronously
  }
});