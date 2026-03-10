import { useEffect, useRef, useState } from 'react'
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
    const script = document.createElement('script')
    script.id = '__dashboard_logic'
    script.text = DASHBOARD_LOGIC + '\nwindow.__runReport = runReport;\nwindow.__showSection = showSection;'
    document.body.appendChild(script)
    return () => {
      delete window.__authFetch
      delete window.__runReport
      delete window.__showSection
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
            { id: 'overview', icon: '◈', label: 'Overview' },
            { id: 'pool',     icon: '🎱', label: 'Pool Tables' },
            { id: 'arcade',   icon: '🕹',  label: 'Gao Arcades' },
            { id: 'courier',  icon: '🚚', label: 'Courier Issues' },
            { id: 'ops',      icon: '⚙️', label: 'Ops Issues' },
            { id: 'refunds',  icon: '💰', label: 'Refunds & Replacements' },
          ].map(({ id, icon, label }) => (
            <div key={id} className={`nav-item${id === 'overview' ? ' active' : ''}`} data-section={id} onClick={() => window.__showSection(id)}>
              <span className="nav-icon">{icon}</span> {label}
              <span className="nav-badge" id={`badge-${id}`}>—</span>
            </div>
          ))}
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

          {['pool','arcade','courier','ops','refunds'].map(id => (
            <div key={id} id={`section-${id}`} className="section-view">
              <div id={`${id}-content`}>
                <div className="empty-state">
                  <div className="empty-state-msg">Run the report to load data</div>
                </div>
              </div>
            </div>
          ))}
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

const DASHBOARD_CSS = `
:root {
  --bg:#0c0e15;--bg-card:#12151f;--bg-elevated:#181c28;--bg-hover:#1e2334;
  --border:#252b3b;--border-soft:#1c2030;--text-1:#eaf0ff;--text-2:#7d8aaa;--text-3:#404d69;
  --blue:#4f8eff;--blue-soft:rgba(79,142,255,.12);--green:#3dd68c;--green-soft:rgba(61,214,140,.12);
  --amber:#f5a428;--amber-soft:rgba(245,164,40,.12);--red:#ff5655;--red-soft:rgba(255,86,85,.12);
  --purple:#a78bfa;--purple-soft:rgba(167,139,250,.12);--cyan:#22d3ee;--cyan-soft:rgba(34,211,238,.12);
  --sidebar-w:230px;--topbar-h:56px;--radius:8px;
  --font-data:'JetBrains Mono',monospace;--font-head:'Syne',sans-serif;--font-body:'DM Sans',sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:15px}
body{background:var(--bg);color:var(--text-1);font-family:var(--font-body);line-height:1.5;overflow:hidden;height:100vh}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
#app{display:grid;grid-template-columns:var(--sidebar-w) 1fr;grid-template-rows:var(--topbar-h) 1fr;height:100vh}
#topbar{grid-column:1/3;grid-row:1;display:flex;align-items:center;gap:12px;padding:0 20px 0 24px;background:var(--bg-card);border-bottom:1px solid var(--border);z-index:20}
.logo{font-family:var(--font-head);font-size:1.05rem;font-weight:800;letter-spacing:-.5px;color:var(--text-1);margin-right:4px;display:flex;align-items:center;gap:8px}
.logo svg{color:var(--blue)}.topbar-sep{flex:1}
.user-pill{display:flex;align-items:center;gap:8px;font-size:.82rem;color:var(--text-2);padding:4px 12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px}
#period-select{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-1);border-radius:var(--radius);padding:6px 10px;font-family:var(--font-body);font-size:.85rem;cursor:pointer;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d8aaa' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:26px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--radius);font-family:var(--font-body);font-size:.85rem;font-weight:500;cursor:pointer;border:none;transition:opacity .15s,transform .1s}
.btn:active{transform:scale(.97)}.btn-primary{background:var(--blue);color:#fff}.btn-primary:hover{opacity:.85}.btn-primary:disabled{opacity:.45;cursor:not-allowed}
.btn-ghost{background:transparent;color:var(--text-2);border:1px solid var(--border)}.btn-ghost:hover{background:var(--bg-elevated);color:var(--text-1)}
#sidebar{grid-column:1;grid-row:2;background:var(--bg-card);border-right:1px solid var(--border);padding:12px 10px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
.nav-section-label{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);padding:8px 10px 4px;margin-top:6px}
.nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:6px;cursor:pointer;color:var(--text-2);font-size:.87rem;font-weight:500;transition:background .12s,color .12s;user-select:none}
.nav-item:hover{background:var(--bg-elevated);color:var(--text-1)}.nav-item.active{background:var(--blue-soft);color:var(--blue)}
.nav-icon{font-size:1rem;flex-shrink:0;width:18px;text-align:center}
.nav-badge{margin-left:auto;font-family:var(--font-data);font-size:.7rem;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-2);padding:1px 6px;border-radius:10px;display:none}
.nav-item.active .nav-badge{display:block;border-color:var(--blue);color:var(--blue);background:var(--blue-soft)}
.sidebar-footer{margin-top:auto;padding-top:12px;border-top:1px solid var(--border)}
#main{grid-column:2;grid-row:2;overflow-y:auto;padding:28px 32px}
.section-view{display:none}.section-view.active{display:block}
.page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px}
.page-title{font-family:var(--font-head);font-size:1.6rem;font-weight:800;letter-spacing:-.5px}
.page-subtitle{color:var(--text-2);font-size:.88rem;margin-top:3px}
.period-badge{font-family:var(--font-data);font-size:.75rem;background:var(--blue-soft);color:var(--blue);border:1px solid rgba(79,142,255,.25);padding:4px 10px;border-radius:20px;white-space:nowrap}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px}
.stat-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.stat-card.blue::before{background:var(--blue)}.stat-card.green::before{background:var(--green)}.stat-card.amber::before{background:var(--amber)}.stat-card.red::before{background:var(--red)}.stat-card.purple::before{background:var(--purple)}.stat-card.cyan::before{background:var(--cyan)}
.stat-label{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-2);margin-bottom:8px}
.stat-value{font-family:var(--font-data);font-size:1.9rem;font-weight:600;line-height:1;color:var(--text-1)}
.stat-value.blue{color:var(--blue)}.stat-value.green{color:var(--green)}.stat-value.amber{color:var(--amber)}.stat-value.red{color:var(--red)}.stat-value.purple{color:var(--purple)}.stat-value.cyan{color:var(--cyan)}
.stat-sub{font-size:.78rem;color:var(--text-2);margin-top:5px}
.section-block{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:20px;overflow:hidden}
.section-block-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border)}
.section-block-title{font-family:var(--font-head);font-size:1rem;font-weight:700;display:flex;align-items:center;gap:10px}
.section-block-title .color-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.section-block-subtitle{font-size:.78rem;color:var(--text-2);margin-top:2px}
.section-block-body{padding:16px 18px}
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
.bar-row-val{font-family:var(--font-data);font-size:.8rem;color:var(--text-2);width:32px;text-align:right;flex-shrink:0}
.inline-stats{display:flex;gap:20px;padding:12px 0 16px;flex-wrap:wrap}
.inline-stat{display:flex;flex-direction:column;gap:2px}
.inline-stat-val{font-family:var(--font-data);font-size:1.35rem;font-weight:600;color:var(--text-1)}
.inline-stat-lbl{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-2)}
#loading-overlay{position:fixed;inset:0;background:rgba(12,14,21,.92);z-index:100;display:none;align-items:center;justify-content:center;flex-direction:column;gap:20px}
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
.ticket-list-wrap{max-height:420px;overflow-y:auto}
table.ticket-table{font-size:.8rem}
table.ticket-table td:first-child{font-family:var(--font-data);font-size:.75rem;color:var(--blue)}
.accent-blue{color:var(--blue)}.accent-green{color:var(--green)}.accent-amber{color:var(--amber)}.accent-red{color:var(--red)}.accent-purple{color:var(--purple)}
.dot-blue{background:var(--blue)}.dot-green{background:var(--green)}.dot-amber{background:var(--amber)}.dot-red{background:var(--red)}.dot-purple{background:var(--purple)}.dot-cyan{background:var(--cyan)}
`

const DASHBOARD_LOGIC = `
const FIELD_NAMES={PRODUCT:'Product',REASON:'Contact Reason',DAMAGE:'Pool Table Damage',ARCADE_ISSUE:'Arcade Machine Issue/Damage',COURIER:'Courier',RESOLUTION:'Resolution',REFUND_VALUE:'Refund Value',ORDER_NUMBER:'Shopify/Warehouse Number'};
const POOL_PRODUCT='CSLT Pool Tables';
const REASON_SUPPLIER='Item Damaged::Supplier Issue';
const REASON_COURIER_POOL='Item Damaged::Courier Fault';
const ARCADE_PRODUCTS=['Upright Arcade','Cocktail Pro','Cocktail MKII'];
const ARCADE_REASON='Item Not Working';
const COURIER_REASONS=['Item Missing::Courier Fault','WISMO::Item Delayed::Courier Fault','WISMO::Wrong Address::Customer Fault','Item Damaged::Courier Fault'];
const OPS_REASONS=['Item Missing::Picking Issue::Ops Mistake','WISMO::Tracking Not Supplied','WISMO::Item Delayed::Ops Delay','WISMO::Wrong Address::Ops Fault','Wrong Item Delivered::Ops Misorder'];
const REFUND_VALUES=['Refund','Partial Refund'];
const REPLACEMENT_VALUES=['Free Product Upgrade','Free Gift','Replacement Sent'];

let state={fieldMap:{},tickets:[],lookbackDays:30,hasData:false};

function getFieldById(t,id){if(!id)return'Not Set';const f=t.custom_fields;if(!f||typeof f!=='object')return'Not Set';const e=f[String(id)];if(!e)return'Not Set';return e.value!=null?String(e.value):'Not Set';}
function statusCounts(tickets){const c={open:0,closed:0,pending:0};tickets.forEach(t=>{const s=(t.status||'').toLowerCase();if(c[s]!==undefined)c[s]++;else c.open++;});return c;}
function avgResHours(tickets){const cl=tickets.filter(t=>t.status==='closed'&&t.created_datetime&&t.closed_datetime);if(!cl.length)return null;const tot=cl.reduce((s,t)=>s+(new Date(t.closed_datetime)-new Date(t.created_datetime))/3600000,0);return(tot/cl.length).toFixed(1);}
function groupBy(tickets,fn){return tickets.reduce((a,t)=>{const k=fn(t)||'Not Set';if(!a[k])a[k]=[];a[k].push(t);return a;},{});}
function dedup(arr){const s=new Set();return arr.filter(t=>{if(s.has(t.id))return false;s.add(t.id);return true;});}
function pct(n,total){if(!total)return'—';return((n/total)*100).toFixed(1)+'%';}
function fmtMoney(v){const n=parseFloat(String(v).replace(/[^0-9.]/g,''));return isNaN(n)?null:n;}
function sumMoney(tickets,fid){return tickets.reduce((s,t)=>{const v=fmtMoney(getFieldById(t,fid));return s+(v||0);},0);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function sortedEntries(obj){return Object.entries(obj).sort((a,b)=>b[1].length-a[1].length);}

async function fetchCustomFields(){const j=await window.__authFetch('/api/custom-fields');const map={};(j.data||[]).forEach(f=>{if(f.label)map[f.label.toLowerCase()]=f.id;});return map;}
async function fetchAllTickets(days,onProgress){const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);const all=[];let cursor=null,page=0,done=false;while(!done){page++;const url=cursor?'/api/tickets?cursor='+encodeURIComponent(cursor):'/api/tickets';onProgress('Fetching page '+page+'… ('+all.length+' tickets so far)');const j=await window.__authFetch(url);const pt=j.data||[];let hit=false;for(const t of pt){if(new Date(t.created_datetime)>=cutoff)all.push(t);else{hit=true;break;}}if(hit||!j.meta?.next_cursor)done=true;else cursor=j.meta.next_cursor;}return all;}

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
    addLog('→ Fetching tickets…');
    state.tickets=await fetchAllTickets(state.lookbackDays,msg=>{addLog(msg);barEl.style.width=Math.min(85,15+state.tickets.length/5)+'%';});
    barEl.style.width='95%';
    addLog('✓ Fetched '+state.tickets.length+' tickets in last '+state.lookbackDays+' days','done');
    addLog('→ Processing & rendering…');
    state.hasData=true;renderAll();
    barEl.style.width='100%';addLog('✓ Done!','done');
    document.getElementById('last-run-time').textContent='Updated '+new Date().toLocaleTimeString();
    setTimeout(()=>showLoading(false),500);
  }catch(e){showLoading(false);errBanner.textContent='Error: '+e.message;errBanner.classList.add('visible');console.error(e);}
  btn.disabled=false;
}

function renderAll(){renderOverview();renderPool();renderArcade();renderCourier();renderOps();renderRefunds();updateBadges();document.getElementById('welcome').style.display='none';document.getElementById('overview-content').style.display='block';const label='Last '+state.lookbackDays+' days';['pool','arcade','courier','ops','refunds'].forEach(s=>{const el=document.getElementById('pb-'+s);if(el)el.textContent=label;});}

function inlineStats(tickets,totalAll){const sc=statusCounts(tickets);const avg=avgResHours(tickets);return '<div class="inline-stats"><div class="inline-stat"><div class="inline-stat-val">'+tickets.length+'</div><div class="inline-stat-lbl">Total</div></div><div class="inline-stat"><div class="inline-stat-val" style="color:var(--amber)">'+sc.open+'</div><div class="inline-stat-lbl">Open</div></div><div class="inline-stat"><div class="inline-stat-val" style="color:var(--green)">'+sc.closed+'</div><div class="inline-stat-lbl">Closed</div></div><div class="inline-stat"><div class="inline-stat-val" style="color:var(--purple)">'+sc.pending+'</div><div class="inline-stat-lbl">Pending</div></div><div class="inline-stat"><div class="inline-stat-val" style="color:var(--text-2);font-size:1rem">'+(avg!==null?avg+'h':'—')+'</div><div class="inline-stat-lbl">Avg Res.</div></div><div class="inline-stat"><div class="inline-stat-val" style="color:var(--text-2);font-size:1rem">'+pct(tickets.length,totalAll)+'</div><div class="inline-stat-lbl">% of All</div></div></div>';}

function breakdownTable(rows,col1){if(!rows.length)return'<div class="empty-state" style="padding:16px"><div class="empty-state-msg">No tickets matched</div></div>';let html='<div class="data-table-wrap"><table class="data-table"><thead><tr><th>'+esc(col1)+'</th><th>Count</th><th>Open</th><th>Closed</th><th>Pending</th><th>Avg Res.</th></tr></thead><tbody>';let gt=0;rows.forEach(([label,tickets])=>{const sc=statusCounts(tickets);const avg=avgResHours(tickets);gt+=tickets.length;html+='<tr><td>'+esc(label)+'</td><td>'+tickets.length+'</td><td><span class="tag tag-open">'+sc.open+'</span></td><td><span class="tag tag-closed">'+sc.closed+'</span></td><td><span class="tag tag-pending">'+sc.pending+'</span></td><td>'+(avg!==null?avg+'h':'—')+'</td></tr>';});html+='</tbody><tfoot><tr class="total-row"><td>Total</td><td>'+gt+'</td><td colspan="4"></td></tr></tfoot></table></div>';return html;}

function renderOverview(){const{tickets,fieldMap,lookbackDays}=state;const total=tickets.length;const sc=statusCounts(tickets);const fid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];const byProduct=groupBy(tickets,t=>getFieldById(t,fid));const pe=sortedEntries(byProduct).slice(0,12);const maxP=pe[0]?.[1].length||1;const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];const opsTotal=dedup(tickets.filter(t=>OPS_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase()))).length;const courierTotal=dedup(tickets.filter(t=>COURIER_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase()))).length;const resfid=fieldMap[FIELD_NAMES.RESOLUTION.toLowerCase()];const refundTotal=tickets.filter(t=>REFUND_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase())).length;const prodBars=pe.map(([name,tix])=>'<div class="bar-row"><div class="bar-row-label" title="'+esc(name)+'">'+esc(name)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+(tix.length/maxP*100).toFixed(1)+'%;background:var(--blue)"></div></div><div class="bar-row-val">'+tix.length+'</div></div>').join('');const resfid2=fieldMap[FIELD_NAMES.RESOLUTION.toLowerCase()];const replTix=tickets.filter(t=>REPLACEMENT_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid2).toLowerCase()));const catRows=[['Ops Issues',opsTotal,'var(--red)'],['Courier Issues',courierTotal,'var(--amber)'],['Refunds',refundTotal,'var(--purple)'],['Replacements',replTix.length,'var(--green)']];const maxCat=Math.max(...catRows.map(r=>r[1]),1);const catBars=catRows.map(([label,count,color])=>'<div class="bar-row"><div class="bar-row-label">'+esc(label)+'</div><div class="bar-track"><div class="bar-fill" style="width:'+(count/maxCat*100).toFixed(1)+'%;background:'+color+'"></div></div><div class="bar-row-val">'+count+'</div></div>').join('');const html='<div class="page-header"><div><div class="page-title">◈ Overview</div><div class="page-subtitle">Last '+lookbackDays+' days &nbsp;·&nbsp; '+total+' total tickets</div></div><div class="period-badge">Last '+lookbackDays+' days</div></div><div class="stats-grid"><div class="stat-card blue"><div class="stat-label">Total Tickets</div><div class="stat-value blue">'+total+'</div></div><div class="stat-card amber"><div class="stat-label">Open</div><div class="stat-value amber">'+sc.open+'</div><div class="stat-sub">'+pct(sc.open,total)+' of total</div></div><div class="stat-card green"><div class="stat-label">Closed</div><div class="stat-value green">'+sc.closed+'</div><div class="stat-sub">'+pct(sc.closed,total)+' of total</div></div><div class="stat-card purple"><div class="stat-label">Pending</div><div class="stat-value purple">'+sc.pending+'</div><div class="stat-sub">'+pct(sc.pending,total)+' of total</div></div><div class="stat-card red"><div class="stat-label">Ops Issues</div><div class="stat-value red">'+opsTotal+'</div><div class="stat-sub">'+pct(opsTotal,total)+' of total</div></div><div class="stat-card amber"><div class="stat-label">Courier Issues</div><div class="stat-value amber">'+courierTotal+'</div><div class="stat-sub">'+pct(courierTotal,total)+' of total</div></div></div><div class="blocks-2col"><div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-blue"></span>Tickets by Product</div></div></div><div class="section-block-body">'+prodBars+'</div></div><div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-amber"></span>Category Snapshot</div></div></div><div class="section-block-body">'+catBars+'</div></div></div>';document.getElementById('overview-content').innerHTML=html;}

function renderPool(){const{tickets,fieldMap}=state;const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];const did=fieldMap[FIELD_NAMES.DAMAGE.toLowerCase()];const poolT=tickets.filter(t=>getFieldById(t,pid).toLowerCase()===POOL_PRODUCT.toLowerCase());const supT=poolT.filter(t=>getFieldById(t,rid).toLowerCase()===REASON_SUPPLIER.toLowerCase());const courT=poolT.filter(t=>getFieldById(t,rid).toLowerCase()===REASON_COURIER_POOL.toLowerCase());const allD=dedup([...supT,...courT]);const total=tickets.length;document.getElementById('badge-pool').textContent=allD.length;const sections=[{title:'Supplier Issue',color:'blue',dot:'dot-blue',tickets:supT},{title:'Courier Fault',color:'amber',dot:'dot-amber',tickets:courT},{title:'Total Damages (Supplier + Courier)',color:'red',dot:'dot-red',tickets:allD}];let html='<div class="page-header"><div><div class="page-title accent-blue">🎱 Pool Tables</div><div class="page-subtitle">CSLT Pool Tables — Supplier &amp; Courier damage breakdown</div></div><div class="period-badge" id="pb-pool">Last '+state.lookbackDays+' days</div></div>';sections.forEach(({title,dot,tickets:tix})=>{const byD=sortedEntries(groupBy(tix,t=>getFieldById(t,did)));html+='<div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot '+dot+'"></span>'+esc(title)+'</div><div class="section-block-subtitle">'+tix.length+' tickets · '+pct(tix.length,total)+' of all tickets</div></div></div><div class="section-block-body">'+inlineStats(tix,total)+breakdownTable(byD,'Damage Type')+'</div></div>';});document.getElementById('pool-content').innerHTML=html;}

function renderArcade(){const{tickets,fieldMap}=state;const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];const aid=fieldMap[FIELD_NAMES.ARCADE_ISSUE.toLowerCase()];const total=tickets.length;const colors=['blue','green','amber'];const dots=['dot-blue','dot-green','dot-amber'];const sets=ARCADE_PRODUCTS.map((prod,i)=>({product:prod,tickets:tickets.filter(t=>getFieldById(t,pid).toLowerCase()===prod.toLowerCase()&&getFieldById(t,rid).toLowerCase()===ARCADE_REASON.toLowerCase()),color:colors[i],dot:dots[i]}));const allArcade=dedup(sets.flatMap(s=>s.tickets));document.getElementById('badge-arcade').textContent=allArcade.length;let html='<div class="page-header"><div><div class="page-title accent-green">🕹 Gao Arcades</div><div class="page-subtitle">Upright Arcade · Cocktail Pro · Cocktail MKII — Item Not Working</div></div><div class="period-badge" id="pb-arcade">Last '+state.lookbackDays+' days</div></div>';sets.forEach(({product,tickets:tix,dot})=>{const byI=sortedEntries(groupBy(tix,t=>getFieldById(t,aid)));html+='<div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot '+dot+'"></span>'+esc(product)+'</div><div class="section-block-subtitle">'+tix.length+' tickets · Contact Reason: '+ARCADE_REASON+'</div></div></div><div class="section-block-body">'+inlineStats(tix,total)+breakdownTable(byI,'Issue / Damage Type')+'</div></div>';});const byIA=sortedEntries(groupBy(allArcade,t=>getFieldById(t,aid)));html+='<div class="section-block" style="border-color:rgba(255,86,85,.3)"><div class="section-block-header" style="background:var(--red-soft)"><div><div class="section-block-title"><span class="color-dot dot-red"></span>All Arcade Machines — Combined</div><div class="section-block-subtitle">'+allArcade.length+' total</div></div></div><div class="section-block-body">'+inlineStats(allArcade,total)+breakdownTable(byIA,'Issue / Damage Type')+'</div></div>';document.getElementById('arcade-content').innerHTML=html;}

function renderCourier(){const{tickets,fieldMap}=state;const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];const cid=fieldMap[FIELD_NAMES.COURIER.toLowerCase()];const total=tickets.length;const dots=['dot-red','dot-amber','dot-blue','dot-purple'];const allC=dedup(tickets.filter(t=>COURIER_REASONS.some(r=>getFieldById(t,rid).toLowerCase()===r.toLowerCase())));document.getElementById('badge-courier').textContent=allC.length;let html='<div class="page-header"><div><div class="page-title accent-amber">🚚 Courier Issues</div><div class="page-subtitle">Missing · Delayed · Wrong Address · Damaged — by courier</div></div><div class="period-badge" id="pb-courier">Last '+state.lookbackDays+' days</div></div>';COURIER_REASONS.forEach((reason,i)=>{const tix=tickets.filter(t=>getFieldById(t,rid).toLowerCase()===reason.toLowerCase());const byC=sortedEntries(groupBy(tix,t=>getFieldById(t,cid)));html+='<div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot '+dots[i]+'"></span>'+esc(reason)+'</div><div class="section-block-subtitle">'+tix.length+' tickets</div></div></div><div class="section-block-body">'+inlineStats(tix,total)+breakdownTable(byC,'Courier')+'</div></div>';});const byCAll=sortedEntries(groupBy(allC,t=>getFieldById(t,cid)));const worst=byCAll[0]?.[0]||'—';html+='<div class="section-block" style="border-color:rgba(79,142,255,.25)"><div class="section-block-header" style="background:var(--blue-soft)"><div><div class="section-block-title"><span class="color-dot dot-blue"></span>Total Courier Issues — All Reasons</div><div class="section-block-subtitle">Worst offender: <strong>'+esc(worst)+'</strong></div></div></div><div class="section-block-body">'+inlineStats(allC,total)+breakdownTable(byCAll,'Courier')+'</div></div>';document.getElementById('courier-content').innerHTML=html;}

function renderOps(){const{tickets,fieldMap}=state;const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];const total=tickets.length;const opsGroups=OPS_REASONS.map(reason=>({reason,tickets:tickets.filter(t=>getFieldById(t,rid).toLowerCase()===reason.toLowerCase())}));const opsTotal=dedup(opsGroups.flatMap(g=>g.tickets)).length;document.getElementById('badge-ops').textContent=opsTotal;const scAll={open:0,closed:0,pending:0};let summaryRows=opsGroups.map(({reason,tickets:tix})=>{const sc=statusCounts(tix);scAll.open+=sc.open;scAll.closed+=sc.closed;scAll.pending+=sc.pending;return'<tr><td style="max-width:340px;white-space:normal">'+esc(reason)+'</td><td>'+tix.length+'</td><td><span class="tag tag-open">'+sc.open+'</span></td><td><span class="tag tag-closed">'+sc.closed+'</span></td><td><span class="tag tag-pending">'+sc.pending+'</span></td></tr>';}).join('');let html='<div class="page-header"><div><div class="page-title accent-red">⚙️ Ops Issues</div><div class="page-subtitle">Picking errors · Tracking · Delays · Wrong address · Misorder</div></div><div class="period-badge" id="pb-ops">Last '+state.lookbackDays+' days</div></div><div class="section-block" style="margin-bottom:24px"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-red"></span>Ops Summary — All Reasons</div></div></div><div class="section-block-body"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Contact Reason</th><th>Total</th><th>Open</th><th>Closed</th><th>Pending</th></tr></thead><tbody>'+summaryRows+'</tbody><tfoot><tr class="total-row"><td>TOTAL</td><td>'+opsTotal+'</td><td><span class="tag tag-open">'+scAll.open+'</span></td><td><span class="tag tag-closed">'+scAll.closed+'</span></td><td><span class="tag tag-pending">'+scAll.pending+'</span></td></tr></tfoot></table></div></div></div>';const dots=['dot-red','dot-amber','dot-blue','dot-purple','dot-cyan'];opsGroups.forEach(({reason,tickets:tix},i)=>{const byP=sortedEntries(groupBy(tix,t=>getFieldById(t,pid)));html+='<div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot '+dots[i]+'"></span>'+esc(reason)+'</div><div class="section-block-subtitle">'+tix.length+' tickets · '+pct(tix.length,total)+' of all</div></div></div><div class="section-block-body">'+inlineStats(tix,total)+breakdownTable(byP,'Product')+'</div></div>';});document.getElementById('ops-content').innerHTML=html;}

function renderRefunds(){const{tickets,fieldMap}=state;const pid=fieldMap[FIELD_NAMES.PRODUCT.toLowerCase()];const resfid=fieldMap[FIELD_NAMES.RESOLUTION.toLowerCase()];const rvfid=fieldMap[FIELD_NAMES.REFUND_VALUE.toLowerCase()];const onfid=fieldMap[FIELD_NAMES.ORDER_NUMBER.toLowerCase()];const rid=fieldMap[FIELD_NAMES.REASON.toLowerCase()];const total=tickets.length;const refundTix=tickets.filter(t=>REFUND_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase()));const fullR=refundTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='refund');const partR=refundTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='partial refund');const totalVal=sumMoney(refundTix,rvfid);const fullVal=sumMoney(fullR,rvfid);const partVal=sumMoney(partR,rvfid);const replTix=tickets.filter(t=>REPLACEMENT_VALUES.map(v=>v.toLowerCase()).includes(getFieldById(t,resfid).toLowerCase()));const freeU=replTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='free product upgrade');const freeG=replTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='free gift');const replS=replTix.filter(t=>getFieldById(t,resfid).toLowerCase()==='replacement sent');document.getElementById('badge-refunds').textContent=refundTix.length+replTix.length;const byProdR=sortedEntries(groupBy(refundTix,t=>getFieldById(t,pid)));const prodRows=byProdR.map(([prod,tix])=>{const val=sumMoney(tix,rvfid);const partial=tix.filter(t=>getFieldById(t,resfid).toLowerCase()==='partial refund').length;return'<tr><td>'+esc(prod)+'</td><td>'+tix.length+'</td><td><span class="val-chip">$'+val.toFixed(2)+'</span></td><td>'+(tix.length>0?'$'+(val/tix.length).toFixed(2):'—')+'</td><td>'+partial+'</td></tr>';}).join('');const byProdRepl=sortedEntries(groupBy(replTix,t=>getFieldById(t,pid)));const replRows=byProdRepl.map(([prod,tix])=>{const u=tix.filter(t=>getFieldById(t,resfid).toLowerCase()==='free product upgrade').length;const g=tix.filter(t=>getFieldById(t,resfid).toLowerCase()==='free gift').length;const r=tix.filter(t=>getFieldById(t,resfid).toLowerCase()==='replacement sent').length;return'<tr><td>'+esc(prod)+'</td><td>'+tix.length+'</td><td>'+u+'</td><td>'+g+'</td><td>'+r+'</td></tr>';}).join('');const refTicketRows=[...refundTix].sort((a,b)=>new Date(b.created_datetime)-new Date(a.created_datetime)).map(t=>{const res=getFieldById(t,resfid);const val=fmtMoney(getFieldById(t,rvfid));const valStr=val!==null?'<span class="val-chip">$'+val.toFixed(2)+'</span>':'—';const date=t.created_datetime?new Date(t.created_datetime).toLocaleDateString('en-AU'):'—';const rc=res.toLowerCase()==='refund'?'tag-open':'tag-pending';return'<tr><td>'+t.id+'</td><td>'+esc((t.customer?.name)||'Unknown')+'</td><td>'+esc(getFieldById(t,pid))+'</td><td><span class="tag '+rc+'">'+esc(res)+'</span></td><td>'+valStr+'</td><td><span class="tag '+(t.status==='closed'?'tag-closed':t.status==='pending'?'tag-pending':'tag-open')+'">'+t.status+'</span></td><td style="color:var(--text-2)">'+date+'</td></tr>';}).join('');const replTicketRows=[...replTix].sort((a,b)=>new Date(b.created_datetime)-new Date(a.created_datetime)).map(t=>{const res=getFieldById(t,resfid);const order=getFieldById(t,onfid);const reason=getFieldById(t,rid);const rc=res.toLowerCase()==='replacement sent'?'tag-closed':res.toLowerCase()==='free product upgrade'?'tag-open':'tag-pending';return'<tr><td>'+t.id+'</td><td>'+esc((t.customer?.name)||'Unknown')+'</td><td>'+esc(getFieldById(t,pid))+'</td><td><span class="tag '+rc+'">'+esc(res)+'</span></td><td style="max-width:220px;white-space:normal;font-size:.78rem;color:var(--text-2)">'+esc(reason)+'</td><td style="font-family:var(--font-data);font-size:.75rem">'+esc(order)+'</td></tr>';}).join('');let html='<div class="page-header"><div><div class="page-title accent-purple">💰 Refunds &amp; Replacements</div><div class="page-subtitle">Full refunds · Partial refunds · Replacements · Free gifts — all products</div></div><div class="period-badge" id="pb-refunds">Last '+state.lookbackDays+' days</div></div><div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))"><div class="stat-card red"><div class="stat-label">Full Refunds</div><div class="stat-value red">'+fullR.length+'</div><div class="stat-sub">$'+fullVal.toFixed(2)+' total</div></div><div class="stat-card amber"><div class="stat-label">Partial Refunds</div><div class="stat-value amber">'+partR.length+'</div><div class="stat-sub">$'+partVal.toFixed(2)+' total</div></div><div class="stat-card purple"><div class="stat-label">Total Refund Value</div><div class="stat-value purple" style="font-size:1.4rem">$'+totalVal.toFixed(2)+'</div><div class="stat-sub">'+refundTix.length+' tickets</div></div><div class="stat-card green"><div class="stat-label">Replacements</div><div class="stat-value green">'+replS.length+'</div><div class="stat-sub">'+pct(replS.length,total)+' of all</div></div><div class="stat-card cyan"><div class="stat-label">Free Upgrades</div><div class="stat-value" style="color:var(--cyan)">'+freeU.length+'</div></div><div class="stat-card blue"><div class="stat-label">Free Gifts</div><div class="stat-value blue">'+freeG.length+'</div></div></div><div class="blocks-2col"><div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-purple"></span>Refunds by Product</div></div></div><div class="section-block-body"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Count</th><th>Total Value</th><th>Avg Value</th><th>Partial</th></tr></thead><tbody>'+prodRows+'</tbody><tfoot><tr class="total-row"><td>Total</td><td>'+refundTix.length+'</td><td><span class="val-chip">$'+totalVal.toFixed(2)+'</span></td><td></td><td>'+partR.length+'</td></tr></tfoot></table></div></div></div><div class="section-block"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-green"></span>Replacements by Product</div></div></div><div class="section-block-body"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Total</th><th>Upgrades</th><th>Free Gifts</th><th>Replacements</th></tr></thead><tbody>'+replRows+'</tbody><tfoot><tr class="total-row"><td>Total</td><td>'+replTix.length+'</td><td>'+freeU.length+'</td><td>'+freeG.length+'</td><td>'+replS.length+'</td></tr></tfoot></table></div></div></div></div><div class="section-block" style="margin-top:20px"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-red"></span>All Refund Tickets</div><div class="section-block-subtitle">'+refundTix.length+' tickets · newest first</div></div></div><div class="section-block-body"><div class="ticket-list-wrap"><div class="data-table-wrap"><table class="data-table ticket-table"><thead><tr><th>Ticket ID</th><th>Customer</th><th>Product</th><th>Resolution</th><th>Value</th><th>Status</th><th>Date</th></tr></thead><tbody>'+refTicketRows+'</tbody></table></div></div></div></div><div class="section-block" style="margin-top:20px"><div class="section-block-header"><div><div class="section-block-title"><span class="color-dot dot-green"></span>All Replacement Tickets</div><div class="section-block-subtitle">'+replTix.length+' tickets · includes order numbers</div></div></div><div class="section-block-body"><div class="ticket-list-wrap"><div class="data-table-wrap"><table class="data-table ticket-table"><thead><tr><th>Ticket ID</th><th>Customer</th><th>Product</th><th>Resolution</th><th>Contact Reason</th><th>Order No.</th></tr></thead><tbody>'+replTicketRows+'</tbody></table></div></div></div></div>';document.getElementById('refunds-content').innerHTML=html;}

function updateBadges(){document.getElementById('badge-overview').textContent=state.tickets.length;}

function showSection(name){document.querySelectorAll('.section-view').forEach(el=>el.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));document.getElementById('section-'+name).classList.add('active');document.querySelector('.nav-item[data-section="'+name+'"]').classList.add('active');}

function showLoading(show){const el=document.getElementById('loading-overlay');if(show){el.classList.add('visible');document.getElementById('loading-log').innerHTML='';document.getElementById('loading-bar').style.width='0%';}else{el.classList.remove('visible');}}
`
