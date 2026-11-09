import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VerifiedClient} from './verified-client.mjs';
import {Game,fresh} from './core.mjs';
import {FrameClock,FixedSimulation,STEP,frameRate,captureView,interpolateView} from './timing.mjs';
const config=JSON.parse(readFileSync(new URL('../src/balance.json',import.meta.url)));
function practice(){const game=new Game(config,{...fresh(),character:{name:'Frame timing',class:'gardener'}});game.startPractice('fern');game.spawn=1e9;return game;}

test('60/144 FPS caps follow display callbacks without extra frames or changing the clock',()=>{
 for(const refresh of [60,144,240])for(const target of [60,144]){
  const clock=new FrameClock(target);let paints=0;
  for(let i=0;i<refresh*5;i++){const now=i*1000/refresh;if(clock.paint(now))paints++;assert.equal(clock.paint(now),false);}
  assert.equal(paints,Math.min(target,refresh)*5);
 }
 assert.equal(frameRate('60'),60);for(const invalid of [null,'999','broken',0])assert.equal(frameRate(invalid),144);
 const clock=new FrameClock(60);assert.ok(clock.paint(0));assert.equal(clock.paint(7),false);clock.setRate(144);assert.ok(clock.paint(7));
});

test('60 and 144 render callbacks produce identical fixed-step jumps, collisions and rewards',()=>{
 const results=[];
 for(const fps of [60,144]){
  const g=practice(),simulation=new FixedSimulation();g.spawnPlant();g.obstacles[0].x=170;g.spawn=1e9;g.jump();g.release();
  for(let frame=0;frame<fps*3;frame++)simulation.advance(g,1/fps);
  results.push({time:g.time,y:g.y,velocity:g.velocity,distance:g.distance,phase:g.phase,coins:g.earned,profile:g.p,obstacles:g.obstacles});
 }
 // Private practice IDs/timestamps are unrelated to frame rate.
 for(const r of results)r.profile.lastClock=0;
 assert.deepEqual(results[0],results[1]);assert.equal(results[0].phase,'running');
});

test('144 FPS interpolates position between 120 Hz physics steps without mutating gameplay',()=>{
 const g=practice(),simulation=new FixedSimulation();g.jump();simulation.advance(g,STEP*1.5);
 const before=captureView(g),view=simulation.view(g);
 assert.ok(view.y>0&&view.y<g.y);assert.ok(view.distance<g.distance);
 assert.deepEqual(captureView(g),before);
 const old=captureView(g);g.phase='over';assert.equal(interpolateView(g,old,.1).phase,'over');
 simulation.reset(g);assert.equal(simulation.accumulator,0);assert.equal(simulation.view(g).y,g.y);
});

test('starting another run clears leftover time and never interpolates the previous expedition',()=>{
 const g=practice(),simulation=new FixedSimulation();simulation.advance(g,STEP*1.5);g.startPractice('flower');simulation.advance(g,STEP*.1);
 assert.equal(g.time,0);assert.equal(simulation.previous,null);
});


test('verified prediction also takes exactly 120 steps at either render rate',()=>{
 const states=[];
 for(const fps of [60,144]){
  const client=new VerifiedClient(config,()=> 'unused');
  Object.assign(client,{active:true,ended:false,game:practice(),frame:0,acked:0,accumulator:0,sinceSync:0});
  client.flush=async()=>{};client.game.jump();
  for(let i=0;i<fps;i++)client.tick(1/fps);
  states.push({frame:client.frame,time:client.game.time,y:client.game.y,velocity:client.game.velocity,distance:client.game.distance});
 }
 assert.equal(states[0].frame,120);assert.deepEqual(states[0],states[1]);
});
