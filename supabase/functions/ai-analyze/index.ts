// EchoFocus — ai-analyze Edge Function
// Receives anonymized daily aggregate, calls Gemini API, saves result to ai_analyses.
// PRIVACY: This function never receives raw URLs or page titles — only domain names + durations.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TopDomain {
  domain: string
  minutes: number
  category: string
}

interface AggregatePayload {
  date: string
  totalMinutes: number
  productiveMinutes: number
  distractionMinutes: number
  neutralMinutes: number
  focusScore: number
  topDomains: TopDomain[]
}

interface RequestBody {
  date: string
  aggregate: AggregatePayload
}

function buildPrompt(agg: AggregatePayload): string {
  const domainList = agg.topDomains
    .slice(0, 8)
    .map(d => `  - ${d.domain}（${d.minutes} 分鐘，${d.category === 'productive' ? '生產力' : d.category === 'distraction' ? '分心' : '中性'}）`)
    .join('\n')

  return `你是一位專業的生產力教練。請根據以下用戶的每日活動摘要，提供具體可執行的洞察建議。

數據摘要：
- 日期：${agg.date}
- 總上網時間：${agg.totalMinutes} 分鐘
- 生產效率時間：${agg.productiveMinutes} 分鐘
- 分心時間：${agg.distractionMinutes} 分鐘
- 中性瀏覽：${agg.neutralMinutes} 分鐘
- 專注分數：${agg.focusScore}/100
- 主要瀏覽網站：
${domainList || '  （無資料）'}

請提供：
1. 整體評估（鼓勵且誠實的語氣）
2. 發現的行為模式（具體指出數據中的現象）
3. 3 個具體可執行的改善建議
4. 激勵性的結語

語言：繁體中文
字數：150-250 字
格式：純文字，不要使用 Markdown 標記`
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return text.trim()
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight — must return 'ok' body, not null, for Supabase edge runtime
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  try {
    // Verify user auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授權' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.slice(7)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '無效的認證' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as RequestBody

    // Privacy check — reject if raw URL/title fields sneak in
    const bodyStr = JSON.stringify(body)
    if (bodyStr.includes('"url"') || bodyStr.includes('"title"')) {
      return new Response(JSON.stringify({ error: '拒絕包含原始 URL 或標題的請求' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { date, aggregate } = body
    if (!date || !aggregate) {
      return new Response(JSON.stringify({ error: '缺少必要欄位' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Call Gemini
    const prompt = buildPrompt(aggregate)
    const analysisText = await callGemini(prompt)

    // Save to ai_analyses (upsert by user_id + date)
    const { error: upsertError } = await supabase.from('ai_analyses').upsert({
      user_id: user.id,
      date,
      aggregated_input: aggregate,
      analysis_text: analysisText,
      focus_score: aggregate.focusScore,
    }, { onConflict: 'user_id,date' })

    if (upsertError) {
      console.error('ai_analyses upsert error:', upsertError.message)
      // Don't fail the request — still return the analysis
    }

    return new Response(
      JSON.stringify({ analysis_text: analysisText, focus_score: aggregate.focusScore }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ai-analyze error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : '伺服器錯誤' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
