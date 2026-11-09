import * as renderer from './pixels.mjs';
import * as Visual from './plant-visual.mjs';
import * as Data from './environment-regions.mjs';
import * as botanical from './environment.mjs';
import {drawRun} from './art.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Game,fresh,plant,height} from './core.mjs';
const config=JSON.parse(readFileSync(new URL('../src/balance.json',import.meta.url)));
const profile=level=>({...fresh(),character:{name:'Willow',class:'gardener'},workshop:{agility:level}});
const rows=Array.from({length:40},(_,i)=>({txid:i.toString(16).padStart(64,'0'),value:'0'}));
function expedition(level){const g=new Game(config,profile(level));g.receive(rows);g.start(false,42);g.choose(0);return g;}
test('agility slows the entire simulation by at most two percent, with identical trajectories in game time',()=>{
 const normal=expedition(0),slow=expedition(50);assert.equal(normal.stats().timeScale,1);assert.equal(slow.stats().timeScale,.98);assert.equal(expedition(1).stats().timeScale,.9996);assert.throws(()=>expedition(999),/Invalid progress/);const capped=expedition(50);capped.p.workshop.agility=999;assert.equal(capped.stats().timeScale,.98);assert.equal(slow.stats().buffer,normal.stats().buffer);
 normal.jump();slow.jump();for(let i=0;i<120;i++){normal.tick(.98/120);slow.tick(1/120);}
 for(const key of ['time','distance','y','velocity','spawn','fuel'])assert.ok(Math.abs(normal[key]-slow[key])<1e-8,key);
 const realNormal=expedition(0),realSlow=expedition(50);for(let i=0;i<120;i++){realNormal.tick(1/120);realSlow.tick(1/120);}assert.ok(Math.abs(realSlow.time/realNormal.time-.98)<1e-10);assert.ok(realSlow.distance<realNormal.distance);
 normal.camp();slow.camp();normal.moves.add('right');slow.moves.add('right');normal.tick(.1);slow.tick(.1);assert.equal(normal.campX,slow.campX);
 normal.phase=slow.phase='countdown';normal.countdown=slow.countdown=3;normal.tick(.1);slow.tick(.1);assert.equal(normal.countdown,slow.countdown);
});
test('420 decimal satoshi prefix uses cannabis art without changing size, amount or TXID',()=>{
 for(const value of ['420','4200','42000000','4200000000']){const p=plant(value,config);assert.equal(p.type,'cannabis');assert.equal(p.h,height(value,config));assert.equal(p.sats,value);}
 assert.notEqual(plant('1420000',config).type,'cannabis');const g=expedition(0);g.q.pending=[];g.q.receive([{txid:'f'.repeat(64),value:'42000000'}]);g.spawnPlant();assert.equal(g.obstacles[0].type,'cannabis');assert.equal(g.obstacles[0].txid,'f'.repeat(64));assert.equal(g.obstacles[0].sats,'42000000');
});
test('torso, gloves, boots and pouch deform with the six run poses instead of staying stationary',()=>{
 for(const id of ['torso_green_tunic','torso_slate_cape','torso_work_apron','hands_leather_work_gloves','feet_brown_leather_boots','belt_leather_pouch']){
  const layers=Array.from({length:6},(_,pose)=>renderer.wearablePixels(id,pose));assert.ok(new Set(layers.map(p=>JSON.stringify(p))).size>=4,id);
  for(const pixels of layers){assert.ok(pixels.length>5);for(const [x,y]of pixels)assert.ok(x>=0&&x<24&&y>=0&&y<40,id);}
 }
 const glove0=renderer.wearablePixels('hands_leather_work_gloves',0),glove1=renderer.wearablePixels('hands_leather_work_gloves',1);
 assert.ok(glove0.some(([x,y])=>Math.hypot(x-2.5,y-22.9)<2));assert.ok(glove1.some(([x,y])=>Math.hypot(x-9.3,y-22.4)<2));
 assert.deepEqual(renderer.wearablePixels(null,0),[]);
});
test('all environment motifs have unique regions; giant plants use bounded visible modules',()=>{
assert.equal(Object.keys(Data.regions).length,24);assert.ok(Data.regions.flora_cannabis);assert.equal(new Set(Object.values(Data.regions).map(r=>r.atlas+':'+r.rect)).size,24);
 const environment=botanical;const calls=[],ctx={save(){},restore(){},translate(){},scale(){},fillRect(){},drawImage:(...args)=>calls.push(args)};environment.plant(ctx,{type:'sequoia',x:500,w:96,h:1e12},284);assert.ok(calls.length>0&&calls.length<100);for(const call of calls){assert.ok(call.slice(1).every(Number.isFinite));assert.ok(call.at(-1)<=360);assert.ok(call.at(-3)>=0);}
});

function drawing(p){const calls=[];const c={save(){},restore(){},translate(...a){calls.push(['translate',...a]);},scale(...a){calls.push(['scale',...a]);},drawImage(...a){calls.push(['image',...a]);},fillRect(...a){calls.push(['fill',this.fillStyle,...a]);}};botanical.plant(c,p,284);return calls;}
test('species boundaries, zero, anchors and unbounded height retain the current monotone curve',()=>{
 const bounds=[0,100000,350000,800000,1000000,100000000,1000000000,100000000000];
 const types=['flower','tulip','rose','fern','birch','pine','oak','sequoia'];
 for(let i=0;i<bounds.length;i++){
  const a=bounds[i],b=bounds[i+1]||1e12,values=[a,a+1,Math.floor(Math.sqrt(Math.max(1,a)*b)),b-1,b].sort((a,b)=>a-b);
  let prev=0;for(const v of values){const p=plant(String(v),config);assert.ok(p.h>=prev);prev=p.h;}
  assert.equal(plant(String(a),config).type,types[i]);if(i)assert.equal(plant(String(a-1),config).type,types[i-1]);
 }
 assert.equal(height('0',config),4);assert.equal(height('1',config),4);
 for(const [v,h]of config.anchors)assert.equal(height(String(v),config),h);
 assert.ok(height('10000000000000',config)>365);
 assert.equal(plant('42000000',config).type,'cannabis');assert.equal(plant('1000000',config).type,'birch');
});
test('botanical fixtures and deterministic drawing agree',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('../tests/plant-visual.json',import.meta.url)));
 for(const f of fixtures){const p=plant(f.sats,config);assert.equal(p.h,f.h);assert.equal(p.w,f.w);assert.deepEqual(Visual.descriptor(p.type,p.sats,p.h,f.txid,f.fixture),f.visual);p.visual=f.visual;p.x=200;assert.deepEqual(drawing(p),drawing(structuredClone(p)));}
 for(const sats of ['70000','200000','600000','900000','90000000','900000000','90000000000','300000000000','42000000']){
  const p={...plant(sats,config),x:200};const pictures=new Set();for(let i=0;i<4;i++){p.visual=Visual.descriptor(p.type,p.sats,p.h,String(i).padStart(64,'0'),'');pictures.add(JSON.stringify(drawing(p)));}assert.equal(pictures.size,4,p.type);
 }
});
test('visual creation consumes no random stream; frozen obstacles survive incoming data and waiting freezes resources',()=>{
 const g=expedition(0);g.spawnPlant();const before=structuredClone(g.obstacles);g.receive([{txid:'e'.repeat(64),value:'1000000000'}]);assert.deepEqual(g.obstacles,before);
 const random=Math.random;try{Math.random=()=>{throw Error('visual RNG leaked');};for(let i=0;i<50;i++)Visual.descriptor('birch','10000000',48,String(i),'');}finally{Math.random=random;}
 g.phase='waiting';const state=[g.time,g.distance,g.fuel,g.spawn,g.invulnerable];g.tick(.25);assert.deepEqual([g.time,g.distance,g.fuel,g.spawn,g.invulnerable],state);
});
test('viewport clipping bounds work and coordinates independently of total height',()=>{
 for(const h of [365,1e6,1e12])for(const x of [-80,0,600,700]){
  const p={type:'sequoia',sats:'1000000000000',txid:'420',x,w:96,h};const ops=drawing(p);assert.ok(ops.length<350);
  for(const a of ops)for(const v of a.slice(1))if(typeof v==='number')assert.ok(Number.isFinite(v));
  for(const a of ops.filter(a=>a[0]==='image')){const [dx,dy,dw,dh]=a.slice(-4);assert.ok(dx>=0&&dy>=0&&dx+dw<=640.00001&&dy+dh<=360.00001);}
  if(x===700)assert.equal(ops.length,0);
 }
});

test('shared high-jump camera keeps the character visible without scaling transaction geometry',()=>{
 const g=expedition(0);g.spawnPlant();const state=g.state(),characterCalls=[];state.profile={...state.profile,character:{...state.profile.character,skin:'#ff00ff',hair:'#ff00ff'}};
 const c={reset(){},save(){},restore(){},scale(){},translate(){},fillRect(){},strokeRect(){},fillText(){}};
 c.fillStyle='';c.drawImage=()=>{};c.imageSmoothingEnabled=false;
 // Inspect actual rendered character pixels and immutable obstacle descriptors.
 c.fillRect=(x,y,w,h)=>{if(w===1&&h===1&&/^#[0-9a-f]{2}00[0-9a-f]{2}$/i.test(c.fillStyle)&&c.fillStyle!=='#000000')characterCalls.push({x,y});};
 for(const y of [0,100,180,243,320,450]){
  state.y=y;characterCalls.length=0;
  const before=structuredClone(state.obstacles);
  drawRun(c,state,v=>v,640,360);
  assert.ok(characterCalls.length>0);assert.ok(characterCalls.every(p=>p.y>=0&&p.y<360));
  assert.deepEqual(state.obstacles,before);
 }
});


test('flight poses stay continuous through the apex and landing keeps feet anchored without a head snap',()=>{
 function picture(mode,velocity,landing,equipment){
  const pixels=[];const c={fillRect(x,y,w,h){pixels.push([x,y,w,h,this.fillStyle]);}};
  renderer.character(c,0,0,{hair:'#5e3936',skin:'#dfaf87',hairStyle:0},0,false,false,mode,equipment,false,{velocity,landing});
  return {pixels,top:Math.min(...pixels.map(p=>p[1])),bottom:Math.max(...pixels.map(p=>p[1]+p[3]))};
 }
 for(const torso of ['torso_green_tunic','torso_rust_coat']){
  const equipment={...config.starterEquipment,torso};
  assert.deepEqual(picture('jump',0,0,equipment),picture('fall',0,0,equipment),'apex cannot switch the whole dressed silhouette');
  const rise=picture('jump',140,0,equipment),fall=picture('fall',-140,0,equipment);
  assert.ok(fall.bottom>rise.bottom,'legs extend before contact');
  const run=picture('run',0,0,equipment);
  for(const landing of [.16,.12,.08,.04,0]){
   const frame=picture('land',0,landing,equipment);
   assert.ok(Math.abs(frame.top-run.top)<=4,'head moves through a shallow compression');
   assert.equal(frame.bottom,run.bottom,'feet remain at ground contact');
   assert.ok(frame.pixels.every(p=>p.slice(0,4).every(Number.isFinite)&&p[2]>0&&p[3]>0));
  }
 }
});
