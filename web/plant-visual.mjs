// Graphics version is independent of balance/save versions. ASCII keys (TXID/fixture IDs).
function descriptor(type,sats,h,txid,fixture){
 var key=txid||('fixture:'+type+':'+sats+':'+(fixture||'legacy'));
 var hash=2166136261;
 for(var i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=(hash+(hash<<1)+(hash<<4)+(hash<<7)+(hash<<8)+(hash<<24))>>>0;}
 var bounds={flower:[0,100000],tulip:[100000,350000],rose:[350000,800000],fern:[800000,1000000],birch:[1000000,100000000],pine:[100000000,1000000000],oak:[1000000000,100000000000]};
 var b=bounds[type],v=Number(sats),t=b?(b[0]?Math.log(Math.max(v,b[0])/b[0])/Math.log(b[1]/b[0]):v/b[1]):Math.log(Math.max(1,h)/ (type==='cannabis'?4:243))/Math.log(4);
 t=Math.max(0,Math.min(1,t));
 return {version:1,seed:hash,variant:hash%4,mirror:(hash>>>2)%2,tone:(hash>>>3)%3,growth:Math.min(3,Math.floor(t*4))};
}

export {descriptor};
