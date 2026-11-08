import {chromium} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {server} from './serve.mjs';
import {fresh} from './core.mjs';
const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});let batch=0;
 // Test-only inspection, never included in the shipped source.
 await page.route('**/app.mjs',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('web/app.mjs','utf8')+'\nwindow.fixture={get game(){return game;},feed};'}));
 await page.route('**/api/mempool',r=>r.fulfill({json:Array.from({length:10},(_,i)=>({txid:(++batch).toString(16).padStart(64,'0'),value:'0'}))}));
 await page.addInitScript(p=>localStorage.setItem('wl-progress',JSON.stringify(p)),{...fresh(),character:{name:'Test',class:'gardener'}});
 await page.goto('http://127.0.0.1:'+host.address().port);await page.waitForFunction(()=>window.fixture?.game.q.pending.length>=10);
 for(const [code,key,direction]of [['KeyW','W','up'],['KeyA','A','left'],['KeyS','S','down'],['KeyD','D','right']]){
  assert.equal(await page.evaluate(({code,key,direction})=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,key,bubbles:true,shiftKey:true}));return fixture.game.moves.has(direction);},{code,key,direction}),true);
  await page.evaluate(({code,key})=>document.dispatchEvent(new KeyboardEvent('keyup',{code,key,bubbles:true})),{code,key});
 }
 await page.keyboard.press('F10');await page.locator('[data-action=language][data-arg=en]').focus();
 await page.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',key:'D',bubbles:true})));
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.arg),'cs');
 await page.keyboard.press('Escape');
 const result=await page.evaluate(async()=>{
  const {game,feed}=fixture;game.start(false,42);game.choose(0);
  // Zero-value fixtures pass below the collision box, so exercise depletion honestly.
  for(let i=0;i<4000&&game.phase==='running';i++)game.tick(.1);
  const before={phase:game.phase,used:game.q.used.size,distance:game.distance};
  await feed.refresh();const resumed=game.phase;
  for(let i=0;i<1000&&game.q.used.size<20;i++)game.tick(.1);
  return {before,resumed,used:game.q.used.size,distance:game.distance};
 });
 assert.equal(result.before.phase,'waiting');assert.equal(result.before.used,10);assert.equal(result.resumed,'countdown');assert.equal(result.used,20);assert.ok(result.distance>result.before.distance);
 assert.deepEqual(errors,[]);console.log('Input/feed browser regression passed: uppercase physical WASD in camp/menu and 20 distinct transactions across depletion/recovery.');
}finally{await browser.close();await new Promise(r=>host.close(r));}
