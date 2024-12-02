// content.js
let scrollInterval = null;

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

function checkRunningStatus(hashtag) {
  return new Promise((resolve) => {
    const storageKey = getStorageKey(STORAGE_KEYS.IS_RUNNING, hashtag);
    chrome.storage.local.get([storageKey], function(result) {
      resolve(result[storageKey] === true);
    });
  });
}

function initializeStorage(hashtag) {
  return new Promise((resolve) => {
    const processedLinksKey = getStorageKey(STORAGE_KEYS.PROCESSED_LINKS, hashtag);
    const collectedHrefsKey = getStorageKey(STORAGE_KEYS.COLLECTED_HREFS, hashtag);
    const hrefCountKey = getStorageKey(STORAGE_KEYS.HREF_COUNT, hashtag);

    chrome.storage.local.get([processedLinksKey, collectedHrefsKey, hrefCountKey], function(result) {
      const updates = {};

      if (!result[processedLinksKey]) {
        updates[processedLinksKey] = {};
      }

      if (!result[collectedHrefsKey]) {
        updates[collectedHrefsKey] = [];
      }

      if (!result[hrefCountKey]) {
        updates[hrefCountKey] = 0;
      }

      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates, () => {
          console.log(`Storage initialized for hashtag: ${hashtag}`);
          resolve();
        });
      } else {
        console.log(`Storage already initialized for hashtag: ${hashtag}`);
        resolve();
      }
    });
  });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    const hashtag = getHashtagFromUrl();
    if (hashtag) {
      const runningKey = getStorageKey(STORAGE_KEYS.IS_RUNNING, hashtag);
      if (changes[runningKey]) {
        const newIsRunning = changes[runningKey].newValue;
        console.log('----monitor the change from storage.....');

        if (newIsRunning) {
          startAutoScroll();
        } else {
          stopAutoScroll();
        } 
      }
    }
  }
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getHashtagFromUrl() {
  const url = window.location.href;
  const match = url.match(/q=%23(\w+)/);
  return match ? match[1] : null;
}

async function saveHrefToStorage(href, hashtag) {
  if (!hashtag) {
    console.error('无法获取 hashtag');
    return;
  }

  return new Promise((resolve) => {
    const storageKey = getStorageKey(STORAGE_KEYS.COLLECTED_HREFS, hashtag);
    chrome.storage.local.get([storageKey], function(result) {
      let collectedHrefs = result[storageKey] || [];
      const newEntry = {
        href: href,
        timestamp: Date.now()
      };
      collectedHrefs.push(newEntry);
      
      const updates = {
        [storageKey]: collectedHrefs,
        [getStorageKey(STORAGE_KEYS.HREF_COUNT, hashtag)]: collectedHrefs.length,
        [getStorageKey(STORAGE_KEYS.LAST_UPDATE, hashtag)]: Date.now()
      };
      
      chrome.storage.local.set(updates, resolve);
    });
  });
} 

function updateHrefCount(count) {
  chrome.runtime.sendMessage({ 
    type: 'hrefCountUpdate', 
    count: count 
  });
}

async function getDialogProfileLink() {
  // 等待对话框出现
  for (let i = 0; i < 10; i++) {  // 最多等待5秒
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
      const profileLink = dialog.querySelector('header ._aaqt a[role="link"]');
      if (profileLink) {
        return profileLink.href;
      }
    }
    await sleep(500);
  }
  return null;
}

function checkLinkInStorage(href, hashtag) {
  if (!hashtag) {
    console.error('无法获取 hashtag');
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const storageKey = getStorageKey(STORAGE_KEYS.PROCESSED_LINKS, hashtag);
    chrome.storage.local.get([storageKey], function(result) {
      let processedLinks = result[storageKey] || {};
      
      console.log('Current processed links:', processedLinks);
      console.log('Checking link:', href);
      console.log('Link data:', processedLinks[href]);
      
      resolve(processedLinks[href]);
    });
  });
}

async function areAllLinksProcessed(links, hashtag) {
  for (const link of links) {
    const isProcessed = await checkLinkInStorage(link.href, hashtag);
    if (!isProcessed) {
      return false;
    }
  }
  return true;
}

function saveLinkToStorage(href,hashtag) {
  
  if (!hashtag) {
    console.error('无法获取 hashtag');
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const storageKey = getStorageKey(STORAGE_KEYS.PROCESSED_LINKS, hashtag);
    chrome.storage.local.get([storageKey], function(result) {
      let processedLinks = result[storageKey] || {};
      
      processedLinks[href] = {
        timestamp: new Date().toISOString(),
        url: href,
        processed: true
      };
      
      console.log('Saving processed links:', processedLinks);
      
      const updates = { [storageKey]: processedLinks };
      chrome.storage.local.set(updates, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage save error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          console.log('Successfully saved link:', href);
          console.log('Saved data:', processedLinks[href]);
          resolve(processedLinks[href]);
        }
      });
    });
  });
}


function getProcessedLinksCount(hashtag) {
  return new Promise((resolve) => {
    const storageKey = getStorageKey(STORAGE_KEYS.PROCESSED_LINKS, hashtag);
    chrome.storage.local.get([storageKey], function(result) {
      const processedLinks = result[storageKey] || {};
      resolve(Object.keys(processedLinks).length);
    });
  });
}

async function findAndClickCloseButton() {
  console.log('查找关闭按钮...');
  
  // 使用详细的选择器查找按钮
  const closeButton = document.querySelector('div[role="button"] svg[aria-label="关闭"] polyline');
  
  if (closeButton) {
    console.log('找到关闭按钮');
    
    // 获取父级按钮元素
    const buttonElement = closeButton.closest('div[role="button"]');
    
    if (buttonElement) {
      // 高亮显示按钮
      const originalBackground = buttonElement.style.backgroundColor;
      buttonElement.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
      buttonElement.style.transition = 'background-color 0.3s';
      
      // 点击按钮
      try {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        buttonElement.dispatchEvent(clickEvent);
        console.log('已点击关闭按钮');
      } catch (error) {
        console.error('点击关闭按钮时出错:', error);
      }
      
      // 恢复原始背景
      await sleep(500);
      buttonElement.style.backgroundColor = originalBackground;
    }
  } else {
    console.log('未找到关闭按钮');
  }
}

async function getVisibleLinks() {
  console.log('正在获取可见链接...');
  const mainElement = document.querySelector('main');
  if (!mainElement) {
    console.log('未找到 main 元素');
    return [];
  }
  const links = Array.from(mainElement.querySelectorAll('a'));
  return links;
}

async function clickVisibleLinks() {
  console.log('开始处理可见链接...');
  const visibleLinks = await getVisibleLinks();
  
  if (visibleLinks.length === 0) {
    console.log('没有找到可见链接');
    return true; // 继续滚动寻找新链接
  }

  const hashtag = getHashtagFromUrl();
  if (!hashtag) {
    console.error('无法获取 hashtag');
    return false;
  }

  console.log('开始处理可见链接...');
  const mainElement = document.querySelector('main');
  if (!mainElement) {
    console.log('未找到 main 元素');
    return false;
  }
  
  for (let i = 0; i < visibleLinks.length; i++) {
    const isRunning = await checkRunningStatus(hashtag);
    if (!isRunning) {
      console.log('运行状态已更改，停止处理链接');
      return false;
    }

    const link = visibleLinks[i];
    const href = link.href;

    console.log("-------check----------");
    console.log(`处理第 ${i + 1}/${visibleLinks.length} 个链接`);
    console.log(href);

    try {
      const processedInfo = await checkLinkInStorage(href, hashtag);
      console.log('链接检查结果:', processedInfo);
  
      if (processedInfo && processedInfo.processed) {
        console.log(`链接已处理过，跳过: ${href}`);
        continue;
      }

      // 点击链接
      link.click();
      
      // 等待并获取对话框中的链接
      const profileHref = await getDialogProfileLink();
      if (profileHref) {
        console.log('找到个人主页链接:', profileHref);
        await saveHrefToStorage(profileHref,hashtag);
 
      } else {
        console.log('未找到个人主页链接');
      }
      
      await sleep(3000);
      // 点击关闭按钮
      await findAndClickCloseButton();
      await sleep(1000);
      
      const savedInfo = await saveLinkToStorage(href,hashtag);
      console.log('链接保存结果:', savedInfo);
    } catch (error) {
      console.error('处理链接时出错:', error);
    }
  }

  const finalCheck = await areAllLinksProcessed(visibleLinks, hashtag);
  if (!finalCheck) {
    console.log('仍有未处理的链接，将在下次循环中处理');
    return true;
  }
  console.log('当前页面所有链接已处理完毕，准备滚动...');
  window.scrollTo({
    top: window.scrollY + window.innerHeight,
    behavior: 'smooth'
  });
  
  await sleep(1000);
  
  const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight;
  if (isAtBottom) {
    console.log('已到达页面底部');
    return false;
  }
  
  return true;
}

async function startAutoScroll() {
  console.log('开始自动处理流程...');
  if (scrollInterval) {
    console.log('已经在运行中，跳过');
    return;
  }

  const hashtag = getHashtagFromUrl();
  if (!hashtag) {
    console.error('无法获取 hashtag');
    return;
  }

  await initializeStorage(hashtag);

  scrollInterval = true;
  
  // 使用递归方式处理所有内容
  async function processContent() {
    console.log('Printing current storage contents:');
    chrome.storage.local.get(null, (items) => {
      console.log('All items in storage:', items);
    });

    if (!scrollInterval) {
      console.log('处理已停止');
      return;
    }

    console.log('开始处理当前可见内容');
    const shouldContinue = await clickVisibleLinks();
    
    if (shouldContinue && scrollInterval) {
      console.log('等5秒后处理下一屏内容...');
      await sleep(5000);
      await processContent();
    } else {
      console.log('处理完成或已停止');
      stopAutoScroll();
    }
  }
  
  // 开始处理
  processContent().catch(error => {
    console.error('处理过程中出错:', error);
    stopAutoScroll();
  });
}

function stopAutoScroll() {
  console.log('停止自动处理');
  scrollInterval = null;
}

console.log('Content script 已加载');