import {chromium} from 'playwright';import {existsSync} from 'node:fs';import assert from 'node:assert/strict';import {server} from './serve.mjs';
const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});const errors=[];
try {
 for(const [id,label] of [['gardener','Zahradník'],['explorer','Průzkumník'],['collector','Sběratel']]){
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/mempool',r=>r.fulfill({json:[]}));
  await page.goto('http://127.0.0.1:'+host.address().port+'/?lang=cs');await page.waitForSelector('#name');await page.fill('#name','Willow');await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-action=creation-role]').count(),3);
  // Select the role using both direction families; confirming does not create the character yet.
  await page.locator('[data-action=creation-role][data-arg=gardener]').focus();
  if(id==='explorer')await page.keyboard.press('d');
  if(id==='collector'){await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');}
  await page.keyboard.press('e');assert.equal(await page.locator('[data-action=creation-role].selected').getAttribute('data-arg'),id);
  assert.equal(await page.locator('#name').isVisible(),true);
  if(id==='collector')await page.screenshot({path:'docs/browser/creation-role-cs.png'});
  await page.keyboard.press('s');await page.keyboard.press('e');await page.waitForFunction(()=>document.querySelector('#sheet').hidden);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-progress')).character.class),id);
  // Simulate an established character whose old save still carries the removed unlock notice.
  await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('wl-progress'));p.coins=777;p.runs=5;p.totalDistance=7000;p.bestDistance=3500;p.unlocked=['classes','training','strength'];p.announcements=['classes'];p.workshop={strength:7};localStorage.setItem('wl-progress',JSON.stringify(p));});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#sheet').hidden);
  const box=await page.locator('#scene').boundingBox();await page.mouse.click(box.x+box.width*270/640,box.y+box.height*190/360);await page.waitForTimeout(1000);await page.keyboard.press('e');
  await page.waitForSelector('[data-action=close]');assert.equal(await page.locator('[data-action=class],[data-action=creation-role]').count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-progress')).character.class),id);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-progress')).coins),777);
  assert.equal(await page.locator('#error').isVisible(),false);
  await page.keyboard.press('Escape');await page.keyboard.press('F10');await page.locator('[data-action=reset-confirm]').click();await page.locator('[data-action=reset]').click();await page.waitForSelector('[data-action=creation-role]');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wl-progress')).character.class),undefined);
  assert.equal(await page.locator('[data-action=creation-role]').count(),3);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Role regression passed: all three creation choices, keyboard navigation, immutable existing roles, legacy notices, and reset.');
}finally{await browser.close();await new Promise(r=>host.close(r));}
