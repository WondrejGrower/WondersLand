import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Game,fresh,plant,height} from './core.mjs';
const config=JSON.parse(readFileSync(new URL('../src/balance.json',import.meta.url)));
const profile=level=>({...fresh(),character:{name:'Willow',class:'gardener'},workshop:{agility:level}});
const rows=Array.from({length:40},(_,i)=>({txid:i.toString(16).padStart(64,'0'),value:'0'}));
function expedition(level){const g=new Game(config,profile(level));g.receive(rows);g.start(false,42);g.choose(0);return g;}
test('agility slows the entire simulation by at most two percent, with identical trajectories in game time',()=>{
 const normal=expedition(0),slow=expedition(50);assert.equal(normal.stats().timeScale,1);assert.equal(slow.stats().timeScale,.98);assert.equal(expedition(1).stats().timeScale,.9996);assert.equal(expedition(999).stats().timeScale,.98);assert.equal(slow.stats().buffer,normal.stats().buffer);
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
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8').replace(/^\.pragma.*$/gm,'').replace(/^\.import.*$/gm,'');
const spriteData=Function(read('CharacterSprites.js')+'\nreturn {palette,sprites};')();
const renderer=Function('Sprites','Environment',read('PixelArt.js')+'\nreturn {wearablePixels,character};')(spriteData,{});
test('torso, gloves, boots and pouch deform with the six run poses instead of staying stationary',()=>{
 for(const id of ['torso_green_tunic','torso_slate_cape','torso_work_apron','hands_leather_work_gloves','feet_brown_leather_boots','belt_leather_pouch']){
  const layers=Array.from({length:6},(_,pose)=>renderer.wearablePixels(id,pose));assert.ok(new Set(layers.map(p=>JSON.stringify(p))).size>=4,id);
  for(const pixels of layers){assert.ok(pixels.length>5);for(const [x,y]of pixels)assert.ok(x>=0&&x<24&&y>=0&&y<40,id);}
 }
 const glove0=renderer.wearablePixels('hands_leather_work_gloves',0),glove1=renderer.wearablePixels('hands_leather_work_gloves',1);
 assert.ok(glove0.some(([x,y])=>Math.hypot(x-2.5,y-22.9)<2));assert.ok(glove1.some(([x,y])=>Math.hypot(x-9.3,y-22.4)<2));
 assert.deepEqual(renderer.wearablePixels(null,0),[]);
});
test('all environment motifs have unique regions; giant plants use a single viewport-bounded blit',()=>{
 const Data=Function(read('EnvironmentRegions.js')+'\nreturn {regions};')();assert.equal(Object.keys(Data.regions).length,24);assert.ok(Data.regions.flora_cannabis);assert.equal(new Set(Object.values(Data.regions).map(r=>r.atlas+':'+r.rect)).size,24);
 const environment=Function('Data',read('EnvironmentArt.js')+'\nreturn {plant};')(Data);const calls=[],ctx={drawImage:(...args)=>calls.push(args)};environment.plant(ctx,{type:'sequoia',x:500,w:96,h:1e12},284);assert.equal(calls.length,1);assert.ok(calls[0].slice(1).every(Number.isFinite));assert.ok(calls[0].at(-1)<=360);assert.ok(calls[0].at(-3)>=0);
});
