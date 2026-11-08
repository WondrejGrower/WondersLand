export const CSP="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'";
export function secure(response,url){const headers=new Headers(response.headers);headers.set('Content-Security-Policy',CSP);headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');if(url.protocol==='https:')headers.set('Strict-Transport-Security','max-age=2592000');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
// Bounded local backstop; Cloudflare bindings below enforce shared per-location limits.
const buckets=new Map();
export async function allowed(request,env){const ip=request.headers.get('CF-Connecting-IP')||'unknown',now=Date.now(),bucket=Math.floor(now/60000),key=ip;let row=buckets.get(key);if(!row||row.bucket!==bucket){if(buckets.size>=4096)buckets.delete(buckets.keys().next().value);row={bucket,hits:0};buckets.set(key,row);}if(++row.hits>120)return false;
 if(env.EDGE_API_LIMIT&&!(await env.EDGE_API_LIMIT.limit({key:ip})).success)return false;
 if(request.method!=='GET'&&env.EDGE_WRITE_LIMIT&&!(await env.EDGE_WRITE_LIMIT.limit({key:ip})).success)return false;
 return true;
}
