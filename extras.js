'use strict';
/* Додатки: повідомлення клієнтам, лист очікування, вкладка «Майстри», беззбитковість, очищення, встановлення. */

/* ---------- повідомлення клієнтам ---------- */
const TPL_DEF={
 rem:'Доброго дня, {name}! Нагадуємо про ваш запис {when} о {time} ({services}). MAGNiFICA. Якщо плани змінились, напишіть, будь ласка.',
 lapse:'Доброго дня, {name}! Давно вас не бачили в MAGNiFICA. Запишемось на зручний для вас час?',
 bd:'{name}, вітаємо з днем народження! 🎉 Даруємо знижку {disc}% на наступний візит до кінця місяця. MAGNiFICA',
 free:'Доброго дня, {name}! Звільнилось місце {when} о {time}. Бажаєте записатись? MAGNiFICA'
};
const TPL_LBL={rem:'Нагадування про запис',lapse:'Давно не були',bd:'День народження',free:'Звільнилось місце'};
const tplText=k=>(state.cfg&&state.cfg.tpl&&state.cfg.tpl[k])||TPL_DEF[k];
function fillTpl(k,v){
 v=Object.assign({disc:(state.cfg&&state.cfg.bdDisc)||10},v);
 return tplText(k).replace(/\{(\w+)\}/g,(m,n)=>v[n]!=null?v[n]:m);
}
function phoneIntl(p){
 let d=digitsOf(p);if(!d)return'';
 if(d.startsWith('00'))d=d.slice(2);
 if(d.length===10&&d[0]==='0')d='38'+d;else if(d.length===9)d='380'+d;
 return d;
}
const whenText=d=>{const t=todayKey();return d===t?'сьогодні':d===addDays(t,1)?'завтра':full(d).slice(0,5)};
const listUa=a=>a.length>1?a.slice(0,-1).join(', ')+' та '+a[a.length-1]:(a[0]||'');
const apptVars=a=>({name:a.name||'',first:String(a.name||'').trim().split(/\s+/)[0]||'',when:whenText(a.d),time:a.t,date:full(a.d),
 services:listUa((a.items||[]).map(i=>String(i.name).toLowerCase())),master:a.mn||''});
const CH=[['sms','SMS'],['wa','WhatsApp'],['vb','Viber'],['tg','Telegram'],['sg','Signal']];
/* панель вибору месенджера: текст можна правити; для Viber/Telegram/Signal текст копіюється, для SMS/WhatsApp підставляється сам */
function msgPanel(phone,text){
 const p=phoneIntl(phone);
 if(!p)return'<div class="hint" style="margin:0">Немає номера телефону.</div>';
 return`<div class="msgp" data-msgp data-phone="${esc(p)}"><textarea rows="3" data-msgt maxlength="500">${esc(text)}</textarea>
  <div class="msgb">${CH.map(([k,n])=>`<a class="btn sm" data-ch="${k}" rel="noopener">${n}</a>`).join('')}</div>
  <div class="hint" style="margin:6px 0 0">SMS і WhatsApp відкриваються з готовим текстом. У Viber, Telegram та Signal текст копіюється — вставте його в чат.</div></div>`;
}
document.addEventListener('click',e=>{
 const a=e.target.closest('a[data-ch]');if(!a)return;
 const box=a.closest('[data-msgp]'),text=box.querySelector('[data-msgt]').value,p=box.dataset.phone,k=a.dataset.ch,enc=encodeURIComponent(text);
 let href='',copy=false;
 if(k==='sms')href='sms:+'+p+'?&body='+enc;
 else if(k==='wa'){href='https://wa.me/'+p+'?text='+enc;a.target='_blank'}
 else if(k==='vb'){href='viber://chat?number=%2B'+p;copy=true}
 else if(k==='tg'){href='https://t.me/+'+p+'?text='+enc;a.target='_blank'}
 else if(k==='sg'){href='https://signal.me/#p/+'+p;a.target='_blank';copy=true}
 a.href=href;
 if(copy)copyText(text,'Текст скопійовано — вставте його в чат');
});
const msgPicker=(phone,keys,vars,open)=>`<details class="msgd" ${open?'open':''}><summary>Написати клієнту</summary>
 ${keys.length>1?`<div class="btnrow" style="margin:8px 0">${keys.map(k=>`<button class="btn sm" type="button" data-tplk="${k}">${TPL_LBL[k]}</button>`).join('')}</div>`:''}
 <div data-msgwrap>${msgPanel(phone,fillTpl(keys[0],vars))}</div></details>`;
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-tplk]');if(!b)return;
 const d=b.closest('details'),t=d.querySelector('[data-msgt]'),v=JSON.parse(d.dataset.vars||'{}');
 if(t)t.value=fillTpl(b.dataset.tplk,v);
});

/* ---------- лист очікування ---------- */
const waitActive=()=>state.wait.filter(w=>!w.d||w.d>=todayKey());
function openWait(){
 if(!canTab('records'))return;
 const list=waitActive().sort((a,b)=>String(a.d||'9').localeCompare(String(b.d||'9')));
 const edit=can('apptAdd')||can('apptEdit');
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">Лист очікування</h2>${closeBtn}</div>
  <p class="set-p">Клієнти, які хочуть записатись, але потрібного часу немає. Коли запис скасовується, застосунок підкаже, кому написати.</p>
  <div id="w-list">${list.length?list.map(w=>`<div class="exrow" style="cursor:default"><div><div class="t">${esc(w.name)}</div><div class="m">${w.d?'на '+full(w.d):'будь-який день'}${w.phone?' · '+esc(w.phone):''}${w.note?' · '+esc(w.note):''}</div></div>${edit?`<button class="rm" data-wdel="${esc(w.id)}" aria-label="Прибрати">✕</button>`:''}</div>`).join(''):'<div class="empty">Список порожній</div>'}</div>
  ${edit?`<div class="lbl2" style="margin-top:14px">Додати</div>
  <label class="lf"><span>Клієнт</span><input id="w-name" list="w-dl" autocomplete="off" maxlength="80" placeholder="ім’я"></label><datalist id="w-dl">${state.clients.slice(0,300).map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
  <div class="fgrid" style="grid-template-columns:1fr 1fr"><label class="lf"><span>Телефон</span><input id="w-phone" type="tel" inputmode="tel" maxlength="24"></label>
   <label class="lf"><span>Бажана дата (не обов’язково)</span><input id="w-d" type="date"></label></div>
  <label class="lf"><span>Примітка</span><input id="w-note" maxlength="120" placeholder="наприклад: після 16:00, манікюр"></label>
  <div class="err" id="w-err" hidden></div><div class="actions"><button class="btn primary" id="w-add">Додати в список</button></div>`:''}`);
 if(!edit)return;
 $('w-name').addEventListener('change',()=>{const c=state.clients.find(x=>x.name===$('w-name').value);if(c&&c.phone)$('w-phone').value=c.phone});
 $('w-list').addEventListener('click',async e=>{const b=e.target.closest('[data-wdel]');if(!b)return;await Store.deleteWait(b.dataset.wdel);setTimeout(openWait,50)});
 $('w-add').addEventListener('click',async()=>{
  const name=$('w-name').value.trim(),phone=$('w-phone').value.trim();
  if(!name){$('w-err').textContent='Вкажіть ім’я.';$('w-err').hidden=false;return}
  const c=state.clients.find(x=>x.name===name);
  const o={id:newId(),name,phone,cid:c?c.id:'',d:$('w-d').value||'',note:$('w-note').value.trim(),created:Date.now()};
  try{await Store.saveWait(o.id,o);state.wait=state.wait.concat([o]);openWait();renderRecords()}catch(e){$('w-err').textContent=errText(e);$('w-err').hidden=false}
 });
}
/* після скасування/видалення запису: кому з очікування можна написати */
function offerSlot(a){
 if(!a||!isOk(a)||(a.d+' '+a.t)<nowKey()||!canTab('records'))return;
 const c=waitActive().filter(w=>!w.d||w.d===a.d);
 if(!c.length)return;
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">Звільнилось місце</h2>${closeBtn}</div>
  <p class="set-p">${esc(dayLabel(a.d))}, ${esc(a.t)}. У списку очікування:</p>
  ${c.map(w=>`<div class="card" style="margin-bottom:10px"><b>${esc(w.name)}</b><div class="hint" style="margin:2px 0 8px">${w.d?'на '+full(w.d):'будь-який день'}${w.note?' · '+esc(w.note):''}</div>
   ${msgPanel(w.phone,fillTpl('free',{name:w.name,first:String(w.name).split(/\s+/)[0],when:whenText(a.d),time:a.t}))}
   ${(can('apptAdd')||can('apptEdit'))?`<div class="btnrow" style="margin-top:8px"><button class="btn sm" data-wbook="${esc(w.id)}">Записати</button><button class="btn sm" data-wdone="${esc(w.id)}">Прибрати зі списку</button></div>`:''}</div>`).join('')}`);
 $('sheetPanel').onclick=async e=>{
  let b;
  if((b=e.target.closest('[data-wdone]'))){await Store.deleteWait(b.dataset.wdone);state.wait=state.wait.filter(x=>x.id!==b.dataset.wdone);b.closest('.card').remove();if(!document.querySelector('#sheetPanel .card'))closeSheet()}
  else if((b=e.target.closest('[data-wbook]'))){
   const w=state.wait.find(x=>x.id===b.dataset.wbook);if(!w)return;
   closeSheet();$('sheetPanel').onclick=null;
   Store.deleteWait(w.id);state.wait=state.wait.filter(x=>x.id!==w.id);
   openAppt({d:a.d,t:a.t,dur:a.dur,m:a.m,cid:w.cid,name:w.name,phone:w.phone});
  }
 };
}

/* ---------- вкладка «Майстри» ---------- */
Object.assign(state.ui,{mmode:'month',mmonth:todayKey().slice(0,7)});
function mastersData(){
 const u=state.ui,inP=d=>u.mmode==='all'||String(d).startsWith(u.mmonth);
 const list=state.appts.filter(a=>inP(a.d));
 const ids=new Map();
 masters().forEach(m=>ids.set(m.id,m.name));
 list.forEach(a=>{const k=a.m||'';if(!ids.has(k))ids.set(k,a.mn||personName(a.m)||'Без майстра')});
 const rows=[...ids.entries()].map(([id,name])=>{
  const mine=list.filter(a=>(a.m||'')===id),done=mine.filter(counted);
  const rev=done.reduce((t,a)=>t+(+a.total||0),0);
  const st=state.staff.find(s=>s.id===id);
  const paid=state.sals.filter(x=>x.sid===id&&inP(x.d)).reduce((t,x)=>t+(+x.amount||0),0);
  return{id,name,n:done.length,up:mine.filter(a=>isOk(a)&&!counted(a)).length,rev,avg:done.length?rev/done.length:0,
   noshow:mine.filter(a=>a.st==='noshow').length,cancel:mine.filter(a=>a.st==='cancel').length,
   clients:new Set(done.map(a=>a.cid||a.name)).size,pct:st&&+st.pct>0?+st.pct:0,paid,
   hours:done.reduce((t,a)=>t+(+a.dur||60),0)/60};
 }).filter(r=>r.n||r.up||r.noshow||r.cancel||masters().some(m=>m.id===r.id));
 const total=rows.reduce((t,r)=>t+r.rev,0);
 rows.forEach(r=>{r.share=total?r.rev/total*100:0;r.owe=r.pct?Math.round(r.rev*r.pct/100):0});
 return{rows:rows.sort((a,b)=>b.rev-a.rev),total};
}
function renderMasters(){
 const el=$('masters');if(!el)return;
 if(!canTab('masters')){el.innerHTML='';return}
 const u=state.ui,[y,m]=u.mmonth.split('-').map(Number),D=mastersData(),fin=can('salaryView');
 const nav=`<div class="tools"><div class="seg" role="group" aria-label="Період"><button data-mm="month" aria-pressed="${u.mmode==='month'}">Місяць</button><button data-mm="all" aria-pressed="${u.mmode==='all'}">Весь час</button></div>
  ${u.mmode==='month'?`<div class="navdate grow"><button class="iconbtn" data-mn="-1" aria-label="Попередній">‹</button><span class="lbl">${MONTHS[m-1]} ${y}</span><button class="iconbtn" data-mn="1" aria-label="Наступний">›</button></div><button class="btn sm" data-mn="0">Цей місяць</button>`:''}</div>`;
 const cards=D.rows.map(r=>`<div class="card mcard"><div class="payc-h"><span class="av" style="background:${r.id?personColor(r.id):'var(--accent-soft)'};color:#fff">${esc(initials(r.name))}</span><div><b>${esc(r.name)}</b><div class="m">${r.share?r.share.toFixed(0)+'% виручки · ':''}${r.hours?durText(Math.round(r.hours*60))+' роботи':'без візитів'}</div></div><div class="mrev">${money(r.rev)}</div></div>
  <div class="tiles"><div><span>Візитів</span><b>${r.n}</b></div><div><span>Середній чек</span><b>${r.avg?money(Math.round(r.avg)):'—'}</b></div><div><span>Клієнтів</span><b>${r.clients}</b></div>
   <div><span>Пропусків</span><b>${r.noshow}</b></div><div><span>Скасувань</span><b>${r.cancel}</b></div><div><span>Попереду</span><b>${r.up}</b></div></div>
  <div class="bar"><i style="width:${Math.min(100,r.share).toFixed(1)}%;background:${r.id?personColor(r.id):'var(--accent)'}"></i></div>
  ${fin?`<div class="sumline" style="margin-top:8px"><span>Виплачено за період: <b>${money(r.paid)}</b></span>${r.pct?`<span>${r.pct}% від виручки: <b>${money(r.owe)}</b></span><span>${r.owe-r.paid>0?'До виплати: <b>'+money(r.owe-r.paid)+'</b>':'Переплата: <b>'+money(r.paid-r.owe)+'</b>'}</span>`:''}</div>`:''}</div>`).join('');
 el.innerHTML=nav+`<div class="sumline"><span>Майстрів: <b>${D.rows.length}</b></span><span>Виручка по записах: <b>${money(D.total)}</b></span></div>`+(cards||'<div class="card"><div class="empty">Поки немає записів із майстрами. Створіть працівників з позначкою «Майстер» у налаштуваннях.</div></div>');
}
$('masters').addEventListener('click',e=>{
 let b;
 if((b=e.target.closest('[data-mm]'))){state.ui.mmode=b.dataset.mm;renderMasters();return}
 if((b=e.target.closest('[data-mn]'))){
  const n=+b.dataset.mn,[y,m]=state.ui.mmonth.split('-').map(Number);
  if(!n)state.ui.mmonth=todayKey().slice(0,7);else{const dt=new Date(Date.UTC(y,m-1+n,1));state.ui.mmonth=dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)}
  renderMasters();
 }
});

/* ---------- беззбитковість ---------- */
const isFixedCat=id=>{const c=cfgCats().find(x=>x.id===id);return c?(c.fixed!=null?!!c.fixed:id==='rent'||id==='tax'):false};
function breakevenHtml(D){
 if(!hasFin())return'';
 const mk=todayKey().slice(0,7),pk=addMonths(todayKey(),-1).slice(0,7);
 const fixed=m=>state.exps.filter(x=>String(x.d).startsWith(m)&&isFixedCat(x.cat)).reduce((t,x)=>t+(+x.amount||0),0);
 const sal=m=>state.sals.filter(x=>String(x.d).startsWith(m)).reduce((t,x)=>t+(+x.amount||0),0);
 const f=Math.max(fixed(mk),fixed(pk)),s=Math.max(sal(mk),sal(pk)),target=f+s;
 const TT='Постійні витрати (категорії з позначкою «пост.») та зарплати; береться більше з цього й минулого місяця';
 if(!target)return`<div class="card be-card" title="${TT}"><div class="be-head"><h2>Точка беззбитковості</h2><span class="be-n">немає даних</span></div></div>`;
 const row=D.monthly.find(r=>r.key===mk),earned=row?row.total:0,pct=Math.min(100,earned/target*100),left=Math.max(0,target-earned);
 return`<div class="card be-card" title="${TT}"><div class="be-head"><h2>Точка беззбитковості</h2><span class="be-n"><b>${money(earned)}</b> / ${money(target)}</span></div>
  <div class="bar be"><i style="width:${pct.toFixed(1)}%"></i></div>
  <div class="be-note">${left?`Залишилось ${money(left)}`:`Покрито ✓ · понад ${money(target)} — чистий дохід`}</div></div>`;
}

/* ---------- налаштування: шаблони, пост. категорії, очищення ---------- */
function extrasSettingsHtml(){
 const c=state.cfg||{};
 return`<div class="card" style="grid-column:1/-1"><h2 class="set-h">Повідомлення клієнтам</h2>
  <p class="set-p">Тексти для кнопки «Написати клієнту». Підстановки: {name} — ім’я клієнта, {first} — перше слово імені, {when} — «завтра»/«сьогодні»/дата, {time}, {date}, {services}, {master}, {disc} — знижка.</p>
  ${Object.keys(TPL_DEF).map(k=>`<label class="lf"><span>${TPL_LBL[k]}</span><textarea rows="2" data-tpl="${k}" maxlength="400">${esc(tplText(k))}</textarea></label>`).join('')}
  <div class="fgrid" style="grid-template-columns:1fr 1fr"><label class="lf"><span>Знижка на день народження, %</span><input data-cfgn="bdDisc" inputmode="numeric" value="${esc(c.bdDisc!=null?c.bdDisc:10)}"></label>
   <label class="lf"><span>«Давно не були» після, тижнів</span><input data-cfgn="lapseWeeks" inputmode="numeric" value="${esc(c.lapseWeeks!=null?c.lapseWeeks:6)}"></label></div>
  <button class="btn sm" id="tplReset">Скинути тексти</button></div>`;
}
function initExtras(){
 const s=$('settings');
 s.addEventListener('change',e=>{
  const t=e.target;
  if(t.matches('[data-tpl]')){const c=cfgDoc();c.tpl=c.tpl||{};const v=t.value.trim();if(v&&v!==TPL_DEF[t.dataset.tpl])c.tpl[t.dataset.tpl]=v;else delete c.tpl[t.dataset.tpl];saveCfg().then(()=>toast('Збережено'))}
  else if(t.matches('[data-cfgn]')){const c=cfgDoc(),k=t.dataset.cfgn;let n=numOf(t.value);if(k==='bdDisc')n=Math.min(100,n);if(k==='lapseWeeks')n=Math.max(1,n);c[k]=n;t.value=n;saveCfg().then(()=>{toast('Збережено');renderAll()})}
  else if(t.matches('[data-fixed]')){const k=cfgDoc().expCats.find(x=>x.id===t.dataset.fixed);if(k){k.fixed=t.checked;saveCfg().then(()=>{toast('Збережено');renderAll()})}}
 });
 s.addEventListener('click',e=>{
  if(e.target.closest('#tplReset')){const c=cfgDoc();delete c.tpl;saveCfg().then(()=>{toast('Тексти скинуто');renderSettings(true)})}
  else if(e.target.closest('#archBtn'))openArchive();
  else if(e.target.closest('#installBtn'))doInstall();
 });
}

/* ---------- очищення ---------- */
async function autoPrune(){
 if(!isOwner()||!Store.pruneLogs)return;
 const k='mg-prune',t=todayKey();if(lsGet(k,'')===t)return;lsSet(k,t);
 try{for(let i=0;i<10;i++){if(await Store.pruneLogs(Date.now()-90*864e5)<300)break}}catch(e){}
}
function openArchive(){
 if(!isOwner())return;
 const opts=[6,12,24];
 const plan=m=>{const cut=addMonths(todayKey(),-m);return{cut,list:state.appts.filter(a=>a.d<cut)}};
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">Архів старих записів</h2>${closeBtn}</div>
  <p class="set-p">Підсумки по днях і послугах переносяться у «По днях» (дохід, місячна й тижнева статистика не змінюються), а самі записи видаляються — це зменшує навантаження на безкоштовну базу. Історія візитів клієнтів, майстри й імена в цих записах зникнуть. Перед архівом зробіть копію (Налаштування → Дані).</p>
  <label class="lf"><span>Архівувати записи старші за</span><select id="ar-m">${opts.map(m=>`<option value="${m}" ${m===12?'selected':''}>${m} міс.</option>`).join('')}</select></label>
  <div class="note" id="ar-i"></div><div class="err" id="ar-e" hidden></div>
  <div class="actions"><button class="btn danger" id="ar-go">Архівувати</button></div>`);
 const info=()=>{const p=plan(+$('ar-m').value);$('ar-i').textContent=p.list.length?`Буде перенесено ${p.list.length} записів до ${full(p.cut)}.`:'Записів для архіву немає.';$('ar-go').disabled=!p.list.length};
 $('ar-m').addEventListener('change',info);info();
 arm($('ar-go'),'Архівувати',async()=>{
  const p=plan(+$('ar-m').value),days={};
  p.list.filter(counted).forEach(a=>{
   const base=days[a.d]||(state.days.get(a.d)?JSON.parse(JSON.stringify(state.days.get(a.d))):{d:a.d,a:{},c:{}});
   base.a=base.a||{};base.c=base.c||{};days[a.d]=base;
   const f=itemFactor(a);
   (a.items||[]).forEach(i=>{base.a[i.sid]=Math.round(((+base.a[i.sid]||0)+(+i.price||0)*f)*100)/100;base.c[i.sid]=(+base.c[i.sid]||0)+1});
  });
  await Store.archive({days,del:p.list.map(a=>a.id)});
  logAct('Архів записів',`${p.list.length} записів до ${full(p.cut)}`);
  closeSheet();toast('Архівовано записів: '+p.list.length);
 });
}

/* ---------- встановлення застосунку ---------- */
let deferredInstall=null;
const isStandalone=()=>(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
function drawInstall(){
 document.querySelectorAll('#installBtn,#installLogin').forEach(b=>{b.hidden=!!isStandalone()});
 const n=$('installNote');if(n)n.textContent=isStandalone()?'Застосунок уже встановлено.':'';
}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;drawInstall()});
addEventListener('appinstalled',()=>{deferredInstall=null;drawInstall();toast('Застосунок встановлено')});
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function iosGuide(){
 const ua=navigator.userAgent,webview=!/safari/i.test(ua)||/FBAN|FBAV|Instagram|Telegram|Viber|Line\/|TikTok|GSA\//i.test(ua),other=/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
 const shareIc='<svg class="ios-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">Додати на екран айфона</h2>${closeBtn}</div>
  ${webview?'<div class="note warn">Ви відкрили сайт усередині іншого застосунку (Telegram, Instagram, Viber…). Там ярлик створити не можна. Скопіюйте посилання й відкрийте його в <b>Safari</b>.<div style="margin-top:8px"><button class="btn sm" id="ios-copy" type="button">Скопіювати посилання</button></div></div>':''}
  <ol class="ios-steps">
   <li>Відкрийте сайт у <b>Safari</b>${other?' (у Chrome теж працює, якщо iOS 16.4 і новіша)':''}.</li>
   <li>Натисніть кнопку <b>«Поділитися»</b> ${shareIc} (квадрат зі стрілкою вгору): на айфоні внизу посередині, на айпаді вгорі.</li>
   <li>Прокрутіть меню вниз і оберіть <b>«На початковий екран»</b>. Якщо такого пункту не видно, натисніть «Ще» або «Редагувати дії».</li>
   <li>Натисніть <b>«Додати»</b> справа вгорі. Ярлик MAGNiFICA зʼявиться на головному екрані.</li>
  </ol>
  <div class="hint">iOS не дозволяє встановити застосунок однією кнопкою, тому це робиться вручну через меню «Поділитися».</div>`);
 const c=$('ios-copy');if(c)c.addEventListener('click',()=>copyText(location.href.split('#')[0],'Посилання скопійовано. Вставте його в Safari'));
}
async function doInstall(){
 if(deferredInstall){deferredInstall.prompt();try{await deferredInstall.userChoice}catch(e){}deferredInstall=null;return}
 if(isIOS()){iosGuide();return}
 toast('У меню браузера (⋮) оберіть «Встановити застосунок» або «Додати на головний екран»');
}
const installBlockHtml=()=>`<div class="lbl2" style="margin-top:14px">Застосунок</div><button class="btn sm" id="installBtn" ${isStandalone()?'hidden':''}>Встановити застосунок</button><div class="hint" id="installNote" style="margin:6px 0 0">${isStandalone()?'Застосунок уже встановлено.':''}</div>`;
