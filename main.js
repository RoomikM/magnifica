'use strict';
/* Події, вхід, запуск. */

document.addEventListener('click',e=>{
  if(e.target.closest('#goGrp'))setTab('settings',true);
  const k=e.target.closest('#kickAll2');
  if(k){
   if(k.dataset.armed!=='1'){k.dataset.armed='1';k.textContent='Натисніть ще раз для виходу';setTimeout(()=>{if(k.isConnected){k.dataset.armed='';k.textContent='Вийти із всіх ПК'}},3500);return}
   const c=cfgDoc();c.kick=Date.now();lsSet('magnifica-login-at',String(c.kick+1));saveCfg().then(()=>toast('Команда виходу надіслана'));k.dataset.armed='';k.textContent='Вийти із всіх ПК';
  }
 });
document.querySelectorAll('#nav button,#gear').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab,true)));
$('fab').addEventListener('click',()=>{const f=fabInfo();if(f)f[1]()});
/* вікно закривається лише хрестиком або після «Зберегти»: випадковий тап повз картку чи Esc не губить введені дані */
$('sheet').addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeSheet()});
$('profit').addEventListener('click',e=>{
 let b=e.target.closest('[data-range]');
 if(b){state.ui.range=b.dataset.range;renderAll();return}
 b=e.target.closest('[data-pm]');
 if(b){
  const n=+b.dataset.pm,[y,m]=(state.ui.pmonth||todayKey().slice(0,7)).split('-').map(Number);
  if(!n)state.ui.pmonth=todayKey().slice(0,7);else{const dt=new Date(Date.UTC(y,m-1+n,1));state.ui.pmonth=dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)}
  renderAll();
 }
});

/* перемикання місяців свайпом по сторінці «Огляд» (режим «Місяць») */
{
 const ov=$('overview');let sx=0,sy=0,t0=0,ok=false;
 const shift=n=>{
  const[y,m]=(state.ui.pmonth||todayKey().slice(0,7)).split('-').map(Number),dt=new Date(Date.UTC(y,m-1+n,1));
  state.ui.pmonth=dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1);renderAll();
  ov.classList.remove('swl','swr');void ov.offsetWidth;ov.classList.add(n>0?'swl':'swr');
 };
 ov.addEventListener('touchstart',e=>{
  ok=state.ui.range==='month'&&e.touches.length===1&&!e.target.closest('input,select,textarea,.seg,[data-noswipe]');
  if(ok){sx=e.touches[0].clientX;sy=e.touches[0].clientY;t0=Date.now()}
 },{passive:true});
 ov.addEventListener('touchend',e=>{
  if(!ok)return;ok=false;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.6&&Date.now()-t0<900)shift(dx<0?1:-1);
 },{passive:true});
}
/* логотип → головна */
const goHome=()=>{const t=[...(isOwner()?[]:['cabinet']),'overview','records','clients','expenses'].find(canTab);if(t)setTab(t,true)};
$('brandHome').addEventListener('click',goHome);
$('brandHome').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();goHome()}});

/* ---------- порядок майстрів ---------- */
$('sheetPanel').addEventListener('click',e=>{const b=e.target.closest('[data-mo]');if(b&&!b.disabled)mordMove(b.dataset.mo)});
/* ---------- записи ---------- */
$('records').addEventListener('click',e=>{
 const u=state.ui,t=e.target;let b;
 if((b=t.closest('[data-v]'))){u.aview=b.dataset.v;lsSet('magnifica-aview',u.aview);renderRecords();return}
 if((b=t.closest('[data-f]'))){u.afilter=b.dataset.f;renderRecords();return}
 if(t.closest('[data-mord]')){mordSheet();return}
 if((b=t.closest('[data-mcw]'))){state.ui.mwide=!state.ui.mwide;renderRecords();return}
 if((b=t.closest('[data-nav]'))){
  const n=b.dataset.nav;
  if(n==='today')u.adate=todayKey();else u.adate=addDays(u.adate,(+n)*(u.aview==='week'?7:1));
  renderRecords();return;
 }
 if((b=t.closest('[data-d]'))){u.adate=b.dataset.d;u.aview='day';lsSet('magnifica-aview','day');renderRecords();return}
  if(t.closest('[data-wait]')){openWait();return}
 if((b=t.closest('[data-id]'))){const a=state.appts.find(x=>x.id===b.dataset.id);if(a)openAppt(a);return}
 const col=t.closest('.tl-col');
 if(col&&can('apptAdd')){
  const r=col.getBoundingClientRect(),hpx=+col.dataset.hpx,sh=+col.dataset.sh;
  const m=Math.min(23*60+30,sh*60+Math.round((e.clientY-r.top)/hpx*2)*30);
  openAppt({d:col.dataset.date,t:hhmm(Math.max(0,m)),...(col.dataset.m!=null?{m:col.dataset.m}:{})});
 }
});
$('records').addEventListener('input',e=>{if(e.target.id==='aq'){state.ui.aq=e.target.value;put('recBody',recBody())}});
$('records').addEventListener('change',e=>{if(e.target.matches('[data-mf]')){state.ui.mf=e.target.value;renderRecords()}});

/* ---------- клієнти ---------- */
$('clients').addEventListener('click',e=>{
 const t=e.target;let b;
 if((b=t.closest('[data-cs]'))){state.ui.csort=b.dataset.cs;renderClients();return}
 if((b=t.closest('[data-cf]'))){state.ui.cflt=b.dataset.cf;renderClients();return}
 if((b=t.closest('[data-cid]'))){openClient(b.dataset.cid,{msg:b.dataset.msg})}
});
$('clients').addEventListener('input',e=>{if(e.target.id==='cq'){state.ui.cq=e.target.value;put('clList',clientsListHtml())}});

/* ---------- витрати і зарплата ---------- */
$('expenses').addEventListener('click',e=>{
 const t=e.target;let b;
 if((b=t.closest('[data-sub]'))){state.ui.exsub=b.dataset.sub;renderAll();return}
 if((b=t.closest('[data-em]'))){
  const n=+b.dataset.em,[y,m]=state.ui.emonth.split('-').map(Number);
  if(!n)state.ui.emonth=todayKey().slice(0,7);else{const dt=new Date(Date.UTC(y,m-1+n,1));state.ui.emonth=dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)}
  renderAll();return;
 }
 if((b=t.closest('[data-pay]'))){openSalary({sid:b.dataset.pay});return}
 if((b=t.closest('[data-sid-pay]'))){const x=state.sals.find(z=>z.id===b.dataset.sidPay);if(x)openSalary(x);return}
 if((b=t.closest('.exrow[data-id]'))){const x=state.exps.find(z=>z.id===b.dataset.id);if(x)openExp(x)}
});

/* ---------- по днях ---------- */
function rowOpen(e){
 const tr=e.target.closest('tr.edit');
 if(!tr||(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' '))return;
 e.preventDefault();
 const k=tr.dataset.key;
 if(state.days.has(k)&&isOwner())openDay(k);
 else if(canTab('records')){state.ui.adate=k;state.ui.aview='day';setTab('records',true);renderRecords()}
}
$('dailyTable').addEventListener('click',rowOpen);
$('dailyTable').addEventListener('keydown',rowOpen);

initSettings();initLogs();initExtras();installLogging();
$('impFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f)importFile(f)});

/* ---------- вхід ---------- */
function authErr(e){
 const c=(e&&e.code)||'';
 if(/invalid-credential|wrong-password|user-not-found|invalid-email|missing-password/.test(c))return'Невірний логін або пароль.';
 if(c==='auth/too-many-requests')return'Забагато спроб. Зачекайте кілька хвилин.';
 if(c==='auth/network-request-failed')return'Немає зв’язку з інтернетом.';
 if(c==='auth/operation-not-allowed')return'Вхід за паролем вимкнено у Firebase.';
 return'Не вдалося увійти. Спробуйте ще раз.';
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const b=$('l-btn'),er=$('l-err');
 er.hidden=true;b.disabled=true;b.textContent='Входжу…';
 try{await Store.signIn(loginToEmail($('l-email').value),$('l-pass').value)}
 catch(err){er.textContent=authErr(err);er.hidden=false}
 b.disabled=false;b.textContent='Увійти';
});
{const bc=$('brandHome').cloneNode(true);bc.removeAttribute('id');bc.removeAttribute('role');bc.removeAttribute('tabindex');bc.style.cursor='default';$('loginBrand').appendChild(bc)}
$('installLogin').addEventListener('click',doInstall);drawInstall();
$('installHint').hidden=true;

/* ---------- маячок про нові записи ---------- */
const seenAppts=new Set(),mineAppts=new Set();let apptsInit=false;
state.newAppts=0;
function drawBadge(){
 const b=document.querySelector('#nav [data-tab="records"]');if(!b)return;
 let i=b.querySelector('.nb');
 if(!state.newAppts){if(i)i.remove()}else{if(!i){i=document.createElement('i');i.className='nb';b.appendChild(i)}i.textContent=state.newAppts>9?'9+':state.newAppts}
 document.title=(state.newAppts?'('+state.newAppts+') ':'')+'MAGNiFICA';
}
const seenKey=()=>'magnifica-seenat-'+myUid();
function markSeen(){if(!myUid())return;try{localStorage.setItem(seenKey(),String(Date.now()))}catch(e){}}
function trackNew(list){
 const fresh=list.filter(a=>!seenAppts.has(a.id));
 list.forEach(a=>seenAppts.add(a.id));
 const first=!apptsInit;apptsInit=true;
 const me=myUid();
 if(me){
  let sa=+lsGet(seenKey(),0);
  if(!sa){markSeen();sa=Date.now()}
  /* непрочитані = чужі записи, створені після останнього відкриття вкладки «Записи» (переживає оновлення сторінки) */
  const un=list.filter(a=>a.by&&a.by!==me&&(+a.created||0)>sa&&isOk(a)).length;
  if(state.tab==='records'&&!document.hidden){if(un)markSeen();state.newAppts=0}else state.newAppts=un;
  drawBadge();
 }
 if(first)return;
 const add=fresh.filter(a=>!mineAppts.has(a.id)&&a.by!==me&&(+a.created||0)>Date.now()-12*3600*1000);
 if(!add.length)return;
 const a=add[add.length-1];
 toast('Новий запис: '+(a.name||'без імені')+' · '+full(a.d).slice(0,5)+' '+a.t+(a.mn?' · '+a.mn:''));
 try{if(navigator.vibrate)navigator.vibrate(120)}catch(e){}
}
{const o=Store.saveAppt;if(o)Store.saveAppt=function(id,d){mineAppts.add(id);if(d&&typeof d==='object'&&!d.by&&myUid())d.by=myUid();return o.apply(Store,arguments)}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.tab==='records'){markSeen();if(state.newAppts){state.newAppts=0;drawBadge()}}});

/* ---------- запуск ---------- */
function setView(v){document.documentElement.setAttribute('data-view',v)}
function resetData(){
 state.days=new Map();state.baseline={};state.appts=[];state.wait=[];state.exps=[];state.sals=[];state.salsOk=false;state.clients=[];state.staff=[];state.cfg=null;
 state.newAppts=0;seenAppts.clear();apptsInit=false;drawBadge();state.me=null;state.role='owner';state.perms={};state.apptsLoaded=false;state.clientsLoaded=false;state.migrated=false;
}
document.addEventListener('click',e=>{const b=e.target.closest('.skin-dot');if(b)setSkin(b.dataset.skin)});
setSkin(document.documentElement.getAttribute('data-skin')||'night');
setNavH();addEventListener('resize',()=>{applyMode();setNavH()});
setTab('overview');
addEventListener('error',e=>{
 if(state.status==='loading'){state.status='error';state.errMsg=String(e.message||e);renderAll()}
});
(function(){
 if(!(window.Store&&Store.configured)){setView('config');return}
 if(!Store.subscribeMe){
  // у кеші лишився старий store.js: скидаємо кеш і перезавантажуємо один раз
  if(!sessionStorage.getItem('mg-fix')){
   sessionStorage.setItem('mg-fix','1');
   Promise.all([navigator.serviceWorker?navigator.serviceWorker.getRegistrations().then(r=>Promise.all(r.map(x=>x.unregister()))):0,window.caches?caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))):0]).then(()=>location.reload());
   return;
  }
 }
 setTimeout(()=>{if(state.status==='loading'){state.status='error';state.errMsg='час очікування вичерпано';renderAll()}},20000);
 let unsubData=null,unsubMe=null,sig='';
 const stopData=()=>{if(unsubData){unsubData();unsubData=null}};
 const ready=()=>{if(state.status!=='ready'){state.status='ready'}renderAll()};
 const upd=k=>v=>{if(k==='appts')v=stripPhones('a',v);else if(k==='clients')v=stripPhones('c',v);else if(k==='wait')v=stripPhones('w',v);state[k]=v;if(k==='appts')state.apptsLoaded=true;if(k==='clients')state.clientsLoaded=true;if(state.status==='ready')renderAll();if(k==='appts'||k==='clients')migrateClients()};
 function startData(me,uid){
  const staff=!!me&&!me.owner;
  state.me=me&&me.link?{...me,id:me.link}:me;state.role=staff?'staff':'owner';state.perms=staff?(me.perms||{}):{};
  stopData();
  if(staff&&me.active===false){state.status='denied';renderAll();return}
  const stats=can('stats');
  if(!can('apptView')&&!can('stats')&&!can('apptOwn'))state.apptsLoaded=true;
  if(!(can('clientsView')||can('apptAdd')||can('apptEdit')))state.clientsLoaded=true;
  unsubData=Store.subscribe({
   days:m=>{state.days=m;ready()},
   baseline:b=>{state.baseline=b;if(state.status==='ready')renderAll()},
   appts:l=>{trackNew(l);upd('appts')(l)},wait:upd('wait'),exps:upd('exps'),sals:l=>{state.salsOk=true;upd('sals')(l)},clients:upd('clients'),staff:l=>upd('staff')(l.filter(x=>!x.link)),
   cfg:c=>{state.cfg=c;if(checkKick())return;if(state.status==='ready')renderAll()},
   error:code=>{state.status=code==='permission-denied'?'denied':'error';renderAll()}
  },{perms:staff?state.perms:null,uid,mid:me&&me.link||uid});
  if(staff&&!stats){state.status='ready';renderAll()}
  logLogin();autoPrune();
 }
 /* автовихід на комп'ютері: бездіяльність + віддалений вихід з телефону (meta/settings.kick) */
 const doLock=()=>{lsSet('magnifica-lo-uid','');Store.signOut()};
 function checkKick(){
  if(isMobile()||!state.user)return false;
  const k=+(state.cfg&&state.cfg.kick)||0,at=+lsGet('magnifica-login-at','0')||0;
  if(k&&k>at){doLock();return true}
  return false;
 }
 let lastAct=Date.now();
 ['mousemove','keydown','mousedown','scroll','touchstart','wheel'].forEach(ev=>document.addEventListener(ev,()=>{lastAct=Date.now()},{passive:true,capture:true}));
 const idleCheck=()=>{
  const m=+lsGet('magnifica-autolo','0')||0;
  if(m>0&&state.user&&!isMobile()&&Date.now()-lastAct>m*60000)doLock();
 };
 setInterval(idleCheck,15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)idleCheck()});
 Store.onAuth(user=>{
  stopData();if(unsubMe){unsubMe();unsubMe=null}sig='';
  resetData();state.user=user;lastAct=Date.now();
  if(user&&lsGet('magnifica-lo-uid','')!==user.uid){lsSet('magnifica-lo-uid',user.uid);lsSet('magnifica-login-at',String(Date.now()))}
  if(!user){lsSet('magnifica-lo-uid','');state.status='loading';setView('login');return}
  state.status='loading';setView('app');renderAll();
  unsubMe=Store.subscribeMe(user.uid,me=>{
   if(me&&me.owner&&sig==='own'){state.me=me;if(state.status==='ready')renderAll();return}
   const s=me&&me.owner?'own':JSON.stringify(me?[me.active,me.perms]:null);
   if(s===sig)return;sig=s;
   if(me){const staff0=state.staff;resetData();state.staff=staff0}
   startData(me,user.uid);
  },code=>{
   // немає прав читати власний профіль працівника → це власник зі старими правилами; справжню відмову покаже перевірка днів
   if(code==='permission-denied'){if(sig!=='null'){sig='null';startData(null,user.uid)}}
   else{state.status='error';renderAll()}
  });
 });
 // записи, що «відбулися» з часом, мають потрапляти в статистику без перезавантаження
 setInterval(()=>{if(state.status==='ready'&&$('sheet').hidden&&document.activeElement.tagName!=='INPUT')renderAll()},60000);
})();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
