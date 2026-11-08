import "PixelArt.js" as PixelArt
import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
ApplicationWindow {
 id: win
 width: 1152; height: 760; minimumWidth: 720; minimumHeight: 600
 visible: true; title: "WondersLand [WL]"
 color: "#0c1723"
 Material.theme: Material.Dark; Material.accent: theme.accent; Material.roundedScale: theme.radius
 property var s: backend.state
 Dialog {id:resetDialog;title:qsTr("Reset character and all progress?");anchors.centerIn:Overlay.overlay;modal:true;standardButtons:Dialog.Yes|Dialog.Cancel;onAccepted:{backend.resetCharacter(true);gameRoot.forceActiveFocus()}
 Label {text:qsTr("This erases the character, coins, equipment, research and records.");wrapMode:Text.WordWrap;width:Math.min(420,win.width-80)}
 }
 property bool help: false
 onHelpChanged:if(help)backend.stopMovement()
 property bool typing:s.phase==="creation"||(activeFocusItem&&activeFocusItem.cursorPosition!==undefined)
 property bool gameKeys:!typing&&!resetDialog.opened
 property int selectedSkill:0
 function className(){for(var c of s.config.classes)if(c.id===s.stats.class)return qsTr(c.name);return ""}
 function skillDescription(offer){var effects=offer.effects||[];var value=effects[(offer.nextRank||1)-1]||0;return offer.id==="leap"?qsTr("Ordinary jump +%1%, capped at 110 px").arg(Math.round(value*100)):offer.id==="magnet"?qsTr("Collection range +%1%").arg(Math.round(value*100)):offer.id==="aircoins"?qsTr("Airborne coin bonus +%1%").arg(Math.round(value*100)):offer.id==="double"?qsTr("One extra jump, shared aerial limit 170 px"):offer.id==="glider"?qsTr("Glide up to %1 s per jump").arg(value):offer.id==="shield"?qsTr("One rescue, at most two granted per run"):qsTr("Jetpack: 3 s fuel for the whole run, hold F")}

 function action(){if(help){help=false;gameRoot.forceActiveFocus();return;}if(s.phase==="select"){backend.chooseSkill(selectedSkill);gameRoot.forceActiveFocus();return;}if(s.phase==="camp"){backend.interact();return;}if(s.phase === "ready" || s.phase === "over")backend.start(s.demo);else if(s.phase === "paused")backend.pause();else backend.jump()}
 Shortcut {enabled:gameKeys;sequence:"E";context:Qt.ApplicationShortcut;autoRepeat:false;onActivated:{win.action();gameRoot.forceActiveFocus()}}
 Shortcut {sequence:"B";context:Qt.ApplicationShortcut;enabled:gameKeys&&s.phase!=="camp"&&!help&&s.phase!=="creation";onActivated:{backend.returnToCamp();gameRoot.forceActiveFocus()}}
 Shortcut {sequence:"R";context:Qt.ApplicationShortcut;enabled:gameKeys&&s.phase==="over"&&!help;onActivated:{backend.start(s.demo);gameRoot.forceActiveFocus()}}
 Shortcut {enabled:gameKeys;sequence:"Q";onActivated:win.close()}
 Shortcut {enabled:gameKeys;sequence:"?";onActivated:{help=!help;if(s.phase==="running"||s.phase==="countdown"||s.phase==="waiting")backend.pause()}}
 Shortcut {enabled:gameKeys&&!help;sequence:"P";onActivated:backend.pause()}
 Shortcut {enabled:gameKeys;sequence:"Escape";context:Qt.ApplicationShortcut;onActivated:{if(help)help=false;else if(s.phase==="select")backend.returnToCamp();else if(s.phase==="camp")backend.closeStation();else backend.pause();gameRoot.forceActiveFocus()}}
 Shortcut {enabled:!resetDialog.opened;sequence:"F11";onActivated:win.visibility=win.visibility===Window.FullScreen?Window.Windowed:Window.FullScreen}
 onActiveChanged:backend.setActive(active)
 Component.onCompleted:gameRoot.forceActiveFocus()
 Connections {target:backend;function onChanged(){scene.requestPaint();if(s.phase==="running"&&!help&&!resetDialog.opened)gameRoot.forceActiveFocus()}}
 Item {
 id: gameRoot
 objectName:"gameRoot"
 anchors.fill:parent;LayoutMirroring.enabled:Qt.application.layoutDirection===Qt.RightToLeft;LayoutMirroring.childrenInherit:true
 focus:true
 function direction(key){return key===Qt.Key_A||key===Qt.Key_Left?"left":key===Qt.Key_D||key===Qt.Key_Right?"right":key===Qt.Key_W||key===Qt.Key_Up?"up":key===Qt.Key_S||key===Qt.Key_Down?"down":""}
 Keys.onPressed: event=>{
  if(event.isAutoRepeat||typing||help)return;
  if(s.phase==="select"){if(event.key>=Qt.Key_1&&event.key<=Qt.Key_3){backend.chooseSkill(event.key-Qt.Key_1);event.accepted=true;}else if(event.key===Qt.Key_Left||event.key===Qt.Key_Right){selectedSkill=(selectedSkill+(event.key===Qt.Key_Right?1:2))%3;event.accepted=true;}else if(event.key===Qt.Key_Space||event.key===Qt.Key_Return){win.action();event.accepted=true;}return;}
  if(event.key===Qt.Key_F){backend.fly(true);event.accepted=true;return;}
  if(s.phase==="camp"){
   var d=direction(event.key);if(d){backend.setMovement(d,true);event.accepted=true}
   else if(event.key===Qt.Key_Space){win.action();event.accepted=true}
  }else if(event.key===Qt.Key_Space||event.key===Qt.Key_Up){win.action();event.accepted=true}
 }
 Keys.onReleased: event=>{if(event.isAutoRepeat||typing||help)return;if(event.key===Qt.Key_F)backend.fly(false);var d=direction(event.key);if(d)backend.setMovement(d,false);if(event.key===Qt.Key_Space||event.key===Qt.Key_Up)backend.releaseJump()}
 ColumnLayout {
 anchors.fill:parent;anchors.margins:24;spacing:16
 RowLayout {
 Layout.fillWidth:true
 ColumnLayout {spacing:2
 Label {text:"WONDERSLAND [WL]";font.pixelSize:22;font.bold:true;font.letterSpacing:3;color:"#e6dfb8"}
 Label {text:qsTr("BITCOIN FOREST · EXPEDITIONS / 0.3");font.pixelSize:10;font.letterSpacing:2;color:"#769888"}
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
 Label {objectName:"coinBalance";text:(translator.language,Number(s.wallet).toLocaleString(Qt.locale(),'f',0));font.pixelSize:26;font.bold:true;font.family:"monospace";color:"#ffdf87";Layout.fillWidth:true;elide:Text.ElideRight}
 Label {text:s.phase!=="camp"&&s.replay?qsTr("Replay · no saved rewards"):s.phase!=="camp"&&s.demo?qsTr("Training · not saved"):(s.phase==="running"||s.phase==="paused")?qsTr("+ %1 this expedition").arg(s.earned):qsTr("Saved supplies");font.pixelSize:10;color:"#c8c0a0";Layout.fillWidth:true;elide:Text.ElideRight}
 }
 }
 }
 }
 Rectangle {
 Layout.fillWidth:true;Layout.fillHeight:true;color:"#101d2b";border.color:"#30483e";radius:theme.radius
 Item {
 id:viewport;anchors.centerIn:parent;width:640;height:360;scale:Math.max(1,Math.floor(Math.min(parent.width/640,parent.height/360)))
 Canvas {
 id:scene;anchors.fill:parent;renderTarget:Canvas.Image;smooth:false;visible:s.phase!=="camp"&&s.phase!=="creation"
 onPaint:{
 var c=getContext('2d');c.reset();c.scale(width/640,height/360);c.imageSmoothingEnabled=false;
 var d=s.distance*10,t=s.animation,ground=284;
 function rect(x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)}
 function hill(offset,base,col){for(var x=0;x<=640;x+=8){var y=Math.round(base+Math.sin((x+offset)*.012)*18+Math.sin((x+offset)*.028)*9);rect(x,y,8,ground-y,col)}}
 rect(0,0,640,360,"#101d2b");
 for(var i=0;i<65;i++){var sx=(i*149.3)%640,sy=(i*i*17.3)%183;rect(sx,sy,i%7===0?2:1,1,i%3?"#425e70":"#b6c7b2")}
 rect(542,38,23,23,"#e3d7a1");rect(535,32,19,22,"#101d2b");
 hill(d*.12,224,"#182f37");hill(d*.25,247,"#254039");
 for(i=0;i<13;i++){var bx=((i*83-d*.4)%760+760)%760-60;c.globalAlpha=.5;PixelArt.plant(c,{x:bx,h:65+(i%3)*14,w:34,type:i%2?"pine":"birch",txid:"ab12"},ground-7);c.globalAlpha=1}
 rect(0,ground,640,76,"#77523c");rect(0,ground+12,640,64,"#513c30");
 for(i=0;i<180;i++)rect(((i*37-d)%680+680)%680-20,ground+7+(i*13)%64,3,2,i%3?"#805b42":"#aa7b53");
 rect(0,ground,640,4,"#557f48");rect(0,ground,640,1,"#a6c779");for(i=0;i<214;i++)rect(i*3,ground-1-(i%3),1,3,"#779e53");
 function plant(p){PixelArt.plant(c,p,ground)}
 var obstacles=s.obstacles||[];for(i=0;i<obstacles.length;i++)plant(obstacles[i]);
 var coins=s.coins||[];for(i=0;i<coins.length;i++){var coin=coins[i];if(!coin.taken){rect(coin.x,ground-coin.y,7,9,"#d9a94f");rect(coin.x+2,ground-coin.y+2,2,5,"#ffe6a0")}}
 var pose=s.phase==="over"?"hit":s.y>0?"jump":s.landing>0?"land":s.phase==="running"?"run":"idle";
 PixelArt.character(c,96,ground-s.y-40,s.profile.character,Math.floor(t*10),s.profile.hands,s.profile.boots,pose);
 if(s.invulnerable>0){c.strokeStyle="#bfe9d4";c.strokeRect(93,ground-s.y-43,30,46)}
 if(s.flying.id&&!s.flying.blocked){var fl=s.flying;c.fillStyle=fl.age<0?"#b8a4d5":"#e4d28b";c.fillRect(Math.round(fl.x),ground-fl.y-7,10,10);c.font="9px monospace";c.fillText(qsTr(fl.name),Math.max(180,fl.x),ground-100)}
 if(s.obstacles.some(p=>p.h>ground)){c.fillStyle="#e7ba85";c.font="10px monospace";c.fillText(qsTr("Tall canopy continues above the view"),210,75)}
 if(s.phase==="over"){c.strokeStyle="#e2a27b";c.lineWidth=2;var hit=s.hit;c.strokeRect(hit.x-4,ground-hit.h-4,hit.w+8,hit.h+8)}
 }
 }
 MouseArea {anchors.fill:parent;enabled:s.phase!=="camp";onPressed:{gameRoot.forceActiveFocus();win.action()}onReleased:backend.releaseJump()}
 Column {
 visible:s.phase!=="camp"&&s.phase!=="creation"
 anchors.left:parent.left;anchors.top:parent.top;anchors.margins:16;spacing:3
 Label {text:qsTr("%1 m").arg(s.score);font.pixelSize:26;font.bold:true;color:"#e8dfb5"}
 Label {text:qsTr("T%1 · %2 s · %3 coins · %4 rescues").arg(s.tier).arg(Math.floor(s.time)).arg(s.earned).arg(s.rescues);color:"#d9b85e";font.pixelSize:12}
 }
 Row {visible:s.phase!=="camp"&&s.phase!=="creation";anchors.left:parent.left;anchors.bottom:parent.bottom;anchors.margins:8;spacing:4
 Repeater {model:s.skillHud
 Rectangle {required property var modelData;width:98;height:26;color:"#df192d31";border.color:"#526655"
 Label {anchors.centerIn:parent;text:qsTr(modelData.name)+(modelData.rank?" "+modelData.rank:"");font.pixelSize:8;color:"#d7d5af"}
 }
 }
 }
 Label {visible:s.skillHud.some(sk=>sk.id==="jetpack");anchors.right:parent.right;anchors.bottom:parent.bottom;anchors.margins:38;text:qsTr("Fuel %1 s · hold F").arg(s.fuel.toFixed(1));color:"#d4cb8c";font.pixelSize:10}
 CampView {anchors.fill:parent;visible:s.phase==="camp";onFocusGame:gameRoot.forceActiveFocus()}
 Label {visible:s.phase!=="camp"&&s.phase!=="creation";anchors.right:parent.right;anchors.top:parent.top;anchors.margins:16;text:s.demo?qsTr("TRAINING · SAMPLE PLANTS"):s.replay?qsTr("RECORDED DATA · NOT LIVE"):qsTr("REAL TRANSACTIONS");font.pixelSize:10;font.letterSpacing:1;color:s.demo?"#e0b376":"#a2c39c"}
 }
 CharacterView {anchors.fill:parent;anchors.margins:12;visible:s.phase==="creation";onFocusGame:gameRoot.forceActiveFocus()}
 Rectangle {anchors.centerIn:parent;width:Math.min(parent.width-28,580);height:skillContent.implicitHeight+30;color:"#f016292f";border.color:"#9c9972";visible:s.phase==="select"
 ColumnLayout {id:skillContent;anchors.centerIn:parent;width:parent.width-30;spacing:12
 Label {text:qsTr("Choose your starting skill");font.pixelSize:24;color:"#e4d3a0";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Repeater {model:s.choices
 Button {required property int index;required property var modelData;Layout.fillWidth:true;text:(index+1)+" · "+qsTr(modelData.name)+" · "+qsTr(modelData.rarity)+" → "+modelData.nextRank+"\n"+win.skillDescription(modelData);highlighted:index===selectedSkill;onClicked:{backend.chooseSkill(index);gameRoot.forceActiveFocus()}}
 }
 Label {text:qsTr("1 / 2 / 3 · choose   arrows · select   E · confirm   Esc · camp");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#a9bba6"}
 }
 }
 Rectangle {anchors.centerIn:parent;width:Math.min(parent.width-30,450);height:110;color:"#ef16282c";visible:s.phase==="waiting"||s.phase==="countdown"
 Column {anchors.centerIn:parent;spacing:10
 Label {text:s.phase==="waiting"?qsTr("Waiting for real transactions…"):qsTr("Continue in %1").arg(Math.ceil(s.countdown));font.pixelSize:20;color:"#e5d4a6"}
 Label {text:qsTr("Expedition time is paused. B returns to camp.");color:"#adc0a9"}
 }
 }
 Rectangle {
 anchors.centerIn:parent;width:Math.min(parent.width-36,510);height:card.implicitHeight+40;color:"#ed14252d";border.color:"#59705a";radius:theme.radius
 visible:s.phase==="over"||s.phase==="paused"
 ColumnLayout {
 id:card;anchors.centerIn:parent;width:parent.width-40;spacing:12
 Label {objectName:"stateTitle";text:s.phase==="over"?qsTr("Your run ends here."):s.phase==="paused"?qsTr("Take a breath."):qsTr("The mempool is your wilderness.");font.pixelSize:25;font.bold:true;wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#e7dfb7"}
 Label {text:s.phase==="over"?qsTr("%1 m · %2 coins collected").arg(s.score).arg(s.earned):qsTr("Jump over transactions. Hold to jump higher.\nLarge transfers grow into towering trees.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#a8b9ac"}
 Label {visible:s.phase==="over";text:qsTr("You hit: %1").arg(qsTr(s.hit.type||""))+" · "+(s.hit.h||0)+" px";color:"#e4c681";font.pixelSize:17}
 Label {visible:s.phase==="over";text:qsTr("Output total: %1 BTC").arg((s.hit.btc||"0.00000000"));wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#d8d7bd"}
 Label {visible:s.phase==="over";text:(s.newMilestones||[]).join(" · ");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#a5bd9e"}
 Label {visible:s.phase==="over";text:win.className()+" · "+qsTr("T%1 · %2 seconds · %3 satoshi").arg(s.tier).arg(Math.floor(s.time)).arg(s.hit.sats||0);wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b5c3ab"}
 Label {visible:s.phase==="over"&&!s.demo;text:(s.hit.txid||"").slice(0,22)+"…"+(s.hit.txid||"").slice(-12);font.family:"monospace";font.pixelSize:11;color:"#9bad9c";Layout.fillWidth:true;elide:Text.ElideMiddle}
 Label {visible:s.phase==="over";text:s.demo?qsTr("Training · coins and score are not saved"):s.hit.status==="confirmed"?qsTr("Confirmed in a block"):s.hit.status==="pending"?qsTr("Still in the mempool"):s.hit.status==="checking"?qsTr("Observed in mempool · checking current status"):qsTr("Observed in mempool · current status unverified");color:"#93ab9d";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Flow {Layout.fillWidth:true;spacing:8
 Button {objectName:"playLive";text:s.phase==="paused"?qsTr("Continue"):qsTr("Run live");enabled:s.phase==="paused"||s.poolSize>0;highlighted:true;onClicked:{if(s.phase==="paused")backend.pause();else backend.start(false);gameRoot.forceActiveFocus()}}
 Button {objectName:"playDemo";visible:s.phase!=="paused";text:qsTr("Training");onClicked:{backend.start(true);gameRoot.forceActiveFocus()}}
 Button {visible:s.phase==="over"&&!s.demo;text:qsTr("View transaction ↗");onClicked:backend.openTransaction()}
 Button {visible:s.phase==="over"&&!s.demo;text:qsTr("Copy TXID");onClicked:backend.copyTransaction()}
 Button {objectName:"returnCamp";text:qsTr("Base Camp")+" [B]";onClicked:{backend.returnToCamp();gameRoot.forceActiveFocus()}}
 }
 Label {visible:s.phase==="ready";text:qsTr("SPACE / ↑ / click · jump     P · pause     F11 · fullscreen");font.pixelSize:10;wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#819a8c"}
 }
 }
 }
 RowLayout {Layout.fillWidth:true
 Rectangle {width:6;height:6;color:s.source==="live"?"#9ecb83":"#d6aa6b"}
 Label {Layout.fillWidth:true;font.pixelSize:11;color:"#93a99a";text:s.source==="replay"?qsTr("Recorded dataset · seed %1 · rewards disabled").arg(s.seed):s.source==="live"?qsTr("Live: recent transactions · %1 available").arg(s.poolSize):s.source==="save-error"?qsTr("Could not save progress"):s.source==="offline"?qsTr("Source unavailable · cached transactions / training available"):qsTr("Connecting to mempool.space…");wrapMode:Text.WordWrap}
 Label {text:qsTr(s.notice||"");visible:text!=="";Layout.maximumWidth:230;elide:Text.ElideRight;color:"#d8ba80";font.pixelSize:10}
 Button {visible:s.phase!=="camp"&&s.phase!=="creation";text:qsTr("Pause");enabled:s.phase==="running"||s.phase==="paused";onClicked:backend.pause()}
 Label {visible:s.phase==="camp";text:qsTr("WASD / arrows · move   E · open / confirm");font.pixelSize:10;color:"#c4c3a1"}
 ToolButton {objectName:"settings";text:"⚙";onClicked:{if(s.phase==="running"||s.phase==="countdown"||s.phase==="waiting")backend.pause();resetDialog.open()}}
 ToolButton {text:"?";onClicked:{help=!help;if(s.phase==="running"||s.phase==="countdown"||s.phase==="waiting")backend.pause()}}
 }
 }
 Rectangle {anchors.fill:parent;color:"#f0101d2b";visible:help
 ColumnLayout {anchors.centerIn:parent;width:Math.min(parent.width-60,520);spacing:18
 Label {text:qsTr("A small field guide");font.pixelSize:26;color:"#e8dfb5"}
 Label {text:qsTr("CAMP: WASD / arrows / click to move. E to open / confirm. Esc to close.\nRUN: SPACE / ↑ / click to jump; hold for height.\nP / Esc: pause. B: Base Camp. R: retry. F11: fullscreen. Q: quit.\n\nUse Tab / Shift+Tab and Space to choose menu buttons. Training earns no saved coins or live records.\n\nSkills and affordable upgrades will come later; rare skins will be cosmetic goals. Coins are game points, not bitcoin.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b9c8b6"}
 Button {text:qsTr("Back");onClicked:help=false}
 }
 }
 }
}
