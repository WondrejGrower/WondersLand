// Synthetic fixture gallery, plus real desktop/mobile game verification.
import {chromium} from 'playwright';import {existsSync,readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import {server} from './serve.mjs';
const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),args:['--no-sandbox'],headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/mempool',r=>r.fulfill({json:[{txid:'1'.repeat(64),value:'200000'}]}));
 await page.route('**/app.mjs',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('web/app.mjs','utf8')+'\nwindow.fixture={get game(){return game;}};'}));
 await page.goto('http://127.0.0.1:'+host.address().port);await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await page.evaluate(()=>{const g=fixture.game;g.create('Botany',{class:'gardener'});g.startPractice('tulip');g.spawnPlant();g.obstacles[0].x=330;g.jump();g.tick(.1);});
 await page.waitForTimeout(80);await page.screenshot({path:'docs/browser/plant-run-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);await page.screenshot({path:'docs/browser/plant-run-mobile.png'});
 await page.setViewportSize({width:1280,height:900});const gallery=await page.evaluate(async()=>{
  const {plant:make}=await import('/core.mjs'),{descriptor}=await import('/plant-visual.mjs'),art=await import('/environment.mjs');
  const config=await(await fetch('/balance.json')).json(),image=new Image();image.src='/art/flora.png';await image.decode();art.setAtlases(null,image);
  const canvas=document.createElement('canvas');canvas.width=1260;canvas.height=9*440+70;canvas.id='botany';canvas.style='position:absolute;left:0;top:0;z-index:999;background:#20332d';document.body.append(canvas);const c=canvas.getContext('2d');c.fillStyle='#20332d';c.fillRect(0,0,canvas.width,canvas.height);c.font='14px monospace';c.fillStyle='#eee3bf';c.fillText('TEST FIXTURES / TESTOVACI NAHLED — NOT LIVE MEMPOOL / NEJDE O ZIVY MEMPOOL',16,24);c.fillText('One logical pixel = one gallery pixel. Dashed boxes show collision dimensions.',16,46);
  const rows=[['flower','1','30000','99999'],['tulip','100000','200000','349999'],['rose','350000','550000','799999'],['fern','800000','900000','999999'],['birch','1000000','10000000','99999999'],['pine','100000000','300000000','999999999'],['oak','1000000000','10000000000','99999999999'],['sequoia','100000000000','250000000000','500000000000'],['cannabis','420','42000000','420000000000']];
  for(let row=0;row<rows.length;row++){
   const [name,...values]=rows[row],base=70+row*440;c.fillStyle='#eee3bf';c.fillText(name,16,base+15);
   for(let col=0;col<7;col++){
    const sats=col<3?values[col]:values[1],p=make(sats,config);p.x=40;p.visual=descriptor(p.type,p.sats,p.h,String(col<3?0:col-3).padStart(64,'0'),'gallery');
    const x=col*180;c.save();c.translate(x,base+28);art.plant(c,p,358);c.strokeStyle='#b4bba0';c.setLineDash([2,3]);c.strokeRect(p.x-.5,358-p.h-.5,p.w+1,p.h+1);c.restore();c.fillStyle='#eee3bf';c.fillText(sats+' sat',x+8,base+421);c.fillText(p.w+' x '+p.h+' px / v'+p.visual.variant,x+8,base+437);
   }
  }
 return canvas.toDataURL('image/png');});writeFileSync('docs/browser/plant-morphology.png',Buffer.from(gallery.split(',')[1],'base64'));assert.deepEqual(errors,[]);console.log('Synthetic botanical gallery and actual desktop/mobile run passed without browser errors.');
}finally{await browser.close();await new Promise(r=>host.close(r));}
