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
    .map(d => `  - ${d.domain} (${d.minutes} min, ${d.category === 'productive' ? 'Productive' : d.category === 'distraction' ? 'Breaks & Browsing' : 'Neutral'})`)
    .join('\n')

  return `You are a supportive, encouraging productivity advisor. Be specific and data-driven, but always frame feedback positively — never guilt-trip the user about distraction time.

IMPORTANT: If total browsing time is under 30 minutes, respond only with: "Not enough data for a meaningful analysis today. Try again tomorrow!" and do not provide any further analysis.

Based on the user's daily browsing summary below, provide specific and actionable insights.

Data Summary:
- Date: ${agg.date}
- Total online time: ${agg.totalMinutes} minutes
- Productive time: ${agg.productiveMinutes} minutes
- Breaks & browsing: ${agg.distractionMinutes} minutes
- Neutral browsing: ${agg.neutralMinutes} minutes
- Focus score: ${agg.focusScore}/100
- Top sites visited:
${domainList || '  (no data)'}

Please provide:
1. Overall assessment (encouraging and honest tone)
2. Behavioral patterns observed (cite specific data points)
3. 3 specific, actionable improvement suggestions
4. A motivational closing remark

Language: English
Length: 150–250 words
Format: Plain text, no Markdown formatting`
}

async function callGemini(prompt: string): Promise<string> {
  const MAX_OUTPUT_TOKENS = 1024
  console.log('[ai-analyze] Calling Gemini — maxOutputTokens:', MAX_OUTPUT_TOKENS)

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const candidate = data?.candidates?.[0]
  const finishReason = candidate?.finishReason ?? 'UNKNOWN'

  // Gemini can split a single response across multiple parts — join them all.
  // Taking only parts[0] silently discards the rest of the text.
  const parts: Array<{ text?: string }> = candidate?.content?.parts ?? []
  const text = parts.map(p => p.text ?? '').join('')

  console.log(
    '[ai-analyze] Gemini finishReason:', finishReason,
    '| parts count:', parts.length,
    '| total text length:', text.length,
  )

  if (finishReason === 'MAX_TOKENS') {
    console.warn('[ai-analyze] Response was cut by MAX_TOKENS — raise maxOutputTokens further if text is incomplete')
  }

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.slice(7)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as RequestBody

    // Privacy check — reject if raw URL/title fields sneak in
    const bodyStr = JSON.stringify(body)
    if (bodyStr.includes('"url"') || bodyStr.includes('"title"')) {
      return new Response(JSON.stringify({ error: 'Requests containing raw URLs or page titles are rejected' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { date, aggregate } = body
    if (!date || !aggregate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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
      JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
