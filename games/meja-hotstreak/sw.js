const PREFIX='meja-'+self.registration.scope+':';
const CACHE=PREFIX+'de338b0f';
const URLS=["assets/index-BG_O8FsE.js","assets/index-OTP1oVNp.css","icon.svg","index.html","manifest.webmanifest"].map(p=>new URL(p,self.registration.scope).href);
const SHELL=new URL('index.html',self.registration.scope).href;
const opts={ignoreVary:true};
async function cached(req){
  const own=await (await caches.open(CACHE)).match(req,opts);
  if(own)return own;
  for(const k of await caches.keys()){
    if(!k.startsWith(PREFIX)||k===CACHE)continue;
    const hit=await (await caches.open(k)).match(req,opts);
    if(hit)return hit;
  }
  return undefined;
}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const r=event.request;
  if(r.method!=='GET'||!r.url.startsWith(self.registration.scope))return;
  if(r.mode==='navigate'){
    event.respondWith((async()=>{
      const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),3000);
      try{const res=await fetch(r,{signal:ctl.signal});clearTimeout(t);return res}
      catch{clearTimeout(t);return (await cached(SHELL))||Response.error()}
    })());
    return;
  }
  event.respondWith(cached(r).then(hit=>hit||fetch(r)));
});
