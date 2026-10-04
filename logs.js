'use strict';
/* Журнал дій: хто, коли і що зробив. Пишеться автоматично при кожній зміні даних; читає лише власник. */

const ST_TXT={ok:'активний',cancel:'скасовано',noshow:'не прийшов'};
const byId=(list,id)=>list.find(x=>x.id===id)||{};
const LOG_WRAPS={
 saveAppt:(id,d)=>{const o=state.appts.find(x=>x.id===id);
  const st=o?(o.st!==d.st?' · статус: '+ST_TXT[d.st||'ok']:''):(d.st&&d.st!=='ok'?' · '+ST_TXT[d.st]:'');
  return[o?'Змінено запис':'Створено запис',`${d.name||'без імені'} · ${full(d.d)} ${d.t} · ${money(d.total||0)}${d.mn?' · '+d.mn:''}${st}`]},
 deleteAppt:id=>{const o=byId(state.appts,id);return['Видалено запис',`${o.name||'без імені'}${o.d?' · '+full(o.d)+' '+o.t:''}`]},
 saveClient:(id,d)=>[state.clients.some(x=>x.id===id)?'Змінено клієнта':'Додано клієнта',d.name],
 deleteClient:id=>['Видалено клієнта',byId(state.clients,id).name||''],
 saveExp:(id,d)=>[state.exps.some(x=>x.id===id)?'Змінено витрату':'Додано витрату',`${catName(d)} · ${money(d.amount||0)}${d.note?' · '+d.note:''}`],
 deleteExp:id=>{const o=byId(state.exps,id);return['Видалено витрату',o.amount?`${catName(o)} · ${money(o.amount)}`:'']},
 saveSalary:(id,d)=>[state.sals.some(x=>x.id===id)?'Змінено виплату':'Виплачено зарплату',`${d.sn||''} · ${money(d.amount||0)} · ${full(d.d)}`],
 deleteSalary:id=>{const o=byId(state.sals,id);return['Видалено виплату',o.amount?`${o.sn||''} · ${money(o.amount)}`:'']},
 saveStaff:(id,d)=>[state.staff.some(x=>x.id===id)?'Змінено працівника':'Додано працівника',d.name],
 deleteStaff:id=>['Видалено працівника',byId(state.staff,id).name||''],
 saveDay:(k,d)=>['Внесено день',full(k)+' · '+money(Object.values(d.a||{}).reduce((a,b)=>a+(+b||0),0)+(+d.c||0))],
 deleteDay:k=>['Видалено день',isDate(k)?full(k):''],
 saveWait:(id,d)=>['Лист очікування: додано',d.name+(d.d?' · на '+full(d.d):'')],
 deleteWait:id=>['Лист очікування: прибрано',byId(state.wait,id).name||''],
 saveCfg:()=>['Змінено налаштування','послуги, категорії або список людей'],
 importSeed:()=>['Імпорт даних','']
};
function logWho(){return isOwner()?((state.user&&state.user.email)||'Власник'):((state.me&&state.me.name)||(state.user&&state.user.email)||'')}
function logAct(act,text){
 if(state.quiet||!state.user||!window.Store||!Store.addLog)return;
 try{Store.addLog({id:newId(),ts:Date.now(),uid:myUid(),who:logWho(),role:isOwner()?'owner':'staff',act,text:String(text||'').slice(0,300)})}catch(e){}
}
function logLogin(){
 const k='mg-login-'+myUid();
 try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}
 logAct('Вхід на сайт','');
}
function installLogging(){
 if(!window.Store||Store.__logged)return;Store.__logged=true;
 Object.keys(LOG_WRAPS).forEach(n=>{
  const orig=Store[n];if(!orig)return;
  Store[n]=function(){
   let info=null;try{info=LOG_WRAPS[n].apply(null,arguments)}catch(e){}
   const p=orig.apply(Store,arguments);
   Promise.resolve(p).then(()=>{if(info)logAct(info[0],info[1])},()=>{});
   return p;
  };
 });
}

/* ---------- перегляд (Налаштування → Логи) ---------- */
state.logs=[];state.logErr='';
Object.assign(state.ui,{logsOpen:false,logN:200,logU:'',logQ:''});
let logUnsub=null;
function stopLogs(){if(logUnsub){logUnsub();logUnsub=null}}
function startLogs(){
 stopLogs();state.logErr='';
 logUnsub=Store.subscribeLogs(state.ui.logN,l=>{state.logs=l;state.logErr='';renderLogs()},c=>{state.logErr=c||'error';renderLogs()});
}
const logTime=ts=>{const d=new Date(ts);return pad(d.getDate())+'.'+pad(d.getMonth()+1)+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
function logRows(){
 const u=state.ui,q=u.logQ.trim().toLowerCase();
 const l=state.logs.filter(x=>(!u.logU||x.uid===u.logU)&&(!q||(x.who+' '+x.act+' '+x.text).toLowerCase().includes(q)));
 if(!l.length)return'<div class="empty">'+(state.logs.length?'Нічого не знайдено':'Записів поки немає')+'</div>';
 let day='';
 return l.map(x=>{
  const dk=logTime(x.ts).slice(0,5),h=dk!==day?`<div class="loghd">${dk===logTime(Date.now()).slice(0,5)?'Сьогодні':dk}</div>`:'';day=dk;
  return h+`<div class="logrow"><span class="lt">${logTime(x.ts).slice(6)}</span><div><b>${esc(x.who||'—')}</b> · ${esc(x.act)}${x.text?`<div class="m">${esc(x.text)}</div>`:''}</div></div>`;
 }).join('');
}
function renderLogs(){
 const el=$('logBox');if(!el)return;
 if(!state.ui.logsOpen){el.innerHTML='<button class="btn sm" data-logopen="1">Показати логи</button>';return}
 if(state.logErr){el.innerHTML='<div class="err">'+(state.logErr==='permission-denied'?'Немає доступу до журналу. Додайте в правила Firestore блок <b>logs</b> (див. інструкцію) і оновіть сторінку.':'Не вдалося завантажити журнал.')+'</div><button class="btn sm" data-logopen="0" style="margin-top:8px">Сховати</button>';return}
 const who=[...new Map(state.logs.map(x=>[x.uid,x.who])).entries()];
 el.innerHTML=`<div class="tools"><select class="mini" data-logu><option value="">Усі користувачі</option>${who.map(([id,n])=>`<option value="${esc(id)}" ${state.ui.logU===id?'selected':''}>${esc(n)}</option>`).join('')}</select>
  <input class="search" data-logq type="search" placeholder="Пошук у логах" value="${esc(state.ui.logQ)}" autocomplete="off"><button class="btn sm" data-logopen="0">Сховати</button></div>
  <div id="logList" class="loglist">${logRows()}</div>
  ${state.logs.length>=state.ui.logN?'<button class="btn sm" data-logmore="1" style="margin-top:8px">Показати ще</button>':''}`;
}
function initLogs(){
 const s=$('settings');
 s.addEventListener('click',e=>{
  const o=e.target.closest('[data-logopen]');
  if(o){state.ui.logsOpen=o.dataset.logopen==='1';if(state.ui.logsOpen)startLogs();else stopLogs();renderLogs();return}
  if(e.target.closest('[data-logmore]')){state.ui.logN+=200;startLogs()}
 });
 s.addEventListener('change',e=>{if(e.target.matches('[data-logu]')){state.ui.logU=e.target.value;put('logList',logRows())}});
 s.addEventListener('input',e=>{if(e.target.matches('[data-logq]')){state.ui.logQ=e.target.value;put('logList',logRows())}});
}
