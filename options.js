// Saves options to chrome.storage
function saveOptions() {
  const maxTabsPerWindow = document.getElementById('maxTabsPerWindow').value;
  const maxTotalWindows = document.getElementById('maxTotalWindows').value;
  const newTabAction = document.getElementById('newTabAction').value;

  chrome.storage.sync.set({
    maxTabsPerWindow: parseInt(maxTabsPerWindow, 10),
    maxTotalWindows: parseInt(maxTotalWindows, 10),
    newTabAction: newTabAction
  }, () => {
    // Update status to let user know options were saved
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  chrome.storage.sync.get({
    maxTabsPerWindow: 10,
    maxTotalWindows: 3,
    newTabAction: 'focus'
  }, (items) => {
    document.getElementById('maxTabsPerWindow').value = items.maxTabsPerWindow;
    document.getElementById('maxTotalWindows').value = items.maxTotalWindows;
    document.getElementById('newTabAction').value = items.newTabAction;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
