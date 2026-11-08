// Real keyboard, mouse and touch handlers, with a deterministic browser animation clock.
// Obstacles are explicitly training fixtures. No direct jump()/tick() calls in this test.
import {chromium} from 'playwright';import {readFileSync,existsSync} from 'node:fs';import assert from 'node:assert/strict';import {server} from './serve.mjs';import {windows,config} from '../tools/jump-progression.mjs';
const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.clock.pauseAt(Date.now()+100);
  await page.route('**/api/mempool',r=>r.fulfill({json:[]}));
  await page.route('**/app.mjs',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('web/app.mjs','utf8')+`\nwindow.fixture={get game(){return game;},setup(model,role){overlay='';if(!game.p.character.name)game.create('Synthetic input check',{class:role,hair:'#5e3936',skin:'#dfaf87',hairStyle:0});game.p.character.class=role;game.p.workshop.strength=0;game.startPractice(model);game.spawnPlant();game.spawn=1e9;game.coins=[];touch();}};`}));
  await page.goto('http://127.0.0.1:'+host.address().port);await page.waitForFunction(()=>document.body.dataset.ready==='true');
  const cases=[];
  for(const role of ['gardener','explorer','collector'])for(const model of ['flower','tulip','cannabis','rose'])cases.push({role,model,kind:mobile?'touch':'Space',offset:0,pass:model!=='rose'});
  if(!mobile){for(const kind of ['w','ArrowUp','mouse'])for(const model of ['tulip','cannabis'])cases.push({role:'gardener',model,kind,offset:0,pass:true});}
  for(const model of ['flower','tulip','cannabis'])for(const sign of [-1,1])cases.push({role:'collector',model,kind:mobile?'touch':'Space',offset:sign*(model==='cannabis'?4:10),pass:true});
  for(const f of cases){
   const sample=config.trainingModels.find(m=>m.id===f.model),launches=f.pass?windows(sample.sats,0,f.role,false):[];
   const x=f.pass?launches[Math.floor(launches.length/2)]+f.offset:160;
   await page.evaluate(f=>fixture.setup(f.model,f.role),f);await page.clock.runFor(40);await page.evaluate(x=>fixture.game.obstacles[0].x=x,x);
   const box=await page.locator('#scene').boundingBox();
   if(f.kind==='touch')await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
   else if(f.kind==='mouse'){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.clock.runFor(80);await page.mouse.up();}
   else {await page.keyboard.down(f.kind);await page.clock.runFor(80);await page.keyboard.up(f.kind);}
   assert.equal(await page.evaluate(()=>fixture.game.trace.filter(e=>e.event==='jump').length),1,JSON.stringify(f));
   await page.clock.runFor(2400);
   const result=await page.evaluate(()=>({phase:fixture.game.phase,cleared:fixture.game.obstacles.length===0||fixture.game.obstacles[0].x+fixture.game.obstacles[0].w<=100}));
   assert.equal(result.phase==='running'&&result.cleared,f.pass,JSON.stringify({f,result}));
  }
  await page.evaluate(()=>{fixture.game.start(true,42);});await page.clock.runFor(40);
  assert.equal(await page.locator('[data-action=skill]').count(),3);
  const text=await page.locator('#menu').textContent();for(const word of ['Basic Jump','15%','Time Slow','Double Jump','10 s'])assert.ok(text.includes(word),word);
  await page.screenshot({path:'docs/browser/starting-skills-'+(mobile?'mobile':'desktop')+'.png'});
  await page.evaluate(()=>document.querySelector('[data-action=skill][data-arg="2"]').focus());await page.keyboard.press('e');await page.clock.runFor(40);
  await page.evaluate(()=>{fixture.game.spawn=1e9;fixture.game.obstacles=[];});
  assert.match(await page.locator('#hud').textContent(),/Double Jump ready/);
  await page.keyboard.down('Space');await page.clock.runFor(80);await page.keyboard.up('Space');await page.keyboard.press('Space');await page.clock.runFor(40);
  assert.match(await page.locator('#hud').textContent(),/Double Jump · 10 s/);await page.clock.runFor(10100);assert.match(await page.locator('#hud').textContent(),/Double Jump ready/);
  assert.deepEqual(errors,[]);await page.close();console.log((mobile?'Mobile touch':'Desktop keyboard/mouse')+': '+cases.length+' real input/timing trials and all three starting choices passed.');
 }
}finally{await browser.close();await new Promise(r=>host.close(r));}
