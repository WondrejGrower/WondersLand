const idPattern=/^\/api\/tx\/([a-f0-9]{64})\/status$/;
export async function handle(request,env,upstream=fetch,edgeCache=globalThis.caches?.default){
 const url=new URL(request.url);
 if(url.hostname==='www.wondersland.online'){url.hostname='wondersland.online';return Response.redirect(url.toString(),301);}
 if(url.pathname==='/health')return Response.json({application:'WondersLand [WL]',version:'0.3.3',balance:'wl-0.3-journey-4'});
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 const match=url.pathname.match(idPattern),recent=url.pathname==='/api/mempool';
 if(!recent&&!match)return new Response('Not found',{status:404});
 const cacheKey=new Request(url.origin+url.pathname);
 if(edgeCache){const cached=await edgeCache.match(cacheKey);if(cached)return cached;}
 try{
  const endpoint=recent?'https://mempool.space/api/mempool/recent':'https://mempool.space/api/tx/'+match[1]+'/status';
  const response=await upstream(endpoint,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)return Response.json({error:'Mempool source unavailable'},{status:502});
  const data=await response.json();if((recent&&!Array.isArray(data))||(!recent&&typeof data.confirmed!=='boolean'))throw Error('Invalid response');
  const out=Response.json(data,{headers:{'Cache-Control':recent?'public, max-age=0, s-maxage=5':'public, max-age=15','X-Content-Type-Options':'nosniff'}});
  if(edgeCache)await edgeCache.put(cacheKey,out.clone());return out;
 }catch{return Response.json({error:'Mempool source unavailable'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
export default {fetch(request,env){return handle(request,env);}};
