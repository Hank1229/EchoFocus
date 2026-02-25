// EchoFocus — send-email-report Edge Function
// Sends daily HTML productivity report emails via Resend.
// Called by Supabase scheduler (daily) or manually with { userId } for a single user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = 'EchoFocus <onboarding@resend.dev>'
const DASHBOARD_URL = 'https://echofocus.vercel.app/dashboard'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function formatMins(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function buildEmail(params: {
  displayName: string | null
  email: string
  date: string
  focusScore: number
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  topDomains: { domain: string; seconds: number; category: string }[]
  analysisText: string | null
}): { subject: string; html: string } {
  const { displayName, date, focusScore, productiveSeconds, distractionSeconds,
    neutralSeconds, topDomains, analysisText } = params

  const name = displayName ?? '用戶'
  const color = scoreColor(focusScore)
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const domainRows = topDomains.slice(0, 5).map(d => `
    <tr>
      <td style="padding:6px 0;color:#94a3b8;font-size:13px;">${d.domain}</td>
      <td style="padding:6px 0;color:#64748b;font-size:12px;text-align:center;">
        ${d.category === 'productive' ? '🟢' : d.category === 'distraction' ? '🔴' : '⚪️'}
      </td>
      <td style="padding:6px 0;color:#cbd5e1;font-size:13px;text-align:right;">${formatMins(d.seconds)}</td>
    </tr>`).join('')

  const aiSection = analysisText ? `
    <div style="margin-top:24px;padding:16px;background:#1e293b;border-left:3px solid #22c55e;border-radius:4px;">
      <p style="margin:0 0 8px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">🤖 AI 洞察</p>
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">${analysisText}</p>
    </div>` : ''

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>EchoFocus 每日報告</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1e293b;border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="padding:24px 32px;border-bottom:1px solid #334155;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="font-size:20px;">🎯</span> <span style="font-size:16px;font-weight:700;color:#f1f5f9;">EchoFocus</span></td>
      <td align="right"><span style="font-size:12px;color:#64748b;">${formattedDate}</span></td>
    </tr></table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">

    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;">嗨 ${name}，以下是你今天的生產力報告 👋</p>

    <!-- Focus score -->
    <div style="text-align:center;padding:24px;background:#0f172a;border-radius:12px;margin-bottom:24px;">
      <div style="font-size:64px;font-weight:800;color:${color};line-height:1;">${focusScore}</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;">專注分數 / 100</div>
    </div>

    <!-- Time breakdown -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="33%" style="padding:4px;">
          <div style="background:#14532d;border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#22c55e;">${formatMins(productiveSeconds)}</div>
            <div style="font-size:11px;color:#4ade80;margin-top:2px;">生產效率</div>
          </div>
        </td>
        <td width="33%" style="padding:4px;">
          <div style="background:#4c0519;border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#ef4444;">${formatMins(distractionSeconds)}</div>
            <div style="font-size:11px;color:#f87171;margin-top:2px;">分心時間</div>
          </div>
        </td>
        <td width="33%" style="padding:4px;">
          <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#94a3b8;">${formatMins(neutralSeconds)}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">中性瀏覽</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Top domains -->
    ${topDomains.length > 0 ? `
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">今日主要網站</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${domainRows}
      </table>
    </div>` : ''}

    ${aiSection}

    <!-- CTA -->
    <div style="text-align:center;margin-top:32px;">
      <a href="${DASHBOARD_URL}" style="display:inline-block;padding:12px 32px;background:#22c55e;color:#fff;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
        查看完整 Dashboard →
      </a>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid #334155;">
    <p style="margin:0;font-size:11px;color:#475569;text-align:center;">
      🔒 所有瀏覽資料僅儲存於您的裝置，Email 報告僅含匿名聚合統計。<br>
      如不想收到此郵件，請在 Dashboard → 帳戶設定 中關閉 Email 報告。
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`

  return {
    subject: `🎯 EchoFocus 每日報告 — 專注分數 ${focusScore}`,
    html,
  }
}

// FIX: Always consume the response body before returning.
// Leaving a Deno fetch response body unconsumed causes EarlyDrop — the Deno
// runtime holds the TCP connection open and drops the worker before the caller
// can send its own Response back to the client.
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  // Always read the body — required to release the connection in Deno
  const responseBody = await res.text()

  if (!res.ok) {
    console.error(`Resend error for ${to}: ${res.status} ${responseBody}`)
    return false
  }

  console.log(`Resend success for ${to}: ${res.status}`)
  return true
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight — must return 'ok' body, not null, for Supabase edge runtime
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    let targetUserId: string | null = null

    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      targetUserId = body.userId ?? null
    }

    console.log('send-email-report: targetUserId =', targetUserId)

    // When a specific userId is given (test/manual send), skip email_report_enabled
    // filter so the test works regardless of saved preferences.
    let prefQuery = supabase
      .from('user_preferences')
      .select('user_id, email_report_enabled')

    if (targetUserId) {
      prefQuery = prefQuery.eq('user_id', targetUserId)
    } else {
      prefQuery = prefQuery.eq('email_report_enabled', true)
    }

    const { data: prefs, error: prefError } = await prefQuery
    if (prefError) throw prefError

    console.log(`send-email-report: found ${prefs?.length ?? 0} user(s) to email`)

    const results: { userId: string; sent: boolean }[] = []

    for (const pref of (prefs ?? [])) {
      const userId = pref.user_id

      // Fetch profile — use maybeSingle to avoid 406 when row missing
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) console.error('Profile fetch error:', profileError.message)
      if (!profile?.email) {
        console.warn(`No profile/email for user ${userId}, skipping`)
        continue
      }

      // Fetch latest synced aggregate
      const { data: agg, error: aggError } = await supabase
        .from('synced_aggregates')
        .select('date, productive_seconds, distraction_seconds, neutral_seconds, focus_score, top_domains')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (aggError) console.error('Aggregate fetch error:', aggError.message)
      if (!agg) {
        console.warn(`No synced aggregate for user ${userId}, skipping`)
        continue
      }

      // Fetch latest AI analysis (optional — won't skip if missing)
      const { data: analysis } = await supabase
        .from('ai_analyses')
        .select('analysis_text')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log(`Building email for ${profile.email}, date=${agg.date}`)

      const { subject, html } = buildEmail({
        displayName: profile.display_name,
        email: profile.email,
        date: agg.date,
        focusScore: agg.focus_score,
        productiveSeconds: agg.productive_seconds,
        distractionSeconds: agg.distraction_seconds,
        neutralSeconds: agg.neutral_seconds,
        topDomains: agg.top_domains ?? [],
        analysisText: analysis?.analysis_text ?? null,
      })

      const sent = await sendEmail(profile.email, subject, html)
      results.push({ userId, sent })
    }

    return new Response(
      JSON.stringify({ sent: results.filter(r => r.sent).length, total: results.length }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-email-report error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : '伺服器錯誤' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
