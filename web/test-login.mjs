let attempt=0;
async function login(){
 const current=++attempt,token=location.hash.slice(1);history.replaceState(null,'','/test');
 const message=document.querySelector('#test-status');
 if(token){message.textContent='Checking private access… / Ověřuji přístup…';try{const r=await fetch('/api/admin-test/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),cache:'no-store',signal:AbortSignal.timeout(10000)});if(current!==attempt)return;if(!r.ok)throw Error();location.replace('/test');}catch{if(current===attempt)message.textContent='Invalid or expired private link. / Neplatný nebo expirovaný soukromý odkaz.';}}
 else{try{const r=await fetch('/api/admin-test/status',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(current===attempt&&r.ok)location.replace('/test');}catch{}}
}
addEventListener('hashchange',login);login();
