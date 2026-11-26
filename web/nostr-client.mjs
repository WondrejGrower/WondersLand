import {epochHeader,playerEpoch,playerKey} from './player-epoch.mjs';
import {readJson} from './limits.mjs';

export function localNsecSigner(nsec){
 const worker=new Worker(new URL('./nostr-local-worker.mjs',import.meta.url),{type:'module'});
 worker.postMessage(nsec);
 return {
  signEvent(template){
   return new Promise((resolve,reject)=>{
    const fail=()=>{clearTimeout(timeout);reject(Error('Local Nostr signing failed. Check your NSEC.'));};
    const timeout=setTimeout(fail,5000);
    worker.onerror=fail;
    worker.onmessage=({data})=>{
     if(!data){fail();return;}
     clearTimeout(timeout);resolve(data);
    };
    worker.postMessage(template);
   });
  },
  dispose(){worker.terminate();}
 };
}

export class CloudProgress {
 constructor(onChange){
  this.onChange=onChange;
  this.account=null;
  this.revision=0;
  this.pending=undefined;
  this.sending=null;
  this.conflict=false;
  this.failed=false;
 }
 async request(path,body,authorization){
  const response=await fetch('/api/account/'+path,{
   method:body===undefined?'GET':'POST',
   headers:{[epochHeader]:playerEpoch,...(body===undefined?{}:{'Content-Type':'application/json'}),...(authorization?{Authorization:authorization}:{})},
   ...(body===undefined?{}:{body}),
   signal:AbortSignal.timeout(path==='session'?4500:25000),
   keepalive:path==='save'&&body?.length<15000,
   cache:'no-store'
  });
  const data=await readJson(response,3*1024*1024);
  if(!response.ok){
   const error=new Error(data.error||'Nostr accounts are unavailable');
   error.status=response.status;throw error;
  }
  return data;
 }
 async login(signer){
  if(!signer?.signEvent)throw Error('Open WondersLand in a browser with a Nostr signer.');
  const {challenge}=await this.request('challenge','{}');
  const body=JSON.stringify({challenge});
  const payload=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))),b=>b.toString(16).padStart(2,'0')).join('');
  const event=await signer.signEvent({
   kind:27235,created_at:Math.floor(Date.now()/1000),content:'',
   tags:[['u',location.origin+'/api/account/verify'],['method','POST'],['payload',payload]]
  });
  if(!event)throw Error('Nostr signature rejected');
  // Only relay the public NIP-98 event fields returned by the signer.
  const {id,pubkey,sig,created_at,kind,tags,content}=event;
  return this.request('verify',body,'Nostr '+btoa(JSON.stringify({id,pubkey,sig,created_at,kind,tags,content})));
 }
 get cacheKey(){return this.account?playerKey('wl-cloud-sync:'+this.account):null;}
 connect(account){
  this.account=account.npub;
  this.revision=account.revision;
  this.pending=undefined;
  this.conflict=false;
  this.failed=false;
  try{
   const cached=JSON.parse(localStorage.getItem(this.cacheKey));
   if(cached&&Object.hasOwn(cached,'progress')){
    if(JSON.stringify(cached.progress)!==JSON.stringify(account.progress)){
     this.pending=cached.progress;
     this.conflict=cached.revision!==this.revision;
    }else this.remember();
   }
  }catch{}
  this.onChange();
 }
 remember(){
  if(!this.cacheKey)return;
  if(this.pending===undefined)localStorage.removeItem(this.cacheKey);
  else localStorage.setItem(this.cacheKey,JSON.stringify({revision:this.revision,progress:this.pending}));
 }
 put(progress){
  this.pending=progress;
  this.remember();
  this.schedule();
 }
 schedule(){
  clearTimeout(this.timer);
  if(this.account&&!this.conflict)this.timer=setTimeout(()=>void this.flush(),350);
 }
 async flush(){
  if(this.sending){await this.sending;return this.flush();}
  if(this.pending===undefined||!this.account||this.conflict)return;
  const progress=this.pending,account=this.account;
  this.sending=this.request('save',JSON.stringify({progress,revision:this.revision}))
   .then(result=>{
    if(this.account!==account)return;
    this.revision=result.revision;
    if(this.pending===progress)this.pending=undefined;
    this.remember();this.failed=false;
   })
   .catch(error=>{if(this.account===account){this.failed=true;this.conflict=error.status===409;}})
   .finally(()=>{this.sending=null;this.onChange();});
  await this.sending;
  if(this.pending!==undefined&&!this.failed&&!this.conflict)this.schedule();
 }
 async logout(){
  clearTimeout(this.timer);
  await this.flush();
  await this.request('logout','{}');
  this.account=null;this.pending=undefined;this.conflict=false;this.failed=false;this.onChange();
 }
}
