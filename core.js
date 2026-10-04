'use strict';
/* MAGNiFICA — ядро: константи, стан, права, агрегація, огляд, вікна. */

const LEGACY_NAMES={man:'Манікюр',ped:'Педикюр',brw:'Брови',mke:'Мейк',hair:'Зачіска'};
const DEFAULT_SERVICES=[
 {id:'man',name:'Манікюр',price:900},{id:'ped',name:'Педикюр',price:800},{id:'brw',name:'Брови',price:0},
 {id:'mke',name:'Мейк',price:1500},{id:'hair',name:'Зачіска',price:0}
];
const DEFAULT_CATS=[{id:'rent',name:'Оренда'},{id:'mat',name:'Матеріали'},{id:'tax',name:'Податки'},{id:'oth',name:'Інше'}];
const MONTHS=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const MSHORT=['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
const MGEN=['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
const WDS=['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
const WDL=['Неділя','Понеділок','Вівторок','Середа','Четвер','П’ятниця','Субота'];
const SKINS=[['night','Синьо-сірий'],['asphalt','Графіт'],['coffee','Кава з молоком'],['ivory','Слонова кістка'],['steel','Туман']];
const SKIN_META={steel:'#c6d1d9',asphalt:'#141619',coffee:'#d8c6b2',ivory:'#f1ece0',night:'#12171d'};
const TITLES={
 overview:['Огляд','Суми та активність за всіма днями'],
 records:['Записи','Клієнти за днями та годинами'],
 clients:['Клієнти','База клієнтів і їхня історія'],
 expenses:['Витрати','Оренда, матеріали, податки, зарплата'],
 monthly:['Місячна статистика','Підсумок по місяцях'],
 weekly:['Тижнева статистика','Тижні з понеділка по неділю'],
 daily:['Денна статистика','Історія всіх активних днів'],
 settings:['Налаштування','Послуги, працівники, вигляд, дані']
};
/* Права працівників: [група, [[ключ, підпис], …]] */
const PERM_DEFS=[
 ['Статистика',[['stats','Огляд, місячна, тижнева, по днях']]],
 ['Записи',[['apptView','Бачити всі записи'],['apptOwn','Бачити лише свої записи'],['apptAdd','Додавати записи'],['apptEdit','Редагувати записи'],['apptDel','Видаляти записи']]],
 ['Клієнти',[['clientsView','Бачити базу клієнтів'],['clientsEdit','Редагувати клієнтів'],['clientsDel','Видаляти клієнтів']]],
 ['Фінанси',[['expView','Бачити витрати'],['expEdit','Вносити й змінювати витрати'],['salaryView','Бачити виплати зарплат'],['salaryEdit','Вносити й змінювати виплати']]]
];
const PERM_PRESETS={
 master:{label:'Майстер',perms:['apptOwn','apptAdd','apptEdit']},
 admin:{label:'Адміністратор',perms:['apptView','apptAdd','apptEdit','apptDel','clientsView','clientsEdit']},
 none:{label:'Нічого',perms:[]}
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
function addMonths(k,n){const dt=utc(k),d=dt.getUTCDate();dt.setUTCDate(1);dt.setUTCMonth(dt.getUTCMonth()+n);const last=new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,0)).getUTCDate();dt.setUTCDate(Math.min(d,last));return keyOf(dt)}
const dow=k=>utc(k).getUTCDay();
function mondayOf(k){const dt=utc(k);dt.setUTCDate(dt.getUTCDate()-((dt.getUTCDay()+6)%7));return dt}
const dayLabel=k=>WDL[dow(k)]+', '+(+k.slice(8,10))+' '+MGEN[+k.slice(5,7)-1]+' '+k.slice(0,4);
const toMin=t=>{const p=String(t||'0:0').split(':');return (+p[0]||0)*60+(+p[1]||0)};
const hhmm=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const newId=()=>(window.crypto&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,'').slice(0,20):Date.now().toString(36)+Math.random().toString(36).slice(2,10));
const durText=m=>m%60===0?(m/60)+' год':(m<60?m+' хв':Math.floor(m/60)+' год '+(m%60)+' хв');
const digitsOf=s=>String(s||'').replace(/\D/g,'');
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?';
const isDate=k=>/^\d{4}-\d{2}-\d{2}$/.test(k||'');
const numOf=v=>{const n=parseInt(String(v||'').replace(/\D/g,''),10);return isFinite(n)?Math.min(n,9999999):0};
const digitsOnly=el=>el.addEventListener('input',()=>{el.value=el.value.replace(/\D/g,'').slice(0,7)});
const put=(id,html)=>{const el=$(id);if(el)el.innerHTML=html};

const state={
 days:new Map(),baseline:{},appts:[],exps:[],sals:[],clients:[],staff:[],cfg:null,
 status:'loading',tab:'overview',user:null,role:'owner',perms:{},me:null,
 ui:{aview:lsGet('magnifica-aview','day'),adate:todayKey(),afilter:'future',aq:'',mf:'',range:'all',emonth:todayKey().slice(0,7),
  exsub:'exp',cq:'',csort:'name',cflt:'all'}
};
let SV=[],SVT=[];

/* ---------- права ---------- */
const isOwner=()=>state.role==='owner';
const can=p=>isOwner()||!!state.perms[p];
const canView=()=>can('apptView')||can('apptOwn');
function canTab(t){
 if(['overview','monthly','weekly','daily'].includes(t))return can('stats');
 if(t==='records')return canView()||can('apptAdd');
 if(t==='clients')return can('clientsView');
 if(t==='expenses')return can('expView')||can('salaryView');
 if(t==='settings')return isOwner();
 return false;
}
const hasFin=()=>can('stats')&&can('expView')&&can('salaryView');
const myUid=()=>state.user?state.user.uid:'';

/* ---------- налаштування: послуги, категорії, люди ---------- */
const cfgServices=()=>(state.cfg&&state.cfg.services)||DEFAULT_SERVICES;
const cfgCats=()=>(state.cfg&&state.cfg.expCats)||DEFAULT_CATS;
const cfgPeople=()=>(state.cfg&&state.cfg.people)||[];
const masters=()=>cfgPeople().filter(p=>p.master);
function cfgDoc(){
 if(!state.cfg)state.cfg={};
 if(!state.cfg.services)state.cfg.services=DEFAULT_SERVICES.map(x=>({...x}));
 if(!state.cfg.expCats)state.cfg.expCats=DEFAULT_CATS.map(x=>({...x}));
 if(!state.cfg.people)state.cfg.people=[];
 return state.cfg;
}
function saveCfg(){
 const c=cfgDoc();
 return Store.saveCfg({services:c.services,expCats:c.expCats,people:c.people})
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
function personName(id,snap){
 const p=cfgPeople().find(x=>x.id===id)||state.staff.find(x=>x.id===id);
 return p?p.name:(snap||'');
}
const personColor=id=>{const i=cfgPeople().findIndex(x=>x.id===id);return colorOf(i<0?0:i+1)};
/* список людей для довідника: оновлюється власником при кожній зміні штату */
function syncPeople(list){
 const c=cfgDoc();
 c.people=(list||state.staff).filter(s=>s.active!==false).map(s=>({id:s.id,name:s.name,master:!!s.master}));
 return saveCfg();
}

/* ---------- записи: статуси ---------- */
const isOk=a=>a.st!=='cancel'&&a.st!=='noshow';
const counted=a=>isOk(a)&&(a.d+' '+a.t)<=nowKey();

/* ---------- агрегація ---------- */
function blank(label,short,key){const r={label,short,key,total:0};SV.forEach(s=>r[s.id]=0);return r}
function outs(){
 return state.exps.map(x=>({d:x.d,amount:+x.amount||0,k:'exp'})).concat(state.sals.map(x=>({d:x.d,amount:+x.amount||0,k:'sal'})));
}
function compute(){
 const map=new Map();
 const row=k=>{if(!map.has(k))map.set(k,{a:{},c:{}});return map.get(k)};
 state.days.forEach((v,k)=>{
  const r=row(k);
  Object.entries((v&&v.a)||{}).forEach(([id,x])=>r.a[id]=(r.a[id]||0)+(+x||0));
  Object.entries((v&&v.c)||{}).forEach(([id,x])=>r.c[id]=(r.c[id]||0)+(+x||0));
 });
 const masterRev=new Map();
 state.appts.filter(counted).forEach(ap=>{
  const r=row(ap.d);
  (ap.items||[]).forEach(it=>{r.a[it.sid]=(r.a[it.sid]||0)+(+it.price||0);r.c[it.sid]=(r.c[it.sid]||0)+1});
  const mk=ap.m||'—';const mr=masterRev.get(mk)||{name:ap.mn||personName(ap.m)||'Без майстра',sum:0,n:0};
  mr.sum+=(+ap.total||0);mr.n++;masterRev.set(mk,mr);
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
 const exByMonth={};outs().forEach(x=>{const m=String(x.d).slice(0,7);exByMonth[m]=(exByMonth[m]||0)+x.amount});
 const revByMonth={};months.forEach((v,k)=>revByMonth[k]=v.total);
 const pm=[...new Set([...Object.keys(exByMonth),...Object.keys(revByMonth)])].sort().map(k=>({key:k,rev:revByMonth[k]||0,exp:exByMonth[k]||0}));
 return{days,weekly:[...weeks.values()],monthly:[...months.values()],profitMonths:pm,masterRev:[...masterRev.values()].sort((a,b)=>b.sum-a.sum),
  summary:{total,active:days.length,avg:days.length?total/days.length:0,best,services,
   from:days.length?days[0].key:null,to:days.length?days[days.length-1].key:null}};
}

/* ---------- огляд ---------- */
const kpi=(label,value,hint)=>`<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`;
function profitHtml(D){
 if(!hasFin())return '';
 const r=state.ui.range,mk=todayKey().slice(0,7);
 const inR=k=>r==='all'||String(k).startsWith(mk);
 const rev=D.days.filter(x=>inR(x.key)).reduce((a,x)=>a+x.total,0);
 const exp=outs().filter(x=>inR(x.d)).reduce((a,x)=>a+x.amount,0);
 const net=rev-exp,margin=rev?Math.round(net/rev*100):null;
 const fut=state.appts.filter(a=>isOk(a)&&!counted(a));
 const futSum=fut.reduce((a,x)=>a+(+x.total||0),0);
 return `<div class="profit">
  <div class="profit-top"><span class="label">Чистий прибуток</span>
   <div class="seg" role="group" aria-label="Період"><button data-range="all" aria-pressed="${r==='all'}">Весь час</button><button data-range="month" aria-pressed="${r==='month'}">Цей місяць</button></div></div>
  <div><div class="profit-main ${net<0?'neg':'pos'}">${net<0?'−':''}${money(Math.abs(net))}</div>
   ${margin==null?'':`<div class="sub">${margin<0?'−'+Math.abs(margin):margin}% від доходу${futSum?` · попереду записів на ${money(futSum)}`:''}</div>`}</div>
  <div class="profit-row"><div><span>Дохід</span><b>${money(rev)}</b></div><div><span>Витрати і зарплата</span><b>${money(exp)}</b></div><div><span>Записів</span><b>${fmt(state.appts.filter(a=>isOk(a)&&(r==='all'||a.d.startsWith(mk))).length)}</b></div></div>
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
function mastersCard(D){
 const l=D.masterRev;if(!l.length||!l.some(m=>m.sum>0))return '';
 const tot=l.reduce((a,m)=>a+m.sum,0)||1;
 return `<div class="card"><h2>Майстри</h2><div class="caption">Дохід із записів клієнтів за майстрами</div>${l.map((m,i)=>`<div class="rank-row"><div class="rank-head"><span><span class="dot" style="width:7px;height:7px;background:${colorOf(i+1)};margin-right:5px"></span>${esc(m.name)} · ${m.n} зап.</span><b>${money(m.sum)}</b></div><div class="rank-track"><i style="width:${m.sum/tot*100}%;background:${colorOf(i+1)}"></i></div></div>`).join('')}</div>`;
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
 if(!hasFin())return '<div class="empty">Немає доступу до витрат</div>';
 if(!pm.length)return '<div class="empty">Ще немає даних</div>';
 const body=pm.slice().reverse().map(r=>{const n=r.rev-r.exp;return `<tr><td>${MSHORT[+r.key.slice(5,7)-1]} ${r.key.slice(0,4)}</td>${cell(r.rev)}${cell(r.exp)}<td class="total ${n<0?'neg':''}">${n<0?'−':''}${fmt(Math.abs(n))}</td></tr>`}).join('');
 return `<div class="table-note">Суми в гривнях (₴). Витрати включають зарплату.</div><div class="table-wrap"><table><thead><tr><th>Місяць</th><th>Дохід</th><th>Витрати</th><th class="total">Прибуток</th></tr></thead><tbody>${body}</tbody></table></div>`;
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
 if(c==='permission-denied')return'Немає прав на цю дію.';
 if(c==='resource-exhausted')return'Перевищено денний ліміт Firebase. Спробуйте завтра.';
 return'Не вдалося зберегти. Спробуйте ще раз.';
}
function arm(btn,label,fn){
 btn.addEventListener('click',async()=>{
  if(!btn.dataset.armed){btn.dataset.armed='1';btn.textContent='Торкніться ще раз';setTimeout(()=>{if(btn.isConnected){btn.dataset.armed='';btn.textContent=label}},4000);return}
  btn.disabled=true;
  try{await fn()}catch(e){toast(errText(e));btn.disabled=false;btn.dataset.armed='';btn.textContent=label}
 });
}
const savedToast=(r,msg)=>toast(r==='pending'?'Збережено на пристрої, синхронізується при з’єднанні':msg);

/* ---------- теми, режим, вкладки ---------- */
function setSkin(s){
 if(!SKIN_META[s])s='night';
 document.documentElement.setAttribute('data-skin',s);lsSet('magnifica-skin',s);
 const mt=document.querySelector('meta[name="theme-color"]');if(mt)mt.setAttribute('content',SKIN_META[s]);
 document.querySelectorAll('.skin-btn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skin===s)));
}
const effMode=()=>{const p=lsGet('magnifica-mode','auto');return p==='auto'?(innerWidth>=900?'desktop':'phone'):p};
const isMobile=()=>document.documentElement.dataset.mode==='phone';
function setNavH(){const n=$('navbar');document.documentElement.style.setProperty('--nav-h',(isMobile()&&n?n.offsetHeight:0)+'px')}
function applyMode(){
 const m=effMode(),h=document.documentElement;
 if(h.dataset.mode!==m){h.dataset.mode=m;setNavH();if(state.status==='ready')renderAll()}
}
function updateNav(){
 document.querySelectorAll('#nav button,#gear').forEach(b=>{b.hidden=!canTab(b.dataset.tab)});
 if(!canTab(state.tab)){const f=['overview','records','clients','expenses','settings'].find(canTab);if(f)setTab(f)}
}
function fabInfo(){
 const t=state.tab;
 if(t==='expenses'){
  if(state.ui.exsub==='sal')return can('salaryEdit')?['Виплатити зарплату',()=>openSalary()]:null;
  return can('expEdit')?['Додати витрату',()=>openExp()]:null;
 }
 if(t==='clients')return can('clientsEdit')?['Додати клієнта',()=>openClient()]:null;
 if(t==='settings')return null;
 return can('apptAdd')?['Зробити запис',()=>openAppt({d:state.tab==='records'&&state.ui.aview==='day'?state.ui.adate:todayKey()})]:null;
}
function updateFab(){
 const f=state.status==='ready'?fabInfo():null;
 $('fab').hidden=!f;if(f)$('fabLbl').textContent=f[0];
}
function setTab(t,scroll){
 state.tab=t;
 document.querySelectorAll('#nav button,#gear').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===t)));
 document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===t));
 $('pageTitle').textContent=TITLES[t][0];$('pageSub').textContent=TITLES[t][1];
 updateFab();
 if(t==='settings')renderSettings(true);
 if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- відмальовування ---------- */
function statusCard(){
 const s=state.status;
 if(s==='loading')return'<div class="pulse"></div><h2>Завантажую дані…</h2><p>Це займе кілька секунд.</p>';
 if(s==='denied')return'<h2>Немає доступу до даних</h2><p>Цей акаунт не додано до правил бази Firestore або доступ вимкнено. Зверніться до адміністратора.</p>';
 if(s==='error')return'<h2>Не вдалося прочитати дані</h2><p>Перевірте зв’язок і оновіть сторінку.'+(state.errMsg?' <small>('+esc(state.errMsg)+')</small>':'')+'</p>';
 return'';
}
function renderAll(){
 const ready=state.status==='ready';
 $('shell').classList.toggle('noshow',!ready);
 put('status',statusCard());
 if(!ready){$('period').textContent='—';updateFab();return}
 updateNav();
 SV=svList();
 const D=compute(),S=D.summary;
 SVT=SV.filter(s=>S.services[s.id].amount>0);if(!SVT.length)SVT=SV.filter(s=>!s.archived);
 $('period').textContent=S.from&&can('stats')?full(S.from)+' — '+full(S.to):'—';
 if(can('stats')){
  put('profit',profitHtml(D));
  put('kpis',
   kpi('Загальна сума',money(S.total),S.from?full(S.from)+' — '+full(S.to):'ще немає даних')+
   kpi('Активні дні',fmt(S.active),'днів із записами')+
   kpi('Середня сума / день',money(S.avg),'середнє по активних днях')+
   kpi('Найкращий день',S.best?money(S.best.total):'—',S.best?S.best.label:''));
  put('services',serviceCards(S));
  put('mastersBox',mastersCard(D));
  put('dailyChart',lineChart(D.days));
  put('serviceDonut',donut(S.services,S.total));
  put('monthlyChart',barChart(D.monthly));
  put('weeklyChart',barChart(D.weekly));
  put('dailyTable',dailyTable(D.days));
  put('weeklyTable',plainTable(D.weekly,r=>esc(r.label).replace(' — ','–<br>')));
  put('monthlyTable',plainTable(D.monthly,r=>`${esc(r.short)}<br>${r.key.slice(0,4)}`));
  put('profitTable',profitTable(D.profitMonths));
 }
 renderRecords();renderClients();renderMoney(D);renderSettings(false);
 updateFab();
}
