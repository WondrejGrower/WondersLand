import {epochHeader} from './player-epoch.mjs';
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function bridgeSignature(secret,request,body,timestamp,source,identity=[]){
 const url=new URL(request.url),hash=hex(await crypto.subtle.digest('SHA-256',encoder.encode(body||''))),message=[request.method,url.pathname+url.search,timestamp,source,hash,...identity].join('\n');
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(message)));
}
export async function bridgeAuthorized(secret,request,body,now=Date.now()){
 const timestamp=request.headers.get('x-wl-timestamp')||'',signature=request.headers.get('x-wl-signature')||'',source=request.headers.get('x-wl-source')||'';
 if(!secret||!/^\d{13}$/.test(timestamp)||Math.abs(now-Number(timestamp))>60000||!source||source.length>128||!/^[a-f0-9]{64}$/.test(signature))return false;
 const expected=await bridgeSignature(secret,request,body,timestamp,source,bridgeIdentity(request.headers));let diff=0;for(let i=0;i<64;i++)diff|=signature.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}

export function bridgeIdentity(headers){const session=headers.get('x-wl-session')||'',browser=headers.get('x-wl-browser')||'';const epoch=headers.get(epochHeader)||'';return session||browser||epoch?[session,browser,epoch]:[];}
