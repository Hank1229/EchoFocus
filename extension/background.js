// 追蹤狀態
let currentTab = null;
let startTime = null;
let isTracking = true;
let userId = null;

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('Productivity Tracker 已安裝');
  
  // 從 storage 讀取 userId
  chrome.storage.local.get(['userId'], (result) => {
    userId = result.userId || 1; // 預設用戶 ID = 1
  });
  
  // 設定每 5 分鐘同步一次
  chrome.alarms.create('syncData', { periodInMinutes: 5 });
});

// 監聽 tab 切換
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!isTracking) return;
  
  // 記錄上一個 tab 的時間
  if (currentTab && startTime) {
    const duration = Math.floor((Date.now() - startTime) / 1000); // 秒數
    await logActivity(currentTab.url, duration);
  }
  
  // 開始追蹤新的 tab
  const tab = await chrome.tabs.get(activeInfo.tabId);
  currentTab = tab;
  startTime = Date.now();
});

// 監聽 tab 更新（URL 改變）
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!isTracking) return;
  if (changeInfo.status === 'complete' && tab.active) {
    // 如果 URL 改變了，記錄舊的並開始追蹤新的
    if (currentTab && currentTab.url !== tab.url && startTime) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await logActivity(currentTab.url, duration);
    }
    
    currentTab = tab;
    startTime = Date.now();
  }
});

// 記錄活動到本地 storage
async function logActivity(url, duration) {
  if (!url || duration < 5) return; // 忽略少於 5 秒的活動
  
  const activity = {
    url: url,
    domain: new URL(url).hostname,
    duration: duration,
    timestamp: new Date().toISOString(),
    category: categorizeUrl(url)
  };
  
  // 儲存到本地
  chrome.storage.local.get(['activities'], (result) => {
    const activities = result.activities || [];
    activities.push(activity);
    chrome.storage.local.set({ activities: activities });
  });
  
  console.log('記錄活動:', activity);
}

// 簡單的 URL 分類
function categorizeUrl(url) {
  const productiveDomains = [
    'github.com', 'stackoverflow.com', 'docs.google.com',
    'notion.so', 'figma.com', 'linkedin.com', 'gmail.com'
  ];
  
  const distractionDomains = [
    'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com',
    'reddit.com', 'tiktok.com', 'netflix.com'
  ];
  
  const domain = new URL(url).hostname;
  
  if (productiveDomains.some(d => domain.includes(d))) {
    return 'productive';
  } else if (distractionDomains.some(d => domain.includes(d))) {
    return 'distraction';
  } else {
    return 'neutral';
  }
}

// 定期同步數據到後端
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncData') {
    await syncToBackend();
  }
});

// 同步到後端 API
async function syncToBackend() {
  chrome.storage.local.get(['activities', 'userId'], async (result) => {
    const activities = result.activities || [];
    const uid = result.userId || 1;
    
    if (activities.length === 0) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/activity/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: uid,
          activities: activities
        })
      });
      
      if (response.ok) {
        console.log('同步成功，清除本地數據');
        chrome.storage.local.set({ activities: [] });
      }
    } catch (error) {
      console.error('同步失敗:', error);
    }
  });
}

// 監聽來自 popup 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ isTracking: isTracking });
  } else if (request.action === 'toggleTracking') {
    isTracking = !isTracking;
    sendResponse({ isTracking: isTracking });
  } else if (request.action === 'syncNow') {
    syncToBackend();
    sendResponse({ success: true });
  }
});
