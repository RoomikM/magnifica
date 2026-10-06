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
 if(normalizeGroups&&state.cfg&&cfgServices().some(x=>!x.gid&&String(x.group||'').trim())){normalizeGroups().then(()=>renderSettings(true));return}
 const sv=cfgServices(),ct=cfgCats(),skin=document.documentElement.dataset.skin,mp=lsGet('magnifica-mode','auto');
 const stOrd=byStaffOrder(state.staff);
 const staffRows=stOrd.map((s,i)=>`<div class="strow"><button class="cl" data-staff="${esc(s.id)}"><span class="av">${esc(initials(s.name))}</span>
  <span class="cl-m"><span class="cl-n">${esc(s.name)}${s.active===false?' · вимкнено':''}</span><span class="cl-s">${esc(s.role||'без посади')}${s.owner?' · акаунт власника':s.email?' · '+esc(s.email):' · без входу на сайт'}</span></span>
  <span class="cl-b">${s.master?'<i class="bdg">Майстер</i>':''}${s.owner?'<i class="bdg vip">Власник</i>':s.uid?'<i class="bdg vip">Має доступ</i>':''}</span></button><span class="mv"><button type="button" data-mv="up:${esc(s.id)}" aria-label="Вище" ${i===0?'disabled':''}>▲</button><button type="button" data-mv="dn:${esc(s.id)}" aria-label="Нижче" ${i===stOrd.length-1?'disabled':''}>▼</button></span></div>`).join('');
 el.innerHTML=`<div class="set-grid">
 <div class="card"><h2 class="set-h">Послуги та ціни</h2>
  <p class="set-p">Послуги з однаковою групою (наприклад, «Манікюр» для комплексу, чистки, зняття лаку) показуються на Огляді одним банером. Час (хв) підставляється в запис і його можна змінити. Ціна підставляється автоматично при створенні запису. Зміна ціни діє лише на нові записи: у вже створених ціна залишається та, що була.</p>
  <div class="setrow hd"><span><i class="mb">Назва / група</i><i class="dk">Назва</i></span><span class="dk">Група</span><span class="dk">Час, хв</span><span>Ціна, ₴</span><span></span></div>
  ${sv.map(s=>`<div class="setrow" data-sid="${esc(s.id)}"><input class="nm" value="${esc(s.name)}" aria-label="Назва послуги" maxlength="40"><input class="pr" value="${s.price?s.price:''}" placeholder="0" inputmode="numeric" aria-label="Ціна: ${esc(s.name)}"><button class="rm" data-rm-svc="${esc(s.id)}" aria-label="Видалити послугу">✕</button><select class="grp" aria-label="Група: ${esc(s.name)}"><option value="">— без групи —</option>${grpOpts(s)}</select><input class="du" value="${s.dur?s.dur:''}" placeholder="хв" inputmode="numeric" aria-label="Тривалість, хв: ${esc(s.name)}"></div>`).join('')}
  <button class="btn sm" id="addSvc">+ Додати послугу</button>
  <div class="lbl2" style="margin-top:14px">Групи послуг</div>
  <p class="set-p" style="margin-top:0">Група об’єднує кілька послуг в один банер на Огляді. Створіть групу тут або під час додавання послуги.</p>
  ${cfgGroups().map(g=>`<div class="setrow cat" data-gid="${esc(g.id)}"><input class="nm" value="${esc(g.name)}" aria-label="Назва групи" maxlength="40"><span class="hint" style="margin:0">${sv.filter(x=>x.gid===g.id).length} посл.</span><button class="rm" data-rm-grp="${esc(g.id)}" aria-label="Видалити групу">✕</button></div>`).join('')||'<div class="hint" style="margin:0 0 6px">Груп ще немає.</div>'}
  <button class="btn sm" id="addGrp">+ Додати групу</button></div>
 <div class="card"><h2 class="set-h">Категорії витрат</h2>
  <p class="set-p">Оренда, матеріали, податки… Зарплата ведеться окремо у вкладці «Витрати → Зарплата». Видалення категорії не стирає вже внесені витрати. Щомісячна сума (необов’язково): точка беззбитковості бере її або фактичні витрати місяця, якщо вони більші. Усі витрати поточного місяця враховуються самі.</p>
  ${ct.map(c=>`<div class="setrow cat" data-cid="${esc(c.id)}"><input class="nm" value="${esc(c.name)}" aria-label="Назва категорії" maxlength="40"><input class="pr" data-famt="${esc(c.id)}" inputmode="numeric" placeholder="сума, ₴" aria-label="Щомісячна сума: ${esc(c.name)}" title="Щомісячна сума (необов’язково)" value="${c.amt>0?esc(c.amt):''}"><button class="rm" data-rm-cat="${esc(c.id)}" aria-label="Видалити категорію">✕</button></div>`).join('')}
  <button class="btn sm" id="addCat">+ Додати категорію</button></div>
 <div class="card" style="grid-column:1/-1"><h2 class="set-h">Працівники</h2>
  <p class="set-p">Тут ви створюєте майстрів і працівників, даєте їм вхід на сайт та визначаєте, які розділи вони бачать і що можуть робити. Майстри з’являються у виборі в записі.</p>
  ${staffRows||'<div class="hint" style="margin:0 0 10px">Працівників ще немає.</div>'}
  <button class="btn sm" id="addStaff">+ Додати працівника</button>${state.user&&!state.staff.some(x=>x.id===state.user.uid)?' <button class="btn sm" id="addSelf" title="Ви працюєте майстром під власним входом: новий акаунт не створюється">+ Я теж працюю майстром</button>':''}</div>
 ${extrasSettingsHtml()}
 <div class="card"><h2 class="set-h">Вигляд</h2>
  <p class="set-p">Режим за замовчуванням визначається автоматично за шириною екрана.</p>
  <div class="lbl2">Тема</div><div class="skins" style="margin-bottom:14px">${SKINS.map(([k,n])=>`<button class="skin-btn" data-skin="${k}" aria-pressed="${skin===k}"><span class="swatch ${k}"></span>${n}</button>`).join('')}</div>
  <div class="lbl2">Режим</div><div class="seg" role="group" aria-label="Режим"><button data-mode="auto" aria-pressed="${mp==='auto'}">Авто</button><button data-mode="phone" aria-pressed="${mp==='phone'}">Телефон</button><button data-mode="desktop" aria-pressed="${mp==='desktop'}">Комп’ютер</button></div>${installBlockHtml()}</div>
 ${reportCardHtml()}
 <div class="card"><h2 class="set-h">Зарплата за історію</h2>
  <p class="set-p">Одноразово: порахувати зарплату за минулі місяці як % від виручки по групах (манікюр, педикюр, мейк…) і записати її у витрати місяць за місяцем.</p>
  <button class="btn sm" id="histSal">Порахувати зарплату за історію</button></div>
 <div class="card"><h2 class="set-h">Дані</h2>
  <p class="set-p">Копія зберігає все: дні, записи, клієнтів, витрати, виплати, послуги. Корисно робити раз на місяць.</p>
  <div class="btnrow"><button class="btn sm" id="exJson">Копія (JSON)</button><button class="btn sm" id="exCsv">Таблиця (CSV)</button><button class="btn sm" id="imBtn">Імпорт з файлу</button><button class="btn sm" id="manDay">Внести день сумою</button><button class="btn sm" id="archBtn">Архів старих записів</button></div></div>
 <div class="card" style="grid-column:1/-1"><h2 class="set-h">Логи</h2>
  <p class="set-p">Усі дії користувачів сайту: хто, коли і що створив, змінив чи видалив, а також входи.</p>
  <div id="logBox"></div></div>
 <div class="card"><h2 class="set-h">Безпека</h2>
  <p class="set-p">Щоб майстри не зайшли у ваш акаунт на комп’ютері, коли вас немає. Працює лише в комп’ютерній версії сайту, телефон не чіпає.</p>
  <label class="lf"><span>Автовихід на цьому комп’ютері після бездіяльності</span><select id="autolo">${[[0,'Вимкнено'],[5,'5 хв'],[10,'10 хв'],[15,'15 хв'],[30,'30 хв'],[60,'1 година']].map(([v,n])=>`<option value="${v}" ${(+lsGet('magnifica-autolo','0')||0)===v?'selected':''}>${n}</option>`).join('')}</select></label>
  <div class="hint" style="margin:0 0 10px">Це налаштування окремо для кожного пристрою.</div>
  <button class="btn sm" id="kickAll">Вийти на всіх комп’ютерах</button>
  <div class="hint" id="kickMsg" style="margin:6px 0 0">Кнопка працює і з телефону: усі відкриті комп’ютерні сторінки розлогіняться (за кілька секунд, якщо є інтернет).</div></div>
 <div class="card"><h2 class="set-h">Акаунт</h2>
  <div class="who">Ви увійшли як <b>${esc(state.user?state.user.email:'')}</b></div>
  <button class="btn sm" id="logout">Вийти</button> <button class="btn sm" id="hardRefresh">Оновити застосунок</button><div class="ver" id="ver">MAGNiFICA · v5i</div></div>
 </div>`;
 applySetTab(el);
 renderLogs();
}

/* ---------- доступ працівника: логін, пароль, копіювання ---------- */
const FAKE_DOMAIN='@magnifica.app';
const loginToEmail=l=>{l=String(l).trim();return l.includes('@')?l:l.toLowerCase()+FAKE_DOMAIN};
const isRealEmail=e=>!!e&&!String(e).endsWith(FAKE_DOMAIN);
const loginOf=s=>isRealEmail(s.email)?s.email:String(s.email||'').replace(FAKE_DOMAIN,'');
function genPass(){
 const ch='abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=new Uint32Array(10);
 crypto.getRandomValues(a);return Array.from(a,x=>ch[x%ch.length]).join('');
}
const siteUrl=()=>location.href.split('#')[0].split('?')[0].replace(/[^/]*$/,'');
const accessText=s=>siteUrl()+'\nLogin: '+loginOf(s)+(s.pw?'\nPassw: '+s.pw:'');
function copyText(t,ok,fail){
 const done=()=>toast(ok);
 const old=()=>{try{const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const r=document.execCommand('copy');ta.remove();r?done():toast(fail||'Не вдалося скопіювати')}catch(e){toast(fail||'Не вдалося скопіювати')}};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,old);else old();
}
const copyAccess=s=>copyText(accessText(s),s.pw?'Доступ скопійовано':'Скопійовано без пароля (його не збережено)');

/* групи послуг */
const grpOpts=sv=>{
 const cur=grpOf(sv),gs=cfgGroups().slice();
 let h=gs.map(g=>`<option value="${esc(g.id)}" ${sv.gid===g.id?'selected':''}>${esc(g.name)}</option>`).join('');
 if(cur&&!gs.some(g=>sv.gid===g.id))h+=`<option value="" selected>${esc(cur.name)}</option>`;
 return h;
};
/* вкладки налаштувань: картки групуються за заголовком */
const SET_TABS=[['svc','Послуги',['Послуги та ціни']],['cat','Витрати',['Категорії витрат']],['staff','Працівники',['Працівники']],['msg','Повідомлення',['Повідомлення клієнтам']],['look','Вигляд',['Вигляд']],['sec','Безпека',['Безпека','Акаунт']],['data','Дані',['Звіт для рієлтора','Зарплата за історію','Дані','Логи']]];
function applySetTab(el){
 let cur=lsGet('magnifica-settab','svc');if(!SET_TABS.some(t=>t[0]===cur))cur='svc';
 const grid=el.querySelector('.set-grid');if(!grid)return;
 const tabOf=h=>{const t=SET_TABS.find(x=>x[2].includes(h));return t?t[0]:'svc'};
 [...grid.children].forEach(c=>{const h=c.querySelector('h2');c.dataset.stab=tabOf(h?h.textContent.trim():'');c.hidden=c.dataset.stab!==cur});
 const bar=document.createElement('div');bar.className='set-tabs';bar.setAttribute('role','tablist');
 bar.innerHTML=SET_TABS.map(t=>`<button type="button" role="tab" data-stab-btn="${t[0]}" aria-selected="${t[0]===cur}">${t[1]}</button>`).join('');
 el.insertBefore(bar,grid);
}
/* одноразово переносить назви груп, введені текстом, у список груп (ключі відсотків майстрів теж) */
async function normalizeGroups(){
 if(!isOwner()||!state.cfg||!Array.isArray(state.cfg.services))return;
 const c=cfgDoc(),legacy=c.services.filter(x=>!x.gid&&String(x.group||'').trim());
 if(!legacy.length)return;
 c.groups=c.groups||[];
 const map={};
 legacy.forEach(x=>{
  const nm=String(x.group).trim(),k=nm.toLowerCase();
  let g=c.groups.find(y=>y.name.toLowerCase()===k);
  if(!g){g={id:'g'+newId().slice(0,8),name:nm};c.groups.push(g)}
  x.gid=g.id;delete x.group;map['g:'+k]='g:'+g.id;
 });
 await saveCfg();
 for(const st of state.staff){
  if(!st.pcts)continue;let ch=false;
  Object.keys(map).forEach(o=>{if(st.pcts[o]!=null){st.pcts[map[o]]=st.pcts[o];delete st.pcts[o];ch=true}});
  if(ch)try{await Store.saveStaff(st.id,st)}catch(e){}
 }
}
function openNewService(){
 if(!isOwner())return;
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">Нова послуга</h2>${closeBtn}</div>
  <label class="lf"><span>Назва</span><input id="ns-name" maxlength="40" autocomplete="off" placeholder="напр. Комплекс"></label>
  <label class="lf"><span>Ціна, ₴</span><input id="ns-price" inputmode="numeric" placeholder="0"></label>
  <label class="lf"><span>Час на послугу, хв <small>(підставляється в запис)</small></span><input id="ns-dur" inputmode="numeric" maxlength="3" placeholder="напр. 90"></label>
  <label class="lf"><span>Група на Огляді</span><select id="ns-grp"><option value="">— без групи —</option>${cfgGroups().map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}<option value="__new">＋ Нова група…</option></select></label>
  <label class="lf" id="ns-newbox" hidden><span>Назва нової групи</span><input id="ns-newgrp" maxlength="40" autocomplete="off" placeholder="напр. Манікюр"></label>
  <div class="err" id="ns-err" role="alert" hidden></div>
  <div class="actions"><button class="btn primary" id="ns-save">Додати</button></div>`);
 digitsOnly($('ns-price'));digitsOnly($('ns-dur'));
 $('ns-grp').addEventListener('change',()=>{const n=$('ns-grp').value==='__new';$('ns-newbox').hidden=!n;if(n)$('ns-newgrp').focus()});
 $('ns-save').addEventListener('click',async()=>{
  const name=$('ns-name').value.trim(),err=m=>{const e=$('ns-err');e.textContent=m;e.hidden=!m};
  if(!name){err('Вкажіть назву послуги.');return}
  const c=cfgDoc();let gid=$('ns-grp').value;
  if(gid==='__new'){
   const gn=$('ns-newgrp').value.trim();if(!gn){err('Вкажіть назву групи.');return}
   c.groups=c.groups||[];
   let g=c.groups.find(x=>x.name.toLowerCase()===gn.toLowerCase());
   if(!g){g={id:'g'+newId().slice(0,8),name:gn};c.groups.push(g)}
   gid=g.id;
  }
  c.services.push({id:'s'+newId().slice(0,8),name,price:numOf($('ns-price').value),dur:Math.min(600,numOf($('ns-dur').value))||0,gid:gid||''});
  await saveCfg();closeSheet();renderAll();renderSettings(true);toast('Послугу додано');
 });
 setTimeout(()=>$('ns-name').focus(),50);
}
function openNewGroup(){
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">Нова група</h2>${closeBtn}</div>
  <label class="lf"><span>Назва групи</span><input id="ng-name" maxlength="40" autocomplete="off" placeholder="напр. Манікюр"></label>
  <div class="err" id="ng-err" role="alert" hidden></div>
  <div class="actions"><button class="btn primary" id="ng-save">Додати</button></div>`);
 $('ng-save').addEventListener('click',async()=>{
  const n=$('ng-name').value.trim(),e=$('ng-err');
  if(!n){e.textContent='Вкажіть назву.';e.hidden=false;return}
  const c=cfgDoc();c.groups=c.groups||[];
  if(!c.groups.some(x=>x.name.toLowerCase()===n.toLowerCase()))c.groups.push({id:'g'+newId().slice(0,8),name:n});
  await saveCfg();closeSheet();renderSettings(true);
 });
 setTimeout(()=>$('ng-name').focus(),50);
}

/* відсотки майстра за видами робіт */
function pctsHtml(st){
 const sv=svList().filter(x=>!x.archived),order=[],map={};
 sv.forEach(x=>{const k=grpKeyOfSv(x);if(!map[k]){map[k]={k,name:x.group||x.name,grp:k!==x.id,items:[]};order.push(k)}map[k].items.push(x)});
 if(!order.length)return '';
 const p=(st&&st.pcts)||{},val=k=>p[k]!=null&&p[k]!==''?esc(p[k]):'';
 const row=(k,name,ph,cls)=>`<label class="pctrow ${cls||''}"><span>${esc(name)}</span><input data-spct="${esc(k)}" inputmode="numeric" maxlength="3" placeholder="${ph}" value="${val(k)}"></label>`;
 const body=order.map(k=>{const g=map[k];
  if(!g.grp)return row(k,g.name,'загальний');
  return row(k,g.name+' · вся група','загальний','grp')+g.items.map(x=>row(x.id,x.name,'група','sub')).join('');
 }).join('');
 return `<details class="pcts"${hasCustomPcts(st)?' open':''}><summary>% за видами робіт (підставляється із загального)</summary>
  <div class="hint" style="margin:6px 0 8px">Коли вписуєте загальний %, він сам ставиться на всі роботи. Потім можна змінити % будь-якій роботі чи групі окремо. Можна поставити 0. Відсоток послуги сильніший за відсоток групи.</div>
  ${body}</details>`;
}
/* блоки робіт, закріплені за майстром */
function grpPickHtml(st){
 const sv=svList().filter(x=>!x.archived),seen=new Map();
 sv.forEach(x=>{const k=grpKeyOfSv(x);if(!seen.has(k))seen.set(k,x.group||x.name)});
 if(!seen.size)return '';
 const sel=new Set((st&&st.grps)||[]);
 return `<div class="lbl2" style="margin-top:12px">Закріплені блоки робіт</div>
  <div class="hint" style="margin:0 0 6px">Нічого не вибрано — у записі майстру доступні всі роботи. Вибрано один блок чи кілька — лише вони.</div>
  <div class="grppick">${[...seen.entries()].map(([k,n])=>`<label class="chk"><input type="checkbox" data-pg="${esc(k)}" ${sel.has(k)?'checked':''}> ${esc(n)}</label>`).join('')}</div>`;
}
const readGrps=()=>[...document.querySelectorAll('[data-pg]')].filter(i=>i.checked).map(i=>i.dataset.pg);
function readPcts(){
 const o={};
 document.querySelectorAll('[data-spct]').forEach(i=>{const v=i.value.replace(/\D/g,'');if(v!=='')o[i.dataset.spct]=Math.min(100,+v)});
 return o;
}
const bindPcts=gid=>{
 const all=()=>document.querySelectorAll('[data-spct]');
 all().forEach(i=>i.addEventListener('input',()=>{i.value=i.value.replace(/\D/g,'').slice(0,3)}));
 const g=$(gid);if(!g)return;
 let prev=g.value.replace(/\D/g,'');
 /* загальний % розмножується на всі види робіт; уже змінені вручну не чіпаємо */
 g.addEventListener('input',()=>{
  const v=g.value.replace(/\D/g,'').slice(0,3);
  all().forEach(i=>{if(i.value===''||i.value===prev)i.value=v});
  prev=v;
 });
};

/* ---------- працівник ---------- */
function openStaff(id){
 if(!isOwner())return;
 const ex=id?state.staff.find(s=>s.id===id):null;
 if(ex&&ex.owner){openSelf(ex);return}
 const s=ex?JSON.parse(JSON.stringify(ex)):{id:'',name:'',role:'',master:true,active:true,perms:{...Object.fromEntries(PERM_PRESETS.master.perms.map(k=>[k,true]))},pay:null,created:Date.now()};
 if(!s.perms)s.perms={};
 const pay=s.pay||{freq:'',amount:0,start:todayKey()},ap=s.autoPay||{};
 const hasLogin=!!(ex&&ex.uid);
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?'Працівник':'Новий працівник'}</h2>${closeBtn}</div>
  <label class="lf"><span>Ім’я</span><input id="st-name" value="${esc(s.name)}" maxlength="60" autocomplete="off"></label>
  <label class="lf"><span>Посада</span><input id="st-role" value="${esc(s.role||'')}" placeholder="майстер манікюру, адміністратор…" maxlength="60" autocomplete="off"></label>
  <label class="chk"><input type="checkbox" id="st-master" ${s.master?'checked':''}> Майстер: приймає клієнтів (з’являється у виборі в записі)</label>
  <div class="lbl2" style="margin-top:12px">Вхід на сайт</div>
  ${hasLogin?`<div class="note">Логін: <b>${esc(loginOf(ex))}</b>${ex.pw?`<br>Пароль: <b id="st-pwshow">••••••••</b> <button class="btn sm" id="st-pwtoggle" type="button">Показати</button>`:'<br>Пароль не збережено (акаунт створено раніше).'}<div class="btnrow" style="margin-top:8px"><button class="btn sm primary" id="st-copy" type="button">Скопіювати доступ</button><button class="btn sm" id="st-chpw" type="button">Змінити пароль</button></div>
   <div id="st-pwbox" hidden style="margin-top:10px">${ex.pw?'':'<label class="lf"><span>Поточний пароль працівника</span><input id="st-oldpw" autocomplete="off" autocapitalize="off" spellcheck="false"></label>'}
    <label class="lf"><span>Новий пароль (мінімум 6 символів)</span><div class="pwrow"><input id="st-newpw" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn sm" id="st-gen2" type="button">Згенерувати</button></div></label>
    <button class="btn sm primary" id="st-pwsave" type="button">Застосувати</button> <span class="hint" id="st-pwmsg" style="margin:0"></span></div></div>
   <label class="chk"><input type="checkbox" id="st-active" ${s.active!==false?'checked':''}> Доступ активний</label>`
  :`<label class="chk"><input type="checkbox" id="st-login"> Дати доступ до сайту</label>
   <div id="st-lbox" hidden><label class="lf"><span>Логін (імʼя або пошта)</span><input id="st-email" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="наприклад: ira або ira@gmail.com"></label>
   <label class="lf"><span>Пароль (мінімум 6 символів)</span><div class="pwrow"><input id="st-pass" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn sm" id="st-gen" type="button">Згенерувати</button></div></label>
   <div class="hint" style="margin:-4px 0 8px">Після збереження в картці працівника зʼявиться кнопка «Скопіювати доступ».</div></div>`}
  <div id="st-pbox" ${hasLogin||false?'':'hidden'}>
   <div class="lbl2" style="margin-top:12px">Права доступу</div>
   <div class="btnrow" style="margin-bottom:8px">${Object.entries(PERM_PRESETS).map(([k,v])=>`<button class="btn sm" type="button" data-preset="${k}">${v.label}</button>`).join('')}</div>
   ${PERM_DEFS.map(([g,items])=>`<div class="pgrp"><b>${g}</b>${items.map(([k,l])=>`<label class="chk"><input type="checkbox" data-p="${k}" ${s.perms[k]?'checked':''}> ${l}</label>`).join('')}</div>`).join('')}
  </div>
  <div class="lbl2" style="margin-top:12px">Зарплата</div>
  <div class="fgrid" style="grid-template-columns:1fr 1fr 1fr"><label class="lf"><span>Виплата</span><select id="st-freq"><option value="">не задано</option><option value="day" ${pay.freq==='day'?'selected':''}>щодня</option><option value="week" ${pay.freq==='week'?'selected':''}>щотижня</option><option value="month" ${pay.freq==='month'?'selected':''}>щомісяця</option></select></label>
   <label class="lf"><span>Сума, ₴</span><input id="st-pay" inputmode="numeric" value="${pay.amount||''}" placeholder="0"></label>
   <label class="lf"><span>Рахувати з</span><input id="st-start" type="date" value="${esc(pay.start||todayKey())}"></label></div>
  <label class="lf"><span>Загальний % від виручки майстра</span><input id="st-pct" inputmode="numeric" value="${s.pct||''}" placeholder="0"></label>
  ${pctsHtml(s)}
  ${grpPickHtml(s)}
  <div class="lbl2" style="margin-top:12px">Авто-виплата % (залишок за балансом)</div>
  <div class="fgrid" style="grid-template-columns:1fr 1fr"><label class="lf"><span>Як часто</span><select id="st-af"><option value="">вимкнено</option><option value="day" ${ap.freq==='day'?'selected':''}>щодня</option><option value="week" ${ap.freq==='week'?'selected':''}>щотижня</option><option value="month" ${ap.freq==='month'?'selected':''}>раз на місяць</option></select></label>
   <label class="lf" id="st-aw" hidden><span>День тижня</span><select id="st-adow">${['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map((n,i)=>`<option value="${i+1}" ${(+ap.dow||1)===i+1?'selected':''}>${n}</option>`).join('')}</select></label>
   <label class="lf" id="st-am" hidden><span>Число місяця</span><input id="st-adom" inputmode="numeric" maxlength="2" value="${ap.dom||1}"></label></div>
  <div class="hint" style="margin:-4px 0 8px">Коли ви відкриєте сайт у день виплати, система сама запише виплату всього залишку за записи до цієї дати. Сума в «Виплати» редагується. Сайт має бути відкритий хоч раз у той день або пізніше.</div>
  <label class="lf"><span>Рахувати баланс % з дати (необов’язково)</span><input id="st-bf" type="date" value="${esc(s.balFrom||'')}"></label>
  <div class="hint" style="margin:-4px 0 8px">Заробіток від % накопичується в кабінеті майстра, виплати його зменшують, залишок переноситься. Дата потрібна, щоб не враховувати старі записи.</div>
  <div class="err" id="st-err" role="alert" hidden></div>
  <div class="actions">${ex?'<button class="btn danger" id="st-del">Видалити</button>':''}<button class="btn primary" id="st-save">Зберегти</button></div>`);
 digitsOnly($('st-pay'));digitsOnly($('st-pct'));bindPcts('st-pct');digitsOnly($('st-adom'));
 const showAf=()=>{const v=$('st-af').value;$('st-aw').hidden=v!=='week';$('st-am').hidden=v!=='month'};$('st-af').addEventListener('change',showAf);showAf();
 const err=m=>{const e=$('st-err');e.textContent=m;e.hidden=!m};
 const showP=()=>{$('st-pbox').hidden=!(hasLogin||($('st-login')&&$('st-login').checked))};
 if(!hasLogin){$('st-login').addEventListener('change',()=>{$('st-lbox').hidden=!$('st-login').checked;showP()})}
 showP();
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
  const set=new Set(PERM_PRESETS[b.dataset.preset].perms);
  document.querySelectorAll('[data-p]').forEach(i=>{i.checked=set.has(i.dataset.p)});
 }));
 if(!hasLogin)$('st-gen').addEventListener('click',()=>{$('st-pass').value=genPass()});
 if(hasLogin){
  $('st-copy').addEventListener('click',()=>copyAccess(ex));
  if(ex.pw)$('st-pwtoggle').addEventListener('click',()=>{const sh=$('st-pwshow'),on=sh.dataset.on==='1';sh.dataset.on=on?'':'1';sh.textContent=on?'••••••••':ex.pw;$('st-pwtoggle').textContent=on?'Показати':'Сховати'});
 }

 if(hasLogin){
  $('st-chpw').addEventListener('click',()=>{$('st-pwbox').hidden=!$('st-pwbox').hidden});
  $('st-gen2').addEventListener('click',()=>{$('st-newpw').value=genPass()});
  $('st-pwsave').addEventListener('click',async()=>{
   const np=$('st-newpw').value,op=ex.pw||($('st-oldpw')&&$('st-oldpw').value)||'',msg=$('st-pwmsg'),b=$('st-pwsave');
   if(np.length<6){msg.textContent='Мінімум 6 символів.';return}
   if(!op){msg.textContent='Вкажіть поточний пароль.';return}
   b.disabled=true;msg.textContent='Змінюю…';
   try{
    await Store.changePassword(ex.email,op,np);
    const upd={...ex,pw:np};await Store.saveStaff(ex.id,upd);Object.assign(ex,upd);
    msg.textContent='';closeSheet();
    copyText(accessText(upd),'Пароль змінено. Новий доступ скопійовано.','Пароль змінено. Відкрийте картку й скопіюйте доступ.');
   }catch(e){
    const c=(e&&e.code)||'';
    msg.textContent=/wrong-password|invalid-credential/.test(c)?'Поточний пароль не збігається — працівник міг змінити його сам.':c==='auth/weak-password'?'Занадто простий пароль.':c==='auth/too-many-requests'?'Забагато спроб, зачекайте кілька хвилин.':'Не вдалося змінити пароль.';
    b.disabled=false;
   }
  });
 }
 if(ex)arm($('st-del'),'Видалити',async()=>{
  await Store.deleteStaff(ex.id);
  await syncPeople(state.staff.filter(x=>x.id!==ex.id));
  closeSheet();toast('Працівника видалено'+(ex.uid?'. Доступ закрито; обліковий запис за потреби видаліть у Firebase → Authentication.':''));
 });
 $('st-save').addEventListener('click',async()=>{
  const name=$('st-name').value.trim();
  if(!name){err('Вкажіть ім’я.');return}
  const wantLogin=!hasLogin&&$('st-login')&&$('st-login').checked;
  let email='',pass='',login='';
  if(wantLogin){
   login=$('st-email').value.trim();pass=$('st-pass').value;
   if(!/^[A-Za-z0-9._+@-]{3,60}$/.test(login)||(login.includes('@')&&!/^\S+@\S+\.\S+$/.test(login))){err('Логін: від 3 символів, латиницею, цифрами або . _ - (або повна пошта).');return}
   email=loginToEmail(login);
   if(pass.length<6){err('Пароль має бути не менше 6 символів.');return}
  }
  err('');
  const b=$('st-save');b.disabled=true;b.textContent='Зберігаю…';
  try{
   let uid=ex?ex.uid||'':'';
   let sid=ex?ex.id:'';
   if(wantLogin){uid=await Store.createUser(email,pass);sid=uid}
   const oldId=ex&&sid!==ex.id?ex.id:'';
   if(!sid)sid=newId();
   const perms={};
   if(uid||hasLogin)document.querySelectorAll('[data-p]').forEach(i=>{if(i.checked)perms[i.dataset.p]=true});
   const freq=$('st-freq').value,amount=numOf($('st-pay').value);
   const obj={id:sid,name,role:$('st-role').value.trim(),master:$('st-master').checked,
    active:hasLogin?$('st-active').checked:true,uid,email:hasLogin?ex.email:email,pw:hasLogin?(ex.pw||''):pass,perms,
    pct:Math.min(100,numOf($('st-pct').value)),pcts:readPcts(),grps:readGrps(),balFrom:$('st-bf').value||'',autoPay:$('st-af').value?{freq:$('st-af').value,dow:+$('st-adow').value||1,dom:Math.min(31,Math.max(1,numOf($('st-adom').value)||1)),since:(ex&&ex.autoPay&&ex.autoPay.freq?ex.autoPay.since:'')||todayKey()}:null,pay:freq&&amount>0?{freq,amount,start:$('st-start').value||todayKey()}:null,created:ex?ex.created:Date.now()};
   await Store.saveStaff(obj.id,obj);
   if(oldId){
    /* картка отримала логін → id став uid: переносимо записи й виплати, старий дубль видаляємо */
    for(const a of state.appts.filter(x=>x.m===oldId))await Store.saveAppt(a.id,{...a,m:sid});
    for(const x of state.sals.filter(x=>x.sid===oldId))await Store.saveSalary(x.id,{...x,sid});
    const so=(state.cfg&&state.cfg.staffOrder)||[];
    if(so.includes(oldId))cfgDoc().staffOrder=so.map(i=>i===oldId?sid:i);
    await Store.deleteStaff(oldId);
   }
   const next=state.staff.filter(x=>x.id!==obj.id&&x.id!==oldId).concat([obj]);
   await syncPeople(next);
   closeSheet();
   if(wantLogin){copyText(accessText(obj),'Працівника створено. Доступ скопійовано в буфер.','Працівника створено. Відкрийте картку й натисніть «Скопіювати доступ».')}
   else toast('Збережено');
  }catch(e){
   const c=e&&e.code||'';
   err(c==='auth/email-already-in-use'?'Цей логін уже зайнятий.':c==='auth/weak-password'?'Занадто простий пароль.':c==='auth/invalid-email'?'Некоректна пошта.':c==='auth/operation-not-allowed'?'Вхід за поштою вимкнено у Firebase.':errText(e));
   b.disabled=false;b.textContent='Зберегти';
  }
 });
}

/* ---------- власник теж працює майстром (під власним входом, без нового акаунта) ---------- */
function openSelf(ex){
 if(!isOwner()||!state.user)return;
 const uid=state.user.uid,nm0=ex?ex.name:String((state.user.email||'').split('@')[0]||'').replace(/^./,c=>c.toUpperCase());
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?'Мій профіль майстра':'Я теж майстер'}</h2>${closeBtn}</div>
  <div class="note">Це ваш власний вхід (${esc(state.user.email||'')}). Новий акаунт не створюється: ви лишаєтесь адміністратором з повним доступом, а в записах зʼявляєтесь у виборі майстра, і у вас є вкладка «Мій кабінет».</div>
  <label class="lf"><span>Ім’я в записах</span><input id="sf-name" value="${esc(nm0)}" maxlength="60" autocomplete="off"></label>
  <label class="lf"><span>Посада</span><input id="sf-role" value="${esc(ex?ex.role||'':'адміністратор')}" maxlength="60" autocomplete="off"></label>
  <label class="chk"><input type="checkbox" id="sf-master" ${!ex||ex.master?'checked':''}> Майстер: приймаю клієнтів</label>
  <label class="lf"><span>Загальний % від виручки</span><input id="sf-pct" inputmode="numeric" value="${ex&&ex.pct||''}" placeholder="0"></label>
  ${pctsHtml(ex)}
  ${grpPickHtml(ex)}
  <label class="lf"><span>Рахувати баланс % з дати (необов’язково)</span><input id="sf-bf" type="date" value="${esc(ex&&ex.balFrom||'')}"></label>
  <div class="err" id="sf-err" role="alert" hidden></div>
  <div class="actions">${ex?'<button class="btn danger" id="sf-del">Прибрати зі списку</button>':''}<button class="btn primary" id="sf-save">Зберегти</button></div>`);
 digitsOnly($('sf-pct'));bindPcts('sf-pct');
 const err=m=>{const e=$('sf-err');e.textContent=m;e.hidden=!m};
 if(ex)arm($('sf-del'),'Прибрати зі списку',async()=>{
  await Store.deleteStaff(uid);await syncPeople(state.staff.filter(x=>x.id!==uid));closeSheet();toast('Вас прибрано зі списку майстрів');
 });
 $('sf-save').addEventListener('click',async()=>{
  const name=$('sf-name').value.trim();if(!name){err('Вкажіть ім’я.');return}
  err('');const b=$('sf-save');b.disabled=true;b.textContent='Зберігаю…';
  try{
   const obj={id:uid,name,role:$('sf-role').value.trim(),master:$('sf-master').checked,active:true,owner:true,uid:'',email:'',pw:'',perms:{},
    pct:Math.min(100,numOf($('sf-pct').value)),pcts:readPcts(),grps:readGrps(),balFrom:$('sf-bf').value||'',pay:null,created:ex?ex.created:Date.now()};
   await Store.saveStaff(uid,obj);
   await syncPeople(state.staff.filter(x=>x.id!==uid).concat([obj]));
   closeSheet();toast('Збережено');
  }catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
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
  if(e.target.id==='autolo'){lsSet('magnifica-autolo',e.target.value);toast('Збережено');return}
  const row=e.target.closest('.setrow');if(!row||e.target.matches('[data-fixed],[data-famt]'))return;
  const c=cfgDoc();
  if(row.dataset.sid){
   const s=c.services.find(x=>x.id===row.dataset.sid);if(!s)return;
   if(e.target.classList.contains('nm')){const v=e.target.value.trim();if(!v){e.target.value=s.name;return}s.name=v}
   else if(e.target.classList.contains('grp')){s.gid=e.target.value;delete s.group}
   else if(e.target.classList.contains('du')){s.dur=Math.min(600,numOf(e.target.value))||0;e.target.value=s.dur?String(s.dur):''}
   else{s.price=numOf(e.target.value);e.target.value=s.price?String(s.price):''}
   saveCfg().then(()=>toast('Збережено'));
  }else if(row.dataset.gid){
   const g=(c.groups||[]).find(x=>x.id===row.dataset.gid);if(!g)return;
   const v=e.target.value.trim();if(!v){e.target.value=g.name;return}
   g.name=v;saveCfg().then(()=>{toast('Збережено');renderAll()});return;
  }else if(row.dataset.cid){
   const k=c.expCats.find(x=>x.id===row.dataset.cid);if(!k)return;
   const v=e.target.value.trim();if(!v){e.target.value=k.name;return}
   k.name=v;saveCfg().then(()=>toast('Збережено'));
  }
 });
 sett.addEventListener('input',e=>{if(e.target.classList.contains('pr'))e.target.value=e.target.value.replace(/\D/g,'').slice(0,7);if(e.target.classList.contains('du'))e.target.value=e.target.value.replace(/\D/g,'').slice(0,3)});
 sett.addEventListener('click',e=>{
  const t=e.target;let b;
  if((b=t.closest('[data-stab-btn]'))){lsSet('magnifica-settab',b.dataset.stabBtn);sett.querySelectorAll('[data-stab-btn]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));sett.querySelectorAll('.set-grid>[data-stab]').forEach(c=>c.hidden=c.dataset.stab!==b.dataset.stabBtn);return}
  if((b=t.closest('.rm'))){
   if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='Видалити?';setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.textContent='✕'}},3500);return}
   const c=cfgDoc();
   if(b.dataset.rmSvc)c.services=c.services.filter(x=>x.id!==b.dataset.rmSvc);
   else if(b.dataset.rmGrp){c.groups=(c.groups||[]).filter(x=>x.id!==b.dataset.rmGrp);c.services.forEach(x=>{if(x.gid===b.dataset.rmGrp){x.gid='';delete x.group}})}
   else c.expCats=c.expCats.filter(x=>x.id!==b.dataset.rmCat);
   saveCfg();renderAll();renderSettings(true);return;
  }
  if(t.closest('#addSvc')){openNewService();return}
  if(t.closest('#addGrp')){openNewGroup();return}
  if(t.closest('#addCat')){cfgDoc().expCats.push({id:'c'+newId().slice(0,8),name:'Нова категорія'});saveCfg();renderSettings(true);const r=[...sett.querySelectorAll('.setrow[data-cid] .nm')].pop();if(r){r.focus();r.select()}return}
  if(t.closest('#addStaff')){openStaff();return}
  if(t.closest('#addSelf')){openSelf();return}
  if((b=t.closest('[data-mv]'))){
   const[dir,id]=b.dataset.mv.split(':'),ids=byStaffOrder(state.staff).map(s=>s.id),i=ids.indexOf(id),j=dir==='up'?i-1:i+1;
   if(i<0||j<0||j>=ids.length)return;
   [ids[i],ids[j]]=[ids[j],ids[i]];cfgDoc().staffOrder=ids;saveCfg();renderAll();renderSettings(true);return;
  }
  if((b=t.closest('[data-staff]'))){openStaff(b.dataset.staff);return}
  if((b=t.closest('.skin-btn'))){setSkin(b.dataset.skin);return}
  if((b=t.closest('.seg button[data-mode]'))){lsSet('magnifica-mode',b.dataset.mode);applyMode();renderSettings(true);return}
  if(t.closest('#exJson')){saveFile('magnifica-backup-'+todayKey()+'.json',JSON.stringify(backupObj()),'application/json');return}
  if(t.closest('#exCsv')){exportCsv();return}
  if(t.closest('#imBtn')){$('impFile').click();return}
  if(t.closest('#histSal')){openHistSalary();return}
  if(t.closest('#manDay')){openDay();return}
  if(t.closest('#hardRefresh')){(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}catch(e){}location.reload()})();return}
  if(t.closest('#kickAll2'))return;
  if(t.closest('#kickAll')){const c=cfgDoc();c.kick=Date.now();lsSet('magnifica-login-at',String(c.kick+1));saveCfg().then(()=>toast('Команда виходу надіслана'));return}
  if(t.closest('#logout')){Store.signOut();return}
 });
 $('impFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f)importFile(f)});
}
