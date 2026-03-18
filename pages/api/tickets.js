import https from 'https'
import { createClient } from '@supabase/supabase-js'

function gorgiasRequest(path) {
  return new Promise((resolve, reject) => {
    const domain = process.env.GORGIAS_DOMAIN
    const email  = process.env.GORGIAS_EMAIL
    const token  = process.env.GORGIAS_TOKEN
    const auth   = Buffer.from(`${email}:${token}`).toString('base64')

    const options = {
      hostname: domain,
      path,
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch (e) { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

export default async function handler(req, res) {
  // Verify Supabase session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const cursor = req.query.cursor ? `&cursor=${encodeURIComponent(req.query.cursor)}` : ''
    const result = await gorgiasRequest(`/api/tickets?limit=100&order_by=created_datetime:desc${cursor}`)
    if (result.status !== 200) {
      console.error('Gorgias error:', result.status, JSON.stringify(result.body))
      const detail = result.body?.errors?.[0]?.message || result.body?.error?.message || result.body?.message || JSON.stringify(result.body)
      return res.status(result.status).json({ error: `Gorgias ${result.status}: ${detail}` })
    }
    res.status(result.status).json(result.body)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
