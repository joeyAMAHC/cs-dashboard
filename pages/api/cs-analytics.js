import { createClient } from '@supabase/supabase-js'

/**
 * Proxies analytics data from the local CS Agent server.
 * The CS Agent has rich ticket_issues data (AI-classified categories, products, couriers).
 *
 * GET /api/cs-analytics?range=30d
 * POST /api/cs-analytics  { question, range, history }  → AI Q&A
 */
export default async function handler(req, res) {
  // Auth check
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  const agentUrl = process.env.CS_AGENT_URL
  if (!agentUrl) return res.status(503).json({ error: 'CS_AGENT_URL not configured' })

  try {
    if (req.method === 'GET') {
      const range = req.query.range || '30d'
      const upstream = await fetch(`${agentUrl}/dashboard/api/analytics?range=${range}`, {
        headers: { 'ngrok-skip-browser-warning': '1' },
      })
      if (!upstream.ok) {
        const txt = await upstream.text()
        return res.status(502).json({ error: `CS Agent returned ${upstream.status}: ${txt.slice(0, 200)}` })
      }
      const data = await upstream.json()
      return res.status(200).json(data)

    } else if (req.method === 'POST') {
      const upstream = await fetch(`${agentUrl}/dashboard/api/analytics/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '1',
        },
        body: JSON.stringify(req.body),
      })
      if (!upstream.ok) {
        const txt = await upstream.text()
        return res.status(502).json({ error: `CS Agent returned ${upstream.status}: ${txt.slice(0, 200)}` })
      }
      const data = await upstream.json()
      return res.status(200).json(data)

    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (err) {
    console.error('[cs-analytics] Upstream error:', err.message)
    return res.status(503).json({ error: `Cannot reach CS Agent: ${err.message}` })
  }
}
