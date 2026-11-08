import {readJson} from './limits.mjs';
// A small, bounded reserve. No networking in the animation loop.
export class TransactionFeed {
 constructor({recorded=false,queue,active,visible,receive,status,request=(...args)=>fetch(...args),schedule=(...args)=>setTimeout(...args),cancel=id=>clearTimeout(id)}){
  Object.assign(this,{recorded,queue,active,visible,receive,status,request,schedule,cancel});
  this.timer=null;this.fetching=false;this.failures=0;this.loaded=false;
 }
 start(){this.wake();}
 wake(){this.cancel(this.timer);this.timer=null;if(!this.fetching)this.refresh();}
 async refresh(){
  if(this.fetching)return;
  let delay=15000;
  try{
   if(!this.visible()||(this.recorded&&this.loaded))return;
   const count=this.queue().pending.length;
   if(this.loaded&&count>=80)return;
   // Keep a small starter reserve in camp, replenish more often during a run.
   if(this.loaded&&!this.active()&&count>=20)return;
   this.fetching=true;
   const response=await this.request(this.recorded?'./recorded.json':'/api/mempool',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('offline');
   const payload=await readJson(response,this.recorded?2*1024*1024:128*1024),rows=this.recorded?payload.transactions:payload;
   if(!Array.isArray(rows)||rows.length>1024)throw Error('offline');
   this.receive(rows);this.loaded=true;this.failures=0;this.status(this.recorded?'replay':'live');
   if(this.active()&&this.queue().pending.length<40)delay=5000;
  }catch{
   this.failures++;this.status('offline');delay=Math.min(60000,5000*2**Math.min(this.failures-1,4));
  }finally{
   this.fetching=false;
   if(!(this.recorded&&this.loaded))this.timer=this.schedule(()=>this.refresh(),delay);
  }
 }
}
