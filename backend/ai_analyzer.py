"""
AI 分析模組 - 使用 Google Gemini API 分析用戶生產力數據
"""

import os
from typing import List, Dict
from datetime import datetime

# 注意：實際使用時需要安裝 google-generativeai
# pip install google-generativeai

def analyze_productivity(activities: List[Dict]) -> str:
    """
    分析用戶的生產力數據並生成個性化建議
    
    Args:
        activities: 活動列表，每個活動包含 url, duration, category, timestamp
    
    Returns:
        AI 生成的分析報告
    """
    
    # 計算統計數據
    stats = calculate_stats(activities)
    
    # 構建提示詞
    prompt = f"""
你是一位專業的生產力教練。請根據以下用戶今天的活動數據，提供友善、激勵性的分析和建議。

## 今日數據統計
- 總追蹤時間：{stats['total_hours']:.1f} 小時
- 生產力時間：{stats['productive_hours']:.1f} 小時 ({stats['productive_percent']:.0f}%)
- 分心時間：{stats['distraction_hours']:.1f} 小時 ({stats['distraction_percent']:.0f}%)
- 中性活動：{stats['neutral_hours']:.1f} 小時

## 主要活動網站（按時間排序）
{format_top_sites(stats['top_sites'])}

## 時間分布
{format_hourly_distribution(activities)}

請提供：
1. 今天表現的總體評價（正面、鼓勵的語氣）
2. 發現的生產力模式或習慣
3. 3個具體、可執行的改善建議
4. 激勵的結語

請用繁體中文回覆，語氣友善親切，約200-300字。
"""
    
    # 這裡是示範 - 實際使用時調用 Gemini API
    # 示範用的模擬回覆
    demo_response = generate_demo_response(stats)
    
    return demo_response

def calculate_stats(activities: List[Dict]) -> Dict:
    """計算活動統計數據"""
    total_seconds = sum(a['duration'] for a in activities)
    productive_seconds = sum(a['duration'] for a in activities if a['category'] == 'productive')
    distraction_seconds = sum(a['duration'] for a in activities if a['category'] == 'distraction')
    neutral_seconds = sum(a['duration'] for a in activities if a['category'] == 'neutral')
    
    # 統計各網站時間
    site_times = {}
    for activity in activities:
        domain = activity['domain']
        if domain not in site_times:
            site_times[domain] = {'duration': 0, 'category': activity['category']}
        site_times[domain]['duration'] += activity['duration']
    
    # 排序取前5名
    top_sites = sorted(site_times.items(), key=lambda x: x[1]['duration'], reverse=True)[:5]
    
    return {
        'total_hours': total_seconds / 3600,
        'productive_hours': productive_seconds / 3600,
        'distraction_hours': distraction_seconds / 3600,
        'neutral_hours': neutral_seconds / 3600,
        'productive_percent': (productive_seconds / total_seconds * 100) if total_seconds > 0 else 0,
        'distraction_percent': (distraction_seconds / total_seconds * 100) if total_seconds > 0 else 0,
        'top_sites': top_sites
    }

def format_top_sites(top_sites: List) -> str:
    """格式化主要網站列表"""
    lines = []
    for domain, data in top_sites:
        hours = data['duration'] / 3600
        category_emoji = {
            'productive': '✅',
            'distraction': '⚠️',
            'neutral': '➖'
        }.get(data['category'], '➖')
        lines.append(f"- {category_emoji} {domain}: {hours:.1f} 小時")
    return '\n'.join(lines)

def format_hourly_distribution(activities: List[Dict]) -> str:
    """格式化每小時分布"""
    hourly = {}
    for activity in activities:
        hour = datetime.fromisoformat(activity['timestamp']).hour
        if hour not in hourly:
            hourly[hour] = 0
        hourly[hour] += activity['duration']
    
    # 找出最專注的時段
    if hourly:
        peak_hour = max(hourly.items(), key=lambda x: x[1])
        return f"最活躍時段：{peak_hour[0]:02d}:00 - {peak_hour[0]+1:02d}:00"
    return "暫無時間分布數據"

def generate_demo_response(stats: Dict) -> str:
    """生成示範回覆（實際使用時會調用 Gemini API）"""
    
    productive_hours = stats['productive_hours']
    distraction_hours = stats['distraction_hours']
    focus_score = stats['productive_percent']
    
    if focus_score >= 70:
        tone = "太棒了！"
        evaluation = "你今天的專注度非常高，展現了優秀的自律能力。"
    elif focus_score >= 50:
        tone = "做得不錯！"
        evaluation = "你今天保持了不錯的生產力，繼續保持！"
    else:
        tone = "別氣餒！"
        evaluation = "今天可能有些分心，但這很正常，明天會更好。"
    
    response = f"""
{tone}

{evaluation}今天你投入了 {productive_hours:.1f} 小時在有意義的工作上，這佔了你總時間的 {focus_score:.0f}%。

我注意到你在 {stats['top_sites'][0][0] if stats['top_sites'] else '主要任務'} 上花費了最多時間。這顯示你知道如何專注於重要的事情。

💡 改善建議：
1. 嘗試使用番茄鐘技巧，每 25 分鐘專注工作，休息 5 分鐘
2. 考慮在最容易分心的時段（通常是下午）安排較輕鬆的任務
3. 設定每日專注時間目標，逐步提升到 {productive_hours + 1:.0f} 小時

記住，每一天的努力都在為更好的自己鋪路。明天繼續加油！🚀
"""
    
    return response.strip()

def send_daily_email(user_email: str, summary: str, stats: Dict):
    """
    發送每日總結郵件
    
    實際使用時需要配置 SMTP 或使用 SendGrid
    """
    
    # 這是示範代碼 - 實際使用時需要真實的 SMTP 配置
    email_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .content {{
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
        }}
        .stats {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }}
        .stat-box {{
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}
        .stat-value {{
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
        }}
        .stat-label {{
            font-size: 14px;
            color: #666;
        }}
        .summary {{
            background: #f9f9f9;
            padding: 20px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 今日生產力報告</h1>
            <p>{datetime.now().strftime('%Y年%m月%d日')}</p>
        </div>
        <div class="content">
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-value">{stats['productive_hours']:.1f}</div>
                    <div class="stat-label">專注時數</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{stats['productive_percent']:.0f}%</div>
                    <div class="stat-label">專注分數</div>
                </div>
            </div>
            
            <div class="summary">
                {summary.replace(chr(10), '<br>')}
            </div>
            
            <p style="text-align: center; color: #999; margin-top: 30px;">
                <small>這封郵件由 Productivity Tracker 自動生成</small>
            </p>
        </div>
    </div>
</body>
</html>
"""
    
    print(f"📧 準備發送郵件給: {user_email}")
    print("郵件內容:")
    print(email_html)
    
    # 實際發送邏輯在這裡
    # import smtplib
    # from email.mime.text import MIMEText
    # ...
    
    return True

# 使用範例
if __name__ == "__main__":
    # 測試數據
    test_activities = [
        {
            "url": "https://github.com/user/repo",
            "domain": "github.com",
            "duration": 3600,
            "timestamp": "2024-02-03T10:00:00",
            "category": "productive"
        },
        {
            "url": "https://stackoverflow.com/questions/123",
            "domain": "stackoverflow.com",
            "duration": 1800,
            "timestamp": "2024-02-03T11:30:00",
            "category": "productive"
        },
        {
            "url": "https://youtube.com/watch",
            "domain": "youtube.com",
            "duration": 900,
            "timestamp": "2024-02-03T14:00:00",
            "category": "distraction"
        }
    ]
    
    # 生成分析
    analysis = analyze_productivity(test_activities)
    print("AI 分析結果:")
    print(analysis)
    print("\n" + "="*50 + "\n")
    
    # 測試郵件
    stats = calculate_stats(test_activities)
    send_daily_email("user@example.com", analysis, stats)
