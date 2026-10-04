'use strict';
/* MAGNiFICA — облік салону. Дані: Firestore (days, appointments, expenses, meta/settings). */

const LEGACY_NAMES={man:'Манікюр',ped:'Педикюр',brw:'Брови',mke:'Мейк',hair:'Зачіска'};
const DEFAULT_SERVICES=[
 {id:'man',name:'Манікюр',price:900},{id:'ped',name:'Педикюр',price:800},{id:'brw',name:'Брови',price:0},
 {id:'mke',name:'Мейк',price:1500},{id:'hair',name:'Зачіска',price:0}
];
const DEFAULT_CATS=[{id:'rent',name:'Оренда'},{id:'mat',name:'Матеріали'},{id:'pay',name:'Зарплата'},{id:'tax',name:'Податки'},{id:'oth',name:'Інше'}];
const MONTHS=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const MSHORT=['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
const MGEN=['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
const WDS=['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
const WDL=['Неділя','Понеділок','Вівторок','Середа','Четвер','П’ятниця','Субота'];
const SKIN_META={steel:'#c6d1d9',asphalt:'#141619',coffee:'#1b1411',night:'#10131f'};
const TITLES={
 overview:['Огляд','Суми та активність за всіма днями'],
 records:['Записи','Клієнти за днями та годинами'],
 expenses:['Витрати','Оренда, матеріали, зарплата, податки'],
 monthly:['Місячна статистика','Підсумок по місяцях'],
 weekly:['Тижнева статистика','Тижні з понеділка по неділю'],
 daily:['Денна статистика','Історія всіх активних днів'],
 settings:['Налаштування','Послуги, ціни, витрати, вигляд']
};

const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(n);
const money=n=>fmt(n)+' ₴';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const pad=n=>String(n).padStart(2,'0');
const ddmm=k=>k.slice(8,10)+'.'+k.slice(5,7);
const full=k=>k.slice(8,10)+'.'+k.slice(5,7)+'.'+k.slice(0,4);
const ddu=dt=>pad(dt.getUTCDate())+'.'+pad(dt.getUTCMonth()+1);
const colorOf=i=>'var(--c'+(((i%8)+8)%8+1)+')';
function lsGet(k,d){try{return localStorage.getItem(k)||d}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function todayKey(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function nowMin(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function nowKey(){return todayKey()+' '+pad(Math.floor(nowMin()/60))+':'+pad(nowMin()%60)}
const utc=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const keyOf=dt=>dt.toISOString().slice(0,10);
const addDays=(k,n)=>{const dt=utc(k);dt.setUTCDate(dt.getUTCDate()+n);return keyOf(dt)};
const dow=k=>utc(k).getUTCDay();
function mondayOf(k){const dt=utc(k);dt.setUTCDate(dt.getUTCDate()-((dt.getUTCDay()+6)%7));return dt}
const dayLabel=k=>WDL[dow(k)]+', '+(+k.slice(8,10))+' '+MGEN[+k.slice(5,7)-1]+' '+k.slice(0,4);
const toMin=t=>{const p=String(t||'0:0').split(':');return (+p[0]||0)*60+(+p[1]||0)};
const hhmm=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const newId=()=>(window.crypto&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,'').slice(0,20):Date.now().toString(36)+Math.random().toString(36).slice(2,10));
const durText=m=>m%60===0?(m/60)+' год':(m<60?m+' хв':Math.floor(m/60)+' год '+(m%60)+' хв');

const state={
 days:new Map(),baseline:{},appts:[],exps:[],cfg:null,status:'loading',tab:'overview',user:null,
 ui:{aview:lsGet('magnifica-aview','day'),adate:todayKey(),afilter:'future',aq:'',range:'all',emonth:todayKey().slice(0,7)}
};
let SV=[];

/* ---------- налаштування: послуги, категорії ---------- */
const cfgServices=()=>(state.cfg&&state.cfg.services)||DEFAULT_SERVICES;
const cfgCats=()=>(state.cfg&&state.cfg.expCats)||DEFAULT_CATS;
function cfgDoc(){
 if(!state.cfg)state.cfg={};
 if(!state.cfg.services)state.cfg.services=DEFAULT_SERVICES.map(x=>({...x}));
 if(!state.cfg.expCats)state.cfg.expCats=DEFAULT_CATS.map(x=>({...x}));
 return state.cfg;
}
function saveCfg(){
 const c=cfgDoc();
 return Store.saveCfg({services:c.services,expCats:c.expCats})
  .then(r=>{if(r==='pending')toast('Збережено на пристрої, синхронізується при з’єднанні')})
  .catch(e=>toast(errText(e)));
}
function svList(){
 const list=cfgServices().map(s=>({id:s.id,name:s.name,price:+s.price||0}));
 const seen=new Set(list.map(s=>s.id));
 const add=(id,name)=>{if(!seen.has(id)){seen.add(id);list.push({id,name:name||LEGACY_NAMES[id]||id,price:0,archived:true})}};
 state.days.forEach(v=>Object.keys((v&&v.a)||{}).forEach(id=>add(id)));
 state.appts.forEach(a=>(a.items||[]).forEach(it=>add(it.sid,it.name)));
 return list;
}
const svIndex=sid=>Math.max(0,SV.findIndex(s=>s.id===sid));
const catName=x=>{const c=cfgCats().find(c=>c.id===x.cat);return c?c.name:(x.catName||'Інше')};

/* ---------- агрегація ---------- */
const counted=a=>a.st!=='cancel'&&(a.d+' '+a.t)<=nowKey();
function blank(label,short,key){const r={label,short,key,total:0};SV.forEach(s=>r[s.id]=0);return r}
function compute(){
 const map=new Map();
 const row=k=>{if(!map.has(k))map.set(k,{a:{},c:{}});return map.get(k)};
 state.days.forEach((v,k)=>{
  const r=row(k);
  Object.entries((v&&v.a)||{}).forEach(([id,x])=>r.a[id]=(r.a[id]||0)+(+x||0));
  Object.entries((v&&v.c)||{}).forEach(([id,x])=>r.c[id]=(r.c[id]||0)+(+x||0));
 });
 state.appts.filter(counted).forEach(ap=>{
  const r=row(ap.d);
  (ap.items||[]).forEach(it=>{r.a[it.sid]=(r.a[it.sid]||0)+(+it.price||0);r.c[it.sid]=(r.c[it.sid]||0)+1});
 });
 const days=[...map.entries()].map(([k,v])=>{
  const r=blank(full(k),ddmm(k),k);
  SV.forEach(s=>{r[s.id]=+v.a[s.id]||0;r.total+=r[s.id]});r.c=v.c;return r;
 }).filter(r=>r.total>0).sort((x,y)=>x.key<y.key?-1:1);
 const weeks=new Map(),months=new Map();
 days.forEach(r=>{
  const mon=mondayOf(r.key),wk=keyOf(mon);
  if(!weeks.has(wk)){const sun=new Date(mon);sun.setUTCDate(sun.getUTCDate()+6);weeks.set(wk,blank(ddu(mon)+' — '+ddu(sun),ddu(mon),wk))}
  const mk=r.key.slice(0,7);
  if(!months.has(mk))months.set(mk,blank(mk.slice(5,7)+'.'+mk.slice(0,4),MSHORT[+mk.slice(5,7)-1],mk));
  [weeks.get(wk),months.get(mk)].forEach(t=>{SV.forEach(s=>t[s.id]+=r[s.id]);t.total+=r.total});
 });
 const total=days.reduce((a,r)=>a+r.total,0);
 const services={};
 SV.forEach(s=>{
  const amount=days.reduce((a,r)=>a+r[s.id],0);
  const count=(+state.baseline[s.id]||0)+days.reduce((a,r)=>a+(+r.c[s.id]||0),0);
  services[s.id]={amount,count,share:total?amount/total*100:0};
 });
 let best=null;days.forEach(r=>{if(!best||r.total>best.total)best=r});
 const exByMonth={};state.exps.forEach(x=>{const m=String(x.d).slice(0,7);exByMonth[m]=(exByMonth[m]||0)+(+x.amount||0)});
 const revByMonth={};months.forEach((v,k)=>revByMonth[k]=v.total);
 const pm=[...new Set([...Object.keys(exByMonth),...Object.keys(revByMonth)])].sort().map(k=>({key:k,rev:revByMonth[k]||0,exp:exByMonth[k]||0}));
 return{days,weekly:[...weeks.values()],monthly:[...months.values()],profitMonths:pm,
  summary:{total,active:days.length,avg:days.length?total/days.length:0,best,services,
   from:days.length?days[0].key:null,to:days.length?days[days.length-1].key:null}};
}

/* ---------- огляд ---------- */
const kpi=(label,value,hint)=>`<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`;
function profitHtml(D){
 const r=state.ui.range,mk=todayKey().slice(0,7);
 const inR=k=>r==='all'||String(k).startsWith(mk);
 const rev=D.days.filter(x=>inR(x.key)).reduce((a,x)=>a+x.total,0);
 const exp=state.exps.filter(x=>inR(x.d)).reduce((a,x)=>a+(+x.amount||0),0);
 const net=rev-exp,margin=rev?Math.round(net/rev*100):null;
 const fut=state.appts.filter(a=>a.st!=='cancel'&&!counted(a));
 const futSum=fut.reduce((a,x)=>a+(+x.total||0),0);
 return `<div class="profit">
  <div class="profit-top"><span class="label">Чистий прибуток</span>
   <div class="seg" role="group" aria-label="Період"><button data-range="all" aria-pressed="${r==='all'}">Весь час</button><button data-range="month" aria-pressed="${r==='month'}">Цей місяць</button></div></div>
  <div><div class="profit-main ${net<0?'neg':'pos'}">${net<0?'−':''}${money(Math.abs(net))}</div>
   ${margin==null?'':`<div class="sub">${margin<0?"−"+Math.abs(margin):margin}% від доходу${futSum?` · попереду записів на ${money(futSum)}`:''}</div>`}</div>
  <div class="profit-row"><div><span>Дохід</span><b>${money(rev)}</b></div><div><span>Витрати</span><b>${money(exp)}</b></div><div><span>Записів</span><b>${fmt(state.appts.filter(a=>a.st!=='cancel'&&(r==='all'||a.d.startsWith(mk))).length)}</b></div></div>
 </div>`;
}
function serviceCards(S){
 const max=Math.max(1,...SV.map(s=>S.services[s.id].amount));
 return SV.filter(s=>!s.archived||S.services[s.id].amount>0).map(s=>{
  const i=svIndex(s.id),x=S.services[s.id];
  return `<div class="service">
  <div class="service-top"><span class="service-name">${esc(s.name)}</span><span class="dot" style="background:${colorOf(i)}"></span></div>
  <div class="service-amount">${money(x.amount)}</div>
  <div class="service-meta"><span>${fmt(x.count)} записів</span><span>${x.share.toFixed(1)}%</span></div>
  <div class="bar"><i style="width:${(x.amount/max*100).toFixed(1)}%;background:${colorOf(i)}"></i></div></div>`}).join('');
}
function lineChart(rows){
 if(!rows.length)return '<div class="empty">Ще немає даних</div>';
 const W=900,H=300,pd={l:42,r:18,t:18,b:35};
 const max=Math.max(...rows.map(r=>r.total),1);
 const x=i=>pd.l+(i*(W-pd.l-pd.r)/Math.max(rows.length-1,1));
 const y=v=>pd.t+(max-v)*(H-pd.t-pd.b)/max;
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Графік динаміки за днями">`;
 for(let g=0;g<=4;g++){const v=max*g/4,yy=y(v);svg+=`<line x1="${pd.l}" x2="${W-pd.r}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="4" y="${yy+4}" font-size="11" style="fill:var(--muted)">${fmt(v)}</text>`}
 svg+=`<polyline fill="none" style="stroke:var(--c1)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${rows.map((r,i)=>`${x(i)},${y(r.total)}`).join(' ')}"/>`;
 if(rows.length<=31)rows.forEach((r,i)=>{svg+=`<circle cx="${x(i)}" cy="${y(r.total)}" r="3.5" style="fill:var(--c1)"><title>${r.label}: ${money(r.total)}</title></circle>`});
 else{const i=rows.length-1;svg+=`<circle cx="${x(i)}" cy="${y(rows[i].total)}" r="4" style="fill:var(--c1)"><title>${rows[i].label}: ${money(rows[i].total)}</title></circle>`}
 const step=Math.max(1,Math.ceil(rows.length/8));
 rows.forEach((r,i)=>{if(i%step===0||i===rows.length-1)svg+=`<text x="${x(i)}" y="${H-8}" text-anchor="${i===rows.length-1&&i%step?'end':'middle'}" font-size="11" style="fill:var(--muted)">${esc(r.short)}</text>`});
 return svg+'</svg>';
}
function barChart(rows){
 if(!rows.length)return '<div class="empty">Ще немає даних</div>';
 const W=900,H=300,pd={l:48,r:18,t:18,b:42};const max=Math.max(...rows.map(r=>r.total),1);
 const gap=(W-pd.l-pd.r)/rows.length,bw=Math.max(5,gap*.68);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Стовпчикова діаграма">`;
 for(let g=0;g<=4;g++){const v=max*g/4,yy=pd.t+(max-v)*(H-pd.t-pd.b)/max;svg+=`<line x1="${pd.l}" x2="${W-pd.r}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="4" y="${yy+4}" font-size="11" style="fill:var(--muted)">${fmt(v)}</text>`}
 const step=Math.max(1,Math.ceil(rows.length/20));
 rows.forEach((r,i)=>{const h=r.total/max*(H-pd.t-pd.b),xx=pd.l+i*gap+(gap-bw)/2,yy=H-pd.b-h;
  svg+=`<rect x="${xx}" y="${yy}" width="${bw}" height="${h}" rx="5" style="fill:var(--c1)"><title>${r.label}: ${money(r.total)}</title></rect>`;
  if(i%step===0)svg+=`<text x="${xx+bw/2}" y="${H-14}" text-anchor="middle" font-size="10" style="fill:var(--muted)">${esc(r.short)}</text>`});
 return svg+'</svg>';
}
function donut(S,total){
 const items=SV.filter(s=>S[s.id].amount>0);
 if(!items.length)return '<div class="empty">Ще немає даних</div>';
 let acc=0;const stops=[];
 items.forEach(s=>{const p=S[s.id].share;stops.push(`${colorOf(svIndex(s.id))} ${acc}% ${acc+p}%`);acc+=p});
 const rows=items.map(s=>{const x=S[s.id],c=colorOf(svIndex(s.id));return `<div class="rank-row"><div class="rank-head"><span><span class="dot" style="width:7px;height:7px;background:${c};margin-right:5px"></span>${esc(s.name)}</span><b>${x.share.toFixed(1)}%</b></div><div class="rank-track"><i style="width:${x.share}%;background:${c}"></i></div></div>`}).join('');
 return `<div class="donut-wrap"><div class="donut" style="background:conic-gradient(${stops.join(',')})"><div class="donut-center"><b>${money(total)}</b><span>загалом</span></div></div><div class="rank">${rows}</div></div>`;
}

/* ---------- таблиці ---------- */
const cell=(v,cls='')=>v?`<td class="${cls}">${fmt(v)}</td>`:`<td class="zero ${cls}">—</td>`;
let SVT=[];
const head=()=>`<thead><tr><th>Період</th>${SVT.map(s=>`<th>${esc(s.name)}</th>`).join('')}<th class="total">Разом</th></tr></thead>`;
const rowHtml=(r,lab,attrs='')=>`<tr ${attrs}><td>${lab}</td>${SVT.map(s=>cell(r[s.id])).join('')}${cell(r.total,'total')}</tr>`;
function dailyTable(rows){
 if(!rows.length)return '<div class="empty">Ще немає днів із записами</div>';
 let ym='',body='';
 rows.slice().reverse().forEach(r=>{
  const m=r.key.slice(0,7);
  if(m!==ym){ym=m;body+=`<tr class="sep"><td colspan="${SVT.length+2}">${MONTHS[+m.slice(5,7)-1]} ${m.slice(0,4)}</td></tr>`}
  body+=rowHtml(r,ddmm(r.key),`class="edit" data-key="${r.key}" tabindex="0" role="button" aria-label="Відкрити день ${esc(r.label)}"`);
 });
 return `<div class="table-note">Суми в гривнях (₴). Торкніться дня, щоб відкрити його.</div><div class="table-wrap"><table>${head()}<tbody>${body}</tbody></table></div>`;
}
function plainTable(rows,labFn){
 if(!rows.length)return '<div class="empty">Ще немає даних</div>';
 return `<div class="table-note">Суми в гривнях (₴)</div><div class="table-wrap"><table>${head()}<tbody>${rows.slice().reverse().map(r=>rowHtml(r,labFn(r))).join('')}</tbody></table></div>`;
}
function profitTable(pm){
 if(!pm.length)return '<div class="empty">Ще немає даних</div>';
 const body=pm.slice().reverse().map(r=>{const n=r.rev-r.exp;return `<tr><td>${MSHORT[+r.key.slice(5,7)-1]} ${r.key.slice(0,4)}</td>${cell(r.rev)}${cell(r.exp)}<td class="total ${n<0?'neg':''}">${n<0?'−':''}${fmt(Math.abs(n))}</td></tr>`}).join('');
 return `<div class="table-note">Суми в гривнях (₴)</div><div class="table-wrap"><table><thead><tr><th>Місяць</th><th>Дохід</th><th>Витрати</th><th class="total">Прибуток</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
const put=(id,html)=>{const el=$(id);if(el)el.innerHTML=html};

/* ---------- записи ---------- */
const byTime=(a,b)=>toMin(a.t)-toMin(b.t)||String(a.name||'').localeCompare(String(b.name||''));
const apptsOn=d=>state.appts.filter(a=>a.d===d).sort(byTime);
const isMobile=()=>document.documentElement.dataset.mode==='phone';
const activeSum=l=>l.filter(a=>a.st!=='cancel').reduce((s,a)=>s+(+a.total||0),0);
const activeN=l=>l.filter(a=>a.st!=='cancel').length;
const itemsText=a=>(a.items||[]).map(i=>i.name).join(', ');
const firstColor=a=>colorOf(svIndex(a.items&&a.items[0]&&a.items[0].sid));
function lanes(list){
 const evs=list.map(a=>({a,s:toMin(a.t),e:toMin(a.t)+(+a.dur||60)})).sort((x,y)=>x.s-y.s||y.e-x.e);
 const out=[];let cl=[],end=-1;
 const flush=()=>{const n=Math.max(1,...cl.map(c=>c.lane+1));cl.forEach(c=>{c.n=n;out.push(c)});cl=[];end=-1};
 for(const ev of evs){
  if(cl.length&&ev.s>=end)flush();
  const used=new Set(cl.filter(c=>c.e>ev.s).map(c=>c.lane));
  let l=0;while(used.has(l))l++;
  ev.lane=l;cl.push(ev);end=Math.max(end,ev.e);
 }
 flush();return out;
}
function trange(lists){
 let sh=8,eh=21;
 lists.forEach(l=>l.forEach(a=>{sh=Math.min(sh,Math.floor(toMin(a.t)/60));eh=Math.max(eh,Math.ceil((toMin(a.t)+(+a.dur||60))/60))}));
 return [Math.max(0,sh),Math.min(24,eh)];
}
function gutter(sh,eh,hpx){let h='';for(let x=sh;x<=eh;x++)h+=`<div class="tl-hr" style="top:${(x-sh)*hpx}px">${pad(x)}:00</div>`;return `<div class="tl-hours" style="height:${(eh-sh)*hpx}px">${h}</div>`}
function evHtml(a,compact,pos){
 const nm=a.name||a.phone||'Без імені';
 const fut=!counted(a)&&a.st!=='cancel';
 return `<button class="ev ${a.st==='cancel'?'cancel':''} ${fut?'future':''}" data-id="${esc(a.id)}" style="${pos||''}--ec:${firstColor(a)}"><b>${esc(a.t)}</b>${compact?'':'<span class="p">'+money(a.total||0)+'</span>'}<span class="n">${esc(nm)}</span><span class="s">${esc(itemsText(a))}</span></button>`;
}
function tlCol(d,list,sh,eh,hpx,compact){
 let lines='';for(let x=0;x<=eh-sh;x++)lines+=`<i class="tl-line" style="top:${x*hpx}px"></i>`;
 const evs=lanes(list).map(c=>{
  const top=(c.s-sh*60)/60*hpx,h=Math.max(30,(c.e-c.s)/60*hpx-2);
  return evHtml(c.a,compact,`top:${top}px;height:${h}px;left:calc(${c.lane/c.n*100}% + 2px);width:calc(${100/c.n}% - 4px);`);
 }).join('');
 let now='';
 if(d===todayKey()){const m=nowMin();if(m>=sh*60&&m<=eh*60)now=`<i class="tl-now" style="top:${(m-sh*60)/60*hpx}px"></i>`}
 return `<div class="tl-col" data-date="${d}" data-sh="${sh}" data-hpx="${hpx}" style="height:${(eh-sh)*hpx}px">${lines}${evs}${now}</div>`;
}
function agenda(list,empty){
 if(!list.length)return `<div class="empty">${empty}</div>`;
 const groups=new Map();list.forEach(a=>{if(!groups.has(a.d))groups.set(a.d,[]);groups.get(a.d).push(a)});
 let h='';
 groups.forEach((l,d)=>{
  h+=`<div class="ag-day ${d===todayKey()?'today':''}"><b>${esc(dayLabel(d))}</b><span>${activeN(l)} зап. · ${money(activeSum(l))}</span></div>`;
  l.forEach(a=>{
   const fut=!counted(a)&&a.st!=='cancel';
   h+=`<button class="ag ${a.st==='cancel'?'cancel':''} ${fut?'future':''}" data-id="${esc(a.id)}" style="--ec:${firstColor(a)}">
    <div class="ag-t"><b>${esc(a.t)}</b><span>${durText(+a.dur||60)}</span></div>
    <div><div class="ag-n">${esc(a.name||a.phone||'Без імені')}${a.st==='cancel'?' · скасовано':''}</div><div class="ag-s">${esc(itemsText(a))}${a.name&&a.phone?' · '+esc(a.phone):''}</div></div>
    <div class="ag-p">${money(a.total||0)}</div></button>`;
  });
 });
 return h;
}
function recToolbar(){
 const u=state.ui,v=u.aview;
 const seg=`<div class="seg" role="group" aria-label="Вигляд"><button data-v="day" aria-pressed="${v==='day'}">День</button><button data-v="week" aria-pressed="${v==='week'}">Тиждень</button><button data-v="list" aria-pressed="${v==='list'}">Список</button></div>`;
 if(v==='list'){
  const f=u.afilter;
  return `<div class="tools">${seg}<div class="seg" role="group" aria-label="Фільтр"><button data-f="future" aria-pressed="${f==='future'}">Майбутні</button><button data-f="past" aria-pressed="${f==='past'}">Минулі</button><button data-f="all" aria-pressed="${f==='all'}">Усі</button></div></div>
   <div class="tools"><input class="search" id="aq" type="search" placeholder="Пошук: ім’я, телефон, робота" value="${esc(u.aq)}" autocomplete="off"></div>`;
 }
 let lbl;
 if(v==='day')lbl=dayLabel(u.adate);
 else{const m=keyOf(mondayOf(u.adate));lbl=full(m).slice(0,5)+' — '+full(addDays(m,6)).slice(0,5)+'.'+addDays(m,6).slice(0,4)}
 return `<div class="tools">${seg}</div><div class="tools"><div class="navdate grow"><button class="iconbtn" data-nav="-1" aria-label="Назад">‹</button><span class="lbl">${esc(lbl)}</span><button class="iconbtn" data-nav="1" aria-label="Вперед">›</button></div><button class="btn sm" data-nav="today">Сьогодні</button></div>`;
}
function recBody(){
 const u=state.ui,v=u.aview,hpx=isMobile()?64:72;
 if(v==='day'){
  const l=apptsOn(u.adate),[sh,eh]=trange([l]);
  return `<div class="card"><div class="sumline"><span>Записів: <b>${activeN(l)}</b></span><span>Сума: <b>${money(activeSum(l))}</b></span>${l.length?'':'<span>Вільний день — торкніться години, щоб записати клієнта</span>'}</div>
   <div class="tl">${gutter(sh,eh,hpx)}${tlCol(u.adate,l,sh,eh,hpx,false)}</div></div>`;
 }
 if(v==='week'){
  const m=keyOf(mondayOf(u.adate)),days=[0,1,2,3,4,5,6].map(i=>addDays(m,i)),lists=days.map(apptsOn),all=[].concat(...lists);
  const sum=`<div class="sumline"><span>Записів: <b>${activeN(all)}</b></span><span>Сума: <b>${money(activeSum(all))}</b></span></div>`;
  if(isMobile())return `<div class="card">${sum}${agenda(all.sort((a,b)=>a.d.localeCompare(b.d)||byTime(a,b)),'На цьому тижні записів немає')}</div>`;
  const [sh,eh]=trange(lists);
  return `<div class="card">${sum}<div class="wk-h"><span></span>${days.map(d=>`<button data-d="${d}" class="${d===todayKey()?'today':''}">${WDS[dow(d)]} ${d.slice(8,10)}<small>${activeN(apptsOn(d))} зап.</small></button>`).join('')}</div>
   <div class="wk">${gutter(sh,eh,hpx-8)}${days.map((d,i)=>tlCol(d,lists[i],sh,eh,hpx-8,true)).join('')}</div></div>`;
 }
 const q=u.aq.trim().toLowerCase(),t=todayKey();
 let l=state.appts.slice();
 if(u.afilter==='future')l=l.filter(a=>!counted(a)&&a.st!=='cancel'||a.d>=t);
 else if(u.afilter==='past')l=l.filter(a=>a.d<t||counted(a));
 if(q)l=l.filter(a=>(String(a.name||'')+' '+String(a.phone||'')+' '+itemsText(a)+' '+String(a.note||'')).toLowerCase().includes(q));
 l.sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t));
 if(u.afilter!=='future')l.reverse();
 return `<div class="card">${agenda(l.slice(0,400),q?'Нічого не знайдено':'Записів немає. Натисніть «Зробити запис».')}</div>`;
}
function renderRecords(){
 const el=$('records');if(!el)return;
 el.innerHTML='<div id="recTools">'+recToolbar()+'</div><div id="recBody">'+recBody()+'</div>';
}

/* ---------- витрати ---------- */
function renderExpenses(D){
 const el=$('expenses');if(!el)return;
 const mk=state.ui.emonth,[y,m]=mk.split('-').map(Number);
 const list=state.exps.filter(x=>String(x.d).startsWith(mk)).sort((a,b)=>b.d.localeCompare(a.d)||String(b.created||0).localeCompare(String(a.created||0)));
 const total=list.reduce((a,x)=>a+(+x.amount||0),0);
 const rev=D.days.filter(x=>x.key.startsWith(mk)).reduce((a,x)=>a+x.total,0);
 const net=rev-total;
 const byCat=new Map();list.forEach(x=>{const n=catName(x);byCat.set(n,(byCat.get(n)||0)+(+x.amount||0))});
 const cats=[...byCat.entries()].sort((a,b)=>b[1]-a[1]);
 const maxc=Math.max(1,...cats.map(c=>c[1]));
 const sum=`<div class="card ex-sum"><h2>${MONTHS[m-1]} ${y}</h2><div class="caption">Підсумок за місяць</div>
  <div class="profit-row" style="margin:0 0 14px"><div><span>Дохід</span><b>${money(rev)}</b></div><div><span>Витрати</span><b>${money(total)}</b></div><div><span>Прибуток</span><b class="${net<0?'neg':''}">${net<0?'−':''}${money(Math.abs(net))}</b></div></div>
  ${cats.length?cats.map(([n,v],i)=>`<div class="rank-row"><div class="rank-head"><span>${esc(n)}</span><b>${money(v)}</b></div><div class="rank-track"><i style="width:${v/maxc*100}%;background:${colorOf(i)}"></i></div></div>`).join(''):'<div class="empty" style="padding:10px">У цьому місяці витрат немає</div>'}</div>`;
 const rows=list.length?list.map(x=>`<button class="exrow" data-id="${esc(x.id)}"><div><div class="t">${esc(catName(x))}</div><div class="m">${full(x.d)}${x.note?' · '+esc(x.note):''}</div></div><div class="a">−${money(x.amount)}</div></button>`).join(''):'<div class="empty">Витрат за цей місяць ще немає.<br>Натисніть «Додати витрату».</div>';
 el.innerHTML=`<div class="tools"><div class="navdate grow"><button class="iconbtn" data-em="-1" aria-label="Попередній місяць">‹</button><span class="lbl">${MONTHS[m-1]} ${y}</span><button class="iconbtn" data-em="1" aria-label="Наступний місяць">›</button></div><button class="btn sm" data-em="0">Цей місяць</button></div>
  <div class="ex-grid">${sum}<div class="card ex-list"><h2>Записи витрат</h2><div class="caption">Торкніться запису, щоб змінити або видалити</div>${rows}</div></div>`;
}

/* ---------- налаштування ---------- */
function renderSettings(force){
 const el=$('settings');if(!el)return;
 if(!force&&el.contains(document.activeElement)&&document.activeElement.tagName==='INPUT')return;
 const sv=cfgServices(),ct=cfgCats(),skin=document.documentElement.dataset.skin,mp=lsGet('magnifica-mode','auto');
 const skins=[['night','Нічний сапфір'],['asphalt','Графіт'],['coffee','Какао'],['steel','Туман']];
 el.innerHTML=`<div class="set-grid">
 <div class="card"><h2 class="set-h">Послуги та ціни</h2>
  <p class="set-p">Ціна підставляється автоматично при створенні запису. Зміна ціни діє лише на нові записи: у вже створених ціна залишається та, що була.</p>
  <div class="setrow hd"><span>Назва</span><span>Ціна, ₴</span><span></span></div>
  ${sv.map(s=>`<div class="setrow" data-sid="${esc(s.id)}"><input class="nm" value="${esc(s.name)}" aria-label="Назва послуги" maxlength="40"><input class="pr" value="${s.price?s.price:''}" placeholder="0" inputmode="numeric" aria-label="Ціна: ${esc(s.name)}"><button class="rm" data-rm-svc="${esc(s.id)}" aria-label="Видалити послугу">✕</button></div>`).join('')}
  <button class="btn sm" id="addSvc">+ Додати послугу</button></div>
 <div class="card"><h2 class="set-h">Категорії витрат</h2>
  <p class="set-p">Те, на що ви витрачаєте: оренда, матеріали, зарплата, податки… Видалення категорії не стирає вже внесені витрати.</p>
  ${ct.map(c=>`<div class="setrow cat" data-cid="${esc(c.id)}"><input class="nm" value="${esc(c.name)}" aria-label="Назва категорії" maxlength="40"><button class="rm" data-rm-cat="${esc(c.id)}" aria-label="Видалити категорію">✕</button></div>`).join('')}
  <button class="btn sm" id="addCat">+ Додати категорію</button></div>
 <div class="card"><h2 class="set-h">Вигляд</h2>
  <p class="set-p">Режим за замовчуванням визначається автоматично за шириною екрана.</p>
  <div class="lbl2">Тема</div><div class="skins" style="margin-bottom:14px">${skins.map(([k,n])=>`<button class="skin-btn" data-skin="${k}" aria-pressed="${skin===k}"><span class="swatch ${k}"></span>${n}</button>`).join('')}</div>
  <div class="lbl2">Режим</div><div class="seg" role="group" aria-label="Режим"><button data-mode="auto" aria-pressed="${mp==='auto'}">Авто</button><button data-mode="phone" aria-pressed="${mp==='phone'}">Телефон</button><button data-mode="desktop" aria-pressed="${mp==='desktop'}">Комп’ютер</button></div></div>
 <div class="card"><h2 class="set-h">Дані</h2>
  <p class="set-p">Копія зберігає все: дні, записи клієнтів, витрати, послуги. Корисно робити раз на місяць.</p>
  <div class="btnrow"><button class="btn sm" id="exJson">Копія (JSON)</button><button class="btn sm" id="exCsv">Таблиця (CSV)</button><button class="btn sm" id="imBtn">Імпорт з файлу</button><button class="btn sm" id="manDay">Внести день сумою</button></div></div>
 <div class="card"><h2 class="set-h">Акаунт</h2>
  <div class="who">Ви увійшли як <b>${esc(state.user?state.user.email:'')}</b></div>
  <button class="btn sm" id="logout">Вийти</button><div class="ver">MAGNiFICA · v2</div></div>
 </div>`;
}

/* ---------- вікна ---------- */
function showSheet(html){
 $('sheetPanel').innerHTML=html;$('sheet').hidden=false;document.documentElement.classList.add('lock');$('sheetPanel').focus();
}
function closeSheet(){$('sheet').hidden=true;document.documentElement.classList.remove('lock')}
const closeBtn='<button class="x" data-close aria-label="Закрити"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
function toast(m){
 document.querySelectorAll('.toast').forEach(x=>x.remove());const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=m;
 document.body.appendChild(t);setTimeout(()=>t.remove(),2800);
}
function errText(e){
 const c=e&&e.code;
 if(c==='permission-denied')return'Немає прав на запис. Акаунт не додано до правил бази.';
 if(c==='resource-exhausted')return'Перевищено денний ліміт Firebase. Спробуйте завтра.';
 return'Не вдалося зберегти. Спробуйте ще раз.';
}
function arm(btn,label,fn){
 btn.addEventListener('click',async()=>{
  if(!btn.dataset.armed){btn.dataset.armed='1';btn.textContent='Торкніться ще раз';setTimeout(()=>{if(btn.isConnected){btn.dataset.armed='';btn.textContent=label}},4000);return}
  btn.disabled=true;
  try{await fn()}catch(e){toast('Не вдалося видалити. Спробуйте ще раз.');btn.disabled=false;btn.dataset.armed='';btn.textContent=label}
 });
}
const numOf=v=>{const n=parseInt(String(v||'').replace(/\D/g,''),10);return isFinite(n)?Math.min(n,9999999):0};
const digits=el=>el.addEventListener('input',()=>{el.value=el.value.replace(/\D/g,'').slice(0,7)});
const defTime=d=>{if(d!==todayKey())return'10:00';const h=Math.min(20,Math.max(9,new Date().getHours()+1));return pad(h)+':00'};

/* форма запису клієнта */
function openAppt(init){
 if(state.status!=='ready')return;
 const ex=init&&init.id?init:null;
 const d0=(init&&init.d)||todayKey();
 const a=ex?JSON.parse(JSON.stringify(ex)):{d:d0,t:(init&&init.t)||defTime(d0),dur:60,name:'',phone:'',note:'',items:[],st:'ok'};
 const svs=svList().filter(s=>!s.archived);
 const clients=new Map();
 state.appts.slice().sort((x,y)=>(x.d+x.t).localeCompare(y.d+y.t)).forEach(x=>{if(x.name)clients.set(x.name,x.phone||clients.get(x.name)||'')});
 $('clientsList').innerHTML=[...clients.keys()].map(n=>`<option value="${esc(n)}"></option>`).join('');
 const durs=[30,45,60,90,120,150,180,240];if(!durs.includes(+a.dur))durs.push(+a.dur);durs.sort((x,y)=>x-y);
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?'Запис клієнта':'Новий запис'}</h2>${closeBtn}</div>
  <div class="fgrid"><label class="lf"><span>Дата</span><input type="date" id="p-d" value="${esc(a.d)}"></label>
   <label class="lf"><span>Час</span><input type="time" id="p-t" step="300" value="${esc(a.t)}"></label>
   <label class="lf"><span>Тривалість</span><select id="p-dur">${durs.map(m=>`<option value="${m}" ${m===+a.dur?'selected':''}>${durText(m)}</option>`).join('')}</select></label></div>
  <label class="lf"><span>Клієнт (ПІБ)</span><input id="p-name" list="clientsList" autocomplete="off" placeholder="необов’язково" value="${esc(a.name)}" maxlength="80"></label>
  <label class="lf"><span>Телефон</span><input id="p-phone" type="tel" inputmode="tel" autocomplete="off" placeholder="необов’язково" value="${esc(a.phone)}" maxlength="24"></label>
  <div class="lbl2">Роботи</div><div class="chips" id="p-chips"></div>
  <div class="sel" id="p-sel"></div>
  <label class="lf"><span>Примітка</span><input id="p-note" autocomplete="off" placeholder="необов’язково" value="${esc(a.note)}" maxlength="160"></label>
  <div class="note" id="p-cn" ${a.st==='cancel'?'':'hidden'}>Запис скасовано: у статистику не входить.</div>
  <div class="sum"><span>Разом</span><b id="p-total">0&nbsp;₴</b></div>
  <div class="err" id="p-err" role="alert" hidden></div>
  <div class="actions">${ex?'<button class="btn danger" id="p-del">Видалити</button><button class="btn" id="p-cx"></button>':''}<button class="btn primary" id="p-save">Зберегти</button></div>`);
 const total=()=>a.items.reduce((s,i)=>s+(+i.price||0),0);
 const drawChips=()=>{$('p-chips').innerHTML=svs.map(s=>`<button class="chip" type="button" data-sid="${esc(s.id)}" aria-pressed="${a.items.some(i=>i.sid===s.id)}">${esc(s.name)}<small>${s.price?fmt(s.price)+' ₴':'—'}</small></button>`).join('')||'<span class="hint" style="margin:0">Додайте послуги в налаштуваннях (шестерня).</span>'};
 const drawSel=()=>{
  $('p-sel').innerHTML=a.items.map((it,i)=>`<div class="selrow"><span class="sname"><i class="dot" style="background:${colorOf(svIndex(it.sid))}"></i>${esc(it.name)}</span><input data-i="${i}" inputmode="numeric" value="${it.price||''}" placeholder="0" aria-label="Ціна: ${esc(it.name)}"><button class="rm" type="button" data-rm="${i}" aria-label="Прибрати">✕</button></div>`).join('');
  $('p-total').textContent=money(total());
 };
 const showCx=()=>{if(ex)$('p-cx').textContent=a.st==='cancel'?'Відновити запис':'Скасувати запис';$('p-cn').hidden=a.st!=='cancel'};
 drawChips();drawSel();showCx();
 $('p-chips').addEventListener('click',e=>{
  const b=e.target.closest('.chip');if(!b)return;
  const sid=b.dataset.sid,i=a.items.findIndex(x=>x.sid===sid);
  if(i>=0)a.items.splice(i,1);else{const s=svs.find(x=>x.id===sid);a.items.push({sid,name:s.name,price:s.price})}
  drawChips();drawSel();
 });
 $('p-sel').addEventListener('input',e=>{
  const el=e.target.closest('input');if(!el)return;
  el.value=el.value.replace(/\D/g,'').slice(0,7);a.items[+el.dataset.i].price=numOf(el.value);$('p-total').textContent=money(total());
 });
 $('p-sel').addEventListener('click',e=>{const b=e.target.closest('.rm');if(!b)return;a.items.splice(+b.dataset.rm,1);drawChips();drawSel()});
 $('p-name').addEventListener('change',()=>{const n=$('p-name').value.trim();if(clients.has(n)&&!$('p-phone').value.trim())$('p-phone').value=clients.get(n)});
 if(ex){
  $('p-cx').addEventListener('click',()=>{a.st=a.st==='cancel'?'ok':'cancel';showCx()});
  arm($('p-del'),'Видалити',async()=>{await Store.deleteAppt(a.id);closeSheet();toast('Запис видалено')});
 }
 $('p-save').addEventListener('click',async()=>{
  const err=m=>{const e=$('p-err');e.textContent=m;e.hidden=!m};
  const d=$('p-d').value,t=$('p-t').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){err('Оберіть дату.');return}
  if(!/^\d{2}:\d{2}$/.test(t)){err('Вкажіть час.');return}
  if(!a.items.length){err('Оберіть хоча б одну роботу.');return}
  err('');
  const obj={id:a.id||newId(),d,t,dur:+$('p-dur').value||60,name:$('p-name').value.trim(),phone:$('p-phone').value.trim(),note:$('p-note').value.trim(),
   items:a.items.map(i=>({sid:i.sid,name:i.name,price:+i.price||0})),total:total(),st:a.st==='cancel'?'cancel':'ok',created:a.created||Date.now()};
  const b=$('p-save');b.disabled=true;b.textContent='Зберігаю…';
  try{
   const r=await Store.saveAppt(obj.id,obj);
   state.ui.adate=d;closeSheet();
   if(state.tab==='records'||state.tab==='overview')renderAll();
   toast(r==='pending'?'Збережено на пристрої, синхронізується при з’єднанні':'Запис збережено · '+ddmm(d)+' '+t);
  }catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
 });
}

/* форма витрати */
function openExp(init){
 if(state.status!=='ready')return;
 const ex=init&&init.id?init:null;
 const cats=cfgCats();
 const x=ex||{d:todayKey().slice(0,7)===state.ui.emonth?todayKey():state.ui.emonth+'-01',amount:0,cat:cats[0]?cats[0].id:'oth',note:''};
 const opts=cats.slice();if(ex&&!opts.some(c=>c.id===ex.cat))opts.push({id:ex.cat,name:ex.catName||'Інше'});
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?'Витрата':'Нова витрата'}</h2>${closeBtn}</div>
  <div class="fgrid" style="grid-template-columns:1fr 1fr"><label class="lf"><span>Дата</span><input type="date" id="x-d" value="${esc(x.d)}"></label>
   <label class="lf"><span>Сума, ₴</span><input id="x-a" inputmode="numeric" placeholder="0" value="${x.amount||''}"></label></div>
  <label class="lf"><span>Категорія</span><select id="x-c">${opts.map(c=>`<option value="${esc(c.id)}" ${c.id===x.cat?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label class="lf"><span>Примітка</span><input id="x-n" autocomplete="off" placeholder="необов’язково" value="${esc(x.note||'')}" maxlength="160"></label>
  <div class="err" id="x-err" role="alert" hidden></div>
  <div class="actions">${ex?'<button class="btn danger" id="x-del">Видалити</button>':''}<button class="btn primary" id="x-save">Зберегти</button></div>`);
 digits($('x-a'));
 if(ex)arm($('x-del'),'Видалити',async()=>{await Store.deleteExp(ex.id);closeSheet();toast('Витрату видалено')});
 $('x-save').addEventListener('click',async()=>{
  const err=m=>{const e=$('x-err');e.textContent=m;e.hidden=!m};
  const d=$('x-d').value,amount=numOf($('x-a').value),cat=$('x-c').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){err('Оберіть дату.');return}
  if(amount<=0){err('Вкажіть суму витрати.');return}
  err('');
  const c=opts.find(c=>c.id===cat);
  const obj={id:ex?ex.id:newId(),d,amount,cat,catName:c?c.name:'Інше',note:$('x-n').value.trim(),created:ex?ex.created:Date.now()};
  const b=$('x-save');b.disabled=true;b.textContent='Зберігаю…';
  try{
   const r=await Store.saveExp(obj.id,obj);
   state.ui.emonth=d.slice(0,7);closeSheet();renderAll();
   toast(r==='pending'?'Збережено на пристрої, синхронізується при з’єднанні':'Витрату збережено');
  }catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
 });
}

/* сума за день вручну (старий формат) */
function openDay(key){
 if(state.status!=='ready')return;
 const svs=svList();
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">День сумою</h2>${closeBtn}</div>
  <div class="note">Для днів без списку клієнтів: вносите лише суму по послугах. Записи клієнтів за цю дату додаються до цієї суми окремо.</div>
  <label class="lf"><span>Дата</span><input type="date" id="f-date"></label>
  <div class="note" id="dayNote" hidden>Цей день уже є в базі. Збереження замінить його суми.</div>
  <div class="srow head"><span></span><span>Сума, ₴</span><span>Записів</span></div>
  <div id="rows">${svs.map(s=>`<div class="srow"><div class="sname"><span class="dot" style="background:${colorOf(svIndex(s.id))}"></span>${esc(s.name)}</div>
   <label class="fld"><input id="a-${esc(s.id)}" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="Сума: ${esc(s.name)}"></label>
   <label class="fld"><input id="c-${esc(s.id)}" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="Записів: ${esc(s.name)}"></label></div>`).join('')}</div>
  <div class="sum"><span>Разом за день</span><b id="f-total">0&nbsp;₴</b></div>
  <div class="err" id="f-err" role="alert" hidden></div>
  <div class="actions"><button class="btn danger" id="f-del" hidden>Видалити день</button><button class="btn primary" id="f-save">Зберегти</button></div>`);
 const upd=()=>{$('f-total').textContent=money(svs.reduce((s,x)=>s+numOf($('a-'+x.id).value),0))};
 document.querySelectorAll('#rows input').forEach(el=>{digits(el);el.addEventListener('input',upd)});
 const err=m=>{const e=$('f-err');e.textContent=m;e.hidden=!m};
 const load=k=>{
  const v=state.days.get(k),ex=!!v;
  svs.forEach(s=>{const a=ex&&v.a&&v.a[s.id],c=ex&&v.c&&v.c[s.id];$('a-'+s.id).value=a?String(a):'';$('c-'+s.id).value=c?String(c):''});
  $('dayNote').hidden=!ex;$('f-del').hidden=!ex;err('');upd();
 };
 $('f-date').value=key||todayKey();load($('f-date').value);
 $('f-date').addEventListener('change',()=>{const k=$('f-date').value;if(/^\d{4}-\d{2}-\d{2}$/.test(k))load(k)});
 arm($('f-del'),'Видалити день',async()=>{await Store.deleteDay($('f-date').value);closeSheet();toast('День видалено')});
 $('f-save').addEventListener('click',async()=>{
  const k=$('f-date').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(k)){err('Оберіть дату.');return}
  const a={},c={};
  svs.forEach(s=>{const x=numOf($('a-'+s.id).value),n=numOf($('c-'+s.id).value);if(x>0)a[s.id]=x;if(n>0)c[s.id]=n});
  if(!Object.keys(a).length){err('Вкажіть суму хоча б для однієї послуги.');return}
  err('');const b=$('f-save');b.disabled=true;b.textContent='Зберігаю…';
  try{const r=await Store.saveDay(k,{d:k,a,c});closeSheet();toast(r==='pending'?'Збережено на пристрої, синхронізується при з’єднанні':'Збережено · '+ddmm(k))}
  catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
 });
}

/* ---------- файли ---------- */
async function saveFile(name,text,mime){
 const file=new File([text],name,{type:mime});
 try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return}}
 catch(e){if(e&&e.name==='AbortError')return}
 const url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function backupObj(){
 const days={};state.days.forEach((v,k)=>days[k]=v);
 const c=cfgDoc();
 return{v:2,exported:new Date().toISOString(),days,baseline:{counts:state.baseline},appointments:state.appts,expenses:state.exps,settings:{services:c.services,expCats:c.expCats}};
}
function exportCsv(){
 const D=compute();SVT=SV.filter(s=>D.summary.services[s.id].amount>0);
 const rows=[['Дата',...SVT.map(s=>s.name),'Разом'].join(';')];
 D.days.forEach(r=>rows.push([r.label,...SVT.map(s=>r[s.id]),r.total].join(';')));
 saveFile('magnifica-statystyka-'+todayKey()+'.csv','﻿'+rows.join('\r\n'),'text/csv');
}
async function importFile(f){
 try{
  const seed=JSON.parse(await f.text());
  const days=seed.days||{},dk=Object.keys(days);
  if(dk.some(k=>!/^\d{4}-\d{2}-\d{2}$/.test(k)||!days[k]||typeof days[k].a!=='object'))throw new Error('format');
  const ap=(seed.appointments||[]).filter(a=>a&&a.id&&/^\d{4}-\d{2}-\d{2}$/.test(a.d)&&Array.isArray(a.items));
  const ex=(seed.expenses||[]).filter(x=>x&&x.id&&/^\d{4}-\d{2}-\d{2}$/.test(x.d)&&x.amount>0);
  if(!dk.length&&!ap.length&&!ex.length)throw new Error('format');
  toast('Імпортую…');
  const n=await Store.importSeed({days,baseline:seed.baseline,appts:ap,exps:ex,cfg:seed.settings});
  toast('Імпортовано записів: '+n);
 }catch(err){toast(err&&err.message==='format'?'Файл не схожий на копію даних':'Не вдалося імпортувати. Перевірте зв’язок')}
}

/* ---------- теми, режим, вкладки ---------- */
function setSkin(s){
 document.documentElement.setAttribute('data-skin',s);lsSet('magnifica-skin',s);
 const mt=document.querySelector('meta[name="theme-color"]');if(mt)mt.setAttribute('content',SKIN_META[s]||'#10131f');
 document.querySelectorAll('.skin-btn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skin===s)));
}
const effMode=()=>{const p=lsGet('magnifica-mode','auto');return p==='auto'?(innerWidth>=900?'desktop':'phone'):p};
function applyMode(){
 const m=effMode(),h=document.documentElement;
 if(h.dataset.mode!==m){h.dataset.mode=m;setNavH();if(state.status==='ready')renderAll()}
}
function setNavH(){const n=$('navbar');document.documentElement.style.setProperty('--nav-h',(isMobile()&&n?n.offsetHeight:0)+'px')}
function setTab(t,scroll){
 state.tab=t;
 document.querySelectorAll('#nav button,#gear').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===t)));
 document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===t));
 $('pageTitle').textContent=TITLES[t][0];$('pageSub').textContent=TITLES[t][1];
 $('fabLbl').textContent=t==='expenses'?'Додати витрату':'Зробити запис';
 $('fab').hidden=!(state.status==='ready')||t==='settings';
 if(t==='settings')renderSettings(true);
 if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- відмальовування ---------- */
function statusCard(){
 const s=state.status;
 if(s==='loading')return'<div class="pulse"></div><h2>Завантажую дані…</h2><p>Це займе кілька секунд.</p>';
 if(s==='denied')return'<h2>Немає доступу до даних</h2><p>Цей акаунт не додано до правил бази Firestore. Додайте його UID у правила й оновіть сторінку.</p>';
 if(s==='error')return'<h2>Не вдалося прочитати дані</h2><p>Перевірте зв’язок і оновіть сторінку.</p>';
 return'';
}
function renderAll(){
 const ready=state.status==='ready';
 $('shell').classList.toggle('noshow',!ready);
 put('status',statusCard());
 $('fab').hidden=!ready||state.tab==='settings';
 if(!ready){$('period').textContent='—';return}
 SV=svList();
 const D=compute(),S=D.summary;
 SVT=SV.filter(s=>S.services[s.id].amount>0);if(!SVT.length)SVT=SV.filter(s=>!s.archived);
 $('period').textContent=S.from?full(S.from)+' — '+full(S.to):'—';
 put('profit',profitHtml(D));
 put('kpis',
  kpi('Загальна сума',money(S.total),S.from?full(S.from)+' — '+full(S.to):'ще немає даних')+
  kpi('Активні дні',fmt(S.active),'днів із записами')+
  kpi('Середня сума / день',money(S.avg),'середнє по активних днях')+
  kpi('Найкращий день',S.best?money(S.best.total):'—',S.best?S.best.label:''));
 put('services',serviceCards(S));
 put('dailyChart',lineChart(D.days));
 put('serviceDonut',donut(S.services,S.total));
 put('monthlyChart',barChart(D.monthly));
 put('weeklyChart',barChart(D.weekly));
 put('dailyTable',dailyTable(D.days));
 put('weeklyTable',plainTable(D.weekly,r=>esc(r.label).replace(' — ','–<br>')));
 put('monthlyTable',plainTable(D.monthly,r=>`${esc(r.short)}<br>${r.key.slice(0,4)}`));
 put('profitTable',profitTable(D.profitMonths));
 renderRecords();renderExpenses(D);renderSettings(false);
}

/* ---------- події ---------- */
document.querySelectorAll('#nav button,#gear').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab,true)));
$('fab').addEventListener('click',()=>{
 if(state.tab==='expenses')openExp();
 else openAppt({d:state.tab==='records'&&state.ui.aview==='day'?state.ui.adate:todayKey()});
});
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet')||e.target.closest('[data-close]'))closeSheet()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('sheet').hidden)closeSheet()});
$('profit').addEventListener('click',e=>{const b=e.target.closest('[data-range]');if(b){state.ui.range=b.dataset.range;renderAll()}});

$('records').addEventListener('click',e=>{
 const u=state.ui,t=e.target;
 let b;
 if((b=t.closest('[data-v]'))){u.aview=b.dataset.v;lsSet('magnifica-aview',u.aview);renderRecords();return}
 if((b=t.closest('[data-f]'))){u.afilter=b.dataset.f;renderRecords();return}
 if((b=t.closest('[data-nav]'))){
  const n=b.dataset.nav;
  if(n==='today')u.adate=todayKey();else u.adate=addDays(u.adate,(+n)*(u.aview==='week'?7:1));
  renderRecords();return;
 }
 if((b=t.closest('[data-d]'))){u.adate=b.dataset.d;u.aview='day';lsSet('magnifica-aview','day');renderRecords();return}
 if((b=t.closest('[data-id]'))){const a=state.appts.find(x=>x.id===b.dataset.id);if(a)openAppt(a);return}
 const col=t.closest('.tl-col');
 if(col){
  const r=col.getBoundingClientRect(),hpx=+col.dataset.hpx,sh=+col.dataset.sh;
  const m=Math.min(23*60+30,sh*60+Math.round((e.clientY-r.top)/hpx*2)*30);
  openAppt({d:col.dataset.date,t:hhmm(Math.max(0,m))});
 }
});
$('records').addEventListener('input',e=>{if(e.target.id==='aq'){state.ui.aq=e.target.value;put('recBody',recBody())}});

$('expenses').addEventListener('click',e=>{
 const b=e.target.closest('[data-em]');
 if(b){
  const n=+b.dataset.em,[y,m]=state.ui.emonth.split('-').map(Number);
  if(!n)state.ui.emonth=todayKey().slice(0,7);else{const dt=new Date(Date.UTC(y,m-1+n,1));state.ui.emonth=dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)}
  renderAll();return;
 }
 const r=e.target.closest('.exrow');
 if(r){const x=state.exps.find(z=>z.id===r.dataset.id);if(x)openExp(x)}
});

$('dailyTable').addEventListener('click',rowOpen);
$('dailyTable').addEventListener('keydown',rowOpen);
function rowOpen(e){
 const tr=e.target.closest('tr.edit');
 if(!tr||(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' '))return;
 e.preventDefault();
 const k=tr.dataset.key;
 if(state.days.has(k))openDay(k);
 else{state.ui.adate=k;state.ui.aview='day';setTab('records',true);renderRecords()}
}

/* налаштування: делеговані події */
const sett=$('settings');
sett.addEventListener('change',e=>{
 const row=e.target.closest('.setrow');if(!row)return;
 const c=cfgDoc();
 if(row.dataset.sid){
  const s=c.services.find(x=>x.id===row.dataset.sid);if(!s)return;
  if(e.target.classList.contains('nm')){const v=e.target.value.trim();if(!v){e.target.value=s.name;return}s.name=v}
  else{s.price=numOf(e.target.value);e.target.value=s.price?String(s.price):''}
  saveCfg().then(()=>toast('Збережено'));
 }else if(row.dataset.cid){
  const k=c.expCats.find(x=>x.id===row.dataset.cid);if(!k)return;
  const v=e.target.value.trim();if(!v){e.target.value=k.name;return}
  k.name=v;saveCfg().then(()=>toast('Збережено'));
 }
});
sett.addEventListener('input',e=>{if(e.target.classList.contains('pr'))e.target.value=e.target.value.replace(/\D/g,'').slice(0,7)});
sett.addEventListener('click',e=>{
 const t=e.target;let b;
 if((b=t.closest('.rm'))){
  if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='Видалити?';setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.textContent='✕'}},3500);return}
  const c=cfgDoc();
  if(b.dataset.rmSvc)c.services=c.services.filter(x=>x.id!==b.dataset.rmSvc);
  else c.expCats=c.expCats.filter(x=>x.id!==b.dataset.rmCat);
  saveCfg();renderAll();renderSettings(true);return;
 }
 if(t.closest('#addSvc')){cfgDoc().services.push({id:'s'+newId().slice(0,8),name:'Нова послуга',price:0});saveCfg();renderSettings(true);const r=[...sett.querySelectorAll('.setrow[data-sid] .nm')].pop();if(r){r.focus();r.select()}return}
 if(t.closest('#addCat')){cfgDoc().expCats.push({id:'c'+newId().slice(0,8),name:'Нова категорія'});saveCfg();renderSettings(true);const r=[...sett.querySelectorAll('.setrow[data-cid] .nm')].pop();if(r){r.focus();r.select()}return}
 if((b=t.closest('.skin-btn'))){setSkin(b.dataset.skin);return}
 if((b=t.closest('.seg button[data-mode]'))){lsSet('magnifica-mode',b.dataset.mode);applyMode();renderSettings(true);return}
 if(t.closest('#exJson')){saveFile('magnifica-backup-'+todayKey()+'.json',JSON.stringify(backupObj()),'application/json');return}
 if(t.closest('#exCsv')){exportCsv();return}
 if(t.closest('#imBtn')){$('impFile').click();return}
 if(t.closest('#manDay')){openDay();return}
 if(t.closest('#logout')){Store.signOut();return}
});
$('impFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f)importFile(f)});

/* ---------- вхід ---------- */
function authErr(e){
 const c=(e&&e.code)||'';
 if(/invalid-credential|wrong-password|user-not-found|invalid-email|missing-password/.test(c))return'Невірна пошта або пароль.';
 if(c==='auth/too-many-requests')return'Забагато спроб. Зачекайте кілька хвилин.';
 if(c==='auth/network-request-failed')return'Немає зв’язку з інтернетом.';
 if(c==='auth/operation-not-allowed')return'Вхід за паролем вимкнено у Firebase.';
 return'Не вдалося увійти. Спробуйте ще раз.';
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const b=$('l-btn'),er=$('l-err');
 er.hidden=true;b.disabled=true;b.textContent='Входжу…';
 try{await Store.signIn($('l-email').value.trim(),$('l-pass').value)}
 catch(err){er.textContent=authErr(err);er.hidden=false}
 b.disabled=false;b.textContent='Увійти';
});
$('loginBrand').appendChild(document.querySelector('.brand').cloneNode(true));
$('installHint').hidden=!(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!navigator.standalone);

/* ---------- запуск ---------- */
function setView(v){document.documentElement.setAttribute('data-view',v)}
setSkin(document.documentElement.getAttribute('data-skin')||'night');
setNavH();addEventListener('resize',()=>{applyMode();setNavH()});
setTab('overview');
(function(){
 if(!(window.Store&&Store.configured)){setView('config');return}
 let unsub=null;
 Store.onAuth(user=>{
  if(unsub){unsub();unsub=null}
  state.user=user;state.days=new Map();state.baseline={};state.appts=[];state.exps=[];state.cfg=null;
  if(!user){setView('login');return}
  state.status='loading';setView('app');renderAll();
  unsub=Store.subscribe({
   days:m=>{state.days=m;state.status='ready';renderAll()},
   baseline:b=>{state.baseline=b;if(state.status==='ready')renderAll()},
   appts:l=>{state.appts=l;if(state.status==='ready')renderAll()},
   exps:l=>{state.exps=l;if(state.status==='ready')renderAll()},
   cfg:c=>{state.cfg=c;if(state.status==='ready')renderAll()},
   error:code=>{state.status=code==='permission-denied'?'denied':'error';renderAll()}
  });
 });
 // записи, що «відбулися» з часом, мають потрапляти в статистику без перезавантаження
 setInterval(()=>{if(state.status==='ready'&&$('sheet').hidden)renderAll()},60000);
})();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
