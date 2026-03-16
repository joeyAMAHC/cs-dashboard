import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify Supabase session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'AI reporting is not configured. Please add ANTHROPIC_API_KEY to your environment variables.' })

  const { summary } = req.body
  if (!summary) return res.status(400).json({ error: 'No summary data provided' })

  const prompt = `You are a senior customer service analyst reviewing ticket data for an Australian e-commerce company that sells arcade machines, pool tables, pinball machines, and similar entertainment products.

Here is a structured summary of customer service tickets for the reporting period:

${JSON.stringify(summary, null, 2)}

Please provide a comprehensive weekly insights report with the following sections:

## Executive Summary
2-3 sentences giving an overview of the period — total volume, any major trends, and the headline takeaway.

## Top Recurring Issues
List the most frequent problems customers are experiencing, ranked by ticket count. For each issue include the count and what percentage of total tickets it represents.

## Trends & Changes vs Prior Period
What has gone up significantly? What has improved? Call out any anomalies or unexpected spikes that need attention.

## Root Cause Analysis
For the top 2-3 issues, analyse what is likely causing them (e.g. supplier quality, logistics partner performance, product design, ops process gaps).

## Recommendations for Operations
Specific, actionable steps the operations team can take to reduce ticket volume. Be concrete — not "improve quality" but "audit supplier X for component Y" or "send proactive shipping delay emails when courier tracking hasn't updated in 48h".

## Priority Actions This Week
List exactly 3 priority actions numbered 1-3 — the highest-impact things ops should tackle immediately.

Format your response using markdown. Be direct, specific, and focused on actionable insights. Use data from the summary to support your points.`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiRes.ok) {
      const errBody = await aiRes.text()
      console.error('Anthropic API error:', aiRes.status, errBody)
      return res.status(502).json({ error: `AI API error: ${aiRes.status}` })
    }

    const aiData = await aiRes.json()
    const text = aiData.content?.[0]?.text || ''
    return res.status(200).json({ report: text, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('AI report error:', err)
    return res.status(500).json({ error: 'Failed to generate AI report' })
  }
}
