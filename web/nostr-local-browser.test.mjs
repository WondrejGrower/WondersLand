import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright';
import {schnorr} from '@noble/curves/secp256k1.js';
import {bytesToHex} from '@noble/curves/utils.js';
import {bech32} from '@scure/base';
import {verifyNostrEvent} from './nostr-account.mjs';
import {server} from './serve.mjs';

const {secretKey,publicKey}=schnorr.keygen();
const nsec=bech32.encode('nsec',bech32.toWords(secretKey));
const secretHex=bytesToHex(secretKey);
const npub=bech32.encode('npub',bech32.toWords(publicKey));
secretKey.fill(0);
const containsSecret=text=>typeof text==='string'&&(text.includes(nsec)||text.includes(secretHex));
const host=server();
await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+host.address().port;
const browser=await chromium.launch({
 executablePath:process.env.WL_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),
 headless:true,args:['--no-sandbox']
});
try{
 const page=await browser.newPage({hasTouch:true,isMobile:true,viewport:{width:320,height:700}});
 let leaks=0,verified=0,challenges=0;
 const work=[];
 page.on('request',request=>work.push((async()=>{
  if([request.url(),request.postData(),JSON.stringify(await request.allHeaders())].some(containsSecret))leaks++;
 })()));
 page.on('console',message=>{if(containsSecret(message.text()))leaks++;});
 page.on('pageerror',error=>{if(containsSecret(error.message))leaks++;});
 await page.route('**/api/account/session',r=>r.fulfill({json:{npub:null}}));
 await page.route('**/api/account/challenge',r=>{
  const challenge=String(++challenges).padStart(64,'0');
  return r.fulfill({json:{challenge}});
 });
 await page.route('**/api/account/verify',async route=>{
  const request=route.request();
  const identity=await verifyNostrEvent(request.headers().authorization,request.url(),request.postData(),Date.now());
  if(identity===npub)verified++;
  if(verified===1){
   await route.fulfill({status:401,json:{error:'Nostr challenge expired'}});
   return;
  }
  await route.fulfill({status:identity===npub?200:401,json:identity===npub?
   {npub,revision:0,progress:null}:{error:'Nostr signature rejected'}});
 });
 await page.route('**/api/mempool',r=>r.fulfill({json:[]}));
 await page.goto(origin+'/?lang=cs');
 await page.getByRole('button',{name:'Rozšířené · NSEC'}).tap();
 const field=page.locator('#nsec-key');
 await field.fill('not-a-private-key');
 await page.getByRole('button',{name:'Přihlásit přes NSEC'}).tap();
 assert.equal(await field.inputValue(),'');
 const alert=page.getByRole('alert');
 await alert.getByText('Zadej platný NSEC.').waitFor();
 await field.fill(nsec);
 const workerResponse=page.waitForResponse(r=>r.url()===origin+'/nostr-local-worker.mjs');
 await page.getByRole('button',{name:'Přihlásit přes NSEC'}).tap();
 assert.match((await (await workerResponse).allHeaders())['content-security-policy'],/connect-src 'none'/);
 await alert.getByText('Platnost přihlašovací výzvy vypršela. Zkus to znovu.').waitFor();
 assert.equal(await field.inputValue(),'');
 assert.equal(await page.locator('#error').isVisible(),false);
 assert.equal(await page.locator('#menu').evaluate(menu=>menu.scrollWidth<=menu.clientWidth&&menu.getBoundingClientRect().right<=innerWidth),true);
 await field.fill(nsec);
 await page.getByRole('button',{name:'Přihlásit přes NSEC'}).tap();
 await page.locator('#name').waitFor();
 assert.equal(await field.count(),0);
 assert.equal(verified,2);
 assert.equal(challenges,2);
 await Promise.all(work);
 assert.equal(leaks,0);
 const stored=await page.evaluate(async()=>{
  const databases=await indexedDB.databases();
  if(databases.length)throw Error('Expected the sign-in to leave IndexedDB empty');
  const snapshots=[{...localStorage},{...sessionStorage},document.cookie];
  for(const name of await caches.keys()){
   const cache=await caches.open(name);
   for(const request of await cache.keys())snapshots.push(request.url,await (await cache.match(request)).text());
  }
  return JSON.stringify(snapshots);
 });
 assert.equal(containsSecret(stored),false);
 assert.equal(containsSecret(JSON.stringify(await page.context().cookies())),false);
 console.log('Local NSEC sign-in: signature verified, input cleared, no test secret in network or inspected browser storage.');
}finally{
 await browser.close();
 host.closeAllConnections();
 await new Promise(resolve=>host.close(resolve));
}
