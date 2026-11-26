import {PostgresBoard} from './postgres-board.mjs';
export async function probeServer(sql){
 const rollback=new Error('probe_rollback');let result;
 try{await sql.savepoint(async tx=>{
  const board=new PostgresBoard(tx,{});let now=Date.now();board.now=()=>now;board.upstream=async()=>Response.json([{txid:'f'.repeat(64),value:'100000000000'}]);
  const key=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),headers={Authorization:'Bearer '+key,'Content-Type':'application/json',Origin:'https://wondersland.online','CF-Connecting-IP':'probe'};
  async function call(path,body){return board.fetch(new Request('https://wondersland.online/api/verified/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}));}
  const created=await(await call('register',{character:{name:'ROLLBACK PROBE',class:'gardener'},coins:999999})).json();if(created.profile?.coins!==0)throw Error('Profile probe failed');
  const start=await(await call('start',{skill:'leap'})).json();if(!start.runId)throw Error('Start probe failed');now+=2000;
  const packet={runId:start.runId,sequence:1,frames:120,events:[{frame:0,type:'camp'}]};
  if((await call('step',{...packet,score:999999})).status!==400)throw Error('Forgery probe failed');
  const first=await(await call('step',packet)).json(),retry=await(await call('step',packet)).json();
  if(!first.ended||first.profile?.runs!==1||JSON.stringify(first)!==JSON.stringify(retry))throw Error('Settlement probe failed');
  const [count]=await tx.unsafe('SELECT count(*) AS n FROM verified_scores WHERE public_id=$1',[created.playerId]);if(count.n!==1)throw Error('Numeric/progression probe failed');
  result={passed:true,checks:['new-profile','server-simulation','forgery-rejection','idempotent-settlement','safe-integers'],writes:'rolled-back'};throw rollback;
 });}catch(error){if(error!==rollback)throw error;}
 return result;
}
