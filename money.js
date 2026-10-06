'use strict';
/* Витрати і зарплата. */

const FREQ_TXT={day:'щодня',week:'щотижня',month:'щомісяця'};
const FREQ_UNIT={day:'дн.',week:'тиж.',month:'міс.'};
const peopleForPay=()=>isOwner()?state.staff.filter(s=>s.active!==false):cfgPeople();

/* скільки виплат уже настало за схемою працівника */
function dueInfo(s){
 const p=s.pay;if(!p||!p.freq||!(+p.amount>0))return null;
 const paid=state.sals.filter(x=>x.sid===s.id&&x.to).map(x=>x.to).sort().pop();
 let from=paid?addDays(paid,1):(isDate(p.start)?p.start:todayKey());
 const units=[],t=todayKey();
 for(let i=0;i<400;i++){
  const to=p.freq==='day'?from:p.freq==='week'?addDays(from,6):addDays(addMonths(from,1),-1);
  if(to>t)break;
  units.push({from,to});from=addDays(to,1);
 }
 return{units,amount:units.length*(+p.amount),from:units.length?units[0].from:from,to:units.length?units[units.length-1].to:'',next:from};
}

function renderMoney(D){
 const el=$('expenses');if(!el)return;
 if(!canTab('expenses')){el.innerHTML='';return}
 const subs=[];if(can('expView'))subs.push(['exp','Витрати']);if(can('salaryView'))subs.push(['sal','Зарплата']);
 if(!subs.some(s=>s[0]===state.ui.exsub))state.ui.exsub=subs[0][0];
 const mk=state.ui.emonth,[y,m]=mk.split('-').map(Number);
 const nav=`<div class="tools">${subs.length>1?`<div class="seg" role="group" aria-label="Розділ">${subs.map(([k,n])=>`<button data-sub="${k}" aria-pressed="${state.ui.exsub===k}">${n}</button>`).join('')}</div>`:''}
  <div class="navdate grow"><button class="iconbtn" data-em="-1" aria-label="Попередній місяць">‹</button><span class="lbl">${MONTHS[m-1]} ${y}</span><button class="iconbtn" data-em="1" aria-label="Наступний місяць">›</button></div><button class="btn sm" data-em="0">Цей місяць</button></div>`;
 el.innerHTML=nav+(state.ui.exsub==='sal'?salaryView(D,mk):expenseView(D,mk,m,y));
 updateFab();
}

function expenseView(D,mk,m,y){
 const list=state.exps.filter(x=>String(x.d).startsWith(mk)).sort((a,b)=>b.d.localeCompare(a.d)||String(b.created||0).localeCompare(String(a.created||0)));
 const expTotal=list.reduce((a,x)=>a+(+x.amount||0),0);
 const sals=can('salaryView')?state.sals.filter(x=>String(x.d).startsWith(mk)):[];
 const salTotal=sals.reduce((a,x)=>a+(+x.amount||0),0);
 const total=expTotal+salTotal;
 const rev=D.days.filter(x=>x.key.startsWith(mk)).reduce((a,x)=>a+x.total,0);
 const net=rev-total;
 const byCat=new Map();list.forEach(x=>{const n=catName(x);byCat.set(n,(byCat.get(n)||0)+(+x.amount||0))});
 if(salTotal)byCat.set('Зарплата',salTotal);
 const cats=[...byCat.entries()].sort((a,b)=>b[1]-a[1]);
 const maxc=Math.max(1,...cats.map(c=>c[1]));
 const fin=hasFin();
 const sum=`<div class="card ex-sum"><h2>${MONTHS[m-1]} ${y}</h2><div class="caption">Підсумок за місяць${can('salaryView')?', включно із зарплатою':''}</div>
  <div class="profit-row" style="margin:0 0 14px">${fin?`<div><span>Дохід</span><b>${money(rev)}</b></div>`:''}<div><span>Витрати</span><b>${money(total)}</b></div>${fin?`<div><span>Прибуток</span><b class="${net<0?'neg':''}">${net<0?'−':''}${money(Math.abs(net))}</b></div>`:''}</div>
  ${cats.length?cats.map(([n,v],i)=>`<div class="rank-row"><div class="rank-head"><span>${esc(n)}</span><b>${money(v)}</b></div><div class="rank-track"><i style="width:${v/maxc*100}%;background:${colorOf(i)}"></i></div></div>`).join(''):'<div class="empty" style="padding:10px">У цьому місяці витрат немає</div>'}</div>`;
 const rows=list.length?list.map(x=>`<button class="exrow" data-id="${esc(x.id)}"><div><div class="t">${esc(catName(x))}</div><div class="m">${full(x.d)}${x.note?' · '+esc(x.note):''}</div></div><div class="a">−${money(x.amount)}</div></button>`).join(''):`<div class="empty">Витрат за цей місяць ще немає.${can('expEdit')?'<br>Натисніть «Додати витрату».':''}</div>`;
 return `<div class="ex-grid">${sum}<div class="card ex-list"><h2>Записи витрат</h2><div class="caption">${can('expEdit')?'Торкніться запису, щоб змінити або видалити':'Лише перегляд'}</div>${rows}</div></div>`;
}

function salaryView(D,mk){
 const pays=state.sals.filter(x=>String(x.d).startsWith(mk)).sort((a,b)=>b.d.localeCompare(a.d));
 const paid=pays.reduce((a,x)=>a+(+x.amount||0),0);
 let sched='';
 if(isOwner()){
  const cards=state.staff.filter(s=>s.active!==false).map(s=>{
   const di=dueInfo(s);
   const scheme=di?`${FREQ_TXT[s.pay.freq]} · ${money(+s.pay.amount)}`:'схему не задано (налаштування → працівники)';
   let st='';
   if(di){
    st=di.units.length
     ?`<div class="due warn">До виплати: ${di.units.length} ${FREQ_UNIT[s.pay.freq]} · <b>${money(di.amount)}</b> <span>(${ddmm(di.from)}–${ddmm(di.to)})</span></div>`
     :`<div class="due">Виплачено. Наступний період із ${ddmm(di.next)}</div>`;
   }
   const b=balOf(s);
   if(b)st+=`<div class="due ${b.left>0?'warn':''}">% від робіт: нараховано <b>${money(b.earned)}</b> · виплачено ${money(b.paid)} · ${b.left<0?'переплата':'залишок'} <b>${money(Math.abs(b.left))}</b></div>`;
   return `<div class="payc"><div class="payc-h"><span class="av">${esc(initials(s.name))}</span><div><b>${esc(s.name)}</b><div class="m">${esc(s.role||'')}${s.role?' · ':''}${scheme}</div></div></div>${st}
    <div class="actions" style="margin-top:8px"><button class="btn sm primary" data-pay="${esc(s.id)}">${di&&di.units.length?'Виплатити за схемою':(balOf(s)&&balOf(s).left>0?'Виплатити залишок':'Виплатити')}</button></div></div>`;
  }).join('');
  sched=`<div class="card"><h2>Графік виплат</h2><div class="caption">Що настало до виплати за схемою кожного працівника</div>${cards||'<div class="empty">Працівників ще немає. Додайте їх у налаштуваннях.</div>'}</div>`;
 }
 const rows=pays.length?pays.map(x=>`<button class="exrow" data-sid-pay="${esc(x.id)}"><div><div class="t">${esc(personName(x.sid,x.sn)||'Працівник')}</div><div class="m">${full(x.d)}${x.to?' · за період до '+full(x.to):''}${x.note?' · '+esc(x.note):''}</div></div><div class="a">−${money(x.amount)}</div></button>`).join(''):'<div class="empty">Виплат за цей місяць ще немає.</div>';
 return `<div class="ex-grid"><div class="card ex-sum"><h2>Виплачено за місяць</h2><div class="caption">Зарплата входить у витрати й зменшує чистий прибуток</div><div class="profit-main">${money(paid)}</div></div>
  <div class="ex-list">${sched}<div class="card"><h2>Виплати</h2><div class="caption">${can('salaryEdit')?'Торкніться запису, щоб змінити або видалити':'Лише перегляд'}</div>${rows}</div></div></div>`;
}

/* ---------- форми ---------- */
function openExp(init){
 if(state.status!=='ready')return;
 const ex=init&&init.id?init:null;
 if(!ex&&!can('expEdit'))return;
 const ro=!can('expEdit');
 const cats=cfgCats();
 const x=ex||{d:todayKey().slice(0,7)===state.ui.emonth?todayKey():state.ui.emonth+'-01',amount:+(cats[0]&&cats[0].amt)||0,cat:cats[0]?cats[0].id:'oth',note:''};
 const catAmt=id=>{const c=cats.find(k=>k.id===id);return c&&+c.amt>0?+c.amt:0};
 const opts=cats.slice();if(ex&&!opts.some(c=>c.id===ex.cat))opts.push({id:ex.cat,name:ex.catName||'Інше'});
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?'Витрата':'Нова витрата'}</h2>${closeBtn}</div>
  <div class="fgrid" style="grid-template-columns:1fr 1fr"><label class="lf"><span>Дата</span><input type="date" id="x-d" value="${esc(x.d)}"></label>
   <label class="lf"><span>Сума, ₴</span><input id="x-a" inputmode="numeric" placeholder="0" value="${x.amount||''}"></label></div>
  <label class="lf"><span>Категорія</span><select id="x-c">${opts.map(c=>`<option value="${esc(c.id)}" ${c.id===x.cat?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label class="lf"><span>Примітка</span><input id="x-n" autocomplete="off" placeholder="необов’язково" value="${esc(x.note||'')}" maxlength="160"></label>
  <div class="err" id="x-err" role="alert" hidden></div>
  <div class="actions">${ex&&can('expEdit')?'<button class="btn danger" id="x-del">Видалити</button>':''}${ro?'':'<button class="btn primary" id="x-save">Зберегти</button>'}</div>`);
 digitsOnly($('x-a'));
 if(!ex&&!ro){let auto=String(x.amount||'');
  $('x-c').addEventListener('change',()=>{const el=$('x-a'),v=el.value.trim();if(v===''||v===auto){const n=catAmt($('x-c').value);auto=n?String(n):'';el.value=auto}});}
 if(ro)document.querySelectorAll('#sheetPanel input,#sheetPanel select').forEach(el=>{el.disabled=true});
 if(ex&&!ro)arm($('x-del'),'Видалити',async()=>{await Store.deleteExp(ex.id);closeSheet();toast('Витрату видалено')});
 if(!ro)$('x-save').addEventListener('click',async()=>{
  const err=m=>{const e=$('x-err');e.textContent=m;e.hidden=!m};
  const d=$('x-d').value,amount=numOf($('x-a').value),cat=$('x-c').value;
  if(!isDate(d)){err('Оберіть дату.');return}
  if(amount<=0){err('Вкажіть суму витрати.');return}
  err('');
  const c=opts.find(c=>c.id===cat);
  const obj={id:ex?ex.id:newId(),d,amount,cat,catName:c?c.name:'Інше',note:$('x-n').value.trim(),created:ex?ex.created:Date.now()};
  const b=$('x-save');b.disabled=true;b.textContent='Зберігаю…';
  try{const r=await Store.saveExp(obj.id,obj);state.ui.emonth=d.slice(0,7);closeSheet();renderAll();savedToast(r,'Витрату збережено')}
  catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
 });
}

function openSalary(init){
 if(state.status!=='ready')return;
 const ex=init&&init.created!=null&&init.id?init:null;
 if(!ex&&!can('salaryEdit'))return;
 const ro=!can('salaryEdit');
 const ppl=peopleForPay();
 const x=ex||{sid:(init&&init.sid)||(ppl[0]?ppl[0].id:''),d:todayKey(),amount:0,to:'',note:''};
 const opts=ppl.slice();if(ex&&!opts.some(p=>p.id===ex.sid))opts.push({id:ex.sid,name:ex.sn||'Працівник'});
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?'Виплата зарплати':'Нова виплата'}</h2>${closeBtn}</div>
  <label class="lf"><span>Кому</span><select id="s-p">${opts.map(p=>`<option value="${esc(p.id)}" ${p.id===x.sid?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
  <div class="note" id="s-due" hidden></div>
  <div class="fgrid" style="grid-template-columns:1fr 1fr"><label class="lf"><span>Дата виплати</span><input type="date" id="s-d" value="${esc(x.d)}"></label>
   <label class="lf"><span>Сума, ₴</span><input id="s-a" inputmode="numeric" placeholder="0" value="${x.amount||''}"></label></div>
  <label class="lf"><span>За період до (необов’язково)</span><input type="date" id="s-to" value="${esc(x.to||'')}"></label>
  <label class="lf"><span>Примітка</span><input id="s-n" autocomplete="off" placeholder="аванс, премія, розрахунок…" value="${esc(x.note||'')}" maxlength="160"></label>
  <div class="err" id="s-err" role="alert" hidden></div>
  <div class="actions">${ex&&!ro?'<button class="btn danger" id="s-del">Видалити</button>':''}${ro?'':'<button class="btn primary" id="s-save">Зберегти</button>'}</div>`);
 digitsOnly($('s-a'));
 const fill=(prefill)=>{
  const s=state.staff.find(z=>z.id===$('s-p').value),box=$('s-due');
  const di=isOwner()&&s?dueInfo(s):null,b=isOwner()&&s?balOf(s):null;
  if(b&&!ex&&!(di&&di.units.length)){
   box.hidden=false;box.textContent=`Баланс майстра: нараховано ${fmt(b.earned)} ₴, виплачено ${fmt(b.paid)} ₴, ${b.left<0?'переплата':'залишок до виплати'} ${fmt(Math.abs(b.left))} ₴. Якщо виплатите менше, решта залишиться на наступні дні.`;
   if(prefill)$('s-a').value=b.left>0?String(b.left):'';
  }else if(di&&di.units.length&&!ex){
   box.hidden=false;box.textContent=`За схемою (${FREQ_TXT[s.pay.freq]} · ${fmt(+s.pay.amount)} ₴): до виплати ${di.units.length} ${FREQ_UNIT[s.pay.freq]} = ${fmt(di.amount)} ₴ за період ${ddmm(di.from)}–${ddmm(di.to)}.`;
   if(prefill){$('s-a').value=String(di.amount);$('s-to').value=di.to}
  }else box.hidden=true;
 };
 fill(!(init&&init.amount));
 if(init&&init.amount){$('s-a').value=String(init.amount);if(init.to)$('s-to').value=init.to}
 $('s-p').addEventListener('change',()=>fill(true));
 if(ro)document.querySelectorAll('#sheetPanel input,#sheetPanel select').forEach(el=>{el.disabled=true});
 if(ex&&!ro)arm($('s-del'),'Видалити',async()=>{await Store.deleteSalary(ex.id);closeSheet();toast('Виплату видалено')});
 if(!ro)$('s-save').addEventListener('click',async()=>{
  const err=m=>{const e=$('s-err');e.textContent=m;e.hidden=!m};
  const d=$('s-d').value,amount=numOf($('s-a').value),sid=$('s-p').value,to=$('s-to').value;
  if(!sid&&!(ex&&ex.hist)){err('Оберіть працівника.');return}
  if(!isDate(d)){err('Оберіть дату виплати.');return}
  if(amount<=0){err('Вкажіть суму.');return}
  err('');
  const p=opts.find(p=>p.id===sid);
  const obj={id:ex?ex.id:newId(),d,sid,sn:p?p.name:((ex&&ex.sn)||''),amount,to:isDate(to)?to:'',note:$('s-n').value.trim(),created:ex?ex.created:Date.now()};
  if(ex&&ex.hist)obj.hist=true;
  const b=$('s-save');b.disabled=true;b.textContent='Зберігаю…';
  try{const r=await Store.saveSalary(obj.id,obj);state.ui.emonth=d.slice(0,7);closeSheet();renderAll();savedToast(r,'Виплату збережено')}
  catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
 });
}

/* ---------- одноразово: зарплата за історію (% від виручки по групах) ---------- */
function openHistSalary(){
 if(state.status!=='ready'||!isOwner())return;
 const D=compute(),cur=todayKey().slice(0,7);
 const rows=D.monthly.filter(r=>r.key<cur&&r.total>0);
 if(!rows.length){toast('Немає минулих місяців з виручкою');return}
 const S0=r=>{const S={};SV.forEach(s=>S[s.id]={amount:+r[s.id]||0,count:0});return S};
 const per=rows.map(r=>({r,g:svGroups(S0(r),r.total).filter(g=>g.amount>0)}));
 const gl=new Map();per.forEach(p=>p.g.forEach(g=>{if(!gl.has(g.key))gl.set(g.key,g.name)}));
 const guess=n=>{n=n.toLowerCase();return /манік|педик/.test(n)?40:/мейк|бров|вії|зачіс|волос/.test(n)?60:''};
 const lastDay=mk=>addDays(addMonths(mk+'-01',1),-1);
 const existing=mk=>state.sals.find(x=>x.id==='hist_'+mk);
 const others=mk=>state.sals.filter(x=>String(x.d).startsWith(mk)&&x.id!=='hist_'+mk).reduce((t,x)=>t+(+x.amount||0),0);
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">Зарплата за історію</h2>${closeBtn}</div>
  <div class="note">Одноразово: для кожного минулого місяця рахуємо зарплату як % від виручки по групах робіт і записуємо одну виплату на місяць у «Витрати → Зарплата». Поточний місяць не чіпаємо.</div>
  <div class="lbl2">% зарплати по групах</div>
  ${[...gl.entries()].map(([k,n])=>`<label class="pctrow"><span>${esc(n)}</span><input data-hr="${esc(k)}" inputmode="numeric" maxlength="3" placeholder="0" value="${guess(n)}"></label>`).join('')}
  <div class="lbl2" style="margin-top:12px">Місяці</div>
  <div id="hs-rows"></div>
  <div class="sum"><span>Разом зарплата</span><b id="hs-tot">0&nbsp;₴</b></div>
  <div class="err" id="hs-err" role="alert" hidden></div>
  <div class="actions"><button class="btn primary" id="hs-save">Записати у зарплату</button></div>`);
 const rates=()=>{const o={};document.querySelectorAll('[data-hr]').forEach(i=>{const v=i.value.replace(/\D/g,'');o[i.dataset.hr]=v===''?0:Math.min(100,+v)});return o};
 const calc=p=>{const R=rates();return Math.round(p.g.reduce((t,g)=>t+g.amount*(R[g.key]||0)/100,0))};
 const draw=()=>{
  $('hs-rows').innerHTML=per.map(p=>{
   const mk=p.r.key,ex=existing(mk),ot=others(mk),on=!ex&&!ot;
   const prev=$('hs-rows').querySelector('[data-hm="'+mk+'"]');
   const chk=prev?prev.checked:on;
   return `<label class="chk" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span><input type="checkbox" data-hm="${mk}" ${chk?'checked':''}> ${MONTHS[+mk.slice(5)-1]} ${mk.slice(0,4)}<small class="hint" style="margin:0 0 0 6px">виручка ${money(p.r.total)}${ex?' · вже є запис, буде замінено':ot?' · уже є виплати '+money(ot):''}</small></span><b>${money(calc(p))}</b></label>`}).join('');
  upT();
 };
 const upT=()=>{let t=0;per.forEach(p=>{const c=document.querySelector('[data-hm="'+p.r.key+'"]');if(c&&c.checked)t+=calc(p)});$('hs-tot').textContent=money(t)};
 draw();
 document.querySelectorAll('[data-hr]').forEach(i=>i.addEventListener('input',()=>{i.value=i.value.replace(/\D/g,'').slice(0,3);draw()}));
 $('hs-rows').addEventListener('change',upT);
 $('hs-save').addEventListener('click',async()=>{
  const R=rates(),pick=per.filter(p=>{const c=document.querySelector('[data-hm="'+p.r.key+'"]');return c&&c.checked&&calc(p)>0});
  const e=$('hs-err');
  if(!pick.length){e.textContent='Оберіть місяці та задайте відсотки.';e.hidden=false;return}
  e.hidden=true;const b=$('hs-save');b.disabled=true;b.textContent='Записую…';
  try{
   for(const p of pick){
    const mk=p.r.key,id='hist_'+mk,amount=calc(p);
    const note=p.g.filter(g=>R[g.key]>0).map(g=>g.name+' '+R[g.key]+'%').join(', ');
    const old=existing(mk);
    await Store.saveSalary(id,{id,d:lastDay(mk),sid:'',sn:'Зарплата (за історію)',amount,to:lastDay(mk),note,hist:true,created:old?old.created:Date.now()});
   }
   closeSheet();renderAll();toast('Записано місяців: '+pick.length);
  }catch(er){e.textContent=errText(er);e.hidden=false;b.disabled=false;b.textContent='Записати у зарплату'}
 });
}
