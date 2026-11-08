import {verifiedSchema,verifiedRequest} from './verified-worker.mjs';
// Legacy community history is read-only. Client-reported score tickets are retired.
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const digest=async key=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),b=>b.toString(16).padStart(2,'0')).join('');
const monthAt=now=>new Date(now).toISOString().slice(0,7);
export class MonthlyLeaderboard{
 constructor(ctx){this.ctx=ctx;this.sql=ctx.storage.sql;this.now=()=>Date.now();this.limits=new Map();
  verifiedSchema(this);
  // Keep all persistent identities/tables and existing history; migrations are additive.
  this.sql.exec('CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, owner TEXT NOT NULL, run_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, rules TEXT NOT NULL, started INTEGER NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, score INTEGER, month TEXT, UNIQUE(owner,run_id))');
  this.sql.exec('CREATE TABLE IF NOT EXISTS scores (month TEXT NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL, best INTEGER NOT NULL, total INTEGER NOT NULL, runs INTEGER NOT NULL, best_at INTEGER NOT NULL, updated INTEGER NOT NULL, rules TEXT NOT NULL, PRIMARY KEY(month,owner))');
  this.sql.exec('CREATE INDEX IF NOT EXISTS monthly_best_v2 ON scores(month,best DESC,best_at ASC,owner ASC)');
  this.sql.exec('CREATE INDEX IF NOT EXISTS monthly_total ON scores(month,total DESC,updated ASC,owner ASC)');
  this.sql.exec('CREATE INDEX IF NOT EXISTS monthly_attempts ON scores(month,runs DESC,updated ASC,owner ASC)');
  this.sql.exec('CREATE INDEX IF NOT EXISTS tickets_expiry ON tickets(expires)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS score_months (month TEXT PRIMARY KEY)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS security_migrations (id TEXT PRIMARY KEY)');
  this.ctx.storage.transactionSync(()=>{if(!this.rows("SELECT id FROM security_migrations WHERE id='month-index-v1'").length){this.sql.exec('INSERT OR IGNORE INTO score_months SELECT DISTINCT month FROM scores');this.sql.exec("INSERT INTO security_migrations VALUES ('month-index-v1')");}});
 }
 rows(sql,...args){return Array.from(this.sql.exec(sql,...args));}
 rate(key,now,max){const bucket=Math.floor(now/60000);if(key==='all'){if(!this.globalLimit||this.globalLimit.bucket!==bucket)this.globalLimit={bucket,hits:0};return ++this.globalLimit.hits<=max;}let entry=this.limits.get(key);if(!entry||entry.bucket!==bucket){if(this.limits.size>=4096)this.limits.delete(this.limits.keys().next().value);entry={bucket,hits:0};this.limits.set(key,entry);}return ++entry.hits<=max;}
 async fetch(request){
  const url=new URL(request.url),now=this.now();
  if(!this.rate('all',now,1800)||!this.rate('ip:'+await digest(request.headers.get('CF-Connecting-IP')||'local'),now,120))return new Response('Please try again shortly',{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
  if(url.pathname.startsWith('/api/verified/'))return verifiedRequest(this,request);
  if(request.method==='POST'&&['/api/leaderboard/start','/api/leaderboard/finish'].includes(url.pathname))return json({error:'Client-reported submissions are closed',acceptingSubmissions:false},410);
  if(request.method!=='GET'||url.pathname!=='/api/leaderboard')return json({error:'Method not allowed'},405);
  const month=url.searchParams.get('month')||monthAt(now),metric=url.searchParams.get('metric')||'best';
  if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)||month>monthAt(now)||!['best','total','attempts'].includes(metric))return json({error:'Invalid month or ranking'},400);
  const sort=metric==='best'?'best DESC,best_at ASC,owner ASC':metric==='attempts'?'runs DESC,updated ASC,owner ASC':'total DESC,updated ASC,owner ASC';
  const rows=this.rows('SELECT owner,name,best,total,runs FROM scores WHERE month=? ORDER BY '+sort+' LIMIT 50',month).map((r,i)=>({rank:i+1,playerId:r.owner.slice(0,16),name:r.name.replace(/[\u202a-\u202e\u2066-\u2069]/g,''),best:r.best,total:r.total,runs:r.runs}));
  const months=this.rows('SELECT month FROM score_months ORDER BY month DESC LIMIT 24').map(r=>r.month);if(!months.includes(monthAt(now)))months.unshift(monthAt(now));
  return json({month,metric,months,rows,source:'legacy-community-live-runs',verified:false,acceptingSubmissions:false,identity:'browser-installation'});
 }
}
