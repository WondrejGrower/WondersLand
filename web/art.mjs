import {drawSkillIcon} from './skill-icons.mjs';
// Canvas renderer used by the browser and installed PWA.
import * as PixelArt from './pixels.mjs';
import {campStations} from './camp-layout.mjs';
import {drawClearing} from './environment.mjs';

const station=Object.fromEntries(campStations.map(({id,x,y})=>[id,{x,y}]));
const props=[
 ['camp_cottage',station.home.x-24,station.home.y,177,145],
 ['camp_forge',station.forge.x,station.forge.y,82,75],
 ['camp_portal',station.portal.x,station.portal.y,83,96],
 ['camp_wardrobe',station.wardrobe.x-11,station.wardrobe.y-8,54,58],
 ['camp_chest',station.wardrobe.x+29,station.wardrobe.y,32,27],
 ['camp_herbal_workbench',station.library.x+8,station.library.y-11,65,59],
 ['camp_garden_bed',station.library.x-23,station.library.y+14,48,34],
 ['camp_gardening_bench',station.library.x+39,station.library.y+15,45,31],
 ['camp_fire',385,259,45,40],
 ['camp_training_dummy',station.training.x-17,station.training.y,33,47],
 ['camp_archery_target',station.training.x+23,station.training.y+1,35,37],
 ['camp_lantern_post',454,170,20,41],
 ['camp_lantern_post',584,200,23,44],
].sort((a,b)=>a[2]-b[2]);
const propsWithMine=[...props,['mine',station.mine.x,station.mine.y]].sort((a,b)=>a[2]-b[2]);
const minerColors=['#b28c59','#8b9c75','#738b98','#a4816c','#b28b55'];

export function drawCamp(c,s,wlTranslate,width=640,height=360){
 const view=s.viewport||{left:0,top:0,width:640,height:360};
 const scaleX=width/view.width,scaleY=height/view.height;
 c.setTransform(scaleX,0,0,scaleY,-view.left*scaleX,-view.top*scaleY);
 PixelArt.viewport(view.left,view.top,view.width,view.height);
 drawClearing(c,view);

 const t=s.animation,px=s.campX,py=s.campY;
 function pixel(x,y,w,h,color){
  c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);
 }
 function shadow(x,y,w,h){
  c.fillStyle='#13241775';c.beginPath();c.ellipse(x,y,w,h,0,0,2*Math.PI);c.fill();
 }
 function player(){
  shadow(px,py+2,10,4);
  PixelArt.character(c,px-12,py-40,s.profile.character,Math.floor(t*(s.moving?9:.8)),
   s.profile.hands,s.profile.boots,s.moving?'run':'idle',s.profile.equipment,s.facingLeft);
 }
 function mine(x,y){
  const active=s.profile.mine?.active||0;
  const swing=Math.floor(t*6)%6;
  const broken=active&&Math.floor(t*6)%36>=32;
  shadow(x,y+2,34,5);
  PixelArt.prop(c,'camp_mine_platform',x,y+2,72,17);
  const size=broken?12:20,top=y-9-size,left=x+9-size/2;
  pixel(left,top,size,size,'#af561c');pixel(left,top,size,3,'#ffc169');
  pixel(left,top+3,size-4,size-6,'#ec902f');pixel(left+size-4,top+3,4,size-3,'#884420');
  pixel(left+4,top+6,5,2,'#ffd17b');pixel(left+size-7,top+size-5,3,2,'#d47427');
  if(!active)return;
  PixelArt.character(c,x-28,y-45,{hair:'#624630',skin:'#d4a676',
   shirt:minerColors[(active-1)%minerColors.length],hairStyle:(active-1)%5},swing,false,false,'idle',{},false);
  const headY=y-(swing<3?33:20);
  c.strokeStyle=active>=6?'#b3a186':'#806143';c.lineWidth=2;
  c.beginPath();c.moveTo(x-14,y-20);c.lineTo(x+4,headY);c.stroke();
  pixel(x+1,headY-2,7,3,active>=6?'#d2d5ce':'#8f9a91');
  if(swing===3||broken){
   pixel(x+3,y-26,2,2,'#ffe0a2');pixel(x+10,y-29,2,2,'#ffb857');pixel(x+15,y-21,2,2,'#f08b42');
  }
 }
 let drawn=false;
 for(const [id,x,y,w,h] of s.mineVisible?propsWithMine:props){
  if(!drawn&&y>py){player();drawn=true;}
  if(id==='mine'){mine(x,y);continue;}
  shadow(x,y-2,w*.38,Math.min(6,h*.09));
  PixelArt.prop(c,id,x,y,w,h);
  if(id==='camp_portal'){
   for(let i=0;i<5;i++){
    const angle=t*.65+i*2*Math.PI/5;
    pixel(x+Math.cos(angle)*11,y-43+Math.sin(angle)*15,1,1,'#83d6c9');
   }
  }else if(id==='camp_fire'){
   for(let i=0;i<8;i++)pixel(x+Math.sin(i*3+t)*8,y-15-((t*14+i*7)%24),1,1,'#edbe7e');
  }
 }
 if(!drawn)player();
}
export function drawRun(c,s,wlTranslate,width=640,height=360){ 
 c.reset();var view=s.viewport||{left:0,top:0,width:640,height:360};var pixelScale=Math.min(width/view.width,height/view.height);c.scale(pixelScale,pixelScale);c.translate(-view.left,-view.top);c.imageSmoothingEnabled=false;PixelArt.viewport(view.left,view.top,view.width,view.height);
 // Follow only high late-game jumps; world sizes and physics stay unchanged.
 var floorInset=view.controls?100:76,baseGround=view.height-floorInset;
 var d=s.distance*10,t=s.animation,ground=baseGround+Math.max(0,Math.round(s.y-(baseGround-104)));
 function rect(x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)}
 function hill(offset,base,col){for(var x=view.left;x<=view.left+view.width;x+=8){var y=Math.round(base+Math.sin((x+offset)*.012)*18+Math.sin((x+offset)*.028)*9);rect(x,y,8,ground-y,col)}}
 rect(view.left,view.top,view.width,view.height,s.region.sky);
 for(var i=0;i<65;i++){var sx=view.left+(i*149.3)%view.width,sy=(i*i*17.3)%Math.max(183,view.height-100);rect(sx,sy,i%7===0?2:1,1,i%3?"#425e70":"#b6c7b2")}
 rect(542,38,23,23,"#e3d7a1");rect(535,32,19,22,s.region.sky);
 hill(d*.12,ground-60,s.region.sky);hill(d*.25,ground-37,s.region.foliage);
 for(i=0;i<s.regionIndex*5;i++)rect((i*137-d*.2+64000)%640,190+(i*29)%80,3,3,s.region.foliage);
 for(i=0;i<13;i++){var bx=((i*83-d*.4)%760+760)%760-60;c.globalAlpha=.5;PixelArt.plant(c,{x:bx,h:65+(i%3)*14,w:34,type:i%2?"pine":"birch",txid:"ab12"},ground-7);c.globalAlpha=1}
 rect(view.left,ground,view.width,Math.max(76,view.height-ground),s.region.soil);rect(view.left,ground+12,view.width,Math.max(64,view.height-ground-12),"#513c30");
 for(i=0;i<180;i++)rect(((i*37-d)%680+680)%680-20,ground+7+(i*13)%Math.max(64,floorInset-12),3,2,i%3?"#805b42":"#aa7b53");
 // Non-colliding regional roots, mushrooms and spores stay separate from transaction geometry.
 for(i=0;i<s.regionIndex*6;i++){
  var decorX=((i*113-d*.55)%700+700)%700-30;
  if(s.regionIndex>=3){rect(decorX,ground-13,2,13,"#b3a6bd");rect(decorX-6,ground-18,14,6,s.region.foliage)}
  else {rect(decorX,ground-6,18,3,s.region.soil);rect(decorX+10,ground-10,4,8,s.region.foliage)}
 }
 rect(view.left,ground,view.width,4,s.region.foliage);rect(view.left,ground,view.width,1,"#a6c779");for(i=0;i<214;i++)rect(i*3,ground-1-(i%3),1,3,"#779e53");
 function plant(p){PixelArt.plant(c,p,ground)}
 var obstacles=s.obstacles||[];for(i=0;i<obstacles.length;i++)plant(obstacles[i]);
 var coins=s.coins||[];for(i=0;i<coins.length;i++){var coin=coins[i];if(!coin.taken){rect(coin.x,ground-coin.y,7,9,"#d9a94f");rect(coin.x+2,ground-coin.y+2,2,5,"#ffe6a0")}}
 var pose=s.phase==="over"?"hit":s.y>0?(s.velocity<0?"fall":"jump"):s.landing>0?"land":s.phase==="running"?"run":"idle";
 PixelArt.character(c,96,ground-s.y-40,s.profile.character,Math.floor(t*10),s.profile.hands,s.profile.boots,pose,s.profile.equipment,false,{velocity:s.velocity,landing:s.landing});
 if(s.invulnerable>0){c.strokeStyle="#bfe9d4";c.strokeRect(93,ground-s.y-43,30,46)}
 if(s.flying.id&&!s.flying.blocked){
  const fl=s.flying,x=Math.round(fl.x),y=ground-fl.y+Math.round(Math.sin(t*7)*3);
  c.save();c.translate(x,y);c.scale(Math.max(.22,Math.abs(Math.cos(t*4))),1);
  drawSkillIcon(c,fl.id,-8,-8);c.restore();
  c.fillStyle='#e4d28b';c.font='9px monospace';c.fillText(wlTranslate(fl.name),Math.max(180,x),ground-100);
 }
 if(s.obstacles.some(p=>p.h>ground)){c.fillStyle="#e7ba85";c.font="10px monospace";c.fillText(wlTranslate("Tall canopy continues above the view"),210,75)}
 if(s.phase==="over"){c.strokeStyle="#e2a27b";c.lineWidth=2;var hit=s.hit;c.strokeRect(hit.x-4,ground-hit.h-4,hit.w+8,hit.h+8)}}
