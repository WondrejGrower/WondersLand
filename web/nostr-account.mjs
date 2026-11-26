import {schnorr} from '@noble/curves/secp256k1.js';
import {bech32} from '@scure/base';
import balance from '../src/balance.json' with {type:'json'};
import {fresh,migrate} from './core.mjs';
import {browserCookie,sessionCookie,saveLimit,tokenPattern} from './account-paths.mjs';

const encoder=new TextEncoder(),signatureWindow=60,sessionSeconds=30*86400;
const fromHex=value=>Uint8Array.from(value.match(/../g),byte=>parseInt(byte,16));
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const hash=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const failure=(error,status)=>json({error},status);
const cookie=(name,value,maxAge)=>name+'='+value+'; Max-Age='+maxAge+'; Path=/; Secure; HttpOnly; SameSite=Strict';
const supplied=(request,header)=>{
 const value=request.headers.get(header)||'';
 return tokenPattern.test(value)?value:null;
};

export async function sessionAccount(board,request,includeProgress=false){
 const session=supplied(request,'x-wl-session');
 if(!session)return null;
 return (await board.rows('SELECT a.npub,a.ranked_owner,a.revision'+(includeProgress?',a.progress':'')+' FROM nostr_sessions s JOIN nostr_accounts a ON a.npub=s.npub WHERE s.digest=? AND s.expires>?',await hash(session),board.now()))[0]||null;
}

export async function verifyNostrEvent(header,url,body,now){
 try{
  const encoded=header?.match(/^Nostr ([A-Za-z0-9+/]+={0,2})$/)?.[1];
  if(!encoded||encoded.length>4096)return null;
  const event=JSON.parse(atob(encoded));
  if(!event||Object.keys(event).sort().join(',')!=='content,created_at,id,kind,pubkey,sig,tags')return null;
  if(event.kind!==27235||event.content!==''||!Number.isSafeInteger(event.created_at)||Math.abs(Math.floor(now/1000)-event.created_at)>signatureWindow)return null;
  if(!tokenPattern.test(event.pubkey)||!tokenPattern.test(event.id)||!/^[a-f0-9]{128}$/.test(event.sig))return null;
  const expected={u:url,method:'POST',payload:await hash(body)};
  if(!Array.isArray(event.tags)||event.tags.length!==3)return null;
  for(const [key,value] of Object.entries(expected)){
   const matches=event.tags.filter(tag=>Array.isArray(tag)&&tag[0]===key);
   if(matches.length!==1||matches[0].length!==2||matches[0][1]!==value)return null;
  }
  const id=await hash(JSON.stringify([0,event.pubkey,event.created_at,event.kind,event.tags,event.content]));
  if(id!==event.id||!schnorr.verify(fromHex(event.sig),fromHex(id),fromHex(event.pubkey)))return null;
  const bytes=fromHex(event.pubkey);
  return bech32.encode('npub',bech32.toWords(bytes));
 }catch{return null;}
}

function profile(account){
 return {npub:account.npub,revision:Number(account.revision),progress:account.progress?JSON.parse(account.progress):null};
}

function personalSave(input){
 if(input?.schemaVersion!==5||input.adminTest||Object.keys(input.activeRun||{}).length)throw Error();
 const validated=migrate(input,balance);
 if(!validated.character.name)throw Error();
 const {name,skin,hair,shirt,hairStyle}=validated.character;
 const clean=Object.fromEntries(Object.keys(fresh()).map(key=>[key,validated[key]]));
 clean.character={name,class:validated.character.class,skin,hair,shirt,hairStyle};
 clean.research=validated.research.map(({id,started,end})=>({id,started,end}));
 if(validated.mine){
  const {owned,active,since,work}=validated.mine;clean.mine={owned,active,since,work};
 }
 return clean;
}

export async function accountRequest(board,request,body){
 const path=new URL(request.url).pathname,now=board.now();
 if(path.endsWith('/session')&&request.method==='GET'){
  const account=await sessionAccount(board,request,true);
  return json(account?profile(account):{npub:null});
 }
 if(request.method!=='POST')return failure('Method not allowed',405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return failure('Origin not allowed',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return failure('JSON required',415);
 let data;
 try{data=JSON.parse(body);}catch{return failure('Invalid request body',400);}
 if(!data||typeof data!=='object'||Array.isArray(data))return failure('Invalid request body',400);
 if(path.endsWith('/challenge')){
  if(Object.keys(data).length)return failure('Invalid request body',400);
  if(!await board.rate('nostr:'+await hash(request.headers.get('x-wl-source')||''),now,10))return failure('Please try again shortly',429);
  const challenge=token(),browser=supplied(request,'x-wl-browser')||token();
  await board.rows('DELETE FROM nostr_challenges WHERE digest IN (SELECT digest FROM nostr_challenges WHERE expires<=? LIMIT 64)',now);
  await board.rows('INSERT INTO nostr_challenges (digest,browser_digest,expires) VALUES (?,?,?)',await hash(challenge),await hash(browser),now+60000);
  const result=json({challenge});
  result.headers.set('Set-Cookie',cookie(browserCookie,browser,120));
  return result;
 }
 if(path.endsWith('/verify')){
  if(Object.keys(data).length!==1||!tokenPattern.test(data.challenge))return failure('Invalid request body',400);
  const browser=supplied(request,'x-wl-browser');
  if(!browser)return failure('Nostr challenge expired',401);
  if(!await board.rate('verify:'+await hash(request.headers.get('x-wl-source')||''),now,10))return failure('Please try again shortly',429);
  const npub=await verifyNostrEvent(request.headers.get('authorization'),request.url,body,now);
  if(!npub)return failure('Nostr signature rejected',401);
  const used=await board.rows('DELETE FROM nostr_challenges WHERE digest=? AND browser_digest=? AND expires>? RETURNING digest',await hash(data.challenge),await hash(browser),now);
  if(!used.length)return failure('Nostr challenge expired',401);
  const rankedOwner=await hash('wondersland:nostr:ranked:'+npub);
  await board.rows('INSERT INTO nostr_accounts(npub,ranked_owner) VALUES (?,?) ON CONFLICT(npub) DO NOTHING',npub,rankedOwner);
  await board.rows('DELETE FROM nostr_sessions WHERE digest IN (SELECT digest FROM nostr_sessions WHERE expires<=? LIMIT 64)',now);
  const previous=supplied(request,'x-wl-session');
  if(previous)await board.rows('DELETE FROM nostr_sessions WHERE digest=?',await hash(previous));
  const session=token();
  await board.rows('INSERT INTO nostr_sessions (digest,npub,expires) VALUES (?,?,?)',await hash(session),npub,now+sessionSeconds*1000);
  const [account]=await board.rows('SELECT npub,progress,revision FROM nostr_accounts WHERE npub=?',npub);
  const result=json(profile(account));
  result.headers.set('Set-Cookie',cookie(sessionCookie,session,sessionSeconds));
  return result;
 }
 if(path.endsWith('/logout')){
  if(Object.keys(data).length)return failure('Invalid request body',400);
  const session=supplied(request,'x-wl-session');
  if(session)await board.rows('DELETE FROM nostr_sessions WHERE digest=?',await hash(session));
  const result=json({npub:null});
  result.headers.set('Set-Cookie',cookie(sessionCookie,'',0));
  return result;
 }
 const account=await sessionAccount(board,request);
 if(!account)return failure('Sign in with Nostr first',401);
 if(path.endsWith('/save')){
  if(Object.keys(data).sort().join(',')!=='progress,revision'||!Number.isSafeInteger(data.revision)||data.revision<0)return failure('Invalid request body',400);
  let progress;
  try{progress=data.progress===null?null:personalSave(data.progress);}catch{return failure('Invalid progress file',400);}
  const encoded=JSON.stringify(progress);
  if(encoder.encode(encoded).length>saveLimit)return failure('Progress file is too large',413);
  const changed=await board.rows('UPDATE nostr_accounts SET progress=?,revision=revision+1 WHERE npub=? AND revision=? RETURNING revision',progress?encoded:null,account.npub,data.revision);
  return changed.length?json({revision:Number(changed[0].revision)}):failure('Cloud progress changed on another device',409);
 }
 return failure('Method not allowed',405);
}
