'use strict';
/* Звіт для рієлтора / інвесторів: один місяць або весь час. Без імен клієнтів і майстрів. */

function reportData(sel,fin){
 SV=svList();
 const D=compute(),all=sel==='all',cur=todayKey().slice(0,7);
 const inR=k=>all||String(k).startsWith(sel);
 const days=D.days.filter(x=>inR(x.key));
 const S={};SV.forEach(s=>S[s.id]={amount:days.reduce((a,r)=>a+(+r[s.id]||0),0),count:0});
 const rev=days.reduce((a,x)=>a+x.total,0);
 const groups=svGroups(S,rev).filter(g=>g.amount>0).sort((a,b)=>b.amount-a.amount);
 const sal=state.sals.filter(x=>inR(x.d)).reduce((a,x)=>a+(+x.amount||0),0);
 const exps=state.exps.filter(x=>inR(x.d));
 const byCat=new Map();exps.forEach(x=>{const n=catName(x);byCat.set(n,(byCat.get(n)||0)+(+x.amount||0))});
 const expOther=exps.reduce((a,x)=>a+(+x.amount||0),0);
 const cats=[...byCat.entries()].map(([n,v])=>({n,v}));if(sal)cats.push({n:'Зарплата',v:sal});
 cats.sort((a,b)=>b.v-a.v);
 const exp=expOther+sal,net=rev-exp;
 const w=workedCount(all?'all':'month',sel);
 const monthsAll=D.profitMonths.filter(m=>m.key<=cur&&(m.rev>0||m.exp>0));
 const rows=monthsAll.map(m=>({key:m.key,rev:m.rev,exp:m.exp,net:m.rev-m.exp,n:workedCount('month',m.key).n}));
 let prev=null;
 if(!all){const pk=addMonths(sel+'-01',-1).slice(0,7),p=monthsAll.find(m=>m.key===pk);if(p&&p.rev>0)prev={rev:p.rev,exp:p.exp,net:p.rev-p.exp}}
 return{all,sel,days,rev,exp,expOther,sal,net,cats,groups,visits:w.n,active:days.length,rows,prev,
  avgCheck:w.n?rev/w.n:0,avgDay:days.length?rev/days.length:0,margin:rev?Math.round(net/rev*100):null,
  best:days.reduce((b,x)=>!b||x.total>b.total?x:b,null),from:days.length?days[0].key:'',to:days.length?days[days.length-1].key:''};
}

function repBars(items,color){
 const max=Math.max(1,...items.map(i=>i.v));
 return items.map(i=>`<div class="rp-bar"><div class="rp-bh"><span>${esc(i.n)}</span><b>${money(i.v)}${i.extra?`<small>${i.extra}</small>`:''}</b></div><div class="rp-bt"><i style="width:${(i.v/max*100).toFixed(1)}%;background:${i.c||color}"></i></div></div>`).join('');
}
function repChart(R,fin){
 const W=720,H=240,pd={l:46,r:10,t:14,b:34};
 let items;
 if(R.all)items=R.rows.map(r=>({l:MSHORT[+r.key.slice(5,7)-1]+(r.key.slice(5,7)==='01'||r===R.rows[0]?' '+r.key.slice(2,4):''),rev:r.rev,exp:r.exp}));
 else items=R.days.map(d=>({l:d.key.slice(8,10),rev:d.total,exp:0}));
 if(!items.length)return '<div class="rp-empty">Немає даних за період</div>';
 const raw=Math.max(1,...items.map(i=>Math.max(i.rev,fin?i.exp:0)));
 const pw=Math.pow(10,Math.floor(Math.log10(raw))),nf=raw/pw,max=(nf<=1?1:nf<=2?2:nf<=5?5:10)*pw;
 const two=R.all&&fin,n=items.length,gw=(W-pd.l-pd.r)/n,bw=Math.min(two?18:28,gw*(two?.38:.62));
 const y=v=>pd.t+(max-v)*(H-pd.t-pd.b)/max;
 let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Графік виручки">`;
 for(let g=0;g<=4;g++){const v=max*g/4,yy=y(v);s+=`<line x1="${pd.l}" x2="${W-pd.r}" y1="${yy}" y2="${yy}" stroke="#e3e7ec"/><text x="${pd.l-6}" y="${yy+3.5}" text-anchor="end" font-size="10" fill="#7b8794">${v>=1000?(Math.round(v/100)/10).toString().replace('.',',')+'к':Math.round(v)}</text>`}
 const step=Math.max(1,Math.ceil(n/(R.all?14:16)));
 items.forEach((it,i)=>{
  const cx=pd.l+gw*i+gw/2;
  if(two){s+=`<rect x="${cx-bw-1}" y="${y(it.rev)}" width="${bw}" height="${H-pd.b-y(it.rev)}" rx="3" fill="#3b6e8f"/><rect x="${cx+1}" y="${y(it.exp)}" width="${bw}" height="${H-pd.b-y(it.exp)}" rx="3" fill="#d9a05b"/>`}
  else s+=`<rect x="${cx-bw/2}" y="${y(it.rev)}" width="${bw}" height="${Math.max(0,H-pd.b-y(it.rev))}" rx="3" fill="#3b6e8f"/>`;
  if(i%step===0)s+=`<text x="${cx}" y="${H-12}" text-anchor="middle" font-size="10" fill="#7b8794">${esc(it.l)}</text>`;
 });
 return s+'</svg>'+(two?'<div class="rp-leg"><span><i style="background:#3b6e8f"></i>Виручка</span><span><i style="background:#d9a05b"></i>Витрати і зарплата</span></div>':'');
}
function reportHtml(sel,fin){
 const R=reportData(sel,fin),pk=sel.split('-'),title=R.all?'Усі періоди':MONTHS[+pk[1]-1]+' '+pk[0];
 const sub=R.all?(R.from?full(R.from)+' — '+full(R.to):''):'1–'+new Date(Date.UTC(+pk[0],+pk[1],0)).getUTCDate()+' '+MGEN[+pk[1]-1]+' '+pk[0];
 const live=!R.all&&sel===todayKey().slice(0,7)?' · місяць ще триває':'';
 const delta=(a,b)=>b>0?Math.round((a-b)/b*100):null;
 const dtag=(a,b,good)=>{const d=delta(a,b);return d==null?'':`<em class="${(d>=0)===good?'up':'dn'}">${d>=0?'▲':'▼'} ${Math.abs(d)}% до минулого місяця</em>`};
 const tile=(l,v,s,cls)=>`<div class="rp-t ${cls||''}"><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
 const tiles=[
  tile('Виручка',money(R.rev),R.prev?dtag(R.rev,R.prev.rev,true):'',''),
  fin?tile('Витрати і зарплата',money(R.exp),R.prev?dtag(R.exp,R.prev.exp,false):''):'',
  fin?tile('Чистий прибуток',(R.net<0?'−':'')+money(Math.abs(R.net)),R.margin==null?'':'рентабельність '+R.margin+'%',R.net<0?'neg':'pos'):'',
  tile('Візитів',fmt(R.visits),R.all?'':''),
  tile('Середній чек',R.avgCheck?money(Math.round(R.avgCheck)):'—',''),
  tile('Активних днів',fmt(R.active),R.avgDay?'в середньому '+money(Math.round(R.avgDay))+' за день':'')
 ].join('');
 const gcol=(i)=>['#3b6e8f','#d9a05b','#7a9e7e','#b5677d','#8d7ab5','#5fa8a8','#c9825a'][i%7];
 const groups=repBars(R.groups.map((g,i)=>({n:g.name,v:g.amount,c:gcol(i),extra:' · '+g.share.toFixed(1)+'%'})),'#3b6e8f');
 const cats=fin&&R.cats.length?repBars(R.cats.map((c,i)=>({n:c.n,v:c.v,c:'#d9a05b',extra:R.exp?' · '+(c.v/R.exp*100).toFixed(1)+'%':''})),'#d9a05b'):'';
 const table=R.all&&R.rows.length?`<table class="rp-tab"><thead><tr><th>Місяць</th><th>Виручка</th>${fin?'<th>Витрати</th><th>Прибуток</th><th>Рент.</th>':''}<th>Візитів</th></tr></thead><tbody>${R.rows.slice().reverse().map(r=>`<tr><td>${MONTHS[+r.key.slice(5,7)-1]} ${r.key.slice(0,4)}</td><td>${money(r.rev)}</td>${fin?`<td>${money(r.exp)}</td><td class="${r.net<0?'neg':''}">${r.net<0?'−':''}${money(Math.abs(r.net))}</td><td>${r.rev?Math.round(r.net/r.rev*100)+'%':'—'}</td>`:''}<td>${fmt(r.n)}</td></tr>`).join('')}</tbody></table>`:'';
 return `<div class="rp-page">
  <header class="rp-head"><div><div class="rp-brand">MAGNiFICA</div><div class="rp-tag">Beauty salon</div></div><div class="rp-per"><b>${esc(title)}</b><span>${esc(sub)}${live}</span></div></header>
  <h1 class="rp-h1">Звіт про діяльність салону</h1>
  <div class="rp-tiles">${tiles}</div>
  <section class="rp-sec"><h2>${R.all?'Виручка по місяцях':'Виручка по днях'}</h2>${repChart(R,fin)}</section>
  <div class="rp-two"><section class="rp-sec"><h2>Структура доходу</h2>${groups||'<div class="rp-empty">Немає даних</div>'}</section>
  ${cats?`<section class="rp-sec"><h2>Структура витрат</h2>${cats}</section>`:''}</div>
  ${R.best&&!R.all?`<section class="rp-sec rp-note">Найкращий день: <b>${full(R.best.key)}</b>, виручка <b>${money(R.best.total)}</b>.</section>`:''}
  ${table?`<section class="rp-sec"><h2>Динаміка по місяцях</h2>${table}</section>`:''}
  <footer class="rp-foot">Дані внутрішнього обліку салону MAGNiFICA. Суми у гривнях. Виручка — фактично проведені візити та внесені дні; витрати включають зарплату. Звіт сформовано ${full(todayKey())}.</footer>
 </div>`;
}
function reportCardHtml(){
 if(!isOwner())return '';
 const D=compute(),cur=todayKey().slice(0,7);
 const ms=D.monthly.map(m=>m.key).filter(k=>k<=cur).sort().reverse();
 return `<div class="card"><h2 class="set-h">Звіт для рієлтора</h2>
  <p class="set-p">Гарний звіт для показу покупцям або партнерам: виручка, структура доходу, витрати, прибуток. Без імен клієнтів і майстрів. Можна зберегти у PDF або надрукувати.</p>
  <label class="lf"><span>Період</span><select id="repPer"><option value="all">Усі періоди</option>${ms.map(k=>`<option value="${k}">${MONTHS[+k.slice(5)-1]} ${k.slice(0,4)}</option>`).join('')}</select></label>
  <label class="chk"><input type="checkbox" id="repFin" checked> Показувати витрати, зарплату і прибуток</label>
  <div style="margin-top:10px"><button class="btn sm primary" id="repGo">Сформувати звіт</button></div></div>`;
}
function openReport(sel,fin){
 let ov=$('rep');if(ov)ov.remove();
 ov=document.createElement('div');ov.id='rep';ov.className='rep';
 ov.innerHTML=`<div class="rep-bar"><button class="btn sm" id="repClose">← Закрити</button><div class="rep-sel"><select id="repPer2">${[...document.querySelectorAll('#repPer option')].map(o=>`<option value="${o.value}" ${o.value===sel?'selected':''}>${esc(o.textContent)}</option>`).join('')}</select><label class="chk"><input type="checkbox" id="repFin2" ${fin?'checked':''}> витрати і прибуток</label></div><button class="btn sm primary" id="repPrint">Друк / PDF</button></div><div class="rep-body" id="repBody">${reportHtml(sel,fin)}</div>`;
 document.body.appendChild(ov);document.documentElement.classList.add('rep-open');
 const re=()=>{$('repBody').innerHTML=reportHtml($('repPer2').value,$('repFin2').checked)};
 $('repPer2').addEventListener('change',re);$('repFin2').addEventListener('change',re);
 $('repClose').addEventListener('click',()=>{ov.remove();document.documentElement.classList.remove('rep-open')});
 $('repPrint').addEventListener('click',()=>window.print());
}
document.addEventListener('click',e=>{if(e.target.closest('#repGo'))openReport($('repPer').value,$('repFin').checked)});
