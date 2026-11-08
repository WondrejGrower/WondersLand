import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Game,Queue,fresh,plant,migrate} from './core.mjs';
const c=JSON.parse(readFileSync(new URL('../src/balance.json',import.meta.url)));
const profile=()=>({...fresh(),character:{name:'Willow',class:'gardener',hair:'#5e3936',skin:'#dfaf87',shirt:'#679e86',hairStyle:0}}),tx=(n,value='0')=>({txid:n.toString(16).padStart(64,'0'),value});
test('transaction identity and continuous uncapped size curve',()=>{let prev=0;for(let n=100;n<2.1e15;n*=1.1){const p=plant(String(Math.floor(n)),c);assert.ok(p.h>=prev);prev=p.h;}assert.equal(plant('2100000000000000',c).btc,'21000000.00000000');assert.equal(plant('4200000000',c).type,'cannabis');});
test('queue bounded, deduplicated, refreshed and never reused during a run',()=>{const q=new Queue();q.receive(Array.from({length:800},(_,i)=>tx(i+1)));assert.equal(q.cache.length,512);q.begin(1);const ids=new Set();for(let i=0;i<512;i++){const r=q.take();assert.ok(!ids.has(r.txid));ids.add(r.txid);}assert.equal(q.take(),null);q.receive([tx(900)]);assert.equal(q.take().txid,tx(900).txid);q.receive([tx(900),tx(901,'-2')]);assert.equal(q.take(),null);});
test('live short attempts progressively unlock and reward once; training pays nothing',()=>{const g=new Game(c,profile());assert.equal(g.has('training'),false);for(let i=0;i<10;i++){g.receive([tx(i+1)]);g.start();g.choose(0);g.distance=50;g.earned=5;g.camp();}assert.equal(g.p.totalDistance,500);assert.equal(g.has('forge'),false);assert.equal(g.has('wardrobe'),false);assert.equal(g.has('garden'),false);const saved=JSON.stringify(g.p);g.start(true);g.choose(0);g.distance=10000;g.earned=10000;g.camp();assert.equal(JSON.stringify(g.p),saved);});
test('every new run starts from zero and region changes do not resize obstacles',()=>{const g=new Game(c,profile());g.receive(Array.from({length:100},(_,i)=>tx(i+1)));g.start(false,42);g.choose(0);while(g.distance<499)g.tick(.1);const before=g.obstacles.map(p=>({...p}));while(g.distance<501)g.tick(.01);assert.equal(g.region().id,'grove');for(const p of before){const same=g.obstacles.find(o=>o.txid===p.txid);if(same){assert.equal(same.h,p.h);assert.equal(same.w,p.w);}}g.camp();g.start();assert.equal(g.distance,0);assert.equal(g.region().id,'edge');});
test('ordinary jump and repeated air inputs obey caps; jetpack has finite fuel',()=>{const d=profile();d.runs=5;d.totalDistance=7000;d.bestDistance=3500;d.completed=['air','leaf','spore'];d.workshop={strength:50};const g=new Game(c,d);g.start(true);g.choose(0);g.spawn=1e9;g.obstacles=[];g.skills={leap:3,double:3,jetpack:3,glider:3};g.jump();g.jet=true;for(let i=0;i<800;i++){if(i%30===0)g.jump();g.tick(.005);assert.ok(g.y<=g.stats().airCap+.05);}assert.equal(g.fuel,0);g.jet=g.held=false;for(let i=0;i<600;i++)g.tick(.005);assert.equal(g.y,0);});
test('giant transaction collides with exact TXID and a rescue resolves a wide instance once',()=>{const d=profile();d.hands=d.boots=true;const g=new Game(c,d);g.receive([tx(1,'2000000000000000'),tx(2,'2000000000000000')]);g.start();g.choose(0);for(let i=0;i<1500&&g.phase==='running';i++)g.tick(.016);assert.equal(g.phase,'over');assert.equal(g.rescuesGranted,1);assert.ok(g.hit.h>c.physics.airCap);assert.ok([tx(1).txid,tx(2).txid].includes(g.hit.txid));const before=g.p.coins;g.settle();assert.equal(g.p.coins,before);});
test('empty queue freezes and resumes via countdown, no cyclic reuse',()=>{const g=new Game(c,profile());g.receive([tx(1)]);g.start();g.choose(0);for(let i=0;i<1000&&g.phase==='running';i++)g.tick(.016);assert.equal(g.phase,'waiting');const distance=g.distance;g.tick(.25);assert.equal(g.distance,distance);g.receive([tx(2)]);assert.equal(g.phase,'countdown');for(let i=0;i<31;i++)g.tick(.1);assert.equal(g.phase,'running');});
test('schema migration preserves old gear, statistics, unlocked recipes and classes',()=>{const old={...profile(),schemaVersion:3,coins:777,owned:['hands'],workshop:{strength:7},milestones:['T1:60','T2:120'],runs:1};const d=migrate(old,c);assert.equal(d.coins,777);assert.equal(d.workshop.strength,7);assert.ok(d.recipes.includes('boots'));assert.ok(d.unlocked.includes('classes'));assert.ok(d.unlocked.includes('garden'));assert.throws(()=>migrate({schemaVersion:99},c));});
test('research uses wall time and the saved role stays immutable',()=>{const d=profile();d.coins=10000;d.seeds=5;d.runs=5;d.totalDistance=7000;d.bestDistance=3500;const g=new Game(c,d);const now=Date.now()/1000;assert.ok(g.research('leaf',now));assert.ok(!g.research('leaf',now));g.updateResearch(now+601);assert.ok(g.p.completed.includes('leaf'));const coins=g.p.coins;assert.equal(g.changeClass('collector'),false);assert.equal(g.p.character.class,'gardener');assert.equal(g.p.coins,coins);assert.equal(g.p.character.name,'Willow');});

test('cancelled skill selection is never checkpointed or rewarded on page blur',()=>{const g=new Game(c,profile());g.receive([tx(1)]);g.start();g.camp();g.saveCheckpoint();assert.equal(g.p.activeRun,undefined);assert.equal(g.p.runs,0);});

test('coin bonuses accumulate in exact milli-coins instead of dropping fractions',()=>{const g=new Game(c,profile());g.start(true);g.choose(0);g.earnedMilli=0;for(let i=0;i<2;i++)g.apply({id:'coins'});assert.equal(g.earned,11);});

test('all three roles are available at creation and require reset to change',()=>{for(const role of ['gardener','explorer','collector']){const g=new Game(c);g.create('Willow',{class:role,hair:'#5e3936',skin:'#dfaf87',shirt:'#679e86',hairStyle:0});assert.equal(g.p.character.class,role);g.p.coins=777;g.p.workshop.strength=7;const before=JSON.stringify(g.p);g.changeClass('collector');g.create('Replacement',{class:'collector'});assert.equal(JSON.stringify(g.p),before);const loaded=new Game(c,{...g.p,announcements:['classes','diamond']});assert.equal(loaded.p.character.class,role);assert.deepEqual(loaded.p.announcements,['diamond']);assert.equal(loaded.p.coins,777);const reset=new Game(c);reset.create('New',{class:'collector'});assert.equal(reset.p.character.class,'collector');}});

test('buildings require a single live distance or ten levels in one attribute',()=>{
 const g=new Game(c,profile());g.p.runs=1;g.p.totalDistance=10000;
 for(const [distance,wardrobe,forge] of [[499,false,false],[500,true,false],[999,true,false],[1000,true,true]]){
  g.p.bestDistance=distance;assert.equal(g.has('wardrobe'),wardrobe);assert.equal(g.has('forge'),forge);
 }
 g.p.bestDistance=50;g.p.coins=100000;g.p.workshop={strength:9,agility:9};
 assert.equal(g.has('forge'),false);assert.ok(g.buy('strength'));assert.equal(g.has('forge'),true);assert.equal(g.has('wardrobe'),false);
 assert.equal(g.p.announcements.filter(x=>x==='forge').length,1);g.buy('strength');assert.equal(g.p.announcements.filter(x=>x==='forge').length,1);
 const restored=new Game(c,g.p);assert.equal(restored.has('forge'),true);
 const existing=profile();existing.unlocked=['forge','wardrobe'];const old=new Game(c,existing);assert.ok(old.has('forge'));assert.ok(old.has('wardrobe'));
});

test('practice catalogue covers every obstacle and repeats a chosen model with current build and no rewards',()=>{
 const d=profile();d.runs=3;d.bestDistance=1000;d.totalDistance=4000;d.coins=1234;d.workshop={strength:10,agility:20};d.hands=true;
 const g=new Game(c,d),saved=JSON.stringify(g.p),stats=g.stats();
 assert.deepEqual(new Set(c.trainingModels.map(m=>plant(m.sats,c).type)),new Set(['flower','tulip','rose','fern','birch','pine','cannabis','oak','sequoia']));
 assert.equal(g.startPractice('missing'),false);
 for(const m of c.trainingModels){
  assert.ok(g.startPractice(m.id));assert.equal(g.phase,'running');assert.deepEqual(g.skills,{});assert.deepEqual(g.stats(),stats);
  for(let i=0;i<3;i++){g.spawnPlant();assert.equal(g.obstacles.at(-1).type,m.id);assert.equal(g.obstacles.at(-1).sats,m.sats);assert.equal(g.obstacles.at(-1).h,plant(m.sats,c).h);}
  g.time=100;g.tick(.01);assert.deepEqual(g.flying,{});g.saveCheckpoint();g.camp();assert.equal(JSON.stringify(g.p),saved);
 }
 g.startPractice();for(const m of c.trainingModels){g.spawnPlant();assert.equal(g.obstacles.at(-1).type,m.id);}g.camp();assert.equal(JSON.stringify(g.p),saved);
});

test('permanent strength spans meadow plants to late sequoias while keeping exact plant sizes',async()=>{
 const {windows}=await import('../tools/jump-progression.mjs');
 for(const f of JSON.parse(readFileSync(new URL('../tests/jump-stats.json',import.meta.url)))){const game=new Game(c,{...profile(),character:{name:'Fixture',class:f.role},workshop:{strength:f.level}});assert.ok(Math.abs(game.stats().jumpVelocity-f.jumpVelocity)<1e-8);assert.ok(Math.abs(game.stats().airCap-f.airCap)<1e-8);assert.ok(Math.abs(game.jumpHeight()-f.jumpHeight)<1e-8);}
 for(const role of ['gardener','explorer','collector']){
  assert.ok(windows('250000',0,role).length,'tulip '+role);
  assert.ok(windows('420000',0,role).length,'small cannabis '+role);
  assert.ok(windows('600000',0,role).length>=20,'shrub '+role);
  assert.ok(windows('900000',0,role).length>=20,'fern '+role);
 }
 for(const role of ['gardener','explorer','collector']){assert.ok(windows('50000',0,role,false).length>=50,'flower timing margin');assert.ok(windows('250000',0,role,false).length>=30,'tulip timing margin');assert.ok(windows('420000',0,role,false).length>=12,'cannabis timing margin');}
 for(const [sats,locked,unlocked]of [['10000000',0,20],['100000000',8,25],['1000000000',15,32],['100000000000',35,50]]){
  const size=plant(sats,c);assert.equal(windows(sats,locked).length,0);assert.ok(windows(sats,unlocked).length);assert.deepEqual(plant(sats,c),size);
 }
 const base=new Game(c,profile());for(let level=0;level<=50;level++){
  base.p.workshop.strength=level;const stats=base.stats(),apex=stats.jumpVelocity**2/(2*c.physics.heldGravity);
  assert.ok(Math.abs(base.jumpHeight()-apex)<1e-9);assert.ok(stats.airCap>=apex);assert.ok(stats.airCap<=c.physics.airCap);
 }
 base.p.workshop.strength=0;base.skills={double:3,jetpack:3,leap:3};assert.ok(base.stats().airCap<60,'early aerial abilities cannot skip tree progression');
 const existing={...profile(),coins:777,workshop:{strength:37},runs:9,bestDistance:1000};const restored=new Game(c,existing);assert.equal(restored.p.workshop.strength,37);assert.equal(restored.p.coins,777);
});

test('releasing jump still allows low controlled hops after long-term Strength upgrades',()=>{
 function peak(level,release,basic=false){const g=new Game(c,{...profile(),workshop:{strength:level}});g.startPractice('flower');g.spawn=1e9;if(basic)g.skills={leap:1};g.jump();if(release)g.release();let peak=0;for(let i=0;i<960;i++){g.tick(1/240);peak=Math.max(peak,g.y);}return peak;}
 assert.ok(peak(0,false)>28&&peak(0,false)<34);assert.ok(peak(50,false)>280);assert.ok(peak(50,true)<34);assert.ok(peak(0,true)<34);assert.ok(peak(0,true,true)>peak(0,true)*1.14);assert.ok(Math.abs(peak(0,true,true)-peak(0,false,true))<.05);
});

test('starting choices are complementary movement skills with fixed first ranks',()=>{
 for(let seed=1;seed<=30;seed++){
  const g=new Game(c,profile());g.start(true,seed);
  assert.deepEqual(g.choices.map(s=>s.id),['leap','timeslow','double']);
  assert.ok(g.choices.every(s=>s.gain===1&&s.nextRank===1));
  assert.equal(g.choices[0].name,'Basic Jump');assert.equal(g.choices[0].effects[0],.15);
 }
 const g=new Game(c,{...profile(),excluded:'leap'});g.start(true);assert.ok(!g.choices.some(s=>s.id==='leap'));
 g.startPractice('flower');assert.deepEqual(g.skills,{});assert.deepEqual(g.choices,[]);
});
test('Time Slow scales the whole expedition once and Double Jump recharges after ten active game seconds',()=>{
 const normal=new Game(c,profile()),slow=new Game(c,profile());normal.start(true,42);normal.choose(0);normal.skills={};slow.start(true,42);slow.choose(1);
 for(const g of [normal,slow]){g.spawn=1e9;g.obstacles=[];g.jump();}
 assert.equal(slow.stats().timeScale,.85);
 for(let i=0;i<120;i++){normal.tick(.85/120);slow.tick(1/120);}
 for(const key of ['time','distance','y','velocity','fuel'])assert.ok(Math.abs(normal[key]-slow[key])<1e-8,key);
 const g=new Game(c,profile());g.start(true,42);g.choose(2);g.spawn=1e9;
 g.jump();g.tick(.1);g.jump();assert.equal(g.doubleCooldown,10);assert.ok(g.airUsed);
 for(const phase of ['paused','waiting','countdown']){g.phase=phase;g.countdown=3;const cd=g.doubleCooldown;g.tick(.2);assert.equal(g.doubleCooldown,cd);}
 g.phase='running';g.y=0;g.jump();g.tick(.01);g.jump();assert.equal(g.airUsed,false,'landing does not reset cooldown');
 for(let i=0;i<1190;i++)g.tick(1/120);assert.ok(g.doubleCooldown>0);g.tick(.1);assert.equal(g.doubleCooldown,0);
 g.y=0;g.jump();g.tick(.01);g.jump();assert.equal(g.doubleCooldown,10);assert.ok(g.airUsed);
 g.camp();g.start(true);g.choose(2);assert.equal(g.doubleCooldown,0);
});

test('mempool rule: a fresh live run may start with an impossible sequoia, without filtering or substitution',()=>{
 const txid='f'.repeat(64),g=new Game(c,profile());g.receive([{txid,value:'100000000000'}]);g.start(false,42);g.choose(0);g.tick(1/120);
 assert.equal(g.obstacles[0].txid,txid);assert.equal(g.obstacles[0].sats,'100000000000');assert.equal(g.obstacles[0].type,'sequoia');assert.equal(g.obstacles[0].h,243);
 g.jump();for(let i=0;i<1500&&g.phase==='running';i++)g.tick(1/120);assert.equal(g.phase,'over');assert.equal(g.hit.txid,txid);assert.equal(g.p.runs,1);
 const firstIds=new Set();for(let i=1;i<=24;i++){const run=new Game(c,profile());run.receive([{txid,value:'100000000000'},{txid:'a'.repeat(64),value:'50000'}]);run.start(false,(i*2654435761)>>>0);run.choose(0);run.tick(1/120);firstIds.add(run.obstacles[0].txid);}assert.ok(firstIds.has(txid),'even with small transactions available a sequoia may start the run');assert.ok(firstIds.has('a'.repeat(64)));
});
