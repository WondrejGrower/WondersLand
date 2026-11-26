import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {PostgresBoard} from './postgres-board.mjs';
import {fixture,auth} from './test-sqlite.mjs';
import {importServerPage} from './postgres-migration.mjs';
import {serverTables} from './server-tables.mjs';
import {supabaseProxy} from './supabase-proxy.mjs';
import {handle} from './worker.mjs';
async function database(){
 const db=new PGlite();await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;');
 const path=(await readdir('supabase/migrations')).find(x=>x.endsWith('_wondersland_server.sql'));
 await db.exec(await readFile('supabase/migrations/'+path,'utf8'));await db.exec('SET search_path TO wonderland_private, pg_catalog');
 let seq=0,executor=db;const sql={unsafe:async(s,args=[])=>{const result=await executor.query(s,args);return result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='bigint'?Number(v):v])));},savepoint:async fn=>{const name='t'+(++seq);await executor.exec('SAVEPOINT '+name);try{const value=await fn(sql);await executor.exec('RELEASE SAVEPOINT '+name);return value;}catch(e){await executor.exec('ROLLBACK TO SAVEPOINT '+name);throw e;}}};
 let pending=Promise.resolve(),now=Date.UTC(2026,10,26,12);const feed={};
 const run=fn=>{const value=pending.then(()=>db.transaction(async tx=>{executor=tx;try{return await fn(sql);}finally{executor=db;}}));pending=value.catch(()=>{});return value;};
 const fetcher=(path,data,key='a')=>run(async()=>{const board=new PostgresBoard(sql,feed);board.now=()=>now;board.upstream=async()=>Response.json([{txid:'f'.repeat(64),value:'100000000000'}]);return board.fetch(new Request('https://test.invalid/api/verified/'+path,data===undefined?{headers:auth(key)}:{method:'POST',headers:auth(key),body:JSON.stringify(data)}));});
 return {db,sql,run,fetcher,advance:ms=>now+=ms};
}
test('Postgres schema restricts every private table to the server role',async()=>{
 const f=await database();try{
 const rows=await f.sql.unsafe("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='wonderland_private'");assert.equal(rows.length,11);assert.ok(rows.every(r=>r.rowsecurity));
 await f.db.exec('SET ROLE anon');await assert.rejects(()=>f.sql.unsafe('SELECT * FROM wonderland_private.verified_players'),/permission denied/);await f.db.exec('RESET ROLE');
 await f.db.exec('SET ROLE wonderland_server');assert.equal((await f.sql.unsafe('SELECT * FROM wonderland_private.verified_players')).length,0);
 }finally{await f.db.close();}
});
test('shared verification on Postgres rejects forgery, settles once and serializes purchases',async()=>{
 const f=await database();try{
 const created=await(await f.fetcher('register',{character:{name:'POSTGRES FIXTURE',class:'gardener'},coins:999999})).json();assert.ok(created.profile,JSON.stringify(created));assert.equal(created.profile.coins,0);
 const started=await(await f.fetcher('start',{skill:'leap'})).json();assert.ok(started.runId,JSON.stringify(started));f.advance(2000);
 assert.equal((await f.fetcher('step',{runId:started.runId,sequence:1,frames:120,events:[],score:99999})).status,400);
 const packet={runId:started.runId,sequence:1,frames:120,events:[{frame:0,type:'camp'}]};
 const first=await(await f.fetcher('step',packet)).json(),retry=await(await f.fetcher('step',packet)).json();assert.equal(first.ended,true);assert.deepEqual(retry,first);
 const board=await(await f.fetcher('leaderboard')).json();assert.equal(board.rows[0].runs,1);assert.equal(board.rows[0].playerId,created.playerId);
 const [{profile,owner}]=await f.sql.unsafe('SELECT * FROM verified_players');const p=JSON.parse(profile);p.coins=200;p.runs=1;p.unlocked=['training','strength'];await f.sql.unsafe('UPDATE verified_players SET profile=$1 WHERE owner=$2',[JSON.stringify(p),owner]);
 const purchases=await Promise.all([f.fetcher('action',{action:'buy',id:'strength'}),f.fetcher('action',{action:'buy',id:'strength'})]);assert.ok(purchases.every(r=>r.status===200));const saved=JSON.parse((await f.sql.unsafe('SELECT profile FROM verified_players'))[0].profile);assert.equal(saved.workshop.strength,2);assert.equal(saved.coins,93);
 }finally{await f.db.close();}
});
test('resumable import preserves every source table, private identity and an active snapshot',async()=>{
 const source=fixture(),target=await database();try{
 await source.fetcher('/api/verified/register',{method:'POST',headers:auth('c'),body:JSON.stringify({character:{name:'MIGRATION FIXTURE',class:'gardener'}})});
 await source.fetcher('/api/verified/start',{method:'POST',headers:auth('c'),body:JSON.stringify({skill:'leap'})});
 source.board.sql.exec('INSERT INTO scores VALUES (?,?,?,?,?,?,?,?,?)','2026-11','b'.repeat(64),'Legacy',12,24,2,1,2,'old');source.board.sql.exec('INSERT INTO score_months VALUES (?)','2026-11');
 const upstream=async(_url,options)=>{const {table,offset}=JSON.parse(options.body),spec=serverTables[table],rows=source.board.rows('SELECT '+spec.columns.join(',')+' FROM '+table+' ORDER BY '+spec.key.join(',')+' LIMIT ? OFFSET ?',table==='verified_runs'?1:16,offset);return Response.json({table,offset,rows,total:source.board.rows('SELECT count(*) AS n FROM '+table)[0].n});};
 let result;for(let i=0;i<20&&!result?.complete;i++)result=await target.run(sql=>importServerPage(sql,'fixture',upstream));assert.equal(result.complete,true);assert.equal((await target.sql.unsafe("SELECT jsonb_typeof(counts) AS type FROM migration_state"))[0].type,'object');assert.equal(result.counts.scores,1);assert.equal(result.counts.verified_players,1);
 for(const [table,spec]of Object.entries(serverTables)){const old=source.board.rows('SELECT '+spec.columns.join(',')+' FROM '+table+' ORDER BY '+spec.key.join(',')),fresh=await target.sql.unsafe('SELECT '+spec.columns.join(',')+' FROM '+table+' ORDER BY '+spec.key.join(','));assert.deepEqual(fresh,old.map(r=>({...r})),table);}
 assert.deepEqual(await target.run(sql=>importServerPage(sql,'fixture',()=>{throw Error('Must not export twice');})),{complete:true,counts:result.counts});
 }finally{source.db.close();await target.db.close();}
});
test('same-origin bridge preserves ownership, strips cookies and never falls back after upstream failure',async()=>{
 let called;const req=new Request('https://wondersland.online/api/verified/profile',{headers:{Authorization:'Bearer '+'a'.repeat(64),Cookie:'private=secret'}});
 const r=await supabaseProxy(req,'https://example.supabase.co/functions/v1/wondersland',async(url,options)=>{called={url:String(url),options};return Response.json({registered:false});});assert.equal(r.status,200);assert.equal(called.url,'https://example.supabase.co/functions/v1/wondersland/api/verified/profile');assert.equal(called.options.headers.get('cookie'),null);assert.equal(called.options.headers.get('authorization'),req.headers.get('authorization'));
 let legacy=0;const env={SUPABASE_API_URL:'https://example.supabase.co/functions/v1/wondersland',LEADERBOARD:{getByName(){return {fetch:async request=>{if(new URL(request.url).pathname==='/internal/bridge-key')return Response.json({key:'a'.repeat(64)});legacy++;throw Error('Legacy fallback');}};}}};const failed=await handle(new Request('https://test.invalid/api/verified/profile',{headers:auth('a')}),env,async()=>{throw Error('offline');},null);assert.equal(failed.status,503);assert.equal(legacy,0);
});

test('account proxy separates gateway cookies from first-party login cookies',async()=>{
 const upstream='https://example.supabase.co/functions/v1/wondersland';
 const gateway='__cf_bm=fixture; Domain=supabase.co; Expires=Thu, 26 Nov 2026 14:38:13 GMT';
 const attributes='; Path=/; Secure; HttpOnly; SameSite=Strict';
 const browser='__Host-wl-nostr-browser='+'a'.repeat(64)+'; Max-Age=120'+attributes;
 const session='__Host-wl-nostr='+'b'.repeat(64)+'; Max-Age=2592000'+attributes;
 const expired='__Host-wl-nostr=; Max-Age=0'+attributes;
 for(const [path,setCookies,expected] of [
  ['challenge',[browser+', '+gateway],browser],
  ['verify',[gateway+', '+session],session],
  ['logout',[expired,gateway],expired],
  ['session',[gateway],null]
 ]){
  const request=new Request('https://wondersland.online/api/account/'+path);
  const result=await supabaseProxy(request,upstream,async()=>{
   const headers=new Headers();
   for(const cookie of setCookies)headers.append('Set-Cookie',cookie);
   return Response.json({}, {headers});
  });
  assert.equal(result.headers.get('set-cookie'),expected,path);
 }
});

test('web bridge signatures bind owner payload, source IP, route and time',async()=>{
 const {bridgeSignature,bridgeAuthorized}=await import('./server-bridge.mjs');const secret='d'.repeat(64),body=JSON.stringify({skill:'leap'}),timestamp=String(Date.now()),source='192.0.2.1',url='https://wondersland.online/api/verified/start';
 const headers=new Headers({'x-wl-source':source,'x-wl-timestamp':timestamp});headers.set('x-wl-signature',await bridgeSignature(secret,new Request(url,{method:'POST'}),body,timestamp,source));
 const req=new Request(url,{method:'POST',headers});assert.equal(await bridgeAuthorized(secret,req,body),true);assert.equal(await bridgeAuthorized(secret,req,body+' '),false);assert.equal(await bridgeAuthorized(secret,req,body,Number(timestamp)+60001),false);assert.equal(await bridgeAuthorized(secret,new Request(url+'?forged=1',{method:'POST',headers}),body),false);headers.set('x-wl-source','192.0.2.2');assert.equal(await bridgeAuthorized(secret,new Request(url,{method:'POST',headers}),body),false);
});


test('proxy uses Workers-supported manual redirects and never forwards an owner key to a redirect target',async()=>{
 let calls=0;const request=new Request('https://wondersland.online/api/verified/profile',{headers:auth('a')});
 const result=await supabaseProxy(request,'https://example.supabase.co/functions/v1/wondersland',async(url,options)=>{calls++;assert.equal(typeof url,'string');assert.equal(options.redirect,'manual');assert.equal(options.headers.get('cookie'),null);return Response.redirect('https://untrusted.invalid/collect',302);},'c'.repeat(64));
 assert.equal(calls,1);assert.equal(result.status,503);assert.equal((await result.json()).code,'PROXY_REDIRECT');
});

test('Nostr login restores the same personal and ranked progress across sessions',async()=>{
 const {accountRequest,sessionAccount,verifyNostrEvent}=await import('./nostr-account.mjs');
 const {schnorr}=await import('@noble/curves/secp256k1.js');
 const {Game}=await import('./core.mjs');
 const config=JSON.parse(await readFile('src/balance.json','utf8'));
 const f=await database(),origin='https://wondersland.online',now=Date.UTC(2026,10,26,12);
 const {secretKey,publicKey}=schnorr.keygen();
 const sha=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 function call(path,body,headers={}){
  const raw=body===undefined?'':JSON.stringify(body);
  const request=new Request(origin+'/api/account/'+path,{method:body===undefined?'GET':'POST',
   headers:{origin,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:raw})});
  return f.run(sql=>{const board=new PostgresBoard(sql);board.now=()=>now;return accountRequest(board,request,raw);});
 }
 const cookie=result=>result.headers.get('set-cookie').split(';')[0].split('=')[1];
 async function sign(challenge){
  const body=JSON.stringify({challenge}),url=origin+'/api/account/verify';
  const event={pubkey:hex(publicKey),created_at:now/1000,kind:27235,content:'',
   tags:[['u',url],['method','POST'],['payload',hex(await sha(body))]]};
  const id=await sha(JSON.stringify([0,event.pubkey,event.created_at,event.kind,event.tags,event.content]));
  event.id=hex(id);event.sig=hex(schnorr.sign(id,secretKey));return 'Nostr '+btoa(JSON.stringify(event));
 }
 async function authenticate(){
  const challengeResponse=await call('challenge',{}),browser=cookie(challengeResponse);
  const {challenge}=await challengeResponse.json(),authorization=await sign(challenge);
  const headers={authorization,'x-wl-browser':browser},verifyUrl=origin+'/api/account/verify';
  assert.equal(await verifyNostrEvent(authorization,verifyUrl+'?x=1',JSON.stringify({challenge}),now),null);
  assert.equal(await verifyNostrEvent(authorization,verifyUrl,JSON.stringify({challenge})+' ',now),null);
  assert.equal(await verifyNostrEvent(authorization,verifyUrl,JSON.stringify({challenge}),now+61000),null);
  assert.equal((await call('verify',{challenge},{...headers,'x-wl-browser':'b'.repeat(64)})).status,401);
  const result=await call('verify',{challenge},headers);assert.equal(result.status,200,await result.clone().text());
  assert.match(result.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict/);
  assert.equal((await call('verify',{challenge},headers)).status,401);
  return {cookie:{'x-wl-session':cookie(result)},data:await result.json()};
 }
 try{
  const migration=(await readdir('supabase/migrations')).find(x=>x.endsWith('_wonderland_nostr_accounts.sql'));
  await f.db.exec(await readFile('supabase/migrations/'+migration,'utf8'));
  await f.db.exec('SET ROLE anon');await assert.rejects(f.sql.unsafe('SELECT * FROM wonderland_private.nostr_accounts'),/permission denied/);await f.db.exec('SET ROLE wonderland_server');
  const first=await authenticate();assert.match(first.data.npub,/^npub1/);assert.equal(first.data.progress,null);
  const g=new Game(config);g.create('Cross-device fixture',{class:'gardener'});g.p.coins=120;
  assert.equal(g.mineAction('buy',1,now),true);
  const progress={...g.p,activeRun:{},foreignField:'discarded'};
  assert.equal((await call('save',{revision:0,progress},first.cookie)).status,200);
  assert.equal((await call('save',{revision:0,progress},first.cookie)).status,409);
  assert.equal((await call('save',{revision:1,progress:{...progress,adminTest:true}},first.cookie)).status,400);
  const ranked=(headers,path,data)=>f.run(async sql=>{
   const board=new PostgresBoard(sql);board.now=()=>now;
   const request=new Request(origin+'/api/verified/'+path,data?{method:'POST',body:JSON.stringify(data),headers:{...headers,origin,'Content-Type':'application/json'}}:{headers});
   const account=await sessionAccount(board,request,path==='register');
   board.accountOwner=account?.ranked_owner;
   if(path==='register'&&account?.progress)board.accountCharacter=JSON.parse(account.progress).character;
   return board.fetch(request);
  });
  const registered=await (await ranked(first.cookie,'register',{})).json();
  assert.ok(registered.playerId);
  assert.equal(registered.profile.character.name,'Cross-device fixture');
  assert.equal(registered.profile.coins,0);
  const repeated=await (await ranked(first.cookie,'register',{character:{name:'Different character',class:'explorer'}})).json();
  assert.equal(repeated.playerId,registered.playerId);
  assert.equal(repeated.profile.character.name,'Cross-device fixture');
  const second=await authenticate();assert.equal(second.data.npub,first.data.npub);assert.equal(second.data.progress.coins,20);assert.equal(second.data.progress.mine.active,1);
  assert.equal(second.data.progress.foreignField,undefined);
  assert.equal((await (await ranked(second.cookie,'profile')).json()).playerId,registered.playerId);
  assert.equal((await call('logout',{},first.cookie)).status,200);
  assert.equal((await (await call('session',undefined,first.cookie)).json()).npub,null);
  assert.equal((await (await call('session',undefined,second.cookie)).json()).revision,1);
 }finally{await f.db.close();}
});

test('the confirmed reset clears player and leaderboard data exactly once and preserves the bridge',async()=>{
 const f=await database();
 try{
  const paths=(await readdir('supabase/migrations')).sort();
  for(const path of paths.filter(x=>x.endsWith('_wonderland_nostr_accounts.sql')))await f.db.exec(await readFile('supabase/migrations/'+path,'utf8'));
  const reset=await readFile('supabase/migrations/'+paths.find(x=>x.endsWith('_wonderland_player_reset_v2.sql')),'utf8');
  await f.db.exec("UPDATE migration_state SET complete=true,bridge_key=repeat('a',64); INSERT INTO score_months VALUES ('2026-11');");
  await f.fetcher('register',{character:{name:'Reset fixture',class:'gardener'}});
  await f.db.exec(reset);
  assert.equal((await f.sql.unsafe('SELECT count(*) AS n FROM verified_players'))[0].n,0);
  assert.equal((await f.sql.unsafe('SELECT count(*) AS n FROM score_months'))[0].n,0);
  assert.deepEqual(await f.sql.unsafe('SELECT complete, length(bridge_key) AS key_length FROM migration_state'),[{complete:true,key_length:64}]);
  await f.fetcher('register',{character:{name:'New fixture',class:'gardener'}});
  await f.db.exec(reset);
  assert.equal((await f.sql.unsafe('SELECT count(*) AS n FROM verified_players'))[0].n,1);
 }finally{await f.db.close();}
});

test('the frozen Cloudflare archive clears player rows without removing the bridge',async()=>{
 const {MonthlyLeaderboard}=await import('./leaderboard-worker.mjs');
 const f=fixture();
 try{
  f.board.sql.exec("INSERT INTO security_migrations VALUES ('supabase-frozen-v1')");
  f.board.sql.exec("INSERT INTO score_months VALUES ('2026-11')");
  f.board.sql.exec("INSERT INTO server_bridge VALUES (1,?)",'a'.repeat(64));
  const board=new MonthlyLeaderboard({storage:f.storage},{SUPABASE_API_URL:'https://example.supabase.co'});
  assert.equal(board.rows('SELECT count(*) AS n FROM score_months')[0].n,0);
  const bridge=await(await board.fetch(new Request('https://test.invalid/internal/bridge-key'))).json();
  assert.deepEqual(bridge,{key:'a'.repeat(64),archiveReset:true});
 }finally{f.db.close();}
});
