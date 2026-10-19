/* Lease Watch — Dashboard tab: filter by property, POS status, check-in and check-out dates. */
(function(){
const LW = window.LW; if(!LW) return;
const $ = id => document.getElementById(id);
const esc = LW.esc, fmt = LW.fmt;
function lsGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

const css = `
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line)}
.tabs button{border:0;border-bottom:3px solid transparent;border-radius:0;background:none;padding:8px 14px;font-family:var(--f-display);font-weight:600;font-size:1rem;color:var(--muted)}
.tabs button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--accent)}
.filters{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px}
.frow{display:grid;grid-template-columns:2fr 1fr;gap:10px}
.fdates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.fdates fieldset{border:1px solid var(--line);border-radius:10px;padding:8px 10px 10px;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0}
.fdates legend{font-size:.78rem;color:var(--muted);font-weight:600;padding:0 4px;text-transform:uppercase;letter-spacing:.05em}
.fdates label{font-size:.75rem}
.quick{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:4px}
.quick button{padding:3px 9px;font-size:.76rem;border-radius:999px}
.chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.chips .lbl{font-size:.78rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-right:4px}
.fchip{border-radius:999px;padding:5px 12px;font-size:.84rem;display:inline-flex;gap:6px;align-items:center}
.fchip[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent)}
.fchip i{width:9px;height:9px;border-radius:50%;display:inline-block}
.factions{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center}
.dkpi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.dkpi button{text-align:left;display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:10px}
.dkpi b{font-family:var(--f-display);font-size:1.6rem;line-height:1;font-variant-numeric:tabular-nums}
.dkpi span{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.dkpi button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}
@media (max-width:640px){.dkpi{grid-template-columns:repeat(2,minmax(0,1fr))}.frow,.fdates{grid-template-columns:1fr}}
.bars{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.bar{display:grid;grid-template-columns:minmax(90px,150px) 1fr 44px;gap:10px;align-items:center;font-size:.84rem;cursor:pointer;background:none;border:0;padding:3px 0;text-align:left;border-radius:6px}
.bar:hover .track{outline:1px solid var(--accent)}
.bar .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar .n{font-family:var(--f-mono);text-align:right;font-variant-numeric:tabular-nums;color:var(--muted)}
.track{display:flex;height:14px;border-radius:4px;overflow:hidden;background:var(--bg)}
.track span{display:block;height:100%}
.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:.76rem;color:var(--muted)}
.legend span{display:inline-flex;gap:5px;align-items:center}
.legend i{width:10px;height:10px;border-radius:2px;display:inline-block}
th.sort{cursor:pointer;user-select:none}
th.sort:hover{color:var(--ink)}
/* wide screens: use the width */
.wrap{max-width:1480px}
.remGrid{display:flex;flex-direction:column;gap:22px}
.remCol{display:flex;flex-direction:column;gap:22px;min-width:0}
.dmain,.dsplit{display:flex;flex-direction:column;gap:14px;min-width:0}
@media (min-width:1000px){
  .remGrid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);align-items:start}
  #dashView{display:grid!important;grid-template-columns:300px minmax(0,1fr);align-items:start;gap:18px!important}
  #dashView[hidden]{display:none!important}
  #dashView .filters{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}
  #dashView .frow,#dashView .fdates{grid-template-columns:1fr}
  #dashView .fdates label{min-width:0}
  #dashView input[type=date]{min-width:0;width:100%;padding:6px 6px;font-size:13px}
  .dsplit{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);align-items:start}
  .dsplit .bars{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}
}
@media (min-width:1000px) and (max-width:1250px){ .dsplit{grid-template-columns:1fr} .dsplit .bars{position:static;max-height:none} }
`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

/* status buckets */
const S = {
  expired:{label:'Expired · still in', color:'var(--bad)'},
  in:{label:'Checked in', color:'var(--accent)'},
  notin:{label:'Not checked in', color:'var(--warn)'},
  out:{label:'Checked out', color:'var(--good)'}
};
const ORDER=['expired','in','notin','out'];
function bucket(l){ const c=LW.classify(l); return l.posOut?'out':c.overdue?'expired':l.posIn?'in':'notin'; }

const f = Object.assign({q:'',prop:'',status:[],inFrom:'',inTo:'',outFrom:'',outTo:'',sort:'leaseEnd',dir:1}, lsGet('lw-dash',{}));
const save = () => lsSet('lw-dash',{prop:f.prop,status:f.status,sort:f.sort,dir:f.dir});
let tab = lsGet('lw-tab','rem');

/* layout: tab bar + dashboard container */
const wrap=document.querySelector('.wrap'), header=wrap.querySelector('header');
const tabs=document.createElement('div'); tabs.className='tabs'; tabs.setAttribute('role','tablist');
tabs.innerHTML='<button role="tab" data-tab="rem">Reminders</button><button role="tab" data-tab="dash">Dashboard</button>';
header.after(tabs);
const dash=document.createElement('div'); dash.id='dashView'; dash.style.cssText='display:flex;flex-direction:column;gap:14px';
dash.innerHTML=`
<div class="filters">
  <div class="frow">
    <input id="d_q" type="search" placeholder="Search client, unit or notes" autocomplete="off">
    <select id="d_prop"><option value="">All properties</option></select>
  </div>
  <div class="chips" id="d_status"><span class="lbl">POS status</span></div>
  <div class="fdates">
    <fieldset><legend>Check-in date</legend>
      <label>From<input type="date" id="d_inFrom"></label><label>To<input type="date" id="d_inTo"></label>
      <div class="quick" data-for="in"></div>
    </fieldset>
    <fieldset><legend>Check-out (lease end)</legend>
      <label>From<input type="date" id="d_outFrom"></label><label>To<input type="date" id="d_outTo"></label>
      <div class="quick" data-for="out"></div>
    </fieldset>
  </div>
  <div class="factions"><span class="hint" id="d_summary"></span><span class="btns"><button class="small" id="d_csv">Download CSV</button><button class="small" id="d_clear">Clear filters</button></span></div>
</div>
<div class="dmain">
<div class="dkpi" id="d_kpi"></div>
<div class="dsplit">
<section><h2>By property <span class="count" id="d_pcount"></span></h2>
  <div class="bars" id="d_bars"></div>
</section>
<section style="min-width:0"><h2>Leases <span class="count" id="d_count"></span></h2>
  <div class="tablewrap"><table>
    <thead><tr><th class="sort" data-sort="client">Client</th><th class="sort" data-sort="property">Property · Unit</th><th class="sort" data-sort="checkIn">Check-in</th><th class="sort" data-sort="leaseEnd">Lease end</th><th class="sort" data-sort="status">POS status</th><th></th></tr></thead>
    <tbody id="d_body"></tbody></table></div>
  <button class="more small" id="d_more" hidden>Show more</button>
</section>
</div></div>`;
tabs.after(dash);

/* Reminders tab: expired + missed check-ins on the left, upcoming on the right */
const remGrid=document.createElement('div'); remGrid.className='remGrid';
const colL=document.createElement('div'), colR=document.createElement('div'); colL.className=colR.className='remCol';
const secOver=$('secOverdue'), secMiss=$('secMissedIn'), winbar=$('windowbar');
const secOut=$('listOut').closest('section'), secIn=$('listIn').closest('section');
secOver.before(remGrid); remGrid.append(colL,colR);
colL.append(secOver,secMiss); colR.append(winbar,secOut,secIn);

/* quick date ranges */
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());
function today(){ const t=LW.today(); const [y,m,d]=t.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
function addDays(d,n){ const x=new Date(d); x.setUTCDate(x.getUTCDate()+n); return x; }
const QUICK={
  'Past':()=>['',iso(addDays(today(),-1))],
  'Next 7 days':()=>[iso(today()),iso(addDays(today(),7))],
  'Next 30 days':()=>[iso(today()),iso(addDays(today(),30))],
  'This month':()=>{const t=today();return [iso(new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),1))),iso(new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)))];},
  'Next month':()=>{const t=today();return [iso(new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,1))),iso(new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+2,0)))];}
};
dash.querySelectorAll('.quick').forEach(q=>{ q.innerHTML=Object.keys(QUICK).map(k=>`<button type="button" data-q="${k}">${k}</button>`).join('')+'<button type="button" data-q="">Any</button>'; });

$('d_status').insertAdjacentHTML('beforeend', ORDER.map(k=>`<button class="fchip" data-st="${k}"><i style="background:${S[k].color}"></i>${S[k].label}</button>`).join(''));
let shown=100;

function filtered(){
  const q=f.q.toLowerCase();
  return LW.state.leases.filter(l=>{
    if(f.prop && l.property!==f.prop) return false;
    if(q && ![l.client,l.property,l.unit,l.notes].join(' ').toLowerCase().includes(q)) return false;
    if(f.inFrom && !(l.checkIn && l.checkIn>=f.inFrom)) return false;
    if(f.inTo && !(l.checkIn && l.checkIn<=f.inTo)) return false;
    if(f.outFrom && !(l.leaseEnd && l.leaseEnd>=f.outFrom)) return false;
    if(f.outTo && !(l.leaseEnd && l.leaseEnd<=f.outTo)) return false;
    return true;
  });
}
const pill = b => `<span class="pill ${b==='expired'?'bad':b==='out'?'good':b==='notin'?'warn':'neutral'}">${S[b].label}</span>`;

function draw(){
  const show = tab==='dash';
  dash.hidden = !show;
  [...wrap.children].forEach(el=>{ if(el===header||el===tabs||el===dash||el.id==='installBar') return; el.style.display = show?'none':''; });
  tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.tab===tab)));
  if(!show) return;

  const L=LW.state.leases;
  const props=[...new Set(L.map(l=>l.property).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  $('d_prop').innerHTML='<option value="">All properties</option>'+props.map(p=>`<option${p===f.prop?' selected':''}>${esc(p)}</option>`).join('');
  ['q','inFrom','inTo','outFrom','outTo'].forEach(k=>{ const el=$('d_'+k); if(el.value!==f[k]) el.value=f[k]; });
  $('d_status').querySelectorAll('[data-st]').forEach(b=>b.setAttribute('aria-pressed', String(f.status.includes(b.dataset.st))));

  const base=filtered();                       // everything except the status filter
  const counts=ORDER.reduce((a,k)=>(a[k]=0,a),{}); base.forEach(l=>counts[bucket(l)]++);
  const rows=f.status.length?base.filter(l=>f.status.includes(bucket(l))):base;

  $('d_kpi').innerHTML=`<button data-kpi="" aria-pressed="${!f.status.length}"><b>${base.length}</b><span>All matching</span></button>`+
    ORDER.map(k=>`<button data-kpi="${k}" aria-pressed="${f.status.length===1&&f.status[0]===k}"><b style="color:${counts[k]?S[k].color:'inherit'}">${counts[k]}</b><span>${S[k].label}</span></button>`).join('');

  // by property, stacked by status
  const byP={}; rows.forEach(l=>{ const p=l.property||'—'; (byP[p]=byP[p]||{n:0,expired:0,in:0,notin:0,out:0}); byP[p].n++; byP[p][bucket(l)]++; });
  const plist=Object.entries(byP).sort((a,b)=>b[1].n-a[1].n);
  const max=plist.length?plist[0][1].n:1;
  $('d_pcount').textContent=plist.length;
  $('d_bars').innerHTML=plist.length?plist.map(([p,v])=>`<button class="bar" data-prop="${esc(p)}" title="Show only ${esc(p)}"><span class="nm">${esc(p)}</span><span class="track" style="width:${Math.max(4,v.n/max*100)}%">${ORDER.map(k=>v[k]?`<span style="flex:${v[k]};background:${S[k].color}" title="${S[k].label}: ${v[k]}"></span>`:'').join('')}</span><span class="n">${v.n}</span></button>`).join('')+
    `<div class="legend">${ORDER.map(k=>`<span><i style="background:${S[k].color}"></i>${S[k].label}</span>`).join('')}</div>`:'<div class="hint">No leases match these filters.</div>';

  // table
  const key=f.sort, dir=f.dir;
  const val=l=>key==='status'?ORDER.indexOf(bucket(l)):key==='property'?(l.property+' '+l.unit):(l[key]||'');
  rows.sort((a,b)=>{ const x=val(a),y=val(b); if(x===y) return 0; if(x===''||x==null) return 1; if(y===''||y==null) return -1; return (x>y?1:-1)*dir; });
  $('d_count').textContent=rows.length;
  document.querySelectorAll('#dashView th.sort').forEach(th=>{ th.textContent=th.textContent.replace(/ [▲▼]$/,'')+(th.dataset.sort===key?(dir>0?' ▲':' ▼'):''); });
  $('d_body').innerHTML=rows.length?rows.slice(0,shown).map(l=>`<tr><td><b>${esc(l.client)}</b>${l.notes?`<div class="hint">${esc(l.notes)}</div>`:''}</td><td>${esc(LW.where(l))}</td><td class="mono">${fmt(l.checkIn)}</td><td class="mono">${fmt(l.leaseEnd)}</td><td>${pill(bucket(l))}</td><td><button class="small" data-act="edit" data-id="${l.id}">Edit</button></td></tr>`).join(''):'<tr><td colspan="6" style="color:var(--muted)">No leases match these filters.</td></tr>';
  $('d_more').hidden=rows.length<=shown;

  const parts=[];
  if(f.prop) parts.push(f.prop);
  if(f.status.length) parts.push(f.status.map(k=>S[k].label).join(' or '));
  if(f.inFrom||f.inTo) parts.push('check-in '+(f.inFrom?fmt(f.inFrom):'…')+' – '+(f.inTo?fmt(f.inTo):'…'));
  if(f.outFrom||f.outTo) parts.push('lease end '+(f.outFrom?fmt(f.outFrom):'…')+' – '+(f.outTo?fmt(f.outTo):'…'));
  if(f.q) parts.push('“'+f.q+'”');
  $('d_summary').textContent = parts.length ? 'Showing '+rows.length+' of '+L.length+' · '+parts.join(' · ') : 'Showing all '+L.length+' leases';
  dash._rows=rows;
}

function csv(){
  const rows=dash._rows||[]; const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const lines=[['Client','Property','Unit','Check-in','Lease end','POS status','Notes','TheOfficeMonk #'].map(q).join(',')]
    .concat(rows.map(l=>[l.client,l.property,l.unit,l.checkIn,l.leaseEnd,S[bucket(l)].label,l.notes,l.tomId||''].map(q).join(',')));
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv'}));
  a.download='TWC leases '+LW.today()+'.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}

/* events */
tabs.addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if(!b) return; tab=b.dataset.tab; lsSet('lw-tab',tab); draw(); });
$('d_q').addEventListener('input',e=>{ f.q=e.target.value; shown=100; draw(); });
$('d_prop').addEventListener('change',e=>{ f.prop=e.target.value; shown=100; save(); draw(); });
['inFrom','inTo','outFrom','outTo'].forEach(k=>$('d_'+k).addEventListener('change',e=>{ f[k]=e.target.value; shown=100; draw(); }));
dash.addEventListener('click',e=>{
  const b=e.target.closest('button,th'); if(!b) return;
  if(b.dataset.st){ const k=b.dataset.st; f.status=f.status.includes(k)?f.status.filter(x=>x!==k):[...f.status,k]; save(); draw(); }
  else if('kpi' in b.dataset){ f.status=b.dataset.kpi?[b.dataset.kpi]:[]; save(); draw(); }
  else if(b.dataset.prop){ f.prop = f.prop===b.dataset.prop?'':b.dataset.prop; save(); draw(); }
  else if('q' in b.dataset){ const which=b.closest('.quick').dataset.for; const [a,z]=b.dataset.q?QUICK[b.dataset.q]():['','']; f[which+'From']=a; f[which+'To']=z; shown=100; draw(); }
  else if(b.dataset.sort){ f.dir = f.sort===b.dataset.sort ? -f.dir : 1; f.sort=b.dataset.sort; save(); draw(); }
  else if(b.id==='d_clear'){ Object.assign(f,{q:'',prop:'',status:[],inFrom:'',inTo:'',outFrom:'',outTo:''}); save(); draw(); }
  else if(b.id==='d_more'){ shown+=200; draw(); }
  else if(b.id==='d_csv'){ csv(); }
});

LW.onRender = draw;
draw();
})();
