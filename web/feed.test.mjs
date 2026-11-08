import test from 'node:test';
import assert from 'node:assert/strict';
import {TransactionFeed} from './feed.mjs';
import {Queue} from './core.mjs';
import {inputKey} from './input.mjs';
test('physical WASD and action keys survive modifiers and layout; shortcuts stay separate',()=>{
 for(const letter of 'WASDEFPB')for(const key of [letter,letter.toLowerCase(),'ě'])assert.equal(inputKey({code:'Key'+letter,key}),letter.toLowerCase());
 assert.equal(inputKey({code:'KeyW',key:'w',ctrlKey:true}),'');
 assert.equal(inputKey({code:'ArrowUp',key:'ArrowUp'}),'ArrowUp');
});
test('feed replenishes beyond ten unique transactions, stops at reserve, hides and recovers',async()=>{
 const q=new Queue();let calls=0,delay,hidden=false,fail=false,net;
 const feed=new TransactionFeed({queue:()=>q,active:()=>true,visible:()=>!hidden,receive:rows=>q.receive(rows),status:s=>net=s,
  schedule:(_,ms)=>{delay=ms;return 1;},cancel:()=>{},request:async(url,options)=>{
   assert.equal(options.cache,'no-store');calls++;if(fail)throw Error('offline');
   return Response.json(Array.from({length:10},(_,i)=>({txid:(calls*10+i).toString(16).padStart(64,'0'),value:'42000000'})));
  }});
 await feed.refresh();assert.equal(q.pending.length,10);assert.equal(delay,5000);
 q.begin(1);for(let i=0;i<10;i++)assert.ok(q.take());assert.equal(q.take(),null);
 await feed.refresh();assert.equal(q.pending.length,10);assert.ok(q.take());assert.equal(net,'live');
 for(let i=0;i<8;i++)await feed.refresh();const before=calls;await feed.refresh();assert.equal(calls,before);
 q.pending=[];hidden=true;await feed.refresh();assert.equal(calls,before);
 hidden=false;fail=true;await feed.refresh();assert.equal(net,'offline');assert.equal(delay,5000);
 await feed.refresh();assert.equal(delay,10000);fail=false;await feed.refresh();assert.equal(net,'live');assert.equal(delay,5000);
});
test('recorded feed loads only once and never starts a live request',async()=>{
 let calls=0,timers=0;
 const feed=new TransactionFeed({recorded:true,queue:()=>({pending:[]}),active:()=>true,visible:()=>true,receive:()=>{},status:()=>{},schedule:()=>timers++,cancel:()=>{},request:async url=>{assert.equal(url,'./recorded.json');calls++;return Response.json({transactions:[]});}});
 await feed.refresh();await feed.refresh();assert.equal(calls,1);assert.equal(timers,0);
});
