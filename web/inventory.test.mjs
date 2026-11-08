import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Game,fresh,migrate,outfit} from './core.mjs';
const c=JSON.parse(readFileSync(new URL('../src/balance.json',import.meta.url)));
const appearance={hair:'#5e3936',skin:'#dfaf87',shirt:'#679e86',hairStyle:15};
test('every role starts with exactly its selected clothes, no diamond ownership or bonuses',()=>{
 for(const role of c.classes){const g=new Game(c);g.create('Willow',{...appearance,class:role.id});assert.equal(g.p.schemaVersion,5);assert.equal(g.p.inventory.length,5);assert.deepEqual(g.p.equipment,outfit(c));assert.deepEqual(g.p.owned,[]);assert.equal(g.p.hands,false);assert.equal(g.p.boots,false);const stats=g.stats();for(const id of [...g.p.inventory])g.equipClothing(id);assert.deepEqual(g.stats(),stats);assert.equal(g.p.character.hairStyle,15);assert.equal(g.create('Other',{...appearance,class:'collector'}),undefined);assert.equal(g.p.inventory.length,5);}
 const g=new Game(c);g.create('Custom',{...appearance,class:'gardener'},{torso:'torso_rust_coat',feet:'feet_dark_leather_boots',head:'head_straw_hat'});assert.equal(g.p.inventory.length,6);assert.equal(g.p.equipment.torso,'torso_rust_coat');assert.equal(g.p.inventory.includes('torso_green_tunic'),false);
});
test('only owned, valid pieces equip; replacement retains ownership and survives save/export/import',()=>{
 const g=new Game(c);g.create('Willow',{...appearance,class:'explorer'});assert.equal(g.equipClothing('head_straw_hat'),false);assert.equal(g.equipClothing('hands'),false);assert.equal(g.takeClothing('hands'),false);
 assert.equal(g.takeClothing('torso_rust_coat'),true);assert.equal(g.takeClothing('torso_rust_coat'),false);assert.equal(g.equipClothing('torso_rust_coat'),true);assert.ok(g.p.inventory.includes('torso_green_tunic'));
 assert.equal(g.equipClothing('hands_leather_work_gloves'),true);assert.equal(g.p.equipment.hands,null);assert.equal(g.p.hands,false);
 const saved=JSON.stringify(g.p),loaded=new Game(c,JSON.parse(saved));assert.deepEqual({...loaded.p,lastClock:0},{...JSON.parse(saved),lastClock:0});assert.equal(loaded.p.character.hairStyle,15);
 loaded.phase='running';assert.equal(loaded.equipClothing('torso_green_tunic'),false);assert.equal(loaded.takeClothing('head_straw_hat'),false);
 const empty=new Game(c);assert.deepEqual(empty.p.inventory,[]);assert.ok(Object.values(empty.p.equipment).every(id=>id===null));
});
test('schema four migration preserves character, role, diamonds, records, coins and unlocks exactly',()=>{
 const old={...fresh(),schemaVersion:4,character:{...appearance,name:'Existing',class:'collector'},coins:777,owned:['boots','hands'],boots:true,hands:true,records:{best:1234},unlocked:['training','diamond'],workshop:{strength:7},runs:8};delete old.inventory;delete old.equipment;
 const next=migrate(old,c);for(const key of ['character','coins','owned','hands','boots','records','unlocked','workshop','runs'])assert.deepEqual(next[key],old[key]);assert.equal(next.inventory.length,5);assert.deepEqual(migrate(next,c),next);assert.equal(old.schemaVersion,4);
 next.equipment.feet='hands_leather_work_gloves';next.equipment.hands='head_straw_hat';const checked=migrate(next,c);assert.equal(checked.equipment.feet,null);assert.equal(checked.equipment.hands,null);
});
test('sprite source contains all sixteen distinct hairstyles and twelve distinct animation poses',async()=>{
 const source=readFileSync(new URL('../src/CharacterSprites.js',import.meta.url),'utf8').replace('.pragma library','');const {sprites}=await import('data:text/javascript,'+encodeURIComponent(source+'\nexport {sprites};'));
 assert.equal(new Set(c.hairStyles.map(h=>JSON.stringify(sprites[h.id].pixels))).size,16);assert.equal(new Set(Array.from({length:12},(_,i)=>JSON.stringify(sprites['body_'+i].pixels))).size,12);
 for(const item of c.clothing)assert.ok(sprites[item.id].pixels.some(Boolean),item.id);
});
