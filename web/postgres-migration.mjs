import {serverTables} from './server-tables.mjs';
import {readJson} from './limits.mjs';
// Called only with a verified, short-lived migration capability.
export async function importServerPage(sql,authorization,upstream=fetch){
 const [state]=await sql.unsafe('SELECT * FROM migration_state WHERE id=1 FOR UPDATE');
 if(state.complete)return {complete:true,counts:state.counts};
 const tables=Object.keys(serverTables),table=tables[state.table_index];
 if(!table)throw Error('Invalid migration cursor');
 const spec=serverTables[table];
 const response=await upstream('https://wondersland.online/api/supabase-migration',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({table,offset:state.row_offset}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Source export unavailable: '+response.status);
 const page=await readJson(response,1024*1024);
 if(page.table!==table||page.offset!==state.row_offset||!Number.isSafeInteger(page.total)||page.total<state.row_offset||!Array.isArray(page.rows)||page.rows.length>16||page.rows.length+state.row_offset>page.total||(!page.rows.length&&state.row_offset<page.total))throw Error('Invalid export page');
 for(const row of page.rows){
  if(spec.columns.some(k=>!Object.hasOwn(row,k))||Object.keys(row).length!==spec.columns.length)throw Error('Invalid export row');
  const slots=spec.columns.map((_,i)=>'$'+(i+1)).join(',');
  await sql.unsafe('INSERT INTO '+table+' ('+spec.columns.join(',')+') VALUES ('+slots+') ON CONFLICT DO NOTHING',spec.columns.map(k=>row[k]));
  const [stored]=await sql.unsafe('SELECT '+spec.columns.join(',')+' FROM '+table+' WHERE '+spec.key.map((k,i)=>k+'=$'+(i+1)).join(' AND '),spec.key.map(k=>row[k]));
  if(!stored||spec.columns.some(k=>stored[k]!==row[k]))throw Error('Imported row differs');
 }
 const done=state.row_offset+page.rows.length===page.total,counts={...state.counts};
 if(done){const [n]=await sql.unsafe('SELECT count(*) AS n FROM '+table);if(n.n!==page.total)throw Error('Imported count differs');counts[table]=page.total;}
 const complete=done&&state.table_index+1===tables.length;
 await sql.unsafe('UPDATE migration_state SET table_index=$1,row_offset=$2,counts=$3::text::jsonb,complete=$4 WHERE id=1',[state.table_index+(done?1:0),done?0:state.row_offset+page.rows.length,JSON.stringify(counts),complete]);
 return {complete,table,imported:state.row_offset+page.rows.length,total:page.total,counts};
}
