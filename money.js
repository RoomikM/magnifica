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
   return `<div class="payc"><div class="payc-h"><span class="av">${esc(initials(s.name))}</span><div><b>${esc(s.name)}</b><div class="m">${esc(s.role||'')}${s.role?' · ':''}${scheme}</div></div></div>${st}
    <div class="actions" style="margin-top:8px"><button class="btn sm primary" data-pay="${esc(s.id)}">${di&&di.units.length?'Виплатити за схемою':'Виплатити'}</button></div></div>`;
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
  const di=isOwner()&&s?dueInfo(s):null;
  if(di&&di.units.length&&!ex){
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
  if(!sid){err('Оберіть працівника.');return}
  if(!isDate(d)){err('Оберіть дату виплати.');return}
  if(amount<=0){err('Вкажіть суму.');return}
  err('');
  const p=opts.find(p=>p.id===sid);
  const obj={id:ex?ex.id:newId(),d,sid,sn:p?p.name:'',amount,to:isDate(to)?to:'',note:$('s-n').value.trim(),created:ex?ex.created:Date.now()};
  const b=$('s-save');b.disabled=true;b.textContent='Зберігаю…';
  try{const r=await Store.saveSalary(obj.id,obj);state.ui.emonth=d.slice(0,7);closeSheet();renderAll();savedToast(r,'Виплату збережено')}
  catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
 });
}
