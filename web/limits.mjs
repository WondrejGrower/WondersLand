// Bound bytes and wall time before parsing, including chunked request/response bodies.
export async function readJson(response,maxBytes,{timeoutMs=12000}={}){
 if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel().catch(()=>{});throw Error('Response too large');}
 const reader=response.body?.getReader();if(!reader)throw Error('Missing JSON');let timer;
 const reading=(async()=>{let total=0;const chunks=[];try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes)throw Error('Response too large');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));})();
 try{return await Promise.race([reading,new Promise((_,reject)=>{timer=setTimeout(()=>{reader.cancel().catch(()=>{});reject(Error('JSON timeout'));},timeoutMs);})]);}finally{clearTimeout(timer);}
}
