import {clickHeaderAction} from './test-camera.mjs';
// Drive real app animation callbacks at a synthetic 144 Hz. This verifies the
// caps and simulation, not the physical refresh rate of the test machine.
import {chromium} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {server} from './serve.mjs';
const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath(),headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.requestAnimationFrame=callback=>{window.nextFrame=callback;return 1;};
  window.renderedFrames=0;
  const reset=CanvasRenderingContext2D.prototype.reset;
  CanvasRenderingContext2D.prototype.reset=function(){if(this.canvas.id==='scene')window.renderedFrames++;return reset.call(this);};
 });
 await page.route('**/api/mempool',r=>r.fulfill({json:[]}));
 await page.route('**/app.mjs',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('web/app.mjs','utf8')+`
 window.fixture={get game(){return game;},get rate(){return frameClock.fps;},get measured(){return frameClock.measured;},setup(){overlay='';game.startPractice('fern');game.spawnPlant();game.obstacles[0].x=170;game.spawn=1e9;game.coins=[];simulation.reset(game);frameClock.setRate(frameClock.fps);last=0;pendingPaintTime=0;window.renderedFrames=0;renderMenu();}};`}));
 const origin='http://127.0.0.1:'+host.address().port;
 await page.goto(origin+'/?lang=cs');await page.waitForSelector('body[data-ready=true]');
 await page.fill('#name','Frame playtest');await page.locator('[data-action=create]').click();
 await page.setViewportSize({width:1684,height:1320});
 await page.waitForFunction(()=>{
  window.nextFrame(performance.now());
  const canvas=document.querySelector('#scene');
  return canvas.width===canvas.clientWidth&&canvas.height===canvas.clientHeight;
 },null,{polling:50});
 const pixelAlpha=await page.evaluate(async()=>{
  const {miniature}=await import('/pixels.mjs');
  const canvas=document.createElement('canvas');canvas.width=100;canvas.height=160;
  const c=canvas.getContext('2d');
  c.setTransform(3.37,0,0,3.37,.4,.7);
  c.imageSmoothingEnabled=true;
  miniature(c,14.3,30.6,20,{hair:'#5e3936',skin:'#dfaf87',hairStyle:0},0,false,false,'fall',{},true,{velocity:-70});
  const pixels=c.getImageData(0,0,100,160).data;
  return [...new Set(pixels.filter((_,i)=>i%4===3))].sort((a,b)=>a-b);
 });
 assert.deepEqual(pixelAlpha,[0,255]);
 await page.setViewportSize({width:1280,height:800});
 const results=[];
 for(const fps of [60,144]){
  await clickHeaderAction(page,'settings');
  await page.locator('[data-action=frame-rate][data-arg="'+fps+'"]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('wl-frame-rate')),String(fps));
  assert.equal(await page.evaluate(()=>fixture.rate),fps);
  await page.locator('#menu').evaluate(menu=>{menu.scrollTop=0;});
  await page.screenshot({path:'docs/browser/frame-rate-'+fps+'.png'});
  await page.evaluate(()=>fixture.setup());
  await page.keyboard.down('Space');await page.keyboard.up('Space');
  results.push(await page.evaluate(()=>{
   for(let i=1;i<=288;i++)window.nextFrame(i*1000/144);
   const g=fixture.game;return {painted:renderedFrames,measured:fixture.measured,time:g.time,distance:g.distance,y:g.y,velocity:g.velocity,phase:g.phase,coins:g.earned,runs:g.p.runs};
  }));
  assert.equal(results.at(-1).painted,fps*2);
  assert.equal(results.at(-1).measured,fps);
  assert.equal(results.at(-1).phase,'running');assert.equal(results.at(-1).runs,0);
 }
 const [{painted:a,measured:m1,...first},{painted:b,measured:m2,...second}]=results;assert.deepEqual(first,second);
 await page.reload();await page.waitForSelector('body[data-ready=true]');assert.equal(await page.evaluate(()=>fixture.rate),144);
 assert.deepEqual(errors,[]);
 console.log('Synthetic 144 Hz app callbacks: 120/288 paints in 2 seconds at 60/144 FPS, identical physics/results, keyboard hop and saved settings passed.');
}finally{await browser.close();await new Promise(r=>host.close(r));}
