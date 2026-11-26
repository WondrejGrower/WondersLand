import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Game,fresh,migrate} from './core.mjs';
const c=JSON.parse(readFileSync(new URL('../src/balance.json',import.meta.url)));
const appearance={hair:'#5e3936',skin:'#dfaf87',shirt:'#679e86',hairStyle:15};
test('every role starts without collectible clothes or diamond bonuses',()=>{
 for(const role of c.classes){
  const g=new Game(c);g.create('Willow',{...appearance,class:role.id});
  assert.deepEqual(g.p.inventory,[]);assert.ok(Object.values(g.p.equipment).every(item=>item===null));
  assert.deepEqual(g.p.owned,[]);assert.equal(g.p.hands,false);assert.equal(g.p.boots,false);
 }
});
test('live drops survive reload, rare drops are possible, and only owned clothes equip',()=>{
 const g=new Game(c);g.create('Willow',{...appearance,class:'explorer'});
 assert.equal(g.equipClothing('torso_slate_cape'),false);
 g.receive([{txid:'a'.repeat(64),value:'0'}]);g.start(false,1);g.choose(0);
 g.distance=30;g.time=3;g.lootRoll=()=>0;g.checkClothingDrop();
 assert.deepEqual(g.runDrops,['torso_slate_cape']);
 const loaded=new Game(c,JSON.parse(JSON.stringify(g.p)));
 assert.deepEqual(loaded.p.inventory,['torso_slate_cape']);
 assert.equal(loaded.equipClothing('torso_slate_cape'),true);
 assert.equal(loaded.p.equipment.torso,'torso_slate_cape');assert.equal(loaded.p.hands,false);
 loaded.startPractice('flower');loaded.distance=500;loaded.lootRoll=()=>0;loaded.checkClothingDrop();
 assert.deepEqual(loaded.runDrops,[]);
});
test('once each clothing slot has an item, the drop chance falls',()=>{
 const g=new Game(c);g.create('Willow',{...appearance,class:'gardener'});
 g.p.inventory=Object.keys(c.starterEquipment).map(slot=>c.clothing.find(item=>item.slot===slot).id);
 g.receive([{txid:'a'.repeat(64),value:'0'}]);g.start(false,1);g.choose(0);
 g.distance=30;g.time=3;g.lootRoll=()=>.05;g.checkClothingDrop();assert.deepEqual(g.runDrops,[]);
});
test('schema four migration preserves character, role, diamonds, records, coins and unlocks exactly',()=>{
 const old={...fresh(),schemaVersion:4,character:{...appearance,name:'Existing',class:'collector'},coins:777,owned:['boots','hands'],boots:true,hands:true,records:{best:1234},unlocked:['training','diamond'],workshop:{strength:7},runs:8};delete old.inventory;delete old.equipment;
 const next=migrate(old,c);for(const key of ['character','coins','owned','hands','boots','records','unlocked','workshop','runs'])assert.deepEqual(next[key],old[key]);assert.equal(next.inventory.length,5);assert.deepEqual(migrate(next,c),next);assert.equal(old.schemaVersion,4);
 next.equipment.feet='hands_leather_work_gloves';next.equipment.hands='head_straw_hat';const checked=migrate(next,c);assert.equal(checked.equipment.feet,null);assert.equal(checked.equipment.hands,null);
});
test('sprite source contains all sixteen distinct hairstyles and twelve distinct animation poses',async()=>{
 const {sprites}=await import('./sprites.mjs');
 assert.equal(new Set(c.hairStyles.map(h=>JSON.stringify(sprites[h.id].pixels))).size,16);assert.equal(new Set(Array.from({length:12},(_,i)=>JSON.stringify(sprites['body_'+i].pixels))).size,12);
 for(const item of c.clothing)assert.ok(sprites[item.id].pixels.some(Boolean),item.id);
});
