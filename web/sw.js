// Cache only the explicit offline notice. Never cache API, saves or game modules.
const CACHE='wl-offline-v2',OFFLINE='/offline.html';
// Normalize the cached response: static hosting may redirect .html to a clean URL.
// A redirected Response cannot satisfy a manual-redirect navigation offline.
self.addEventListener('install',event=>{event.waitUntil((async()=>{const response=await fetch(OFFLINE,{cache:'reload'});if(!response.ok)throw Error('Offline notice unavailable');const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-length');await(await caches.open(CACHE)).put(OFFLINE,new Response(await response.arrayBuffer(),{status:response.status,headers}));})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('wl-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
// No skipWaiting: an updated worker waits rather than disrupting an active run.
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||event.request.mode!=='navigate')return;
 if(url.pathname!=='/'&&url.pathname!=='/index.html')return;
 event.respondWith(fetch(event.request).catch(async()=>{
  const response=await(await caches.open(CACHE)).match(OFFLINE);
  return response||new Response('WondersLand needs a connection. Please reconnect and reload.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 }));
});
