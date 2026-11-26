import {clickStation,clickHeaderAction} from './test-camera.mjs';
import {chromium} from 'playwright';import {existsSync} from 'node:fs';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';import {server} from './serve.mjs';
const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];await mkdir('docs/browser',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/mempool',r=>r.fulfill({json:[]}));
 await page.goto('http://127.0.0.1:'+host.address().port+'/?lang=cs');await page.waitForFunction(()=>document.body.dataset.ready==='true');assert.equal(await page.locator('#name').evaluate(input=>document.activeElement===input),false);
 await page.locator('#name').tap();await page.keyboard.type('Willow');
 // Safari may dispatch a button click without giving that button focus.
 const hair=page.locator('[data-action=appearance][data-arg=hairStyle]');
 await hair.evaluate(button=>button.click());
 assert.equal(await hair.evaluate(button=>document.activeElement===button),true);
 assert.equal(await page.locator('#name').inputValue(),'Willow');
 const hashes=new Set();for(let i=0;i<16;i++){hashes.add(await page.locator('#portrait').evaluate(c=>c.toDataURL()));await page.locator('[data-action=appearance][data-arg=hairStyle]').click();}assert.equal(hashes.size,16);
 await page.screenshot({path:'docs/browser/inventory-creation-cs.png'});
 await page.locator('[data-action=create]').click();await page.waitForFunction(()=>document.querySelector('#sheet').hidden);
 const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wl-v2:wl-progress')));
 assert.deepEqual((await save()).inventory,[]);assert.equal((await save()).equipment.torso,null);
 await clickHeaderAction(page,'inventory');
 assert.equal(await page.locator('.empty-gear').count(),14);
 await page.evaluate(()=>{
  const progress=JSON.parse(localStorage.getItem('wl-v2:wl-progress'));
  progress.inventory=['torso_rust_coat','head_straw_hat'];
  progress.discoveries=['leap'];
  localStorage.setItem('wl-v2:wl-progress',JSON.stringify(progress));
 });
 await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await clickHeaderAction(page,'inventory');
 await page.locator('[data-action=inspect-clothing][data-arg=torso_rust_coat]').click();
 await page.keyboard.press('e');assert.equal((await save()).equipment.torso,'torso_rust_coat');
 await page.screenshot({path:'docs/browser/inventory-cs.png'});
 await page.keyboard.press('Escape');await page.keyboard.press('F10');await page.locator('[data-action=language][data-arg=en]').click();await page.keyboard.press('Escape');
 await clickHeaderAction(page,'inventory');assert.equal(await page.locator('h1').textContent(),'Inventory');
 await page.screenshot({path:'docs/browser/inventory-en.png'});
 await page.setViewportSize({width:390,height:700});
 await page.locator('[data-action=inspect-clothing][data-arg=head_straw_hat]').click();await page.locator('[data-action=equip-clothing]').click();
 assert.equal((await save()).equipment.head,'head_straw_hat');
 assert.equal(await page.evaluate(()=>document.querySelector('#menu').scrollWidth<=document.querySelector('#menu').clientWidth),true);await page.screenshot({path:'docs/browser/inventory-mobile.png'});
 // Explicit export/import uses the same versioned save without duplicating items.
 await page.keyboard.press('Escape');await page.keyboard.press('F10');const before=await save();await page.locator('[data-action=import]').click();await page.setInputFiles('#import',{name:'progress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(before))});await page.locator('[data-action=import-apply]').click();assert.deepEqual((await save()).inventory,before.inventory);
 await page.locator('[data-action=reset-confirm]').click();await page.locator('[data-action=reset]').click();assert.equal((await save()).inventory.length,0);assert.equal(await page.evaluate(()=>localStorage.getItem('wl-language')),'en');
 // A native schema-4 save migrates with its old role/bonuses untouched and one backup.
 const old={...before,schemaVersion:4,coins:777,hands:true,boots:true,owned:['hands','boots']};delete old.inventory;delete old.equipment;
 await page.evaluate(p=>localStorage.setItem('wl-v2:wl-progress',JSON.stringify(p)),old);await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('wl-v2:wl-progress')).schemaVersion===5);const migrated=await save();assert.equal(migrated.schemaVersion,5);assert.equal(migrated.coins,777);assert.equal(migrated.boots,true);assert.equal(migrated.character.class,old.character.class);assert.equal(migrated.inventory.length,5);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-v2:wl-progress-pre-v5')).schemaVersion),4);
 // All five training stats explain their actual effects, in both languages.
 await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('wl-v2:wl-progress'));p.runs=1;p.totalDistance=7000;p.bestDistance=3500;p.unlocked=['training'];p.announcements=[];localStorage.setItem('wl-v2:wl-progress',JSON.stringify(p));});await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.setViewportSize({width:1280,height:800});
 const box=await page.locator('#scene').boundingBox();await clickStation(page,'training');await page.waitForTimeout(2400);await page.keyboard.press('e');await page.waitForSelector('[data-action=buy]');
 const config=await page.evaluate(async()=>await(await fetch('/balance.json')).json());for(const stat of config.workshop)assert.equal(await page.getByText(stat.description,{exact:true}).count(),1);await page.screenshot({path:'docs/browser/training-info-en.png'});
 await page.keyboard.press('F10');await page.locator('[data-action=language][data-arg=cs]').click();await page.keyboard.press('Escape');const cs=await page.evaluate(async()=>await(await fetch('/cs.json')).json());for(const stat of config.workshop)assert.equal(await page.getByText(cs[stat.description],{exact:true}).count(),1);await page.screenshot({path:'docs/browser/training-info-cs.png'});
 assert.equal(await page.locator('#error').isVisible(),false);assert.deepEqual(errors,[]);
 // Render the shared art directly for the visual verification contact sheet.
 await page.setViewportSize({width:1200,height:900});await page.evaluate(async()=>{const {character}=await import('/pixels.mjs');const cfg=await(await fetch('/balance.json')).json();const canvas=document.createElement('canvas');canvas.id='contact';canvas.width=1200;canvas.height=900;canvas.style='position:fixed;inset:0;z-index:50;width:1200px;height:900px';document.body.append(canvas);const ctx=canvas.getContext('2d');ctx.fillStyle='#20332d';ctx.fillRect(0,0,1200,900);for(let i=0;i<28;i++){ctx.save();ctx.translate((i%8)*150+25,Math.floor(i/8)*220+20);ctx.scale(4,4);character(ctx,0,0,{hair:'#5e3936',skin:'#dfaf87',hairStyle:i<16?i:0},i%6,false,false,i<16?'idle':i<22?'run':['idle','idle','jump','fall','land','hit'][i-22],cfg.starterEquipment);ctx.restore();}});await page.locator('#contact').screenshot({path:'docs/browser/character-poses.png'});
 console.log('Inventory Chromium checks passed: 16 hairstyles, empty starter inventory, gear slots, equipping found clothes, ownership, reload, native v4 migration, export/import/reset, Czech/English and narrow viewport.');
}finally{await browser.close();await new Promise(r=>host.close(r));}
