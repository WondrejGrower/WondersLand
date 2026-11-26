import {schnorr} from '@noble/curves/secp256k1.js';
import {bech32} from '@scure/base';

const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
let secret=null,loaded=false;

self.onmessage=async({data})=>{
 if(!loaded){
  loaded=true;
  try{
   if(typeof data!=='string'||!/^nsec1[023456789acdefghjklmnpqrstuvwxyz]{58}$/.test(data))return;
   const decoded=bech32.decode(data);
   if(decoded.prefix==='nsec')secret=Uint8Array.from(bech32.fromWords(decoded.words));
  }catch{}
  return;
 }
 self.onmessage=null;
 try{
  if(!secret||secret.length!==32)throw Error();
  const {kind,content,created_at,tags}=data;
  if(kind!==27235||content!==''||!Number.isSafeInteger(created_at)||Math.abs(created_at-Math.floor(Date.now()/1000))>60)throw Error();
  if(!Array.isArray(tags)||tags.length!==3||tags.some(tag=>!Array.isArray(tag)||tag.length!==2))throw Error();
  if(tags[0][0]!=='u'||tags[0][1]!==self.location.origin+'/api/account/verify'||tags[1][0]!=='method'||tags[1][1]!=='POST'||tags[2][0]!=='payload'||!/^[a-f0-9]{64}$/.test(tags[2][1]))throw Error();
  const pubkey=hex(schnorr.getPublicKey(secret));
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify([0,pubkey,created_at,kind,tags,content]))));
  const signed={id:hex(digest),pubkey,kind,content,created_at,tags,sig:hex(schnorr.sign(digest,secret))};
  self.postMessage(signed);
 }catch{
  self.postMessage(null);
 }finally{
  secret?.fill(0);
  secret=null;
  self.close();
 }
};
