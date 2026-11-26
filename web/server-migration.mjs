import {MIGRATION_KEY} from './server-migration-key.mjs';
import {serverTables} from './server-tables.mjs';
import {readJson} from './limits.mjs';
const decode=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export async function migrationAuthorized(request,now=Date.now()){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/)?.[1];
  if(!token||token.length>1024)return false;
  const [payload,signature]=token.split('.'),claims=JSON.parse(new TextDecoder().decode(decode(payload)));
  if(claims.purpose!=='wl-supabase-migration-v1'||!Number.isSafeInteger(claims.expires)||claims.expires*1000<=now)return false;
  const key=await crypto.subtle.importKey('jwk',MIGRATION_KEY,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,decode(signature),new TextEncoder().encode(payload));
 }catch{return false;}
}
export async function exportServerData(board,request){
 if(request.method!=='POST'||!await migrationAuthorized(request))return Response.json({error:'Forbidden'},{status:403});
 const data=await readJson(request,2048);
 // Freeze before exporting. Supabase waits for any older requests to drain.
 board.sql.exec("INSERT OR IGNORE INTO security_migrations VALUES ('supabase-frozen-v1')");
 if(data.phase==='freeze'&&typeof data.bridgeKey==='string'&&/^[a-f0-9]{64}$/.test(data.bridgeKey))board.sql.exec('INSERT INTO server_bridge VALUES (1,?) ON CONFLICT(id) DO UPDATE SET key=excluded.key',data.bridgeKey);
 if(data.phase==='freeze')return Response.json({frozen:true},{headers:{'Cache-Control':'no-store'}});
 const spec=Object.hasOwn(serverTables,data.table)&&serverTables[data.table];
 if(!spec||!Number.isSafeInteger(data.offset)||data.offset<0)return Response.json({error:'Invalid export page'},{status:400});
 const rows=board.rows('SELECT '+spec.columns.join(',')+' FROM '+data.table+' ORDER BY '+spec.key.join(',')+' LIMIT ? OFFSET ?',data.table==='verified_runs'?1:16,data.offset);
 const total=board.rows('SELECT count(*) AS n FROM '+data.table)[0].n;
 return Response.json({table:data.table,offset:data.offset,total,rows},{headers:{'Cache-Control':'no-store'}});
}
