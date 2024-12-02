# Instagram Hashtag User Exporter

A Chrome extension for collecting and exporting Instagram user information from hashtag-based posts. Perfect for marketers, analysts, and researchers looking to gather Instagram user data efficiently.

## Features

- 🔍 Automatically collect user information from Instagram hashtag posts
- 📊 Export collected data to CSV format
- 🔄 Multi-tab support for simultaneous data collection from different hashtags
- ⏯️ Pause/Resume collection functionality
- 🗑️ Clear collected data and start fresh
- 💾 Temporary local storage of collected data

## Installation

### From Chrome Web Store
1. Visit the Chrome Web Store
2. Search for "Instagram Hashtag User Exporter"
3. Click "Add to Chrome"

### Local Development
1. Clone this repository
```bash
git clone https://github.com/yourusername/ig-hashtag-user-exporter.git
```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. **Initial Setup**
   - Pin the extension to your Chrome toolbar for easy access
   - Navigate to Instagram in Chrome
   - Log into your Instagram account

2. **Finding Hashtags**
   - Use Instagram's search bar to find hashtags
   - Click on hashtags in posts
   - Navigate to the hashtag's dedicated page

3. **Collecting Data**
   - Click the extension icon
   - Press "Start Collecting"
   - The extension will automatically:
     - Scroll through posts
     - Collect user information
     - Store data locally

4. **Managing Collections**
   - Stop collection at any time
   - Export data to CSV format
   - Clear collected data as needed

## Technical Details

### Project Structure
```
├── manifest.json
├── popup.html
├── popup.js
├── content.js
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Storage Keys
```javascript
const STORAGE_KEYS = {
  IS_RUNNING: 'isRunning',
  COLLECTED_HREFS: 'collectedHrefs',
  PROCESSED_LINKS: 'processedLinks',
  HREF_COUNT: 'hrefCount',
  LAST_UPDATE: 'lastUpdate'
};
```

### Permissions
- `storage`: For local data storage
- `https://www.instagram.com/*`: For Instagram page access

## Development

### Prerequisites
- Chrome browser
- Basic knowledge of JavaScript
- Familiarity with Chrome Extension development

### Building
The extension doesn't require a build process. It can be loaded directly into Chrome in developer mode.

### Testing
1. Load the extension in developer mode
2. Open the Chrome DevTools console
3. Monitor the console logs for debugging information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Disclaimer

This tool should be used responsibly and in accordance with Instagram's terms of service and data collection policies. Users are responsible for ensuring their usage complies with all applicable laws and regulations.

## Support

For issues, feature requests, or questions:
1. Open an issue in this repository
2. Provide detailed information about your problem
3. Include steps to reproduce if applicable

