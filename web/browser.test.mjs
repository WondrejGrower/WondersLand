import {chromium} from 'playwright';import {existsSync} from 'node:fs';import assert from 'node:assert/strict';import {server} from './serve.mjs';import {fresh} from './core.mjs';import {mkdir,readFile} from 'node:fs/promises';
const host=server();await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+host.address().port;
const browser=await chromium.launch({executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const sample=JSON.parse(await readFile('docs/live-recent-sample.json','utf8')).transactions[0];
await page.route('**/api/mempool',route=>route.fulfill({json:[sample]}));await page.route('**/api/tx/*/status',route=>route.fulfill({status:502,json:{error:'Unverified'}}));
const key=key=>page.keyboard.press(key),button=(label)=>page.getByRole('button',{name:label,exact:true});
await mkdir('docs/browser',{recursive:true});
try{
 await page.goto(origin);await page.waitForSelector('#name');await page.fill('#name','QPE Wsad');await key('Enter');
 assert.equal(await page.inputValue('#name'),'QPE Wsad');
 for(let i=0;i<12&&await page.locator(':focus').getAttribute('data-action')!=='create';i++)await key('s');await key('e');await page.waitForFunction(()=>document.querySelector('#sheet').hidden);
 await key('d');await page.keyboard.down('d');await page.waitForTimeout(2300);await page.keyboard.up('d');
 // Mouse walks through the same inverse camera transform, at every tested size.
 for(const size of [{width:1280,height:720},{width:1366,height:768},{width:1920,height:1080},{width:640,height:520}]){await page.setViewportSize(size);const box=await page.locator('#scene').boundingBox();await page.mouse.click(box.x+box.width*540/640,box.y+box.height*215/360);await page.waitForTimeout(300);}
 await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(2400);await page.waitForSelector('#interact:not([hidden])');
 await page.keyboard.down('e');await page.waitForSelector('[data-action=skill]');await page.keyboard.press('e');assert.equal(await page.locator('[data-action=skill]').count(),3);await page.keyboard.up('e');
 await key('s');await key('ArrowUp');await key('e');await page.waitForFunction(()=>document.querySelector('#sheet').hidden);
 await page.waitForSelector('[data-action=transaction]',{timeout:12000});assert.equal(await page.locator('code').textContent(),sample.txid);
 await key('e');await page.waitForSelector('[data-action=skill]');assert.match(await page.locator('#hud').textContent(),/^0 m/);await key('Escape');
 // A rich, isolated fixture exercises every station without altering user data.
 const p=fresh();Object.assign(p,{character:{name:'Willow',class:'gardener',hair:'#d6b96d',skin:'#dfaf87',shirt:'#679e86',hairStyle:1},coins:10000,runs:5,totalDistance:7000,bestDistance:3500,seeds:5,unlocked:['training','strength','agility','magnet','luck','yield','flying','forge','wardrobe','garden','classes','diamond']});
 await page.evaluate(data=>localStorage.setItem('wl-progress',JSON.stringify(data)),p);
 for(const lang of ['en','cs']){
  await page.goto(origin+'/?recorded=1&lang='+lang);await page.waitForFunction(()=>document.querySelector('#sheet').hidden);await page.waitForTimeout(150);await page.screenshot({path:`docs/browser/camp-${lang}.png`});
  await key('F10');await page.waitForSelector('[data-action=language]');await page.screenshot({path:`docs/browser/settings-${lang}.png`});
  await key('s');await key('e');assert.equal(await page.evaluate(()=>localStorage.getItem('wl-language')),'cs');assert.equal(await page.locator('#settings').textContent(),'Nastavení');
  await button(lang==='en'?'English':'Čeština').click();await key('Escape');await page.reload();await page.waitForFunction(()=>document.querySelector('#sheet').hidden);assert.equal(await page.locator('#settings').textContent(),lang==='en'?'Settings':'Nastavení');
  const box=await page.locator('#scene').boundingBox();await page.mouse.click(box.x+box.width*465/640,box.y+box.height*290/360);await page.waitForTimeout(1900);await key('e');await page.waitForSelector('[data-action=buy]');assert.equal(await page.locator('[data-action=class]').count(),0);await page.screenshot({path:`docs/browser/training-${lang}.png`});
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-progress')).workshop.strength||0);await key('e');const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-progress')).workshop.strength);assert.equal(after,before+1);await key('Escape');
  {const b=await page.locator('#scene').boundingBox();await page.mouse.click(b.x+b.width*540/640,b.y+b.height*215/360);await page.waitForTimeout(1500);await key('e');await page.waitForSelector('[data-action=skill]');await page.screenshot({path:`docs/browser/skills-${lang}.png`});await key('e');await page.waitForSelector('[data-action=transaction]',{timeout:15000});await page.screenshot({path:`docs/browser/results-${lang}.png`});await key('Escape');}
 }
 await key('F10');
 const imported={...fresh(),schemaVersion:3,character:{name:'Native transfer',class:'gardener',hair:'#5e3936',skin:'#dfaf87',shirt:'#679e86',hairStyle:0},coins:777,owned:['hands'],workshop:{strength:7},runs:1,milestones:['T1:60','T2:120']};
 await page.locator('#import').setInputFiles({name:'progress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
 await page.waitForSelector('[data-action=import-apply]');await key('s');await key('e');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-progress')).coins),777);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-progress')).workshop.strength),7);
 await button('Resetovat postavu a veškerý postup?').click();await button('Smazat postup').click();await page.waitForSelector('#name');assert.equal(await page.evaluate(()=>localStorage.getItem('wl-language')),'cs');await page.reload();await page.waitForSelector('#name');assert.equal(await page.locator('#settings').textContent(),'Nastavení');
 const dpi=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:2});
 const high=await dpi.newPage();await high.addInitScript(data=>{localStorage.setItem('wl-progress',JSON.stringify(data));localStorage.setItem('wl-language','cs');},p);
 await high.goto(origin+'/?recorded=1');await high.waitForFunction(()=>document.querySelector('#sheet').hidden);await high.screenshot({path:'docs/browser/camp-dpi2.png'});await dpi.close();
 assert.equal(await page.locator('#error').isVisible(),false);assert.deepEqual(errors,[]);console.log('Browser journey, keyboard, live language, reset, purchase, identity, retry and four sizes passed. Screenshots: docs/browser/');
}catch(error){console.error('Browser state:',await page.locator('#hud').textContent(),await page.locator('#menu').textContent(),await page.locator('#error').textContent(),errors);await page.screenshot({path:'/tmp/wl-browser-failure.png'});throw error;}finally{await browser.close();await new Promise(resolve=>host.close(resolve));}
