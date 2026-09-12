// EchoFocus — send-email-report Edge Function
// Sends the authenticated user their own daily HTML productivity report via Resend.
//
// SECURITY (Phase 0 hotfix):
// - Requires a valid user JWT (Authorization: Bearer <token>); verified server-side.
// - Sends ONLY to the verified email on the JWT (user.email) — never to any
//   user-writable column such as profiles.email.
// - Respects user_preferences.email_report_enabled unconditionally.
// - Every user-derived string interpolated into the email HTML is escaped.
//
// NOTE: A future scheduled/cron mode should authenticate with a dedicated
// CRON_SECRET header (compared in constant time) instead of a user JWT, and
// iterate opted-in users server-side. Deliberately NOT implemented yet.

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

const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

// Escape a user-derived string for safe interpolation into HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

interface TopDomainRow {
  domain: string
  seconds: number
  category: string
}

function buildEmail(params: {
  displayName: string | null
  date: string
  focusScore: number
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  topDomains: TopDomainRow[]
  analysisText: string | null
}): { subject: string; html: string } {
  const { displayName, date, focusScore, productiveSeconds, distractionSeconds,
    neutralSeconds, topDomains, analysisText } = params

  // All user-derived strings must go through escapeHtml before interpolation.
  const name = escapeHtml(displayName ?? '用戶')
  const score = Math.round(focusScore)
  const color = scoreColor(score)
  const formattedDate = escapeHtml(new Date(date + 'T00:00:00').toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  }))

  const domainRows = topDomains.slice(0, 5).map(d => `
    <tr>
      <td style="padding:6px 0;color:#94a3b8;font-size:13px;">${escapeHtml(d.domain)}</td>
      <td style="padding:6px 0;color:#64748b;font-size:12px;text-align:center;">
        ${d.category === 'productive' ? '🟢' : d.category === 'distraction' ? '🔴' : '⚪️'}
      </td>
      <td style="padding:6px 0;color:#cbd5e1;font-size:13px;text-align:right;">${formatMins(d.seconds)}</td>
    </tr>`).join('')

  const aiSection = analysisText ? `
    <div style="margin-top:24px;padding:16px;background:#1e293b;border-left:3px solid #22c55e;border-radius:4px;">
      <p style="margin:0 0 8px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">🤖 AI 洞察</p>
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">${escapeHtml(analysisText)}</p>
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

    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;">嗨 ${name}，以下是你的生產力報告 👋</p>

    <!-- Focus score -->
    <div style="text-align:center;padding:24px;background:#0f172a;border-radius:12px;margin-bottom:24px;">
      <div style="font-size:64px;font-weight:800;color:${color};line-height:1;">${score}</div>
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
      <p style="margin:0 0 12px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">主要網站</p>
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
    subject: `🎯 EchoFocus 每日報告 — 專注分數 ${score}`,
    html,
  }
}

// Always consume the response body before returning — leaving a Deno fetch
// body unconsumed can drop the worker before our own Response is sent.
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  const responseBody = await res.text()

  if (!res.ok) {
    // Do not log the recipient address alongside provider errors more than needed.
    console.error(`Resend error: ${res.status} ${responseBody}`)
    return false
  }

  return true
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight — must return 'ok' body, not null, for Supabase edge runtime
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // ── Authentication: require the caller's own user JWT ────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
    const token = authHeader.slice(7)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // getUser(token) fails for the anon key or any non-user token — that is intended.
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user || !user.email) {
      return jsonResponse({ error: 'Invalid credentials' }, 401)
    }

    // The report goes ONLY to the verified email on the JWT.
    const recipientEmail = user.email

    // ── Preference gate: email_report_enabled is respected unconditionally ───
    const { data: pref, error: prefError } = await supabase
      .from('user_preferences')
      .select('email_report_enabled')
      .eq('user_id', user.id)
      .maybeSingle()

    if (prefError) throw prefError

    if (!pref?.email_report_enabled) {
      return jsonResponse(
        { error: 'Email reports are disabled for this account. Enable them in Settings first.' },
        403,
      )
    }

    // ── Data selection: yesterday, or the most recent date within 2 days ─────
    const now = new Date()
    const cutoffDate = toISODate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000))

    const { data: agg, error: aggError } = await supabase
      .from('synced_aggregates')
      .select('date, productive_seconds, distraction_seconds, neutral_seconds, focus_score, top_domains')
      .eq('user_id', user.id)
      .gte('date', cutoffDate)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (aggError) throw aggError

    if (!agg) {
      return jsonResponse(
        { sent: false, message: 'No recent synced data (last 2 days) — sync from the extension first, then try again.' },
        200,
      )
    }

    // Fetch display name (display only — never used as a recipient address).
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()

    // Fetch the AI analysis matching the report date (optional).
    const { data: analysis } = await supabase
      .from('ai_analyses')
      .select('analysis_text')
      .eq('user_id', user.id)
      .eq('date', agg.date)
      .maybeSingle()

    const topDomains: TopDomainRow[] = Array.isArray(agg.top_domains)
      ? (agg.top_domains as TopDomainRow[]).filter(d =>
          typeof d?.domain === 'string' && typeof d?.seconds === 'number' && typeof d?.category === 'string')
      : []

    const { subject, html } = buildEmail({
      displayName: typeof profile?.display_name === 'string' ? profile.display_name : null,
      date: agg.date,
      focusScore: agg.focus_score,
      productiveSeconds: agg.productive_seconds,
      distractionSeconds: agg.distraction_seconds,
      neutralSeconds: agg.neutral_seconds,
      topDomains,
      analysisText: typeof analysis?.analysis_text === 'string' ? analysis.analysis_text : null,
    })

    const sent = await sendEmail(recipientEmail, subject, html)
    if (!sent) {
      return jsonResponse({ error: 'Email delivery failed. Please try again later.' }, 502)
    }

    return jsonResponse({ sent: true, date: agg.date }, 200)
  } catch (err) {
    console.error('send-email-report error:', err)
    return jsonResponse({ error: 'Server error' }, 500)
  }
})
