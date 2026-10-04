'use strict';
/* Особистий кабінет майстра: тільки його записи, заробіток і статистика. */

Object.assign(state.ui,{cmode:'month',cmonth:todayKey().slice(0,7)});
const WD_SHORT=['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];

function cabinetData(){
 const u=state.ui,me=myUid(),inP=d=>u.cmode==='all'||String(d).startsWith(u.cmonth);
 const mine=state.appts.filter(a=>a.m===me);
 const list=mine.filter(a=>inP(a.d)),done=list.filter(counted);
 const rev=done.reduce((t,a)=>t+(+a.total||0),0);
 const pct=state.me&&+state.me.pct>0?+state.me.pct:0;
 const svc=new Map();
 done.forEach(a=>{const f=itemFactor(a);(a.items||[]).forEach(i=>{const k=i.name||'—',r=svc.get(k)||{name:k,n:0,sum:0};r.n++;r.sum+=(+i.price||0)*f;svc.set(k,r)})});
 const cl=new Map();
 done.forEach(a=>{const k=a.cid||a.name||'—',r=cl.get(k)||{name:a.name||'Без імені',n:0,sum:0};r.n++;r.sum+=(+a.total||0);cl.set(k,r)});
 const wd=Array(7).fill(0);done.forEach(a=>{wd[new Date(a.d+'T12:00:00Z').getUTCDay()]++});
 let prev=null;
 if(u.cmode==='month'){const pk=addMonths(u.cmonth+'-01',-1).slice(0,7);prev=mine.filter(a=>String(a.d).startsWith(pk)&&counted(a)).reduce((t,a)=>t+(+a.total||0),0)}
 const months=[];
 for(let i=5;i>=0;i--){const k=addMonths(todayKey().slice(0,7)+'-01',-i).slice(0,7);months.push({k,rev:mine.filter(a=>String(a.d).startsWith(k)&&counted(a)).reduce((t,a)=>t+(+a.total||0),0)})}
 const paid=can('salaryView')?state.sals.filter(x=>x.sid===me&&inP(x.d)).reduce((t,x)=>t+(+x.amount||0),0):null;
 const t=nowKey();
 return{rev,pct,earn:pct?Math.round(rev*pct/100):0,n:done.length,avg:done.length?rev/done.length:0,
  hours:done.reduce((t,a)=>t+(+a.dur||60),0)/60,clients:cl.size,
  noshow:list.filter(a=>a.st==='noshow').length,cancel:list.filter(a=>a.st==='cancel').length,
  up:mine.filter(a=>isOk(a)&&(a.d+' '+a.t)>t).sort((x,y)=>(x.d+x.t).localeCompare(y.d+y.t)),
  svc:[...svc.values()].sort((a,b)=>b.sum-a.sum).slice(0,6),
  top:[...cl.values()].sort((a,b)=>b.n-a.n||b.sum-a.sum).slice(0,5),
  wd,prev,months,paid,
  newCl:[...cl.keys()].filter(k=>!mine.some(a=>(a.cid||a.name||'—')===k&&a.d<(u.cmode==='all'?'0000':u.cmonth+'-01')&&counted(a))).length};
}

function renderCabinet(){
 const el=$('cabinet');if(!el)return;
 if(!canTab('cabinet')){el.innerHTML='';return}
 const u=state.ui,[y,m]=u.cmonth.split('-').map(Number),D=cabinetData();
 const nav=`<div class="tools"><div class="seg" role="group" aria-label="Період"><button data-cm="month" aria-pressed="${u.cmode==='month'}">Місяць</button><button data-cm="all" aria-pressed="${u.cmode==='all'}">Весь час</button></div>
  ${u.cmode==='month'?`<div class="navdate grow"><button class="iconbtn" data-cn="-1" aria-label="Попередній">‹</button><span class="lbl">${MONTHS[m-1]} ${y}</span><button class="iconbtn" data-cn="1" aria-label="Наступний">›</button></div><button class="btn sm" data-cn="0">Цей місяць</button>`:''}</div>`;
 const delta=D.prev!=null&&D.prev>0?Math.round((D.rev-D.prev)/D.prev*100):null;
 const dTxt=delta==null?'':`<span class="cab-d ${delta>=0?'up':'dn'}">${delta>=0?'▲':'▼'} ${Math.abs(delta)}% до минулого місяця</span>`;
 const hero=D.pct
  ?`<div class="card cab-hero"><span class="cab-l">Мій заробіток</span><b class="cab-big">${money(D.earn)}</b><div class="cab-s">${D.pct}% від виручки ${money(D.rev)} ${dTxt}</div>
    ${D.paid!=null?`<div class="sumline" style="margin:10px 0 0"><span>Виплачено: <b>${money(D.paid)}</b></span><span>${D.earn-D.paid>0?'До виплати: <b>'+money(D.earn-D.paid)+'</b>':'Переплата: <b>'+money(D.paid-D.earn)+'</b>'}</span></div>`:''}</div>`
  :`<div class="card cab-hero"><span class="cab-l">Виручка по моїх записах</span><b class="cab-big">${money(D.rev)}</b><div class="cab-s">Відсоток не задано. Його виставляє адміністратор. ${dTxt}</div></div>`;
 const tiles=`<div class="tiles"><div><span>Візитів</span><b>${D.n}</b></div><div><span>Середній чек</span><b>${D.avg?money(Math.round(D.avg)):'—'}</b></div><div><span>Клієнтів</span><b>${D.clients}</b></div>
  <div><span>Годин роботи</span><b>${D.hours?(Math.round(D.hours*10)/10).toString().replace('.',','):'0'}</b></div><div><span>Нових клієнтів</span><b>${D.newCl}</b></div><div><span>Попереду</span><b>${D.up.length}</b></div>
  <div><span>Пропусків</span><b>${D.noshow}</b></div><div><span>Скасувань</span><b>${D.cancel}</b></div><div><span>Виручка</span><b>${money(D.rev)}</b></div></div>`;
 const maxM=Math.max(1,...D.months.map(x=>x.rev));
 const mon=`<div class="card"><h2>Останні 6 місяців</h2>${D.months.map(x=>`<div class="cab-row"><span class="cab-m">${MONTHS[+x.k.slice(5)-1].slice(0,3)} ${x.k.slice(2,4)}</span><div class="bar"><i style="width:${(x.rev/maxM*100).toFixed(1)}%"></i></div><b>${x.rev?money(Math.round(D.pct?x.rev*D.pct/100:x.rev)):'—'}</b></div>`).join('')}<div class="hint" style="margin:8px 0 0">${D.pct?'Заробіток за місяць ('+D.pct+'%).':'Виручка за місяць.'}</div></div>`;
 const maxS=Math.max(1,...D.svc.map(x=>x.sum));
 const svc=`<div class="card"><h2>Мої послуги</h2>${D.svc.length?D.svc.map(x=>`<div class="cab-row"><span class="cab-m wide">${esc(x.name)} <small>×${x.n}</small></span><div class="bar"><i style="width:${(x.sum/maxS*100).toFixed(1)}%"></i></div><b>${money(Math.round(x.sum))}</b></div>`).join(''):'<div class="empty">Ще немає виконаних записів.</div>'}</div>`;
 const maxW=Math.max(1,...D.wd),order=[1,2,3,4,5,6,0];
 const wd=`<div class="card"><h2>Завантаження за днями тижня</h2>${order.map(i=>`<div class="cab-row"><span class="cab-m">${WD_SHORT[i]}</span><div class="bar"><i style="width:${(D.wd[i]/maxW*100).toFixed(1)}%"></i></div><b>${D.wd[i]}</b></div>`).join('')}</div>`;
 const top=`<div class="card"><h2>Постійні клієнти</h2>${D.top.length?D.top.map(x=>`<div class="cab-row"><span class="cab-m wide">${esc(x.name)}</span><span class="m">${x.n} візит.</span><b>${money(Math.round(x.sum))}</b></div>`).join(''):'<div class="empty">Поки порожньо.</div>'}</div>`;
 const up=`<div class="card"><h2>Найближчі записи</h2>${D.up.length?D.up.slice(0,8).map(a=>`<div class="cab-row up"><b>${ddmm(a.d)} ${esc(a.t)}</b><span class="cab-m wide">${esc(a.name||'Без імені')}</span><span class="m">${esc(itemsText(a))}</span></div>`).join(''):'<div class="empty">Майбутніх записів немає.</div>'}</div>`;
 el.innerHTML=nav+hero+tiles+`<div class="cab-grid">${up}${mon}${svc}${wd}${top}</div>`;
}
$('cabinet').addEventListener('click',e=>{
 let b;
 if((b=e.target.closest('[data-cm]'))){state.ui.cmode=b.dataset.cm;renderCabinet();return}
 if((b=e.target.closest('[data-cn]'))){
  const n=+b.dataset.cn,[y,m]=state.ui.cmonth.split('-').map(Number);
  if(!n)state.ui.cmonth=todayKey().slice(0,7);else{const dt=new Date(Date.UTC(y,m-1+n,1));state.ui.cmonth=dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)}
  renderCabinet();
 }
});
