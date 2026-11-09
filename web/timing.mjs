// Simulation uses one clock on the server, browser and installed PWA.
// Rendering follows display callbacks, independently capped at 60 or 144 FPS.
export const STEP=1/120;
export const frameRate=value=>Number(value)===60?60:144;

export class FrameClock{
 constructor(fps=144){this.setRate(fps);}
 setRate(fps){this.fps=frameRate(fps);this.epoch=null;this.slot=-1;}
 paint(now){
  if(this.epoch===null)this.epoch=now;
  const slot=Math.floor((now-this.epoch)*this.fps/1000+1e-7);
  if(slot<=this.slot)return false;
  this.slot=slot;return true;
 }
}

export function captureView(game){
 const s=game.state();
 return {...s,obstacles:s.obstacles.map(p=>({...p})),coins:s.coins.map(p=>({...p}))};
}

export function interpolateView(game,previous,alpha){
 const s=game.state();if(!previous||s.phase!==previous.phase)return s;
 alpha=Math.max(0,Math.min(1,alpha));
 const blend=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)?a+(b-a)*alpha:b;
 for(const key of ['y','velocity','distance','animation','campX','campY'])s[key]=blend(previous[key],s[key]);
 if(previous.landing>0&&s.landing>0)s.landing=blend(previous.landing,s.landing);
 const oldPlants=new Map(previous.obstacles.map(p=>[p.instance,p]));
 s.obstacles=s.obstacles.map(p=>oldPlants.has(p.instance)?{...p,x:blend(oldPlants.get(p.instance).x,p.x)}:p);
 s.coins=s.coins.map((p,i)=>{const old=previous.coins[i];return old&&old.x>=p.x&&old.x-p.x<10?{...p,x:blend(old.x,p.x)}:p;});
 return s;
}

export class FixedSimulation{
 constructor(){this.reset();}
 reset(game=null){this.game=game;this.runId=game?.runId;this.accumulator=0;this.previous=null;}
 advance(game,dt){
  if(this.game!==game||this.runId!==game.runId)this.reset(game);
  this.accumulator=Math.min(.1,this.accumulator+Math.max(0,dt));
  while(this.accumulator+1e-12>=STEP){
   this.previous=captureView(game);game.tick(STEP);this.accumulator-=STEP;
  }
  this.accumulator=Math.max(0,this.accumulator);
 }
 view(game){return interpolateView(game,this.game===game?this.previous:null,this.accumulator/STEP);}
}
