# 📊 Productivity Tracker - 生產力追蹤系統

一個結合 Chrome Extension、Web Dashboard 和 AI 分析的全端生產力追蹤應用。

## 🎯 專案概述

這個專案幫助用戶：
- ✅ 自動追蹤瀏覽器使用時間
- 📈 視覺化展示生產力數據
- 🤖 使用 AI 分析工作模式
- 📧 每日發送個性化建議郵件

## 🏗️ 系統架構

```
┌─────────────────┐
│ Chrome Extension│  ← 追蹤用戶活動
└────────┬────────┘
         │
         ↓ (HTTP API)
┌─────────────────┐
│  FastAPI Backend│  ← 儲存數據、提供 API
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   AI Analysis   │  ← Gemini API 分析
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Email Service  │  ← 發送每日總結
└─────────────────┘
```

## 📁 專案結構

```
productivity-tracker-demo/
├── extension/              # Chrome Extension
│   ├── manifest.json       # Extension 配置
│   ├── background.js       # 背景追蹤邏輯
│   ├── popup.html          # 彈出視窗 UI
│   └── popup.js            # UI 互動邏輯
│
├── backend/                # 後端 API
│   ├── main.py             # FastAPI 主程式
│   ├── ai_analyzer.py      # AI 分析模組
│   └── requirements.txt    # Python 依賴
│
└── README.md               # 你正在看的文件
```

## 🚀 快速開始

### 1️⃣ 啟動後端

```bash
# 進入後端目錄
cd backend

# 安裝依賴
pip install -r requirements.txt

# 啟動伺服器
python main.py
```

後端會在 `http://localhost:8000` 啟動

### 2️⃣ 安裝 Chrome Extension

1. 打開 Chrome 瀏覽器
2. 進入 `chrome://extensions/`
3. 開啟右上角的「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 `extension/` 資料夾
6. Extension 安裝完成！

### 3️⃣ 開始使用

1. 點擊瀏覽器右上角的 Extension 圖標
2. 開始正常瀏覽網頁
3. Extension 會自動追蹤你的活動
4. 訪問 `http://localhost:8000` 查看 Dashboard

## 🎨 功能展示

### Chrome Extension 彈出視窗
- 顯示追蹤狀態（進行中/已暫停）
- 今日統計（專注時數、分心時數）
- 暫停/開始追蹤
- 立即同步數據
- 打開 Dashboard

### Web Dashboard
- 總追蹤時數統計
- 生產力時數 vs 分心時數
- 專注分數（百分比）
- 最近活動列表（包含網站、分類、時間）
- 即時數據刷新

### AI 分析（示範）
- 分析每日工作模式
- 識別最專注的時段
- 提供個性化改善建議
- 友善激勵的語氣

## 🛠️ 技術棧

### 前端
- **Chrome Extension:** Vanilla JavaScript
- **Dashboard:** HTML + CSS + JavaScript

### 後端
- **Framework:** FastAPI (Python)
- **資料儲存:** 記憶體（示範用，可改用 SQLite/PostgreSQL）
- **AI API:** Google Gemini（示範代碼）
- **郵件服務:** SMTP（示範代碼）

## 📊 資料模型

### Activity（活動記錄）
```json
{
  "url": "https://github.com/user/repo",
  "domain": "github.com",
  "duration": 3600,
  "timestamp": "2024-02-03T10:00:00",
  "category": "productive"
}
```

### Categories（分類）
- `productive`: 生產力活動（GitHub, Stack Overflow, 文檔等）
- `distraction`: 分心活動（YouTube, 社群媒體等）
- `neutral`: 中性活動（其他網站）

## 🔧 開發注意事項

### Chrome Extension
- 使用 Manifest V3（最新規範）
- 需要 `tabs`, `storage`, `alarms` 權限
- 每 5 分鐘自動同步數據到後端
- 可手動暫停/開始追蹤

### Backend API
- CORS 已開啟（允許 Extension 調用）
- 所有端點都有詳細註解
- 訪問 `/docs` 查看自動生成的 API 文檔

### AI 整合
- 目前是示範代碼（模擬 AI 回覆）
- 實際使用需要：
  1. 安裝 `google-generativeai`
  2. 獲取 Gemini API Key
  3. 取消註解真實 API 調用代碼

## 📧 郵件功能

目前是示範代碼，實際使用需要：

### 使用 Gmail SMTP
```python
import smtplib
from email.mime.text import MIMEText

# 配置
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 465
EMAIL = 'your-email@gmail.com'
PASSWORD = 'your-app-password'  # 需要在 Google 帳戶設定「應用程式密碼」
```

### 或使用 SendGrid
```bash
pip install sendgrid
```

## 🎯 團隊分工建議

4 人團隊可以這樣分工：

1. **Person 1:** Chrome Extension 開發
2. **Person 2:** Backend API + 資料庫
3. **Person 3:** AI 整合 + 排程任務
4. **Person 4:** Dashboard UI + Email 服務

## 🔮 未來擴展

### MVP 之後可以加入：
- [ ] 使用真實資料庫（SQLite/PostgreSQL）
- [ ] 用戶註冊/登入系統
- [ ] 週報、月報功能
- [ ] 自訂生產力網站分類
- [ ] 設定每日目標
- [ ] 網站封鎖功能
- [ ] 更豐富的圖表（Chart.js）
- [ ] 深色模式
- [ ] 多語言支援

### 進階功能：
- [ ] 番茄鐘計時器整合
- [ ] 與 Calendar 整合
- [ ] 團隊協作功能
- [ ] 生產力排行榜
- [ ] 導出數據（CSV/PDF）
- [ ] 桌面通知

## 📝 API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/` | Dashboard 主頁 |
| POST | `/api/activity/batch` | 批次記錄活動 |
| GET | `/api/activity/summary/{user_id}` | 獲取活動總結 |
| GET | `/api/activity/today/{user_id}` | 獲取今日活動 |
| GET | `/api/users/{user_id}` | 獲取用戶資訊 |
| GET | `/health` | 健康檢查 |

詳細 API 文檔：啟動後端後訪問 `http://localhost:8000/docs`

## 💡 常見問題

### Q: Extension 無法同步數據？
A: 確認後端已啟動，且 Extension 的 API URL 正確（`http://localhost:8000`）

### Q: 如何重置數據？
A: 重啟後端即可（目前使用記憶體儲存）

### Q: 可以追蹤無痕模式嗎？
A: 需要在 Extension 設定中允許「在無痕模式下啟用」

### Q: 數據安全嗎？
A: 目前所有數據僅存在本地，不會上傳到外部服務器（除非你部署到雲端）

## 🤝 貢獻

這是一個教學示範專案，歡迎：
- 提出改進建議
- 回報 Bug
- 新增功能
- 優化代碼

## 📄 授權

MIT License - 隨意使用和修改

## 👥 開發團隊

這個專案是為了 **小組作業** 而設計的示範專案。

---

**💪 開始追蹤你的生產力，成為更好的自己！**
