import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { summary } = req.body
  if (!summary) return res.status(400).json({ error: 'No summary data provided' })

  const prompt = `You are a senior operations analyst preparing a report for the Operations Manager of an Australian e-commerce company that sells entertainment products — pool tables, arcade machines, pinball machines, kegerators, bar fridges, and LED bar signs.

Here is the structured data for the reporting period:

${JSON.stringify(summary, null, 2)}

Produce a concise, structured Operations Report. No fluff. Every sentence must be backed by a number from the data. Use the exact structure below — do not add or remove sections.

---

## Operations Report — ${summary.period?.label || 'Current Period'}

### Executive Summary
3–4 sentences maximum. Lead with total ticket volume and direction vs prior period. Name the single biggest issue category and its financial or volume impact. End with the headline action required.

---

### 1. Top Issues by Product Category
For each product category that had tickets, list:
- The category name and total ticket count
- The top 3 contact reasons with counts
- Average resolution time (hours) if available
- One-line operational note if something stands out

Sort by ticket volume, highest first. Skip categories with zero tickets.

---

### 2. What Is Taking the Most Time to Resolve
List the top categories ranked by average resolution time (slowest first). For each:
- Category, avg resolution hours, open ticket count
- One-line note on why this might be slow (e.g. waiting on supplier, complex damage assessment, courier investigations)

---

### 3. Courier Performance
Total courier-related tickets and breakdown by issue type (missing, delayed, damaged, wrong address).
If courier names are available, rank them by complaint volume.
Call out any courier that stands out as a repeat offender.
Specific recommendation: what action should ops take with the worst-performing courier?

---

### 4. Supplier Quality
Total supplier damage tickets and breakdown by damage type.
Which damage types are recurring (appeared more than once)?
Which product lines have the highest supplier damage rate?
Specific recommendation: what packaging, QC, or supplier audit action is needed?

---

### 5. Refunds & Financial Impact
- Total refund tickets and total refund value for the period
- Breakdown by product: which products are costing the most in refunds
- Replacement count vs refund count — is the team replacing too much or not enough?
- Specific recommendation: where could refund spend be reduced through ops changes?

---

### 6. Priority Actions This Week
Exactly 5 numbered actions. Each must be specific and immediately actionable — not "improve quality" but "contact [courier/supplier] about [specific issue] — X tickets in [period]". Include the data point that justifies each action.

---

Keep language direct and professional. An operations manager should be able to read this in 5 minutes and walk into a supplier or courier meeting with specific talking points.`

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
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiRes.ok) {
      const errBody = await aiRes.text()
      let errDetail = ''
      try { errDetail = JSON.parse(errBody)?.error?.message || errBody } catch { errDetail = errBody }
      return res.status(502).json({ error: `AI API error ${aiRes.status}: ${errDetail.slice(0, 300)}` })
    }

    const aiData = await aiRes.json()
    const report = aiData.content?.[0]?.text || ''
    return res.status(200).json({ report, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('Ops report error:', err)
    return res.status(500).json({ error: 'Failed to generate ops report' })
  }
}
