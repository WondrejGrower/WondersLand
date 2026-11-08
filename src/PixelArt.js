.pragma library
.import "CharacterSprites.js" as Sprites
.import "EnvironmentArt.js" as Environment
var cache={}
var hairIds=["hair_short_tousled","hair_short_side_part","hair_short_textured","hair_buzz_cut","hair_short_crop","hair_short_curls","hair_quiff","hair_short_spiky","hair_medium_wavy","hair_undercut","hair_compact_afro","hair_swept_back","hair_bob","hair_long_loose","hair_ponytail","hair_braid"];
// Shoulder/elbow/wrist, hip and foot pivots measured in the registered base poses.
// All clothing is transformed from these same pivots, including body lean.
var rigs=[
 {shoulders:[[7.5,16.2],[14.9,17]],elbows:[[4.3,18.9],[17.6,20.2]],hands:[[2.5,22.9],[18.9,21.5]],hip:[10,27],feet:[[4,37],[18,34]]},
 {shoulders:[[9.3,16.3],[14.7,17]],elbows:[[7.3,18.7],[17.3,20.7]],hands:[[9.3,22.4],[16.9,24.7]],hip:[11,27.5],feet:[[9,38],[6,32]]},
 {shoulders:[[8.9,17.2],[14.1,17.3]],elbows:[[6.8,20.9],[16.1,20.7]],hands:[[11.3,23.2],[13.3,22.3]],hip:[10.7,27.3],feet:[[8,38],[16,29]]},
 {shoulders:[[8,16.3],[14,17.1]],elbows:[[5.1,19.9],[15.9,20.3]],hands:[[3.3,22.7],[19.1,20.2]],hip:[10.1,27],feet:[[3,34],[18,36]]},
 {shoulders:[[8.9,17.5],[14,18]],elbows:[[5.9,20.5],[15.2,20]],hands:[[8.8,22.8],[14.9,24.5]],hip:[9.6,27.5],feet:[[7,32],[10,38]]},
 {shoulders:[[8.8,16.2],[14.3,17.5]],elbows:[[5.1,18.8],[17.5,20.1]],hands:[[4.1,21.9],[17.3,21.6]],hip:[10,27],feet:[[5,37],[14,32]]},
 {shoulders:[[8.9,17],[14.8,17]],elbows:[[6,23],[18,23]],hands:[[4,27],[19,27]],hip:[11.2,28],feet:[[8,38],[17,38]]},
 {shoulders:[[9,16.5],[15,16.5]],elbows:[[6,22.5],[18,22.5]],hands:[[4,26.5],[19,26.5]],hip:[11.5,27.5],feet:[[8,38],[17,38]]},
 {shoulders:[[7.9,17.3],[15.3,18.1]],elbows:[[6.4,20.7],[18,19.5]],hands:[[10.4,21.5],[18.9,20.6]],hip:[9.7,28.6],feet:[[7.5,34.3],[16.7,30.9]]},
 {shoulders:[[8.4,18.2],[16.3,17.8]],elbows:[[7.1,23.5],[17.5,21]],hands:[[5.6,27.1],[18.8,22]],hip:[11.1,28.4],feet:[[6,36.5],[14.4,35.4]]},
 {shoulders:[[9.9,23],[14.3,23.5]],elbows:[[10,26],[17,27]],hands:[[11.7,27.6],[19.6,28.3]],hip:[10.9,33.4],feet:[[7.5,38.3],[16.1,38.3]],head:9},
 {shoulders:[[8.7,17.5],[16,17.5]],elbows:[[6,21],[20,20]],hands:[[8.4,22.1],[24,22.2]],hip:[13.3,28.2],feet:[[9,38],[20,38]],shiftX:-3}
];
var wearableCache={};
function wearablePixels(id,pose){
 var key=id+':'+pose;if(wearableCache[key])return wearableCache[key];
 var s=Sprites.sprites[id],rig=rigs[pose];if(!s||!rig)return [];
 var out={},shift=rig.shiftX||0;
 function put(x,y,index){x=Math.round(x+shift);y=Math.round(y);if(index&&x>=0&&x<24&&y>=0&&y<40)out[y*24+x]=index;}
 function sample(sx,sy){return s.pixels[Math.max(0,Math.min(s.h-1,Math.floor(sy)))*s.w+Math.max(0,Math.min(s.w-1,Math.floor(sx)))];}
 if(id.indexOf('torso_')===0){
  var sx=(rig.shoulders[0][0]+rig.shoulders[1][0])/2,sy=(rig.shoulders[0][1]+rig.shoulders[1][1])/2-2;
  for(var y=0;y<s.h;y++)for(var x=0;x<s.w;x++){
   var index=sample(x,y);if(!index)continue;
   var longSleeve=id==='torso_rust_coat';
   if((x<6||x>12)&&y>=3&&y<=(longSleeve?14:11)){
    var side=x<6?0:1,along=(y-3)/(longSleeve?11:9),a=rig.shoulders[side],b=rig.elbows[side];
    if(longSleeve){if(along<.5)along*=2;else{a=rig.elbows[side];b=rig.hands[side];along=(along-.5)*2;}}
    var dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(1,Math.sqrt(dx*dx+dy*dy)),across=(x-(side?15:2.5))*.8;
    put(a[0]+dx*along+dy/length*across,a[1]+dy*along-dx/length*across,index);
   }else{
    var t=y/(s.h-1),cx=sx+(rig.hip[0]-sx)*t,cy=sy+(rig.hip[1]+2-sy)*t;
    var trail=(id==='torso_slate_cape'||id==='torso_rust_coat')&&y>9?Math.sin(pose*1.1)*(y-9)*.12:0;
    put(cx+(x-(s.w-1)/2)*(x>=6&&x<=12?1.25:.85)+trail,cy,index);
   }
  }
 }else if(id.indexOf('feet_')===0||id.indexOf('hands_')===0){
  var gloves=id.indexOf('hands_')===0;
  for(var side=0;side<2;side++){
   var point=gloves?rig.hands[side]:rig.feet[side],angle=0;
   if(gloves){var elbow=rig.elbows[side];angle=Math.atan2(point[1]-elbow[1],point[0]-elbow[0])-Math.PI/2;}
   else if(pose<6)angle=[.18,-.24,-.1,.24,-.2,.12][(pose+side*3)%6];
   var co=Math.cos(angle),si=Math.sin(angle),w=gloves?5:7,h=5;
   for(var y=0;y<h;y++)for(var x=0;x<w;x++){
    var u=x-(w-1)/2,v=y-(gloves?2:3),index=sample(side*7+x*7/w,y*7/h);
    put(point[0]+u*co-v*si,point[1]+u*si+v*co,index);
   }
  }
 }else if(id.indexOf('belt_')===0){
  for(var y=0;y<s.h;y++)for(var x=0;x<s.w;x++)put(rig.hip[0]-7+x,rig.hip[1]-2+y+(x-7)*(rig.hip[0]-11)*.04,sample(x,y));
 }else if(id.indexOf('head_')===0){
  for(var y=0;y<s.h;y++)for(var x=0;x<s.w;x++)put(1+x,(rig.head||0)-1+y,sample(x,y));
 }
 var pixels=[];for(var n in out)pixels.push([Number(n)%24,Math.floor(Number(n)/24),Sprites.palette[out[n]]]);wearableCache[key]=pixels;return pixels;
}
function character(c,x,y,ch,frame,hands,boots,mode,equipment,facingLeft){
 ch=ch||{};equipment=equipment||{};mode=mode||"idle";frame=Math.floor(frame||0)%6;
 var pose=mode==="run"?frame:mode==="jump"?8:mode==="fall"?9:mode==="land"?10:mode==="hit"?11:6+(frame%2);
 var key=JSON.stringify([ch,pose,equipment]);var pixels=cache[key];
 if(!pixels){
  var grid=new Array(24*40),rig=rigs[pose],head=rig.head||0,shift=rig.shiftX||0;
  function dot(px,py,col){px=Math.round(px);py=Math.round(py);if(px>=0&&px<24&&py>=0&&py<40&&col)grid[py*24+px]=col;}
  function tint(col,target,reference){
   if(!target)return col;
   var source=parseInt(col.slice(1),16),r=(source>>16)&255,g=(source>>8)&255,b=source&255;
   var v=(r*.3+g*.59+b*.11)/reference,result='#';
   for(var k=1;k<=5;k+=2)result+=Math.max(0,Math.min(255,Math.round(parseInt(target.slice(k,k+2),16)*v))).toString(16).padStart(2,'0');
   return result;
  }
  function sprite(id,dx,dy,options){
   var s=Sprites.sprites[id];if(!s)return;options=options||{};
   var sx=options.sx||0,sy=options.sy||0,sw=options.sw||s.w,sh=options.sh||s.h,w=options.w||sw,h=options.h||sh;
   for(var py=0;py<h;py++)for(var px=0;px<w;px++){
    var n=s.pixels[(sy+Math.floor(py*sh/h))*s.w+sx+Math.floor(px*sw/w)];if(!n)continue;
    var col=Sprites.palette[n];if(options.tint)col=tint(col,options.tint,options.reference||105);
    dot(dx+px,dy+py,col);
   }
  }
  var hair=hairIds[Math.max(0,Math.min(15,ch.hairStyle||0))];
  if((ch.hairStyle||0)>=12)sprite(hair,3+shift,head,{tint:ch.hair});
  // Base frames contain real pose-specific limbs. Recolor skin without tinting linen.
  var base=Sprites.sprites['body_'+pose];
  for(var n=0;n<base.pixels.length;n++)if(base.pixels[n]){
   var col=Sprites.palette[base.pixels[n]],value=parseInt(col.slice(1),16),r=value>>16,g=(value>>8)&255,b=value&255;
   if(r>g*1.14&&g>b*1.1)col=tint(col,ch.skin||'#dfaf87',170);
   dot(n%24,Math.floor(n/24),col);
  }
  // Trousers follow the actual animated leg silhouettes, never a static rectangle.
  var pants=Sprites.sprites[equipment.legs];
  if(pants)for(var py=26+head;py<40;py++)for(var px=0;px<24;px++){
   if(!grid[py*24+px])continue;
   var nearest=rig.feet[0],other=rig.feet[1];
   if(Math.hypot(px-other[0],py-other[1])<Math.hypot(px-nearest[0],py-nearest[1]))nearest=other;
   if(py>nearest[1]-2)continue;
   var sample=pants.pixels[Math.min(pants.h-1,Math.max(0,Math.round((py-rig.hip[1])/Math.max(1,nearest[1]-rig.hip[1])*12)))*pants.w+Math.max(0,Math.min(pants.w-1,Math.round(px-nearest[0]+pants.w/2)))];
   dot(px,py,Sprites.palette[sample]||'#4c423c');
  }
  function wear(id){var layer=wearablePixels(id,pose);for(var i=0;i<layer.length;i++)dot(layer[i][0],layer[i][1],layer[i][2]);}
  wear(equipment.torso);wear(equipment.feet);wear(equipment.hands);wear(equipment.belt);
  sprite(hair,3+shift,head,{tint:ch.hair});wear(equipment.head);
  // Legacy hands/boots affect abilities only; diamond cosmetics are reserved.
  pixels=[];for(var i=0;i<grid.length;i++)if(grid[i])pixels.push([i%24,Math.floor(i/24),grid[i]]);
  if(Object.keys(cache).length>256)cache={};cache[key]=pixels;
 }
 for(var i=0;i<pixels.length;i++){var p=pixels[i];c.fillStyle=p[2];c.fillRect(Math.round(x)+(facingLeft?23-p[0]:p[0]),Math.round(y)+p[1],1,1);}
}
function plant(c,p,ground){Environment.plant(c,p,ground);}
function prop(c,id,x,y,w,h){Environment.prop(c,id,x,y,w,h);}
