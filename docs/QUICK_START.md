# 🚀 快速啟動指南

## 5 分鐘啟動 Demo

### Step 1: 準備環境

確認你有安裝：
- Python 3.8+ 
- Chrome 瀏覽器
- 文字編輯器（VS Code 推薦）

### Step 2: 啟動後端

```bash
# 打開終端機，進入專案資料夾
cd productivity-tracker-demo/backend

# 安裝 Python 套件
pip install fastapi uvicorn pydantic

# 啟動伺服器
python main.py
```

你應該會看到：
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

✅ 後端啟動成功！

保持這個終端機視窗開著。

### Step 3: 測試 API

打開瀏覽器，訪問：
- http://localhost:8000 - 應該看到 Dashboard
- http://localhost:8000/docs - 應該看到 API 文檔

### Step 4: 安裝 Chrome Extension

1. 打開 Chrome 瀏覽器
2. 在網址列輸入：`chrome://extensions/`
3. 右上角開啟「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 `productivity-tracker-demo/extension` 資料夾
6. 看到 Extension 出現了！

### Step 5: 測試整個流程

1. **測試 Extension**
   - 點擊瀏覽器右上角的 Extension 圖標
   - 應該看到漂亮的彈出視窗
   - 顯示「追蹤狀態：進行中」

2. **產生一些數據**
   - 正常瀏覽一些網站（GitHub, YouTube, 等等）
   - 每個網站停留至少 10 秒

3. **手動同步**
   - 點擊 Extension 的「立即同步數據」按鈕
   - 應該顯示「同步完成 ✓」

4. **查看 Dashboard**
   - 在 Extension 點擊「打開儀表板」
   - 或直接訪問 http://localhost:8000
   - 應該看到你的活動數據！

5. **測試 AI 分析**
   - 在終端機裡執行：
     ```bash
     cd backend
     python ai_analyzer.py
     ```
   - 應該看到 AI 生成的分析報告

---

## 🎉 成功！

如果你走到這裡，代表所有功能都正常運作了！

現在你可以：
- 繼續瀏覽網頁，Extension 會持續追蹤
- 訪問 Dashboard 看即時數據
- 展示給你的隊友看

---

## 🐛 遇到問題？

### 問題 1: `pip install` 失敗
**解決方法：**
```bash
# 使用虛擬環境
python -m venv venv
source venv/bin/activate  # Mac/Linux
# 或
venv\Scripts\activate  # Windows

pip install fastapi uvicorn pydantic
```

### 問題 2: Extension 無法載入
**解決方法：**
- 確認選擇的是 `extension` 資料夾（不是整個專案）
- 確認資料夾裡有 `manifest.json` 文件

### 問題 3: Extension 無法同步數據
**解決方法：**
- 確認後端正在運行（http://localhost:8000 可以訪問）
- 打開 Chrome 開發者工具（F12）→ Console 看錯誤訊息
- 確認 Extension 的 background.js 裡的 API URL 是 `http://localhost:8000`

### 問題 4: Dashboard 沒有顯示數據
**解決方法：**
- 點擊 Extension 的「立即同步數據」
- 刷新 Dashboard 頁面
- 檢查瀏覽器 Console 是否有錯誤

---

## 📊 查看 API 狀態

訪問這些端點檢查系統狀態：

```bash
# 健康檢查
http://localhost:8000/health

# 查看用戶資訊
http://localhost:8000/api/users/1

# 查看今日活動
http://localhost:8000/api/activity/today/1

# 查看總結
http://localhost:8000/api/activity/summary/1
```

---

## 🎬 展示建議

### 展示流程（5 分鐘）

1. **介紹問題** (30秒)
   - "我們常常不知道時間都花去哪了..."

2. **展示 Extension** (1分鐘)
   - 打開彈出視窗
   - 說明追蹤功能
   - 展示今日統計

3. **展示 Dashboard** (2分鐘)
   - 打開網頁
   - 展示統計卡片
   - 展示活動列表
   - 說明分類邏輯

4. **展示 AI 分析** (1分鐘)
   - 展示 AI 生成的報告
   - 說明個性化建議

5. **說明技術** (30秒)
   - 前端：Chrome Extension + React
   - 後端：FastAPI + AI API
   - 完全免費！

---

## 💻 開發建議

### 測試時的技巧

1. **快速產生測試數據**
   - 寫一個腳本直接發送假數據到 API
   - 不用真的瀏覽很多網站

2. **清除數據重新測試**
   - 重啟後端（因為用記憶體儲存）
   - 或清除 Extension 的 local storage

3. **調試 Extension**
   - 右鍵點擊 Extension 圖標 → 檢查彈出式視窗
   - chrome://extensions/ → 點擊「檢查檢視」查看背景腳本

---

## 📚 下一步

現在 Demo 已經跑起來了，你可以：

1. **理解代碼**
   - 看 `main.py` 理解 API 結構
   - 看 `background.js` 理解追蹤邏輯
   - 看 `ai_analyzer.py` 理解 AI 整合

2. **客製化**
   - 修改 UI 顏色和樣式
   - 加入更多生產力網站
   - 改變 AI 提示詞

3. **擴展功能**
   - 加入真實的資料庫
   - 串接真實的 Gemini API
   - 實作郵件發送

4. **準備展示**
   - 錄製展示影片
   - 準備 PPT
   - 練習講解流程

---

## 🎯 檢查清單

展示前確認：

- [ ] 後端啟動成功
- [ ] Extension 已安裝
- [ ] Dashboard 可以訪問
- [ ] 至少有一些測試數據
- [ ] API 文檔可以打開 (/docs)
- [ ] 了解整個系統如何運作
- [ ] 準備好回答問題

---

**祝展示順利！有問題隨時問我 💪**
