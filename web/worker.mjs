import {adminRoute} from './admin-test.mjs';
import balance from '../src/balance.json' with {type:'json'};
import {readJson} from './limits.mjs';
import {secure,allowed} from './security.mjs';
export {MonthlyLeaderboard} from './leaderboard-worker.mjs';
const idPattern=/^\/api\/tx\/([a-f0-9]{64})\/status$/;
const failure=(message,status=502,ttl=0)=>Response.json({error:message},{status,headers:{'Cache-Control':ttl?'public, max-age=0, s-maxage='+ttl:'no-store',...(status===429?{'Retry-After':'60'}:{})}});
async function route(request,env,upstream,edgeCache){
 const url=new URL(request.url);
 if((url.protocol==='http:'&&['wondersland.online','www.wondersland.online'].includes(url.hostname))||url.hostname==='www.wondersland.online'){url.protocol='https:';url.hostname='wondersland.online';return Response.redirect(url.toString(),301);}
 if(url.pathname==='/health')return Response.json({application:'WondersLand [WL]',version:'0.3.3',balance:balance.balanceVersion});
 if(['/test','/test/','/api/admin-test/session','/api/admin-test/status'].includes(url.pathname)){if(!await allowed(request,env))return failure('Please try again shortly',429);return adminRoute(request,env);}
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(!await allowed(request,env))return new Response('Please try again shortly',{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
 if(/^\/api\/leaderboard(?:\/(?:start|finish))?$/.test(url.pathname)||/^\/api\/verified\/(?:profile|register|action|start|step|leaderboard)$/.test(url.pathname)){
  if(request.method==='POST'&&['/api/leaderboard/start','/api/leaderboard/finish'].includes(url.pathname))return Response.json({error:'Client-reported submissions are closed',acceptingSubmissions:false},{status:410,headers:{'Cache-Control':'no-store'}});
  if(request.method==='POST'&&url.pathname.startsWith('/api/verified/')){
   if(!/^Bearer [a-f0-9]{64}$/.test(request.headers.get('authorization')||''))return failure('Missing player key',401);
   if(!request.headers.get('content-type')?.startsWith('application/json'))return failure('JSON required',415);
   let body;try{body=await readJson(request,16384,{timeoutMs:5000});}catch(error){return failure('Invalid request body',error.message==='Response too large'?413:400);}
   const headers=new Headers(request.headers);headers.delete('content-length');request=new Request(request.url,{method:'POST',headers,body:JSON.stringify(body)});
  }
  if(!env.LEADERBOARD)return failure('Leaderboard unavailable',503);
  const reading=request.method==='GET'&&['/api/leaderboard','/api/verified/leaderboard'].includes(url.pathname),month=url.searchParams.get('month')||new Date().toISOString().slice(0,7),metric=url.searchParams.get('metric')||'best';
  if(reading&&(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)||month>new Date().toISOString().slice(0,7)||!['best','total','attempts'].includes(metric)))return failure('Invalid month or ranking',400);
  const cacheKey=reading?new Request(url.origin+url.pathname+'?month='+month+'&metric='+metric+'&rules='+balance.balanceVersion):null;
  if(cacheKey&&edgeCache){const cached=await edgeCache.match(cacheKey);if(cached)return cached;}
  try{const response=await env.LEADERBOARD.getByName('monthly-v1').fetch(request);if(reading&&response.ok){const headers=new Headers(response.headers);headers.set('Cache-Control','public, max-age=0, s-maxage=10');const out=new Response(response.body,{status:response.status,headers});if(edgeCache)await edgeCache.put(cacheKey,out.clone());return out;}return response;}catch{return failure('Leaderboard unavailable',503);}
 }
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 const match=url.pathname.match(idPattern),recent=url.pathname==='/api/mempool';
 if(!recent&&!match)return new Response('Not found',{status:404});
 const cacheKey=new Request(url.origin+url.pathname);if(edgeCache){const cached=await edgeCache.match(cacheKey);if(cached)return cached;}
 let out;
 try{
  const endpoint=recent?'https://mempool.space/api/mempool/recent':'https://mempool.space/api/tx/'+match[1]+'/status';
  const response=await upstream(endpoint,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)out=failure(!recent&&response.status===404?'Transaction not found':'Mempool source unavailable',!recent&&response.status===404?404:502,5);
  else{
   const data=await readJson(response,recent?128*1024:16384);let clean;
   if(recent){if(!Array.isArray(data)||data.length>1024)throw Error('Invalid response');clean=[];for(const row of data){if(!row||typeof row!=='object'||typeof row.txid!=='string'||!/^[a-f0-9]{64}$/.test(row.txid)||!['number','string'].includes(typeof row.value))continue;const value=String(row.value);if(value.length>16||!/^\d+$/.test(value)||BigInt(value)>2100000000000000n)continue;clean.push({txid:row.txid,value:BigInt(value).toString()});}if(data.length&&!clean.length)throw Error('Invalid response');}
   else{if(!data||typeof data.confirmed!=='boolean')throw Error('Invalid response');clean={confirmed:data.confirmed};}
   out=Response.json(clean,{headers:{'Cache-Control':recent?'public, max-age=0, s-maxage=5':'public, max-age=15'}});
  }
 }catch{out=failure('Mempool source unavailable',502,3);}
 if(edgeCache)await edgeCache.put(cacheKey,out.clone());return out;
}
export async function handle(request,env,upstream=fetch,edgeCache=globalThis.caches?.default){const url=new URL(request.url);try{return secure(await route(request,env,upstream,edgeCache),url);}catch{return secure(failure('Service unavailable',503),url);}}
export default {fetch(request,env){return handle(request,env);}};
