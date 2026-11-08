.pragma library
.import "CharacterSprites.js" as Sprites
var cache={}
var hairIds=["hair_short_tousled","hair_short_side_part","hair_short_textured","hair_buzz_cut","hair_short_crop","hair_short_curls","hair_quiff","hair_short_spiky","hair_medium_wavy","hair_undercut","hair_compact_afro","hair_swept_back","hair_bob","hair_long_loose","hair_ponytail","hair_braid"];
// Registered attachment points in the same 24x40 pixel world as the body frames.
var rigs=[
 {torso:[4,14],feet:[[4,37],[18,34]],hands:[[3,23],[19,22]]},
 {torso:[4,14],feet:[[9,38],[6,32]],hands:[[10,23],[17,25]]},
 {torso:[4,14],feet:[[8,38],[16,29]],hands:[[12,24],[15,22]]},
 {torso:[4,14],feet:[[3,34],[18,36]],hands:[[3,23],[19,21]]},
 {torso:[4,14],feet:[[7,32],[10,38]],hands:[[9,23],[16,25]]},
 {torso:[4,14],feet:[[5,37],[14,32]],hands:[[4,22],[20,22]]},
 {torso:[4,14],feet:[[8,38],[17,38]],hands:[[4,26],[19,26]]},
 {torso:[4,14],feet:[[8,38],[17,38]],hands:[[4,26],[19,26]]},
 {torso:[4,14],feet:[[9,33],[17,29]],hands:[[6,20],[20,19]]},
 {torso:[4,14],feet:[[8,35],[17,34]],hands:[[4,25],[20,24]]},
 {torso:[4,22],feet:[[7,38],[16,38]],hands:[[11,30],[19,29]],head:9},
 {torso:[4,14],feet:[[9,38],[20,38]],hands:[[7,24],[22,21]]}
];
function character(c,x,y,ch,frame,hands,boots,mode,equipment,facingLeft){
 ch=ch||{};equipment=equipment||{};mode=mode||"idle";frame=Math.floor(frame||0)%6;
 var pose=mode==="run"?frame:mode==="jump"?8:mode==="fall"?9:mode==="land"?10:mode==="hit"?11:6+(frame%2);
 var key=JSON.stringify([ch,pose,equipment]);var pixels=cache[key];
 if(!pixels){
  var grid=new Array(24*40),rig=rigs[pose],head=rig.head||0;
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
  if((ch.hairStyle||0)>=12)sprite(hair,3,head,{tint:ch.hair});
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
   var sample=pants.pixels[Math.min(pants.h-1,Math.max(0,py-26-head))*pants.w+(px%pants.w)];
   dot(px,py,Sprites.palette[sample]||'#4c423c');
  }
  sprite(equipment.torso,rig.torso[0],rig.torso[1]);
  // Split paired accessories so each one stays attached to its own animated limb.
  var feet=Sprites.sprites[equipment.feet],gloves=Sprites.sprites[equipment.hands];
  for(var side=0;side<2;side++){
   if(feet)sprite(equipment.feet,rig.feet[side][0]-3,rig.feet[side][1]-4,{sx:side*7,sw:7,sh:7,w:7,h:5});
   if(gloves)sprite(equipment.hands,rig.hands[side][0]-2,rig.hands[side][1]-2,{sx:side*7,sw:7,sh:7,w:5,h:5});
  }
  sprite(equipment.belt,5,rig.torso[1]+11);
  sprite(hair,3,head,{tint:ch.hair});
  sprite(equipment.head,1,head-1);
  // Legacy hands/boots affect abilities only; diamond cosmetics are reserved.
  pixels=[];for(var i=0;i<grid.length;i++)if(grid[i])pixels.push([i%24,Math.floor(i/24),grid[i]]);
  if(Object.keys(cache).length>256)cache={};cache[key]=pixels;
 }
 for(var i=0;i<pixels.length;i++){var p=pixels[i];c.fillStyle=p[2];c.fillRect(Math.round(x)+(facingLeft?23-p[0]:p[0]),Math.round(y)+p[1],1,1);}
}
function plant(c,p,ground){
 var x=Math.round(p.x),h=p.h,w=p.w,top=ground-h;
 function r(px,py,rw,rh,col){c.fillStyle=col;c.fillRect(Math.round(px),Math.round(py),Math.max(1,Math.round(rw)),Math.max(1,Math.round(rh)))}
 var tree=["birch","pine","oak","sequoia"].indexOf(p.type)>=0;
 var seed=parseInt((p.txid||"0a7d").slice(0,5),16)||127;
 if(tree){
 var trunk=Math.max(4,Math.round(w*.2));r(x+w/2-trunk/2,top,trunk,h,p.type==="birch"?"#c6c6a5":"#78563e");
 for(var iy=Math.max(top,ground-360);iy<ground;iy+=7){r(x+w/2-trunk/2+1,iy,2,4,p.type==="birch"?"#535c52":"#a37a50");if(iy%3===0)r(x+w/2,iy,2,2,"#493f35")}
 for(var j=0;j<7;j++){var branchY=top+h*.12+j*h*.092;var spread=w*(p.type==="pine"||p.type==="sequoia"?.25+j*.08:.8-Math.abs(j-3)*.13);var side=j%2?1:-1;r(x+w/2,branchY,side>0?spread/2:2,3,"#876447");r(x+w/2-spread/2,branchY-7,spread,13,"#2c503c");r(x+w/2-spread/2+2,branchY-8,spread*.65,5,"#5d8050");r(x+w/2-spread/2+5,branchY-6,spread*.25,2,"#9aaf66");for(var a=0;a<7;a++)r(x+w/2-spread/2+((a*7+seed)%Math.max(1,spread)),branchY+(a%3)-3,2,2,"#748e50")}
 r(x+w/2-7,ground-3,14,3,"#67533d");
 }else if(p.type==="cannabis"||p.type==="fern"){
 r(x+w/2,top,2,h,"#7fa34c");for(j=0;j<5;j++){var cy=top+5+j*h*.17;for(var d=-3;d<=3;d++){var dx=d*(w/7);r(x+w/2+dx,cy-Math.abs(d)*2,2,7,"#84b649");r(x+w/2+dx-1,cy+1,3,2,"#b0c765")}}r(x+w/2-1,top,4,7,"#c6bd76");
 }else{r(x+w/2,top+5,2,Math.max(1,h-5),"#67915a");r(x+w/2-5,ground-4,5,2,"#92b263");r(x+w/2+1,ground-7,5,2,"#51794e");var col=p.type==="rose"?"#d58a9b":p.type==="tulip"?"#e6a26d":"#e4d693";r(x+w/2-3,top+2,7,4,col);r(x+w/2-1,top,3,8,col);r(x+w/2,top+3,2,2,"#f4e9c2")}
}
