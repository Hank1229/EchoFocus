// popup.js - 彈出視窗的互動邏輯

let isTracking = true;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await updateStatus();
  await loadTodayStats();
});

// 更新追蹤狀態
async function updateStatus() {
  const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
  isTracking = response.isTracking;
  
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  
  if (isTracking) {
    statusDot.classList.remove('inactive');
    statusText.textContent = '進行中';
    toggleBtn.textContent = '暫停追蹤';
  } else {
    statusDot.classList.add('inactive');
    statusText.textContent = '已暫停';
    toggleBtn.textContent = '開始追蹤';
  }
}

// 載入今日統計（示範數據）
async function loadTodayStats() {
  chrome.storage.local.get(['activities'], (result) => {
    const activities = result.activities || [];
    
    let productiveSeconds = 0;
    let distractionSeconds = 0;
    
    // 計算今天的時間
    const today = new Date().toDateString();
    activities.forEach(activity => {
      const activityDate = new Date(activity.timestamp).toDateString();
      if (activityDate === today) {
        if (activity.category === 'productive') {
          productiveSeconds += activity.duration;
        } else if (activity.category === 'distraction') {
          distractionSeconds += activity.duration;
        }
      }
    });
    
    // 轉換為小時並顯示
    document.getElementById('productiveTime').textContent = 
      (productiveSeconds / 3600).toFixed(1);
    document.getElementById('distractionTime').textContent = 
      (distractionSeconds / 3600).toFixed(1);
  });
}

// 切換追蹤狀態
document.getElementById('toggleBtn').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ action: 'toggleTracking' });
  await updateStatus();
});

// 立即同步
document.getElementById('syncBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncBtn');
  btn.textContent = '同步中...';
  btn.disabled = true;
  
  await chrome.runtime.sendMessage({ action: 'syncNow' });
  
  setTimeout(() => {
    btn.textContent = '同步完成 ✓';
    setTimeout(() => {
      btn.textContent = '立即同步數據';
      btn.disabled = false;
    }, 1000);
  }, 500);
});

// 打開儀表板
document.getElementById('dashboardBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:8000' });
});
