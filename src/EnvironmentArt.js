.pragma library
.import "EnvironmentRegions.js" as Data
var campAtlas="qrc:/art/camp.png";
var floraAtlas="qrc:/art/flora.png";
function setAtlases(camp,flora){campAtlas=camp;floraAtlas=flora;}
function draw(c,id,x,y,w,h){
 var region=Data.regions[id];if(!region||w<=0||h<=0)return;
 var r=region.rect,atlas=region.atlas==="camp"?campAtlas:floraAtlas;
 c.imageSmoothingEnabled=false;
 // One cached atlas image, one clipped blit. Work never grows with giant TX height.
 // Crop before scaling to avoid browser/Qt limits when a tree extends far above view.
 var top=Math.max(0,-y),bottom=Math.min(h,360-y),left=Math.max(0,-x),right=Math.min(w,640-x);
 if(bottom<=top||right<=left)return;
 c.drawImage(atlas,r[0]+left/w*r[2],r[1]+top/h*r[3],(right-left)/w*r[2],(bottom-top)/h*r[3],x+left,y+top,right-left,bottom-top);
}
function prop(c,id,footX,footY,w,h){draw(c,id,footX-w/2,footY-h,w,h);}
function plant(c,p,ground){
 var names={flower:"flora_daisies",tulip:"flora_tulips",rose:"flora_blackberry",fern:"flora_fern",cannabis:"flora_cannabis",birch:"flora_birch",pine:"flora_pine",oak:"flora_oak",sequoia:"flora_sequoia",grass:"flora_meadow_grass",mushrooms:"flora_mushrooms",sapling:"flora_sapling"};
 draw(c,names[p.type]||"flora_daisies",p.x,ground-p.h,p.w,p.h);
}
