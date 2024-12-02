const STORAGE_KEYS = {
  IS_RUNNING: 'isRunning',
  COLLECTED_HREFS: 'collectedHrefs',
  PROCESSED_LINKS: 'processedLinks',
  HREF_COUNT: 'hrefCount',
  LAST_UPDATE: 'lastUpdate'
};

function getStorageKey(key, hashtag) {
  return `ig_hashtag_export.${hashtag}.${key}`;
}

document.addEventListener('DOMContentLoaded', async function() {
  // Get DOM elements
  const toggleBtn = document.getElementById('toggleBtn');
  const btnIcon = document.getElementById('btnIcon');
  const btnText = document.getElementById('btnText');
  const hrefCount = document.getElementById('hrefCount');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const hashtagDisplay = document.getElementById('currentHashtag');

  let currentTabId;

  // Get current tab ID
  async function getCurrentTabId() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          resolve(tabs[0].id);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Get hashtag from URL
  async function getHashtagFromUrl() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url) {
          const match = tabs[0].url.match(/q=%23(\w+)/);
          resolve(match ? match[1] : null);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Get or set hashtag
  async function getOrSetHashtag() {
    currentTabId = await getCurrentTabId();
    if (!currentTabId) {
      console.error('Unable to get current tab');
      return null;
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([`hashtag_${currentTabId}`], async function(result) {
        let hashtag = result[`hashtag_${currentTabId}`];
        if (!hashtag) {
          hashtag = await getHashtagFromUrl();
          if (hashtag) {
            chrome.storage.local.set({[`hashtag_${currentTabId}`]: hashtag});
          }
        }
        resolve(hashtag);
      });
    });
  }

  const hashtag = await getOrSetHashtag();
  if (!hashtag) {
    console.error('Unable to get hashtag');
    document.body.innerHTML = '<p>Error: Unable to get hashtag. Please make sure you are on an Instagram hashtag page.</p>';
    return;
  }

  // Update UI to display current hashtag
  if (hashtagDisplay) {
    hashtagDisplay.textContent = hashtag;
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      const hrefCountKey = getStorageKey(STORAGE_KEYS.HREF_COUNT, hashtag);
      const isRunningKey = getStorageKey(STORAGE_KEYS.IS_RUNNING, hashtag);
      
      if (changes[hrefCountKey]) {
        hrefCount.textContent = changes[hrefCountKey].newValue;
      }
      if (changes[isRunningKey]) {
        updateUI(changes[isRunningKey].newValue);
      }
    }
  });

  // Toggle button click handler
  toggleBtn.addEventListener('click', function() {
    const isRunningKey = getStorageKey(STORAGE_KEYS.IS_RUNNING, hashtag);
    const lastUpdateKey = getStorageKey(STORAGE_KEYS.LAST_UPDATE, hashtag);
    
    chrome.storage.local.get([isRunningKey], function(result) {
      const newState = !result[isRunningKey];
      chrome.storage.local.set({ 
        [isRunningKey]: newState,
        [lastUpdateKey]: Date.now()
      });
    });
  });

  // Clear button click handler
  clearBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all collected links?')) {
      const updates = {
        [getStorageKey(STORAGE_KEYS.COLLECTED_HREFS, hashtag)]: [],
        [getStorageKey(STORAGE_KEYS.PROCESSED_LINKS, hashtag)]: [],
        [getStorageKey(STORAGE_KEYS.HREF_COUNT, hashtag)]: 0,
        [getStorageKey(STORAGE_KEYS.LAST_UPDATE, hashtag)]: Date.now()
      };
      chrome.storage.local.set(updates, () => {
        hrefCount.textContent = '0';
        chrome.storage.local.remove(`hashtag_${currentTabId}`);
      });
    }
  });

  // Export button click handler
  exportBtn.addEventListener('click', async function() {
    const collectedHrefsKey = getStorageKey(STORAGE_KEYS.COLLECTED_HREFS, hashtag);
    chrome.storage.local.get([collectedHrefsKey], async function(result) {
      const links = result[collectedHrefsKey] || [];
      if (links.length) {
        // Sort links by timestamp
        links.sort((a, b) => a.timestamp - b.timestamp);

        // Create CSV content
        const csvContent = [
          // CSV header
          ['No.', 'Username', 'URL', 'Timestamp'],
          // CSV data rows
          ...links.map((link, index) => {
            const username = new URL(link.href).pathname.replace('/', '');
            return [index + 1, username, link.href, new Date(link.timestamp).toISOString()];
          })
        ]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', url);
        downloadLink.setAttribute('download', `instagram_users_${hashtag}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);

        // Show success indicator
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'Exported!';
        setTimeout(() => {
          exportBtn.textContent = originalText;
        }, 1000);
      }
    });
  });

  // Update UI based on running status
  function updateUI(isRunning) {
    btnText.textContent = isRunning ? 'Stop Collecting' : 'Start Collecting';
    toggleBtn.classList.toggle('bg-red-500', isRunning);
    toggleBtn.classList.toggle('bg-blue-500', !isRunning);
    
    if (isRunning) {
      btnIcon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
      `;
    } else {
      btnIcon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      `;
    }
  }

  // Initialize UI state
  const isRunningKey = getStorageKey(STORAGE_KEYS.IS_RUNNING, hashtag);
  chrome.storage.local.get([isRunningKey], function(result) {
    updateUI(result[isRunningKey] || false);
  });

  // Initialize counter
  const hrefCountKey = getStorageKey(STORAGE_KEYS.HREF_COUNT, hashtag);
  chrome.storage.local.get([hrefCountKey], function(result) {
    hrefCount.textContent = result[hrefCountKey] || '0';
  });

  // Listen for tab updates, update stored hashtag
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === currentTabId && changeInfo.url) {
      const match = changeInfo.url.match(/q=%23(\w+)/);
      if (match) {
        const newHashtag = match[1];
        chrome.storage.local.set({[`hashtag_${tabId}`]: newHashtag});
      }
    }
  });
});