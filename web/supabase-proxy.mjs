import {bridgeSignature} from './server-bridge.mjs';
import {readJson} from './limits.mjs';
export async function supabaseProxy(request,endpoint,upstream=fetch,bridgeKey){
 let stage='ENDPOINT';try{
 const target=new URL(endpoint),original=new URL(request.url);
 if(target.protocol!=='https:'||!target.hostname.endsWith('.supabase.co')||target.search||target.hash||target.username||target.password)throw Error('Invalid Supabase endpoint');
 target.pathname=target.pathname.replace(/\/$/,'')+original.pathname;target.search=original.search;
 const headers=new Headers();for(const name of ['authorization','content-type','origin'])if(request.headers.has(name))headers.set(name,request.headers.get(name));
 // Use a custom signed source header; upstream platforms may rewrite CF headers. Cookies stay on the web host.
 headers.set('x-wl-source',request.headers.get('CF-Connecting-IP')||'unknown');
 stage='BODY';const body=request.method==='POST'?JSON.stringify(await readJson(request,16384,{timeoutMs:5000})):undefined;
 stage='SIGNATURE';if(bridgeKey){const timestamp=String(Date.now());headers.set('x-wl-timestamp',timestamp);headers.set('x-wl-signature',await bridgeSignature(bridgeKey,request,body,timestamp,headers.get('x-wl-source')));}
 stage='NETWORK';const response=await upstream(target.toString(),{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(25000)});
 stage='REDIRECT';if(response.status>=300&&response.status<400){await response.body?.cancel();throw Error('Unexpected backend redirect');}
 const out=new Headers();for(const name of ['content-type','cache-control','retry-after'])if(response.headers.has(name))out.set(name,response.headers.get(name));
 return new Response(response.body,{status:response.status,headers:out});
 }catch{return Response.json({error:'Server temporarily unavailable',code:'PROXY_'+stage},{status:503,headers:{'Cache-Control':'no-store'}});}
}
