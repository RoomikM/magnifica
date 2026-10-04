'use strict';
/* Події, вхід, запуск. */

document.querySelectorAll('#nav button,#gear').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab,true)));
$('fab').addEventListener('click',()=>{const f=fabInfo();if(f)f[1]()});
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet')||e.target.closest('[data-close]'))closeSheet()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('sheet').hidden)closeSheet()});
$('profit').addEventListener('click',e=>{const b=e.target.closest('[data-range]');if(b){state.ui.range=b.dataset.range;renderAll()}});

/* логотип → головна */
const goHome=()=>{const t=['overview','records','clients','expenses'].find(canTab);if(t)setTab(t,true)};
$('brandHome').addEventListener('click',goHome);
$('brandHome').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();goHome()}});

/* ---------- записи ---------- */
$('records').addEventListener('click',e=>{
 const u=state.ui,t=e.target;let b;
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
 if(col&&can('apptAdd')){
  const r=col.getBoundingClientRect(),hpx=+col.dataset.hpx,sh=+col.dataset.sh;
  const m=Math.min(23*60+30,sh*60+Math.round((e.clientY-r.top)/hpx*2)*30);
  openAppt({d:col.dataset.date,t:hhmm(Math.max(0,m))});
 }
});
$('records').addEventListener('input',e=>{if(e.target.id==='aq'){state.ui.aq=e.target.value;put('recBody',recBody())}});
$('records').addEventListener('change',e=>{if(e.target.matches('[data-mf]')){state.ui.mf=e.target.value;renderRecords()}});

/* ---------- клієнти ---------- */
$('clients').addEventListener('click',e=>{
 const t=e.target;let b;
 if((b=t.closest('[data-cs]'))){state.ui.csort=b.dataset.cs;renderClients();return}
 if((b=t.closest('[data-cf]'))){state.ui.cflt=b.dataset.cf;renderClients();return}
 if((b=t.closest('[data-cid]'))){openClient(b.dataset.cid)}
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

initSettings();initLogs();installLogging();
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
$('installHint').hidden=!(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!navigator.standalone);

/* ---------- маячок про нові записи ---------- */
const seenAppts=new Set(),mineAppts=new Set();let apptsInit=false;
state.newAppts=0;
function drawBadge(){
 const b=document.querySelector('#nav [data-tab="records"]');if(!b)return;
 let i=b.querySelector('.nb');
 if(!state.newAppts){if(i)i.remove()}else{if(!i){i=document.createElement('i');i.className='nb';b.appendChild(i)}i.textContent=state.newAppts>9?'9+':state.newAppts}
 document.title=(state.newAppts?'('+state.newAppts+') ':'')+'MAGNiFICA';
}
function trackNew(list){
 const fresh=list.filter(a=>!seenAppts.has(a.id));
 list.forEach(a=>seenAppts.add(a.id));
 if(!apptsInit){apptsInit=true;return}
 const add=fresh.filter(a=>!mineAppts.has(a.id)&&(+a.created||0)>Date.now()-12*3600*1000);
 if(!add.length)return;
 if(state.tab!=='records'||document.hidden){state.newAppts+=add.length;drawBadge()}
 const a=add[add.length-1];
 toast('Новий запис: '+(a.name||'без імені')+' · '+full(a.d).slice(0,5)+' '+a.t+(a.mn?' · '+a.mn:''));
 try{if(navigator.vibrate)navigator.vibrate(120)}catch(e){}
}
{const o=Store.saveAppt;if(o)Store.saveAppt=function(id){mineAppts.add(id);return o.apply(Store,arguments)}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.tab==='records'&&state.newAppts){state.newAppts=0;drawBadge()}});

/* ---------- запуск ---------- */
function setView(v){document.documentElement.setAttribute('data-view',v)}
function resetData(){
 state.days=new Map();state.baseline={};state.appts=[];state.exps=[];state.sals=[];state.clients=[];state.staff=[];state.cfg=null;
 state.newAppts=0;seenAppts.clear();apptsInit=false;drawBadge();state.me=null;state.role='owner';state.perms={};state.apptsLoaded=false;state.clientsLoaded=false;state.migrated=false;
}
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
 const upd=k=>v=>{state[k]=v;if(k==='appts')state.apptsLoaded=true;if(k==='clients')state.clientsLoaded=true;if(state.status==='ready')renderAll();if(k==='appts'||k==='clients')migrateClients()};
 function startData(me,uid){
  const staff=!!me;
  state.me=me;state.role=staff?'staff':'owner';state.perms=staff?(me.perms||{}):{};
  stopData();
  if(staff&&me.active===false){state.status='denied';renderAll();return}
  const stats=can('stats');
  if(!can('apptView')&&!can('stats')&&!can('apptOwn'))state.apptsLoaded=true;
  if(!(can('clientsView')||can('apptAdd')||can('apptEdit')))state.clientsLoaded=true;
  unsubData=Store.subscribe({
   days:m=>{state.days=m;ready()},
   baseline:b=>{state.baseline=b;if(state.status==='ready')renderAll()},
   appts:l=>{trackNew(l);upd('appts')(l)},exps:upd('exps'),sals:upd('sals'),clients:upd('clients'),staff:upd('staff'),
   cfg:c=>{state.cfg=c;if(state.status==='ready')renderAll()},
   error:code=>{state.status=code==='permission-denied'?'denied':'error';renderAll()}
  },{perms:staff?state.perms:null,uid});
  if(staff&&!stats){state.status='ready';renderAll()}
  logLogin();
 }
 Store.onAuth(user=>{
  stopData();if(unsubMe){unsubMe();unsubMe=null}sig='';
  resetData();state.user=user;
  if(!user){state.status='loading';setView('login');return}
  state.status='loading';setView('app');renderAll();
  unsubMe=Store.subscribeMe(user.uid,me=>{
   const s=JSON.stringify(me?[me.active,me.perms]:null);
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
