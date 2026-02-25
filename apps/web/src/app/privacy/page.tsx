import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '隱私政策 — EchoFocus',
  description: 'EchoFocus 隱私政策：了解我們如何保護您的瀏覽資料與個人資訊。',
}

const LAST_UPDATED = '2025 年 1 月 1 日'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-100 hover:text-white transition-colors">
            <span className="text-xl">🎯</span>
            <span className="font-bold">EchoFocus</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            ← 返回首頁
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">隱私政策</h1>
          <p className="text-sm text-slate-500">最後更新：{LAST_UPDATED}</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4">
          <p className="text-sm text-green-400 leading-relaxed">
            <strong className="font-semibold">核心承諾：</strong>
            您的瀏覽記錄是您的私人資料。EchoFocus 採用「本地優先」架構 — 所有原始瀏覽數據（URL、頁面標題、瀏覽時長）永遠只儲存在您的設備上，絕不上傳至任何伺服器。
          </p>
        </div>

        <Section title="1. 我們收集哪些資料">
          <p>EchoFocus 分兩個層面管理資料：</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 pr-4 text-slate-300 font-semibold">資料類型</th>
                  <th className="text-left py-2 pr-4 text-slate-300 font-semibold">儲存位置</th>
                  <th className="text-left py-2 text-slate-300 font-semibold">是否上傳至伺服器</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  ['瀏覽 URL、頁面標題', '您的設備（chrome.storage.local）', '❌ 永不上傳'],
                  ['每次瀏覽時長', '您的設備（chrome.storage.local）', '❌ 永不上傳'],
                  ['網站分類結果', '您的設備（chrome.storage.local）', '❌ 永不上傳'],
                  ['每日聚合統計（僅網域+時長）', '您的設備，可選同步至雲端', '⚠️ 僅匿名聚合數據（選擇性）'],
                  ['AI 分析結果', 'chrome.storage.local + Supabase', '✅ 僅分析文字，不含原始瀏覽數據'],
                  ['帳戶資訊（Email、偏好設定）', 'Supabase（加密）', '✅ 用於認證與報告'],
                ].map(([type, location, uploaded]) => (
                  <tr key={type}>
                    <td className="py-2.5 pr-4 text-slate-300">{type}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{location}</td>
                    <td className="py-2.5 text-slate-400">{uploaded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="2. 我們如何使用這些資料">
          <ul className="space-y-2 list-disc list-inside">
            <li><strong className="text-slate-300">生產力追蹤：</strong>在您的設備本地分析瀏覽行為，產生每日統計與專注分數</li>
            <li><strong className="text-slate-300">AI 分析：</strong>將匿名聚合摘要（僅網域名稱+時長，無 URL）傳送至 Google Gemini API，取得個人化建議</li>
            <li><strong className="text-slate-300">Email 報告：</strong>透過 Resend 服務傳送每日生產力報告（您可隨時關閉）</li>
            <li><strong className="text-slate-300">跨裝置同步：</strong>使用 Supabase 同步您的偏好設定（如需要）</li>
          </ul>
        </Section>

        <Section title="3. 第三方服務">
          <p>EchoFocus 使用以下第三方服務，各有其隱私政策：</p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong className="text-slate-300">Supabase：</strong>用於使用者驗證、偏好設定與 AI 分析結果儲存。資料加密存放於 AWS 伺服器。</li>
            <li><strong className="text-slate-300">Google Gemini API：</strong>用於 AI 生產力分析。僅接收匿名聚合數據，不含任何 URL 或個人識別資訊。</li>
            <li><strong className="text-slate-300">Resend：</strong>用於傳送每日 Email 報告。僅使用您的 Email 地址進行傳送。</li>
            <li><strong className="text-slate-300">Google OAuth：</strong>用於帳戶登入驗證（透過 Supabase Auth）。</li>
          </ul>
        </Section>

        <Section title="4. 資料保留">
          <ul className="space-y-2 list-disc list-inside">
            <li>原始瀏覽記錄：依您設定的保留天數（預設 30 天）自動清除</li>
            <li>每日聚合統計：本地保留最多 365 天</li>
            <li>AI 分析結果：保留於本地與 Supabase，直到您主動刪除</li>
            <li>帳戶資料：保留至您刪除帳戶為止</li>
          </ul>
        </Section>

        <Section title="5. 您的權利">
          <p>您可以隨時：</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>從擴充功能選項頁面（設定 → 隱私）下載或刪除所有本地資料</li>
            <li>在帳戶設定中關閉 Email 報告</li>
            <li>從帳戶設定中刪除您的 Supabase 帳戶及所有雲端資料</li>
            <li>在選項頁面中停用追蹤功能</li>
          </ul>
        </Section>

        <Section title="6. 資料安全">
          <p>
            本地資料受 Chrome 安全模型保護，其他網站或應用程式無法存取。
            雲端資料（Supabase）使用加密傳輸（HTTPS）和靜態加密，並啟用行列安全性（RLS），
            確保每位使用者只能存取自己的資料。
          </p>
        </Section>

        <Section title="7. 兒童隱私">
          <p>
            EchoFocus 不針對 13 歲以下兒童設計，我們也不會刻意收集此年齡群體的個人資訊。
          </p>
        </Section>

        <Section title="8. 政策變更">
          <p>
            我們可能不定期更新本隱私政策。重大變更將透過擴充功能通知您。
            繼續使用 EchoFocus 即表示您接受更新後的政策。
          </p>
        </Section>

        <Section title="9. 聯絡我們">
          <p>
            如有任何隱私相關問題，請透過 GitHub Issues 聯絡我們。
          </p>
        </Section>

        {/* Footer links */}
        <div className="border-t border-slate-800 pt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">首頁</Link>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">服務條款</Link>
        </div>
      </main>
    </div>
  )
}
