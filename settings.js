'use strict';
/* Налаштування: послуги, категорії, працівники з правами, вигляд, дані, правила бази. */

function rulesText(){
 const uid=state.user?state.user.uid:'ВАШ_UID';
 return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Власники сайту. Залиште тут UID усіх власників (без пробілів), додайте UID Оксани.
    function owner() { return request.auth != null && request.auth.uid in ['${uid}', 'UID_ДРУГОГО_ВЛАСНИКА']; }
    function signed() { return request.auth != null; }
    function myDoc() { return /databases/$(database)/documents/staff/$(request.auth.uid); }
    function staffOk() { return signed() && exists(myDoc()) && get(myDoc()).data.active == true; }
    function can(p) { return owner() || (staffOk() && get(myDoc()).data.perms.get(p, false) == true); }
    function ownOnly() { return !owner() && can('apptOwn') && !can('apptView'); }

    match /staff/{id} {
      allow read: if owner() || (signed() && request.auth.uid == id);
      allow write: if owner();
    }
    match /meta/{id} {
      allow read: if owner() || staffOk();
      allow write: if owner();
    }
    match /days/{id} {
      allow read: if can('stats');
      allow write: if owner();
    }
    match /appointments/{id} {
      allow read: if can('apptView') || can('stats') || (can('apptOwn') && resource.data.m == request.auth.uid);
      allow create: if can('apptAdd') && (!ownOnly() || request.resource.data.m == request.auth.uid);
      allow update: if can('apptEdit') && (!ownOnly() || (resource.data.m == request.auth.uid && request.resource.data.m == request.auth.uid));
      allow delete: if can('apptDel') && (!ownOnly() || resource.data.m == request.auth.uid);
    }
    match /clients/{id} {
      allow read: if can('clientsView') || can('apptAdd') || can('apptEdit');
      allow create: if can('clientsEdit') || can('apptAdd');
      allow update: if can('clientsEdit');
      allow delete: if can('clientsDel');
    }
    match /expenses/{id} {
      allow read: if can('expView');
      allow write: if can('expEdit');
    }
    match /salaries/{id} {
      allow read: if can('salaryView');
      allow write: if can('salaryEdit');
    }
  }
}`;
}

function renderSettings(force){
 const el=$('settings');if(!el)return;
 if(!isOwner()){el.innerHTML='';return}
 if(!force&&el.contains(document.activeElement)&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;
 const sv=cfgServices(),ct=cfgCats(),skin=document.documentElement.dataset.skin,mp=lsGet('magnifica-mode','auto');
 const staffRows=state.staff.map(s=>`<button class="cl" data-staff="${esc(s.id)}"><span class="av">${esc(initials(s.name))}</span>
  <span class="cl-m"><span class="cl-n">${esc(s.name)}${s.active===false?' · вимкнено':''}</span><span class="cl-s">${esc(s.role||'без посади')}${s.email?' · '+esc(s.email):' · без входу на сайт'}</span></span>
  <span class="cl-b">${s.master?'<i class="bdg">Майстер</i>':''}${s.uid?'<i class="bdg vip">Має доступ</i>':''}</span></button>`).join('');
 el.innerHTML=`<div class="set-grid">
 <div class="card"><h2 class="set-h">Послуги та ціни</h2>
  <p class="set-p">Ціна підставляється автоматично при створенні запису. Зміна ціни діє лише на нові записи: у вже створених ціна залишається та, що була.</p>
  <div class="setrow hd"><span>Назва</span><span>Ціна, ₴</span><span></span></div>
  ${sv.map(s=>`<div class="setrow" data-sid="${esc(s.id)}"><input class="nm" value="${esc(s.name)}" aria-label="Назва послуги" maxlength="40"><input class="pr" value="${s.price?s.price:''}" placeholder="0" inputmode="numeric" aria-label="Ціна: ${esc(s.name)}"><button class="rm" data-rm-svc="${esc(s.id)}" aria-label="Видалити послугу">✕</button></div>`).join('')}
  <button class="btn sm" id="addSvc">+ Додати послугу</button></div>
 <div class="card"><h2 class="set-h">Категорії витрат</h2>
  <p class="set-p">Оренда, матеріали, податки… Зарплата ведеться окремо у вкладці «Витрати → Зарплата». Видалення категорії не стирає вже внесені витрати.</p>
  ${ct.map(c=>`<div class="setrow cat" data-cid="${esc(c.id)}"><input class="nm" value="${esc(c.name)}" aria-label="Назва категорії" maxlength="40"><button class="rm" data-rm-cat="${esc(c.id)}" aria-label="Видалити категорію">✕</button></div>`).join('')}
  <button class="btn sm" id="addCat">+ Додати категорію</button></div>
 <div class="card" style="grid-column:1/-1"><h2 class="set-h">Працівники</h2>
  <p class="set-p">Тут ви створюєте майстрів і працівників, даєте їм вхід на сайт та визначаєте, які розділи вони бачать і що можуть робити. Майстри з’являються у виборі в записі.</p>
  ${staffRows||'<div class="hint" style="margin:0 0 10px">Працівників ще немає.</div>'}
  <button class="btn sm" id="addStaff">+ Додати працівника</button></div>
 <div class="card"><h2 class="set-h">Вигляд</h2>
  <p class="set-p">Режим за замовчуванням визначається автоматично за шириною екрана.</p>
  <div class="lbl2">Тема</div><div class="skins" style="margin-bottom:14px">${SKINS.map(([k,n])=>`<button class="skin-btn" data-skin="${k}" aria-pressed="${skin===k}"><span class="swatch ${k}"></span>${n}</button>`).join('')}</div>
  <div class="lbl2">Режим</div><div class="seg" role="group" aria-label="Режим"><button data-mode="auto" aria-pressed="${mp==='auto'}">Авто</button><button data-mode="phone" aria-pressed="${mp==='phone'}">Телефон</button><button data-mode="desktop" aria-pressed="${mp==='desktop'}">Комп’ютер</button></div></div>
 <div class="card"><h2 class="set-h">Дані</h2>
  <p class="set-p">Копія зберігає все: дні, записи, клієнтів, витрати, виплати, послуги. Корисно робити раз на місяць.</p>
  <div class="btnrow"><button class="btn sm" id="exJson">Копія (JSON)</button><button class="btn sm" id="exCsv">Таблиця (CSV)</button><button class="btn sm" id="imBtn">Імпорт з файлу</button><button class="btn sm" id="manDay">Внести день сумою</button></div></div>
 <div class="card" style="grid-column:1/-1"><h2 class="set-h">Правила бази для працівників</h2>
  <p class="set-p">Щоб права працівників діяли на рівні бази (а не лише на сайті), один раз вставте ці правила: Firebase → Firestore Database → Rules → замініть увесь текст → Publish. Замість <b>UID_ДРУГОГО_ВЛАСНИКА</b> вставте UID Оксани з Authentication → Users (без пробілів). Ваш UID уже підставлено.</p>
  <textarea class="rules" id="rulesBox" readonly rows="8">${esc(rulesText())}</textarea>
  <div class="btnrow" style="margin-top:8px"><button class="btn sm" id="copyRules">Копіювати правила</button></div></div>
 <div class="card"><h2 class="set-h">Акаунт</h2>
  <div class="who">Ви увійшли як <b>${esc(state.user?state.user.email:'')}</b></div>
  <button class="btn sm" id="logout">Вийти</button><div class="ver">MAGNiFICA · v3</div></div>
 </div>`;
}

/* ---------- працівник ---------- */
function openStaff(id){
 if(!isOwner())return;
 const ex=id?state.staff.find(s=>s.id===id):null;
 const s=ex?JSON.parse(JSON.stringify(ex)):{id:'',name:'',role:'',master:true,active:true,perms:{...Object.fromEntries(PERM_PRESETS.master.perms.map(k=>[k,true]))},pay:null,created:Date.now()};
 if(!s.perms)s.perms={};
 const pay=s.pay||{freq:'',amount:0,start:todayKey()};
 const hasLogin=!!(ex&&ex.uid);
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?'Працівник':'Новий працівник'}</h2>${closeBtn}</div>
  <label class="lf"><span>Ім’я</span><input id="st-name" value="${esc(s.name)}" maxlength="60" autocomplete="off"></label>
  <label class="lf"><span>Посада</span><input id="st-role" value="${esc(s.role||'')}" placeholder="майстер манікюру, адміністратор…" maxlength="60" autocomplete="off"></label>
  <label class="chk"><input type="checkbox" id="st-master" ${s.master?'checked':''}> Майстер: приймає клієнтів (з’являється у виборі в записі)</label>
  <div class="lbl2" style="margin-top:12px">Вхід на сайт</div>
  ${hasLogin?`<div class="note">Пошта для входу: <b>${esc(ex.email)}</b>.<br><button class="btn sm" id="st-reset" type="button" style="margin-top:8px">Надіслати лист для зміни пароля</button></div>
   <label class="chk"><input type="checkbox" id="st-active" ${s.active!==false?'checked':''}> Доступ активний</label>`
  :`<label class="chk"><input type="checkbox" id="st-login"> Дати доступ до сайту</label>
   <div id="st-lbox" hidden><label class="lf"><span>Пошта</span><input id="st-email" type="email" inputmode="email" autocapitalize="off" autocomplete="off"></label>
   <label class="lf"><span>Пароль (мінімум 6 символів)</span><input id="st-pass" type="text" autocomplete="off" autocapitalize="off"></label>
   <div class="hint" style="margin:-4px 0 8px">Передайте працівнику пошту й пароль. Правила бази потрібно оновити один раз (блок нижче в налаштуваннях).</div></div>`}
  <div id="st-pbox" ${hasLogin||false?'':'hidden'}>
   <div class="lbl2" style="margin-top:12px">Права доступу</div>
   <div class="btnrow" style="margin-bottom:8px">${Object.entries(PERM_PRESETS).map(([k,v])=>`<button class="btn sm" type="button" data-preset="${k}">${v.label}</button>`).join('')}</div>
   ${PERM_DEFS.map(([g,items])=>`<div class="pgrp"><b>${g}</b>${items.map(([k,l])=>`<label class="chk"><input type="checkbox" data-p="${k}" ${s.perms[k]?'checked':''}> ${l}</label>`).join('')}</div>`).join('')}
  </div>
  <div class="lbl2" style="margin-top:12px">Зарплата</div>
  <div class="fgrid" style="grid-template-columns:1fr 1fr 1fr"><label class="lf"><span>Виплата</span><select id="st-freq"><option value="">не задано</option><option value="day" ${pay.freq==='day'?'selected':''}>щодня</option><option value="week" ${pay.freq==='week'?'selected':''}>щотижня</option><option value="month" ${pay.freq==='month'?'selected':''}>щомісяця</option></select></label>
   <label class="lf"><span>Сума, ₴</span><input id="st-pay" inputmode="numeric" value="${pay.amount||''}" placeholder="0"></label>
   <label class="lf"><span>Рахувати з</span><input id="st-start" type="date" value="${esc(pay.start||todayKey())}"></label></div>
  <div class="err" id="st-err" role="alert" hidden></div>
  <div class="actions">${ex?'<button class="btn danger" id="st-del">Видалити</button>':''}<button class="btn primary" id="st-save">Зберегти</button></div>`);
 digitsOnly($('st-pay'));
 const err=m=>{const e=$('st-err');e.textContent=m;e.hidden=!m};
 const showP=()=>{$('st-pbox').hidden=!(hasLogin||($('st-login')&&$('st-login').checked))};
 if(!hasLogin){$('st-login').addEventListener('change',()=>{$('st-lbox').hidden=!$('st-login').checked;showP()})}
 showP();
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
  const set=new Set(PERM_PRESETS[b.dataset.preset].perms);
  document.querySelectorAll('[data-p]').forEach(i=>{i.checked=set.has(i.dataset.p)});
 }));
 if(hasLogin)$('st-reset').addEventListener('click',async()=>{
  try{await Store.resetPassword(ex.email);toast('Лист надіслано на '+ex.email)}catch(e){toast('Не вдалося надіслати лист')}
 });
 if(ex)arm($('st-del'),'Видалити',async()=>{
  await Store.deleteStaff(ex.id);
  await syncPeople(state.staff.filter(x=>x.id!==ex.id));
  closeSheet();toast('Працівника видалено'+(ex.uid?'. Доступ закрито; обліковий запис за потреби видаліть у Firebase → Authentication.':''));
 });
 $('st-save').addEventListener('click',async()=>{
  const name=$('st-name').value.trim();
  if(!name){err('Вкажіть ім’я.');return}
  const wantLogin=!hasLogin&&$('st-login')&&$('st-login').checked;
  let email='',pass='';
  if(wantLogin){
   email=$('st-email').value.trim();pass=$('st-pass').value;
   if(!/^\S+@\S+\.\S+$/.test(email)){err('Вкажіть правильну пошту.');return}
   if(pass.length<6){err('Пароль має бути не менше 6 символів.');return}
  }
  err('');
  const b=$('st-save');b.disabled=true;b.textContent='Зберігаю…';
  try{
   let uid=ex?ex.uid||'':'';
   let sid=ex?ex.id:'';
   if(wantLogin){uid=await Store.createUser(email,pass);sid=uid}
   if(!sid)sid=newId();
   const perms={};
   if(uid||hasLogin)document.querySelectorAll('[data-p]').forEach(i=>{if(i.checked)perms[i.dataset.p]=true});
   const freq=$('st-freq').value,amount=numOf($('st-pay').value);
   const obj={id:sid,name,role:$('st-role').value.trim(),master:$('st-master').checked,
    active:hasLogin?$('st-active').checked:true,uid,email:hasLogin?ex.email:email,perms,
    pay:freq&&amount>0?{freq,amount,start:$('st-start').value||todayKey()}:null,created:ex?ex.created:Date.now()};
   await Store.saveStaff(obj.id,obj);
   const next=state.staff.filter(x=>x.id!==obj.id).concat([obj]);
   await syncPeople(next);
   closeSheet();toast(wantLogin?'Працівника створено. Передайте пошту й пароль.':'Збережено');
  }catch(e){
   const c=e&&e.code||'';
   err(c==='auth/email-already-in-use'?'Ця пошта вже зареєстрована.':c==='auth/weak-password'?'Занадто простий пароль.':c==='auth/invalid-email'?'Некоректна пошта.':c==='auth/operation-not-allowed'?'Вхід за поштою вимкнено у Firebase.':errText(e));
   b.disabled=false;b.textContent='Зберегти';
  }
 });
}

/* ---------- сума за день вручну (старий формат) ---------- */
function openDay(key){
 if(state.status!=='ready'||!isOwner())return;
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
 document.querySelectorAll('#rows input').forEach(el=>{digitsOnly(el);el.addEventListener('input',upd)});
 const err=m=>{const e=$('f-err');e.textContent=m;e.hidden=!m};
 const load=k=>{
  const v=state.days.get(k),ex=!!v;
  svs.forEach(s=>{const a=ex&&v.a&&v.a[s.id],c=ex&&v.c&&v.c[s.id];$('a-'+s.id).value=a?String(a):'';$('c-'+s.id).value=c?String(c):''});
  $('dayNote').hidden=!ex;$('f-del').hidden=!ex;err('');upd();
 };
 $('f-date').value=key||todayKey();load($('f-date').value);
 $('f-date').addEventListener('change',()=>{const k=$('f-date').value;if(isDate(k))load(k)});
 arm($('f-del'),'Видалити день',async()=>{await Store.deleteDay($('f-date').value);closeSheet();toast('День видалено')});
 $('f-save').addEventListener('click',async()=>{
  const k=$('f-date').value;
  if(!isDate(k)){err('Оберіть дату.');return}
  const a={},c={};
  svs.forEach(s=>{const x=numOf($('a-'+s.id).value),n=numOf($('c-'+s.id).value);if(x>0)a[s.id]=x;if(n>0)c[s.id]=n});
  if(!Object.keys(a).length){err('Вкажіть суму хоча б для однієї послуги.');return}
  err('');const b=$('f-save');b.disabled=true;b.textContent='Зберігаю…';
  try{const r=await Store.saveDay(k,{d:k,a,c});closeSheet();savedToast(r,'Збережено · '+ddmm(k))}
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
 return{v:3,exported:new Date().toISOString(),days,baseline:{counts:state.baseline},appointments:state.appts,expenses:state.exps,clients:state.clients,salaries:state.sals,settings:{services:c.services,expCats:c.expCats,people:c.people}};
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
  if(dk.some(k=>!isDate(k)||!days[k]||typeof days[k].a!=='object'))throw new Error('format');
  const ap=(seed.appointments||[]).filter(a=>a&&a.id&&isDate(a.d)&&Array.isArray(a.items));
  const ex=(seed.expenses||[]).filter(x=>x&&x.id&&isDate(x.d)&&x.amount>0);
  const cl=(seed.clients||[]).filter(x=>x&&x.id&&x.name);
  const sl=(seed.salaries||[]).filter(x=>x&&x.id&&isDate(x.d)&&x.amount>0);
  if(!dk.length&&!ap.length&&!ex.length&&!cl.length&&!sl.length)throw new Error('format');
  toast('Імпортую…');
  const n=await Store.importSeed({days,baseline:seed.baseline,appts:ap,exps:ex,clients:cl,sals:sl,cfg:seed.settings});
  toast('Імпортовано записів: '+n);
 }catch(err){toast(err&&err.message==='format'?'Файл не схожий на копію даних':'Не вдалося імпортувати. Перевірте зв’язок')}
}

/* ---------- події налаштувань ---------- */
function initSettings(){
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
  if(t.closest('#addStaff')){openStaff();return}
  if((b=t.closest('[data-staff]'))){openStaff(b.dataset.staff);return}
  if((b=t.closest('.skin-btn'))){setSkin(b.dataset.skin);return}
  if((b=t.closest('.seg button[data-mode]'))){lsSet('magnifica-mode',b.dataset.mode);applyMode();renderSettings(true);return}
  if(t.closest('#exJson')){saveFile('magnifica-backup-'+todayKey()+'.json',JSON.stringify(backupObj()),'application/json');return}
  if(t.closest('#exCsv')){exportCsv();return}
  if(t.closest('#imBtn')){$('impFile').click();return}
  if(t.closest('#manDay')){openDay();return}
  if(t.closest('#copyRules')){
   const box=$('rulesBox');box.select();
   (navigator.clipboard?navigator.clipboard.writeText(box.value):Promise.reject()).then(()=>toast('Правила скопійовано')).catch(()=>{try{document.execCommand('copy');toast('Правила скопійовано')}catch(x){toast('Виділіть текст і скопіюйте вручну')}});
   return;
  }
  if(t.closest('#logout')){Store.signOut();return}
 });
 $('impFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f)importFile(f)});
}
