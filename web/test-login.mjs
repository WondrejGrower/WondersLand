const token=location.hash.slice(1);history.replaceState(null,'','/test');
if(token){const message=document.querySelector('#test-status');message.textContent='Checking private access… / Ověřuji přístup…';try{const r=await fetch('/api/admin-test/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),cache:'no-store'});if(!r.ok)throw Error();location.replace('/test');}catch{message.textContent='Invalid or expired private link. / Neplatný nebo expirovaný soukromý odkaz.';}}

else{fetch('/api/admin-test/status',{cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>{if(r.ok)location.replace('/test');}).catch(()=>{});}
