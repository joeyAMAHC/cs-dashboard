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

  const prompt = `You are writing a short, direct operations report for an operations manager at an Australian e-commerce company selling pool tables, arcade machines, pinball machines, kegerators, bar fridges, and LED bar signs.

The data below contains ONLY properly-tagged tickets — tickets missing a product or contact reason have already been excluded.

${JSON.stringify(summary, null, 2)}

Write a concise operations report using ONLY the structure below. No introductions, no preamble, no commentary outside the sections. Every number must come directly from the data. Skip any section or product where the count is zero.

---

## Ops Report — ${summary.period?.label || 'Current Period'}
**${summary.totalTaggedTickets} tagged tickets** · vs prior period: ${summary.totalAllTickets !== summary.totalTaggedTickets ? `${summary.totalAllTickets} total (${summary.totalTaggedTickets} with full tagging)` : summary.totalTaggedTickets}

---

### Issues by Product

For each product in byProduct (highest count first), write:

**[Product Name] — [count] tickets**
- List each contact reason and its count, one bullet per reason
- If damage types are available for this product, add a sub-list of damage types and counts
- No extra commentary

---

### Courier Issues

Only include if courierIssues.total > 0.
List each issue type and count. If courier names are available, rank them by complaint volume — one line per courier with their top issue.

---

### Supplier Damage

Only include if supplierDamage.total > 0.
List damage types and counts. Note which products are most affected.

---

### Refund Cost

- Total refund tickets and total dollar value
- List products with refund cost, highest first: Product — X tickets · $Y
- Replacements sent: [count]

---

### 3 Priority Actions

Number them 1–3. Each must name a specific product, supplier, or courier and cite a number. Format: **[Action]** — [data justification]. Nothing vague.

---`

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
        max_tokens: 2000,
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
