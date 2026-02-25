# 📦 專案檔案概覽

## 檔案結構

```
productivity-tracker-demo/
│
├── 📄 README.md                    # 完整的專案說明文檔
├── 📄 TEAM_PRESENTATION.md         # 給隊友看的視覺化展示文檔
├── 📄 QUICK_START.md               # 5分鐘快速啟動指南
│
├── 📁 extension/                   # Chrome Extension
│   ├── manifest.json               # Extension 配置檔
│   ├── background.js               # 背景追蹤邏輯 (核心功能)
│   ├── popup.html                  # 彈出視窗 UI
│   ├── popup.js                    # UI 互動邏輯
│   └── icon-placeholder.txt        # 圖標說明
│
└── 📁 backend/                     # Python 後端
    ├── main.py                     # FastAPI 主程式 + Dashboard
    ├── ai_analyzer.py              # AI 分析模組
    └── requirements.txt            # Python 依賴套件
```

## 各檔案說明

### 📄 文檔類 (Markdown)

**README.md** (最重要！)
- 完整的專案介紹
- 技術架構說明
- API 端點文檔
- 開發指南
- 常見問題

**TEAM_PRESENTATION.md** (展示用)
- 視覺化的介面展示（ASCII art）
- 用戶使用流程圖
- 解決的問題
- 團隊分工建議
- Demo 計畫

**QUICK_START.md** (快速上手)
- 5 分鐘啟動教學
- 故障排除指南
- 測試技巧
- 展示建議

---

### 🔧 Chrome Extension

**manifest.json** (195 行)
```json
Extension 的配置檔，定義：
- Extension 名稱、版本
- 需要的權限 (tabs, storage, alarms)
- 背景腳本和彈出視窗
- 圖標設定
```

**background.js** (約 150 行)
```javascript
核心追蹤邏輯：
- 監聽 tab 切換事件
- 記錄網站停留時間
- 自動分類網站 (生產力/分心/中性)
- 每 5 分鐘同步到後端
- 本地儲存管理
```

**popup.html** (約 130 行)
```html
彈出視窗 UI：
- 漂亮的漸層背景
- 追蹤狀態顯示
- 今日統計卡片
- 操作按鈕（暫停/同步/打開 Dashboard）
- 響應式設計
```

**popup.js** (約 80 行)
```javascript
UI 互動邏輯：
- 更新追蹤狀態
- 載入今日統計
- 處理按鈕點擊
- 與 background.js 通訊
```

---

### 🐍 Python 後端

**main.py** (約 400 行)
```python
FastAPI 主程式，包含：
1. API 伺服器設定
2. CORS 中間件配置
3. 資料模型定義 (Pydantic)
4. 簡易記憶體資料庫
5. API 端點：
   - POST /api/activity/batch (批次記錄)
   - GET /api/activity/summary/{user_id} (總結)
   - GET /api/activity/today/{user_id} (今日活動)
   - GET /api/users/{user_id} (用戶資訊)
   - GET /health (健康檢查)
6. 完整的 HTML Dashboard（嵌入式）
```

**ai_analyzer.py** (約 250 行)
```python
AI 分析模組，包含：
1. 生產力數據分析函數
2. 統計數據計算
3. Gemini API 整合（示範）
4. 郵件發送服務（示範）
5. 模擬 AI 回覆生成器
6. 完整的測試範例
```

**requirements.txt**
```text
Python 依賴套件清單：
- fastapi (Web 框架)
- uvicorn (ASGI 伺服器)
- pydantic (資料驗證)
- 其他可選套件（註解掉的）
```

---

## 🎯 核心功能流程

### 1️⃣ 追蹤流程
```
用戶瀏覽網頁
    ↓
background.js 監聽 tab 事件
    ↓
計算停留時間 + 自動分類
    ↓
儲存到 Chrome Storage
    ↓
每 5 分鐘批次發送到後端
    ↓
main.py 接收並儲存
```

### 2️⃣ 展示流程
```
用戶打開 Dashboard (/)
    ↓
載入 main.py 的嵌入式 HTML
    ↓
JavaScript 調用 API 獲取數據
    ↓
渲染統計卡片和活動列表
    ↓
用戶可以刷新獲取最新數據
```

### 3️⃣ AI 分析流程（示範）
```
定時任務觸發（每天 18:00）
    ↓
從資料庫獲取今日所有活動
    ↓
ai_analyzer.py 計算統計數據
    ↓
構建提示詞發送到 Gemini API
    ↓
接收 AI 生成的分析報告
    ↓
透過郵件發送給用戶
```

---

## 💻 代碼統計

| 類型 | 檔案數 | 總行數 (估計) |
|------|--------|--------------|
| JavaScript | 2 | ~230 行 |
| Python | 2 | ~650 行 |
| HTML | 1 | ~130 行 |
| JSON | 1 | ~25 行 |
| Markdown | 3 | ~1000 行 |
| **總計** | **9** | **~2035 行** |

---

## 🎨 UI 設計特色

### 配色方案
- **主色調：** 紫藍漸層 (#667eea → #764ba2)
- **卡片背景：** 白色 + 半透明
- **文字：** 深灰色 (#333) / 白色
- **按鈕：** 漸層背景，hover 有動畫

### 設計風格
- ✨ 現代簡約
- 🎨 漸層背景
- 🔲 圓角卡片
- 💫 微動畫效果
- 📱 響應式設計

---

## 🔑 關鍵技術點

### Extension 開發
1. **Manifest V3** - 最新的 Chrome Extension 規範
2. **Service Worker** - 背景腳本使用 Service Worker
3. **Chrome Storage API** - 本地數據儲存
4. **Chrome Alarms API** - 定時任務

### 後端開發
1. **FastAPI** - 現代 Python Web 框架
2. **Pydantic** - 資料驗證和序列化
3. **CORS** - 跨域資源共享配置
4. **嵌入式 HTML** - 單檔案部署

### AI 整合
1. **Prompt Engineering** - 精心設計的提示詞
2. **資料預處理** - 統計計算和格式化
3. **錯誤處理** - 完整的 try-catch

---

## 📊 資料格式

### Activity 物件
```json
{
  "url": "https://github.com/user/repo",
  "domain": "github.com",
  "duration": 3600,
  "timestamp": "2024-02-03T10:00:00",
  "category": "productive"
}
```

### Summary 物件
```json
{
  "total_hours": 5.2,
  "productive_hours": 3.5,
  "distraction_hours": 1.2,
  "focus_score": 74,
  "recent_activities": [...]
}
```

---

## 🚀 啟動順序

1. **後端先啟動**
   ```bash
   cd backend
   python main.py
   ```

2. **Extension 後安裝**
   - chrome://extensions/
   - 載入 extension/ 資料夾

3. **測試流程**
   - 瀏覽一些網站
   - 點擊 Extension 查看統計
   - 訪問 Dashboard
   - 測試 AI 分析

---

## 📝 待辦事項

如果你想擴展這個專案：

**必要改進：**
- [ ] 準備圖標文件（icon16/48/128.png）
- [ ] 設定真實的 Gemini API Key
- [ ] 配置郵件發送服務

**進階功能：**
- [ ] 改用真實資料庫（SQLite/PostgreSQL）
- [ ] 加入用戶註冊/登入
- [ ] 實作排程任務
- [ ] 加入圖表視覺化
- [ ] 優化 UI/UX
- [ ] 寫單元測試

---

## 🎓 學習重點

通過這個專案，你可以學到：

1. **Chrome Extension 開發**
   - Manifest 配置
   - 背景腳本
   - Content Scripts
   - Chrome APIs

2. **FastAPI 後端開發**
   - REST API 設計
   - 資料模型定義
   - CORS 處理
   - API 文檔生成

3. **AI API 整合**
   - Prompt 設計
   - API 調用
   - 錯誤處理
   - 資料格式化

4. **全端整合**
   - 前後端通訊
   - 資料流程設計
   - 系統架構
   - 專案組織

---

**這就是整個專案的完整概覽！現在你可以展示給隊友，開始討論如何分工了 🎉**
