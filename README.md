# TabCap

A simple browser extension to limit the number of tabs and windows in your browser.

## Features

- Limit the maximum number of tabs per window
- Limit the maximum number of browser windows
- Choose what happens when tab limit is reached:
    - Close the new tab
    - Focus on the oldest tab
    - Show a notification page (reuses the same tab if already open)

## Installation

### Chrome/Edge/Brave

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed and active

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select any file in the extension directory (e.g., manifest.json)
5. The extension is now installed temporarily (will be removed when Firefox closes)

For permanent installation in Firefox, you need to adapt the manifest.json to version 2 format (see firefox-manifest-alternative.json).

### Safari

Safari requires additional steps to create a Safari App Extension:

1. Install Xcode from the Mac App Store
2. Create a Safari App Extension project
3. Copy the extension files into the appropriate directories
4. Build and sign the extension

## Usage

1. Click on the extension icon to see current tab and window counts
2. Set your preferred maximum tabs per window and maximum windows
3. Choose what happens when you reach the limit:
    - "Close new tab": Simply closes any tab that exceeds the limit
    - "Focus on oldest tab": Switches focus to your oldest tab instead of opening a new one
    - "Show limit notification": Shows a notification page (reuses the same tab if already open)

### Accessing Settings

You can access the extension settings these ways:

**Chrome/Edge/Brave:**
1. Right-click the extension icon in the browser toolbar
2. Select "Options" or "Extension options"

**Firefox:**
1. Open `about:addons` in a new tab
2. Click "Extensions" in the sidebar
3. Find TabCap and click the gear icon, then select "Options"

## Directory Structure

```
tabcap/
├── manifest.json        # Extension configuration
├── background.js        # Main extension logic
├── popup.html           # Quick stats UI
├── popup.js             # Popup functionality
├── options.html         # Settings page
├── options.js           # Settings logic
├── limit-reached.html   # Page shown when limit is reached
├── limit-reached.js     # Functionality for limit notification page
├── firefox-manifest-alternative.json # For Firefox compatibility
└── images/              # Extension icons
    ├── icon16.svg
    ├── icon48.svg
    └── icon128.svg
```

## Notes

- The extension reuses the same notification tab when at the limit, rather than creating multiple tabs
- Setting changes take effect immediately
- The options page is always allowed to open, even when at tab limit
- You can access settings either through the limit notification page or by right-clicking the extension icon