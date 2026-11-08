// Labelled practice fixtures in the real shared renderer, never live mempool.
import {chromium} from 'playwright';import {existsSync,readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {server} from './serve.mjs';import {windows,config} from '../tools/jump-progression.mjs';
const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
try{
 for(const [model,level,width,height,name]of [['cannabis',0,1280,800,'newbie'],['sequoia',46,1280,800,'sequoia'],['sequoia',46,390,844,'sequoia-mobile']]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/mempool',r=>r.fulfill({json:[]}));
  await page.route('**/app.mjs',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('web/app.mjs','utf8')+'\nwindow.fixture={get game(){return game;},freeze(){overlay="fixture";}};'}));
  await page.goto('http://127.0.0.1:'+host.address().port);await page.waitForFunction(()=>document.body.dataset.ready==='true');
  const sats=config.trainingModels.find(m=>m.id===model).sats,launches=windows(sats,level),x=launches[Math.floor(launches.length/2)];assert.ok(x);
  const state=await page.evaluate(({model,level,x})=>{const g=fixture.game;g.create('Synthetic jump check',{class:'gardener',hair:'#5e3936',skin:'#dfaf87',hairStyle:0});g.p.workshop.strength=level;g.startPractice(model);g.spawnPlant();g.spawn=1e9;g.obstacles[0].x=x;g.jump();while(g.phase==='running'&&g.obstacles[0].x>120)g.tick(1/120);fixture.freeze();return {phase:g.phase,h:g.obstacles[0].h,y:g.y,visual:g.obstacles[0].visual};},{model,level,x});
  assert.equal(state.phase,'running');assert.equal(state.visual.version,1);assert.ok(state.y>0);await page.waitForTimeout(80);await page.screenshot({path:'docs/browser/jump-progression-'+name+'.png'});
  const cleared=await page.evaluate(()=>{const g=fixture.game;while(g.phase==='running'&&g.obstacles[0].x+g.obstacles[0].w>100)g.tick(1/120);return g.phase==='running';});assert.ok(cleared,model);assert.deepEqual(errors,[]);assert.equal(await page.locator('#error').isVisible(),false);await page.close();
 }
 console.log('Practice jump progression: base cannabis, Strength 46 sequoia, desktop/mobile and no browser errors passed.');
}finally{await browser.close();await new Promise(r=>host.close(r));}
