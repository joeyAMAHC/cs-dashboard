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
  if (!apiKey) return res.status(500).json({ error: 'AI chat is not configured. Please add ANTHROPIC_API_KEY to your environment variables.' })

  const { messages, summary } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'No messages provided' })

  const summaryBlock = summary
    ? `You have access to the following structured summary of customer service ticket data for the current reporting period:\n\n${JSON.stringify(summary, null, 2)}\n\n`
    : 'No ticket data has been loaded yet — advise the user to run a report first.\n\n'

  const systemPrompt = `You are a sharp, practical customer service and operations analyst for an Australian e-commerce company selling entertainment products (arcade machines, pool tables, pinball machines, kegerators, bar fridges, LED bar signs). You have deep knowledge of this business's CS processes and common issues.

${summaryBlock}When answering questions:
- Be direct and concise — bullet points are fine for lists
- Back up observations with numbers from the data where possible
- Flag operational risks or patterns that deserve attention
- If asked for recommendations, be specific and actionable (not generic advice)
- If the data doesn't support a claim, say so honestly
- You can reference ticket counts, percentages, product breakdowns, and period comparisons from the summary above`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!aiRes.ok) {
      const errBody = await aiRes.text()
      console.error('Anthropic API error:', aiRes.status, errBody)
      let errDetail = ''
      try { errDetail = JSON.parse(errBody)?.error?.message || errBody } catch { errDetail = errBody }
      return res.status(502).json({ error: `AI API error ${aiRes.status}: ${errDetail.slice(0, 300)}` })
    }

    const aiData = await aiRes.json()
    const reply = aiData.content?.[0]?.text || ''
    return res.status(200).json({ reply })
  } catch (err) {
    console.error('AI chat error:', err)
    return res.status(500).json({ error: 'Failed to get AI response' })
  }
}
