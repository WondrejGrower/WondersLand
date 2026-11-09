// Real keyboard input, isolated reward-free practice and the browser/PWA art.
import {chromium} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {server} from './serve.mjs';

const host=server();await new Promise(r=>host.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.clock.pauseAt(Date.now()+100);
 await page.route('**/api/mempool',r=>r.fulfill({json:[]}));
 await page.route('**/app.mjs',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('web/app.mjs','utf8')+`
 window.fixture={get game(){return game;},setup(){overlay='';game.create('Jump playtest',{class:'gardener',hair:'#5e3936',skin:'#dfaf87',hairStyle:0});game.startPractice('fern');game.spawn=1e9;game.obstacles=[];game.coins=[];touch();}};`}));
 await page.goto('http://127.0.0.1:'+host.address().port+'/?lang=cs');
 await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await page.evaluate(()=>fixture.setup());await page.clock.runFor(40);
 const frames=[];
 async function snapshot(label){frames.push(await page.evaluate(label=>({label,...fixture.game.state(),time:fixture.game.time}),label));}
 await snapshot('Před odrazem');
 await page.keyboard.down('Space');await page.clock.runFor(80);await page.keyboard.up('Space');
 await snapshot('Odraz · 0,08 s');
 for(const [ms,label] of [[170,'Stoupání · 0,25 s'],[250,'Stoupání · 0,50 s'],[167,'Vrchol · 0,67 s'],[183,'Klesání · 0,85 s'],[250,'Před dopadem · 1,10 s'],[150,'Dopad · 1,25 s'],[80,'Návrat do běhu']]){
  await page.clock.runFor(ms);await snapshot(label);
 }
 assert.equal(await page.evaluate(()=>fixture.game.trace.filter(e=>e.event==='jump').length),1);
 assert.ok(frames[4].y>45&&frames[4].y<47);
 assert.equal(frames.at(-1).y,0);
 assert.equal(await page.evaluate(()=>fixture.game.p.runs),0);
 await page.evaluate(async frames=>{
  const {character}=await import('/pixels.mjs');
  const canvas=document.createElement('canvas');canvas.id='jump-feel-contact';canvas.width=1200;canvas.height=730;
  canvas.style='position:fixed;inset:0;z-index:100;width:1200px;height:730px';document.body.append(canvas);
  const c=canvas.getContext('2d');c.fillStyle='#101d2b';c.fillRect(0,0,1200,730);
  c.fillStyle='#eee1ae';c.font='22px sans-serif';c.fillText('Základní skok · návrh journey-7',24,32);
  c.font='15px sans-serif';c.fillText('Syntetický trénink · bez Síly, schopností a odměn · krátký stisk mezerníku',24,58);
  for(let i=0;i<frames.length;i++){
   const s=frames[i],x=24+i%5*236,y=96+Math.floor(i/5)*310;
   c.fillStyle='#b3c5ac';c.font='15px sans-serif';c.fillText(s.label,x,y);
   c.fillStyle='#d9a94f';c.fillText(s.y.toFixed(1)+' px',x,y+22);
   c.save();c.translate(x+45,y+48);c.scale(2.4,2.4);
   c.fillStyle='#557f48';c.fillRect(-14,92,80,2);
   const mode=s.y>0?(s.velocity<0?'fall':'jump'):s.landing>0?'land':'run';
   character(c,0,92-s.y-40,s.profile.character,Math.floor(s.animation*10),false,false,mode,s.profile.equipment,false,{velocity:s.velocity,landing:s.landing});
   c.restore();
  }
 },frames);
 await page.locator('#jump-feel-contact').screenshot({path:'docs/browser/jump-feel-journey-7.png'});
 assert.deepEqual(errors,[]);
 console.log('Jump feel: real short Space input, ~46 px apex, landing, no rewards/errors and nine-frame shared-renderer preview passed.');
}finally{await browser.close();await new Promise(r=>host.close(r));}
