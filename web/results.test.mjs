import {clickWorld} from './test-camera.mjs';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {server} from './serve.mjs';
import {fresh} from './core.mjs';
const host=server();await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const profile={...fresh(),character:{name:'Willow',class:'gardener',hair:'#5e3936',skin:'#dfaf87',shirt:'#679e86',hairStyle:0}};
await page.addInitScript(p=>localStorage.setItem('wl-progress',JSON.stringify(p)),profile);

// Deliberately synthetic giant fixture forces a collision even while jump is held.
await page.route('**/api/mempool',r=>r.fulfill({json:[{txid:'a'.repeat(64),value:'2000000000000000'}]}));
await page.route('**/api/tx/*/status',r=>r.fulfill({status:502,json:{error:'unverified test fixture'}}));
try {
 await page.goto('http://127.0.0.1:'+host.address().port);await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await page.waitForFunction(()=>document.querySelector('#sheet').hidden);
 const translated=await page.evaluate(async p=>{
  const {drawRun}=await import('/art.mjs');const config=await(await fetch('/balance.json')).json();
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const labels=[];
  drawRun(canvas.getContext('2d'),{phase:'running',distance:400,animation:31,y:0,profile:p,region:config.regions[0],regionIndex:0,invulnerable:0,landing:0,obstacles:[{x:500,h:500,w:96,type:'sequoia',txid:'a'.repeat(64)}],coins:[],flying:{id:'leap',name:'Strong leap',x:300,y:35,age:0,blocked:false}},key=>{labels.push(key);return key;});
  return labels;
 },profile);
 assert.ok(translated.includes('Strong leap'),'Flying upgrade labels must call the translator, not animation time');
 assert.ok(translated.includes('Tall canopy continues above the view'),'Tall-tree labels must also translate safely');

 const box=await page.locator('#scene').boundingBox();
 await clickWorld(page,540,215);await page.waitForTimeout(2600);
 await page.keyboard.press('e');await page.waitForSelector('[data-action=skill]');await page.keyboard.press('e');
 await page.waitForFunction(()=>document.querySelector('#sheet').hidden);
 await page.keyboard.down('Space');
 await page.waitForSelector('[data-action=transaction]',{timeout:12000});
 await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.up('Space');
 await page.waitForTimeout(150);
 assert.equal(await page.locator('[data-action=transaction]').isVisible(),true,'Holding jump across death must leave the results open');
 await page.keyboard.press('Space');await page.keyboard.press('Space');
 assert.equal(await page.locator('[data-action=transaction]').isVisible(),true,'Fresh jump presses must not activate a result action');
 assert.equal(await page.getByRole('button',{name:'Try again',exact:true}).isVisible(),true);
 assert.equal(await page.getByRole('button',{name:'Return to Base Camp',exact:true}).isVisible(),true);
 await page.keyboard.press('e');await page.waitForSelector('[data-action=skill]');
 assert.match(await page.locator('#hud').textContent(),/^0 m/);
 await page.keyboard.press('e');await page.waitForFunction(()=>document.querySelector('#sheet').hidden);
 await page.waitForSelector('[data-action=transaction]',{timeout:12000});
 await page.keyboard.press('s');await page.keyboard.press('e');
 await page.waitForFunction(()=>document.querySelector('#hud').textContent==='Base Camp');
 assert.equal(await page.locator('#error').isVisible(),false,'No caught rendering errors may hide results');
 assert.deepEqual(errors,[]);
 console.log('Results regression passed: flying/tall-tree translations, held/repeated jump, explicit retry, and keyboard camp return.');
} catch(error) {console.error('Results failure state:',await page.locator('#hud').textContent(),await page.locator('#menu').textContent(),await page.locator('#error').textContent(),errors);throw error;} finally {await browser.close();await new Promise(resolve=>host.close(resolve));}
