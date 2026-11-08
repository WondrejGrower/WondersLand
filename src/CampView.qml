import "PixelArt.js" as PixelArt
import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
Item {
 id:camp
 property var s: backend.state
 signal focusGame()
 function stationName(id){return id==="home"?qsTr("Hearth & home"):id==="portal"?qsTr("Mempool Gate"):id==="training"?qsTr("Training Grounds"):id==="forge"?qsTr("Runic Workshop"):id==="wardrobe"?qsTr("Wardrobe"):id==="library"?qsTr("Spell Garden"):""}
 Connections {target:backend;function onChanged(){world.requestPaint()}}
 Canvas {
 property bool artReady:false
 Component.onCompleted:{loadImage("qrc:/art/camp.png");loadImage("qrc:/art/flora.png")}
 onImageLoaded:{artReady=isImageLoaded("qrc:/art/camp.png")&&isImageLoaded("qrc:/art/flora.png");requestPaint()}
 id:world;anchors.fill:parent;renderTarget:Canvas.Image;smooth:false
 onPaint:{
 if(!artReady)return;
 var c=getContext('2d');c.reset();var view=s.viewport||{left:0,top:0,width:640,height:360};var pixelScale=Math.min(width/view.width,height/view.height);c.scale(pixelScale,pixelScale);c.translate(-view.left,-view.top);c.imageSmoothingEnabled=false;PixelArt.viewport(view.left,view.top,view.width,view.height);
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
 for(i=0;i<16;i++)r((i*137+t*3)%640,190+Math.sin(i*3+t*.5)*75,1,1,'#c4d1a0');
 }
 }
 MouseArea {anchors.fill:parent;onClicked:mouse=>{camp.focusGame();backend.walkTo(mouse.x/width*640,mouse.y/height*360)}}
 Repeater {
 model:[{code:"home",x:270,y:194},{code:"forge",x:112,y:242},{code:"wardrobe",x:390,y:210},{code:"portal",x:540,y:242},{code:"library",x:175,y:329},{code:"training",x:465,y:313}]
 Label {required property var modelData;visible:modelData.code==="home"||modelData.code==="portal"||s.profile.unlocked.indexOf(modelData.code==="library"?"garden":modelData.code)>=0; width:Math.min(160,implicitWidth);wrapMode:Text.WordWrap;horizontalAlignment:Text.AlignHCenter;x:Math.max(2,Math.min(camp.width-width-2,modelData.x/640*camp.width-width/2));y:modelData.y/360*camp.height;text:camp.stationName(modelData.code);font.pixelSize:Math.max(9,Math.min(12,camp.width/80));color:s.nearby===modelData.code?"#f0ddb0":"#a9bda9";padding:3;background:Rectangle{color:"#b0152b2d"}}
 }
 Column {anchors.left:parent.left;anchors.top:parent.top;anchors.margins:14;spacing:3
 Label {text:qsTr("Base Camp");font.pixelSize:21;font.bold:true;font.letterSpacing:3;color:"#e2d8ac"}
 Label {text:qsTr("A little home between worlds");font.pixelSize:11;color:"#9eb2a0"}
 }
 Rectangle {anchors.horizontalCenter:parent.horizontalCenter;anchors.bottom:parent.bottom;anchors.bottomMargin:10;width:prompt.implicitWidth+26;height:30;color:"#df162c30";border.color:"#5c7560";visible:s.nearby!==""&&s.station===""
 Label {id:prompt;anchors.centerIn:parent;text:qsTr("E · %1").arg(camp.stationName(s.nearby));color:"#e5d9b0";font.pixelSize:12}
 MouseArea {anchors.fill:parent;onClicked:backend.interact()}
 }
}
