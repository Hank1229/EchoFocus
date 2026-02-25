from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import json
from pathlib import Path

app = FastAPI(title="Productivity Tracker API")

# 允許 CORS（Chrome Extension 需要）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 資料模型
class Activity(BaseModel):
    url: str
    domain: str
    duration: int  # 秒數
    timestamp: str
    category: str  # 'productive', 'distraction', 'neutral'

class BatchActivityLog(BaseModel):
    user_id: int
    activities: List[Activity]

class User(BaseModel):
    id: int
    email: str
    name: Optional[str] = None

# 簡易記憶體資料庫（示範用）
users_db = {
    1: {"id": 1, "email": "demo@example.com", "name": "Demo User"}
}

activities_db = []

# API 端點

@app.get("/")
async def root():
    """主頁 - 簡單的儀表板"""
    html_content = """
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Productivity Tracker Dashboard</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 40px 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .header {
                text-align: center;
                color: white;
                margin-bottom: 40px;
            }
            
            h1 {
                font-size: 42px;
                margin-bottom: 10px;
            }
            
            .subtitle {
                font-size: 18px;
                opacity: 0.9;
            }
            
            .dashboard {
                background: white;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            
            .stat-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 15px;
                text-align: center;
            }
            
            .stat-value {
                font-size: 48px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            
            .stat-label {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .activity-list {
                margin-top: 30px;
            }
            
            .activity-list h2 {
                color: #333;
                margin-bottom: 20px;
            }
            
            .activity-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                background: #f5f5f5;
                border-radius: 10px;
                margin-bottom: 10px;
            }
            
            .activity-domain {
                font-weight: 600;
                color: #333;
            }
            
            .activity-time {
                color: #666;
            }
            
            .category-badge {
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .productive {
                background: #4ade80;
                color: white;
            }
            
            .distraction {
                background: #ef4444;
                color: white;
            }
            
            .neutral {
                background: #94a3b8;
                color: white;
            }
            
            .btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 20px;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Productivity Dashboard</h1>
                <p class="subtitle">追蹤你的生產力旅程</p>
            </div>
            
            <div class="dashboard">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" id="totalHours">0</div>
                        <div class="stat-label">總追蹤時數</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="productiveHours">0</div>
                        <div class="stat-label">生產力時數</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="distractionHours">0</div>
                        <div class="stat-label">分心時數</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="focusScore">0%</div>
                        <div class="stat-label">專注分數</div>
                    </div>
                </div>
                
                <div class="activity-list">
                    <h2>最近活動</h2>
                    <div id="activitiesList">
                        <p style="text-align: center; color: #999; padding: 40px;">
                            暫無活動數據<br>
                            <small>安裝 Chrome Extension 開始追蹤</small>
                        </p>
                    </div>
                </div>
                
                <button class="btn" onclick="loadData()">刷新數據</button>
            </div>
        </div>
        
        <script>
            async function loadData() {
                try {
                    const response = await fetch('/api/activity/summary/1');
                    const data = await response.json();
                    
                    // 更新統計
                    document.getElementById('totalHours').textContent = 
                        data.total_hours.toFixed(1);
                    document.getElementById('productiveHours').textContent = 
                        data.productive_hours.toFixed(1);
                    document.getElementById('distractionHours').textContent = 
                        data.distraction_hours.toFixed(1);
                    document.getElementById('focusScore').textContent = 
                        data.focus_score + '%';
                    
                    // 更新活動列表
                    const activitiesList = document.getElementById('activitiesList');
                    if (data.recent_activities.length > 0) {
                        activitiesList.innerHTML = data.recent_activities.map(activity => `
                            <div class="activity-item">
                                <div>
                                    <div class="activity-domain">${activity.domain}</div>
                                    <div class="activity-time">${new Date(activity.timestamp).toLocaleString('zh-TW')}</div>
                                </div>
                                <div>
                                    <span class="category-badge ${activity.category}">${getCategoryText(activity.category)}</span>
                                    <span style="margin-left: 10px; color: #666;">${formatDuration(activity.duration)}</span>
                                </div>
                            </div>
                        `).join('');
                    }
                } catch (error) {
                    console.error('載入數據失敗:', error);
                }
            }
            
            function getCategoryText(category) {
                const map = {
                    'productive': '生產力',
                    'distraction': '分心',
                    'neutral': '中性'
                };
                return map[category] || category;
            }
            
            function formatDuration(seconds) {
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes}分鐘`;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return `${hours}小時${mins}分鐘`;
            }
            
            // 頁面載入時自動讀取數據
            loadData();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/api/activity/batch")
async def log_batch_activities(data: BatchActivityLog):
    """批次記錄活動"""
    for activity in data.activities:
        activity_dict = activity.dict()
        activity_dict['user_id'] = data.user_id
        activities_db.append(activity_dict)
    
    return {
        "success": True,
        "message": f"成功記錄 {len(data.activities)} 筆活動",
        "total_activities": len(activities_db)
    }

@app.get("/api/activity/summary/{user_id}")
async def get_activity_summary(user_id: int):
    """獲取用戶活動總結"""
    user_activities = [a for a in activities_db if a.get('user_id') == user_id]
    
    if not user_activities:
        return {
            "total_hours": 0,
            "productive_hours": 0,
            "distraction_hours": 0,
            "focus_score": 0,
            "recent_activities": []
        }
    
    # 計算統計
    total_seconds = sum(a['duration'] for a in user_activities)
    productive_seconds = sum(a['duration'] for a in user_activities if a['category'] == 'productive')
    distraction_seconds = sum(a['duration'] for a in user_activities if a['category'] == 'distraction')
    
    focus_score = int((productive_seconds / total_seconds * 100)) if total_seconds > 0 else 0
    
    # 取最近 10 筆活動
    recent = sorted(user_activities, key=lambda x: x['timestamp'], reverse=True)[:10]
    
    return {
        "total_hours": total_seconds / 3600,
        "productive_hours": productive_seconds / 3600,
        "distraction_hours": distraction_seconds / 3600,
        "focus_score": focus_score,
        "recent_activities": recent
    }

@app.get("/api/activity/today/{user_id}")
async def get_today_activities(user_id: int):
    """獲取今日活動"""
    today = datetime.now().date()
    user_activities = [
        a for a in activities_db 
        if a.get('user_id') == user_id and 
        datetime.fromisoformat(a['timestamp']).date() == today
    ]
    
    return {
        "date": today.isoformat(),
        "activities": user_activities,
        "count": len(user_activities)
    }

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    """獲取用戶資訊"""
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用戶不存在")
    return user

@app.get("/health")
async def health_check():
    """健康檢查"""
    return {
        "status": "healthy",
        "total_activities": len(activities_db),
        "total_users": len(users_db)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
