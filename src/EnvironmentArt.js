.pragma library
.import "EnvironmentRegions.js" as Data
.import "PlantVisual.js" as Visual
var campAtlas="qrc:/art/camp.png";
var floraAtlas="qrc:/art/flora.png";
var viewLeft=0,viewTop=0,viewRight=640,viewBottom=360;
function viewport(left,top,width,height){viewLeft=Math.floor(left);viewTop=Math.floor(top);viewRight=Math.ceil(left+width);viewBottom=Math.ceil(top+height);}
function setAtlases(camp,flora){campAtlas=camp;floraAtlas=flora;}
function draw(c,id,x,y,w,h){
 var region=Data.regions[id];if(!region||w<=0||h<=0)return;
 var r=region.rect,atlas=region.atlas==="camp"?campAtlas:floraAtlas;
 c.imageSmoothingEnabled=false;
 // One cached atlas image, one clipped blit. Work never grows with giant TX height.
 // Crop before scaling to avoid browser/Qt limits when a tree extends far above view.
 var top=Math.max(0,viewTop-y),bottom=Math.min(h,viewBottom-y),left=Math.max(0,viewLeft-x),right=Math.min(w,viewRight-x);
 if(bottom<=top||right<=left)return;
 c.drawImage(atlas,r[0]+left/w*r[2],r[1]+top/h*r[3],(right-left)/w*r[2],(bottom-top)/h*r[3],x+left,y+top,right-left,bottom-top);
}
function prop(c,id,footX,footY,w,h){draw(c,id,footX-w/2,footY-h,w,h);}
var names={flower:"flora_daisies",tulip:"flora_tulips",rose:"flora_blackberry",fern:"flora_fern",cannabis:"flora_cannabis",birch:"flora_birch",pine:"flora_pine",oak:"flora_oak",sequoia:"flora_sequoia",grass:"flora_meadow_grass",mushrooms:"flora_mushrooms",sapling:"flora_sapling"};
// Legacy traces acquire one stable descriptor. FIFO cache has a hard 256-entry limit.
var legacy={},legacyKeys=[];
function appearance(p){
 if(p.visual&&p.visual.version===1)return p.visual;
 var key=(p.txid||p.fixture||'legacy')+':'+p.type+':'+p.sats+':'+p.h;
 if(!legacy[key]){if(legacyKeys.length===256)delete legacy[legacyKeys.shift()];legacyKeys.push(key);legacy[key]=Visual.descriptor(p.type,p.sats||'0',p.h,p.txid,p.fixture);}
 return legacy[key];
}
function module(c,id,x,y,w,h,crown,mirror,ground){
 x=Math.round(x);y=Math.round(y);w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
 var r=Data.regions[id].rect,sh=Math.round(r[3]*(crown ? .67 : 1));
 var l=Math.max(0,viewLeft-x),t=Math.max(0,viewTop-y),rr=Math.min(w,viewRight-x),b=Math.min(h,viewBottom-y,ground-y);
 if(rr<=l||b<=t)return;
 c.save();if(mirror){c.translate(2*x+w,0);c.scale(-1,1);var old=l;l=w-rr;rr=w-old;}
 c.imageSmoothingEnabled=false;
 c.drawImage(floraAtlas,r[0]+l/w*r[2],r[1]+t/h*sh,(rr-l)/w*r[2],(b-t)/h*sh,x+l,y+t,rr-l,b-t);c.restore();
}
function plant(c,p,ground){
 var x=Math.round(p.x),h=Math.round(p.h),w=Math.round(p.w),bottom=Math.round(ground),top=bottom-h;
 if(x+w<=viewLeft||x>=viewRight||bottom<=viewTop||top>=viewBottom||h<=0||w<=0)return;
 var d=appearance(p),id=names[p.type]||names.flower;
 var tree=p.type==='birch'||p.type==='pine'||p.type==='oak'||p.type==='sequoia';
 // Small plants use several independently anchored botanical shoots. Taller
 // plants assemble crowns at fixed pixel density, rather than enlarging texels.
 var tiers=tree?2+d.growth:1+d.growth,step=tree?18:12;
 var crownH=Math.min(h,tree?32:24),crownW=Math.min(w,tree?48:28);
 var trunk=Math.max(1,Math.min(tree?7:3,Math.round(w*(tree ? .09 : .04))));
 var cx=x+Math.floor(w/2),yy=Math.max(viewTop,top),end=Math.min(viewBottom,bottom);
 // Structural trunk/stem and bark highlights, all in logical whole pixels.
 c.fillStyle=tree?(p.type==='birch'?'#d5d7bf':'#705038'):'#426449';
 c.fillRect(cx-Math.floor(trunk/2),yy,trunk,Math.max(0,end-yy));
 c.fillStyle=tree?['#a18054','#99805b','#aa8c62'][d.tone]:['#6e9355','#75935c','#68894f'][d.tone];
 c.fillRect(cx-Math.floor(trunk/2),yy,1,Math.max(0,end-yy));
 if(tree){c.fillStyle=p.type==='birch'?'#565c50':'#4e3c31';for(var bark=Math.max(0,Math.ceil((yy-top)/9));bark*9<h&&top+bark*9<end;bark++)c.fillRect(cx-1,top+bark*9,Math.min(2,trunk),1);}
 // Iterate visible bands only, with a maximum viewport-sized budget. Giant
 // transactions never allocate a giant bitmap or visit invisible branches.
 var spacing=Math.max(step,Math.floor((h-crownH)/Math.max(1,tiers)));
 var count=Math.max(tiers,Math.ceil((h-crownH)/32));
 spacing=Math.max(step,Math.floor((h-crownH)/Math.max(1,count)));
 var first=Math.max(0,Math.ceil((viewTop-top-crownH)/spacing));
 var last=Math.min(count,Math.floor((viewBottom-top)/spacing));
 for(var i=first;i<=last;i++){
  var y=top+i*spacing;
  if(y+crownH>bottom)y=bottom-crownH;
  var pattern=(i+d.variant)%4;
  var spread=Math.min(w-crownW,Math.max(0,w*.22));
  var offset=pattern===0?-spread/2:pattern===1?spread/2:0;
  if(d.mirror)offset=-offset;
  var ratio=count?i/count:0;
  var envelope=tree?(p.type==='pine'||p.type==='sequoia'?.34+.66*ratio:p.type==='oak'?.65+.35*Math.sin(Math.PI*ratio):.48+.52*Math.sin(Math.PI*ratio)):1;
  var architecture=d.variant===0?.82:d.variant===1?.94:d.variant===2?1:.72;
  var ww=Math.max(2,Math.round(w*envelope*architecture));
  // Each architecture retains at least one full-width whorl, making its
  // mechanical width readable without forcing every crown into a rectangle.
  if(i===Math.floor(count*(d.variant===0?.35:d.variant===1?.65:.5)))ww=w;
  if(d.variant===1)offset=-(w-ww)/2;
  if(d.variant===2)offset=(w-ww)/2;
  if(d.mirror)offset=-offset;
  offset=Math.max(-(w-ww)/2,Math.min((w-ww)/2,offset));
  // Terminal crown reaches the collision top; a full-width whorl marks width.
  // Lower whorls vary
  // number, direction, spacing and silhouette without altering the hitbox.
  module(c,id,cx-ww/2+offset,y,ww,Math.max(1,crownH-(d.variant%3)),tree,d.mirror,bottom);
  if(pattern===3&&d.growth>0&&i>0){
   module(c,id,x,y+Math.floor(crownH/3),Math.min(w/2,24),Math.min(crownH,18),tree,1-d.mirror,bottom);
   module(c,id,x+w-Math.min(w/2,24),y+Math.floor(crownH/2),Math.min(w/2,24),Math.min(crownH/2,14),tree,d.mirror,bottom);
  }
 }
}
