import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
ApplicationWindow {
 id: win
 width: 1152; height: 760; minimumWidth: 720; minimumHeight: 540
 visible: true; title: "WondersLand [WL]"
 color: "#0c1723"
 Material.theme: Material.Dark; Material.accent: theme.accent; Material.roundedScale: theme.radius
 property var s: backend.state
 property bool help: false
 function action(){if(s.phase==="camp"){backend.interact();return;}if(s.phase === "ready" || s.phase === "over")backend.start(s.demo);else if(s.phase === "paused")backend.pause();else backend.jump()}
 Shortcut {sequence:"Q";onActivated:win.close()}
 Shortcut {sequence:"?";onActivated:{help=!help;if(s.phase==="running")backend.pause()}}
 Shortcut {sequence:"P";onActivated:backend.pause()}
 Shortcut {sequence:"Escape";onActivated:{if(s.phase==="camp")backend.closeStation();else backend.pause()}}
 Shortcut {sequence:"F11";onActivated:win.visibility=win.visibility===Window.FullScreen?Window.Windowed:Window.FullScreen}
 onActiveChanged: if(!active){backend.stopMovement();if(s.phase==="running")backend.pause()}
 Component.onCompleted:gameRoot.forceActiveFocus()
 Connections {target:backend;function onChanged(){scene.requestPaint()}}
 Item {
 id: gameRoot
 objectName:"gameRoot"
 anchors.fill:parent;LayoutMirroring.enabled:Qt.application.layoutDirection===Qt.RightToLeft;LayoutMirroring.childrenInherit:true
 focus:true
 function direction(key){return key===Qt.Key_A||key===Qt.Key_Left?"left":key===Qt.Key_D||key===Qt.Key_Right?"right":key===Qt.Key_W||key===Qt.Key_Up?"up":key===Qt.Key_S||key===Qt.Key_Down?"down":""}
 Keys.onPressed: event=>{
  if(event.isAutoRepeat)return;
  if(s.phase==="camp"){
   var d=direction(event.key);if(d){backend.setMovement(d,true);event.accepted=true}
   else if(event.key===Qt.Key_E||event.key===Qt.Key_Space){backend.interact();event.accepted=true}
  }else if(event.key===Qt.Key_Space||event.key===Qt.Key_Up){win.action();event.accepted=true}
 }
 Keys.onReleased: event=>{if(event.isAutoRepeat)return;var d=direction(event.key);if(d)backend.setMovement(d,false);if(event.key===Qt.Key_Space||event.key===Qt.Key_Up)backend.releaseJump()}
 ColumnLayout {
 anchors.fill:parent;anchors.margins:24;spacing:16
 RowLayout {
 Layout.fillWidth:true
 ColumnLayout {spacing:2
 Label {text:"WONDERSLAND [WL]";font.pixelSize:22;font.bold:true;font.letterSpacing:3;color:"#e6dfb8"}
 Label {text:qsTr("BITCOIN FOREST · EXPEDITIONS / 0.2");font.pixelSize:10;font.letterSpacing:2;color:"#769888"}
 Label {text:qsTr("BEST %1 m").arg(s.best);font.pixelSize:11;color:"#b9b497"}
 }
 Item{Layout.fillWidth:true}
 Rectangle {
 Layout.preferredWidth:190;Layout.preferredHeight:72
 color:"#253029";border.color:"#aa8b48";radius:theme.radius
 RowLayout {
 anchors.fill:parent;anchors.margins:10;spacing:10
 Item {Layout.preferredWidth:24;Layout.preferredHeight:28
 Rectangle {anchors.centerIn:parent;width:22;height:24;radius:7;color:"#d5a64e";border.width:2;border.color:"#f2d78c"}
 Rectangle {anchors.centerIn:parent;width:4;height:13;color:"#ffecb2"}
 }
 ColumnLayout {spacing:0;Layout.fillWidth:true
 Label {text:qsTr("COINS");font.pixelSize:10;font.letterSpacing:2;color:"#e2c780"}
 Label {objectName:"coinBalance";text:Number(s.wallet).toLocaleString(Qt.locale(),'f',0);font.pixelSize:26;font.bold:true;font.family:"monospace";color:"#ffdf87";Layout.fillWidth:true;elide:Text.ElideRight}
 Label {text:s.phase!=="camp"&&s.demo?qsTr("Training · not saved"):(s.phase==="running"||s.phase==="paused")?qsTr("+ %1 this expedition").arg(s.collected):qsTr("Saved supplies");font.pixelSize:10;color:"#c8c0a0";Layout.fillWidth:true;elide:Text.ElideRight}
 }
 }
 }
 }
 Rectangle {
 Layout.fillWidth:true;Layout.fillHeight:true;color:"#101d2b";border.color:"#30483e";radius:theme.radius
 Item {
 id:viewport;anchors.centerIn:parent;width:Math.min(parent.width,parent.height*640/360);height:width*360/640
 Canvas {
 id:scene;anchors.fill:parent;renderTarget:Canvas.Image;visible:s.phase!=="camp"
 onPaint:{
 var c=getContext('2d');c.reset();c.scale(width/640,height/360);c.imageSmoothingEnabled=false;
 var d=s.distance*10,t=s.animation,ground=284;
 function rect(x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)}
 function hill(offset,base,col){c.fillStyle=col;c.beginPath();c.moveTo(0,ground);for(var x=0;x<=656;x+=16)c.lineTo(x,base+Math.sin((x+offset)*.012)*18+Math.sin((x+offset)*.028)*9);c.lineTo(656,ground);c.closePath();c.fill()}
 rect(0,0,640,360,"#101d2b");
 for(var i=0;i<65;i++){var sx=(i*149.3)%640,sy=(i*i*17.3)%183;rect(sx,sy,i%7===0?2:1,1,i%3?"#425e70":"#b6c7b2")}
 rect(542,38,23,23,"#e3d7a1");rect(535,32,19,22,"#101d2b");
 hill(d*.12,224,"#182f37");hill(d*.25,247,"#254039");
 for(i=0;i<13;i++){var bx=((i*83-d*.4)%760+760)%760-60;rect(bx,232,5,52,"#2c493c");rect(bx-12,215,29,29,"#2b493b")}
 rect(0,ground,640,76,"#77523c");rect(0,ground+12,640,64,"#513c30");
 for(i=0;i<180;i++)rect(((i*37-d)%680+680)%680-20,ground+7+(i*13)%64,3,2,i%3?"#805b42":"#aa7b53");
 rect(0,ground,640,4,"#557f48");rect(0,ground,640,1,"#a6c779");for(i=0;i<214;i++)rect(i*3,ground-1-(i%3),1,3,"#779e53");
 function plant(p){var x=p.x,h=p.h,w=p.w,y=ground-h;
 if(p.type==="pine"||p.type==="sequoia"){
 rect(x+w*.44,y+12,5,h-12,"#9b6d48");for(var a=0;a<5;a++){var rw=w*(.35+a*.13);rect(x+(w-rw)/2,y+a*h*.14,rw,h*.25,"#315e43");rect(x+(w-rw)/2,y+a*h*.14,rw*.4,h*.15,"#709650")}
 }else if(p.type==="birch"||p.type==="oak"){
 rect(x+w*.46,y+14,5,h-14,p.type==="birch"?"#c3c4a0":"#8b6245");rect(x,y+7,w,h*.42,"#345d42");rect(x+4,y,w-8,h*.35,"#64874a");rect(x+6,y+3,w*.35,h*.16,"#8fa75c");
 }else if(p.type==="cannabis"){
 rect(x+w/2,y,2,h,"#80a24e");for(a=0;a<3;a++){var cy=y+h*.25+a*h*.23;for(var k=-3;k<=3;k++){var dx=k*3;rect(x+w/2+dx,cy-Math.abs(k)*2,3,9,"#88b64e");rect(x+w/2+dx*1.4,cy+3,3,5,"#5b963c")}}
 }else if(p.type==="fern"){
 rect(x+w/2,y+5,2,h-5,"#668947");for(a=0;a<4;a++){rect(x+a*2,y+7+a*5,w-a*4,3,"#8caf61")}
 }else{rect(x+w/2,ground-12,2,12,"#729451");rect(x+2,ground-7,w/2,2,"#8db563");rect(x+2,y+3,w-4,h-13,p.type==="rose"?"#d78291":p.type==="tulip"?"#eca56f":"#e7d38b");rect(x+w/2-2,y,5,6,"#eee1b0")}
 }
 var obstacles=s.obstacles||[];for(i=0;i<obstacles.length;i++)plant(obstacles[i]);
 var coins=s.coins||[];for(i=0;i<coins.length;i++){var coin=coins[i];if(!coin.taken){rect(coin.x,ground-coin.y,7,9,"#d9a94f");rect(coin.x+2,ground-coin.y+2,2,5,"#ffe6a0")}}
 var py=ground-s.y-28,px=98,step=s.y>0?0:Math.floor(t*9)%2;
 rect(px+3,py,12,4,"#b7a25b");rect(px-1,py+4,21,3,"#d7c380");rect(px+5,py+7,10,8,"#d5a17a");rect(px+12,py+9,2,2,"#202d34");
 rect(px+3,py+15,13,8,"#69a384");rect(px+1,py+16,4,7,"#44735b");rect(px+15,py+16,4,5,"#d5a17a");
 rect(px+4,py+23,4,5+step*2,"#a0b5bc");rect(px+12,py+23,4,7-step*2,"#71909d");
 if(s.phase==="over"){c.strokeStyle="#e2a27b";c.lineWidth=2;var hit=s.hit;c.strokeRect(hit.x-4,ground-hit.h-4,hit.w+8,hit.h+8)}
 }
 }
 MouseArea {anchors.fill:parent;enabled:s.phase!=="camp";onPressed:{gameRoot.forceActiveFocus();win.action()}onReleased:backend.releaseJump()}
 Column {
 visible:s.phase!=="camp"
 anchors.left:parent.left;anchors.top:parent.top;anchors.margins:16;spacing:3
 Label {text:qsTr("%1 m").arg(s.score);font.pixelSize:26;font.bold:true;color:"#e8dfb5"}
 Label {text:qsTr("+ %1 coins").arg(s.collected);color:"#d9b85e";font.pixelSize:12}
 }
 CampView {anchors.fill:parent;visible:s.phase==="camp";onFocusGame:gameRoot.forceActiveFocus()}
 Label {visible:s.phase!=="camp";anchors.right:parent.right;anchors.top:parent.top;anchors.margins:16;text:s.demo?qsTr("TRAINING · SAMPLE PLANTS"):qsTr("REAL TRANSACTIONS");font.pixelSize:10;font.letterSpacing:1;color:s.demo?"#e0b376":"#a2c39c"}
 }
 Rectangle {
 anchors.centerIn:parent;width:Math.min(parent.width-36,510);height:card.implicitHeight+40;color:"#ed14252d";border.color:"#59705a";radius:theme.radius
 visible:s.phase!=="running"&&s.phase!=="camp"
 ColumnLayout {
 id:card;anchors.centerIn:parent;width:parent.width-40;spacing:12
 Label {objectName:"stateTitle";text:s.phase==="over"?qsTr("Your run ends here."):s.phase==="paused"?qsTr("Take a breath."):qsTr("The mempool is your wilderness.");font.pixelSize:25;font.bold:true;wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#e7dfb7"}
 Label {text:s.phase==="over"?qsTr("%1 m · %2 coins collected").arg(s.score).arg(s.collected):qsTr("Jump over transactions. Hold to jump higher.\nLarge transfers grow into towering trees.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#a8b9ac"}
 Label {visible:s.phase==="over";text:qsTr("You hit: %1").arg(qsTr(s.hit.type||""));color:"#e4c681";font.pixelSize:17}
 Label {visible:s.phase==="over";text:qsTr("Output total: %1 BTC").arg((Number(s.hit.sats||0)/100000000).toLocaleString(Qt.locale(),'f',8));wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#d8d7bd"}
 Label {visible:s.phase==="over"&&!s.demo;text:(s.hit.txid||"").slice(0,22)+"…"+(s.hit.txid||"").slice(-12);font.family:"monospace";font.pixelSize:11;color:"#9bad9c";Layout.fillWidth:true;elide:Text.ElideMiddle}
 Label {visible:s.phase==="over";text:s.demo?qsTr("Training · coins and score are not saved"):s.hit.status==="confirmed"?qsTr("Confirmed in a block"):s.hit.status==="pending"?qsTr("Still in the mempool"):qsTr("Observed in mempool · checking current status");color:"#93ab9d";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Flow {Layout.fillWidth:true;spacing:8
 Button {objectName:"playLive";text:s.phase==="paused"?qsTr("Continue"):qsTr("Run live");enabled:s.phase==="paused"||s.poolSize>0;highlighted:true;onClicked:{if(s.phase==="paused")backend.pause();else backend.start(false);gameRoot.forceActiveFocus()}}
 Button {objectName:"playDemo";visible:s.phase!=="paused";text:qsTr("Training");onClicked:{backend.start(true);gameRoot.forceActiveFocus()}}
 Button {visible:s.phase==="over"&&!s.demo;text:qsTr("View transaction ↗");onClicked:backend.openTransaction()}
 Button {objectName:"returnCamp";text:qsTr("Base Camp");onClicked:{backend.returnToCamp();gameRoot.forceActiveFocus()}}
 }
 Label {visible:s.phase==="ready";text:qsTr("SPACE / ↑ / click · jump     P · pause     F11 · fullscreen");font.pixelSize:10;wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#819a8c"}
 }
 }
 }
 RowLayout {Layout.fillWidth:true
 Rectangle {width:6;height:6;color:s.source==="live"?"#9ecb83":"#d6aa6b"}
 Label {Layout.fillWidth:true;font.pixelSize:11;color:"#93a99a";text:s.source==="live"?qsTr("Live mempool.space · %1 recent transactions buffered").arg(s.poolSize):s.source==="save-error"?qsTr("Could not save progress"):s.source==="offline"?qsTr("Source unavailable · cached transactions / training available"):qsTr("Connecting to mempool.space…");wrapMode:Text.WordWrap}
 Button {visible:s.phase!=="camp";text:qsTr("Pause");enabled:s.phase==="running"||s.phase==="paused";onClicked:backend.pause()}
 Label {visible:s.phase==="camp";text:qsTr("WASD / arrows · move   E · interact");font.pixelSize:10;color:"#c4c3a1"}
 ToolButton {text:"?";onClicked:{help=!help;if(s.phase==="running")backend.pause()}}
 }
 }
 Rectangle {anchors.fill:parent;color:"#f0101d2b";visible:help
 ColumnLayout {anchors.centerIn:parent;width:Math.min(parent.width-60,520);spacing:18
 Label {text:qsTr("A small field guide");font.pixelSize:26;color:"#e8dfb5"}
 Label {text:qsTr("CAMP: WASD / arrows / click to move. E to interact.\nRUN: SPACE / ↑ / click to jump; hold for height.\nP / Esc: pause. F11: fullscreen. Q: quit.\n\nReturn home from the pause or results screen. Training earns no saved coins or live records.\n\nSkills and affordable upgrades will come later; rare skins will be cosmetic goals. Coins are game points, not bitcoin.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b9c8b6"}
 Button {text:qsTr("Back");onClicked:help=false}
 }
 }
 }
}
