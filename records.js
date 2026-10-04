'use strict';
/* Записи клієнтів: день / тиждень / список і форма запису. */

const byTime=(a,b)=>toMin(a.t)-toMin(b.t)||String(a.name||'').localeCompare(String(b.name||''));
const visAppts=()=>state.appts.filter(a=>!state.ui.mf||a.m===state.ui.mf);
const apptsOn=d=>visAppts().filter(a=>a.d===d).sort(byTime);
const activeSum=l=>l.filter(isOk).reduce((s,a)=>s+(+a.total||0),0);
const activeN=l=>l.filter(isOk).length;
const itemsText=a=>(a.items||[]).map(i=>i.name).join(', ');
const firstColor=a=>colorOf(svIndex(a.items&&a.items[0]&&a.items[0].sid));
const mName=a=>a.mn||personName(a.m)||'';
const STATUS_TXT={cancel:'скасовано',noshow:'не прийшов'};

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
 const fut=!counted(a)&&isOk(a);
 const sub=(mName(a)?mName(a)+' · ':'')+itemsText(a);
 return `<button class="ev ${isOk(a)?'':'cancel'} ${fut?'future':''}" data-id="${esc(a.id)}" style="${pos||''}--ec:${firstColor(a)}"><b>${esc(a.t)}</b>${compact?'':'<span class="p">'+money(a.total||0)+'</span>'}<span class="n">${esc(nm)}${STATUS_TXT[a.st]&&!compact?' · '+STATUS_TXT[a.st]:''}</span><span class="s">${esc(sub)}</span></button>`;
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
   const fut=!counted(a)&&isOk(a);
   const sub=(mName(a)?mName(a)+' · ':'')+itemsText(a)+(a.name&&a.phone?' · '+a.phone:'');
   h+=`<button class="ag ${isOk(a)?'':'cancel'} ${fut?'future':''}" data-id="${esc(a.id)}" style="--ec:${firstColor(a)}">
    <div class="ag-t"><b>${esc(a.t)}</b><span>${durText(+a.dur||60)}</span></div>
    <div><div class="ag-n">${esc(a.name||a.phone||'Без імені')}${STATUS_TXT[a.st]?' · '+STATUS_TXT[a.st]:''}</div><div class="ag-s">${esc(sub)}</div></div>
    <div class="ag-p">${money(a.total||0)}</div></button>`;
  });
 });
 return h;
}
function masterSelect(){
 const ms=masters();
 if(ms.length<2&&!state.ui.mf)return '';
 return `<select class="mini" data-mf aria-label="Майстер"><option value="">Усі майстри</option>${ms.map(m=>`<option value="${esc(m.id)}" ${state.ui.mf===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`;
}
const waitBtn=()=>{const n=waitActive().length;return `<button class="btn sm" data-wait>Очікування${n?' ('+n+')':''}</button>`};
function recToolbar(){
 const u=state.ui,v=u.aview;
 const seg=`<div class="seg" role="group" aria-label="Вигляд"><button data-v="day" aria-pressed="${v==='day'}">День</button><button data-v="week" aria-pressed="${v==='week'}">Тиждень</button><button data-v="list" aria-pressed="${v==='list'}">Список</button></div>`;
 if(v==='list'){
  const f=u.afilter;
  return `<div class="tools">${seg}<div class="seg" role="group" aria-label="Фільтр"><button data-f="future" aria-pressed="${f==='future'}">Майбутні</button><button data-f="past" aria-pressed="${f==='past'}">Минулі</button><button data-f="all" aria-pressed="${f==='all'}">Усі</button></div>${masterSelect()}${waitBtn()}</div>
   <div class="tools"><input class="search" id="aq" type="search" placeholder="Пошук: ім’я, телефон, робота" value="${esc(u.aq)}" autocomplete="off"></div>`;
 }
 let lbl;
 if(v==='day')lbl=dayLabel(u.adate);
 else{const m=keyOf(mondayOf(u.adate));lbl=full(m).slice(0,5)+' — '+full(addDays(m,6)).slice(0,5)+'.'+addDays(m,6).slice(0,4)}
 return `<div class="tools">${seg}${masterSelect()}${waitBtn()}</div><div class="tools"><div class="navdate grow"><button class="iconbtn" data-nav="-1" aria-label="Назад">‹</button><span class="lbl">${esc(lbl)}</span><button class="iconbtn" data-nav="1" aria-label="Вперед">›</button></div><button class="btn sm" data-nav="today">Сьогодні</button></div>`;
}
function recBody(){
 if(!canView())return '<div class="card"><div class="empty">У вас є право лише додавати записи. Перегляд списку вимкнено адміністратором.</div></div>';
 const u=state.ui,v=u.aview,hpx=isMobile()?64:72;
 if(v==='day'){
  const l=apptsOn(u.adate),[sh,eh]=trange([l]);
  return `<div class="card"><div class="sumline"><span>Записів: <b>${activeN(l)}</b></span><span>Сума: <b>${money(activeSum(l))}</b></span>${l.length?'':'<span>Вільний день'+(can('apptAdd')?' — торкніться години, щоб записати клієнта':'')+'</span>'}</div>
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
 let l=visAppts();
 if(u.afilter==='future')l=l.filter(a=>(isOk(a)&&!counted(a))||a.d>=t);
 else if(u.afilter==='past')l=l.filter(a=>a.d<t||counted(a)||!isOk(a));
 if(q)l=l.filter(a=>(String(a.name||'')+' '+String(a.phone||'')+' '+itemsText(a)+' '+mName(a)+' '+String(a.note||'')).toLowerCase().includes(q));
 l.sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t));
 if(u.afilter!=='future')l.reverse();
 return `<div class="card">${agenda(l.slice(0,400),q?'Нічого не знайдено':'Записів немає.'+(can('apptAdd')?' Натисніть «Зробити запис».':''))}</div>`;
}
function renderRecords(){
 const el=$('records');if(!el)return;
 el.innerHTML='<div id="recTools">'+recToolbar()+'</div><div id="recBody">'+recBody()+'</div>';
}

/* ---------- форма запису ---------- */
const defTime=d=>{if(d!==todayKey())return'10:00';const h=Math.min(20,Math.max(9,new Date().getHours()+1));return pad(h)+':00'};
function freqServices(svs){
 const cnt={};state.appts.forEach(a=>(a.items||[]).forEach(i=>cnt[i.sid]=(cnt[i.sid]||0)+1));
 const sorted=svs.slice().sort((x,y)=>(cnt[y.id]||0)-(cnt[x.id]||0));
 return sorted.slice(0,4);
}
function defaultMaster(){
 const ms=masters();
 if(!isOwner()&&state.perms.apptOwn&&!state.perms.apptView)return myUid();
 const last=lsGet('magnifica-lastm','');
 if(last&&ms.some(m=>m.id===last))return last;
 if(ms.length===1)return ms[0].id;
 return '';
}
function openAppt(init){
 if(state.status!=='ready')return;
 const ex=init&&init.id?init:null;
 if(!ex&&!can('apptAdd'))return;
 const ro=!!ex&&!can('apptEdit');
 const d0=(init&&init.d)||todayKey();
 const a=ex?JSON.parse(JSON.stringify(ex)):{d:d0,t:(init&&init.t)||defTime(d0),dur:(init&&init.dur)||60,cid:(init&&init.cid)||'',name:(init&&init.name)||'',phone:(init&&init.phone)||'',note:'',items:init&&init.items?JSON.parse(JSON.stringify(init.items)):[],st:'ok',m:init&&init.m!=null?init.m:defaultMaster()};
 if(!a.st)a.st='ok';
 a.subOn=!!a.subUsed;
 const remHtml=ex&&ex.phone&&isOk(ex)&&(ex.d+' '+ex.t)>=nowKey()?`<details class="remd"><summary>Нагадати клієнту</summary>${msgPanel(ex.phone,fillTpl('rem',apptVars(ex)))}</details>`:'';
 const svs=svList().filter(s=>!s.archived);
 const ms=masters();
 const lockM=!isOwner()&&!!state.perms.apptOwn&&!state.perms.apptView;
 const durs=[30,45,60,90,120,150,180,240];if(!durs.includes(+a.dur))durs.push(+a.dur);durs.sort((x,y)=>x-y);
 const freq=freqServices(svs);
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?(ro?'Запис (перегляд)':'Запис клієнта'):'Новий запис'}</h2>${closeBtn}</div>
  <div class="fgrid"><label class="lf"><span>Дата</span><input type="date" id="p-d" value="${esc(a.d)}"></label>
   <label class="lf"><span>Час</span><input type="time" id="p-t" step="300" value="${esc(a.t)}"></label>
   <label class="lf"><span>Тривалість</span><select id="p-dur">${durs.map(m=>`<option value="${m}" ${m===+a.dur?'selected':''}>${durText(m)}</option>`).join('')}</select></label></div>
  <div class="lf acw"><span>Клієнт (ПІБ)</span><input id="p-name" autocomplete="off" placeholder="почніть вводити ім’я або телефон" value="${esc(a.name)}" maxlength="80"><div class="ac" id="p-ac" hidden></div><div class="cinfo" id="p-ci" hidden></div></div>
  <label class="lf"><span>Телефон</span><input id="p-phone" type="tel" inputmode="tel" autocomplete="off" placeholder="необов’язково" value="${esc(a.phone)}" maxlength="24"></label>
  ${ms.length||lockM?`<label class="lf"><span>Майстер</span><select id="p-m" ${lockM?'disabled':''}><option value="">— не вказано —</option>${ms.map(m=>`<option value="${esc(m.id)}" ${m.id===a.m?'selected':''}>${esc(m.name)}</option>`).join('')}${a.m&&!ms.some(m=>m.id===a.m)?`<option value="${esc(a.m)}" selected>${esc(a.mn||personName(a.m)||'Майстер')}</option>`:''}</select></label>`:''}
  <div class="lbl2">Роботи</div><div class="chips" id="p-chips"></div>
  <select class="more" id="p-more" aria-label="Інші роботи"></select>
  <div class="sel" id="p-sel"></div>
  <label class="lf"><span>Примітка</span><input id="p-note" autocomplete="off" placeholder="необов’язково" value="${esc(a.note)}" maxlength="160"></label>
  <div class="lbl2">Статус</div>
  <div class="seg stseg" id="p-st"><button type="button" data-s="ok">Активний</button><button type="button" data-s="cancel">Скасовано</button><button type="button" data-s="noshow">Не прийшов</button></div>
  <div class="note" id="p-cn" hidden></div>
  ${remHtml}
  <div class="discrow"><label class="lf"><span>Знижка, %</span><input id="p-disc" inputmode="numeric" value="${a.disc||''}" placeholder="0" maxlength="3"></label><div id="p-subw"></div></div>
  <div class="sum"><span>Разом</span><b id="p-total">0&nbsp;₴</b></div><div class="hint" id="p-base" hidden></div>
  <div class="err" id="p-err" role="alert" hidden></div>
  <div class="actions">${ex&&can('apptDel')?'<button class="btn danger" id="p-del">Видалити</button>':''}${ro?'':'<button class="btn primary" id="p-save">Зберегти</button>'}</div>`);
 const baseSum=()=>a.items.reduce((s,i)=>s+(+i.price||0),0);
 const subC=()=>{const c=a.cid&&state.clients.find(x=>x.id===a.cid);return c&&c.sub&&+c.sub.visits>0?c:null};
 const total=()=>{const c=subC();if(a.subOn&&c)return Math.round((+c.sub.price||0)/c.sub.visits);const d=Math.min(100,Math.max(0,+a.disc||0));return Math.round(baseSum()*(100-d)/100)};
 const upTotal=()=>{const t=total(),b=baseSum();$('p-total').textContent=money(t);const h=$('p-base');h.hidden=t===b;h.textContent=t===b?'':'До знижки: '+money(b)+(a.subOn?' · за абонементом':'')};
 const drawSub=()=>{const c=subC(),w=$('p-subw');
  if(!c||!can('clientsEdit')||(+c.sub.left<=0&&!a.subUsed)){w.innerHTML='';if(a.subOn){a.subOn=false;upTotal()}return}
  w.innerHTML=`<label class="chk"><input type="checkbox" id="p-sub" ${a.subOn?'checked':''}> Абонемент «${esc(c.sub.name||'')}», залишилось ${+c.sub.left}</label>`;
 };
 const err=m=>{const e=$('p-err');e.textContent=m;e.hidden=!m};
 const drawChips=()=>{
  const shown=freq.slice();
  a.items.forEach(i=>{const s=svs.find(x=>x.id===i.sid);if(s&&!shown.includes(s))shown.push(s)});
  $('p-chips').innerHTML=shown.map(s=>`<button class="chip" type="button" data-sid="${esc(s.id)}" aria-pressed="${a.items.some(i=>i.sid===s.id)}">${esc(s.name)}<small>${s.price?fmt(s.price)+' ₴':'—'}</small></button>`).join('')||'<span class="hint" style="margin:0">Додайте послуги в налаштуваннях (шестерня).</span>';
  const rest=svs.filter(s=>!shown.includes(s)&&!a.items.some(i=>i.sid===s.id));
  const more=$('p-more');
  more.hidden=!rest.length;
  more.innerHTML='<option value="">＋ Інша робота…</option>'+rest.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}${s.price?' — '+fmt(s.price)+' ₴':''}</option>`).join('');
 };
 const drawSel=()=>{
  $('p-sel').innerHTML=a.items.map((it,i)=>`<div class="selrow"><span class="sname"><i class="dot" style="background:${colorOf(svIndex(it.sid))}"></i>${esc(it.name)}</span><input data-i="${i}" inputmode="numeric" value="${it.price||''}" placeholder="0" aria-label="Ціна: ${esc(it.name)}"><button class="rm" type="button" data-rm="${i}" aria-label="Прибрати">✕</button></div>`).join('');
  upTotal();
 };
 const addItem=sid=>{const s=svs.find(x=>x.id===sid);if(s&&!a.items.some(i=>i.sid===sid))a.items.push({sid,name:s.name,price:s.price})};
 const showSt=()=>{
  document.querySelectorAll('#p-st button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s===a.st)));
  const n=$('p-cn');
  n.hidden=a.st==='ok';
  n.textContent=a.st==='cancel'?'Запис скасовано заздалегідь: у дохід не входить, у статистиці клієнта рахується як скасування.':a.st==='noshow'?'Клієнт не прийшов: у дохід не входить, у статистиці клієнта рахується як пропуск.':'';
 };
 drawChips();drawSel();showSt();drawSub();
 $('p-disc').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,3);a.disc=Math.min(100,+e.target.value||0);upTotal()});
 $('p-subw').addEventListener('change',e=>{if(e.target.id==='p-sub'){a.subOn=e.target.checked;upTotal()}});
 $('p-chips').addEventListener('click',e=>{
  const b=e.target.closest('.chip');if(!b)return;
  const sid=b.dataset.sid,i=a.items.findIndex(x=>x.sid===sid);
  if(i>=0)a.items.splice(i,1);else addItem(sid);
  drawChips();drawSel();
 });
 $('p-more').addEventListener('change',e=>{if(e.target.value){addItem(e.target.value);drawChips();drawSel()}});
 $('p-sel').addEventListener('input',e=>{
  const el=e.target.closest('input');if(!el)return;
  el.value=el.value.replace(/\D/g,'').slice(0,7);a.items[+el.dataset.i].price=numOf(el.value);upTotal();
 });
 $('p-sel').addEventListener('click',e=>{const b=e.target.closest('.rm');if(!b)return;a.items.splice(+b.dataset.rm,1);drawChips();drawSel()});
 $('p-st').addEventListener('click',e=>{const b=e.target.closest('button');if(b){a.st=b.dataset.s;showSt()}});

 /* автопідказка клієнтів */
 const showInfo=()=>{
  const c=a.cid&&state.clients.find(x=>x.id===a.cid),box=$('p-ci');
  if(!c){box.hidden=true;return}
  box.hidden=false;box.innerHTML=`<span>${esc(clientBrief(c))}</span><button type="button" data-unlink>Інший клієнт</button>`;
 };
 const ac=$('p-ac');
 const hideAc=()=>{ac.hidden=true};
 const showAc=q=>{
  q=q.trim().toLowerCase();const dq=digitsOf(q);
  if(!q||(a.cid&&state.clients.find(x=>x.id===a.cid&&x.name.toLowerCase()===q))){hideAc();return}
  const st=clientStatsMap();
  const res=state.clients.filter(c=>c.name.toLowerCase().includes(q)||(dq.length>=3&&digitsOf(c.phone).includes(dq)))
   .sort((x,y)=>(y.name.toLowerCase().startsWith(q)-x.name.toLowerCase().startsWith(q))||((st.get(y.id)||{}).visits||0)-((st.get(x.id)||{}).visits||0)).slice(0,6);
  if(!res.length){hideAc();return}
  ac.innerHTML=res.map(c=>`<button type="button" class="ac-i" data-cid="${esc(c.id)}"><b>${esc(c.name)}</b><span>${esc(c.phone||'без телефону')} · ${esc(clientBrief(c,st.get(c.id)))}</span></button>`).join('');
  ac.hidden=false;
 };
 const pick=c=>{
  a.cid=c.id;$('p-name').value=c.name;a.name=c.name;
  if(c.phone){$('p-phone').value=c.phone;a.phone=c.phone}
  hideAc();showInfo();drawSub();upTotal();
 };
 $('p-name').addEventListener('input',e=>{
  a.name=e.target.value;
  const c=a.cid&&state.clients.find(x=>x.id===a.cid);
  if(c&&c.name!==a.name){a.cid='';showInfo();drawSub();upTotal()}
  showAc(a.name);
 });
 $('p-phone').addEventListener('input',e=>{
  a.phone=e.target.value;
  if(!a.cid&&digitsOf(a.phone).length>=3)showAc(a.phone);else hideAc();
 });
 $('p-name').addEventListener('blur',()=>setTimeout(hideAc,180));
 $('p-phone').addEventListener('blur',()=>setTimeout(hideAc,180));
 ac.addEventListener('mousedown',e=>e.preventDefault());
 ac.addEventListener('click',e=>{const b=e.target.closest('.ac-i');if(!b)return;const c=state.clients.find(x=>x.id===b.dataset.cid);if(c)pick(c)});
 $('p-ci').addEventListener('click',e=>{if(e.target.closest('[data-unlink]')){a.cid='';showInfo();drawSub();upTotal();$('p-name').focus()}});
 showInfo();

 if(ro){
  document.querySelectorAll('#sheetPanel input,#sheetPanel select,#sheetPanel .chip,#sheetPanel #p-st button,#sheetPanel .rm').forEach(el=>{el.disabled=true});
 }
 if(ex&&can('apptDel'))arm($('p-del'),'Видалити',async()=>{if(ex.subUsed)await subAdjust(ex.cid,1);await Store.deleteAppt(a.id);closeSheet();toast('Запис видалено');offerSlot(ex)});
 if(!ro)$('p-save').addEventListener('click',async()=>{
  const d=$('p-d').value,t=$('p-t').value;
  if(!isDate(d)){err('Оберіть дату.');return}
  if(!/^\d{2}:\d{2}$/.test(t)){err('Вкажіть час.');return}
  if(!a.items.length){err('Оберіть хоча б одну роботу.');return}
  const dur=+$('p-dur').value||60;
  const mSel=$('p-m');const m=mSel?mSel.value:(a.m||'');
  if(m&&a.st==='ok'&&!a.warned){
   const s0=toMin(t),e0=s0+dur;
   const clash=state.appts.find(x=>x.id!==a.id&&x.m===m&&x.d===d&&isOk(x)&&toMin(x.t)<e0&&toMin(x.t)+(+x.dur||60)>s0);
   if(clash){a.warned=true;err('У цього майстра вже є запис о '+clash.t+' ('+(clash.name||'без імені')+'). Натисніть «Зберегти» ще раз, щоб підтвердити.');return}
  }
  err('');
  const b=$('p-save');b.disabled=true;b.textContent='Зберігаю…';
  try{
   a.name=$('p-name').value.trim();a.phone=$('p-phone').value.trim();
   const cid=await resolveClient(a);
   const obj={id:a.id||newId(),d,t,dur,cid,name:a.name,phone:a.phone,m,mn:m?personName(m,a.mn):'',note:$('p-note').value.trim(),
    items:a.items.map(i=>({sid:i.sid,name:i.name,price:+i.price||0})),total:total(),disc:a.subOn?0:(+a.disc||0),subUsed:false,st:a.st,created:a.created||Date.now()};
   const nowSub=!!(a.subOn&&cid&&a.cid===cid&&subC()&&a.st!=='cancel'&&can('clientsEdit'));
   obj.subUsed=nowSub;
   const wasSub=!!(ex&&ex.subUsed);
   if(m)lsSet('magnifica-lastm',m);
   const r=await Store.saveAppt(obj.id,obj);
   if(wasSub&&(!nowSub||ex.cid!==cid))await subAdjust(ex.cid,1);
   if(nowSub&&(!wasSub||ex.cid!==cid))await subAdjust(cid,-1);
   state.ui.adate=d;closeSheet();
   if(state.tab==='records'||state.tab==='overview')renderAll();
   savedToast(r,'Запис збережено · '+ddmm(d)+' '+t);
   if(ex&&isOk(ex)&&obj.st==='cancel')offerSlot(ex);
  }catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
 });
}
/* пов'язує запис з карткою клієнта або створює нову картку */
async function resolveClient(a){
 if(a.cid&&state.clients.find(c=>c.id===a.cid))return a.cid;
 const nm=a.name.trim(),ph=a.phone.trim();
 if(!nm&&!ph)return '';
 const dg=digitsOf(ph);
 let c=null;
 if(dg.length>=7)c=state.clients.find(x=>digitsOf(x.phone)===dg);
 if(!c&&nm)c=state.clients.find(x=>x.name.trim().toLowerCase()===nm.toLowerCase());
 if(c)return c.id;
 if(!can('clientsEdit')&&!can('apptAdd'))return '';
 const obj={id:newId(),name:nm||ph,phone:ph,bd:'',note:'',reviews:[],created:Date.now()};
 await Store.saveClient(obj.id,obj);
 return obj.id;
}

/* списання/повернення візиту з абонемента клієнта */
async function subAdjust(cid,delta){
 const c=state.clients.find(x=>x.id===cid);if(!c||!c.sub)return;
 const n={...c,sub:{...c.sub,left:Math.max(0,Math.min(+c.sub.visits||99,(+c.sub.left||0)+delta))}};
 try{await Store.saveClient(c.id,n)}catch(e){}
}
