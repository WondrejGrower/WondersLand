export const accountPath=/^\/api\/account\/(?:challenge|verify|session|save|logout)$/;
export const saveLimit=2097152;
export const accountBodyLimit=saveLimit+1024;
export const tokenPattern=/^[a-f0-9]{64}$/;
export const sessionCookie='__Host-wl-nostr';
export const browserCookie='__Host-wl-nostr-browser';

export function cookieToken(request,name){
 const pair=(request.headers.get('cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='));
 const value=pair?.slice(name.length+1);
 return tokenPattern.test(value||'')?value:null;
}
