import balance from '../src/balance.json' with {type:'json'};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
class RequestError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const digest=async key=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),b=>b.toString(16).padStart(2,'0')).join('');
const monthAt=now=>new Date(now).toISOString().slice(0,7);
async function body(request){if(Number(request.headers.get('content-length'))>4096)throw new RequestError('Request too large',413);const reader=request.body?.getReader();if(!reader)throw new RequestError('Missing body');let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new RequestError('Request too large',413);}chunks.push(value);}try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(chunks.flatMap(c=>Array.from(c)))));}catch{throw new RequestError('Invalid JSON');}}
async function owner(request){const key=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!key)throw new RequestError('Missing player key',401);return digest(key);}
export class MonthlyLeaderboard{
 constructor(ctx){this.ctx=ctx;this.sql=ctx.storage.sql;this.now=()=>Date.now();
  this.sql.exec('CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, owner TEXT NOT NULL, run_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, rules TEXT NOT NULL, started INTEGER NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, score INTEGER, month TEXT, UNIQUE(owner,run_id))');
  this.sql.exec('CREATE TABLE IF NOT EXISTS scores (month TEXT NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL, best INTEGER NOT NULL, total INTEGER NOT NULL, runs INTEGER NOT NULL, best_at INTEGER NOT NULL, updated INTEGER NOT NULL, rules TEXT NOT NULL, PRIMARY KEY(month,owner))');
  this.sql.exec('CREATE INDEX IF NOT EXISTS monthly_best ON scores(month,best DESC,best_at)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS rates (identity TEXT NOT NULL, bucket INTEGER NOT NULL, hits INTEGER NOT NULL, PRIMARY KEY(identity,bucket))');
 }
 rows(sql,...args){return Array.from(this.sql.exec(sql,...args));}
 rate(identity,now,limit){const bucket=Math.floor(now/60000);this.sql.exec('DELETE FROM rates WHERE bucket < ?',bucket-5);const row=this.rows('INSERT INTO rates VALUES (?,?,1) ON CONFLICT(identity,bucket) DO UPDATE SET hits=hits+1 RETURNING hits',identity,bucket)[0];if(row.hits>limit)throw new RequestError('Please try again shortly',429);}
 async fetch(request){try{
  const url=new URL(request.url),now=this.now();
  if(request.method==='GET'&&url.pathname==='/api/leaderboard'){
   const month=url.searchParams.get('month')||monthAt(now),metric=url.searchParams.get('metric')||'best';
   if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)||month>monthAt(now)||!['best','total','attempts'].includes(metric))throw new RequestError('Invalid month or ranking');
   const sort=metric==='best'?'best DESC,best_at ASC,owner ASC':metric==='attempts'?'runs DESC,updated ASC,owner ASC':'total DESC,updated ASC,owner ASC';
   const rows=this.rows('SELECT name,best,total,runs,best_at FROM scores WHERE month=? ORDER BY '+sort+' LIMIT 50',month).map((r,i)=>({rank:i+1,name:r.name,best:r.best,total:r.total,runs:r.runs}));
   const months=this.rows('SELECT DISTINCT month FROM scores ORDER BY month DESC LIMIT 24').map(r=>r.month);if(!months.includes(monthAt(now)))months.unshift(monthAt(now));
   return json({month,metric,months,rows,source:'community-live-runs',verified:false});
  }
  if(request.method!=='POST'||!['/api/leaderboard/start','/api/leaderboard/finish'].includes(url.pathname))throw new RequestError('Method not allowed',405);
  if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)throw new RequestError('Origin not allowed',403);
  const identity=await owner(request),source=await digest(request.headers.get('CF-Connecting-IP')||'local'),data=await body(request);if(!data||typeof data!=='object'||Array.isArray(data))throw new RequestError('Invalid body');
  if(url.pathname.endsWith('/start')){
   if(data.mode!=='live'||data.rules!==balance.balanceVersion||!balance.classes.some(c=>c.id===data.role)||typeof data.name!=='string'||!data.name.trim()||data.name.length>24||typeof data.runId!=='string'||!/^[a-zA-Z0-9:_.-]{1,96}$/.test(data.runId))throw new RequestError('Invalid live run');
   const result=this.ctx.storage.transactionSync(()=>{
    this.rate('player:'+identity,now,20);this.rate('ip:'+source,now,120);
    this.sql.exec('DELETE FROM tickets WHERE expires < ?',now-86400000);
    const existing=this.rows('SELECT id,expires FROM tickets WHERE owner=? AND run_id=?',identity,data.runId)[0];if(existing)return existing;
    if(this.rows('SELECT count(*) AS count FROM tickets WHERE owner=? AND used=0 AND expires>?',identity,now)[0].count>=10)throw new RequestError('Too many unfinished runs',429);
    const id=crypto.randomUUID(),expires=now+7200000,name=data.name.trim().replace(/[\u0000-\u001f\u007f]/g,'');if(!name)throw new RequestError('Invalid name');
    this.sql.exec('INSERT INTO tickets (id,owner,run_id,name,role,rules,started,expires) VALUES (?,?,?,?,?,?,?,?)',id,identity,data.runId,name,data.role,data.rules,now,expires);return {id,expires};
   });return json({ticket:result.id,expiresAt:result.expires,month:monthAt(now)});
  }
  if(typeof data.ticket!=='string'||!Number.isSafeInteger(data.score)||data.score<0||data.score>200000||!Number.isFinite(data.seconds)||data.seconds<0||data.seconds>7200)throw new RequestError('Invalid result');
  return this.ctx.storage.transactionSync(()=>{
   const ticket=this.rows('SELECT * FROM tickets WHERE id=? AND owner=?',data.ticket,identity)[0];if(!ticket)throw new RequestError('Unknown run',404);
   if(ticket.used){if(ticket.score!==data.score)throw new RequestError('Run already completed',409);return json({accepted:true,month:ticket.month,duplicate:true});}
   if(ticket.expires<now)throw new RequestError('Run expired',410);
   const elapsed=Math.max(0,(now-ticket.started)/1000),maxScore=Math.floor(balance.physics.speed*balance.physics.maxSpeedFactor*Math.min(data.seconds,elapsed+3)/10)+2;
   if(data.score>maxScore)throw new RequestError('Result exceeds run duration',422);
   const month=monthAt(now);this.sql.exec('UPDATE tickets SET used=1,score=?,month=? WHERE id=?',data.score,month,ticket.id);
   this.sql.exec(`INSERT INTO scores VALUES (?,?,?,?,?,1,?,?,?) ON CONFLICT(month,owner) DO UPDATE SET name=excluded.name,best=MAX(scores.best,excluded.best),total=scores.total+excluded.total,runs=scores.runs+1,best_at=CASE WHEN excluded.best>scores.best THEN excluded.best_at ELSE scores.best_at END,updated=excluded.updated,rules=excluded.rules`,month,identity,ticket.name,data.score,data.score,now,now,ticket.rules);
   return json({accepted:true,month,duplicate:false});
  });
 }catch(error){if(error instanceof RequestError)return json({error:error.message},error.status);throw error;}}
}
