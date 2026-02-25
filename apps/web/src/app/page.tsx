import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-bold text-slate-100 tracking-wide">EchoFocus</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
              登入
            </Link>
            <a href="https://chromewebstore.google.com" target="_blank" rel="noreferrer"
              className="text-sm px-4 py-1.5 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-full transition-colors">
              安裝擴充功能 →
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400 font-medium mb-6">
          🔒 隱私優先 — 瀏覽資料永遠留在您的裝置
        </div>
        <h1 className="text-5xl font-bold text-slate-100 leading-tight mb-6">
          讓 AI 幫你看見<br />
          <span className="text-green-400">時間花在哪裡</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          EchoFocus 自動追蹤您的瀏覽行為，分析工作模式，
          提供個人化生產力建議 — 幫助你每天更專注、更高效。
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="https://chromewebstore.google.com" target="_blank" rel="noreferrer"
            className="px-8 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-colors text-lg">
            免費安裝 Chrome 擴充功能
          </a>
          <Link href="/login"
            className="px-8 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl transition-colors text-lg">
            開啟 Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '🤖',
              title: 'AI 生產力教練',
              desc: 'Google Gemini AI 分析你的工作模式，給出具體可執行的改善建議，像有一位私人教練隨時待命。',
            },
            {
              icon: '📊',
              title: '視覺化數據洞察',
              desc: '清晰的圖表呈現每日、每週趨勢，找出你最專注的時段和最容易分心的網站。',
            },
            {
              icon: '🔒',
              title: '你的資料，你作主',
              desc: '所有瀏覽記錄完全儲存在你的裝置上，絕不上傳至伺服器。連 AI 分析也只使用匿名化的聚合數據。',
            },
          ].map(f => (
            <div key={f.title} className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy banner */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
          <p className="text-2xl mb-3">🛡️</p>
          <h2 className="text-xl font-bold text-slate-100 mb-3">隱私保護，不是事後補救，而是架構核心</h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            不同於 RescueTime、Toggl Track 等競品將用戶瀏覽數據回傳至伺服器，
            EchoFocus 採用「本地優先」架構。律師、醫師、金融從業人員等需要處理敏感資訊的專業人士也能安心使用。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>© 2026 EchoFocus</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">隱私政策</Link>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">服務條款</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
