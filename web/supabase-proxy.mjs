import {bridgeSignature} from './server-bridge.mjs';
import {readJson} from './limits.mjs';
export async function supabaseProxy(request,endpoint,upstream=fetch,bridgeKey){
 const target=new URL(endpoint),original=new URL(request.url);
 if(target.protocol!=='https:'||!target.hostname.endsWith('.supabase.co')||target.search||target.hash||target.username||target.password)throw Error('Invalid Supabase endpoint');
 target.pathname=target.pathname.replace(/\/$/,'')+original.pathname;target.search=original.search;
 const headers=new Headers();for(const name of ['authorization','content-type','origin'])if(request.headers.has(name))headers.set(name,request.headers.get(name));
 // Cloudflare overwrites this header at ingress; private browser cookies never leave the web host.
 headers.set('CF-Connecting-IP',request.headers.get('CF-Connecting-IP')||'unknown');
 const body=request.method==='POST'?JSON.stringify(await readJson(request,16384,{timeoutMs:5000})):undefined;
 if(bridgeKey){const timestamp=String(Date.now());headers.set('x-wl-timestamp',timestamp);headers.set('x-wl-signature',await bridgeSignature(bridgeKey,request,body,timestamp,headers.get('CF-Connecting-IP')));}
 const response=await upstream(target,{method:request.method,headers,body,redirect:'error',signal:AbortSignal.timeout(25000)});
 const out=new Headers();for(const name of ['content-type','cache-control','retry-after'])if(response.headers.has(name))out.set(name,response.headers.get(name));
 return new Response(response.body,{status:response.status,headers:out});
}
