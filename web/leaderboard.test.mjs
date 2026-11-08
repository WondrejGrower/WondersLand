import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {MonthlyLeaderboard} from './leaderboard-worker.mjs';import {LeaderboardClient} from './leaderboard-client.mjs';import {Game,fresh} from './core.mjs';import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../src/balance.json',import.meta.url)));
function fixture(){const db=new DatabaseSync(':memory:');const storage={sql:{exec(sql,...args){const s=db.prepare(sql);return s.columns().length?s.all(...args):(s.run(...args),[]);}},transactionSync(fn){db.exec('BEGIN');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};const board=new MonthlyLeaderboard({storage});let now=Date.UTC(2026,10,30,23,59);board.now=()=>now;const fetcher=(path,options={})=>board.fetch(new Request('https://game.test'+path,options));return {board,fetcher,advance:ms=>now+=ms,db};}
const headers=key=>({'Authorization':'Bearer '+key.repeat(64),'Content-Type':'application/json'});
const start=(f,key,id,extra={})=>f.fetcher('/api/leaderboard/start',{method:'POST',headers:headers(key),body:JSON.stringify({runId:id,name:key==='a'?'Alice':'Bob',role:'gardener',mode:'live',rules:config.balanceVersion,...extra})});
const finish=(f,key,ticket,score,seconds)=>f.fetcher('/api/leaderboard/finish',{method:'POST',headers:headers(key),body:JSON.stringify({ticket,score,seconds})});
test('shared monthly best, total and attempt rankings persist, deduplicate and roll over by server UTC',async()=>{
 const f=fixture();const a=await(await start(f,'a','first')).json();f.advance(20000);assert.equal((await finish(f,'a',a.ticket,100,20)).status,200);assert.equal((await finish(f,'a',a.ticket,100,20)).status,200);
 const b=await(await start(f,'b','second')).json();f.advance(10000);await finish(f,'b',b.ticket,120,10);
 const a2=await(await start(f,'a','third')).json();f.advance(10000);await finish(f,'a',a2.ticket,60,10);
 const zero=await(await start(f,'b','aborted')).json();await finish(f,'b',zero.ticket,0,0);
 const best=await(await f.fetcher('/api/leaderboard?month=2026-11')).json();assert.deepEqual(best.rows.map(r=>[r.name,r.best,r.total,r.runs]),[['Bob',120,120,2],['Alice',100,160,2]]);assert.ok(best.rows.every(r=>!('owner'in r)&&!('ticket'in r)));
 const total=await(await f.fetcher('/api/leaderboard?month=2026-11&metric=total')).json();assert.equal(total.rows[0].name,'Alice');
 const restarted=new MonthlyLeaderboard({storage:f.board.ctx.storage});restarted.now=f.board.now;assert.equal((await(await restarted.fetch(new Request('https://game.test/api/leaderboard?month=2026-11'))).json()).rows.length,2);
 f.advance(60000);const next=await(await f.fetcher('/api/leaderboard')).json();assert.equal(next.month,'2026-12');assert.deepEqual(next.rows,[]);assert.equal((await(await f.fetcher('/api/leaderboard?month=2026-11&metric=attempts')).json()).rows[0].runs,2);
});
test('write API rejects training, spoofed identity, invalid scores, impossible duration and expired tickets',async()=>{
 const f=fixture();assert.equal((await start(f,'a','demo',{mode:'demo'})).status,400);assert.equal((await start(f,'a','old',{rules:'old'})).status,400);
 assert.equal((await start(f,'a','run-123-0.5')).status,200,'legacy browser run IDs remain eligible');const ticket=await(await start(f,'a','valid')).json();assert.equal((await finish(f,'b',ticket.ticket,1,1)).status,404);assert.equal((await finish(f,'a',ticket.ticket,5000,1)).status,422);assert.equal((await finish(f,'a',ticket.ticket,-1,1)).status,400);
 assert.equal((await f.fetcher('/api/leaderboard/start',{method:'POST',headers:headers('a'),body:'null'})).status,400);
 assert.equal((await start(f,'a','valid')).status,200);
 f.advance(7200001);assert.equal((await finish(f,'a',ticket.ticket,10,1)).status,410);
 assert.equal((await f.fetcher('/api/leaderboard?month=2026-13')).status,400);
});
test('browser outbox retries without duplicate attempts and training/replays never emit live results',async()=>{
 const f=fixture(),map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};let offline=false;
 const client=new LeaderboardClient({storage,fetcher:(...args)=>offline?Promise.reject(Error('offline')):f.fetcher(...args)});
 const meta={runId:'outbox',name:'Willow',role:'gardener',mode:'live',rules:config.balanceVersion};client.begin(meta);await client.sessions.get(meta.runId).promise;f.advance(10000);offline=true;client.finish({...meta,score:50,seconds:10});await client.flush();assert.equal(client.queue.length,1);
 offline=false;const restored=new LeaderboardClient({storage,fetcher:f.fetcher});await restored.flush();assert.equal(restored.queue.length,0);const rows=(await(await f.fetcher('/api/leaderboard')).json()).rows;assert.equal(rows[0].runs,1);assert.equal(rows[0].total,50);
 const g=new Game(config,{...fresh(),character:{name:'Willow',class:'gardener'}});const events=[];g.onLiveRunFinished=e=>events.push(e);g.startPractice('flower');g.distance=200;g.camp();assert.deepEqual(events,[]);g.receive([{txid:'a'.repeat(64),value:'0'}]);g.replay=true;g.start(false,42);g.choose(0);g.distance=100;g.camp();assert.deepEqual(events,[]);g.replay=false;g.start(false,42);g.choose(0);g.distance=42;g.time=5;g.camp();g.settle();assert.equal(events.length,1);assert.equal(events[0].score,42);
});
