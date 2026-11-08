// Ideal launch timings in the real web simulation. Synthetic, no mempool/profile IO.
import {Game,fresh,plant} from '../web/core.mjs';
import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';
export const config=JSON.parse(readFileSync(new URL('../src/balance.json',import.meta.url)));
export function windows(sats,level,role='gardener',held=true){
 const result=[];
 for(let x=116;x<=300;x++){
  const game=new Game(config,{...fresh(),character:{name:'Synthetic jump test',class:role},workshop:{strength:level}});
  game.startPractice('flower');game.spawn=1e9;game.obstacles=[{...plant(sats,config),x,resolved:false,txid:'',status:'demo'}];game.jump();if(!held)game.release();
  for(let i=0;i<400&&game.phase==='running'&&game.obstacles[0].x+game.obstacles[0].w>100;i++)game.tick(1/120);
  if(game.phase==='running')result.push(x);
 }
 return result;
}
export function report(){return config.trainingModels.map(model=>{
 let level=0;while(level<=50&&!windows(model.sats,level).length)level++;
 const cost=Array.from({length:Math.min(50,level)},(_,i)=>Math.ceil(config.workshop[0].baseCost*config.workshop[0].growth**i)).reduce((a,b)=>a+b,0);
 return {model:model.id,sats:model.sats,...plant(model.sats,config),firstStrengthLevel:level<=50?level:null,baseLaunchPositions:windows(model.sats,0).length,cumulativeStrengthCost:cost};
});}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify({label:'SYNTHETIC: ideal timing, no skills, gardener, initial run speed, 120 Hz',balanceVersion:config.balanceVersion,rows:report()},null,2));
