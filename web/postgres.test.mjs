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
 let result;for(let i=0;i<20&&!result?.complete;i++)result=await target.run(sql=>importServerPage(sql,'fixture',upstream));assert.equal(result.complete,true);
 for(const [table,spec]of Object.entries(serverTables)){const old=source.board.rows('SELECT '+spec.columns.join(',')+' FROM '+table+' ORDER BY '+spec.key.join(',')),fresh=await target.sql.unsafe('SELECT '+spec.columns.join(',')+' FROM '+table+' ORDER BY '+spec.key.join(','));assert.deepEqual(fresh,old.map(r=>({...r})),table);}
 assert.deepEqual(await target.run(sql=>importServerPage(sql,'fixture',()=>{throw Error('Must not export twice');})),{complete:true,counts:result.counts});
 }finally{source.db.close();await target.db.close();}
});
test('same-origin bridge preserves ownership, strips cookies and never falls back after upstream failure',async()=>{
 let called;const req=new Request('https://wondersland.online/api/verified/profile',{headers:{Authorization:'Bearer '+'a'.repeat(64),Cookie:'private=secret'}});
 const r=await supabaseProxy(req,'https://example.supabase.co/functions/v1/wondersland',async(url,options)=>{called={url:String(url),options};return Response.json({registered:false});});assert.equal(r.status,200);assert.equal(called.url,'https://example.supabase.co/functions/v1/wondersland/api/verified/profile');assert.equal(called.options.headers.get('cookie'),null);assert.equal(called.options.headers.get('authorization'),req.headers.get('authorization'));
 let legacy=0;const env={SUPABASE_API_URL:'https://example.supabase.co/functions/v1/wondersland',LEADERBOARD:{getByName(){return {fetch:async request=>{if(new URL(request.url).pathname==='/internal/bridge-key')return Response.json({key:'a'.repeat(64)});legacy++;throw Error('Legacy fallback');}};}}};const failed=await handle(new Request('https://test.invalid/api/verified/profile',{headers:auth('a')}),env,async()=>{throw Error('offline');},null);assert.equal(failed.status,503);assert.equal(legacy,0);
});

test('web bridge signatures bind owner payload, source IP, route and time',async()=>{
 const {bridgeSignature,bridgeAuthorized}=await import('./server-bridge.mjs');const secret='d'.repeat(64),body=JSON.stringify({skill:'leap'}),timestamp=String(Date.now()),source='192.0.2.1',url='https://wondersland.online/api/verified/start';
 const headers=new Headers({'CF-Connecting-IP':source,'x-wl-timestamp':timestamp});headers.set('x-wl-signature',await bridgeSignature(secret,new Request(url,{method:'POST'}),body,timestamp,source));
 const req=new Request(url,{method:'POST',headers});assert.equal(await bridgeAuthorized(secret,req,body),true);assert.equal(await bridgeAuthorized(secret,req,body+' '),false);assert.equal(await bridgeAuthorized(secret,req,body,Number(timestamp)+60001),false);assert.equal(await bridgeAuthorized(secret,new Request(url+'?forged=1',{method:'POST',headers}),body),false);headers.set('CF-Connecting-IP','192.0.2.2');assert.equal(await bridgeAuthorized(secret,new Request(url,{method:'POST',headers}),body),false);
});
