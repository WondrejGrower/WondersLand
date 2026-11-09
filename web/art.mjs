// Canvas renderer used by the browser and installed PWA.
import * as PixelArt from './pixels.mjs';
export function drawCamp(c,s,wlTranslate,width=640,height=360){ 
 c.reset();var view=s.viewport||{left:0,top:0,width:640,height:360};var pixelScale=Math.min(width/view.width,height/view.height);c.scale(pixelScale,pixelScale);c.translate(-view.left,-view.top);c.imageSmoothingEnabled=false;PixelArt.viewport(view.left,view.top,view.width,view.height);
 var t=s.animation,px=s.campX,py=s.campY;
 function r(x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)}
 function ellipse(x,y,rx,ry,col){for(var iy=-Math.ceil(ry);iy<=ry;iy++){var span=Math.round(rx*Math.sqrt(Math.max(0,1-iy*iy/(ry*ry))));r(x-span,y+iy,span*2+1,1,col)}}
 r(view.left,view.top,view.width,view.height,'#10272c');
 for(var i=0;i<Math.ceil(view.width*view.height/256);i++)r(view.left+(i*53.31)%view.width,view.top+(i*79.17)%view.height,2+i%3,1,i%5?'#193832':'#2b4836');
 ellipse(320,245,268,99,'#29473b');ellipse(320,250,252,88,'#344c3c');
 r(257,172,29,154,'#73624b');r(93,220,458,23,'#73624b');r(160,234,24,67,'#6a5d47');r(452,237,25,57,'#6a5d47');
 for(i=0;i<140;i++)r(90+(i*31)%470,224+(i%5)*3,4,2,i%3?'#8b7858':'#5f5845');
 // Props share the original interaction points. Depth order follows their feet.
 var props=[
  ['camp_cottage',231,184,180,148],['camp_portal',540,222,98,100],
  ['camp_forge',112,219,88,78],['camp_wardrobe',390,193,57,60],
  ['camp_chest',427,212,36,30],['camp_training_dummy',450,290,35,50],
  ['camp_archery_target',487,289,33,40],['camp_herbal_workbench',175,300,63,57],
  ['camp_garden_bed',136,324,54,40],['camp_gardening_bench',211,326,48,33],
  ['camp_fire',331,278,49,42],['camp_lantern_post',489,230,26,57],
  ['camp_lantern_post',588,231,26,57],['camp_lantern_post',320,182,22,48]
 ];
 for(i=0;i<10;i++)props.push(['flora_pine',i*74-10,105+i%2*24,50+i%3*10,78+i%3*13]);
 props.push(['flora_birch',21,319,54,143],['flora_sequoia',620,321,61,155]);
 var plants=['flora_meadow_grass','flora_daisies','flora_tulips','flora_fern','flora_mushrooms','flora_blackberry','flora_sapling'];
 for(i=0;i<21;i++){var edge=i%2?36:601;props.push([plants[i%plants.length],edge+(i%3-1)*15,156+(i*37)%183,20+i%3*6,14+i%4*6]);}
 props.push(['flora_cannabis',240,320,22,38]);
 props.sort(function(a,b){return a[2]-b[2]});
 var drawn=false;
 function player(){ellipse(px,py+2,10,4,'#152a28');PixelArt.character(c,px-12,py-40,s.profile.character,Math.floor(t*(s.moving?9:.8)),s.profile.hands,s.profile.boots,s.moving?'run':'idle',s.profile.equipment,s.facingLeft)}
 for(i=0;i<props.length;i++){
  var p=props[i];if(!drawn&&p[2]>py){player();drawn=true;}
  PixelArt.prop(c,p[0],p[1],p[2],p[3],p[4]);
 }
 if(!drawn)player();
 // Lightweight light motion overlays; no per-frame atlas processing.
 for(i=0;i<7;i++){var a=t*.65+i*6.28/7;r(540+Math.cos(a)*17,180+Math.sin(a)*26,1,2,'#b4f2dd');}
 for(i=0;i<8;i++)r(331+Math.sin(i*3+t)*9,262-((t*14+i*7)%26),1,1,'#e6ba71');
 for(i=0;i<16;i++)r((i*137+t*3)%640,190+Math.sin(i*3+t*.5)*75,1,1,'#c4d1a0');}
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
 if(s.flying.id&&!s.flying.blocked){var fl=s.flying;c.fillStyle=fl.age<0?"#b8a4d5":"#e4d28b";c.fillRect(Math.round(fl.x),ground-fl.y-7,10,10);c.font="9px monospace";c.fillText(wlTranslate(fl.name),Math.max(180,fl.x),ground-100)}
 if(s.obstacles.some(p=>p.h>ground)){c.fillStyle="#e7ba85";c.font="10px monospace";c.fillText(wlTranslate("Tall canopy continues above the view"),210,75)}
 if(s.phase==="over"){c.strokeStyle="#e2a27b";c.lineWidth=2;var hit=s.hit;c.strokeRect(hit.x-4,ground-hit.h-4,hit.w+8,hit.h+8)}}
