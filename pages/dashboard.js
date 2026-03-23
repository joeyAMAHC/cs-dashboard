import React, { useCallback, useEffect, useRef, useState } from 'react'
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
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { const j = await res.json(); msg = j.error?.message || j.error || j.detail || msg } catch(e) {}
      throw new Error(msg)
    }
    return res.json()
  }

  // Authenticated POST — used by AI report
  async function authPost(url, body) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { const j = await res.json(); msg = j.error || msg } catch(e) {}
      throw new Error(msg)
    }
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
      <DashboardApp user={user} onSignOut={handleSignOut} authFetch={authFetch} authPost={authPost} />
    </>
  )
}

// ── The full dashboard UI ────────────────────────────────────
function DashboardApp({ user, onSignOut, authFetch, authPost }) {
  const [showSettings, setShowSettings] = useState(false)
  const [customSections, setCustomSections] = useState(() => {
    if (typeof window === 'undefined') return []
    try { const s = localStorage.getItem('__dashConfig'); if (s) return JSON.parse(s).customSections || [] } catch(e) {}
    return []
  })

  useEffect(() => {
    // Load saved config
    try {
      const saved = localStorage.getItem('__dashConfig')
      if (saved) window.__dashConfig = JSON.parse(saved)
    } catch(e) {}

    // Expose auth helpers and dashboard functions on window
    window.__authFetch = authFetch
    window.__authPost = authPost
    window.__runReport = runReport
    window.__showSection = showSection
    window.toggleBlock = toggleBlock
    window.__renderAll = renderAll
    window.__toggleAgent = toggleAgent
    window.__generateAIReport = generateAIReport
    window.__loadCsAgent = loadCsAgent

    return () => {
      delete window.__authFetch
      delete window.__authPost
      delete window.__runReport
      delete window.__showSection
      delete window.toggleBlock
      delete window.__renderAll
      delete window.__toggleAgent
      delete window.__generateAIReport
      delete window.__loadCsAgent
      delete window.__state
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
          <button className="btn btn-primary" id="run-btn" onClick={() => {
            if (typeof window.__runReport !== 'function') {
              const b = document.getElementById('error-banner')
              if (b) { b.textContent = 'Error: dashboard script failed to initialise — try refreshing the page'; b.classList.add('visible') }
              return
            }
            window.__runReport()
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Run Report
          </button>
          <button className="btn btn-ghost" title="Export current section as PDF" onClick={() => {
            const active = document.querySelector('.section-view.active')
            const titleEl = active?.querySelector('.page-title')
            const sectionName = titleEl ? titleEl.textContent.replace(/[^\w\s&]/g,'').trim() : 'Dashboard'
            const periodEl = active?.querySelector('.period-badge')
            const period = periodEl ? periodEl.textContent.trim() : ''
            const ph = document.getElementById('print-header')
            if(ph){
              document.getElementById('ph-section').textContent = sectionName
              document.getElementById('ph-date').textContent = period + ' · Exported ' + new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})
            }
            window.print()
          }} style={{ padding: '6px 12px', fontSize: '.85rem', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Export PDF
          </button>
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)} style={{ padding: '6px 12px', fontSize: '1rem', lineHeight: 1 }} title="Dashboard Settings">⚙️</button>
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
            { id: 'kegerator',   icon: '🍺', label: 'Kegerators' },
            { id: 'ledsigns',    icon: '💡', label: 'LED Bar Signs' },
            { id: 'barfridge',   icon: '🧊', label: 'Bar Fridges' },
            { id: 'courier',     icon: '🚚', label: 'Courier Issues' },
            { id: 'ops',         icon: '⚙️', label: 'Ops Issues' },
            { id: 'refunds',     icon: '💰', label: 'Refunds & Replacements' },
          ].map(({ id, icon, label }) => (
            <div key={id} className={`nav-item${id === 'overview' ? ' active' : ''}`} data-section={id} onClick={() => window.__showSection(id)}>
              <span className="nav-icon">{icon}</span> {label}
              <span className="nav-badge" id={`badge-${id}`}>—</span>
            </div>
          ))}
          {customSections.length > 0 && <>
            <div className="nav-section-label" style={{ marginTop: 12 }}>Custom</div>
            {customSections.map(({ id, icon, label }) => (
              <div key={id} className="nav-item" data-section={id} onClick={() => window.__showSection(id)}>
                <span className="nav-icon">{icon || '📊'}</span> {label}
                <span className="nav-badge" id={`badge-${id}`}>—</span>
              </div>
            ))}
          </>}
          <div className="nav-section-label" style={{ marginTop: 12 }}>Analysis</div>
          <div className="nav-item" data-section="comparison" onClick={() => window.__showSection('comparison')}>
            <span className="nav-icon">📅</span> MoM Comparison
          </div>
          <div className="nav-item" data-section="cs-agent" onClick={() => { window.__showSection('cs-agent'); window.__loadCsAgent && window.__loadCsAgent(); }}>
            <span className="nav-icon">📊</span> CS Agent Analytics
          </div>
          <div className="sidebar-footer">
            <div id="last-run-time" style={{ fontSize: '.72rem', color: 'var(--text-3)', padding: '0 10px' }} />
          </div>
        </nav>

        <main id="main">
          <div id="print-header">
            <div className="ph-title">CS Dashboard — <span id="ph-section" /></div>
            <div className="ph-meta"><span id="ph-date" /></div>
          </div>
          <div id="section-overview" className="section-view active">
            <div id="welcome">
              <div className="welcome-logo">📊</div>
              <div className="welcome-title">Gorgias CS Dashboard</div>
              <div className="welcome-sub">Pull your customer service data from Gorgias and get instant reporting across all product lines, courier issues, ops faults, and refunds.</div>
              <button className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '.95rem' }} onClick={() => typeof window.__runReport === 'function' ? window.__runReport() : alert('Dashboard not ready — try refreshing')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Run Report
              </button>
            </div>
            <div id="overview-content" style={{ display: 'none' }} />
          </div>

          {['pool','arcade','pinball','kegerator','ledsigns','barfridge','courier','ops','refunds'].map(id => (
            <div key={id} id={`section-${id}`} className="section-view">
              <div id={`${id}-content`}>
                <div className="empty-state">
                  <div className="empty-state-msg">Run the report to load data</div>
                </div>
              </div>
            </div>
          ))}

          {customSections.map(({ id }) => (
            <div key={id} id={`section-${id}`} className="section-view">
              <div id={`${id}-content`}>
                <div className="empty-state"><div className="empty-state-msg">Run the report to load data</div></div>
              </div>
            </div>
          ))}

          <div id="section-comparison" className="section-view">
            <ComparisonSection authFetch={authFetch} />
          </div>

          <div id="section-cs-agent" className="section-view">
            <div id="cs-agent-content">
              <div className="empty-state"><div className="empty-state-msg">Click "CS Agent Analytics" to load</div></div>
            </div>
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

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          authFetch={authFetch}
          onSave={(cfg) => {
            setCustomSections(cfg.customSections || [])
            setTimeout(() => {
              if (window.__renderAll && window.__state && window.__state.hasData) window.__renderAll()
            }, 100)
          }}
        />
      )}
    </>
  )
}

// ── Settings Panel ────────────────────────────────────────────
const DEFAULT_DASH_CONFIG = {
  fieldNames: {
    PRODUCT: 'Product', REASON: 'Contact Reason', DAMAGE: 'Pool Table Damage',
    ARCADE_ISSUE: 'Arcade Machine Issue/Damage', PINBALL_ISSUE: 'Pinball Issue',
    BROKEN_GAMES: 'Broken Games', COURIER: 'Courier', RESOLUTION: 'Resolution',
    REFUND_VALUE: 'Refund Value', ORDER_NUMBER: 'Shopify/Warehouse Number',
  },
  pool: { product: 'CSLT Pool Tables', supplierReason: 'Item Damaged::Supplier Issue', courierReason: 'Item Damaged::Courier Fault' },
  arcade: { products: ['Upright Arcade', 'Cocktail Pro', 'Cocktail MKII'], reason: 'Item Not Working' },
  pinball: { products: ['Pinball Machine', 'Gearshift Pro'], reasons: ['Item Not Working', 'Item Damaged::Supplier Issue'] },
  courier: { reasons: ['Item Missing::Courier Fault', 'WISMO::Item Delayed::Courier Fault', 'WISMO::Wrong Address::Customer Fault', 'Item Damaged::Courier Fault'] },
  ops: { reasons: ['Item Missing::Picking Issue::Ops Mistake', 'WISMO::Tracking Not Supplied', 'WISMO::Item Delayed::Ops Delay', 'WISMO::Wrong Address::Ops Fault', 'Wrong Item Delivered::Ops Misorder'] },
  refunds: { refundValues: ['Refund', 'Partial Refund'], replacementValues: ['Free Product Upgrade', 'Free Gift', 'Replacement Sent'] },
  extraBlocks: { pool: [], arcade: [], pinball: [], courier: [], ops: [], refunds: [] },
  customSections: [],
}

function SettingsPanel({ onClose, authFetch, onSave }) {
  const [tab, setTab] = useState('fields')
  const [addingSection, setAddingSection] = useState(false)
  const [editingSectionIdx, setEditingSectionIdx] = useState(null)
  const [config, setConfig] = useState(() => {
    if (typeof window === 'undefined') return JSON.parse(JSON.stringify(DEFAULT_DASH_CONFIG))
    try { const s = localStorage.getItem('__dashConfig'); if (s) return JSON.parse(s) } catch(e) {}
    return JSON.parse(JSON.stringify(DEFAULT_DASH_CONFIG))
  })
  const [gorgiasFields, setGorgiasFields] = useState([])
  const [ticketValues, setTicketValues] = useState({})
  const [fetchingFields, setFetchingFields] = useState(false)

  useEffect(() => {
    setFetchingFields(true)
    authFetch('/api/custom-fields')
      .then(j => setGorgiasFields((j.data || []).filter(f => f.label).map(f => ({ id: f.id, label: f.label }))))
      .catch(() => {})
      .finally(() => setFetchingFields(false))
    // Load values from live ticket data if a report has been run
    const st = window.__state
    if (st && st.tickets && st.fieldMap) {
      const allTix = [...(st.tickets || []), ...(st.ticketsPrev || [])]
      const vals = {}
      Object.entries(st.fieldMap).forEach(([labelLower, id]) => {
        const set = new Set()
        allTix.forEach(t => {
          const v = t.custom_fields?.[String(id)]?.value
          if (v != null && v !== '' && String(v).toLowerCase() !== 'not set') set.add(String(v))
        })
        vals[labelLower] = [...set].sort()
      })
      setTicketValues(vals)
    }
  }, [])

  function upd(path, value) {
    setConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const parts = path.split('.')
      let obj = next
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]]
      obj[parts[parts.length - 1]] = value
      return next
    })
  }

  function save() {
    localStorage.setItem('__dashConfig', JSON.stringify(config))
    window.__dashConfig = config
    onSave(config)
    onClose()
  }

  function resetToDefaults() {
    if (!confirm('Reset all settings to defaults?')) return
    setConfig(JSON.parse(JSON.stringify(DEFAULT_DASH_CONFIG)))
  }

  function getTicketVals(fieldRole) {
    const label = (config.fieldNames[fieldRole] || '').toLowerCase()
    return ticketValues[label] || []
  }

  const reasonsAvail = getTicketVals('REASON')
  const productsAvail = getTicketVals('PRODUCT')
  const resolutionAvail = getTicketVals('RESOLUTION')

  const FIELD_ROLES = [
    { key: 'PRODUCT', label: 'Product field' },
    { key: 'REASON', label: 'Contact Reason field' },
    { key: 'DAMAGE', label: 'Pool Table Damage field' },
    { key: 'ARCADE_ISSUE', label: 'Arcade Issue/Damage field' },
    { key: 'PINBALL_ISSUE', label: 'Pinball Issue field' },
    { key: 'BROKEN_GAMES', label: 'Broken Games field' },
    { key: 'COURIER', label: 'Courier field' },
    { key: 'RESOLUTION', label: 'Resolution field' },
    { key: 'REFUND_VALUE', label: 'Refund Value field' },
    { key: 'ORDER_NUMBER', label: 'Order Number field' },
  ]

  const iStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: 6, padding: '7px 10px', fontFamily: 'var(--font-body)', fontSize: '.85rem', outline: 'none', width: '100%' }
  const secStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }
  const secTitle = { fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '.9rem', marginBottom: 12, color: 'var(--text-1)' }
  const fldLabel = { fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-2)', marginBottom: 6, marginTop: 12 }
  const TABS = [['fields','Field Mapping'],['pool','🎱 Pool'],['arcade','🕹 Arcades'],['pinball','🎰 Pinball'],['courier','🚚 Courier'],['ops','⚙️ Ops'],['refunds','💰 Refunds'],['sections','＋ Sections']]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:200, display:'flex', justifyContent:'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width:720, background:'var(--bg-card)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.1rem', display:'flex', alignItems:'center', gap:10 }}>
            ⚙️ Dashboard Settings
            {fetchingFields && <span style={{ fontSize:'.75rem', color:'var(--text-3)', fontWeight:400, fontFamily:'var(--font-body)' }}>loading fields…</span>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-2)', cursor:'pointer', fontSize:'1.2rem', padding:'4px 8px' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0, overflowX:'auto' }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:'10px 16px', fontSize:'.82rem', fontWeight: tab===id ? 600 : 400, color: tab===id ? 'var(--blue)' : 'var(--text-2)', cursor:'pointer', background:'none', border:'none', borderBottom: tab===id ? '2px solid var(--blue)' : '2px solid transparent', fontFamily:'var(--font-body)', whiteSpace:'nowrap', flexShrink:0 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* ── Field Mapping ── */}
          {tab === 'fields' && (
            <div>
              <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:16, lineHeight:1.6 }}>
                Map each dashboard role to the exact label of your Gorgias custom field. Case-insensitive. If you add or rename a field in Gorgias, update it here.
                {gorgiasFields.length > 0 && <span style={{ color:'var(--green)', marginLeft:8 }}>✓ {gorgiasFields.length} Gorgias fields loaded</span>}
              </p>
              {FIELD_ROLES.map(({ key, label }) => (
                <div key={key} style={{ display:'grid', gridTemplateColumns:'200px 1fr', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ fontSize:'.84rem', color:'var(--text-1)' }}>{label}</div>
                  {gorgiasFields.length > 0 ? (
                    <select value={config.fieldNames[key] || ''} onChange={e => upd('fieldNames.' + key, e.target.value)} style={{ ...iStyle, cursor:'pointer' }}>
                      <option value="">-- not mapped --</option>
                      {gorgiasFields.map(f => <option key={f.id} value={f.label}>{f.label}</option>)}
                      {config.fieldNames[key] && !gorgiasFields.find(f => f.label === config.fieldNames[key]) && (
                        <option value={config.fieldNames[key]}>{config.fieldNames[key]} (current)</option>
                      )}
                    </select>
                  ) : (
                    <input value={config.fieldNames[key] || ''} onChange={e => upd('fieldNames.' + key, e.target.value)} placeholder="e.g. Contact Reason" style={iStyle} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Pool Tables ── */}
          {tab === 'pool' && (
            <div>
              <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:16, lineHeight:1.6 }}>Configure the product name and contact reasons used for Pool Table damage reporting.</p>
              <div style={secStyle}>
                <div style={secTitle}>Product</div>
                <div style={fldLabel}>Product name (exact match from Gorgias)</div>
                <SPicker value={config.pool.product} available={productsAvail} onChange={v => upd('pool.product', v)} iStyle={iStyle} />
              </div>
              <div style={secStyle}>
                <div style={secTitle}>Contact Reasons</div>
                <div style={fldLabel}>Supplier issue reason</div>
                <SPicker value={config.pool.supplierReason} available={reasonsAvail} onChange={v => upd('pool.supplierReason', v)} iStyle={iStyle} />
                <div style={fldLabel}>Courier fault reason</div>
                <SPicker value={config.pool.courierReason} available={reasonsAvail} onChange={v => upd('pool.courierReason', v)} iStyle={iStyle} />
              </div>
              <ExtraBlocksSection sectionKey="pool" config={config} upd={upd} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} />
            </div>
          )}

          {/* ── Arcades ── */}
          {tab === 'arcade' && (
            <div>
              <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:16, lineHeight:1.6 }}>Configure which products and contact reason are tracked for Arcade reporting.</p>
              <div style={secStyle}>
                <div style={secTitle}>Products</div>
                <LEditor values={config.arcade.products} available={productsAvail} onChange={v => upd('arcade.products', v)} iStyle={iStyle} ph="e.g. Upright Arcade" />
              </div>
              <div style={secStyle}>
                <div style={secTitle}>Filter by Contact Reason (single)</div>
                <SPicker value={config.arcade.reason} available={reasonsAvail} onChange={v => upd('arcade.reason', v)} iStyle={iStyle} />
              </div>
              <ExtraBlocksSection sectionKey="arcade" config={config} upd={upd} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} />
            </div>
          )}

          {/* ── Pinball ── */}
          {tab === 'pinball' && (
            <div>
              <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:16, lineHeight:1.6 }}>Configure products and contact reasons for Kelvin Pinball reporting.</p>
              <div style={secStyle}>
                <div style={secTitle}>Products</div>
                <LEditor values={config.pinball.products} available={productsAvail} onChange={v => upd('pinball.products', v)} iStyle={iStyle} ph="e.g. Pinball Machine" />
              </div>
              <div style={secStyle}>
                <div style={secTitle}>Contact Reasons (filter)</div>
                <LEditor values={config.pinball.reasons} available={reasonsAvail} onChange={v => upd('pinball.reasons', v)} iStyle={iStyle} ph="e.g. Item Not Working" />
              </div>
              <ExtraBlocksSection sectionKey="pinball" config={config} upd={upd} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} />
            </div>
          )}

          {/* ── Courier ── */}
          {tab === 'courier' && (
            <div>
              <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:16, lineHeight:1.6 }}>These contact reasons determine which tickets appear in the Courier Issues section.</p>
              <div style={secStyle}>
                <div style={secTitle}>Courier Contact Reasons</div>
                <LEditor values={config.courier.reasons} available={reasonsAvail} onChange={v => upd('courier.reasons', v)} iStyle={iStyle} ph="e.g. Item Missing::Courier Fault" />
              </div>
              <ExtraBlocksSection sectionKey="courier" config={config} upd={upd} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} />
            </div>
          )}

          {/* ── Ops ── */}
          {tab === 'ops' && (
            <div>
              <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:16, lineHeight:1.6 }}>These contact reasons determine which tickets appear in the Ops Issues section.</p>
              <div style={secStyle}>
                <div style={secTitle}>Ops Contact Reasons</div>
                <LEditor values={config.ops.reasons} available={reasonsAvail} onChange={v => upd('ops.reasons', v)} iStyle={iStyle} ph="e.g. Item Missing::Picking Issue::Ops Mistake" />
              </div>
              <ExtraBlocksSection sectionKey="ops" config={config} upd={upd} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} />
            </div>
          )}

          {/* ── Refunds ── */}
          {tab === 'refunds' && (
            <div>
              <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:16, lineHeight:1.6 }}>Configure which Resolution field values count as refunds and replacements.</p>
              <div style={secStyle}>
                <div style={secTitle}>Refund Values</div>
                <LEditor values={config.refunds.refundValues} available={resolutionAvail} onChange={v => upd('refunds.refundValues', v)} iStyle={iStyle} ph="e.g. Refund" />
              </div>
              <div style={secStyle}>
                <div style={secTitle}>Replacement Values</div>
                <LEditor values={config.refunds.replacementValues} available={resolutionAvail} onChange={v => upd('refunds.replacementValues', v)} iStyle={iStyle} ph="e.g. Replacement Sent" />
              </div>
              <ExtraBlocksSection sectionKey="refunds" config={config} upd={upd} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} />
            </div>
          )}

          {/* ── Custom Sections ── */}
          {tab === 'sections' && (
            <div>
              <p style={{ color:'var(--text-2)', fontSize:'.85rem', marginBottom:16, lineHeight:1.6 }}>
                Create entirely new sidebar sections with custom breakdown blocks. Each section can optionally be scoped to a specific product.
              </p>
              {(config.customSections || []).map((section, i) => (
                editingSectionIdx === i ? (
                  <SectionForm key={section.id} section={section} gorgiasFields={gorgiasFields} productsAvail={productsAvail} ticketValues={ticketValues} iStyle={iStyle}
                    onSave={s => { const next=[...(config.customSections||[])]; next[i]=s; upd('customSections', next); setEditingSectionIdx(null) }}
                    onCancel={() => setEditingSectionIdx(null)} />
                ) : (
                  <div key={section.id} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 16px', marginBottom:10, display:'flex', alignItems:'center' }}>
                    <span style={{ fontSize:'1.3rem', marginRight:10 }}>{section.icon || '📊'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, color:'var(--text-1)', fontSize:'.9rem' }}>{section.label}</div>
                      <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:2 }}>{(section.blocks||[]).length} block{(section.blocks||[]).length !== 1 ? 's' : ''} · {section.productFilter ? 'Product: '+section.productFilter : 'All products'}</div>
                    </div>
                    <button onClick={() => setEditingSectionIdx(i)} style={{ background:'none', border:'none', color:'var(--blue)', cursor:'pointer', fontSize:'.82rem', padding:'4px 8px', fontFamily:'var(--font-body)' }}>Edit</button>
                    <button onClick={() => { if(confirm('Delete this section?')){ const next=[...(config.customSections||[])]; next.splice(i,1); upd('customSections', next) } }} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:'.82rem', padding:'4px 8px', fontFamily:'var(--font-body)' }}>Delete</button>
                  </div>
                )
              ))}
              {addingSection ? (
                <SectionForm section={{ id:'cs'+Date.now(), label:'', icon:'📊', subtitle:'', productFilter:'', blocks:[] }} gorgiasFields={gorgiasFields} productsAvail={productsAvail} ticketValues={ticketValues} iStyle={iStyle}
                  onSave={s => { upd('customSections', [...(config.customSections||[]), s]); setAddingSection(false) }}
                  onCancel={() => setAddingSection(false)} />
              ) : (
                <button onClick={() => setAddingSection(true)} style={{ background:'var(--bg-elevated)', border:'1px dashed var(--border)', color:'var(--blue)', borderRadius:8, padding:'14px 20px', cursor:'pointer', fontFamily:'var(--font-head)', fontSize:'.9rem', fontWeight:700, width:'100%' }}>
                  + Create New Section
                </button>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <button onClick={resetToDefaults} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-2)', borderRadius:6, padding:'8px 14px', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'.84rem' }}>
            Reset to Defaults
          </button>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:'.78rem', color:'var(--text-3)' }}>Saved to browser · persists across sessions</span>
            <button onClick={save} style={{ background:'var(--blue)', color:'#fff', border:'none', borderRadius:6, padding:'8px 20px', cursor:'pointer', fontFamily:'var(--font-body)', fontWeight:600, fontSize:'.9rem' }}>
              Save &amp; Apply
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Block Editor ─────────────────────────────────────────────
function BlockEditor({ block: init, gorgiasFields, ticketValues, iStyle, onSave, onCancel }) {
  const [b, setB] = useState(init)
  const fLabels = gorgiasFields.map(f => f.label)
  const filterValsAvail = b.filterField ? (ticketValues[(b.filterField||'').toLowerCase()] || []) : []
  const groupValsAvail  = b.groupField  ? (ticketValues[(b.groupField||'').toLowerCase()]  || []) : []
  function updB(k, v) { setB(p => ({...p, [k]: v})) }
  const lbl = { fontSize:'.72rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-2)', marginBottom:5, marginTop:10 }
  const secHd = { fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.82rem', color:'var(--text-2)', marginTop:14, marginBottom:2, paddingTop:12, borderTop:'1px solid var(--border-soft)' }
  const FieldSelect = ({ val, onChange, placeholder }) => fLabels.length > 0
    ? <select value={val||''} onChange={e=>onChange(e.target.value)} style={{...iStyle,cursor:'pointer'}}><option value="">-- none --</option>{fLabels.map(l=><option key={l} value={l}>{l}</option>)}{val&&!fLabels.includes(val)&&<option value={val}>{val} (current)</option>}</select>
    : <input value={val||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={iStyle} />
  return (
    <div style={{ background:'var(--bg-canvas)', border:'1px solid rgba(79,142,255,.3)', borderRadius:8, padding:16, marginTop:8 }}>

      {/* Title + colour */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div><div style={lbl}>Block Title *</div><input value={b.title||''} onChange={e=>updB('title',e.target.value)} placeholder="e.g. Warranty Claims" style={iStyle} /></div>
        <div><div style={lbl}>Dot Colour</div>
          <select value={b.dot||'dot-blue'} onChange={e=>updB('dot',e.target.value)} style={{...iStyle,cursor:'pointer'}}>
            {[['dot-blue','Blue'],['dot-green','Green'],['dot-amber','Amber'],['dot-red','Red'],['dot-purple','Purple'],['dot-cyan','Cyan']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* ── Filter section ── */}
      <div style={secHd}>Filter</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
        <div><div style={lbl}>Filter by Field</div><FieldSelect val={b.filterField} onChange={v=>updB('filterField',v)} placeholder="e.g. Contact Reason" /></div>
      </div>
      {b.filterField && (
        <div style={{ marginTop:8 }}>
          <div style={lbl}>Filter Values — navigate the tree and add the values to match</div>
          <LEditor values={b.filterValues||[]} available={filterValsAvail} onChange={v=>updB('filterValues',v)} iStyle={iStyle} ph="e.g. WISMO" />
        </div>
      )}

      {/* ── Group By section ── */}
      <div style={secHd}>Breakdown / Group By</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div><div style={lbl}>Group By Field</div><FieldSelect val={b.groupField} onChange={v=>updB('groupField',v)} placeholder="e.g. Contact Reason" /></div>
        <div><div style={lbl}>Column Header</div><input value={b.groupLabel||''} onChange={e=>updB('groupLabel',e.target.value)} placeholder={b.groupField||'Value'} style={iStyle} /></div>
      </div>
      {b.groupField && (
        <div style={{ marginTop:8 }}>
          <div style={lbl}>Group By Values — pick specific rows to show (leave empty to show all)</div>
          <LEditor values={b.groupValues||[]} available={groupValsAvail} onChange={v=>updB('groupValues',v)} iStyle={iStyle} ph="Leave empty to show all values" />
        </div>
      )}
      {b.groupField && !(b.groupValues||[]).length && (
        <div style={{ marginTop:8 }}>
          <div style={lbl}>Depth (when showing all values)</div>
          <select value={b.groupDepth||'full'} onChange={e=>updB('groupDepth',e.target.value)} style={{...iStyle,cursor:'pointer'}}>
            <option value="full">Full path</option>
            <option value="1">Level 1 only</option>
            <option value="2">Level 2 only</option>
            <option value="3">Level 3 only</option>
            <option value="last">Last segment only</option>
          </select>
        </div>
      )}

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
        <button onClick={onCancel} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-2)', borderRadius:6, padding:'7px 14px', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'.84rem' }}>Cancel</button>
        <button onClick={()=>b.title&&onSave(b)} disabled={!b.title} style={{ background:b.title?'var(--blue)':'var(--bg-elevated)', color:b.title?'#fff':'var(--text-3)', border:'none', borderRadius:6, padding:'7px 16px', cursor:b.title?'pointer':'default', fontFamily:'var(--font-body)', fontWeight:600, fontSize:'.84rem' }}>Save Block</button>
      </div>
    </div>
  )
}

// ── Extra Blocks Section (embedded in each section tab) ───────
function ExtraBlocksSection({ sectionKey, config, upd, gorgiasFields, ticketValues, iStyle }) {
  const [addingBlock, setAddingBlock] = useState(false)
  const [editingIdx, setEditingIdx] = useState(null)
  const blocks = config.extraBlocks?.[sectionKey] || []
  const newBlock = () => ({ id: 'b'+Date.now(), title:'', dot:'dot-blue', filterField:'', filterValues:[], groupField:'', groupLabel:'' })
  function saveBlock(idx, block) {
    const next=[...blocks]; if(idx===null) next.push(block); else next[idx]=block
    upd('extraBlocks.'+sectionKey, next); setAddingBlock(false); setEditingIdx(null)
  }
  function deleteBlock(idx) {
    if(!confirm('Delete this block?')) return
    const next=[...blocks]; next.splice(idx,1); upd('extraBlocks.'+sectionKey, next)
  }
  return (
    <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
      <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.88rem', marginBottom:6, color:'var(--text-1)' }}>Additional Blocks</div>
      <p style={{ color:'var(--text-2)', fontSize:'.82rem', marginBottom:10, lineHeight:1.5 }}>Add custom breakdown blocks to this section. Each block filters tickets and groups by a field of your choice.</p>
      {blocks.map((block, i) => (
        editingIdx === i
          ? <BlockEditor key={block.id} block={block} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} onSave={b=>saveBlock(i,b)} onCancel={()=>setEditingIdx(null)} />
          : <div key={block.id} style={{ display:'flex', alignItems:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 12px', marginBottom:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'.85rem', color:'var(--text-1)' }}>{block.title}</div>
                <div style={{ fontSize:'.73rem', color:'var(--text-3)', marginTop:2 }}>
                  {block.filterField&&`Filter: ${block.filterField}${block.filterValues?.length?` (${block.filterValues.length} value${block.filterValues.length>1?'s':''})`:''}  `}
                  {block.groupField&&`Group: ${block.groupField}`}
                </div>
              </div>
              <button onClick={()=>setEditingIdx(i)} style={{ background:'none', border:'none', color:'var(--blue)', cursor:'pointer', fontSize:'.82rem', padding:'4px 8px', fontFamily:'var(--font-body)' }}>Edit</button>
              <button onClick={()=>deleteBlock(i)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:'.82rem', padding:'4px 8px', fontFamily:'var(--font-body)' }}>Delete</button>
            </div>
      ))}
      {addingBlock
        ? <BlockEditor block={newBlock()} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} onSave={b=>saveBlock(null,b)} onCancel={()=>setAddingBlock(false)} />
        : <button onClick={()=>setAddingBlock(true)} style={{ background:'var(--bg-elevated)', border:'1px dashed var(--border)', color:'var(--text-2)', borderRadius:6, padding:'8px 16px', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'.83rem', width:'100%', marginTop:4 }}>+ Add Block</button>
      }
    </div>
  )
}

// ── Section Form (create / edit a custom top-level section) ───
function SectionForm({ section: init, gorgiasFields, productsAvail, ticketValues, iStyle, onSave, onCancel }) {
  const [s, setS] = useState(init)
  const [addingBlock, setAddingBlock] = useState(false)
  const [editingBlockIdx, setEditingBlockIdx] = useState(null)
  function updS(k,v){ setS(p=>({...p,[k]:v})) }
  const newBlock = () => ({ id:'b'+Date.now(), title:'', dot:'dot-blue', filterField:'', filterValues:[], groupField:'', groupLabel:'' })
  function saveBlock(idx, block) {
    const next=[...(s.blocks||[])]; if(idx===null) next.push(block); else next[idx]=block
    setS(p=>({...p, blocks:next})); setAddingBlock(false); setEditingBlockIdx(null)
  }
  function deleteBlock(idx) {
    if(!confirm('Delete this block?')) return
    const next=[...(s.blocks||[])]; next.splice(idx,1); setS(p=>({...p, blocks:next}))
  }
  const lbl = { fontSize:'.72rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-2)', marginBottom:5, marginTop:10 }
  return (
    <div style={{ background:'var(--bg-canvas)', border:'1px solid rgba(79,142,255,.3)', borderRadius:8, padding:16, marginBottom:12 }}>
      <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.95rem', marginBottom:12 }}>{init.label?`Edit: ${init.label}`:'New Section'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'64px 1fr 1fr', gap:12 }}>
        <div><div style={lbl}>Icon</div><input value={s.icon||''} onChange={e=>updS('icon',e.target.value)} placeholder="📊" style={{...iStyle,textAlign:'center',fontSize:'1.2rem'}} /></div>
        <div><div style={lbl}>Section Label *</div><input value={s.label||''} onChange={e=>updS('label',e.target.value)} placeholder="e.g. Warranties" style={iStyle} /></div>
        <div><div style={lbl}>Subtitle</div><input value={s.subtitle||''} onChange={e=>updS('subtitle',e.target.value)} placeholder="e.g. Warranty claims across all products" style={iStyle} /></div>
      </div>
      <div style={{ marginTop:8 }}>
        <div style={lbl}>Product Filter (optional — leave blank for all products)</div>
        {productsAvail.length>0
          ? <select value={s.productFilter||''} onChange={e=>updS('productFilter',e.target.value)} style={{...iStyle,cursor:'pointer'}}><option value="">All products</option>{productsAvail.map(v=><option key={v} value={v}>{v}</option>)}{s.productFilter&&!productsAvail.includes(s.productFilter)&&<option value={s.productFilter}>{s.productFilter} (current)</option>}</select>
          : <input value={s.productFilter||''} onChange={e=>updS('productFilter',e.target.value)} placeholder="Leave blank for all, or e.g. CSLT Pool Tables" style={iStyle} />
        }
      </div>
      <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)' }}>
        <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'.85rem', marginBottom:8 }}>Blocks ({(s.blocks||[]).length})</div>
        {(s.blocks||[]).map((block,i)=>(
          editingBlockIdx===i
            ? <BlockEditor key={block.id} block={block} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} onSave={b=>saveBlock(i,b)} onCancel={()=>setEditingBlockIdx(null)} />
            : <div key={block.id} style={{ display:'flex', alignItems:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 12px', marginBottom:6 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'.84rem' }}>{block.title}</div>
                  <div style={{ fontSize:'.73rem', color:'var(--text-3)', marginTop:2 }}>
                    {block.filterField&&`Filter: ${block.filterField}${block.filterValues?.length?` (${block.filterValues.length} values)`:''}`}
                    {block.groupField&&` · Group: ${block.groupField}`}
                  </div>
                </div>
                <button onClick={()=>setEditingBlockIdx(i)} style={{ background:'none', border:'none', color:'var(--blue)', cursor:'pointer', fontSize:'.8rem', padding:'4px 6px', fontFamily:'var(--font-body)' }}>Edit</button>
                <button onClick={()=>deleteBlock(i)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:'.8rem', padding:'4px 6px', fontFamily:'var(--font-body)' }}>✕</button>
              </div>
        ))}
        {addingBlock
          ? <BlockEditor block={newBlock()} gorgiasFields={gorgiasFields} ticketValues={ticketValues} iStyle={iStyle} onSave={b=>saveBlock(null,b)} onCancel={()=>setAddingBlock(false)} />
          : <button onClick={()=>setAddingBlock(true)} style={{ background:'var(--bg-elevated)', border:'1px dashed var(--border)', color:'var(--text-2)', borderRadius:6, padding:'8px 16px', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'.83rem', width:'100%' }}>+ Add Block to this Section</button>
        }
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)' }}>
        <button onClick={onCancel} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-2)', borderRadius:6, padding:'7px 14px', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'.84rem' }}>Cancel</button>
        <button onClick={()=>s.label&&onSave(s)} disabled={!s.label} style={{ background:s.label?'var(--blue)':'var(--bg-elevated)', color:s.label?'#fff':'var(--text-3)', border:'none', borderRadius:6, padding:'7px 16px', cursor:s.label?'pointer':'default', fontFamily:'var(--font-body)', fontWeight:600, fontSize:'.84rem' }}>Save Section</button>
      </div>
    </div>
  )
}

// ── List Editor (tree-aware, drag-to-reorder) ────────────────
function LEditor({ values, available, onChange, iStyle, ph }) {
  const [newVal, setNewVal] = useState('')
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [path, setPath] = useState([])

  const hasHierarchy = (available || []).some(v => v.includes('::'))
  const notActive = (available || []).filter(v => !values.includes(v))

  // Build tree from :: separated values
  function buildTree(vals) {
    const tree = {}
    vals.forEach(v => {
      const parts = v.split('::')
      let node = tree
      parts.forEach(part => {
        if (!node[part]) node[part] = { _allVals: [], _children: {} }
        node[part]._allVals.push(v)
        node = node[part]._children
      })
    })
    return tree
  }
  const tree = hasHierarchy ? buildTree(available || []) : {}
  function getAtPath(p) {
    let node = tree
    for (const seg of p) { node = (node[seg] && node[seg]._children) ? node[seg]._children : {} }
    return node
  }
  const currentNode = getAtPath(path)
  const treeItems = Object.keys(currentNode).sort()
  const currentPrefix = path.join('::')
  function fullKey(item) { return path.length > 0 ? path.join('::') + '::' + item : item }

  function add(v) { const t = v.trim(); if (t && !values.includes(t)) onChange([...values, t]) }
  function remove(v) { onChange(values.filter(x => x !== v)) }
  function onDS(i) { setDragIdx(i) }
  function onDO(e, i) { e.preventDefault(); setDragOver(i) }
  function onDrop(i) {
    if (dragIdx !== null && dragIdx !== i) {
      const next = [...values]; const [item] = next.splice(dragIdx, 1); next.splice(i, 0, item); onChange(next)
    }
    setDragIdx(null); setDragOver(null)
  }

  const boxStyle = { background:'var(--bg-canvas)', border:'1px solid var(--border)', borderRadius:6, minHeight:80, maxHeight:200, overflowY:'auto', padding:6, marginBottom:8 }
  const colHd = { fontSize:'.7rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--text-3)', marginBottom:6 }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:8 }}>
      {/* Left: Tree browser or flat list */}
      <div>
        <div style={colHd}>{hasHierarchy ? 'Browse Values' : 'Available from ticket data'}{' '}{!(available||[]).length && '(run report first)'}</div>

        {/* Breadcrumb for tree mode */}
        {hasHierarchy && (
          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:6, flexWrap:'wrap', fontSize:'.74rem', minHeight:18 }}>
            <span onClick={() => setPath([])} style={{ color: path.length ? 'var(--blue)' : 'var(--text-3)', cursor: path.length ? 'pointer' : 'default', fontWeight:600 }}>All</span>
            {path.map((seg, i) => (
              <React.Fragment key={i}>
                <span style={{ color:'var(--text-3)' }}>›</span>
                <span onClick={() => setPath(path.slice(0, i+1))}
                  style={{ color: i === path.length-1 ? 'var(--text-1)' : 'var(--blue)', cursor: i < path.length-1 ? 'pointer' : 'default', maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {seg}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        <div style={boxStyle}>
          {/* Tree items */}
          {hasHierarchy && !treeItems.length && (
            <div style={{ color:'var(--text-3)', fontSize:'.8rem', padding:'6px', fontStyle:'italic' }}>
              {!(available||[]).length ? 'Run a report to populate values' : 'No items at this level'}
            </div>
          )}
          {hasHierarchy && treeItems.map(item => {
            const fk = fullKey(item)
            const children = (currentNode[item] && currentNode[item]._children) ? currentNode[item]._children : {}
            const hasChildren = Object.keys(children).length > 0
            const count = currentNode[item]?._allVals?.length || 0
            const isSelected = values.includes(fk)
            return (
              <div key={item} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 8px', borderRadius:4, marginBottom:2, background:'var(--bg-elevated)', fontSize:'.83rem', opacity: isSelected ? 0.6 : 1 }}>
                <span onClick={() => { if(hasChildren) setPath([...path, item]) }}
                  style={{ color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, cursor: hasChildren ? 'pointer' : 'default' }}
                  onMouseEnter={e => { if(hasChildren) e.currentTarget.style.color='var(--blue)' }}
                  onMouseLeave={e => e.currentTarget.style.color='var(--text-1)'}>
                  {hasChildren ? '▸ ' : '\u00a0\u00a0'}{item}
                  <span style={{ color:'var(--text-3)', marginLeft:4, fontSize:'.7rem' }}>({count})</span>
                </span>
                <span onClick={() => { if(!isSelected) add(fk) }}
                  style={{ color: isSelected ? 'var(--green)' : 'var(--blue)', fontSize:'.7rem', flexShrink:0, marginLeft:6, cursor: isSelected ? 'default' : 'pointer', fontWeight:600 }}>
                  {isSelected ? '✓' : '+ add'}
                </span>
              </div>
            )
          })}

          {/* Flat items (no hierarchy) */}
          {!hasHierarchy && !notActive.length && (
            <div style={{ color:'var(--text-3)', fontSize:'.8rem', padding:'6px', fontStyle:'italic' }}>
              {!(available||[]).length ? 'Run a report to populate this list' : 'All available values are already active'}
            </div>
          )}
          {!hasHierarchy && notActive.map(v => (
            <div key={v} onClick={() => add(v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 8px', borderRadius:4, cursor:'pointer', marginBottom:2, background:'var(--bg-elevated)', fontSize:'.83rem' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background='var(--bg-elevated)'}>
              <span style={{ color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{v}</span>
              <span style={{ color:'var(--blue)', fontSize:'.72rem', flexShrink:0, marginLeft:6 }}>+ add</span>
            </div>
          ))}
        </div>

        {/* "Add all at this path" shortcut for tree mode */}
        {hasHierarchy && currentPrefix && !values.includes(currentPrefix) && treeItems.length > 0 && (
          <button onClick={() => add(currentPrefix)}
            style={{ background:'var(--blue-soft)', border:'1px solid rgba(79,142,255,.3)', color:'var(--blue)', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'.76rem', width:'100%', marginBottom:6 }}>
            + Add all "{path[path.length-1]}" as prefix match
          </button>
        )}

        <div style={{ display:'flex', gap:6 }}>
          <input value={newVal} onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { add(newVal); setNewVal('') } }}
            placeholder={ph || 'Type value and press Enter…'} style={{ ...iStyle, flex:1 }} />
          <button onClick={() => { add(newVal); setNewVal('') }}
            style={{ background:'var(--blue)', color:'#fff', border:'none', borderRadius:6, padding:'0 12px', cursor:'pointer', fontSize:'.84rem', flexShrink:0, fontFamily:'var(--font-body)' }}>Add</button>
        </div>
      </div>

      {/* Right: Active */}
      <div>
        <div style={colHd}>Active ({values.length}) — drag to reorder</div>
        <div style={boxStyle}>
          {!values.length && <div style={{ color:'var(--text-3)', fontSize:'.8rem', padding:'6px', fontStyle:'italic' }}>No active values — add from the left</div>}
          {values.map((v, i) => (
            <div key={v} draggable
              onDragStart={() => onDS(i)} onDragOver={e => onDO(e, i)} onDrop={() => onDrop(i)} onDragEnd={() => { setDragIdx(null); setDragOver(null) }}
              style={{ display:'flex', alignItems:'center', padding:'6px 8px', borderRadius:4, cursor:'grab', marginBottom:2, fontSize:'.83rem', background: dragOver===i ? 'var(--blue-soft)' : 'var(--bg-elevated)', border: dragOver===i ? '1px solid rgba(79,142,255,.3)' : '1px solid transparent', transition:'background .1s' }}>
              <span style={{ color:'var(--text-3)', marginRight:8, cursor:'grab' }}>⠿</span>
              <span style={{ flex:1, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
              <button onClick={() => remove(v)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', padding:'0 4px', fontSize:'.9rem', flexShrink:0 }}>✕</button>
            </div>
          ))}
        </div>
        {hasHierarchy && <div style={{ fontSize:'.7rem', color:'var(--text-3)', lineHeight:1.5, marginTop:2 }}>▸ prefix items match all sub-levels. e.g. "WISMO" matches "WISMO::Item Delayed::Ops fault"</div>}
      </div>
    </div>
  )
}

// ── Single Value Picker ───────────────────────────────────────
function SPicker({ value, available, onChange, iStyle }) {
  if (available && available.length > 0) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...iStyle, cursor:'pointer' }}>
        {available.map(v => <option key={v} value={v}>{v}</option>)}
        {value && !available.includes(value) && <option value={value}>{value} (current)</option>}
      </select>
    )
  }
  return <input value={value || ''} onChange={e => onChange(e.target.value)} style={iStyle} />
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
.error-banner{position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#2a0a0a;border:1px solid var(--red);color:#ff6b6b;border-radius:8px;padding:14px 20px;font-size:.88rem;display:none;z-index:999;box-shadow:0 4px 24px rgba(0,0,0,.6);max-width:600px;white-space:nowrap}
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
table.csa-table{width:100%;border-collapse:collapse;font-size:.85rem}table.csa-table td{padding:9px 12px;border-bottom:1px solid var(--border-soft);color:var(--text-1);vertical-align:middle}table.csa-table tr:hover>td{background:var(--bg-2)}table.csa-table td:first-child{font-weight:500}
/* Ticket drill-down */
.drill-row-hdr{cursor:pointer;transition:background .12s}.drill-row-hdr:hover td{background:var(--bg-elevated)!important}.drill-arrow{font-size:.65rem;color:var(--text-3);transition:transform .15s;display:inline-block;margin-left:5px}.drill-arrow.open{transform:rotate(90deg)}.drill-content{display:none}.drill-content.open{display:table-row}.drill-content>td{padding:0!important;border-bottom:1px solid var(--border)}.drill-list{background:var(--bg-elevated)}.drill-item{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:7px 16px;border-bottom:1px solid var(--border-soft);font-size:.78rem}.drill-item:last-child{border-bottom:none}.drill-item a{color:var(--blue);text-decoration:none;font-family:var(--font-data);font-size:.73rem}.drill-item a:hover{text-decoration:underline}.drill-sep{color:var(--border);margin:0 1px}.drill-reason{color:var(--text-2)}.drill-res{color:var(--green);font-size:.75rem}
.dot-blue{background:var(--blue)}.dot-green{background:var(--green)}.dot-amber{background:var(--amber)}.dot-red{background:var(--red)}.dot-purple{background:var(--purple)}.dot-cyan{background:var(--cyan)}
/* AI Report */
.ai-report-body{line-height:1.7;font-size:.9rem;color:var(--text-1)}
.ai-report-body h2{font-family:var(--font-head);font-size:1.1rem;font-weight:800;color:var(--text-1);margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.ai-report-body h2:first-child{margin-top:0}
.ai-report-body h3{font-size:.9rem;font-weight:700;color:var(--blue);margin:12px 0 4px}
.ai-report-body ul{padding-left:20px;margin:6px 0}
.ai-report-body li{margin-bottom:4px}
.ai-report-body strong{color:var(--text-1)}
.ai-report-body p{margin-bottom:10px}
.ai-report-body .priority-pill{display:inline-block;background:var(--red-soft);color:var(--red);border-radius:4px;padding:1px 7px;font-size:.72rem;font-weight:700;margin-right:6px}
.ai-generate-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;background:linear-gradient(135deg,#4f8eff,#a78bfa);color:#fff;border:none;border-radius:8px;font-family:var(--font-body);font-size:.95rem;font-weight:600;cursor:pointer;transition:opacity .15s,transform .1s}
.ai-generate-btn:hover{opacity:.88}.ai-generate-btn:active{transform:scale(.97)}
.ai-generate-btn:disabled{opacity:.45;cursor:not-allowed}
.ai-thinking{display:flex;align-items:center;gap:10px;color:var(--text-2);font-size:.88rem;padding:20px 0}
.ai-thinking .spin{border-top-color:var(--purple)}
/* Print styles */
@media print{
  :root{--bg:#fff;--bg-canvas:#fff;--bg-card:#fff;--bg-elevated:#f4f4f4;--bg-hover:#eee;--border:#d0d0d0;--border-soft:#e4e4e4;--text-1:#111;--text-2:#444;--text-3:#777;--blue:#2563eb;--green:#15803d;--amber:#b45309;--red:#dc2626;--purple:#7c3aed;--cyan:#0891b2;--blue-soft:#dbeafe;--green-soft:#dcfce7;--amber-soft:#fef9c3;--red-soft:#fee2e2;--purple-soft:#ede9fe;--cyan-soft:#cffafe}
  html,body{overflow:visible!important;height:auto!important;background:#fff!important}
  #app{display:block!important;height:auto!important}
  #topbar,#sidebar,#loading-overlay{display:none!important}
  #main{overflow:visible!important;padding:16px 24px!important;background:#fff!important;grid-column:1!important}
  .section-view{display:none!important}
  .section-view.active{display:block!important}
  .ticket-list-wrap{max-height:none!important;overflow:visible!important}
  .data-table-wrap{overflow:visible!important}
  .section-block{page-break-inside:avoid;box-shadow:none!important;border:1px solid #d0d0d0!important}
  .section-block-body.collapsed{display:block!important}
  .section-block-header{background:#f8f8f8!important;border-bottom:1px solid #d0d0d0!important}
  .stats-grid{page-break-inside:avoid}
  .blocks-2col{page-break-inside:avoid}
  .stat-card{border:1px solid #d0d0d0!important;background:#fff!important;box-shadow:none!important;page-break-inside:avoid}
  table.data-table th{background:#f4f4f4!important;color:#333!important}
  table.data-table tr:hover td{background:transparent!important}
  .summary-bar{background:#f4f4f4!important;border:1px solid #d0d0d0!important}
  .inline-stats{border-bottom:1px solid #eee;padding-bottom:12px}
  .page-header{page-break-after:avoid}
  #print-header{display:flex!important}
  .agent-filter-bar{display:none!important}
}
#print-header{display:none;align-items:center;justify-content:space-between;padding:0 0 16px;margin-bottom:16px;border-bottom:2px solid #111;font-family:var(--font-head)}
#print-header .ph-title{font-size:1.1rem;font-weight:800}
#print-header .ph-meta{font-size:.8rem;color:#555}
`

// ── Config — reads from window.__dashConfig (set by SettingsPanel) with fallbacks ──
const _DC={fieldNames:{PRODUCT:'Product',REASON:'Contact Reason',DAMAGE:'Pool Table Damage',ARCADE_ISSUE:'Arcade Machine Issue/Damage',PINBALL_ISSUE:'Pinball Issue',BROKEN_GAMES:'Broken Games',COURIER:'Courier',RESOLUTION:'Resolution',REFUND_VALUE:'Refund Value',ORDER_NUMBER:'Shopify/Warehouse Number'},pool:{product:'CSLT Pool Tables',supplierReason:'Item Damaged::Supplier Issue',courierReason:'Item Damaged::Courier Fault'},arcade:{products:['Upright Arcade','Cocktail Pro','Cocktail MKII'],reason:'Item Not Working'},pinball:{products:['Pinball Machine','Gearshift Pro'],reasons:['Item Not Working','Item Damaged::Supplier Issue']},kegerator:{products:['GEN2.0']},courier:{reasons:['Item Missing::Courier Fault','WISMO::Item Delayed::Courier Fault','WISMO::Wrong Address::Customer Fault','Item Damaged::Courier Fault']},ops:{reasons:['Item Missing::Picking Issue::Ops Mistake','WISMO::Tracking Not Supplied','WISMO::Item Delayed::Ops Delay','WISMO::Wrong Address::Ops Fault','Wrong Item Delivered::Ops Misorder']},refunds:{refundValues:['Refund','Partial Refund'],replacementValues:['Free Product Upgrade','Free Gift','Replacement Sent']}};
let FIELD_NAMES,POOL_PRODUCT,REASON_SUPPLIER,REASON_COURIER_POOL,ARCADE_PRODUCTS,ARCADE_REASON,KELVIN_PRODUCTS,KELVIN_REASONS,KEG_PRODUCTS,COURIER_REASONS,OPS_REASONS,REFUND_VALUES,REPLACEMENT_VALUES;
function loadConfig(){const c=window.__dashConfig||_DC;const fn=c.fieldNames||_DC.fieldNames;FIELD_NAMES={PRODUCT:fn.PRODUCT||_DC.fieldNames.PRODUCT,REASON:fn.REASON||_DC.fieldNames.REASON,DAMAGE:fn.DAMAGE||_DC.fieldNames.DAMAGE,ARCADE_ISSUE:fn.ARCADE_ISSUE||_DC.fieldNames.ARCADE_ISSUE,PINBALL_ISSUE:fn.PINBALL_ISSUE||_DC.fieldNames.PINBALL_ISSUE,BROKEN_GAMES:fn.BROKEN_GAMES||_DC.fieldNames.BROKEN_GAMES,COURIER:fn.COURIER||_DC.fieldNames.COURIER,RESOLUTION:fn.RESOLUTION||_DC.fieldNames.RESOLUTION,REFUND_VALUE:fn.REFUND_VALUE||_DC.fieldNames.REFUND_VALUE,ORDER_NUMBER:fn.ORDER_NUMBER||_DC.fieldNames.ORDER_NUMBER};POOL_PRODUCT=(c.pool&&c.pool.product)||_DC.pool.product;REASON_SUPPLIER=(c.pool&&c.pool.supplierReason)||_DC.pool.supplierReason;REASON_COURIER_POOL=(c.pool&&c.pool.courierReason)||_DC.pool.courierReason;ARCADE_PRODUCTS=(c.arcade&&c.arcade.products)||_DC.arcade.products;ARCADE_REASON=(c.arcade&&c.arcade.reason)||_DC.arcade.reason;KELVIN_PRODUCTS=(c.pinball&&c.pinball.products)||_DC.pinball.products;KELVIN_REASONS=(c.pinball&&c.pinball.reasons)||_DC.pinball.reasons;KEG_PRODUCTS=(c.kegerator&&c.kegerator.products)||_DC.kegerator.products;COURIER_REASONS=(c.courier&&c.courier.reasons)||_DC.courier.reasons;OPS_REASONS=(c.ops&&c.ops.reasons)||_DC.ops.reasons;REFUND_VALUES=(c.refunds&&c.refunds.refundValues)||_DC.refunds.refundValues;REPLACEMENT_VALUES=(c.refunds&&c.refunds.replacementValues)||_DC.refunds.replacementValues;}
// ── Collapsible blocks ───────────────────────────────────────
let collapseState={};
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
let agentFilter=[];// [] = all agents shown
function toggleAgent(name){
  if(name==='__all'){agentFilter=[];}
  else if(agentFilter.includes(name)){agentFilter=agentFilter.filter(a=>a!==name);}
  else{agentFilter=[...agentFilter,name];}
  renderOverview();
}
function getAgentName(t){return(t.assignee_user&&t.assignee_user.name)||'Unassigned';}

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
// Prefix-aware match: "WISMO" matches "WISMO::Item Delayed::Ops fault"
function matchesValue(fieldVal,filterVal){const f=fieldVal.toLowerCase().trim();const v=filterVal.toLowerCase().trim();return f===v||f.startsWith(v+'::');}

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
    window.__state=state;
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
  }catch(e){
    console.error('runReport error:',e);
    addLog('✗ Error: '+e.message,'err');
    barEl.style.background='var(--red)';
    errBanner.textContent='Report failed: '+e.message;
    errBanner.classList.add('visible');
    // Keep overlay open for 4s so user can read the error
    setTimeout(()=>showLoading(false),4000);
  }
  btn.disabled=false;
}

function updateBadges(){document.getElementById('badge-overview').textContent=state.tickets.length;}

// ── Dynamic block renderer ─────────────────────────────────────
function renderDynamicBlock(block,tickets,ticketsPrev,fieldMap){
  if(!block||!block.title)return'';
  let tix=tickets,prev=ticketsPrev;
  if(block.filterField&&block.filterValues&&block.filterValues.length){
    const fid=fieldMap[block.filterField.toLowerCase()];
    if(fid){tix=tickets.filter(t=>block.filterValues.some(v=>matchesValue(getFieldById(t,fid),v)));prev=ticketsPrev.filter(t=>block.filterValues.some(v=>matchesValue(getFieldById(t,fid),v)));}
  }
  const gfid=block.groupField?fieldMap[block.groupField.toLowerCase()]:null;
  // Depth truncation helper (used when no explicit groupValues)
  function groupKey(t){
    const raw=getFieldById(t,gfid);
    const d=block.groupDepth;
    if(!d||d==='full')return raw;
    const parts=raw.split('::');
    if(d==='last')return parts[parts.length-1];
    const n=parseInt(d);return parts.slice(0,n).join('::');
  }
  const sc=statusCounts(tix);const avg=avgResHours(tix);
  // If explicit groupValues set, use them as rows with prefix matching
  let byGroup,prevByGroup;
  if(gfid&&block.groupValues&&block.groupValues.length){
    byGroup=block.groupValues.map(gv=>[gv,tix.filter(t=>matchesValue(getFieldById(t,gfid),gv))]).filter(([,r])=>r.length>0);
    prevByGroup={};block.groupValues.forEach(gv=>{prevByGroup[gv]=prev.filter(t=>matchesValue(getFieldById(t,gfid),gv));});
  }else{
    byGroup=gfid?sortedEntries(groupBy(tix,t=>groupKey(t))):[];
    prevByGroup=gfid?groupBy(prev,t=>groupKey(t)):{};
  }
  const bodyHtml=(gfid&&byGroup.length)?breakdownTable(byGroup,esc(block.groupLabel||block.groupField||'Value'),label=>(prevByGroup[label]||[])):inlineStats(tix,prev,state.tickets.length);
  return sectionBlock({title:esc(block.title)+' <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+tix.length+'</span> '+deltaChip(tix.length,prev.length,true),subtitle:tix.length+' tickets · prev: '+prev.length,dot:block.dot||'dot-blue',summaryItems:[{val:tix.length,label:'Total'},{val:sc.open,label:'Open',color:'var(--amber)'},{val:sc.closed,label:'Closed',color:'var(--green)'},{val:sc.pending,label:'Pending',color:'var(--purple)'},{val:avg?avg+'h':'—',label:'Avg Res.'},{val:deltaChip(tix.length,prev.length,true)||'—',label:'vs Prev'}],bodyHtml:bodyHtml});
}

// ── Render extra blocks for an existing section ────────────────
function renderExtraBlocks(sectionKey){
  const{tickets,ticketsPrev,fieldMap}=state;
  const extra=(window.__dashConfig&&window.__dashConfig.extraBlocks&&window.__dashConfig.extraBlocks[sectionKey])||[];
  if(!extra.length)return'';
  return extra.map(block=>renderDynamicBlock(block,tickets,ticketsPrev,fieldMap)).join('');
}

// ── Render all custom top-level sections ──────────────────────
function renderCustomSections(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const sections=(window.__dashConfig&&window.__dashConfig.customSections)||[];
  sections.forEach(section=>{
    const el=document.getElementById(section.id+'-content');if(!el)return;
    const badge=document.getElementById('badge-'+section.id);
    let tix=tickets,prev=ticketsPrev;
    if(section.productFilter){const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];if(pid){tix=tickets.filter(t=>getFieldById(t,pid).toLowerCase()===section.productFilter.toLowerCase());prev=ticketsPrev.filter(t=>getFieldById(t,pid).toLowerCase()===section.productFilter.toLowerCase());}}
    if(badge)badge.textContent=tix.length;
    let html='<div class="page-header"><div><div class="page-title">'+(section.icon||'📊')+' '+esc(section.label)+'</div><div class="page-subtitle">'+esc(section.subtitle||'')+'</div></div><div class="period-badge">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
    (section.blocks||[]).forEach(block=>{html+=renderDynamicBlock(block,tix,prev,fieldMap);});
    if(!(section.blocks&&section.blocks.length))html+='<div class="empty-state"><div class="empty-state-msg">No blocks configured — open ⚙️ Settings to add breakdown blocks to this section</div></div>';
    el.innerHTML=html;
  });
}

function renderAll(){
  loadConfig();
  renderOverview();renderPool();renderArcade();renderPinball();renderKegerators();renderLEDBars();renderBarFridges();renderCourier();renderOps();renderRefunds();renderCustomSections();updateBadges();
  document.getElementById('welcome').style.display='none';
  document.getElementById('overview-content').style.display='block';
  // Wire up collapsible block headers + agent filter chips via event delegation
  if(!window.__blockDelegationSet){
    window.__blockDelegationSet=true;
    document.getElementById('main').addEventListener('click',function(e){
      const hdr=e.target.closest('[data-block-id]');
      if(hdr){toggleBlock(hdr.getAttribute('data-block-id'));return;}
      const agentChip=e.target.closest('[data-agent]');
      if(agentChip){toggleAgent(agentChip.getAttribute('data-agent'));return;}
      const drillHdr=e.target.closest('[data-drill-id]');
      if(drillHdr){
        const did=drillHdr.getAttribute('data-drill-id');
        const cnt=document.getElementById('dcnt-'+did);
        const arr=document.getElementById('darr-'+did);
        if(cnt)cnt.classList.toggle('open');
        if(arr)arr.classList.toggle('open');
        return;
      }
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

// ── Ticket drill-down helpers ─────────────────────────────────
let _drillId=0;
function ticketDrillHtml(tickets,fieldMap){
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const resfid=fieldMap[FIELD_NAMES.RESOLUTION.toLowerCase()];
  if(!tickets.length)return'<div style="padding:8px 16px;font-size:.8rem;color:var(--text-3)">No tickets</div>';
  return'<div class="drill-list">'+[...tickets].sort((a,b)=>new Date(b.created_datetime)-new Date(a.created_datetime)).map(t=>{
    const cust=esc((t.customer?.name)||'Unknown');
    const reason=esc(getFieldById(t,rid));
    const resolution=getFieldById(t,resfid);
    const status=t.status||'open';
    const sc=status==='closed'?'tag-closed':status==='pending'?'tag-pending':'tag-open';
    const date=t.created_datetime?new Date(t.created_datetime).toLocaleDateString('en-AU'):'—';
    const url='https://amanandhiscave.gorgias.com/conversations/'+t.id;
    return'<div class="drill-item">'+
      '<a href="'+url+'" target="_blank" rel="noopener">#'+t.id+'</a>'+
      '<span class="drill-sep">·</span>'+
      '<span style="font-weight:500">'+cust+'</span>'+
      '<span class="drill-sep">·</span>'+
      '<span class="drill-reason">'+reason+'</span>'+
      (resolution&&resolution!=='Not Set'?'<span class="drill-sep">→</span><span class="drill-res">'+esc(resolution)+'</span>':'')+
      '<span style="margin-left:auto;display:flex;align-items:center;gap:8px">'+
      '<span class="tag '+sc+'">'+status+'</span>'+
      '<span style="font-size:.72rem;color:var(--text-3)">'+date+'</span>'+
      '</span></div>';
  }).join('')+'</div>';
}

function expandableBreakdownTable(currRows,col1,prevTicketsFn,fieldMap){
  if(!currRows.length)return'<div class="empty-state" style="padding:16px"><div class="empty-state-msg">No tickets matched</div></div>';
  const hasPrev=!!prevTicketsFn;
  const cols=6+(hasPrev?2:0);
  let html='<div class="data-table-wrap"><table class="data-table"><thead><tr>'+
    '<th>'+esc(col1)+' <span style="font-size:.6rem;opacity:.45;font-weight:400">▸ click row to expand</span></th><th>Count</th>'+
    (hasPrev?'<th style="color:var(--text-3)">Prev</th><th>Δ</th>':'')+
    '<th>Open</th><th>Closed</th><th>Pending</th><th>Avg Res.</th></tr></thead><tbody>';
  let gt=0,gtp=0;
  currRows.forEach(([label,tickets])=>{
    const sc=statusCounts(tickets);
    const avg=avgResHours(tickets);
    gt+=tickets.length;
    let prevCount='',chip='';
    if(hasPrev){const pTix=prevTicketsFn(label);prevCount=pTix.length;gtp+=prevCount;chip=deltaChip(tickets.length,prevCount,true);}
    const did='dr'+(++_drillId);
    html+='<tr class="drill-row-hdr" data-drill-id="'+did+'">'+
      '<td>'+esc(label)+'<span class="drill-arrow" id="darr-'+did+'">▸</span></td>'+
      '<td style="font-weight:600">'+tickets.length+'</td>'+
      (hasPrev?'<td style="color:var(--text-3);font-family:var(--font-data);text-align:right">'+prevCount+'</td><td style="text-align:right">'+chip+'</td>':'')+
      '<td><span class="tag tag-open">'+sc.open+'</span></td>'+
      '<td><span class="tag tag-closed">'+sc.closed+'</span></td>'+
      '<td><span class="tag tag-pending">'+sc.pending+'</span></td>'+
      '<td>'+(avg!==null?avg+'h':'—')+'</td></tr>'+
      '<tr class="drill-content" id="dcnt-'+did+'"><td colspan="'+cols+'" style="padding:0">'+ticketDrillHtml(tickets,fieldMap)+'</td></tr>';
  });
  html+='</tbody><tfoot><tr class="total-row"><td>Total</td><td>'+gt+'</td>'+
    (hasPrev?'<td style="color:var(--text-3);font-family:var(--font-data);text-align:right">'+gtp+'</td><td style="text-align:right">'+deltaChip(gt,gtp,true)+'</td>':'')+
    '<td colspan="4"></td></tr></tfoot></table></div>';
  return html;
}

function renderOverview(){
  const{tickets,ticketsPrev,fieldMap,lookbackDays}=state;

  // ── Agent filter ─────────────────────────────────────────────
  const allAgents=[...new Set(tickets.map(t=>getAgentName(t)))].sort();
  const tix=agentFilter.length>0?tickets.filter(t=>agentFilter.includes(getAgentName(t))):tickets;
  const prev=agentFilter.length>0?ticketsPrev.filter(t=>agentFilter.includes(getAgentName(t))):ticketsPrev;

  // Agent filter bar HTML
  const chipStyle=(active)=>'display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:.8rem;font-weight:'+(active?'600':'400')+';cursor:pointer;border:1px solid '+(active?'rgba(79,142,255,.4)':'var(--border)')+';background:'+(active?'var(--blue-soft)':'transparent')+';color:'+(active?'var(--blue)':'var(--text-3)')+';transition:all .15s;white-space:nowrap';
  const allActive=agentFilter.length===0;
  let agentBar='';
  if(allAgents.length>1){
    agentBar='<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:20px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px">'+
      '<span style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-right:2px;flex-shrink:0">Agent</span>'+
      '<span data-agent="__all" style="'+chipStyle(allActive)+'">All <span style="font-family:var(--font-data);font-size:.72rem;opacity:.7">('+tickets.length+')</span></span>'+
      allAgents.map(a=>{
        const cnt=tickets.filter(t=>getAgentName(t)===a).length;
        const active=agentFilter.includes(a);
        return'<span data-agent="'+esc(a)+'" style="'+chipStyle(active)+'">'+esc(a)+' <span style="font-family:var(--font-data);font-size:.72rem;opacity:.7">('+cnt+')</span></span>';
      }).join('')+
    '</div>';
  }

  const total=tix.length;const ptotal=prev.length;
  const sc=statusCounts(tix);const psc=statusCounts(prev);
  const fid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const resfid=fieldMap[FIELD_NAMES.RESOLUTION.toLowerCase()];
  const byProduct=groupBy(tix,t=>getFieldById(t,fid));
  const pe=sortedEntries(byProduct).slice(0,12);
  const maxP=pe[0]?.[1].length||1;
  const byProductPrev=groupBy(prev,t=>getFieldById(t,fid));
  const opsTotal=dedup(tix.filter(t=>OPS_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)))).length;
  const opsPrev=dedup(prev.filter(t=>OPS_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)))).length;
  const courierTotal=dedup(tix.filter(t=>COURIER_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)))).length;
  const courierPrev=dedup(prev.filter(t=>COURIER_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)))).length;
  const refundTotal=tix.filter(t=>REFUND_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v))).length;
  const refundPrev=prev.filter(t=>REFUND_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v))).length;
  const replTix=tix.filter(t=>REPLACEMENT_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v)));
  const replPrev=prev.filter(t=>REPLACEMENT_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v)));
  function statCardComp(label,curr,p,color,cls,goodWhenDown=true){
    return'<div class="stat-card '+cls+'"><div class="stat-label">'+label+'</div><div class="stat-value '+color+'">'+curr+'</div><div class="stat-sub" style="display:flex;align-items:center;gap:6px"><span style="color:var(--text-3)">prev: '+p+'</span>'+deltaChip(curr,p,goodWhenDown)+'</div></div>';
  }
  const prodBars=pe.map(([name,ptix])=>{
    const pCount=(byProductPrev[name]||[]).length;
    const chip=deltaChip(ptix.length,pCount,true);
    return'<div class="bar-row"><div class="bar-row-label" title="'+esc(name)+'">'+esc(name)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+(ptix.length/maxP*100).toFixed(1)+'%;background:var(--blue)"></div></div><div class="bar-row-val">'+ptix.length+' '+chip+'</div></div>';
  }).join('');
  const catRows=[['Ops Issues',opsTotal,opsPrev,'var(--red)',true],['Courier Issues',courierTotal,courierPrev,'var(--amber)',true],['Refunds',refundTotal,refundPrev,'var(--purple)',true],['Replacements',replTix.length,replPrev.length,'var(--green)',true]];
  const maxCat=Math.max(...catRows.map(r=>r[1]),1);
  const catBars=catRows.map(([label,count,pCount,color])=>'<div class="bar-row"><div class="bar-row-label">'+esc(label)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+(count/maxCat*100).toFixed(1)+'%;background:'+color+'"></div></div><div class="bar-row-val">'+count+' '+deltaChip(count,pCount,true)+'</div></div>').join('');
  const compBadge='<span style="font-size:.72rem;color:var(--text-3);margin-left:8px">vs '+state.prevLabel+'</span>';
  const agentLabel=agentFilter.length>0?' · '+agentFilter.join(', '):'';
  const html=agentBar+
    '<div class="page-header"><div><div class="page-title">◈ Overview</div><div class="page-subtitle">Last '+lookbackDays+' days &nbsp;·&nbsp; '+total+' tickets'+esc(agentLabel)+'</div></div><div class="period-badge">Last '+lookbackDays+' days'+compBadge+'</div></div>'+
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
  const poolT=tickets.filter(t=>matchesValue(getFieldById(t,pid),POOL_PRODUCT));
  const poolPrev=ticketsPrev.filter(t=>matchesValue(getFieldById(t,pid),POOL_PRODUCT));
  const supT=poolT.filter(t=>matchesValue(getFieldById(t,rid),REASON_SUPPLIER));
  const supPrev=poolPrev.filter(t=>matchesValue(getFieldById(t,rid),REASON_SUPPLIER));
  const courT=poolT.filter(t=>matchesValue(getFieldById(t,rid),REASON_COURIER_POOL));
  const courPrev=poolPrev.filter(t=>matchesValue(getFieldById(t,rid),REASON_COURIER_POOL));
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
      bodyHtml:expandableBreakdownTable(byD,'Damage Type',label=>(prevByD[label]||[]),fieldMap)
    });
  });
  html+=renderExtraBlocks('pool');
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
    tickets:tickets.filter(t=>matchesValue(getFieldById(t,pid),prod)&&matchesValue(getFieldById(t,rid),ARCADE_REASON)),
    prev:ticketsPrev.filter(t=>matchesValue(getFieldById(t,pid),prod)&&matchesValue(getFieldById(t,rid),ARCADE_REASON)),
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
      bodyHtml:expandableBreakdownTable(byI,'Issue / Damage Type',label=>(prevByI[label]||[]),fieldMap)});
  });
  const scAll2=statusCounts(allArcade);const avgAll=avgResHours(allArcade);
  const byIA=sortedEntries(groupBy(allArcade,t=>getFieldById(t,aid)));
  const prevByIA=groupBy(allArcadePrev,t=>getFieldById(t,aid));
  html+=sectionBlock({title:'All Arcade Machines — Combined <span style="font-size:.8rem;font-weight:400">'+allArcade.length+'</span> '+deltaChip(allArcade.length,allArcadePrev.length,true),dot:'dot-red',borderColor:'rgba(255,86,85,.3)',headerBg:'var(--red-soft)',
    summaryItems:[{val:allArcade.length,label:'Total'},{val:scAll2.open,label:'Open',color:'var(--amber)'},{val:scAll2.closed,label:'Closed',color:'var(--green)'},{val:scAll2.pending,label:'Pending',color:'var(--purple)'},{val:avgAll?avgAll+'h':'—',label:'Avg Res.'},{val:deltaChip(allArcade.length,allArcadePrev.length,true)||'—',label:'vs Prev'}],
    bodyHtml:expandableBreakdownTable(byIA,'Issue / Damage Type',label=>(prevByIA[label]||[]),fieldMap)});
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
  html+=renderExtraBlocks('arcade');
  document.getElementById('arcade-content').innerHTML=html;
}

function renderCourier(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const cid=fieldMap[FIELD_NAMES.COURIER.toLowerCase()];
  const total=tickets.length;
  const dots=['dot-red','dot-amber','dot-blue','dot-purple'];
  const allC=dedup(tickets.filter(t=>COURIER_REASONS.some(r=>matchesValue(getFieldById(t,rid),r))));
  const allCPrev=dedup(ticketsPrev.filter(t=>COURIER_REASONS.some(r=>matchesValue(getFieldById(t,rid),r))));
  document.getElementById('badge-courier').textContent=allC.length;
  let html='<div class="page-header"><div><div class="page-title accent-amber">🚚 Courier Issues</div><div class="page-subtitle">Missing · Delayed · Wrong Address · Damaged — by courier</div></div><div class="period-badge" id="pb-courier">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  COURIER_REASONS.forEach((reason,i)=>{
    const tix=tickets.filter(t=>matchesValue(getFieldById(t,rid),reason));
    const prev=ticketsPrev.filter(t=>matchesValue(getFieldById(t,rid),reason));
    const sc=statusCounts(tix);const avg=avgResHours(tix);
    const byC=sortedEntries(groupBy(tix,t=>getFieldById(t,cid)));
    const prevByC=groupBy(prev,t=>getFieldById(t,cid));
    html+=sectionBlock({title:esc(reason)+' <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+tix.length+'</span> '+deltaChip(tix.length,prev.length,true),subtitle:tix.length+' tickets · prev: '+prev.length,dot:dots[i],
      summaryItems:[{val:tix.length,label:'Total'},{val:sc.open,label:'Open',color:'var(--amber)'},{val:sc.closed,label:'Closed',color:'var(--green)'},{val:sc.pending,label:'Pending',color:'var(--purple)'},{val:avg?avg+'h':'—',label:'Avg Res.'},{val:deltaChip(tix.length,prev.length,true)||'—',label:'vs Prev'}],
      bodyHtml:expandableBreakdownTable(byC,'Courier',label=>(prevByC[label]||[]),fieldMap)});
  });
  const scAllC=statusCounts(allC);const avgAllC=avgResHours(allC);
  const byCAll=sortedEntries(groupBy(allC,t=>getFieldById(t,cid)));
  const prevByCAll=groupBy(allCPrev,t=>getFieldById(t,cid));
  const worst=byCAll[0]?.[0]||'—';
  html+=sectionBlock({title:'Total Courier Issues — All Reasons <span style="font-size:.8rem;font-weight:400">'+allC.length+'</span> '+deltaChip(allC.length,allCPrev.length,true),subtitle:'Worst offender: <strong>'+esc(worst)+'</strong>',dot:'dot-blue',borderColor:'rgba(79,142,255,.25)',headerBg:'var(--blue-soft)',
    summaryItems:[{val:allC.length,label:'Total'},{val:scAllC.open,label:'Open',color:'var(--amber)'},{val:scAllC.closed,label:'Closed',color:'var(--green)'},{val:scAllC.pending,label:'Pending',color:'var(--purple)'},{val:avgAllC?avgAllC+'h':'—',label:'Avg Res.'},{val:deltaChip(allC.length,allCPrev.length,true)||'—',label:'vs Prev'}],
    bodyHtml:expandableBreakdownTable(byCAll,'Courier',label=>(prevByCAll[label]||[]),fieldMap)});
  html+=renderExtraBlocks('courier');
  document.getElementById('courier-content').innerHTML=html;
}

function renderOps(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const total=tickets.length;
  const opsGroups=OPS_REASONS.map(reason=>({
    reason,
    tickets:tickets.filter(t=>matchesValue(getFieldById(t,rid),reason)),
    prev:ticketsPrev.filter(t=>matchesValue(getFieldById(t,rid),reason))
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
      bodyHtml:expandableBreakdownTable(byP,'Product',label=>(prevByP[label]||[]),fieldMap)});
  });
  html+=renderExtraBlocks('ops');
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
  const refundTix=tickets.filter(t=>REFUND_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v)));
  const refundPrev=ticketsPrev.filter(t=>REFUND_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v)));
  const fullR=refundTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='refund');
  const fullRPrev=refundPrev.filter(t=>getFieldById(t,resfid).toLowerCase()==='refund');
  const partR=refundTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='partial refund');
  const partRPrev=refundPrev.filter(t=>getFieldById(t,resfid).toLowerCase()==='partial refund');
  const totalVal=sumMoney(refundTix,rvfid);
  const totalValPrev=sumMoney(refundPrev,rvfid);
  const fullVal=sumMoney(fullR,rvfid);
  const partVal=sumMoney(partR,rvfid);
  const replTix=tickets.filter(t=>REPLACEMENT_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v)));
  const replPrev=ticketsPrev.filter(t=>REPLACEMENT_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v)));
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
  let html='<div class="page-header"><div><div class="page-title accent-purple">💰 Refunds &amp; Replacements</div><div class="page-subtitle">Full refunds · Partial refunds · Replacements · Free gifts — all products</div></div><div class="period-badge" id="pb-refunds">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>'+
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
  html+=renderExtraBlocks('refunds');
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
    tickets:tickets.filter(t=>matchesValue(getFieldById(t,pid),prod)&&KELVIN_REASONS.some(r=>matchesValue(getFieldById(t,rid),r))),
    prev:ticketsPrev.filter(t=>matchesValue(getFieldById(t,pid),prod)&&KELVIN_REASONS.some(r=>matchesValue(getFieldById(t,rid),r))),
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
  html+=renderExtraBlocks('pinball');
  document.getElementById('pinball-content').innerHTML=html;
}

function showSection(name){document.querySelectorAll('.section-view').forEach(el=>el.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));document.getElementById('section-'+name).classList.add('active');document.querySelector('.nav-item[data-section="'+name+'"]').classList.add('active');}

// ── Kegerators ────────────────────────────────────────────────
function renderKegerators(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const total=tickets.length;
  const kegT=tickets.filter(t=>KEG_PRODUCTS.some(p=>matchesValue(getFieldById(t,pid),p)));
  const kegPrev=ticketsPrev.filter(t=>KEG_PRODUCTS.some(p=>matchesValue(getFieldById(t,pid),p)));
  document.getElementById('badge-kegerator').textContent=kegT.length;
  const byR=sortedEntries(groupBy(kegT,t=>getFieldById(t,rid)));
  const prevByR=groupBy(kegPrev,t=>getFieldById(t,rid));
  const sc=statusCounts(kegT);const avg=avgResHours(kegT);
  let html='<div class="page-header"><div><div class="page-title" style="color:var(--amber)">🍺 Kegerators</div><div class="page-subtitle">All Kegerator variants — ticket breakdown by contact reason</div></div><div class="period-badge">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  html+=sectionBlock({
    title:'Kegerators <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+kegT.length+'</span> '+deltaChip(kegT.length,kegPrev.length,true),
    subtitle:kegT.length+' tickets · prev: '+kegPrev.length+' · '+pct(kegT.length,total)+' of all',
    dot:'dot-amber',
    summaryItems:[
      {val:kegT.length,label:'Total',color:'var(--text-1)'},
      {val:sc.open,label:'Open',color:'var(--amber)'},
      {val:sc.closed,label:'Closed',color:'var(--green)'},
      {val:sc.pending,label:'Pending',color:'var(--purple)'},
      {val:avg?avg+'h':'—',label:'Avg Res.'},
      {val:deltaChip(kegT.length,kegPrev.length,true)||'—',label:'vs Prev'},
    ],
    bodyHtml:expandableBreakdownTable(byR,'Contact Reason',label=>(prevByR[label]||[]),fieldMap)
  });
  document.getElementById('kegerator-content').innerHTML=html;
}

// ── LED Bar Signs ─────────────────────────────────────────────
function renderLEDBars(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const total=tickets.length;
  const ledT=tickets.filter(t=>matchesValue(getFieldById(t,pid),'LED Bar Sign'));
  const ledPrev=ticketsPrev.filter(t=>matchesValue(getFieldById(t,pid),'LED Bar Sign'));
  document.getElementById('badge-ledsigns').textContent=ledT.length;
  const byR=sortedEntries(groupBy(ledT,t=>getFieldById(t,rid)));
  const prevByR=groupBy(ledPrev,t=>getFieldById(t,rid));
  const sc=statusCounts(ledT);const avg=avgResHours(ledT);
  let html='<div class="page-header"><div><div class="page-title" style="color:var(--cyan)">💡 LED Bar Signs</div><div class="page-subtitle">LED Bar Sign tickets — breakdown by contact reason</div></div><div class="period-badge">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  html+=sectionBlock({
    title:'LED Bar Signs <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+ledT.length+'</span> '+deltaChip(ledT.length,ledPrev.length,true),
    subtitle:ledT.length+' tickets · prev: '+ledPrev.length+' · '+pct(ledT.length,total)+' of all',
    dot:'dot-cyan',
    summaryItems:[
      {val:ledT.length,label:'Total',color:'var(--text-1)'},
      {val:sc.open,label:'Open',color:'var(--amber)'},
      {val:sc.closed,label:'Closed',color:'var(--green)'},
      {val:sc.pending,label:'Pending',color:'var(--purple)'},
      {val:avg?avg+'h':'—',label:'Avg Res.'},
      {val:deltaChip(ledT.length,ledPrev.length,true)||'—',label:'vs Prev'},
    ],
    bodyHtml:expandableBreakdownTable(byR,'Contact Reason',label=>(prevByR[label]||[]),fieldMap)
  });
  document.getElementById('ledsigns-content').innerHTML=html;
}

// ── Bar Fridges ───────────────────────────────────────────────
function renderBarFridges(){
  const{tickets,ticketsPrev,fieldMap}=state;
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const total=tickets.length;
  const barT=tickets.filter(t=>matchesValue(getFieldById(t,pid),'Bar Fridge'));
  const barPrev=ticketsPrev.filter(t=>matchesValue(getFieldById(t,pid),'Bar Fridge'));
  document.getElementById('badge-barfridge').textContent=barT.length;
  const byR=sortedEntries(groupBy(barT,t=>getFieldById(t,rid)));
  const prevByR=groupBy(barPrev,t=>getFieldById(t,rid));
  const sc=statusCounts(barT);const avg=avgResHours(barT);
  let html='<div class="page-header"><div><div class="page-title" style="color:var(--blue)">🧊 Bar Fridges</div><div class="page-subtitle">Bar Fridge tickets — breakdown by contact reason</div></div><div class="period-badge">Last '+state.lookbackDays+' days <span style="color:var(--text-3);font-size:.72rem">vs '+state.prevLabel+'</span></div></div>';
  html+=sectionBlock({
    title:'Bar Fridges <span style="font-size:.8rem;font-weight:400;color:var(--text-2)">'+barT.length+'</span> '+deltaChip(barT.length,barPrev.length,true),
    subtitle:barT.length+' tickets · prev: '+barPrev.length+' · '+pct(barT.length,total)+' of all',
    dot:'dot-blue',
    summaryItems:[
      {val:barT.length,label:'Total',color:'var(--text-1)'},
      {val:sc.open,label:'Open',color:'var(--amber)'},
      {val:sc.closed,label:'Closed',color:'var(--green)'},
      {val:sc.pending,label:'Pending',color:'var(--purple)'},
      {val:avg?avg+'h':'—',label:'Avg Res.'},
      {val:deltaChip(barT.length,barPrev.length,true)||'—',label:'vs Prev'},
    ],
    bodyHtml:expandableBreakdownTable(byR,'Contact Reason',label=>(prevByR[label]||[]),fieldMap)
  });
  document.getElementById('barfridge-content').innerHTML=html;
}

// ── AI Insights ───────────────────────────────────────────────
function renderAIReport(){
  const el=document.getElementById('ai-report-content');
  if(!el)return;
  const s=state;
  const hasData=s&&s.hasData;
  const cached=window.__aiReportCache;
  if(!hasData){el.innerHTML='<div class="empty-state" style="padding:60px 20px"><div class="empty-state-msg" style="font-size:1rem">Run the report first to load ticket data, then generate AI insights.</div></div>';return;}
  const periodLabel='Last '+s.lookbackDays+' days';
  const genBtnHTML='<button class="ai-generate-btn" onclick="window.__generateAIReport()" id="ai-gen-btn">🤖 Generate Weekly Insights</button>';
  const headerHTML='<div class="page-header"><div><div class="page-title" style="background:linear-gradient(135deg,#4f8eff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">🤖 AI Insights</div><div class="page-subtitle">AI-generated analysis of recurring issues and operational recommendations</div></div><div class="period-badge">'+periodLabel+'</div></div>';
  if(!cached){
    el.innerHTML=headerHTML+'<div class="section-block" style="border-color:rgba(167,139,250,.3)"><div class="section-block-body" style="padding:32px;text-align:center">'+
      '<div style="font-size:2.5rem;margin-bottom:16px">🤖</div>'+
      '<div style="font-family:var(--font-head);font-size:1.2rem;font-weight:800;margin-bottom:8px">Ready to analyse '+s.tickets.length+' tickets</div>'+
      '<div style="color:var(--text-2);margin-bottom:24px;max-width:420px;margin-left:auto;margin-right:auto">Click below to get an AI-powered overview of recurring issues, trends, and operational recommendations for this period.</div>'+
      genBtnHTML+'</div></div>';
    return;
  }
  const d=new Date(cached.generatedAt);
  const dateStr=d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  el.innerHTML=headerHTML+
    '<div class="section-block" style="border-color:rgba(167,139,250,.3)">'+
    '<div class="section-block-header" style="background:var(--purple-soft)"><div><div class="section-block-title"><span class="color-dot dot-purple"></span>AI Analysis Report</div><div class="section-block-subtitle">Generated '+dateStr+' · '+s.tickets.length+' tickets analysed</div></div><button class="btn btn-ghost" onclick="window.__generateAIReport()" style="font-size:.8rem;padding:5px 10px">↻ Regenerate</button></div>'+
    '<div class="section-block-body"><div class="ai-report-body">'+markdownToHtml(cached.report)+'</div></div>'+
    '</div>';
}

function markdownToHtml(md){
  return md
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^(\d+)\. (.+)$/gm,'<li><strong>$1.</strong> $2</li>')
    .replace(/^[•\-\*] (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)(?=\s*<li>|$)/g,function(m){return '<ul>'+m+'</ul>';})
    .replace(/<\/ul>\s*<ul>/g,'')
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>')
    .replace(/^(?!<[hup])(.+)$/gm,'<p>$1</p>')
    .replace(/<p><\/p>/g,'')
    .replace(/<p>(<[hul])/g,'$1')
    .replace(/(<\/[hul][^>]*>)<\/p>/g,'$1');
}

function buildTicketSummary(){
  const s=state;
  const{tickets,ticketsPrev,lookbackDays,fieldMap}=s;
  const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];
  const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];
  const resfid=fieldMap[FIELD_NAMES.RESOLUTION.toLowerCase()];
  const rvfid=fieldMap[FIELD_NAMES.REFUND_VALUE.toLowerCase()];
  // Status counts
  function statusC(tix){return{open:tix.filter(t=>t.status==='open').length,closed:tix.filter(t=>t.status==='closed').length,pending:tix.filter(t=>t.status==='pending').length};}
  // Top reasons
  const reasonGroups={};
  tickets.forEach(t=>{const r=getFieldById(t,rid)||'Unknown';reasonGroups[r]=(reasonGroups[r]||0)+1;});
  const topReasons=Object.entries(reasonGroups).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([r,c])=>({reason:r,count:c,pct:Math.round(c/tickets.length*100)}));
  // Top products
  const prodGroups={};
  tickets.forEach(t=>{const p=getFieldById(t,pid)||'Unknown';prodGroups[p]=(prodGroups[p]||0)+1;});
  const topProducts=Object.entries(prodGroups).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([p,c])=>({product:p,count:c}));
  // Section counts
  const pool=tickets.filter(t=>matchesValue(getFieldById(t,pid),POOL_PRODUCT));
  const arcade=tickets.filter(t=>ARCADE_PRODUCTS.some(p=>matchesValue(getFieldById(t,pid),p))&&matchesValue(getFieldById(t,rid),ARCADE_REASON));
  const pinball=tickets.filter(t=>KELVIN_PRODUCTS.some(p=>matchesValue(getFieldById(t,pid),p))&&KELVIN_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)));
  const courier=tickets.filter(t=>COURIER_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)));
  const ops=tickets.filter(t=>OPS_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)));
  const refunds=tickets.filter(t=>REFUND_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v)));
  const replacements=tickets.filter(t=>REPLACEMENT_VALUES.some(v=>matchesValue(getFieldById(t,resfid),v)));
  const refundVal=sumMoney(refunds,rvfid);
  const poolP=ticketsPrev.filter(t=>matchesValue(getFieldById(t,pid),POOL_PRODUCT));
  const arcadeP=ticketsPrev.filter(t=>ARCADE_PRODUCTS.some(p=>matchesValue(getFieldById(t,pid),p))&&matchesValue(getFieldById(t,rid),ARCADE_REASON));
  const courierP=ticketsPrev.filter(t=>COURIER_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)));
  const opsP=ticketsPrev.filter(t=>OPS_REASONS.some(r=>matchesValue(getFieldById(t,rid),r)));
  return{
    period:{days:lookbackDays,label:'Last '+lookbackDays+' days'},
    totals:{current:tickets.length,previous:ticketsPrev.length,changePct:ticketsPrev.length?Math.round((tickets.length-ticketsPrev.length)/ticketsPrev.length*100):null},
    statusBreakdown:statusC(tickets),
    sections:{
      poolTables:{current:pool.length,previous:poolP.length},
      arcadeMachines:{current:arcade.length,previous:arcadeP.length},
      pinballMachines:{current:pinball.length,previous:0},
      courierIssues:{current:courier.length,previous:courierP.length},
      opsIssues:{current:ops.length,previous:opsP.length},
      refunds:{count:refunds.length,replacements:replacements.length,totalValue:'$'+refundVal.toFixed(2)},
    },
    topContactReasons:topReasons,
    topProducts:topProducts,
  };
}

async function generateAIReport(){
  const btn=document.getElementById('ai-gen-btn');
  const el=document.getElementById('ai-report-content');
  if(!state||!state.hasData){alert('Please run the report first.');return;}
  // Show thinking state
  const s=state;
  const periodLabel='Last '+s.lookbackDays+' days';
  el.innerHTML='<div class="page-header"><div><div class="page-title" style="background:linear-gradient(135deg,#4f8eff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">🤖 AI Insights</div><div class="page-subtitle">AI-generated analysis of recurring issues and operational recommendations</div></div><div class="period-badge">'+periodLabel+'</div></div>'+
    '<div class="section-block" style="border-color:rgba(167,139,250,.3)"><div class="section-block-body" style="padding:28px">'+
    '<div class="ai-thinking"><div class="spin"></div> Analysing '+s.tickets.length+' tickets — this takes about 10 seconds…</div></div></div>';
  try{
    const summary=buildTicketSummary();
    const result=await window.__authPost('/api/ai-report',{summary});
    window.__aiReportCache={report:result.report,generatedAt:result.generatedAt};
    renderAIReport();
  }catch(err){
    el.innerHTML='<div class="page-header"><div><div class="page-title accent-red">🤖 AI Insights</div></div></div>'+
      '<div class="section-block"><div class="section-block-body"><div style="color:var(--red);padding:16px">'+
      (err.message||'Failed to generate report')+
      '<br><br><small style="color:var(--text-3)">Make sure ANTHROPIC_API_KEY is set in your Vercel environment variables.</small>'+
      '</div></div></div>';
  }
}

// ── CS Agent Analytics ─────────────────────────────────────────────────────────
// Loads AI-classified ticket data from the local CS Agent (via /api/cs-analytics proxy).
// Shows breakdowns by issue category, product, courier, ops — plus an AI chat.

let csAgentRange='30d';
let csAgentData=null;
let csAgentChatHistory=[];
let csAgentLoaded=false;

async function loadCsAgent(range){
  if(range)csAgentRange=range;
  csAgentLoaded=true;
  const el=document.getElementById('cs-agent-content');
  if(!el)return;
  el.innerHTML='<div class="empty-state"><div class="empty-state-msg" style="padding:40px">⏳ Loading CS Agent data…</div></div>';
  try{
    const data=await window.__authFetch('/api/cs-analytics?range='+csAgentRange);
    if(data.empty){el.innerHTML='<div class="empty-state"><div class="empty-state-msg">No classified tickets found for this period.</div></div>';return;}
    csAgentData=data;
    csAgentChatHistory=[];
    renderCsAgent(data);
  }catch(err){
    el.innerHTML='<div class="page-header"><div><div class="page-title accent-red">📊 CS Agent Analytics</div></div></div>'+
      '<div class="section-block"><div class="section-block-body"><div style="color:var(--red);padding:16px">'+
      'Could not reach CS Agent: '+(err.message||'Unknown error')+
      '<br><br><small style="color:var(--text-3)">Make sure the CS Agent server is running and CS_AGENT_URL is set in your environment variables (Vercel or .env.local).</small>'+
      '</div></div></div>';
  }
}

function renderCsAgent(data){
  const el=document.getElementById('cs-agent-content');
  const c=data.current;const p=data.previous;
  const rangeLabel={'7d':'Last 7 days','30d':'Last 30 days','90d':'Last 90 days','all':'All time'}[csAgentRange]||csAgentRange;

  const rangeButtons=['7d','30d','90d','all'].map(r=>
    '<button onclick="window.__loadCsAgent(\''+r+'\')" style="padding:5px 12px;border:1px solid var(--border);border-radius:4px;background:'+(r===csAgentRange?'var(--blue)':'var(--bg-2)')+';color:'+(r===csAgentRange?'#fff':'var(--text-1)')+';font-size:.8rem;cursor:pointer;margin-right:6px">'+({'7d':'7d','30d':'30d','90d':'90d','all':'All'}[r])+'</button>'
  ).join('');

  // Summary strip
  const summaryHtml='<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">'+
    csaCard('Tickets',c.totalTickets,csaTrend(c.totalTickets,p.totalTickets))+
    csaCard('Issues',c.totalIssues,csaTrend(c.totalIssues,p.totalIssues))+
    (c.totalRefunds>0?csaCard('Refunds','$'+Math.round(c.totalRefunds).toLocaleString(),'','var(--green)'):'') +
    csaCard('Accuracy',c.accuracyPct+'%','Staff fields')+
    '</div>';

  // Category table
  const maxCat=c.byCategory[0]?.[1]||1;
  const catRows=c.byCategory.map(([cat,count])=>{
    const prev=p.byCategory.find(([k])=>k===cat)?.[1]??0;
    const pct=Math.round((count/c.totalIssues)*100);
    const label=cat.replace(/_/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase());
    const trend=csaTrendInline(count,prev);
    const bar='<div style="width:'+Math.round((count/maxCat)*100)+'%;height:5px;background:var(--blue);border-radius:2px;opacity:.7"></div>';
    return '<tr><td>'+label+'</td><td style="width:80px">'+bar+'</td><td style="text-align:right;font-weight:700">'+count+'</td><td style="text-align:right;font-size:.8rem;color:var(--text-3)">'+pct+'%</td><td style="text-align:right;font-size:.8rem">'+trend+'</td></tr>';
  }).join('');

  // Product accordion
  const maxProd=c.byProduct[0]?.[1]||1;
  const prodRows=c.byProduct.map(([prod,count])=>{
    const bd=c.productBreakdown[prod]||{};
    const bdId='csa-prod-'+prod.replace(/\W/g,'_');
    const bdRows=Object.entries(bd).sort((a,b)=>b[1]-a[1]).map(([cat,n])=>'<tr style="background:var(--bg-2)"><td style="padding-left:28px;font-size:.82rem;color:var(--text-2)">'+cat.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())+'</td><td></td><td style="text-align:right;font-size:.82rem">'+n+'</td><td></td><td></td></tr>').join('');
    const bar='<div style="width:'+Math.round((count/maxProd)*100)+'%;height:5px;background:var(--blue);border-radius:2px;opacity:.7"></div>';
    return '<tr onclick="(function(){var el=document.getElementById(\''+bdId+'\');if(!el)return;var open=el.style.display===\'none\'||!el.style.display;el.style.display=open?\'table-row-group\':\'none\';var arr=document.getElementById(\'arr-'+bdId+'\');if(arr)arr.textContent=open?\'▼\':\'▶\'})()" style="cursor:pointer">'+
      '<td>'+prod+' <span id="arr-'+bdId+'" style="font-size:.7rem;color:var(--text-3)">▶</span></td>'+
      '<td style="width:80px">'+bar+'</td><td style="text-align:right;font-weight:700">'+count+'</td><td></td><td></td></tr>'+
      '<tbody id="'+bdId+'" style="display:none">'+bdRows+'</tbody>';
  }).join('');

  // Courier accordion
  const courierSection=c.byCourier.length>0?(()=>{
    const maxC=c.byCourier[0]?.[1]||1;
    const rows=c.byCourier.map(([courier,count])=>{
      const prev=p.byCourier.find(([k])=>k===courier)?.[1]??0;
      const bd=c.courierBreakdown[courier]||{};
      const bdId='csa-cour-'+courier.replace(/\W/g,'_');
      const bdRows=Object.entries(bd).sort((a,b)=>b[1]-a[1]).map(([cat,n])=>'<tr style="background:var(--bg-2)"><td style="padding-left:28px;font-size:.82rem;color:var(--text-2)">'+cat.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())+'</td><td></td><td style="text-align:right;font-size:.82rem">'+n+'</td><td></td><td></td></tr>').join('');
      const bar='<div style="width:'+Math.round((count/maxC)*100)+'%;height:5px;background:var(--blue);border-radius:2px;opacity:.7"></div>';
      const spike=count>=3&&prev>0&&count>prev*1.5?' ⚠️':'';
      const trend=csaTrendInline(count,prev);
      return '<tr onclick="(function(){var el=document.getElementById(\''+bdId+'\');if(!el)return;var open=el.style.display===\'none\'||!el.style.display;el.style.display=open?\'table-row-group\':\'none\'})()" style="cursor:pointer">'+
        '<td>'+courier+spike+'</td><td style="width:80px">'+bar+'</td><td style="text-align:right;font-weight:700">'+count+'</td><td></td><td style="text-align:right;font-size:.8rem">'+trend+'</td></tr>'+
        '<tbody id="'+bdId+'" style="display:none">'+bdRows+'</tbody>';
    }).join('');
    return csaSection('🚚 Issues by Courier','<table class="csa-table">'+rows+'</table>','Click rows to expand');
  })():'';

  // Ops section
  const opsSection=c.opsIssuesCount>0?(()=>{
    const rows=Object.entries(c.opsByRootCause).map(([rootCause,cats])=>{
      const total=Object.values(cats).reduce((s,v)=>s+v,0);
      const bdId='csa-ops-'+rootCause.replace(/\W/g,'_');
      const bdRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([cat,n])=>'<tr style="background:var(--bg-2)"><td style="padding-left:28px;font-size:.82rem;color:var(--text-2)">'+cat.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())+'</td><td></td><td style="text-align:right;font-size:.82rem">'+n+'</td><td></td><td></td></tr>').join('');
      const label=rootCause.charAt(0).toUpperCase()+rootCause.slice(1);
      return '<tr onclick="(function(){var el=document.getElementById(\''+bdId+'\');if(!el)return;var open=el.style.display===\'none\'||!el.style.display;el.style.display=open?\'table-row-group\':\'none\'})()" style="cursor:pointer">'+
        '<td>'+label+'</td><td></td><td style="text-align:right;font-weight:700">'+total+'</td><td></td><td></td></tr>'+
        '<tbody id="'+bdId+'" style="display:none">'+bdRows+'</tbody>';
    }).join('');
    return csaSection('⚙️ Ops / Supplier / Warehouse','<table class="csa-table">'+rows+'</table>',c.opsIssuesCount+' issues · Click rows to expand');
  })():'';

  // AI Chat
  const chatHtml='<div class="section-block" style="margin-top:16px">'+
    '<div class="section-block-header" style="display:flex;align-items:center;gap:8px">'+
    '<div class="section-block-label">🤖 Ask the AI about this data</div>'+
    '<div style="font-size:.75rem;color:var(--text-3)">Asks about the classified ticket data</div>'+
    '</div>'+
    '<div class="section-block-body">'+
    '<div id="csa-chat-msgs" style="display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;margin-bottom:12px;padding:4px 0">'+
    '<div style="background:var(--bg-2);border-radius:8px;padding:10px 14px;font-size:.87rem;line-height:1.5;align-self:flex-start;max-width:90%">'+
    'Hi! I can see all '+c.totalTickets+' classified tickets for this period. Ask me anything — e.g. "What\'s causing the most issues?", "Which product needs attention this week?", or "Give me 3 action items."'+
    '</div></div>'+
    '<div style="display:flex;gap:8px">'+
    '<input id="csa-chat-input" type="text" placeholder="Ask a question about the data…" style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:6px;font-size:.87rem;background:var(--bg-1);color:var(--text-1);outline:none" onkeydown="if(event.key===\'Enter\')window.__csaAsk()">'+
    '<button onclick="window.__csaAsk()" style="padding:9px 16px;background:var(--blue);color:#fff;border:none;border-radius:6px;font-size:.87rem;font-weight:600;cursor:pointer">Ask →</button>'+
    '</div></div></div>';

  el.innerHTML='<div class="page-header"><div>'+
    '<div class="page-title" style="background:linear-gradient(135deg,#0052cc,#00b8d9);-webkit-background-clip:text;-webkit-text-fill-color:transparent">📊 CS Agent Analytics</div>'+
    '<div class="page-subtitle">AI-classified ticket data — '+c.totalTickets+' tickets · '+rangeLabel+'</div>'+
    '</div>'+
    '<div style="display:flex;align-items:center;gap:8px">'+rangeButtons+
    '<div class="period-badge">'+rangeLabel+'</div></div></div>'+
    summaryHtml+
    csaSection('🔴 Issues by Category','<table class="csa-table">'+catRows+'</table>')+
    csaSection('📦 Issues by Product','<table class="csa-table">'+prodRows+'</table>','Click rows to expand')+
    courierSection+
    opsSection+
    chatHtml;

  // expose chat ask function
  window.__csaAsk=async function(){
    const input=document.getElementById('csa-chat-input');
    const question=input?.value?.trim();
    if(!question)return;
    input.value='';
    csaChatAppend('user',question);
    const thinking=document.createElement('div');
    thinking.id='csa-thinking';
    thinking.style.cssText='color:var(--text-3);font-size:.82rem;font-style:italic;padding:4px 0';
    thinking.textContent='⏳ Thinking…';
    document.getElementById('csa-chat-msgs').appendChild(thinking);
    csaChatScroll();
    try{
      const res=await window.__authPost('/api/cs-analytics',{question,range:csAgentRange,history:csAgentChatHistory});
      document.getElementById('csa-thinking')?.remove();
      if(res.answer){
        csAgentChatHistory.push({role:'user',content:question});
        csAgentChatHistory.push({role:'assistant',content:res.answer});
        csaChatAppend('assistant',res.answer);
      }else{csaChatAppend('assistant','Error: '+(res.error||'No answer'));}
    }catch(e){document.getElementById('csa-thinking')?.remove();csaChatAppend('assistant','Error: '+e.message);}
  };
}

function csaChatAppend(role,text){
  const msgs=document.getElementById('csa-chat-msgs');if(!msgs)return;
  const div=document.createElement('div');
  const isUser=role==='user';
  div.style.cssText='background:'+(isUser?'var(--blue)':'var(--bg-2)')+';color:'+(isUser?'#fff':'var(--text-1)')+';border-radius:8px;padding:10px 14px;font-size:.87rem;line-height:1.5;align-self:'+(isUser?'flex-end':'flex-start')+';max-width:90%';
  div.innerHTML=text.replace(/\n/g,'<br>');
  msgs.appendChild(div);csaChatScroll();
}
function csaChatScroll(){const el=document.getElementById('csa-chat-msgs');if(el)el.scrollTop=el.scrollHeight;}
function csaCard(label,value,sub,color){
  return '<div style="background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:12px 16px;min-width:100px">'+
    '<div style="font-size:.72rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.4px">'+label+'</div>'+
    '<div style="font-size:1.5rem;font-weight:800;color:'+(color||'var(--text-1)')+';line-height:1.2;margin-top:2px">'+value+'</div>'+
    (sub?'<div style="font-size:.75rem;color:var(--text-3);margin-top:2px">'+sub+'</div>':'')+
    '</div>';
}
function csaSection(title,body,sub){
  return '<div class="section-block" style="margin-bottom:12px">'+
    '<div class="section-block-header">'+
    '<div class="section-block-label">'+title+'</div>'+
    (sub?'<div style="font-size:.75rem;color:var(--text-3)">'+sub+'</div>':'')+
    '</div>'+
    '<div class="section-block-body">'+body+'</div></div>';
}
function csaTrend(cur,prev){
  if(!prev||prev===0)return'';
  const pct=Math.round(((cur-prev)/prev)*100);
  if(Math.abs(pct)<5)return'';
  return(pct>0?'↑':'↓')+Math.abs(pct)+'% vs prev';
}
function csaTrendInline(cur,prev){
  if(!prev||prev===0)return cur>0?'<span style="color:var(--blue);font-weight:600">NEW</span>':'';
  const pct=Math.round(((cur-prev)/prev)*100);
  if(Math.abs(pct)<10)return'';
  if(pct>0)return'<span style="color:var(--red)">↑'+pct+'%</span>';
  return'<span style="color:var(--green)">↓'+Math.abs(pct)+'%</span>';
}

function showLoading(show){const el=document.getElementById('loading-overlay');if(show){el.classList.add('visible');document.getElementById('loading-log').innerHTML='';document.getElementById('loading-bar').style.width='0%';}else{el.classList.remove('visible');}}
