import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '服務條款 — EchoFocus',
  description: 'EchoFocus 服務條款：使用我們的生產力追蹤工具前請閱讀以下條款。',
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

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-slate-100">服務條款</h1>
          <p className="text-sm text-slate-500">最後更新：{LAST_UPDATED}</p>
        </div>

        <div className="bg-slate-800 rounded-xl px-5 py-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            感謝您使用 EchoFocus。請在使用前仔細閱讀以下條款。安裝並使用 EchoFocus 即表示您同意遵守這些條款。
          </p>
        </div>

        <Section title="1. 服務說明">
          <p>
            EchoFocus 是一款 Chrome 瀏覽器擴充功能，提供自動瀏覽行為追蹤、AI 生產力分析、
            視覺化 Dashboard 及每日 Email 報告等功能，旨在幫助您提升個人生產力。
          </p>
        </Section>

        <Section title="2. 使用資格">
          <p>使用 EchoFocus 需要：</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>年滿 13 歲（或您所在地區法定最低年齡）</li>
            <li>使用 Chrome 116 或更新版本</li>
            <li>同意本條款及我們的隱私政策</li>
          </ul>
        </Section>

        <Section title="3. 帳戶與驗證">
          <p>
            基本追蹤功能無需帳戶即可使用。若要使用 Dashboard、AI 分析及 Email 報告功能，
            您需要使用 Google 帳戶登入。您有責任維護帳戶的安全性，並對帳戶下的所有活動負責。
          </p>
        </Section>

        <Section title="4. 可接受的使用方式">
          <p>您同意不得：</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>嘗試反向工程或破解 EchoFocus 的任何部分</li>
            <li>使用 EchoFocus 追蹤他人而未獲得其同意</li>
            <li>以任何可能損害服務或其他使用者的方式使用 EchoFocus</li>
            <li>繞過或干擾 EchoFocus 的安全功能</li>
          </ul>
        </Section>

        <Section title="5. 資料與隱私">
          <p>
            您的瀏覽資料歸您所有。EchoFocus 採用本地優先設計，
            原始瀏覽記錄永遠只儲存在您的設備上。
            詳情請參閱我們的<Link href="/privacy" className="text-green-400 hover:text-green-300 underline underline-offset-2">隱私政策</Link>。
          </p>
        </Section>

        <Section title="6. 免責聲明">
          <p>
            EchoFocus 依「現狀」提供，不附帶任何明示或默示的保證。
            我們不保證服務不中斷、無錯誤或符合您的特定需求。
            生產力改善結果因人而異，我們無法保證特定的使用效果。
          </p>
        </Section>

        <Section title="7. 責任限制">
          <p>
            在法律允許的最大範圍內，EchoFocus 的開發者對因使用或無法使用本服務而產生的
            任何間接、偶然、特殊或衍生損害不承擔責任，即使已被告知此類損害的可能性。
          </p>
        </Section>

        <Section title="8. 第三方服務">
          <p>
            EchoFocus 使用 Supabase、Google Gemini API 及 Resend 等第三方服務。
            使用這些服務受其各自服務條款約束。EchoFocus 對第三方服務的可用性或內容不承擔責任。
          </p>
        </Section>

        <Section title="9. 服務變更與終止">
          <p>
            我們保留隨時修改、暫停或終止 EchoFocus（或其任何部分）的權利，
            恕不另行通知。我們不對服務的任何修改、暫停或終止承擔責任。
          </p>
          <p>
            您可以隨時從 Chrome 移除 EchoFocus 並刪除您的帳戶，以終止使用本服務。
          </p>
        </Section>

        <Section title="10. 條款變更">
          <p>
            我們可能不定期修訂這些條款。重大變更將透過擴充功能或 Email 通知您。
            在通知後繼續使用 EchoFocus 即表示您接受更新後的條款。
          </p>
        </Section>

        <Section title="11. 準據法">
          <p>
            本條款依中華民國（台灣）法律管轄並解釋，不適用法律衝突原則。
          </p>
        </Section>

        <Section title="12. 聯絡我們">
          <p>
            如有任何關於本條款的問題，請透過 GitHub Issues 聯絡我們。
          </p>
        </Section>

        {/* Footer links */}
        <div className="border-t border-slate-800 pt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">首頁</Link>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">隱私政策</Link>
        </div>
      </main>
    </div>
  )
}
