import {readJson} from './limits.mjs';
// Preserve private identity and retired outbox, but never replay raw claims into verified records.
export class LeaderboardClient{
 constructor({storage=localStorage,fetcher=(...args)=>fetch(...args),onChange=()=>{}}={}){this.storage=storage;this.fetcher=fetcher;this.onChange=onChange;this.acceptingSubmissions=false;this.statuses=new Map();this.queue=this.read('wl-board-outbox',[]);if(!Array.isArray(this.queue))this.queue=[];this.queue=this.queue.slice(-20);}
 read(key,fallback){try{return JSON.parse(this.storage.getItem(key))??fallback;}catch{return fallback;}}
 key(){let key=this.storage.getItem('wl-board-key');if(!/^[a-f0-9]{64}$/.test(key||'')){key=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');this.storage.setItem('wl-board-key',key);}return key;}
 status(id){return this.statuses.get(id)||'';}
 mark(id,status){if(this.statuses.size>=32&&!this.statuses.has(id))this.statuses.delete(this.statuses.keys().next().value);this.statuses.set(id,status);this.onChange();}
 begin(meta){if(meta.mode==='live')this.mark(meta.runId,'readonly');}
 finish(meta){if(meta.mode==='live')this.mark(meta.runId,'readonly');}
 recover(){}
 async flush(){}
 async post(){const error=new Error('Client-reported submissions are closed');error.status=410;throw error;}
 async load(month,metric='best'){const response=await this.fetcher('/api/leaderboard?'+(month?'month='+encodeURIComponent(month)+'&':'')+'metric='+encodeURIComponent(metric),{cache:'no-store'});if(!response.ok)throw Error('Leaderboard unavailable');return readJson(response,65536);}
}
