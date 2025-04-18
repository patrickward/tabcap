document.addEventListener('DOMContentLoaded', () => {
  // Display current limits
  chrome.storage.sync.get(['maxTabsPerWindow', 'maxTotalWindows'], (items) => {
    document.getElementById('tabLimit').textContent = items.maxTabsPerWindow || 10;
    document.getElementById('windowLimit').textContent = items.maxTotalWindows || 3;
  });

  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const attemptedUrl = urlParams.get('url');
  const isAtWindowLimit = urlParams.get('windowLimit') === 'true';

  // Handle window limit status
  if (isAtWindowLimit) {
    document.getElementById('windowLimitMessage').classList.remove('hidden');
  }

  // Only show URL info if there's a valid URL parameter
  if (attemptedUrl) {
    const urlContainer = document.getElementById('urlInfoContainer');
    const urlElement = document.getElementById('attemptedUrl');

    urlContainer.classList.remove('hidden');
    urlElement.textContent = decodeURIComponent(attemptedUrl);

    // Set default bookmark title based on URL
    document.getElementById('bookmarkTitle').value = extractTitleFromUrl(attemptedUrl);

    // Setup "Open in New Window" button
    // Only show the button if we're not at window limit
    const openInNewWindowButton = document.getElementById('openInNewWindow');

    if (isAtWindowLimit) {
      // Hide the button if we're at window limit
      openInNewWindowButton.classList.add('hidden');
    } else {
      // Show the button and add event listener
      openInNewWindowButton.classList.remove('hidden');
      openInNewWindowButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          action: "openInNewWindow",
          url: decodeURIComponent(attemptedUrl)
        }, (response) => {
          if (response && response.success) {
            console.log("Opening URL in new window...");
          } else {
            console.error("Failed to open URL in new window:", response ? response.error : "Unknown error");
          }
        });
      });
    }

    // Setup bookmark button
    document.getElementById('bookmarkBtn').addEventListener('click', () => {
      // Show bookmark form
      document.getElementById('bookmarkFormContainer').classList.remove('hidden');
    });

    // Setup save bookmark button
    document.getElementById('saveBookmarkBtn').addEventListener('click', () => {
      const title = document.getElementById('bookmarkTitle').value || extractTitleFromUrl(attemptedUrl);

      chrome.runtime.sendMessage({
        action: "bookmarkUrl",
        url: decodeURIComponent(attemptedUrl),
        title: title
      }, (response) => {
        if (response && response.success) {
          // Show success message
          document.getElementById('bookmarkSuccessMessage').classList.remove('hidden');

          // Hide success message after 3 seconds
          setTimeout(() => {
            document.getElementById('bookmarkSuccessMessage').classList.add('hidden');
            document.getElementById('bookmarkFormContainer').classList.add('hidden');
          }, 3000);
        }
      });
    });

    // Setup cancel bookmark button
    document.getElementById('cancelBookmarkBtn').addEventListener('click', () => {
      document.getElementById('bookmarkFormContainer').classList.add('hidden');
    });
  }

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

// Helper function to extract a title from a URL
function extractTitleFromUrl(url) {
  try {
    // Try to parse the URL
    const parsedUrl = new URL(decodeURIComponent(url));

    // Remove protocol, www, and trailing slashes
    let domain = parsedUrl.hostname.replace('www.', '');

    // Get the last part of the path
    let path = parsedUrl.pathname;
    if (path && path !== '/') {
      // Remove trailing slash if present
      if (path.endsWith('/')) {
        path = path.slice(0, -1);
      }

      // Get the last segment of the path
      const pathSegments = path.split('/').filter(segment => segment);
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1];

        // Replace hyphens and underscores with spaces and capitalize words
        let title = lastSegment
          .replace(/[-_]/g, ' ')
          .replace(/\.(html|php|asp|jsp)$/, '')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return `${title} (${domain})`;
      }
    }

    // If no path or can't parse it nicely, just use the domain
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch (e) {
    // If URL parsing fails, return something generic
    return "Bookmarked Page";
  }
}