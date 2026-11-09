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
 window.fixture={get game(){return game;},get rate(){return frameClock.fps;},setup(){overlay='';game.startPractice('fern');game.spawnPlant();game.obstacles[0].x=170;game.spawn=1e9;game.coins=[];simulation.reset(game);frameClock.setRate(frameClock.fps);last=0;pendingPaintTime=0;window.renderedFrames=0;renderMenu();}};`}));
 const origin='http://127.0.0.1:'+host.address().port;
 await page.goto(origin+'/?lang=cs');await page.waitForSelector('body[data-ready=true]');
 await page.fill('#name','Frame playtest');await page.locator('[data-action=create]').click();
 const results=[];
 for(const fps of [60,144]){
  await page.locator('#settings').click();
  await page.locator('[data-action=frame-rate][data-arg="'+fps+'"]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('wl-frame-rate')),String(fps));
  assert.equal(await page.evaluate(()=>fixture.rate),fps);
  await page.locator('#menu').evaluate(menu=>{menu.scrollTop=0;});
  await page.screenshot({path:'docs/browser/frame-rate-'+fps+'.png'});
  await page.evaluate(()=>fixture.setup());
  await page.keyboard.down('Space');await page.keyboard.up('Space');
  results.push(await page.evaluate(()=>{
   for(let i=1;i<=288;i++)window.nextFrame(i*1000/144);
   const g=fixture.game;return {painted:renderedFrames,time:g.time,distance:g.distance,y:g.y,velocity:g.velocity,phase:g.phase,coins:g.earned,runs:g.p.runs};
  }));
  assert.equal(results.at(-1).painted,fps*2);
  assert.equal(results.at(-1).phase,'running');assert.equal(results.at(-1).runs,0);
 }
 const [{painted:a,...first},{painted:b,...second}]=results;assert.deepEqual(first,second);
 await page.reload();await page.waitForSelector('body[data-ready=true]');assert.equal(await page.evaluate(()=>fixture.rate),144);
 assert.deepEqual(errors,[]);
 console.log('Synthetic 144 Hz app callbacks: 120/288 paints in 2 seconds at 60/144 FPS, identical physics/results, keyboard hop and saved settings passed.');
}finally{await browser.close();await new Promise(r=>host.close(r));}
