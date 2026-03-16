import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const initRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setUser(session.user)
        setChecking(false)
      }
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Authenticated fetch — attaches the Supabase token to every API call
  async function authFetch(url) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  if (checking) {
    return (
      <div style={{ background: '#0c0e15', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #252b3b', borderTopColor: '#4f8eff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>CS Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </Head>
      <DashboardApp user={user} onSignOut={handleSignOut} authFetch={authFetch} />
    </>
  )
}

// ── The full dashboard UI ────────────────────────────────────
function DashboardApp({ user, onSignOut, authFetch }) {
  useEffect(() => {
    window.__authFetch = authFetch
    // Remove any existing script first
    const existing = document.getElementById('__dashboard_logic')
    if (existing) existing.remove()
    const script = document.createElement('script')
    script.id = '__dashboard_logic'
    script.appendChild(document.createTextNode(DASHBOARD_LOGIC + '\nwindow.__runReport = runReport;\nwindow.__showSection = showSection;\nwindow.toggleBlock = toggleBlock;'))
    document.body.appendChild(script)
    return () => {
      delete window.__authFetch
      delete window.__runReport
      delete window.__showSection
      delete window.toggleBlock
      const el = document.getElementById('__dashboard_logic')
      if (el) el.remove()
    }
  }, [])

  return (
    <>
      <style>{DASHBOARD_CSS}</style>
      <div id="app">
        <header id="topbar">
          <div className="logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            CS Dashboard
          </div>
          <div className="topbar-sep" />
          <div id="error-banner" className="error-banner" />
          <select id="period-select" defaultValue="30">
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <span id="comp-label" style={{ fontSize: '.75rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }} />
          <button className="btn btn-primary" id="run-btn" onClick={() => window.__runReport()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Run Report
          </button>
          <div className="user-pill">
            <span>{user?.email}</span>
            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '.8rem' }} onClick={onSignOut}>Sign out</button>
          </div>
        </header>

        <nav id="sidebar">
          <div className="nav-section-label">Reports</div>
          {[
            { id: 'overview',    icon: '◈',  label: 'Overview' },
            { id: 'pool',        icon: '🎱', label: 'Pool Tables' },
            { id: 'arcade',      icon: '🕹',  label: 'Gao Arcades' },
            { id: 'pinball',     icon: '🎰', label: 'Kelvin Pinball' },
            { id: 'courier',     icon: '🚚', label: 'Courier Issues' },
            { id: 'ops',         icon: '⚙️', label: 'Ops Issues' },
            { id: 'refunds',     icon: '💰', label: 'Refunds & Replacements' },
          ].map(({ id, icon, label }) => (
            <div key={id} className={`nav-item${id === 'overview' ? ' active' : ''}`} data-section={id} onClick={() => window.__showSection(id)}>
              <span className="nav-icon">{icon}</span> {label}
              <span className="nav-badge" id={`badge-${id}`}>—</span>
            </div>
          ))}
          <div className="nav-section-label" style={{ marginTop: 12 }}>Analysis</div>
          <div className="nav-item" data-section="comparison" onClick={() => window.__showSection('comparison')}>
            <span className="nav-icon">📅</span> MoM Comparison
          </div>
          <div className="sidebar-footer">
            <div id="last-run-time" style={{ fontSize: '.72rem', color: 'var(--text-3)', padding: '0 10px' }} />
          </div>
        </nav>

        <main id="main">
          <div id="section-overview" className="section-view active">
            <div id="welcome">
              <div className="welcome-logo">📊</div>
              <div className="welcome-title">Gorgias CS Dashboard</div>
              <div className="welcome-sub">Pull your customer service data from Gorgias and get instant reporting across all product lines, courier issues, ops faults, and refunds.</div>
              <button className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '.95rem' }} onClick={() => window.__runReport()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Run Report
              </button>
            </div>
            <div id="overview-content" style={{ display: 'none' }} />
          </div>

          {['pool','arcade','pinball','courier','ops','refunds'].map(id => (
            <div key={id} id={`section-${id}`} className="section-view">
              <div id={`${id}-content`}>
                <div className="empty-state">
                  <div className="empty-state-msg">Run the report to load data</div>
                </div>
              </div>
            </div>
          ))}

          <div id="section-comparison" className="section-view">
            <ComparisonSection authFetch={authFetch} />
          </div>
        </main>
      </div>

      <div id="loading-overlay">
        <div className="loading-box">
          <div className="loading-title">
            <div className="spin" />
            Fetching Gorgias Data…
          </div>
          <div className="loading-progress"><div className="loading-progress-bar" id="loading-bar" /></div>
          <div id="loading-log" />
        </div>
      </div>
    </>
  )
}

// ── Comparison Section ───────────────────────────────────────
const OPS_REASONS_C    = ['Item Missing::Picking Issue::Ops Mistake','WISMO::Tracking Not Supplied','WISMO::Item Delayed::Ops Delay','WISMO::Wrong Address::Ops Fault','Wrong Item Delivered::Ops Misorder']
const COURIER_REASONS_C = ['Item Missing::Courier Fault','WISMO::Item Delayed::Courier Fault','WISMO::Wrong Address::Customer Fault','Item Damaged::Courier Fault']
const REFUND_VALUES_C   = ['refund','partial refund']
const FIELD_NAMES_C     = { PRODUCT:'product', REASON:'contact reason', RESOLUTION:'resolution', REFUND_VALUE:'refund value' }

function fmt(d) { return d.toISOString().split('T')[0] }
const now = new Date()

function ComparisonSection({ authFetch }) {
  const [pA, setPA] = useState({ start: fmt(new Date(now.getFullYear(), now.getMonth()-1, 1)), end: fmt(new Date(now.getFullYear(), now.getMonth(), 0)), label: 'Period A' })
  const [pB, setPB] = useState({ start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(now), label: 'Period B' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toggles, setToggles] = useState({ total: true, status: true, products: true, ops: true, courier: true, refunds: true, resolution: true })

  function getField(t, id) {
    if (!id) return 'Not Set'
    const e = t.custom_fields?.[String(id)]
    return e?.value != null ? String(e.value) : 'Not Set'
  }
  function sc(tickets) {
    const c = { open:0, closed:0, pending:0 }
    tickets.forEach(t => { const s=(t.status||'').toLowerCase(); if(c[s]!==undefined) c[s]++; else c.open++ })
    return c
  }
  function avgRes(tickets) {
    const cl = tickets.filter(t => t.status==='closed' && t.created_datetime && t.closed_datetime)
    if (!cl.length) return null
    return (cl.reduce((s,t) => s+(new Date(t.closed_datetime)-new Date(t.created_datetime))/3600000, 0) / cl.length).toFixed(1)
  }
  function grp(tickets, fn) {
    return tickets.reduce((a,t) => { const k=fn(t)||'Not Set'; if(!a[k])a[k]=[]; a[k].push(t); return a }, {})
  }
  function sumMoney(tickets, fid) {
    return tickets.reduce((s,t) => { const n=parseFloat(String(getField(t,fid)).replace(/[^0-9.]/g,'')); return s+(isNaN(n)?0:n) }, 0)
  }

  function delta(a, b) {
    if (a===0 && b===0) return { d:0, pct:'0%', dir:'neutral' }
    if (a===0) return { d:b, pct:'—', dir:'up' }
    const d=b-a, p=((d/a)*100).toFixed(1)
    return { d, pct:(d>0?'+':'')+p+'%', dir:d>0?'up':d<0?'down':'neutral' }
  }

  function DeltaChip({ a, b, goodWhenDown = true }) {
    const { pct, dir } = delta(a, b)
    const isGood = (goodWhenDown && dir==='down') || (!goodWhenDown && dir==='up')
    const isBad  = (goodWhenDown && dir==='up')   || (!goodWhenDown && dir==='down')
    const color  = isGood ? '#3dd68c' : isBad ? '#ff5655' : '#7d8aaa'
    const bg     = isGood ? 'rgba(61,214,140,.12)' : isBad ? 'rgba(255,86,85,.12)' : 'rgba(255,255,255,.05)'
    const arrow  = dir==='up' ? '↑' : dir==='down' ? '↓' : '→'
    return <span style={{ fontFamily:'var(--font-data)', fontSize:'.75rem', color, background:bg, padding:'2px 8px', borderRadius:4, fontWeight:600 }}>{arrow} {pct}</span>
  }

  function CompBlock({ title, children, id }) {
    return (
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, marginBottom:16, overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.95rem' }}>{title}</div>
          <button onClick={() => setToggles(p=>({...p,[id]:false}))} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:'.75rem', fontFamily:'var(--font-body)' }}>hide</button>
        </div>
        <div style={{ padding:'16px 18px' }}>{children}</div>
      </div>
    )
  }

  function CompRow({ label, vA, vB, goodWhenDown=true, isMoney=false, suffix='' }) {
    const numA = parseFloat(vA) || 0, numB = parseFloat(vB) || 0
    const fmt2 = v => isMoney ? '$'+parseFloat(v).toFixed(2) : v+suffix
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 120px 100px', gap:8, padding:'8px 0', borderBottom:'1px solid var(--border-soft)', alignItems:'center', fontSize:'.84rem' }}>
        <div style={{ color:'var(--text-1)' }}>{label}</div>
        <div style={{ fontFamily:'var(--font-data)', color:'var(--blue)', textAlign:'right' }}>{fmt2(vA)}</div>
        <div style={{ fontFamily:'var(--font-data)', color:'var(--amber)', textAlign:'right' }}>{fmt2(vB)}</div>
        <div style={{ textAlign:'right' }}><DeltaChip a={numA} b={numB} goodWhenDown={goodWhenDown} /></div>
      </div>
    )
  }

  async function fetchTickets(days) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days)
    const all=[]; let cursor=null, done=false
    while (!done) {
      const url = cursor ? `/api/tickets?cursor=${encodeURIComponent(cursor)}` : '/api/tickets'
      const j = await authFetch(url)
      const pt = j.data||[]; let hit=false
      for (const t of pt) { if(new Date(t.created_datetime)>=cutoff) all.push(t); else { hit=true; break } }
      if (hit||!j.meta?.next_cursor) done=true; else cursor=j.meta.next_cursor
    }
    return all
  }

  async function compare() {
    if (!pA.start||!pA.end||!pB.start||!pB.end) { setError('Please fill in all four dates'); return }
    setLoading(true); setError('')
    try {
      const cfJson = await authFetch('/api/custom-fields')
      const fm = {}; (cfJson.data||[]).forEach(f => { if(f.label) fm[f.label.toLowerCase()]=f.id })
      const earliest = new Date(Math.min(new Date(pA.start), new Date(pB.start)))
      const days = Math.ceil((new Date()-earliest)/(1000*60*60*24))+2
      const all = await fetchTickets(days)
      const inRange = (t, s, e) => { const d=new Date(t.created_datetime); return d>=new Date(s) && d<=new Date(e+'T23:59:59') }
      setResult({ ticketsA: all.filter(t=>inRange(t,pA.start,pA.end)), ticketsB: all.filter(t=>inRange(t,pB.start,pB.end)), fm })
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const inputStyle = { background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--text-1)', borderRadius:6, padding:'7px 10px', fontFamily:'var(--font-body)', fontSize:'.85rem', outline:'none' }
  const colHeader = (label, color) => <div style={{ fontFamily:'var(--font-data)', fontSize:'.72rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color, textAlign:'right', padding:'0 0 8px' }}>{label}</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ color:'var(--cyan)' }}>📅 Month over Month</div>
          <div className="page-subtitle">Compare any two date ranges across all metrics</div>
        </div>
      </div>

      {/* Date pickers */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'20px 24px', marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:20, alignItems:'flex-end' }}>
          {[{p:pA, set:setPA, color:'var(--blue)', label:'Period A (baseline)'},{p:pB, set:setPB, color:'var(--amber)', label:'Period B (comparison)'}].map(({p, set, color, label}) => (
            <div key={label}>
              <div style={{ fontSize:'.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color, marginBottom:8 }}>{label}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="text" placeholder="Label" value={p.label} onChange={e=>set(prev=>({...prev,label:e.target.value}))} style={{...inputStyle, width:100}} />
                <input type="date" value={p.start} onChange={e=>set(prev=>({...prev,start:e.target.value}))} style={inputStyle} />
                <span style={{color:'var(--text-3)'}}>→</span>
                <input type="date" value={p.end} onChange={e=>set(prev=>({...prev,end:e.target.value}))} style={inputStyle} />
              </div>
            </div>
          ))}
          <button className="btn btn-primary" onClick={compare} disabled={loading} style={{ height:36, whiteSpace:'nowrap' }}>
            {loading ? <><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}} /> Fetching…</> : '▶ Compare'}
          </button>
        </div>
        {error && <div style={{ marginTop:12, color:'var(--red)', fontSize:'.85rem' }}>{error}</div>}
      </div>

      {/* Toggles */}
      {result && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          {[['total','Total Tickets'],['status','Status'],['products','By Product'],['ops','Ops Issues'],['courier','Courier Issues'],['refunds','Refunds'],['resolution','Resolution Time']].map(([key, label]) => (
            <button key={key} onClick={() => setToggles(p=>({...p,[key]:!p[key]}))} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${toggles[key]?'rgba(79,142,255,.4)':'var(--border)'}`, background: toggles[key]?'var(--blue-soft)':'transparent', color: toggles[key]?'var(--blue)':'var(--text-3)', fontSize:'.8rem', fontFamily:'var(--font-body)', cursor:'pointer', fontWeight: toggles[key]?600:400 }}>
              {toggles[key] ? '✓ ' : ''}{label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {result && (() => {
        const { ticketsA: tA, ticketsB: tB, fm } = result
        const pid=fm[FIELD_NAMES_C.PRODUCT], rid=fm[FIELD_NAMES_C.REASON], resfid=fm[FIELD_NAMES_C.RESOLUTION], rvfid=fm[FIELD_NAMES_C.REFUND_VALUE]
        const scA=sc(tA), scB=sc(tB)
        const avgA=avgRes(tA), avgB=avgRes(tB)
        const refA=tA.filter(t=>REFUND_VALUES_C.includes(getField(t,resfid).toLowerCase()))
        const refB=tB.filter(t=>REFUND_VALUES_C.includes(getField(t,resfid).toLowerCase()))
        const opsA=tA.filter(t=>OPS_REASONS_C.some(r=>getField(t,rid).toLowerCase()===r.toLowerCase()))
        const opsB=tB.filter(t=>OPS_REASONS_C.some(r=>getField(t,rid).toLowerCase()===r.toLowerCase()))
        const courA=tA.filter(t=>COURIER_REASONS_C.some(r=>getField(t,rid).toLowerCase()===r.toLowerCase()))
        const courB=tB.filter(t=>COURIER_REASONS_C.some(r=>getField(t,rid).toLowerCase()===r.toLowerCase()))

        const headerRow = (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 120px 100px', gap:8, paddingBottom:8, borderBottom:'1px solid var(--border)', marginBottom:4 }}>
            <div />
            {colHeader(pA.label, 'var(--blue)')}
            {colHeader(pB.label, 'var(--amber)')}
            {colHeader('Change', 'var(--text-3)')}
          </div>
        )

        return (
          <div>
            {/* Summary stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                { label:'Total Tickets', a:tA.length, b:tB.length },
                { label:'Ops Issues',    a:opsA.length, b:opsB.length },
                { label:'Courier Issues',a:courA.length, b:courB.length },
                { label:'Refunds',       a:refA.length, b:refB.length },
              ].map(({ label, a, b }) => {
                const { pct, dir } = delta(a, b)
                const color = dir==='up'?'#ff5655':dir==='down'?'#3dd68c':'#7d8aaa'
                return (
                  <div key={label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'16px 18px' }}>
                    <div style={{ fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-2)', marginBottom:8 }}>{label}</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
                      <span style={{ fontFamily:'var(--font-data)', fontSize:'1.5rem', color:'var(--blue)' }}>{a}</span>
                      <span style={{ fontFamily:'var(--font-data)', fontSize:'.85rem', color:'var(--text-3)' }}>→</span>
                      <span style={{ fontFamily:'var(--font-data)', fontSize:'1.5rem', color:'var(--amber)' }}>{b}</span>
                    </div>
                    <div style={{ marginTop:6 }}><span style={{ fontFamily:'var(--font-data)', fontSize:'.78rem', color, background:color==='#7d8aaa'?'rgba(255,255,255,.05)':color.replace('#ff5655','rgba(255,86,85,.12)').replace('#3dd68c','rgba(61,214,140,.12)'), padding:'2px 8px', borderRadius:4 }}>{dir==='up'?'↑':dir==='down'?'↓':'→'} {pct}</span></div>
                  </div>
                )
              })}
            </div>

            {toggles.total && (
              <CompBlock title="Total Tickets" id="total">
                {headerRow}
                <CompRow label="All Tickets" vA={tA.length} vB={tB.length} goodWhenDown={false} />
              </CompBlock>
            )}

            {toggles.status && (
              <CompBlock title="Status Breakdown" id="status">
                {headerRow}
                <CompRow label="Open"    vA={scA.open}    vB={scB.open}    goodWhenDown={true} />
                <CompRow label="Closed"  vA={scA.closed}  vB={scB.closed}  goodWhenDown={false} />
                <CompRow label="Pending" vA={scA.pending} vB={scB.pending} goodWhenDown={true} />
              </CompBlock>
            )}

            {toggles.resolution && (
              <CompBlock title="Avg Resolution Time" id="resolution">
                {headerRow}
                <CompRow label="Avg hours to close" vA={avgA||0} vB={avgB||0} goodWhenDown={true} suffix="h" />
              </CompBlock>
            )}

            {toggles.products && (
              <CompBlock title="Tickets by Product" id="products">
                {headerRow}
                {(() => {
                  const allProds = [...new Set([...Object.keys(grp(tA,t=>getField(t,pid))), ...Object.keys(grp(tB,t=>getField(t,pid)))])]
                  const gA=grp(tA,t=>getField(t,pid)), gB=grp(tB,t=>getField(t,pid))
                  return allProds.sort((a,b)=>(gB[b]?.length||0)-(gA[a]?.length||0)).map(prod => (
                    <CompRow key={prod} label={prod} vA={gA[prod]?.length||0} vB={gB[prod]?.length||0} goodWhenDown={true} />
                  ))
                })()}
              </CompBlock>
            )}

            {toggles.ops && (
              <CompBlock title="Ops Issues" id="ops">
                {headerRow}
                <CompRow label="Total Ops" vA={opsA.length} vB={opsB.length} goodWhenDown={true} />
                <div style={{ height:8 }} />
                {OPS_REASONS_C.map(reason => {
                  const a=tA.filter(t=>getField(t,rid).toLowerCase()===reason.toLowerCase()).length
                  const b=tB.filter(t=>getField(t,rid).toLowerCase()===reason.toLowerCase()).length
                  const short = reason.split('::').pop()
                  return <CompRow key={reason} label={short} vA={a} vB={b} goodWhenDown={true} />
                })}
              </CompBlock>
            )}

            {toggles.courier && (
              <CompBlock title="Courier Issues" id="courier">
                {headerRow}
                <CompRow label="Total Courier" vA={courA.length} vB={courB.length} goodWhenDown={true} />
                <div style={{ height:8 }} />
                {COURIER_REASONS_C.map(reason => {
                  const a=tA.filter(t=>getField(t,rid).toLowerCase()===reason.toLowerCase()).length
                  const b=tB.filter(t=>getField(t,rid).toLowerCase()===reason.toLowerCase()).length
                  const short = reason.split('::').pop()
                  return <CompRow key={reason} label={short} vA={a} vB={b} goodWhenDown={true} />
                })}
              </CompBlock>
            )}

            {toggles.refunds && (
              <CompBlock title="Refunds" id="refunds">
                {headerRow}
                <CompRow label="Refund Count"      vA={refA.length}               vB={refB.length}               goodWhenDown={true} />
                <CompRow label="Total Refund Value" vA={sumMoney(refA,rvfid).toFixed(2)} vB={sumMoney(refB,rvfid).toFixed(2)} goodWhenDown={true} isMoney />
              </CompBlock>
            )}
          </div>
        )
      })()}

      {!result && !loading && (
        <div className="empty-state" style={{ minHeight:300 }}>
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-msg">Set your two date ranges above and click Compare</div>
        </div>
      )}
    </div>
  )
}

const DASHBOARD_CSS = `
:root {
  --bg:#111827;--bg-canvas:#1a2236;--bg-card:#0d1117;--bg-elevated:#1e2640;--bg-hover:#243052;
  --border:#2a3350;--border-soft:#1e2840;--text-1:#eaf0ff;--text-2:#7d8aaa;--text-3:#404d69;
  --blue:#4f8eff;--blue-soft:rgba(79,142,255,.13);--green:#3dd68c;--green-soft:rgba(61,214,140,.13);
  --amber:#f5a428;--amber-soft:rgba(245,164,40,.13);--red:#ff5655;--red-soft:rgba(255,86,85,.13);
  --purple:#a78bfa;--purple-soft:rgba(167,139,250,.13);--cyan:#22d3ee;--cyan-soft:rgba(34,211,238,.13);
  --sidebar-w:230px;--topbar-h:56px;--radius:8px;
  --font-data:'JetBrains Mono',monospace;--font-head:'Syne',sans-serif;--font-body:'DM Sans',sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:15px}
body{background:var(--bg-canvas);color:var(--text-1);font-family:var(--font-body);line-height:1.5;overflow:hidden;height:100vh}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
#app{display:grid;grid-template-columns:var(--sidebar-w) 1fr;grid-template-rows:var(--topbar-h) 1fr;height:100vh}
#topbar{grid-column:1/3;grid-row:1;display:flex;align-items:center;gap:12px;padding:0 20px 0 24px;background:var(--bg-card);border-bottom:1px solid var(--border);z-index:20;box-shadow:0 1px 0 rgba(0,0,0,.4)}
.logo{font-family:var(--font-head);font-size:1.05rem;font-weight:800;letter-spacing:-.5px;color:var(--text-1);margin-right:4px;display:flex;align-items:center;gap:8px}
.logo svg{color:var(--blue)}.topbar-sep{flex:1}
.user-pill{display:flex;align-items:center;gap:8px;font-size:.82rem;color:var(--text-2);padding:4px 12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px}
#period-select{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-1);border-radius:var(--radius);padding:6px 10px;font-family:var(--font-body);font-size:.85rem;cursor:pointer;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d8aaa' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:26px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--radius);font-family:var(--font-body);font-size:.85rem;font-weight:500;cursor:pointer;border:none;transition:opacity .15s,transform .1s}
.btn:active{transform:scale(.97)}.btn-primary{background:var(--blue);color:#fff}.btn-primary:hover{opacity:.85}.btn-primary:disabled{opacity:.45;cursor:not-allowed}
.btn-ghost{background:transparent;color:var(--text-2);border:1px solid var(--border)}.btn-ghost:hover{background:var(--bg-elevated);color:var(--text-1)}
#sidebar{grid-column:1;grid-row:2;background:var(--bg-card);border-right:1px solid var(--border);padding:12px 10px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;box-shadow:1px 0 0 rgba(0,0,0,.3)}
.nav-section-label{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);padding:8px 10px 4px;margin-top:6px}
.nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:6px;cursor:pointer;color:var(--text-2);font-size:.87rem;font-weight:500;transition:background .12s,color .12s;user-select:none}
.nav-item:hover{background:var(--bg-elevated);color:var(--text-1)}.nav-item.active{background:var(--blue-soft);color:var(--blue)}
.nav-icon{font-size:1rem;flex-shrink:0;width:18px;text-align:center}
.nav-badge{margin-left:auto;font-family:var(--font-data);font-size:.7rem;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-2);padding:1px 6px;border-radius:10px;display:none}
.nav-item.active .nav-badge{display:block;border-color:var(--blue);color:var(--blue);background:var(--blue-soft)}
.sidebar-footer{margin-top:auto;padding-top:12px;border-top:1px solid var(--border)}
#main{grid-column:2;grid-row:2;overflow-y:auto;padding:28px 32px;background:var(--bg-canvas)}
.section-view{display:none}.section-view.active{display:block}
.page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
.page-title{font-family:var(--font-head);font-size:1.6rem;font-weight:800;letter-spacing:-.5px}
.page-subtitle{color:var(--text-2);font-size:.88rem;margin-top:3px}
.period-badge{font-family:var(--font-data);font-size:.75rem;background:var(--blue-soft);color:var(--blue);border:1px solid rgba(79,142,255,.25);padding:4px 10px;border-radius:20px;white-space:nowrap}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px}
.stat-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.stat-card.blue::before{background:var(--blue)}.stat-card.green::before{background:var(--green)}.stat-card.amber::before{background:var(--amber)}.stat-card.red::before{background:var(--red)}.stat-card.purple::before{background:var(--purple)}.stat-card.cyan::before{background:var(--cyan)}
.stat-label{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-2);margin-bottom:8px}
.stat-value{font-family:var(--font-data);font-size:1.9rem;font-weight:600;line-height:1;color:var(--text-1)}
.stat-value.blue{color:var(--blue)}.stat-value.green{color:var(--green)}.stat-value.amber{color:var(--amber)}.stat-value.red{color:var(--red)}.stat-value.purple{color:var(--purple)}.stat-value.cyan{color:var(--cyan)}
.stat-sub{font-size:.78rem;color:var(--text-2);margin-top:5px}
.section-block{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.3)}
.section-block-header{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-bottom:1px solid var(--border);cursor:pointer;user-select:none;transition:background .12s}
.section-block-header:hover{background:var(--bg-elevated)}
.section-block-header.collapsed{border-bottom:none}
.section-block-title{font-family:var(--font-head);font-size:1rem;font-weight:700;display:flex;align-items:center;gap:10px}
.section-block-title .color-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.section-block-subtitle{font-size:.78rem;color:var(--text-2);margin-top:2px}
.section-block-body{padding:16px 18px}
.section-block-body.collapsed{display:none}
.collapse-chevron{color:var(--text-3);font-size:.75rem;transition:transform .2s;flex-shrink:0;margin-left:8px}
.collapse-chevron.open{transform:rotate(180deg)}
/* Summary bar */
.summary-bar{display:flex;align-items:center;gap:0;background:var(--bg-elevated);border-radius:6px;margin-bottom:16px;overflow:hidden;border:1px solid var(--border)}
.summary-bar-item{flex:1;padding:10px 14px;border-right:1px solid var(--border);text-align:center}
.summary-bar-item:last-child{border-right:none}
.summary-bar-val{font-family:var(--font-data);font-size:1.1rem;font-weight:700;color:var(--text-1);display:flex;align-items:center;justify-content:center;gap:4px}
.summary-bar-lbl{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-3);margin-top:2px}
.data-table-wrap{overflow-x:auto}
table.data-table{width:100%;border-collapse:collapse;font-size:.84rem}
table.data-table th{text-align:left;padding:8px 12px;background:var(--bg-elevated);color:var(--text-2);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);white-space:nowrap}
table.data-table th:not(:first-child){text-align:right}
table.data-table td{padding:9px 12px;border-bottom:1px solid var(--border-soft);color:var(--text-1);vertical-align:middle}
table.data-table td:not(:first-child){text-align:right;font-family:var(--font-data);font-size:.82rem}
table.data-table tr:last-child td{border-bottom:none}table.data-table tr:hover td{background:var(--bg-hover)}
table.data-table .total-row td{font-weight:700;color:var(--blue);background:var(--blue-soft);border-top:1px solid rgba(79,142,255,.2)}
.tag{display:inline-block;font-size:.7rem;font-weight:600;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em}
.tag-open{background:var(--amber-soft);color:var(--amber)}.tag-closed{background:var(--green-soft);color:var(--green)}.tag-pending{background:var(--purple-soft);color:var(--purple)}
.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.bar-row-label{width:180px;font-size:.82rem;color:var(--text-1);flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{flex:1;background:var(--bg-elevated);border-radius:3px;height:8px;overflow:hidden}
.bar-fill{height:100%;border-radius:3px;transition:width .6s cubic-bezier(.4,0,.2,1)}
.bar-row-val{font-family:var(--font-data);font-size:.8rem;color:var(--text-2);min-width:60px;text-align:right;flex-shrink:0}
.inline-stats{display:flex;gap:20px;padding:12px 0 16px;flex-wrap:wrap}
.inline-stat{display:flex;flex-direction:column;gap:2px}
.inline-stat-val{font-family:var(--font-data);font-size:1.35rem;font-weight:600;color:var(--text-1)}
.inline-stat-lbl{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-2)}
#loading-overlay{position:fixed;inset:0;background:rgba(10,12,18,.92);z-index:100;display:none;align-items:center;justify-content:center;flex-direction:column;gap:20px}
#loading-overlay.visible{display:flex}
.loading-box{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:30px 36px;min-width:380px;max-width:480px}
.loading-title{font-family:var(--font-head);font-size:1.1rem;font-weight:800;margin-bottom:18px;display:flex;align-items:center;gap:10px}
.spin{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-progress{background:var(--bg-elevated);border-radius:4px;height:4px;margin-bottom:16px;overflow:hidden}
.loading-progress-bar{height:100%;background:var(--blue);border-radius:4px;transition:width .3s;width:0%}
#loading-log{font-family:var(--font-data);font-size:.75rem;color:var(--text-2);max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:3px}
#loading-log .log-line{color:var(--text-3)}.log-line.current{color:var(--text-2)}.log-line.done{color:var(--green)}.log-line.err{color:var(--red)}
.empty-state{padding:40px 20px;text-align:center;color:var(--text-3)}
.empty-state-msg{font-size:.9rem}
#welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;gap:16px}
.welcome-logo{font-size:3rem;margin-bottom:8px}
.welcome-title{font-family:var(--font-head);font-size:2rem;font-weight:800}
.welcome-sub{color:var(--text-2);max-width:380px;line-height:1.6}
.error-banner{background:var(--red-soft);border:1px solid rgba(255,86,85,.3);color:var(--red);border-radius:var(--radius);padding:12px 16px;font-size:.88rem;display:none}
.error-banner.visible{display:block}
.blocks-2col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.val-chip{font-family:var(--font-data);font-size:.78rem;background:var(--green-soft);color:var(--green);padding:2px 7px;border-radius:4px}
.delta-chip{font-family:var(--font-data);font-size:.72rem;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;margin-left:4px}
.delta-good{background:var(--green-soft);color:var(--green)}
.delta-bad{background:var(--red-soft);color:var(--red)}
.delta-neutral{background:rgba(255,255,255,.06);color:var(--text-3)}
.inline-stat-prev{font-family:var(--font-data);font-size:.72rem;color:var(--text-3);margin-top:2px}
.ticket-list-wrap{max-height:420px;overflow-y:auto}
table.ticket-table{font-size:.8rem}
table.ticket-table td:first-child{font-family:var(--font-data);font-size:.75rem;color:var(--blue)}
.accent-blue{color:var(--blue)}.accent-green{color:var(--green)}.accent-amber{color:var(--amber)}.accent-red{color:var(--red)}.accent-purple{color:var(--purple)}
.dot-blue{background:var(--blue)}.dot-green{background:var(--green)}.dot-amber{background:var(--amber)}.dot-red{background:var(--red)}.dot-purple{background:var(--purple)}.dot-cyan{background:var(--cyan)}
`

const DASHBOARD_LOGIC = `
const FIELD_NAMES={PRODUCT:'Product',REASON:'Contact Reason',DAMAGE:'Pool Table Damage',ARCADE_ISSUE:'Arcade Machine Issue/Damage',PINBALL_ISSUE:'Pinball Issue',BROKEN_GAMES:'Broken Games',COURIER:'Courier',RESOLUTION:'Resolution',REFUND_VALUE:'Refund Value',ORDER_NUMBER:'Shopify/Warehouse Number'};
const POOL_PRODUCT='CSLT Pool Tables';
const REASON_SUPPLIER='Item Damaged::Supplier Issue';
const REASON_COURIER_POOL='Item Damaged::Courier Fault';
const ARCADE_PRODUCTS=['Upright Arcade','Cocktail Pro','Cocktail MKII'];
const ARCADE_REASON='Item Not Working';
const KELVIN_PRODUCTS=['Pinball Machine','Gearshift Pro'];
const KELVIN_REASONS=['Item Not Working','Item Damaged::Supplier Issue'];
const COURIER_REASONS=['Item Missing::Courier Fault','WISMO::Item Delayed::Courier Fault','WISMO::Wrong Address::Customer Fault','Item Damaged::Courier Fault'];
const OPS_REASONS=['Item Missing::Picking Issue::Ops Mistake','WISMO::Tracking Not Supplied','WISMO::Item Delayed::Ops Delay','WISMO::Wrong Address::Ops Fault','Wrong Item Delivered::Ops Misorder'];
const REFUND_VALUES=['Refund','Partial Refund'];
const REPLACEMENT_VALUES=['Free Product Upgrade','Free Gift','Replacement Sent'];

// ── Collapsible blocks ───────────────────────────────────────
const collapseState={};
function toggleBlock(id){
  const body=document.getElementById('block-body-'+id);
  const hdr=document.getElementById('block-hdr-'+id);
  const chev=document.getElementById('block-chev-'+id);
  if(!body)return;
  const isCollapsed=body.classList.toggle('collapsed');
  if(hdr)hdr.classList.toggle('collapsed',isCollapsed);
  if(chev)chev.classList.toggle('open',!isCollapsed);
  collapseState[id]=isCollapsed;
}
// Wrap a block with collapsible header — call after rendering
function makeCollapsible(id){
  const body=document.getElementById('block-body-'+id);
  const hdr=document.getElementById('block-hdr-'+id);
  const chev=document.getElementById('block-chev-'+id);
  if(!body||!hdr)return;
  if(collapseState[id]){body.classList.add('collapsed');hdr.classList.add('collapsed');if(chev)chev.classList.remove('open');}
  else{body.classList.remove('collapsed');hdr.classList.remove('collapsed');if(chev)chev.classList.add('open');}
}

// ── Section block HTML builder ───────────────────────────────
let _blockId=0;
function sectionBlock({title,subtitle,dot,headerBg,borderColor,bodyHtml,summaryItems}){
  const id='blk'+(++_blockId);
  const dotHtml=dot?'<span class="color-dot '+dot+'"></span>':'';
  const sumBar=summaryItems&&summaryItems.length?
    '<div class="summary-bar">'+summaryItems.map(({val,label,color})=>
      '<div class="summary-bar-item"><div class="summary-bar-val"'+(color?' style="color:'+color+'"':'')+'>'+(val||'—')+'</div><div class="summary-bar-lbl">'+label+'</div></div>'
    ).join('')+'</div>':'';
  return'<div class="section-block"'+(borderColor?' style="border-color:'+borderColor+'"':'')+'>'+ 
    '<div class="section-block-header'+(collapseState[id]?' collapsed':'')+'" id="block-hdr-'+id+'" data-block-id="'+id+'"'+(headerBg?' style="background:'+headerBg+'"':'')+'>'+ 
      '<div><div class="section-block-title">'+dotHtml+title+'</div>'+(subtitle?'<div class="section-block-subtitle">'+subtitle+'</div>':'')+'</div>'+
      '<span class="collapse-chevron'+(collapseState[id]?'':' open')+'" id="block-chev-'+id+'">▾</span>'+
    '</div>'+
    '<div class="section-block-body'+(collapseState[id]?' collapsed':'')+'" id="block-body-'+id+'">'+
      sumBar+bodyHtml+
    '</div>'+
  '</div>';
}
function deltaChip(curr,prev,goodWhenDown=true){
  if(prev===undefined||prev===null)return'';
  if(prev===0&&curr===0)return'';
  const d=curr-prev;
  if(prev===0)return'<span class="delta-chip delta-neutral">new</span>';
  const p=((d/prev)*100).toFixed(1);
  const pStr=(d>0?'+':'')+p+'%';
  const dir=d>0?'up':d<0?'down':'neutral';
  const good=(goodWhenDown&&dir==='down')||(!goodWhenDown&&dir==='up');
  const bad=(goodWhenDown&&dir==='up')||(!goodWhenDown&&dir==='down');
  const cls=good?'delta-good':bad?'delta-bad':'delta-neutral';
  const arrow=dir==='up'?'↑':dir==='down'?'↓':'→';
  return'<span class="delta-chip '+cls+'">'+arrow+' '+pStr+'</span>';
}

let state={fieldMap:{},tickets:[],ticketsPrev:[],lookbackDays:30,hasData:false,prevLabel:''};

function getFieldById(t,id){if(!id)return'Not Set';const f=t.custom_fields;if(!f||typeof f!=='object')return'Not Set';const e=f[String(id)];if(!e)return'Not Set';return e.value!=null?String(e.value):'Not Set';}
function statusCounts(tickets){const c={open:0,closed:0,pending:0};tickets.forEach(t=>{const s=(t.status||'').toLowerCase();if(s==='open'||s==='new')c.open++;else if(s==='closed')c.closed++;else if(s==='pending')c.pending++;});return c;}
function avgResHours(tickets){const cl=tickets.filter(t=>t.status==='closed'&&t.created_datetime&&t.closed_datetime);if(!cl.length)return null;const tot=cl.reduce((s,t)=>s+(new Date(t.closed_datetime)-new Date(t.created_datetime))/3600000,0);return(tot/cl.length).toFixed(1);}
function groupBy(tickets,fn){return tickets.reduce((a,t)=>{const k=fn(t)||'Not Set';if(!a[k])a[k]=[];a[k].push(t);return a;},{});}
function dedup(arr){const s=new Set();return arr.filter(t=>{if(s.has(t.id))return false;s.add(t.id);return true;});}
function pct(n,total){if(!total)return'—';return((n/total)*100).toFixed(1)+'%';}
function fmtMoney(v){const n=parseFloat(String(v).replace(/[^0-9.]/g,''));return isNaN(n)?null:n;}
function sumMoney(tickets,fid){return tickets.reduce((s,t)=>{const v=fmtMoney(getFieldById(t,fid));return s+(v||0);},0);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function sortedEntries(obj){return Object.entries(obj).sort((a,b)=>b[1].length-a[1].length);}

async function fetchCustomFields(){const j=await window.__authFetch('/api/custom-fields');const map={};(j.data||[]).forEach(f=>{if(f.label)map[f.label.toLowerCase()]=f.id;});return map;}

async function fetchAllTickets(days,onProgress){
  // Fetch 2x the period so we can split current vs prev
  const totalDays=days*2;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-totalDays);
  const all=[];let cursor=null,page=0,done=false;
  while(!done){
    page++;
    const url=cursor?'/api/tickets?cursor='+encodeURIComponent(cursor):'/api/tickets';
    onProgress('Fetching page '+page+'… ('+all.length+' tickets so far)');
    const j=await window.__authFetch(url);
    const pt=j.data||[];let hit=false;
    for(const t of pt){if(new Date(t.created_datetime)>=cutoff)all.push(t);else{hit=true;break;}}
    if(hit||!j.meta?.next_cursor)done=true;else cursor=j.meta.next_cursor;
  }
  // Split: current = last N days, prev = N days before that
  const currCutoff=new Date();currCutoff.setDate(currCutoff.getDate()-days);
  const current=all.filter(t=>new Date(t.created_datetime)>=currCutoff);
  const prev=all.filter(t=>new Date(t.created_datetime)<currCutoff);
  return{current,prev,all};
}

async function runReport(){
  const btn=document.getElementById('run-btn');
  const errBanner=document.getElementById('error-banner');
  errBanner.classList.remove('visible');errBanner.textContent='';
  state.lookbackDays=parseInt(document.getElementById('period-select').value,10);
  showLoading(true);btn.disabled=true;
  const logEl=document.getElementById('loading-log');
  const barEl=document.getElementById('loading-bar');
  const logLines=[];
  function addLog(msg,type='current'){logLines.forEach(el=>{if(el.classList.contains('current'))el.classList.replace('current','log-line');});const div=document.createElement('div');div.className='log-line '+type;div.textContent=msg;logEl.appendChild(div);logEl.scrollTop=logEl.scrollHeight;logLines.push(div);}
  try{
    addLog('→ Resolving custom field IDs…');barEl.style.width='5%';
    state.fieldMap=await fetchCustomFields();
    addLog('✓ Custom fields resolved','done');barEl.style.width='15%';
    addLog('→ Fetching tickets (current + previous period)…');
    const result=await fetchAllTickets(state.lookbackDays,msg=>{addLog(msg);barEl.style.width=Math.min(85,15+state.tickets.length/5)+'%';});
    state.tickets=result.current;
    state.ticketsPrev=result.prev;
    // Build prev period label for topbar
    const prevEnd=new Date();prevEnd.setDate(prevEnd.getDate()-state.lookbackDays);
    const prevStart=new Date();prevStart.setDate(prevStart.getDate()-state.lookbackDays*2);
    state.prevLabel=prevStart.toLocaleDateString('en-AU',{day:'numeric',month:'short'})+' – '+prevEnd.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
    // Update comparison indicator in topbar
    const compEl=document.getElementById('comp-label');
    if(compEl)compEl.textContent='vs '+state.prevLabel;
    barEl.style.width='95%';
    addLog('✓ Fetched '+state.tickets.length+' current + '+state.ticketsPrev.length+' prev tickets','done');
    addLog('→ Processing & rendering…');
    state.hasData=true;renderAll();
    barEl.style.width='100%';addLog('✓ Done!','done');
    document.getElementById('last-run-time').textContent='Updated '+new Date().toLocaleTimeString();
    setTimeout(()=>showLoading(false),500);
    // ── Auto-refresh every 60 min ───────────────────────────
    if(window.__refreshTimer)clearInterval(window.__refreshTimer);
    if(window.__countdownTimer)clearInterval(window.__countdownTimer);
    let nextRefresh=Date.now()+60*60*1000;
    window.__refreshTimer=setInterval(()=>{nextRefresh=Date.now()+60*60*1000;runReport();},60*60*1000);
    window.__countdownTimer=setInterval(()=>{
      const ms=nextRefresh-Date.now();
      if(ms<=0)return;
      const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000);
      const el=document.getElementById('last-run-time');
      if(el)el.textContent='Updated '+new Date().toLocaleTimeString()+' · next refresh in '+m+'m '+String(s).padStart(2,'0')+'s';
    },1000);
  }catch(e){showLoading(false);errBanner.textContent='Error: '+e.message;errBanner.classList.add('visible');console.error(e);}
  btn.disabled=false;
}

function updateBadges(){document.getElementById('badge-overview').textContent=state.tickets.length;}

function renderAll(){
  renderOverview();renderPool();renderArcade();renderPinball();renderCourier();renderOps();renderRefunds();updateBadges();
  document.getElementById('welcome').style.display='none';
  document.getElementById('overview-content').style.display='block';
  // Wire up collapsible block headers via event delegation (safe — no inline onclick needed)
  if(!window.__blockDelegationSet){
    window.__blockDelegationSet=true;
    document.getElementById('main').addEventListener('click',function(e){
      const hdr=e.target.closest('[data-block-id]');
      if(hdr)toggleBlock(hdr.getAttribute('data-block-id'));
    });
  }
}

function inlineStats(curr,prev,totalAll){
  const sc=statusCounts(curr);
  const avg=avgResHours(curr);
  const pSc=prev?statusCounts(prev):null;
  const pAvg=prev?avgResHours(prev):null;
  const prevTotal=prev?prev.length:null;
  function statCell(val,prevVal,label,color,goodWhenDown=true,suffix=''){
    const chip=prevVal!==null?deltaChip(val,prevVal,goodWhenDown):'';
    const prevStr=prevVal!==null?'<div class="inline-stat-prev">'+prevVal+suffix+'</div>':'';
    return'<div class="inline-stat"><div class="inline-stat-val"'+(color?' style="color:'+color+'"':'')+'><span>'+val+suffix+'</span>'+chip+'</div>'+prevStr+'<div class="inline-stat-lbl">'+label+'</div></div>';
  }
  return'<div class="inline-stats">'+
    statCell(curr.length,prevTotal,'Total',null,true)+
    statCell(sc.open,pSc?pSc.open:null,'Open','var(--amber)',true)+
    statCell(sc.closed,pSc?pSc.closed:null,'Closed','var(--green)',false)+
    statCell(sc.pending,pSc?pSc.pending:null,'Pending','var(--purple)',true)+
    '<div class="inline-stat"><div class="inline-stat-val" style="color:var(--text-2);font-size:1rem"><span>'+(avg!==null?avg+'h':'—')+'</span>'+(pAvg!==null&&avg!==null?deltaChip(parseFloat(avg),parseFloat(pAvg),true):'')+'</div>'+(pAvg!==null?'<div class="inline-stat-prev">'+pAvg+'h</div>':'')+'<div class="inline-stat-lbl">Avg Res.</div></div>'+
    '<div class="inline-stat"><div class="inline-stat-val" style="color:var(--text-2);font-size:1rem">'+pct(curr.length,totalAll)+'</div><div class="inline-stat-lbl">% of All</div></div>'+
  '</div>';
}

function breakdownTable(currRows,col1,prevTicketsFn){
  if(!currRows.length)return'<div class="empty-state" style="padding:16px"><div class="empty-state-msg">No tickets matched</div></div>';
  const hasPrev=!!prevTicketsFn;
  let html='<div class="data-table-wrap"><table class="data-table"><thead><tr><th>'+esc(col1)+'</th><th>Count</th>'+(hasPrev?'<th style="color:var(--text-3)">Prev</th><th>Δ</th>':'')+'<th>Open</th><th>Closed</th><th>Pending</th><th>Avg Res.</th></tr></thead><tbody>';
  let gt=0,gtp=0;
  currRows.forEach(([label,tickets])=>{
    const sc=statusCounts(tickets);
    const avg=avgResHours(tickets);
    gt+=tickets.length;
    let prevCount='',chip='';
    if(hasPrev){
      const pTix=prevTicketsFn(label);
      prevCount=pTix.length;
      gtp+=prevCount;
      chip=deltaChip(tickets.length,prevCount,true);
    }
    html+='<tr><td>'+esc(label)+'</td><td style="font-weight:600">'+tickets.length+'</td>'+
      (hasPrev?'<td style="color:var(--text-3);font-family:var(--font-data);text-align:right">'+prevCount+'</td><td style="text-align:right">'+chip+'</td>':'')+
      '<td><span class="tag tag-open">'+sc.open+'</span></td><td><span class="tag tag-closed">'+sc.closed+'</span></td><td><span class="tag tag-pending">'+sc.pending+'</span></td><td>'+(avg!==null?avg+'h':'—')+'</td></tr>';
  });
  html+='</tbody><tfoot><tr class="total-row"><td>Total</td><td>'+gt+'</td>'+
    (hasPrev?'<td style="color:var(--text-3);font-family:var(--font-data);text-align:right">'+gtp+'</td><td style="text-align:right">'+deltaChip(gt,gtp,true)+'</td>':'')+
    '<td colspan="4"></td></tr></tfoot></table></div>';
  return html;
}

function renderOverview(){
  const{tickets,ticketsPrev,fieldMap,lookbackDays}=state;
  const prev=ticketsPrev;
  const total=tickets.length;const ptotal=prev.length;
  const sc=statusCounts(tickets);const psc=statusCounts(prev);
  const fid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const resfid=fieldMap[FIELD_NAMES.RESOLUTION.toLowerCase()];
  const byProduct=groupBy(tickets,t=>getFieldById(t,fid));
  const pe=sortedEntries(byProduct).slice(0,12);
  const maxP=pe[0]?.[1].length||1;
  const byProductPrev=groupBy(prev,t=>getFieldById(t,fid));
  const opsTotal=dedup(tickets.filter(t=>OPS_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase()))).length;
  const opsPrev=dedup(prev.filter(t=>OPS_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase()))).length;
  const courierTotal=dedup(tickets.filter(t=>COURIER_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase()))).length;
  const courierPrev=dedup(prev.filter(t=>COURIER_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase()))).length;
  const refundTotal=tickets.filter(t=>REFUND_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase())).length;
  const refundPrev=prev.filter(t=>REFUND_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase())).length;
  const replTix=tickets.filter(t=>REPLACEMENT_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase()));
  const replPrev=prev.filter(t=>REPLACEMENT_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase()));
  function statCardComp(label,curr,p,color,cls,goodWhenDown=true){
    return'<div class="stat-card '+cls+'"><div class="stat-label">'+label+'</div><div class="stat-value '+color+'">'+curr+'</div><div class="stat-sub" style="display:flex;align-items:center;gap:6px"><span style="color:var(--text-3)">prev: '+p+'</span>'+deltaChip(curr,p,goodWhenDown)+'</div></div>';
  }
  const prodBars=pe.map(([name,tix])=>{
    const pCount=(byProductPrev[name]||[]).length;
    const chip=deltaChip(tix.length,pCount,true);
    return'<div class="bar-row"><div class="bar-row-label" title="'+esc(name)+'">'+esc(name)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+(tix.length/maxP*100).toFixed(1)+'%;background:var(--blue)"></div></div><div class="bar-row-val">'+tix.length+' '+chip+'</div></div>';
  }).join('');
  const catRows=[['Ops Issues',opsTotal,opsPrev,'var(--red)',true],['Courier Issues',courierTotal,courierPrev,'var(--amber)',true],['Refunds',refundTotal,refundPrev,'var(--purple)',true],['Replacements',replTix.length,replPrev.length,'var(--green)',true]];
  const maxCat=Math.max(...catRows.map(r=>r[1]),1);
  const catBars=catRows.map(([label,count,pCount,color])=>'<div class="bar-row"><div class="bar-row-label">'+esc(label)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+(count/maxCat*100).toFixed(1)+'%;background:'+color+'"></div></div><div class="bar-row-val">'+count+' '+deltaChip(count,pCount,true)+'</div></div>').join('');
  const compBadge='<span style="font-size:.72rem;color:var(--text-3);margin-left:8px">vs '+state.prevLabel+'</span>';
  const html='<div class="page-header"><div><div class="page-title">◈ Overview</div><div class="page-subtitle">Last '+lookbackDays+' days &nbsp;·&nbsp; '+total+' total tickets</div></div><div class="period-badge">Last '+lookbackDays+' days'+compBadge+'</div></div>'+
    '<div class="stats-grid">'+
    statCardComp('Total Tickets',total,ptotal,'blue','blue',true)+
    statCardComp('Open',sc.open,psc.open,'amber','amber',true)+
    statCardComp('Closed',sc.closed,psc.closed,'green','green',false)+
    statCardComp('Pending',sc.pending,psc.pending,'purple','purple',true)+
    statCardComp('Ops Issues',opsTotal,opsPrev,'red','red',true)+
    statCardComp('Courier Issues',courierTotal,courierPrev,'amber','amber',true)+
    '</div>'+
    '<div class="blocks-2col"><div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-blue"></span>Tickets by Product</div></div></div><div class="section-block-body">'+prodBars+'</div></div><div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-amber"></span>Category Snapshot</div></div></div><div class="section-block-body">'+catBars+'</div></div></div>';
  document.getElementById('overview-content').innerHTML=html;
}

function renderPool(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const did=fieldMap[FIELD_NAMES.DAMAGE.toLowerCase()];
  const poolT=tickets.filter(t=>getFieldById(t,pid).toLowerCase()===POOL_PRODUCT.toLowerCase());
  const poolPrev=ticketsPrev.filter(t=>getFieldById(t,pid).toLowerCase()===POOL_PRODUCT.toLowerCase());
  const supT=poolT.filter(t=>getFieldById(t,rid).toLowerCase()===REASON_SUPPLIER.toLowerCase());
  const supPrev=poolPrev.filter(t=>getFieldById(t,rid).toLowerCase()===REASON_SUPPLIER.toLowerCase());
  const courT=poolT.filter(t=>getFieldById(t,rid).toLowerCase()===REASON_COURIER_POOL.toLowerCase());
  const courPrev=poolPrev.filter(t=>getFieldById(t,rid).toLowerCase()===REASON_COURIER_POOL.toLowerCase());
  const allD=dedup([...supT,...courT]);
  const allDPrev=dedup([...supPrev,...courPrev]);
  const total=tickets.length;
  document.getElementById('badge-pool').textContent=allD.length;
  const sections=[
    {title:'Supplier Issue',dot:'dot-blue',tickets:supT,prev:supPrev},
    {title:'Courier Fault',dot:'dot-amber',tickets:courT,prev:courPrev},
    {title:'Total Damages (Supplier + Courier)',dot:'dot-red',tickets:allD,prev:allDPrev}
  ];
  let html='<div class="page-header"><div><div class="page-title accent-blue">🎱 Pool Tables</div><div class="page-subtitle">CSLT Pool Tables — Supplier &amp; Courier damage breakdown</div></div><div class="period-badge" id="pb-pool">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  sections.forEach(({title,dot,tickets:tix,prev})=>{
    const sc=statusCounts(tix);
    const avg=avgResHours(tix);
    const byD=sortedEntries(groupBy(tix,t=>getFieldById(t,did)));
    const prevByD=groupBy(prev,t=>getFieldById(t,did));
    html+=sectionBlock({
      title:esc(title)+' <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+tix.length+'</span> '+deltaChip(tix.length,prev.length,true),
      subtitle:tix.length+' tickets · prev: '+prev.length+' · '+pct(tix.length,total)+' of all',
      dot,
      summaryItems:[
        {val:tix.length,label:'Total',color:'var(--text-1)'},
        {val:sc.open,label:'Open',color:'var(--amber)'},
        {val:sc.closed,label:'Closed',color:'var(--green)'},
        {val:sc.pending,label:'Pending',color:'var(--purple)'},
        {val:avg?avg+'h':'—',label:'Avg Res.'},
        {val:deltaChip(tix.length,prev.length,true)||'—',label:'vs Prev'},
      ],
      bodyHtml:breakdownTable(byD,'Damage Type',label=>(prevByD[label]||[]))
    });
  });
  document.getElementById('pool-content').innerHTML=html;
}

function renderArcade(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const aid=fieldMap[FIELD_NAMES.ARCADE_ISSUE.toLowerCase()];
  const total=tickets.length;
  const colors=['blue','green','amber'];
  const dots=['dot-blue','dot-green','dot-amber'];
  const sets=ARCADE_PRODUCTS.map((prod,i)=>({
    product:prod,
    tickets:tickets.filter(t=>getFieldById(t,pid).toLowerCase()===prod.toLowerCase()&&getFieldById(t,rid).toLowerCase()===ARCADE_REASON.toLowerCase()),
    prev:ticketsPrev.filter(t=>getFieldById(t,pid).toLowerCase()===prod.toLowerCase()&&getFieldById(t,rid).toLowerCase()===ARCADE_REASON.toLowerCase()),
    color:colors[i],dot:dots[i]
  }));
  const allArcade=dedup(sets.flatMap(s=>s.tickets));
  const allArcadePrev=dedup(sets.flatMap(s=>s.prev));
  document.getElementById('badge-arcade').textContent=allArcade.length;
  let html='<div class="page-header"><div><div class="page-title accent-green">🕹 Gao Arcades</div><div class="page-subtitle">Upright Arcade · Cocktail Pro · Cocktail MKII — Item Not Working</div></div><div class="period-badge" id="pb-arcade">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  sets.forEach(({product,tickets:tix,prev,dot})=>{
    const sc=statusCounts(tix);const avg=avgResHours(tix);
    const byI=sortedEntries(groupBy(tix,t=>getFieldById(t,aid)));
    const prevByI=groupBy(prev,t=>getFieldById(t,aid));
    html+=sectionBlock({title:esc(product)+' <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+tix.length+'</span> '+deltaChip(tix.length,prev.length,true),subtitle:tix.length+' tickets · prev: '+prev.length+' · Contact Reason: '+ARCADE_REASON,dot,
      summaryItems:[{val:tix.length,label:'Total'},{val:sc.open,label:'Open',color:'var(--amber)'},{val:sc.closed,label:'Closed',color:'var(--green)'},{val:sc.pending,label:'Pending',color:'var(--purple)'},{val:avg?avg+'h':'—',label:'Avg Res.'},{val:deltaChip(tix.length,prev.length,true)||'—',label:'vs Prev'}],
      bodyHtml:breakdownTable(byI,'Issue / Damage Type',label=>(prevByI[label]||[]))});
  });
  const scAll2=statusCounts(allArcade);const avgAll=avgResHours(allArcade);
  const byIA=sortedEntries(groupBy(allArcade,t=>getFieldById(t,aid)));
  const prevByIA=groupBy(allArcadePrev,t=>getFieldById(t,aid));
  html+=sectionBlock({title:'All Arcade Machines — Combined <span style="font-size:.8rem;font-weight:400">'+allArcade.length+'</span> '+deltaChip(allArcade.length,allArcadePrev.length,true),dot:'dot-red',borderColor:'rgba(255,86,85,.3)',headerBg:'var(--red-soft)',
    summaryItems:[{val:allArcade.length,label:'Total'},{val:scAll2.open,label:'Open',color:'var(--amber)'},{val:scAll2.closed,label:'Closed',color:'var(--green)'},{val:scAll2.pending,label:'Pending',color:'var(--purple)'},{val:avgAll?avgAll+'h':'—',label:'Avg Res.'},{val:deltaChip(allArcade.length,allArcadePrev.length,true)||'—',label:'vs Prev'}],
    bodyHtml:breakdownTable(byIA,'Issue / Damage Type',label=>(prevByIA[label]||[]))});
  // ── Broken Games section ─────────────────────────────────
  const bgid=fieldMap[FIELD_NAMES.BROKEN_GAMES.toLowerCase()];
  const brokenTix=tickets.filter(t=>getFieldById(t,aid).toLowerCase()==='game not working');
  const byGame=sortedEntries(groupBy(brokenTix,t=>getFieldById(t,bgid)||'Not Specified'));
  const summaryRows=byGame.map(([game,gtix])=>'<tr><td style="font-weight:600">'+esc(game)+'</td><td>'+gtix.length+'</td></tr>').join('');
  const ticketRows=[...brokenTix].sort((a,b)=>new Date(b.created_datetime)-new Date(a.created_datetime)).map(t=>{
    const game=getFieldById(t,bgid)||'Not Specified';
    const prod=getFieldById(t,pid);
    const date=t.created_datetime?new Date(t.created_datetime).toLocaleDateString('en-AU'):'—';
    const sc=t.status==='closed'?'tag-closed':t.status==='pending'?'tag-pending':'tag-open';
    return'<tr><td style="font-family:var(--font-data);font-size:.75rem;color:var(--blue)">'+esc(String(t.id))+'</td><td>'+esc((t.customer?.name)||'Unknown')+'</td><td>'+esc(prod)+'</td><td style="font-weight:600;color:var(--amber)">'+esc(game)+'</td><td><span class="tag '+sc+'">'+esc(t.status)+'</span></td><td style="color:var(--text-2)">'+date+'</td></tr>';
  }).join('');
  const brokenBodyHtml='<div class="blocks-2col" style="margin-bottom:16px">'+
    sectionBlock({title:'By Game',dot:'dot-amber',bodyHtml:'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Game</th><th>Reports</th></tr></thead><tbody>'+summaryRows+'</tbody><tfoot><tr class="total-row"><td>Total</td><td>'+brokenTix.length+'</td></tr></tfoot></table></div>'})+
    sectionBlock({title:'Quick Stats',dot:'dot-blue',bodyHtml:inlineStats(brokenTix,null,total)})+
    '</div><div class="data-table-wrap"><table class="data-table ticket-table"><thead><tr><th>Ticket ID</th><th>Customer</th><th>Product</th><th>Game Not Working</th><th>Status</th><th>Date</th></tr></thead><tbody>'+ticketRows+'</tbody></table></div>';
  html+=sectionBlock({title:'🎮 Broken Games <span style="font-size:.8rem;font-weight:400">'+brokenTix.length+'</span>',subtitle:'Tickets where Issue = Game Not Working',dot:'dot-amber',borderColor:'rgba(245,164,40,.3)',headerBg:'var(--amber-soft)',bodyHtml:brokenBodyHtml});
  document.getElementById('arcade-content').innerHTML=html;
}

function renderCourier(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const cid=fieldMap[FIELD_NAMES.COURIER.toLowerCase()];
  const total=tickets.length;
  const dots=['dot-red','dot-amber','dot-blue','dot-purple'];
  const allC=dedup(tickets.filter(t=>COURIER_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase())));
  const allCPrev=dedup(ticketsPrev.filter(t=>COURIER_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase())));
  document.getElementById('badge-courier').textContent=allC.length;
  let html='<div class="page-header"><div><div class="page-title accent-amber">🚚 Courier Issues</div><div class="page-subtitle">Missing · Delayed · Wrong Address · Damaged — by courier</div></div><div class="period-badge" id="pb-courier">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  COURIER_REASONS.forEach((reason,i)=>{
    const tix=tickets.filter(t=>getFieldById(t,rid).toLowerCase()===reason.toLowerCase());
    const prev=ticketsPrev.filter(t=>getFieldById(t,rid).toLowerCase()===reason.toLowerCase());
    const sc=statusCounts(tix);const avg=avgResHours(tix);
    const byC=sortedEntries(groupBy(tix,t=>getFieldById(t,cid)));
    const prevByC=groupBy(prev,t=>getFieldById(t,cid));
    html+=sectionBlock({title:esc(reason)+' <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+tix.length+'</span> '+deltaChip(tix.length,prev.length,true),subtitle:tix.length+' tickets · prev: '+prev.length,dot:dots[i],
      summaryItems:[{val:tix.length,label:'Total'},{val:sc.open,label:'Open',color:'var(--amber)'},{val:sc.closed,label:'Closed',color:'var(--green)'},{val:sc.pending,label:'Pending',color:'var(--purple)'},{val:avg?avg+'h':'—',label:'Avg Res.'},{val:deltaChip(tix.length,prev.length,true)||'—',label:'vs Prev'}],
      bodyHtml:breakdownTable(byC,'Courier',label=>(prevByC[label]||[]))});
  });
  const scAllC=statusCounts(allC);const avgAllC=avgResHours(allC);
  const byCAll=sortedEntries(groupBy(allC,t=>getFieldById(t,cid)));
  const prevByCAll=groupBy(allCPrev,t=>getFieldById(t,cid));
  const worst=byCAll[0]?.[0]||'—';
  html+=sectionBlock({title:'Total Courier Issues — All Reasons <span style="font-size:.8rem;font-weight:400">'+allC.length+'</span> '+deltaChip(allC.length,allCPrev.length,true),subtitle:'Worst offender: <strong>'+esc(worst)+'</strong>',dot:'dot-blue',borderColor:'rgba(79,142,255,.25)',headerBg:'var(--blue-soft)',
    summaryItems:[{val:allC.length,label:'Total'},{val:scAllC.open,label:'Open',color:'var(--amber)'},{val:scAllC.closed,label:'Closed',color:'var(--green)'},{val:scAllC.pending,label:'Pending',color:'var(--purple)'},{val:avgAllC?avgAllC+'h':'—',label:'Avg Res.'},{val:deltaChip(allC.length,allCPrev.length,true)||'—',label:'vs Prev'}],
    bodyHtml:breakdownTable(byCAll,'Courier',label=>(prevByCAll[label]||[]))});
  document.getElementById('courier-content').innerHTML=html;
}

function renderOps(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const total=tickets.length;
  const opsGroups=OPS_REASONS.map(reason=>({
    reason,
    tickets:tickets.filter(t=>getFieldById(t,rid).toLowerCase()===reason.toLowerCase()),
    prev:ticketsPrev.filter(t=>getFieldById(t,rid).toLowerCase()===reason.toLowerCase())
  }));
  const opsTotal=dedup(opsGroups.flatMap(g=>g.tickets)).length;
  const opsPrevTotal=dedup(opsGroups.flatMap(g=>g.prev)).length;
  document.getElementById('badge-ops').textContent=opsTotal;
  const scAll={open:0,closed:0,pending:0};
  let summaryRows=opsGroups.map(({reason,tickets:tix,prev})=>{
    const sc=statusCounts(tix);
    scAll.open+=sc.open;scAll.closed+=sc.closed;scAll.pending+=sc.pending;
    return'<tr><td style="max-width:300px;white-space:normal">'+esc(reason)+'</td><td style="font-weight:600">'+tix.length+'</td><td style="color:var(--text-3);font-family:var(--font-data);text-align:right">'+prev.length+'</td><td style="text-align:right">'+deltaChip(tix.length,prev.length,true)+'</td><td><span class="tag tag-open">'+sc.open+'</span></td><td><span class="tag tag-closed">'+sc.closed+'</span></td><td><span class="tag tag-pending">'+sc.pending+'</span></td></tr>';
  }).join('');
  let html='<div class="page-header"><div><div class="page-title accent-red">⚙️ Ops Issues</div><div class="page-subtitle">Picking errors · Tracking · Delays · Wrong address · Misorder</div></div><div class="period-badge" id="pb-ops">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  html+=sectionBlock({title:'Ops Summary — All Reasons <span style="font-size:.8rem;font-weight:400">'+opsTotal+'</span> '+deltaChip(opsTotal,opsPrevTotal,true),dot:'dot-red',
    summaryItems:[{val:opsTotal,label:'Total',color:'var(--red)'},{val:scAll.open,label:'Open',color:'var(--amber)'},{val:scAll.closed,label:'Closed',color:'var(--green)'},{val:scAll.pending,label:'Pending',color:'var(--purple)'},{val:deltaChip(opsTotal,opsPrevTotal,true)||'—',label:'vs Prev'}],
    bodyHtml:'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Contact Reason</th><th>Total</th><th style="color:var(--text-3)">Prev</th><th>Δ</th><th>Open</th><th>Closed</th><th>Pending</th></tr></thead><tbody>'+summaryRows+'</tbody><tfoot><tr class="total-row"><td>TOTAL</td><td>'+opsTotal+'</td><td style="color:var(--text-3);font-family:var(--font-data);text-align:right">'+opsPrevTotal+'</td><td style="text-align:right">'+deltaChip(opsTotal,opsPrevTotal,true)+'</td><td><span class="tag tag-open">'+scAll.open+'</span></td><td><span class="tag tag-closed">'+scAll.closed+'</span></td><td><span class="tag tag-pending">'+scAll.pending+'</span></td></tr></tfoot></table></div>'});
  const dots=['dot-red','dot-amber','dot-blue','dot-purple','dot-cyan'];
  opsGroups.forEach(({reason,tickets:tix,prev},i)=>{
    const sc=statusCounts(tix);const avg=avgResHours(tix);
    const byP=sortedEntries(groupBy(tix,t=>getFieldById(t,pid)));
    const prevByP=groupBy(prev,t=>getFieldById(t,pid));
    html+=sectionBlock({title:esc(reason)+' <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+tix.length+'</span> '+deltaChip(tix.length,prev.length,true),subtitle:tix.length+' tickets · prev: '+prev.length+' · '+pct(tix.length,total)+' of all',dot:dots[i],
      summaryItems:[{val:tix.length,label:'Total'},{val:sc.open,label:'Open',color:'var(--amber)'},{val:sc.closed,label:'Closed',color:'var(--green)'},{val:sc.pending,label:'Pending',color:'var(--purple)'},{val:avg?avg+'h':'—',label:'Avg Res.'},{val:deltaChip(tix.length,prev.length,true)||'—',label:'vs Prev'}],
      bodyHtml:breakdownTable(byP,'Product',label=>(prevByP[label]||[]))});
  });
  document.getElementById('ops-content').innerHTML=html;
}

function renderRefunds(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const resfid=fieldMap[FIELD_NAMES.RESOLUTION.toLowerCase()];
  const rvfid=fieldMap[FIELD_NAMES.REFUND_VALUE.toLowerCase()];
  const onfid=fieldMap[FIELD_NAMES.ORDER_NUMBER.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const total=tickets.length;
  const refundTix=tickets.filter(t=>REFUND_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase()));
  const refundPrev=ticketsPrev.filter(t=>REFUND_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase()));
  const fullR=refundTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='refund');
  const fullRPrev=refundPrev.filter(t=>getFieldById(t,resfid).toLowerCase()==='refund');
  const partR=refundTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='partial refund');
  const partRPrev=refundPrev.filter(t=>getFieldById(t,resfid).toLowerCase()==='partial refund');
  const totalVal=sumMoney(refundTix,rvfid);
  const totalValPrev=sumMoney(refundPrev,rvfid);
  const fullVal=sumMoney(fullR,rvfid);
  const partVal=sumMoney(partR,rvfid);
  const replTix=tickets.filter(t=>REPLACEMENT_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase()));
  const replPrev=ticketsPrev.filter(t=>REPLACEMENT_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase()));
  const freeU=replTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='free product upgrade');
  const freeG=replTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='free gift');
  const replS=replTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='replacement sent');
  document.getElementById('badge-refunds').textContent=refundTix.length+replTix.length;
  const byProdR=sortedEntries(groupBy(refundTix,t=>getFieldById(t,pid)));
  const byProdRPrev=groupBy(refundPrev,t=>getFieldById(t,pid));
  const prodRows=byProdR.map(([prod,tix])=>{
    const val=sumMoney(tix,rvfid);
    const partial=tix.filter(t=>getFieldById(t,resfid).toLowerCase()==='partial refund').length;
    const pCount=(byProdRPrev[prod]||[]).length;
    return'<tr><td>'+esc(prod)+'</td><td style="font-weight:600">'+tix.length+'</td><td style="color:var(--text-3);font-family:var(--font-data);text-align:right">'+pCount+'</td><td style="text-align:right">'+deltaChip(tix.length,pCount,true)+'</td><td><span class="val-chip">$'+val.toFixed(2)+'</span></td><td>'+(tix.length>0?'$'+(val/tix.length).toFixed(2):'—')+'</td><td>'+partial+'</td></tr>';
  }).join('');
  const byProdRepl=sortedEntries(groupBy(replTix,t=>getFieldById(t,pid)));
  const replRows=byProdRepl.map(([prod,tix])=>{const u=tix.filter(t=>getFieldById(t,resfid).toLowerCase()==='free product upgrade').length;const g=tix.filter(t=>getFieldById(t,resfid).toLowerCase()==='free gift').length;const r=tix.filter(t=>getFieldById(t,resfid).toLowerCase()==='replacement sent').length;return'<tr><td>'+esc(prod)+'</td><td>'+tix.length+'</td><td>'+u+'</td><td>'+g+'</td><td>'+r+'</td></tr>';}).join('');
  const refTicketRows=[...refundTix].sort((a,b)=>new Date(b.created_datetime)-new Date(a.created_datetime)).map(t=>{const res=getFieldById(t,resfid);const val=fmtMoney(getFieldById(t,rvfid));const valStr=val!==null?'<span class="val-chip">$'+val.toFixed(2)+'</span>':'—';const date=t.created_datetime?new Date(t.created_datetime).toLocaleDateString('en-AU'):'—';const rc=res.toLowerCase()==='refund'?'tag-open':'tag-pending';return'<tr><td>'+t.id+'</td><td>'+esc((t.customer?.name)||'Unknown')+'</td><td>'+esc(getFieldById(t,pid))+'</td><td><span class="tag '+rc+'">'+esc(res)+'</span></td><td>'+valStr+'</td><td><span class="tag '+(t.status==='closed'?'tag-closed':t.status==='pending'?'tag-pending':'tag-open')+'">'+t.status+'</span></td><td style="color:var(--text-2)">'+date+'</td></tr>';}).join('');
  const replTicketRows=[...replTix].sort((a,b)=>new Date(b.created_datetime)-new Date(a.created_datetime)).map(t=>{const res=getFieldById(t,resfid);const order=getFieldById(t,onfid);const reason=getFieldById(t,rid);const rc=res.toLowerCase()==='replacement sent'?'tag-closed':res.toLowerCase()==='free product upgrade'?'tag-open':'tag-pending';return'<tr><td>'+t.id+'</td><td>'+esc((t.customer?.name)||'Unknown')+'</td><td>'+esc(getFieldById(t,pid))+'</td><td><span class="tag '+rc+'">'+esc(res)+'</span></td><td style="max-width:220px;white-space:normal;font-size:.78rem;color:var(--text-2)">'+esc(reason)+'</td><td style="font-family:var(--font-data);font-size:.75rem">'+esc(order)+'</td></tr>';}).join('');
  function statCardRef(label,curr,prev,val,cls,color,goodWhenDown=true){
    return'<div class="stat-card '+cls+'"><div class="stat-label">'+label+'</div><div class="stat-value '+color+'">'+curr+'</div><div class="stat-sub" style="display:flex;align-items:center;gap:6px">'+(val!==null?'<span>$'+val.toFixed(2)+'</span>·':'')+'<span style="color:var(--text-3)">prev: '+prev+'</span>'+deltaChip(curr,prev,goodWhenDown)+'</div></div>';
  }
  const html='<div class="page-header"><div><div class="page-title accent-purple">💰 Refunds &amp; Replacements</div><div class="page-subtitle">Full refunds · Partial refunds · Replacements · Free gifts — all products</div></div><div class="period-badge" id="pb-refunds">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>'+
    '<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">'+
    statCardRef('Full Refunds',fullR.length,fullRPrev.length,fullVal,'red','red')+
    statCardRef('Partial Refunds',partR.length,partRPrev.length,partVal,'amber','amber')+
    '<div class="stat-card purple"><div class="stat-label">Total Refund Value</div><div class="stat-value purple" style="font-size:1.4rem">$'+totalVal.toFixed(2)+'</div><div class="stat-sub" style="display:flex;align-items:center;gap:6px"><span style="color:var(--text-3)">prev: $'+totalValPrev.toFixed(2)+'</span>'+deltaChip(totalVal,totalValPrev,true)+'</div></div>'+
    statCardRef('Replacements',replS.length,replPrev.length,null,'green','green')+
    statCardRef('Free Upgrades',freeU.length,0,null,'cyan','',true)+
    statCardRef('Free Gifts',freeG.length,0,null,'blue','blue',true)+
    '</div>'+
    '<div class="blocks-2col">'+
    '<div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-purple"></span>Refunds by Product</div></div></div><div class="section-block-body"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Count</th><th style="color:var(--text-3)">Prev</th><th>Δ</th><th>Total Value</th><th>Avg Value</th><th>Partial</th></tr></thead><tbody>'+prodRows+'</tbody><tfoot><tr class="total-row"><td>Total</td><td>'+refundTix.length+'</td><td style="color:var(--text-3);font-family:var(--font-data);text-align:right">'+refundPrev.length+'</td><td style="text-align:right">'+deltaChip(refundTix.length,refundPrev.length,true)+'</td><td><span class="val-chip">$'+totalVal.toFixed(2)+'</span></td><td></td><td>'+partR.length+'</td></tr></tfoot></table></div></div></div>'+
    '<div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-green"></span>Replacements by Product</div></div></div><div class="section-block-body"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Total</th><th>Upgrades</th><th>Free Gifts</th><th>Replacements</th></tr></thead><tbody>'+replRows+'</tbody><tfoot><tr class="total-row"><td>Total</td><td>'+replTix.length+'</td><td>'+freeU.length+'</td><td>'+freeG.length+'</td><td>'+replS.length+'</td></tr></tfoot></table></div></div></div>'+
    '</div>'+
    '<div class="section-block" style="margin-top:20px"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-red"></span>All Refund Tickets</div><div class="section-block-subtitle">'+refundTix.length+' tickets · newest first</div></div></div><div class="section-block-body"><div class="ticket-list-wrap"><div class="data-table-wrap"><table class="data-table ticket-table"><thead><tr><th>Ticket ID</th><th>Customer</th><th>Product</th><th>Resolution</th><th>Value</th><th>Status</th><th>Date</th></tr></thead><tbody>'+refTicketRows+'</tbody></table></div></div></div></div>'+
    '<div class="section-block" style="margin-top:20px"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-green"></span>All Replacement Tickets</div><div class="section-block-subtitle">'+replTix.length+' tickets · includes order numbers</div></div></div><div class="section-block-body"><div class="ticket-list-wrap"><div class="data-table-wrap"><table class="data-table ticket-table"><thead><tr><th>Ticket ID</th><th>Customer</th><th>Product</th><th>Resolution</th><th>Contact Reason</th><th>Order No.</th></tr></thead><tbody>'+replTicketRows+'</tbody></table></div></div></div></div>';
  document.getElementById('refunds-content').innerHTML=html;
}

function renderPinball(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const pfid=fieldMap[FIELD_NAMES.PINBALL_ISSUE.toLowerCase()];
  const total=tickets.length;
  const dots=['dot-purple','dot-cyan'];
  const sets=KELVIN_PRODUCTS.map((prod,i)=>({
    product:prod,
    tickets:tickets.filter(t=>getFieldById(t,pid).toLowerCase()===prod.toLowerCase()&&KELVIN_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase())),
    prev:ticketsPrev.filter(t=>getFieldById(t,pid).toLowerCase()===prod.toLowerCase()&&KELVIN_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase())),
    dot:dots[i]
  }));
  const allKelvin=dedup(sets.flatMap(s=>s.tickets));
  const allKelvinPrev=dedup(sets.flatMap(s=>s.prev));
  document.getElementById('badge-pinball').textContent=allKelvin.length;
  let html='<div class="page-header"><div><div class="page-title accent-purple">🎰 Kelvin Pinball &amp; Drivers</div><div class="page-subtitle">Pinball Machine · Gearshift Pro — Item Not Working &amp; Supplier Issues</div></div><div class="period-badge" id="pb-pinball">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  sets.forEach(({product,tickets:tix,prev,dot})=>{
    const byI=sortedEntries(groupBy(tix,t=>getFieldById(t,pfid)||getFieldById(t,rid)));
    const prevByI=groupBy(prev,t=>getFieldById(t,pfid)||getFieldById(t,rid));
    // Also show breakdown by contact reason within this product
    const byR=sortedEntries(groupBy(tix,t=>getFieldById(t,rid)));
    const prevByR=groupBy(prev,t=>getFieldById(t,rid));
    html+='<div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot '+dot+'"></span>'+esc(product)+' <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+tix.length+'</span> '+deltaChip(tix.length,prev.length,true)+'</div><div class="section-block-subtitle">'+tix.length+' tickets · prev: '+prev.length+'</div></div></div>'+
      '<div class="section-block-body">'+inlineStats(tix,prev,total)+
      // Pinball Issue breakdown (primary)
      (pfid?'<div style="margin-bottom:6px;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3)">By Pinball Issue</div>'+breakdownTable(byI,'Pinball Issue',label=>(prevByI[label]||[])):'<div style="margin-bottom:6px;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3)">By Contact Reason</div>'+breakdownTable(byR,'Contact Reason',label=>(prevByR[label]||[])))+
      '</div></div>';
  });
  // Combined total block
  const byIAll=sortedEntries(groupBy(allKelvin,t=>getFieldById(t,pfid)||getFieldById(t,rid)));
  const prevByIAll=groupBy(allKelvinPrev,t=>getFieldById(t,pfid)||getFieldById(t,rid));
  html+='<div class="section-block" style="border-color:rgba(167,139,250,.3)"><div class="section-block-header" style="background:var(--purple-soft)"><div><div class="section-block-title"><span class="color-dot dot-purple"></span>All Kelvin Products — Combined <span style="font-size:.8rem;font-weight:400">'+allKelvin.length+'</span> '+deltaChip(allKelvin.length,allKelvinPrev.length,true)+'</div><div class="section-block-subtitle">'+allKelvin.length+' total tickets · prev: '+allKelvinPrev.length+'</div></div></div><div class="section-block-body">'+inlineStats(allKelvin,allKelvinPrev,total)+breakdownTable(byIAll,'Pinball Issue / Reason',label=>(prevByIAll[label]||[]))+'</div></div>';
  document.getElementById('pinball-content').innerHTML=html;
}

function showSection(name){document.querySelectorAll('.section-view').forEach(el=>el.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));document.getElementById('section-'+name).classList.add('active');document.querySelector('.nav-item[data-section="'+name+'"]').classList.add('active');}

function showLoading(show){const el=document.getElementById('loading-overlay');if(show){el.classList.add('visible');document.getElementById('loading-log').innerHTML='';document.getElementById('loading-bar').style.width='0%';}else{el.classList.remove('visible');}}
`
