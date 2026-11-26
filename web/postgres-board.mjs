import {verifiedRequest} from './verified-worker.mjs';
import balance from '../src/balance.json' with {type:'json'};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
export const postgresOptions={prepare:false,max:1,idle_timeout:20,connect_timeout:10,query_timeout:20,types:{safeBigint:{to:20,from:[20],serialize:String,parse(value){const n=Number(value);if(!Number.isSafeInteger(n))throw Error('Unsafe server integer');return n;}}}};
// Only trusted protocol SQL reaches this adapter; user values stay bound parameters.
export function postgresQuery(statement){
 let index=0;
 return statement.replace('INSERT OR IGNORE INTO verified_months VALUES (?,?)','INSERT INTO verified_months VALUES (?,?) ON CONFLICT DO NOTHING')
  .replace('best=MAX(','best=GREATEST(')
  .replace('SET hits=hits+1','SET hits=verified_registrations.hits+1')
  .replace('WHERE rowid IN (SELECT rowid FROM verified_registrations','WHERE (source,day) IN (SELECT source,day FROM verified_registrations')
  .replace(/\?/g,()=>'$'+(++index));
}
export class PostgresBoard{
 constructor(sql,feed={}){this.query=sql;this.sql={exec:(statement,...args)=>this.rows(statement,...args)};this.ctx={waitUntil:p=>globalThis.EdgeRuntime?.waitUntil(p)};this.now=()=>Date.now();this.feedState=feed;for(const key of ['recentFeed','nextFeedAttempt','feedPromise'])Object.defineProperty(this,key,{get:()=>feed[key],set:value=>feed[key]=value});}
 async rows(statement,...args){return Array.from(await this.query.unsafe(postgresQuery(statement),args));}
 async transaction(fn){return this.query.savepoint(async sql=>{const previous=this.query;this.query=sql;try{return await fn();}finally{this.query=previous;}});}
 async rate(key,now,max){const bucket=Math.floor(now/60000);if(key==='all')await this.query.unsafe('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE bucket<$1 LIMIT 128)',[bucket-2]);const [row]=await this.query.unsafe('INSERT INTO rate_limits (key,bucket,hits) VALUES ($1,$2,1) ON CONFLICT(key) DO UPDATE SET bucket=excluded.bucket,hits=CASE WHEN rate_limits.bucket=excluded.bucket THEN LEAST(rate_limits.hits+1,2147483646) ELSE 1 END RETURNING hits',[key,bucket]);return row.hits<=max;}
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/verified/'))return verifiedRequest(this,request);
  if(request.method==='POST'&&['/api/leaderboard/start','/api/leaderboard/finish'].includes(url.pathname))return json({error:'Client-reported submissions are closed',acceptingSubmissions:false},410);
  if(request.method!=='GET'||url.pathname!=='/api/leaderboard')return json({error:'Method not allowed'},405);
  const current=new Date(this.now()).toISOString().slice(0,7),month=url.searchParams.get('month')||current,metric=url.searchParams.get('metric')||'best';
  if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)||month>current||!['best','total','attempts'].includes(metric))return json({error:'Invalid month or ranking'},400);
  const order=metric==='best'?'best DESC,best_at ASC,owner ASC':metric==='total'?'total DESC,updated ASC,owner ASC':'runs DESC,updated ASC,owner ASC';
  const rows=(await this.rows('SELECT owner,name,best,total,runs FROM scores WHERE month=? ORDER BY '+order+' LIMIT 50',month)).map((r,i)=>({rank:i+1,playerId:r.owner.slice(0,16),name:r.name.replace(/[\u202a-\u202e\u2066-\u2069]/g,''),best:r.best,total:r.total,runs:r.runs}));
  const months=(await this.rows('SELECT month FROM score_months ORDER BY month DESC LIMIT 24')).map(r=>r.month);if(!months.includes(current))months.unshift(current);
  return json({month,metric,months,rows,source:'legacy-community-live-runs',verified:false,acceptingSubmissions:false,identity:'browser-installation'});
 }
}
export async function withServerTransaction(client,fn,{role=true}={}){
 return client.begin(async sql=>{
  await sql.unsafe("SET LOCAL search_path TO wonderland_private, pg_catalog");
  await sql.unsafe("SET LOCAL statement_timeout = '15s'");
  await sql.unsafe("SET LOCAL lock_timeout = '3s'");
  if(role)await sql.unsafe('SET LOCAL ROLE wonderland_server');
  // One bounded global coordinator, matching monthly-v1's serialization across isolates.
  await sql.unsafe('SELECT pg_advisory_xact_lock(1464619859,1)');
  return fn(sql);
 });
}
export const serverVersion={application:'WondersLand [WL]',version:'0.3.3',balance:balance.balanceVersion,backend:'supabase'};
