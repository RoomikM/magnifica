'use strict';
/* Клієнти: база, картка, статистика візитів. */

let _csKey=null,_csVal=null;
function clientStatsMap(){
 if(_csKey&&_csKey[0]===state.appts&&_csKey[1]===state.clients)return _csVal;
 const byName=new Map(),map=new Map();
 state.clients.forEach(c=>{byName.set(String(c.name||'').trim().toLowerCase(),c.id);map.set(c.id,{list:[]})});
 state.appts.forEach(a=>{
  const id=a.cid&&map.has(a.cid)?a.cid:(a.name?byName.get(String(a.name).trim().toLowerCase()):null);
  if(id)map.get(id).list.push(a);
 });
 map.forEach(s=>{
  s.list.sort((x,y)=>(x.d+x.t).localeCompare(y.d+y.t));
  const visits=s.list.filter(counted),up=s.list.filter(a=>isOk(a)&&!counted(a));
  s.visits=visits.length;s.upcoming=up.length;
  s.noshow=s.list.filter(a=>a.st==='noshow').length;
  s.cancel=s.list.filter(a=>a.st==='cancel').length;
  s.spent=visits.reduce((t,a)=>t+(+a.total||0),0);
  s.avg=s.visits?s.spent/s.visits:0;
  s.first=visits.length?visits[0].d:'';
  s.last=visits.length?visits[visits.length-1].d:'';
  s.next=up.length?up[0].d+' '+up[0].t:'';
  let gaps=0;for(let i=1;i<visits.length;i++)gaps+=(utc(visits[i].d)-utc(visits[i-1].d))/864e5;
  s.freq=visits.length>1?Math.round(gaps/(visits.length-1)):0;
  const sv={},ms={};
  visits.forEach(a=>{(a.items||[]).forEach(i=>sv[i.name]=(sv[i.name]||0)+1);if(a.m||a.mn){const n=mName(a);if(n)ms[n]=(ms[n]||0)+1}});
  s.top=Object.entries(sv).sort((x,y)=>y[1]-x[1]).slice(0,4);
  s.master=(Object.entries(ms).sort((x,y)=>y[1]-x[1])[0]||[])[0]||'';
  s.reliab=s.visits+s.noshow?Math.round(s.visits/(s.visits+s.noshow)*100):null;
 });
 _csKey=[state.appts,state.clients];_csVal=map;
 return map;
}
function clientBrief(c,st){
 st=st||clientStatsMap().get(c.id)||{visits:0,noshow:0,last:''};
 const p=[st.visits+' '+(st.visits===1?'візит':'візитів')];
 if(st.noshow)p.push('пропусків '+st.noshow);
 if(st.last)p.push('остання '+ddmm(st.last));
 if(st.spent)p.push(money(st.spent));
 return p.join(' · ');
}
function badges(st){
 const b=[];
 if(st.visits>=10)b.push('<i class="bdg vip">VIP</i>');
 else if(st.visits>=4)b.push('<i class="bdg">Постійний</i>');
 else if(st.visits===0&&!st.upcoming)b.push('<i class="bdg">Без візитів</i>');
 else if(st.visits<=1)b.push('<i class="bdg">Новий</i>');
 if(st.noshow>=2)b.push('<i class="bdg warn">Часто не приходить</i>');
 return b.join('');
}
const bdNext=bd=>{ // днів до найближчого дня народження
 if(!bd||bd.length<10)return null;
 const t=utc(todayKey());let y=t.getUTCFullYear();
 let n=new Date(Date.UTC(y,+bd.slice(5,7)-1,+bd.slice(8,10)));
 if(n<t)n=new Date(Date.UTC(y+1,+bd.slice(5,7)-1,+bd.slice(8,10)));
 return Math.round((n-t)/864e5);
};
function clientsListHtml(){
 const u=state.ui,q=u.cq.trim().toLowerCase(),dq=digitsOf(q),st=clientStatsMap();
 let l=state.clients.map(c=>({c,s:st.get(c.id)}));
 if(q)l=l.filter(x=>x.c.name.toLowerCase().includes(q)||(dq.length>=3&&digitsOf(x.c.phone).includes(dq))||String(x.c.note||'').toLowerCase().includes(q));
 if(u.cflt==='regular')l=l.filter(x=>x.s.visits>=4);
 else if(u.cflt==='new')l=l.filter(x=>x.s.visits<=1);
 else if(u.cflt==='risk')l=l.filter(x=>x.s.noshow>=1);
 const by={name:(a,b)=>a.c.name.localeCompare(b.c.name,'uk'),last:(a,b)=>(b.s.last||'').localeCompare(a.s.last||''),visits:(a,b)=>b.s.visits-a.s.visits,spent:(a,b)=>b.s.spent-a.s.spent};
 l.sort(by[u.csort]||by.name);
 if(!l.length)return `<div class="empty">${state.clients.length?'Нікого не знайдено':'Клієнтів ще немає. Вони додаються автоматично при створенні запису, або натисніть «Додати клієнта».'}</div>`;
 return l.slice(0,500).map(({c,s})=>`<button class="cl" data-cid="${esc(c.id)}"><span class="av">${esc(initials(c.name))}</span>
  <span class="cl-m"><span class="cl-n">${esc(c.name)}</span><span class="cl-s">${esc(c.phone||'без телефону')} · ${esc(clientBrief(c,s))}</span></span><span class="cl-b">${badges(s)}</span></button>`).join('');
}
function renderClients(){
 const el=$('clients');if(!el)return;
 if(!can('clientsView')){el.innerHTML='';return}
 const u=state.ui;
 const bds=state.clients.map(c=>({c,n:bdNext(c.bd)})).filter(x=>x.n!=null&&x.n<=30).sort((a,b)=>a.n-b.n);
 const bd=bds.length?`<div class="card"><h2>Найближчі дні народження</h2><div class="caption">Протягом 30 днів</div>${bds.map(x=>`<button class="exrow" data-cid="${esc(x.c.id)}"><div><div class="t">${esc(x.c.name)}</div><div class="m">${x.c.bd.slice(8,10)}.${x.c.bd.slice(5,7)}${x.c.phone?' · '+esc(x.c.phone):''}</div></div><div class="a">${x.n===0?'сьогодні':'через '+x.n+' дн.'}</div></button>`).join('')}</div>`:'';
 el.innerHTML=`<div class="tools"><input class="search" id="cq" type="search" placeholder="Пошук: ім’я, телефон, нотатка" value="${esc(u.cq)}" autocomplete="off"></div>
  <div class="tools"><div class="seg" role="group" aria-label="Сортування">${[['name','Ім’я'],['last','Остання'],['visits','Візити'],['spent','Сума']].map(([k,n])=>`<button data-cs="${k}" aria-pressed="${u.csort===k}">${n}</button>`).join('')}</div>
   <div class="seg" role="group" aria-label="Фільтр">${[['all','Усі'],['regular','Постійні'],['new','Нові'],['risk','Пропуски']].map(([k,n])=>`<button data-cf="${k}" aria-pressed="${u.cflt===k}">${n}</button>`).join('')}</div></div>
  <div class="sumline"><span>Клієнтів: <b>${state.clients.length}</b></span></div>${bd}
  <div class="card" id="clList">${clientsListHtml()}</div>`;
}

function openClient(idOrObj){
 if(state.status!=='ready')return;
 const ex=typeof idOrObj==='string'?state.clients.find(c=>c.id===idOrObj):null;
 if(!ex&&!can('clientsEdit'))return;
 const ro=!can('clientsEdit');
 const c=ex?JSON.parse(JSON.stringify(ex)):{id:newId(),name:'',phone:'',bd:'',note:'',reviews:[],created:Date.now()};
 if(!Array.isArray(c.reviews))c.reviews=[];
 const st=ex?clientStatsMap().get(c.id):null;
 const tile=(l,v)=>`<div><span>${l}</span><b>${v}</b></div>`;
 const stars=n=>n?'★'.repeat(n)+'☆'.repeat(5-n):'';
 showSheet(`<div class="sheet-head"><h2 id="sheetTitle">${ex?'Клієнт':'Новий клієнт'}</h2>${closeBtn}</div>
  <label class="lf"><span>ПІБ</span><input id="c-name" value="${esc(c.name)}" maxlength="80" autocomplete="off"></label>
  <div class="fgrid" style="grid-template-columns:1.2fr 1fr"><label class="lf"><span>Телефон</span><input id="c-phone" type="tel" inputmode="tel" value="${esc(c.phone)}" maxlength="24" autocomplete="off"></label>
   <label class="lf"><span>День народження</span><input id="c-bd" type="date" value="${esc(c.bd||'')}"></label></div>
  ${c.phone?`<div style="margin:-4px 0 10px"><a class="btn sm" href="tel:${esc(digitsOf(c.phone)?'+'.concat(digitsOf(c.phone).replace(/^0/,'380')):c.phone)}">Подзвонити</a></div>`:''}
  <label class="lf"><span>Нотатка (вподобання, особливості)</span><textarea id="c-note" rows="2" maxlength="400">${esc(c.note||'')}</textarea></label>
  ${st?`<div class="lbl2">Статистика</div><div class="tiles">
   ${tile('Візитів',st.visits)}${tile('Пропусків',st.noshow)}${tile('Скасувань',st.cancel)}
   ${tile('Витрачено',money(st.spent))}${tile('Середній чек',st.avg?money(st.avg):'—')}${tile('Приходить',st.freq?'раз на '+st.freq+' дн.':'—')}
   ${tile('Перший візит',st.first?full(st.first):'—')}${tile('Остання',st.last?full(st.last):'—')}${tile('Наступний',st.next?full(st.next.slice(0,10))+' '+st.next.slice(11):'—')}
  </div>
  ${st.reliab!=null?`<div class="sumline"><span>Надійність: <b>${st.reliab}%</b> відвідано з тих, що не скасовано заздалегідь</span></div>`:''}
  ${st.master?`<div class="sumline"><span>Улюблений майстер: <b>${esc(st.master)}</b></span></div>`:''}
  ${st.top.length?`<div class="chips" style="margin-bottom:8px">${st.top.map(([n,k])=>`<span class="chip" style="cursor:default">${esc(n)}<small>×${k}</small></span>`).join('')}</div>`:''}`:''}
  <div class="lbl2">Відгуки й нотатки про клієнта</div>
  <div id="c-revs"></div>
  ${ro?'':`<div class="revadd"><textarea id="c-rt" rows="2" placeholder="Новий відгук або нотатка" maxlength="400"></textarea><div class="revrow"><select id="c-rr" aria-label="Оцінка"><option value="0">без оцінки</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select><button class="btn sm" id="c-radd" type="button">Додати</button></div></div>`}
  ${st&&st.list.length?`<div class="lbl2" style="margin-top:14px">Історія записів</div><div class="hist">${st.list.slice().reverse().slice(0,12).map(a=>`<div class="hrow ${isOk(a)?'':'cancel'}"><b>${full(a.d)} ${esc(a.t)}</b><span>${esc(itemsText(a))}${STATUS_TXT[a.st]?' · '+STATUS_TXT[a.st]:''}</span><i>${money(a.total||0)}</i></div>`).join('')}</div>`:''}
  <div class="err" id="c-err" role="alert" hidden></div>
  <div class="actions">${ex&&can('clientsDel')?'<button class="btn danger" id="c-del">Видалити</button>':''}${ex&&can('apptAdd')?'<button class="btn" id="c-new">Новий запис</button>':''}${ro?'':'<button class="btn primary" id="c-save">Зберегти</button>'}</div>`);
 const err=m=>{const e=$('c-err');e.textContent=m;e.hidden=!m};
 const drawRevs=()=>{
  $('c-revs').innerHTML=c.reviews.length?c.reviews.slice().reverse().map((r,i)=>{const idx=c.reviews.length-1-i;return `<div class="rev"><div><b>${full(r.d)}</b>${r.r?` <span class="stars">${stars(r.r)}</span>`:''}</div><div>${esc(r.text)}</div>${ro?'':`<button type="button" class="rm" data-rr="${idx}" aria-label="Видалити">✕</button>`}</div>`}).join(''):'<div class="hint" style="margin:0 0 8px">Поки що порожньо.</div>';
 };
 drawRevs();
 if(ro)document.querySelectorAll('#sheetPanel input,#sheetPanel textarea').forEach(el=>{el.disabled=true});
 else{
  $('c-revs').addEventListener('click',e=>{const b=e.target.closest('[data-rr]');if(b){c.reviews.splice(+b.dataset.rr,1);drawRevs()}});
  $('c-radd').addEventListener('click',()=>{
   const t=$('c-rt').value.trim();if(!t)return;
   c.reviews.push({d:todayKey(),text:t,r:+$('c-rr').value||0});$('c-rt').value='';$('c-rr').value='0';drawRevs();
  });
  $('c-save').addEventListener('click',async()=>{
   const name=$('c-name').value.trim();
   if(!name){err('Вкажіть ім’я клієнта.');return}
   const t=$('c-rt').value.trim();if(t){c.reviews.push({d:todayKey(),text:t,r:+$('c-rr').value||0})}
   const obj={id:c.id,name,phone:$('c-phone').value.trim(),bd:$('c-bd').value||'',note:$('c-note').value.trim(),reviews:c.reviews,created:c.created||Date.now()};
   const b=$('c-save');b.disabled=true;b.textContent='Зберігаю…';
   try{const r=await Store.saveClient(obj.id,obj);closeSheet();savedToast(r,'Клієнта збережено')}
   catch(e){err(errText(e));b.disabled=false;b.textContent='Зберегти'}
  });
 }
 if(ex&&can('clientsDel'))arm($('c-del'),'Видалити',async()=>{await Store.deleteClient(c.id);closeSheet();toast('Клієнта видалено. Його записи залишились.')});
 if(ex&&can('apptAdd'))$('c-new').addEventListener('click',()=>{closeSheet();openAppt({cid:c.id,name:c.name,phone:c.phone,d:todayKey()})});
}

/* одноразово прив'язує старі записи без картки до клієнтів (id детермінований — повторів не буде) */
function hashId(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return 'm'+(h>>>0).toString(36)}
async function migrateClients(){
 if(state.migrated||!isOwner())return;
 if(!state.apptsLoaded||!state.clientsLoaded)return;
 state.migrated=true;
 const orphans=state.appts.filter(a=>!a.cid&&(a.name||a.phone));
 if(!orphans.length)return;
 state.quiet=true;
 const groups=new Map();
 orphans.forEach(a=>{
  const dg=digitsOf(a.phone);
  const key=dg.length>=7?'p'+dg:'n'+String(a.name||'').trim().toLowerCase();
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);
 });
 try{
  for(const [key,list] of groups){
   const last=list[list.length-1];
   const dg=digitsOf(last.phone);
   let c=null;
   if(dg.length>=7)c=state.clients.find(x=>digitsOf(x.phone)===dg);
   if(!c&&last.name)c=state.clients.find(x=>x.name.trim().toLowerCase()===last.name.trim().toLowerCase());
   let id;
   if(c)id=c.id;
   else{id=hashId(key);await Store.saveClient(id,{id,name:last.name||last.phone,phone:last.phone||'',bd:'',note:'',reviews:[],created:Date.now()})}
   for(const a of list)await Store.saveAppt(a.id,{...a,cid:id});
  }
 }catch(e){state.migrated=false}
 state.quiet=false;
}
