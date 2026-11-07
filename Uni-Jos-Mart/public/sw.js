const C='ujm-v16',A=['./','index.html','manifest.json','unijos-logo.jpg','terms.html','css/style.css','js/app.js','js/db.js','js/intro.js','js/pwa.js','js/appwrite-config.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(caches.match(e.request).then(async hit=>{
  const network = fetch(e.request).then(r=>{if(r && r.ok && e.request.url.startsWith(self.location.origin)) caches.open(C).then(c=>c.put(e.request,r.clone())); return r;}).catch(()=>hit||Response.error());
  return hit ? Promise.race([network, Promise.resolve(hit)]) : network;
 }));});
