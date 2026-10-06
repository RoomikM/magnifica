'use strict';
/* Звіт для рієлтора / інвесторів: довільний набір місяців або весь час. Без імен клієнтів і майстрів.
   repMonthAgg збирає дані місяця з застосунку; repCombine і repRender «чисті» (їх копія вшивається в HTML-файл). */

function repMonthAgg(D,mk){
 const days=D.days.filter(x=>String(x.key).startsWith(mk));
 const S={};SV.forEach(s=>S[s.id]={amount:days.reduce((a,r)=>a+(+r[s.id]||0),0),count:0});
 const rev=days.reduce((a,x)=>a+x.total,0);
 const groups={};svGroups(S,rev).forEach(g=>{if(g.amount>0)groups[g.name]=(groups[g.name]||0)+g.amount});
 const cats={};let ex=0;
 state.exps.filter(x=>String(x.d).startsWith(mk)).forEach(x=>{const n=catName(x),v=+x.amount||0;cats[n]=(cats[n]||0)+v;ex+=v});
 const sal=state.sals.filter(x=>String(x.d).startsWith(mk)).reduce((a,x)=>a+(+x.amount||0),0);
 return{key:mk,rev,ex,sal,cats,groups,visits:workedCount('month',mk).n,days:days.map(d=>[d.key,d.total])};
}
function repAllAggs(){
 SV=svList();
 const D=compute(),cur=todayKey().slice(0,7);
 const keys=[...new Set([...D.monthly.map(m=>m.key),...D.profitMonths.map(m=>m.key)])].filter(k=>k<=cur).sort();
 return keys.map(k=>repMonthAgg(D,k)).filter(a=>a.rev>0||a.ex>0||a.sal>0);
}

/* ---- чисті функції (вшиваються у файл) ---- */
function repCombine(sel,ALL,today,TOTAL){
 const A=ALL.filter(a=>sel.includes(a.key)).sort((x,y)=>x.key<y.key?-1:1);
 const sum=f=>A.reduce((t,a)=>t+f(a),0);
 const rev=sum(a=>a.rev),sal=sum(a=>a.sal),expOther=sum(a=>a.ex),exp=expOther+sal,visits=sum(a=>a.visits);
 const gm={};A.forEach(a=>Object.keys(a.groups).forEach(n=>gm[n]=(gm[n]||0)+a.groups[n]));
 const groups=Object.keys(gm).map(n=>({name:n,amount:gm[n],share:rev?gm[n]/rev*100:0})).sort((x,y)=>y.amount-x.amount);
 const cm={};A.forEach(a=>Object.keys(a.cats).forEach(n=>cm[n]=(cm[n]||0)+a.cats[n]));
 const cats=Object.keys(cm).map(n=>({n,v:cm[n]}));if(sal)cats.push({n:'Зарплата',v:sal});cats.sort((x,y)=>y.v-x.v);
 const days=[];A.forEach(a=>a.days.forEach(d=>days.push({key:d[0],total:d[1]})));
 const rows=A.map(a=>({key:a.key,rev:a.rev,exp:a.ex+a.sal,net:a.rev-a.ex-a.sal,n:a.visits}));
 let prev=null;
 if(A.length===1){const[y,m]=A[0].key.split('-').map(Number),pk=new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7),p=ALL.find(a=>a.key===pk);if(p&&p.rev>0)prev={rev:p.rev,exp:p.ex+p.sal}}
 const net=rev-exp;
 return{A,keys:A.map(a=>a.key),all:A.length>0&&A.length===(TOTAL||ALL.length),rev,exp,sal,net,groups,cats,visits,days,rows,prev,today,
  active:days.filter(d=>d.total>0).length,margin:rev?Math.round(net/rev*100):null,
  best:days.reduce((b,x)=>!b||x.total>b.total?x:b,null),live:A.some(a=>a.key===today.slice(0,7))};
}
function repBars(items){
 const max=Math.max(1,...items.map(i=>i.v));
 return items.map(i=>`<div class="rp-bar"><div class="rp-bh"><span>${esc(i.n)}</span><b>${money(i.v)}${i.extra?`<small>${i.extra}</small>`:''}</b></div><div class="rp-bt"><i style="width:${(i.v/max*100).toFixed(1)}%;background:${i.c}"></i></div></div>`).join('');
}
function repChart(R,fin){
 const W=720,H=240,pd={l:46,r:10,t:14,b:34},single=R.keys.length===1;
 const items=single?R.days.map(d=>({l:d.key.slice(8,10),rev:d.total,exp:0})):R.rows.map(r=>({l:MSHORT[+r.key.slice(5,7)-1]+(r.key.slice(5,7)==='01'||r===R.rows[0]?' '+r.key.slice(2,4):''),rev:r.rev,exp:r.exp}));
 if(!items.length)return '<div class="rp-empty">Немає даних за період</div>';
 const raw=Math.max(1,...items.map(i=>Math.max(i.rev,fin?i.exp:0)));
 const pw=Math.pow(10,Math.floor(Math.log10(raw))),nf=raw/pw,max=(nf<=1?1:nf<=2?2:nf<=5?5:10)*pw;
 const two=!single&&fin,n=items.length,gw=(W-pd.l-pd.r)/n,bw=Math.min(two?18:28,gw*(two?.38:.62));
 const y=v=>pd.t+(max-v)*(H-pd.t-pd.b)/max;
 let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Графік виручки">`;
 for(let g=0;g<=4;g++){const v=max*g/4,yy=y(v);s+=`<line x1="${pd.l}" x2="${W-pd.r}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="${pd.l-6}" y="${yy+3.5}" text-anchor="end" font-size="10" style="fill:var(--muted)">${v>=1000?(Math.round(v/100)/10).toString().replace('.',',')+'к':Math.round(v)}</text>`}
 const step=Math.max(1,Math.ceil(n/14));
 items.forEach((it,i)=>{
  const cx=pd.l+gw*i+gw/2;
  if(two)s+=`<rect x="${cx-bw-1}" y="${y(it.rev)}" width="${bw}" height="${H-pd.b-y(it.rev)}" rx="3" style="fill:var(--c1)"><title>${esc(it.l)}: виручка ${money(it.rev)}</title></rect><rect x="${cx+1}" y="${y(it.exp)}" width="${bw}" height="${H-pd.b-y(it.exp)}" rx="3" style="fill:var(--c2)"><title>${esc(it.l)}: витрати ${money(it.exp)}</title></rect>`;
  else s+=`<rect x="${cx-bw/2}" y="${y(it.rev)}" width="${bw}" height="${Math.max(0,H-pd.b-y(it.rev))}" rx="3" style="fill:var(--c1)"><title>${esc(it.l)}: ${money(it.rev)}</title></rect>`;
  if(i%step===0)s+=`<text x="${cx}" y="${H-12}" text-anchor="middle" font-size="10" style="fill:var(--muted)">${esc(it.l)}</text>`;
 });
 return s+'</svg>'+(two?'<div class="rp-leg"><span><i style="background:var(--c1)"></i>Виручка</span><span><i style="background:var(--c2)"></i>Витрати і зарплата</span></div>':'');
}
function repRender(R,fin){
 const single=R.keys.length===1,k0=R.keys[0]||'',pk=k0.split('-');
 let title,sub;
 if(!R.keys.length){title='Немає вибраних місяців';sub=''}
 else if(R.all){title='Усі періоди';sub=R.keys.length>1?MONTHS[+k0.slice(5)-1]+' '+k0.slice(0,4)+' — '+MONTHS[+R.keys[R.keys.length-1].slice(5)-1]+' '+R.keys[R.keys.length-1].slice(0,4):''}
 else if(single){title=MONTHS[+pk[1]-1]+' '+pk[0];sub='1–'+new Date(Date.UTC(+pk[0],+pk[1],0)).getUTCDate()+' '+MGEN[+pk[1]-1]+' '+pk[0]}
 else{title='Вибрані місяці: '+R.keys.length;sub=R.keys.map(k=>MSHORT[+k.slice(5)-1]+' '+k.slice(2,4)).join(', ')}
 const live=R.live?' · поточний місяць ще триває':'';
 const delta=(a,b)=>b>0?Math.round((a-b)/b*100):null;
 const dtag=(a,b,good)=>{const d=delta(a,b);return d==null?'':`<em class="${(d>=0)===good?'up':'dn'}">${d>=0?'▲':'▼'} ${Math.abs(d)}% до минулого місяця</em>`};
 const tile=(l,v,s,cls)=>`<div class="rp-t ${cls||''}"><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
 const avgC=R.visits?R.rev/R.visits:0,avgD=R.active?R.rev/R.active:0;
 const tiles=[
  tile('Виручка',money(R.rev),R.prev?dtag(R.rev,R.prev.rev,true):(R.keys.length>1?'за '+R.keys.length+' міс., у середньому '+money(Math.round(R.rev/R.keys.length))+' на місяць':'')),
  fin?tile('Витрати і зарплата',money(R.exp),R.prev?dtag(R.exp,R.prev.exp,false):''):'',
  fin?tile('Чистий прибуток',(R.net<0?'−':'')+money(Math.abs(R.net)),R.margin==null?'':'рентабельність '+R.margin+'%',R.net<0?'neg':'pos'):'',
  tile('Візитів',fmt(R.visits),''),
  tile('Середній чек',avgC?money(Math.round(avgC)):'—',''),
  tile('Активних днів',fmt(R.active),avgD?'в середньому '+money(Math.round(avgD))+' за день':'')
 ].join('');
 const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)','var(--c8)'];
 const groups=repBars(R.groups.map((g,i)=>({n:g.name,v:g.amount,c:COL[i%8],extra:' · '+g.share.toFixed(1)+'%'})));
 const cats=fin&&R.cats.length?repBars(R.cats.map(c=>({n:c.n,v:c.v,c:'var(--c2)',extra:R.exp?' · '+(c.v/R.exp*100).toFixed(1)+'%':''}))):'';
 const tr=r=>`<tr><td>${MONTHS[+r.key.slice(5,7)-1]} ${r.key.slice(0,4)}</td><td>${money(r.rev)}</td>${fin?`<td>${money(r.exp)}</td><td class="${r.net<0?'neg':''}">${r.net<0?'−':''}${money(Math.abs(r.net))}</td><td>${r.rev?Math.round(r.net/r.rev*100)+'%':'—'}</td>`:''}<td>${fmt(r.n)}</td></tr>`;
 const table=R.rows.length>1?`<table class="rp-tab"><thead><tr><th>Місяць</th><th>Виручка</th>${fin?'<th>Витрати</th><th>Прибуток</th><th>Рент.</th>':''}<th>Візитів</th></tr></thead><tbody>${R.rows.slice().reverse().map(tr).join('')}</tbody><tfoot><tr><td>Разом</td><td>${money(R.rev)}</td>${fin?`<td>${money(R.exp)}</td><td class="${R.net<0?'neg':''}">${R.net<0?'−':''}${money(Math.abs(R.net))}</td><td>${R.margin==null?'—':R.margin+'%'}</td>`:''}<td>${fmt(R.visits)}</td></tr></tfoot></table>`:'';
 const td=R.today;
 return `<div class="rp-page">
  <header class="rp-head"><div><div class="rp-brand">MAGNiFICA</div><div class="rp-tag">Beauty salon</div></div><div class="rp-per"><b>${esc(title)}</b><span>${esc(sub)}${live}</span></div></header>
  <h1 class="rp-h1">Звіт про діяльність салону</h1>
  <div class="rp-tiles">${tiles}</div>
  <section class="rp-sec"><h2>${single?'Виручка по днях':'Виручка по місяцях'}</h2>${repChart(R,fin)}</section>
  <div class="rp-two"><section class="rp-sec"><h2>Структура доходу</h2>${groups||'<div class="rp-empty">Немає даних</div>'}</section>
  ${cats?`<section class="rp-sec"><h2>Структура витрат</h2>${cats}</section>`:''}</div>
  ${R.best&&single?`<section class="rp-sec rp-note">Найкращий день: <b>${full(R.best.key)}</b>, виручка <b>${money(R.best.total)}</b>.</section>`:''}
  ${table?`<section class="rp-sec"><h2>Динаміка по місяцях</h2>${table}</section>`:''}
  <footer class="rp-foot">Дані внутрішнього обліку салону MAGNiFICA. Суми у гривнях. Виручка — фактично проведені візити та внесені дні; витрати включають зарплату. Звіт сформовано ${full(td)}.</footer>
 </div>`;
}

/* ---- інтерфейс у застосунку ---- */
const repChips=(ALL,sel)=>`<div class="lbl">Місяці у звіті (можна обрати кілька)</div><button class="chp" type="button" data-rall aria-pressed="${sel.length===ALL.length}">Усі</button><button class="chp" type="button" data-rnone aria-pressed="false">Очистити</button>${ALL.slice().reverse().map(a=>`<button class="chp" type="button" data-rm="${a.key}" aria-pressed="${sel.includes(a.key)}">${MSHORT[+a.key.slice(5)-1]} ${a.key.slice(0,4)}${a.key===todayKey().slice(0,7)?' · триває':''}</button>`).join('')}`;
function reportCardHtml(){
 if(!isOwner())return '';
 return `<div class="card"><h2 class="set-h">Звіт для рієлтора</h2>
  <p class="set-p">Гарний звіт для показу покупцям або партнерам: виручка, структура доходу, витрати, прибуток. Місяці для звіту обираєте самі. Без імен клієнтів і майстрів. Можна зберегти у PDF або в автономний HTML-файл.</p>
  <label class="chk"><input type="checkbox" id="repFin" checked> Показувати витрати, зарплату і прибуток</label>
  <div style="margin-top:10px"><button class="btn sm primary" id="repGo">Сформувати звіт</button></div></div>`;
}
function openReport(fin){
 let ov=$('rep');if(ov)ov.remove();
 const ALL=repAllAggs();if(!ALL.length){toast('Немає даних для звіту');return}
 const cur=todayKey().slice(0,7);
 let sel=ALL.map(a=>a.key).filter(k=>k<cur),finOn=fin!==false;
 if(!sel.length)sel=ALL.map(a=>a.key);
 ov=document.createElement('div');ov.id='rep';ov.className='rep';
 ov.innerHTML=`<div class="rep-bar"><button class="btn sm" id="repClose">← Закрити</button><div class="rep-top"><label class="chk" style="margin:0"><input type="checkbox" id="repFin2" ${finOn?'checked':''}> витрати і прибуток</label><button class="btn sm" id="repHtml">Зберегти HTML</button><button class="btn sm primary" id="repPrint">Друк / PDF</button></div></div><div class="rep-months" id="repMonths"></div><div class="rep-body" id="repBody"></div>`;
 document.body.appendChild(ov);document.documentElement.classList.add('rep-open');
 const draw=()=>{
  $('repMonths').innerHTML=repChips(ALL,sel);
  $('repBody').innerHTML=repRender(repCombine(sel,ALL,todayKey()),finOn);
 };
 draw();
 $('repMonths').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-rall'))sel=ALL.map(a=>a.key);
  else if(b.hasAttribute('data-rnone'))sel=[];
  else if(b.dataset.rm){sel=sel.includes(b.dataset.rm)?sel.filter(k=>k!==b.dataset.rm):sel.concat([b.dataset.rm])}
  draw();
 });
 $('repFin2').addEventListener('change',e=>{finOn=e.target.checked;draw()});
 $('repClose').addEventListener('click',()=>{ov.remove();document.documentElement.classList.remove('rep-open')});
 $('repPrint').addEventListener('click',()=>window.print());
 $('repHtml').addEventListener('click',()=>exportReportHtml(ALL,sel,finOn));
}

/* ---- автономний HTML: усі дані вшиті; вибір місяців (JS) + запасний режим без JS (один місяць / усі) ---- */
async function exportReportHtml(ALL,sel,fin){
 if(!ALL){ALL=repAllAggs();const c=todayKey().slice(0,7);sel=ALL.map(a=>a.key).filter(k=>k<c);fin=$('repFin')?$('repFin').checked:true}
 if(!sel.length){toast('Оберіть хоча б один місяць');return}
 const TOTAL=ALL.length;
 ALL=ALL.filter(a=>sel.includes(a.key));/* у файл потрапляють лише вибрані місяці */
 let css='';try{css=await (await fetch('style.css',{cache:'no-cache'})).text()}catch(e){toast('Не вдалось зібрати файл. Перевірте з’єднання.');return}
 const i1=css.indexOf('/* Туман'),i2=css.indexOf('*{box-sizing:border-box}'),i3=css.indexOf('/* звіт для рієлтора');
 const skinCss=css.slice(i1,i2),repCss=css.slice(i3);
 const base=css.slice(css.indexOf(':root{'),css.indexOf('/* Туман'));
 /* теми: кожна змінює змінні лише всередині .rep, через радіо-кнопки (працює і без JS) */
 const scoped=skinCss.replace(/:root,:root\[data-skin="steel"\]/,'.rep').replace(/:root\[data-skin="(\w+)"\]/g,'#th-$1:checked~.rep');
 const skin=document.documentElement.dataset.skin||'steel';
 const themes=SKINS.map(([k])=>`<input type="radio" name="th" id="th-${k}" class="hid" ${k===skin?'checked':''}>`).join('');
 const sw=SKINS.map(([k,n])=>`<label for="th-${k}" class="chp sw" title="${esc(n)}"><span class="swatch ${k}"></span><span class="swn">${esc(n)}</span></label>`).join('');
 const swCss=Object.entries({steel:'#b4c2cc,#38617c',asphalt:'#141619,#8db5a8',coffee:'#d8c6b2,#8b5e3c',ivory:'#f1ece0,#aa9a70',night:'#12171d,#7f9db6'}).map(([k,v])=>`.swatch.${k}{background:linear-gradient(135deg,${v})}`).join('');
 const act=SKINS.map(([k])=>`#th-${k}:checked~.rep label[for=th-${k}]{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}`).join('');
 /* запасний режим без JS: «Усі» і кожен місяць окремо (радіо + CSS) */
 const opts=[['all',sel.length===TOTAL?'Усі періоди':'Усі вибрані']].concat(ALL.slice().reverse().map(a=>[a.key,MONTHS[+a.key.slice(5)-1]+' '+a.key.slice(0,4)]));
 const keyOf2=v=>v==='all'?ALL.map(a=>a.key):[v];
 const radios=opts.map(([v],i)=>`<input type="radio" name="per" id="r${i}" class="hid" ${i===0?'checked':''}>`).join('')+`<input type="checkbox" id="fin" class="hid" ${fin?'checked':''}>`;
 const nj=opts.map(([v,n],i)=>`<label for="r${i}" class="chp">${esc(n)}</label>`).join('');
 const today=todayKey();
 const bodies=opts.map(([v],i)=>{const R=repCombine(keyOf2(v),ALL,today,TOTAL);return `<div class="ps p${i}f1">${repRender(R,true)}</div><div class="ps p${i}f0">${repRender(R,false)}</div>`}).join('');
 const rules=opts.map((o,i)=>`#r${i}:checked~#fin:checked~.rep-body .p${i}f1,#r${i}:checked~#fin:not(:checked)~.rep-body .p${i}f0{display:block}#r${i}:checked~.rep-months.nj label[for=r${i}]{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}`).join('');
 const pure=[repCombine,repBars,repChart,repRender].map(f=>f.toString()).join('\n');
 const js=`const MONTHS=${JSON.stringify(MONTHS)},MSHORT=${JSON.stringify(MSHORT)},MGEN=${JSON.stringify(MGEN)};
const esc=${esc.toString()};const fmt=${fmt.toString()};const money=${money.toString()};const full=${full.toString()};
${pure}
const ALL=${JSON.stringify(ALL).replace(/</g,'\\u003c')},TODAY=${JSON.stringify(today)};
let sel=${JSON.stringify(sel)},finOn=${fin?'true':'false'};
document.documentElement.classList.add('js');
const $=id=>document.getElementById(id);
const chips=()=>'<div class="lbl">Місяці у звіті (можна обрати кілька)</div><button class="chp" type="button" data-rall aria-pressed="'+(sel.length===ALL.length)+'">Усі</button><button class="chp" type="button" data-rnone aria-pressed="false">Очистити</button>'+ALL.slice().reverse().map(a=>'<button class="chp" type="button" data-rm="'+a.key+'" aria-pressed="'+sel.includes(a.key)+'">'+MSHORT[+a.key.slice(5)-1]+' '+a.key.slice(0,4)+'</button>').join('');
const draw=()=>{$('jsMonths').innerHTML=chips();$('jsBody').innerHTML=repRender(repCombine(sel,ALL,TODAY,${TOTAL}),finOn);$('finJs').checked=finOn};
$('jsMonths').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-rall'))sel=ALL.map(a=>a.key);else if(b.hasAttribute('data-rnone'))sel=[];
 else if(b.dataset.rm)sel=sel.includes(b.dataset.rm)?sel.filter(k=>k!==b.dataset.rm):sel.concat([b.dataset.rm]);draw()});
$('finJs').addEventListener('change',e=>{finOn=e.target.checked;draw()});
draw();`;
 const doc=`<!doctype html><html lang="uk" class="rep-open"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MAGNiFICA · Звіт</title><style>${base}${scoped}${swCss}${act}*{box-sizing:border-box}body{margin:0;font-family:var(--font)}.hid{position:absolute;opacity:0;pointer-events:none;width:0;height:0}.ps{display:none}${rules}.js .nj,.js .ps{display:none!important}.jsonly,.rep-months.jsonly{display:none}.js .jsonly{display:block}.js span.jsonly{display:inline}.js .rep-months.jsonly{display:flex}.btn{font:inherit;font-size:13px;font-weight:700;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:var(--btn-bg);color:var(--text);cursor:pointer}.btn.primary{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}.chk{display:inline-flex;gap:6px;align-items:center;font-size:13px}.swatch{width:11px;height:11px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);display:inline-block}.rep-top{flex:1;justify-content:flex-start}${repCss}@media print{.hid{display:none}.rep-months,.rep-bar{display:none}}@media(max-width:520px){.swn{display:none}}#fin:checked~.rep-months.nj label[for=fin]{background:var(--accent);color:var(--on-accent)}</style></head><body>${themes}<div class="rep" id="rep">${radios}<div class="rep-bar"><div class="rep-top"><b style="letter-spacing:.2em;font-weight:400;margin-right:6px">MAGNiFICA</b>${sw}<span class="jsonly"><label class="chk"><input type="checkbox" id="finJs"> витрати і прибуток</label></span></div><button class="btn primary" onclick="window.print()">Друк / PDF</button></div><div class="rep-months nj"><div class="lbl">Період (у цьому переглядачі скрипти вимкнені: один місяць або всі; відкрийте файл у браузері, щоб обрати кілька місяців)</div>${nj}<label for="fin" class="chp">Витрати і прибуток</label></div><div class="rep-months jsonly" id="jsMonths"></div><div class="rep-body"><div id="jsBody" class="jsonly"></div>${bodies}</div></div><script>${js}<\/script></body></html>`;
 saveFile('magnifica-zvit-'+todayKey()+'.html',doc,'text/html');
}
document.addEventListener('click',e=>{
 if(e.target.closest('#repGo'))openReport($('repFin')?$('repFin').checked:true);
});
