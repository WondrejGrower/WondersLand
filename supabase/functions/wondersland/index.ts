import postgres from 'postgres';
import {probeServer} from '../../../web/postgres-probe.mjs';
import {bridgeAuthorized} from '../../../web/server-bridge.mjs';
import {readJson} from '../../../web/limits.mjs';
import {handle} from '../../../web/worker.mjs';
import {PostgresBoard,postgresOptions,withServerTransaction,serverVersion} from '../../../web/postgres-board.mjs';
import {importServerPage} from '../../../web/postgres-migration.mjs';
import {migrationAuthorized} from '../../../web/server-migration.mjs';
const client=postgres(Deno.env.get('SUPABASE_DB_URL')!,postgresOptions);
const feed={};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
Deno.serve(async request=>{
 const url=new URL(request.url),path=url.pathname.replace(/^\/wondersland(?=\/|$)/,'').replace(/^\/functions\/v1\/wondersland(?=\/|$)/,'');
 const normalized=new URL('https://wondersland.online'+path+url.search);
 // Keep the browser API same-origin and preserve its private ownership credential.
 const req=new Request(normalized,request);
 try{
  if(path==='/health')return await withServerTransaction(client,async sql=>{
   const [state]=await sql.unsafe('SELECT complete,counts FROM migration_state WHERE id=1');
   return json({...serverVersion,ready:state.complete,migration:state.complete?'complete':'pending'});
  });
  if(path==='/internal/probe'){
   if(req.method!=='POST'||!await migrationAuthorized(req))return json({error:'Forbidden'},403);
   return await withServerTransaction(client,async sql=>{const [state]=await sql.unsafe('SELECT complete FROM migration_state WHERE id=1');if(state.complete)return json({error:'Migration closed'},410);return json(await probeServer(sql));});
  }
  if(path==='/internal/migrate'){
   if(req.method!=='POST'||!await migrationAuthorized(req))return json({error:'Forbidden'},403);
   return await withServerTransaction(client,async sql=>json(await importServerPage(sql,req.headers.get('authorization')!)));
  }
  if(!path.startsWith('/api/')||path==='/api/supabase-migration'||path.startsWith('/api/admin-test/'))return json({error:'Not found'},404);
  const publicFeed=path==='/api/mempool'||/^\/api\/tx\/[a-f0-9]{64}\/status$/.test(path);
  if(publicFeed)return handle(req,{},fetch,null);
  if(!/^\/api\/(?:leaderboard(?:\/(?:start|finish))?|verified\/(?:profile|register|action|start|step|leaderboard))$/.test(path))return json({error:'Not found'},404);
  if(path.startsWith('/api/verified/')&&path!=='/api/verified/leaderboard'&&!/^Bearer [a-f0-9]{64}$/.test(req.headers.get('authorization')||''))return json({error:'Missing player key'},401);
  const result=await withServerTransaction(client,async sql=>{
   const [state]=await sql.unsafe('SELECT complete,bridge_key FROM migration_state WHERE id=1');
   if(!state.complete)return json({error:'Server migration in progress'},503);
   const body=req.method==='POST'?JSON.stringify(await readJson(req.clone(),16384,{timeoutMs:5000})):'';
   if(!await bridgeAuthorized(state.bridge_key,req,body))return json({error:'Invalid web server signature'},403);
   const board=new PostgresBoard(sql,feed),now=board.now();
   // A persistent ceiling across all isolates; per-owner limits are in the shared protocol.
   if(!await board.rate('all',now,1800))return json({error:'Please try again shortly'},429);
   const headers=new Headers(req.headers);headers.set('CF-Connecting-IP',req.headers.get('x-wl-source')!);
   // Source IP is covered by the web server's HMAC, independently of player ownership.
   if(!await board.rate('ip:'+req.headers.get('x-wl-source'),now,120))return json({error:'Please try again shortly'},429);
   return await handle(new Request(req.url,{method:req.method,headers,body:req.body,duplex:'half'} as RequestInit),{LEADERBOARD:{getByName:()=>board}},fetch,null);
  });
  return result;
 }catch(error){
  // Diagnostic code only: never emit SQL, credentials, private saves or request bodies.
  console.error('wondersland_backend_error',{code:typeof error?.code==='string'?error.code:'runtime'});
  return json({error:'Server temporarily unavailable'},503);
 }
});
