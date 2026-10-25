'use strict';
/* Push-сповіщення майстру про новий запис, навіть коли застосунок закритий.
   Майстер підписується в кабінеті (підписка зберігається в базі, колекція push).
   Адміністратор після створення запису звертається до проміжного сервера (Cloudflare Worker),
   той підписує запит ключем VAPID і надсилає порожній push; service worker показує сповіщення. */

const PUSH=()=>window.PUSH_CONFIG||{};
const pushSupported=()=>{const c=PUSH();return !!(c.url&&c.vapid&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&Store&&Store.savePush)};
const pushDev=()=>{let d=lsGet('magnifica-pushdev','');if(!d){d=Math.random().toString(36).slice(2,10);lsSet('magnifica-pushdev',d)}return d};
const b64u=s=>{const p='='.repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))};
const pushDocId=()=>myMid()+'_'+pushDev();

async function pushActive(){
 if(!pushSupported()||Notification.permission!=='granted')return false;
 try{const reg=await navigator.serviceWorker.ready;return !!(await reg.pushManager.getSubscription())&&lsGet('magnifica-pushon','')===myMid()}catch(e){return false}
}
async function pushEnable(){
 if(!pushSupported())throw new Error('Цей браузер не підтримує сповіщення.');
 const perm=await Notification.requestPermission();
 if(perm!=='granted')throw new Error('Дозвіл на сповіщення не надано. Дозвольте їх у налаштуваннях браузера для цього сайту.');
 const reg=await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(PUSH().vapid)});
 await Store.savePush(pushDocId(),{mid:myMid(),uid:myUid(),sub:sub.toJSON(),ua:(navigator.userAgent||'').slice(0,120),created:Date.now()});
 lsSet('magnifica-pushon',myMid());
}
async function pushDisable(){
 try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe()}catch(e){}
 try{await Store.deletePush(pushDocId())}catch(e){}
 lsSet('magnifica-pushon','');
}
/* адміністратор: сповістити майстра mid (без очікування, помилки ігноруються) */
async function pushNotify(mid){
 try{
  if(!pushSupported()||!mid||mid===myMid())return;
  const subs=(await Store.getPush(mid)).filter(x=>x.sub&&x.sub.endpoint);
  if(!subs.length)return;
  const token=await Store.idToken();if(!token)return;
  const r=await fetch(PUSH().url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,subs:subs.map(x=>x.sub)})});
  if(!r.ok)return;
  const j=await r.json();
  (j.gone||[]).forEach(ep=>{const d=subs.find(x=>x.sub.endpoint===ep);if(d)Store.deletePush(d.id).catch(()=>{})});
 }catch(e){}
}
