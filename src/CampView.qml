import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
Item {
 id:camp
 property var s: backend.state
 signal focusGame()
 function stationName(id){return id==="home"?qsTr("Hearth & home"):id==="portal"?qsTr("Mempool gate"):id==="training"?qsTr("Training grounds"):id==="forge"?qsTr("Runic workshop"):id==="wardrobe"?qsTr("Wardrobe"):id==="library"?qsTr("Spell garden"):""}
 function description(id){return id==="home"?qsTr("Your refuge between expeditions. The fire is lit, your supplies are safe. Explore the camp, then take the eastern gate into the living forest."):id==="portal"?qsTr("Enter a forest grown from real Bitcoin transactions. Coins collected during a live expedition are added to your supplies when you fall or return home."):id==="training"?qsTr("Practice jumping with sample plants. Training coins and scores never enter your supplies or live record."):id==="forge"?qsTr("A workbench for future upgrades. Useful equipment should be affordable through ordinary play. No purchases are available yet."):id==="wardrobe"?qsTr("A home for future outfits and appearances. Skins will be longer-term goals, without extra combat power. Nothing is on sale yet."):qsTr("The first pages of your future spellbook. Skills, discoveries and combinations earned during expeditions will shape the roguelike adventure. Spell crafting comes in a future update.")}
 Connections {target:backend;function onChanged(){world.requestPaint()}}
 Canvas {
 id:world;anchors.fill:parent;renderTarget:Canvas.Image
 onPaint:{
 var c=getContext('2d');c.reset();c.scale(width/640,height/360);c.imageSmoothingEnabled=false;
 var t=s.animation;
 function r(x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)}
 function ellipse(x,y,rx,ry,col){c.fillStyle=col;c.save();c.translate(x,y);c.scale(rx,ry);c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.restore();c.fill()}
 function glow(x,y,rad,col){var g=c.createRadialGradient(x,y,1,x,y,rad);g.addColorStop(0,col);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-rad,y-rad,rad*2,rad*2)}
 function stone(x,y,w,h){r(x,y+2,w,h,'#263a3b');r(x,y,w,h-3,'#4b5f59');r(x+2,y+1,w-4,2,'#687b6a')}
 function tree(x,y,scale){ellipse(x,y+4,17*scale,7*scale,'#122626');r(x-3*scale,y-35*scale,6*scale,36*scale,'#674b3b');r(x-6*scale,y-9*scale,4*scale,8*scale,'#926749');for(var j=0;j<4;j++){var w=(19+j*9)*scale;r(x-w/2,y-(72-j*12)*scale,w,19*scale,j%2?'#254d40':'#2d5946');r(x-w/2+3*scale,y-(72-j*12)*scale,w*.4,5*scale,'#426f50')}}
 function lamp(x,y){glow(x,y,30,'#d8a75435');r(x-2,y,4,22,'#6b5a43');r(x-5,y-7,10,10,'#342e32');r(x-3,y-5,6,6,'#f4d48b');r(x-6,y-9,12,2,'#a08457')}
 r(0,0,640,360,'#10272c');
 for(var i=0;i<900;i++){var x=(i*53.31)%640,y=(i*79.17)%360;r(x,y,2+(i%3),1,i%5?'#193832':'#2b4836')}
 // A sheltered clearing, with crossing paths connecting the six camp stations.
 ellipse(320,245,268,99,'#29473b');ellipse(320,250,252,88,'#344c3c');
 r(257,172,29,154,'#73624b');r(93,220,458,23,'#73624b');r(160,234,24,67,'#6a5d47');r(452,237,25,57,'#6a5d47');
 for(i=0;i<140;i++){x=90+(i*31)%470;y=224+(i%5)*3;r(x,y,4,2,i%3?'#8b7858':'#5f5845')}
 for(i=0;i<20;i++)stone(270+(i%2)*10,184+i*6,8,4);
 // Forest rim frames the clearing; the lower rim stays open for movement.
 for(i=0;i<10;i++)tree(i*74-10,105+(i%2)*24,.8+(i%3)*.15);
 tree(24,202,1.2);tree(620,197,1.15);tree(20,315,1.15);tree(615,321,1.18);
 for(i=0;i<40;i++){x=(i*97)%640;y=330+(i%6)*4;r(x,y,3,2,i%3?'#42644a':'#8d9063')}
 // Raised stone foundation, timber walls and a mossy, layered roof.
 ellipse(272,177,91,16,'#142b2a');r(196,120,153,58,'#44554b');r(202,111,141,57,'#77604c');r(208,115,129,49,'#967858');
 for(i=0;i<6;i++)r(208,119+i*8,129,2,'#725640');
 r(205,113,6,55,'#493e37');r(330,113,6,55,'#493e37');
 r(190,91,165,28,'#263d39');r(202,75,140,18,'#3c5a46');r(216,63,113,14,'#4e6b4b');
 for(i=0;i<8;i++){r(197+i*20,93,17,3,'#557252');r(206+i*17,81,14,3,'#698351')}
 r(310,56,15,26,'#4f5a55');r(308,54,19,5,'#778174');r(315,40-Math.floor(t*2)%3,8,8,'#78908255');r(322,28,10,7,'#78908233');
 r(258,127,28,42,'#38443d');r(262,130,20,38,'#4d4838');r(274,151,3,3,'#e1b768');stone(252,170,42,9);stone(246,180,54,6);
 for(var wx of [221,302]){glow(wx+8,140,29,'#e9bd5130');r(wx,128,18,21,'#3d3f36');r(wx+3,131,12,15,'#dfb96f');r(wx+8,130,2,18,'#6c593f');r(wx+2,138,15,2,'#6c593f')}
 lamp(237,165);lamp(309,165);
 // Wardrobe tent: a violet canopy, travel chest and hanging fabrics.
 ellipse(389,188,34,9,'#1a302c');r(365,154,49,30,'#5d4a6d');r(369,150,41,8,'#8e7393');r(376,139,27,11,'#ae8ba0');r(384,155,13,29,'#2d3145');r(362,183,53,4,'#b6a078');r(402,177,15,9,'#795c47');r(402,180,15,2,'#c0a464');
 // Rune workshop: blue crystal, anvil, tools and a warm furnace.
 ellipse(111,218,45,12,'#1b302d');r(75,192,69,15,'#86654c');r(79,207,6,12,'#4e4638');r(135,207,6,12,'#4e4638');r(87,184,27,8,'#82908a');r(93,192,14,5,'#444e50');r(122,174,8,18,'#77d7c6');r(120,180,12,7,'#b0ebca');glow(125,182,30,'#70d6cf32');r(61,203,14,13,'#5a4d40');r(64,205,8,6,'#ecac67');r(89,197,17,2,'#c1a477');
 // Arcane portal on a rune platform. This is a real doorway, not a menu backdrop.
 ellipse(540,220,43,17,'#1c302f');ellipse(540,217,37,13,'#54656a');ellipse(540,216,29,9,'#34404c');
 glow(540,185,62,'#8a7de249');ellipse(540,180,23,37,'#665986');ellipse(540,179,16,29,'#ada1d5');ellipse(540,179,11,24,'#617d99');
 for(i=0;i<7;i++){var a=t*.65+i*6.28/7;r(540+Math.cos(a)*20,180+Math.sin(a)*30,3,3,'#e3d1e8')}
 for(var side of [-1,1]){stone(540+side*29-5,172,10,41);r(540+side*29-2,184,3,9,'#b7a8d3')}
 stone(516,137,49,9);r(537,133,7,7,'#c5b4e0');lamp(491,225);lamp(588,225);
 // Practice target, hay and a small fenced training patch.
 r(433,270,67,34,'#5c5942');for(i=0;i<5;i++){r(431+i*17,266,3,31,'#93815c');}r(431,276,71,3,'#b6a178');
 r(464,250,3,37,'#987557');r(451,258,29,3,'#b09a6a');r(457,244,17,5,'#ba9d69');r(460,239,10,6,'#d2b777');r(459,254,13,13,'#8b8474');r(484,280,13,11,'#b0a166');
 // Botanical spell garden: an open book, glowing mushrooms and seed beds.
 ellipse(174,300,39,12,'#1b302d');stone(155,285,39,13);r(160,276,15,10,'#cbbd91');r(175,276,15,10,'#e5d5ac');r(174,275,2,13,'#836e56');r(163,279,9,1,'#7a7b73');r(180,279,7,1,'#7a7b73');
 for(i=0;i<9;i++){x=120+i*13;y=309+(i%2)*6;r(x,y-7,2,8,'#9faf79');r(x-4,y-11,9,5,i%3?'#a49cc6':'#7fbdac');glow(x,y-8,12,'#aaa6d52a')}
 // A living hearth, log seats, and drifting embers at the centre.
 ellipse(329,270,28,11,'#172d2c');for(i=0;i<7;i++)stone(310+i*6,271+(i%2)*3,6,4);
 r(318,265,21,4,'#917056');r(327,250,8,18,'#d98a4f');r(323,258,16,12,'#eda45c');r(328,256-Math.floor(t*7)%4,6,13,'#f3d38a');glow(331,260,44,'#d7a84f35');
 r(293,275,15,5,'#9d7951');r(351,270,16,5,'#9d7951');
 for(i=0;i<8;i++)r(325+Math.sin(i*3+t)*13,254-((t*14+i*7)%30),1,2,'#e6ba71');
 // Player feet set the walking plane; a shadow and small bob convey depth.
 var px=s.campX,py=s.campY,step=s.moving?Math.floor(t*10)%2:0;
 ellipse(px,py+2,10,4,'#152a28');
 r(px-5,py-29-step,12,4,'#b7a25b');r(px-9,py-25-step,22,3,'#d7c380');r(px-3,py-22-step,10,8,'#d5a17a');r(px+4,py-20-step,2,2,'#202d34');r(px-5,py-14,13,8,'#69a384');r(px-7,py-12,3,7,'#44735b');r(px+8,py-12,3,5,'#d5a17a');r(px-4,py-6,4,6-step*2,'#a0b5bc');r(px+3,py-6,4,4+step*2,'#71909d');
 for(i=0;i<18;i++){x=(i*137+t*3)%640;y=190+Math.sin(i*3+t*.5)*75;glow(x,y,6,'#bed28d22');r(x,y,1,1,'#c4d1a0')}
 }
 }
 MouseArea {anchors.fill:parent;onClicked:mouse=>{camp.focusGame();backend.walkTo(mouse.x/width*640,mouse.y/height*360)}}
 Repeater {
 model:[{code:"home",x:270,y:194},{code:"forge",x:112,y:242},{code:"wardrobe",x:390,y:210},{code:"portal",x:540,y:242},{code:"library",x:175,y:329},{code:"training",x:465,y:313}]
 Label {required property var modelData;x:modelData.x/640*camp.width-width/2;y:modelData.y/360*camp.height;text:camp.stationName(modelData.code);font.pixelSize:Math.max(9,Math.min(12,camp.width/80));color:s.nearby===modelData.code?"#f0ddb0":"#a9bda9";padding:3;background:Rectangle{color:"#b0152b2d"}}
 }
 Column {anchors.left:parent.left;anchors.top:parent.top;anchors.margins:14;spacing:3
 Label {text:qsTr("BASE CAMP");font.pixelSize:21;font.bold:true;font.letterSpacing:3;color:"#e2d8ac"}
 Label {text:qsTr("A little home between worlds");font.pixelSize:11;color:"#9eb2a0"}
 }
 Rectangle {anchors.horizontalCenter:parent.horizontalCenter;anchors.bottom:parent.bottom;anchors.bottomMargin:10;width:prompt.implicitWidth+26;height:30;color:"#df162c30";border.color:"#5c7560";visible:s.nearby!==""&&s.station===""
 Label {id:prompt;anchors.centerIn:parent;text:qsTr("E · %1").arg(camp.stationName(s.nearby));color:"#e5d9b0";font.pixelSize:12}
 MouseArea {anchors.fill:parent;onClicked:backend.interact()}
 }
 Rectangle {
 anchors.centerIn:parent;width:Math.min(parent.width-26,440);height:details.implicitHeight+34;color:"#f016292f";border.color:"#859378";visible:s.station!=="";radius:theme.radius
 MouseArea {anchors.fill:parent}
 ColumnLayout {id:details;anchors.centerIn:parent;width:parent.width-34;spacing:12
 Label {text:camp.stationName(s.station);font.pixelSize:24;font.bold:true;color:"#e4d7a9";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Label {text:camp.description(s.station);wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#bac6b2";font.pixelSize:13}
 Label {visible:s.station==="forge"||s.station==="library"||s.station==="wardrobe";text:qsTr("PLANNED · no coins will be spent");font.pixelSize:10;color:"#cab780"}
 RowLayout {
 Button {objectName:"campLive";visible:s.station==="portal";text:qsTr("Enter live forest")+" [E]";enabled:s.poolSize>0;highlighted:true;onClicked:{backend.start(false);camp.focusGame()}}
 Button {objectName:"campTraining";visible:s.station==="training";text:qsTr("Start training")+" [E]";highlighted:true;onClicked:{backend.start(true);camp.focusGame()}}
 Button {text:qsTr("Back")+" [Esc]";onClicked:{backend.closeStation();camp.focusGame()}}
 }
 }
 }
}
