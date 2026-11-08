import "PixelArt.js" as PixelArt
import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
ApplicationWindow {
 id:win
 width:1152;height:760;minimumWidth:540;minimumHeight:480
 visible:true;title:"WondersLand [WL]";color:"#0c1723"
 Material.theme:Material.Dark;Material.accent:theme.accent;Material.roundedScale:theme.radius
 property var s:backend.state
 property bool help:false
 property bool settingsOpen:false
 property bool resetting:false
 property bool typing:activeFocusItem&&activeFocusItem.cursorPosition!==undefined
 property color sky:s.region.sky
 property color soil:s.region.soil
 property color foliage:s.region.foliage
 Behavior on sky {ColorAnimation {duration:2200}}
 Behavior on soil {ColorAnimation {duration:2200}}
 Behavior on foliage {ColorAnimation {duration:2200}}
 property var menuRoot:resetting?resetPanel:settingsOpen?settingsPanel:help?helpPanel:s.phase==="creation"?creator:s.phase==="select"?skillPanel:s.phase==="over"||s.phase==="paused"?resultPanel:s.phase==="waiting"||s.phase==="connecting"?waitPanel:s.phase==="camp"&&s.station!==""?stationPanel:s.phase==="camp"&&s.announcement!==""?announcementPanel:settingsButton.activeFocus||helpButton.activeFocus?headerBar:null
 function trText(value){var lang=translator.language;return translator.text(value)}
 function className(){for(var c of s.config.classes)if(c.id===s.stats.class)return trText(c.name);return ""}
 function focusGame(){gameRoot.forceActiveFocus()}
 function openSettings(){backend.stopMovement();if(s.phase==="running"||s.phase==="waiting"||s.phase==="countdown")backend.pause();settingsOpen=true}
 function back(){
  if(typing){activeFocusItem.nextItemInFocusChain().forceActiveFocus();return;}
  if(resetting)resetting=false;
  else if(settingsOpen)settingsOpen=false;
  else if(help)help=false;
  else if(s.phase==="camp"&&s.station!=="")backend.closeStation();
  else if(s.phase==="camp"&&s.announcement!=="")backend.dismissAnnouncement();
  else if(s.phase==="select"||s.phase==="over"||s.phase==="connecting"||s.phase==="waiting")backend.returnToCamp();
  else backend.pause();
  if(!menuRoot)focusGame();
 }
 function skillDescription(offer){var effects=offer.effects||[];var value=effects[(offer.nextRank||1)-1]||0;return offer.id==="leap"?qsTr("Ordinary jump +%1%, capped at 110 px").arg(Math.round(value*100)):offer.id==="magnet"?qsTr("Collection range +%1%").arg(Math.round(value*100)):offer.id==="aircoins"?qsTr("Airborne coin bonus +%1%").arg(Math.round(value*100)):offer.id==="double"?qsTr("One extra jump, shared aerial limit 170 px"):offer.id==="glider"?qsTr("Glide up to %1 s per jump").arg(Number(value).toLocaleString(Qt.locale(),'f',1)):offer.id==="shield"?qsTr("One rescue, at most two granted per run"):qsTr("Jetpack: 3 s fuel for the whole run, hold F")}
 MenuNavigation {id:navigation;scope:win.menuRoot;window:win}
 onMenuRootChanged:{backend.stopMovement();if(!menuRoot)Qt.callLater(focusGame)}
 Shortcut {sequence:"E";context:Qt.ApplicationShortcut;autoRepeat:false;enabled:!win.menuRoot&&!typing;onActivated:{if(activeFocusItem&&activeFocusItem.menuChoice)activeFocusItem.clicked();else if(s.phase==="camp")backend.interact()}}
 Shortcut {sequence:"Escape";context:Qt.ApplicationShortcut;autoRepeat:false;onActivated:win.back()}
 Shortcut {sequence:"F10";enabled:!typing;onActivated:win.openSettings()}
 Shortcut {sequence:"F11";onActivated:win.visibility=win.visibility===Window.FullScreen?Window.Windowed:Window.FullScreen}
 Shortcut {sequence:"P";enabled:!win.menuRoot&&!typing;onActivated:backend.pause()}
 Shortcut {sequence:"B";enabled:!typing&&!settingsOpen&&!resetting&&s.phase!=="creation";onActivated:backend.returnToCamp()}
 Shortcut {sequence:"?";enabled:!typing;onActivated:{backend.stopMovement();if(s.phase==="running")backend.pause();help=!help}}
 onActiveChanged:backend.setActive(active)
 Component.onCompleted:Qt.callLater(function(){if(menuRoot)navigation.focusFirst();else focusGame()})
 Connections {target:backend;function onChanged(){scene.requestPaint()}}
 Connections {target:translator;function onChanged(){scene.requestPaint()}}
 onSkyChanged:scene.requestPaint()
 onSoilChanged:scene.requestPaint()
 onFoliageChanged:scene.requestPaint()
 Item {
 id:gameRoot;objectName:"gameRoot";anchors.fill:parent;focus:true
 function direction(key){return key===Qt.Key_A||key===Qt.Key_Left?"left":key===Qt.Key_D||key===Qt.Key_Right?"right":key===Qt.Key_W||key===Qt.Key_Up?"up":key===Qt.Key_S||key===Qt.Key_Down?"down":""}
 Keys.onPressed:event=>{
  if(event.isAutoRepeat||typing||win.menuRoot)return;
  var d=direction(event.key);
  if(s.phase==="camp"&&d){backend.setMovement(d,true);event.accepted=true;}
  else if(s.phase==="running"&&(event.key===Qt.Key_Space||event.key===Qt.Key_Up||event.key===Qt.Key_W)){backend.jump();event.accepted=true;}
  else if(s.phase==="running"&&event.key===Qt.Key_F){backend.fly(true);event.accepted=true;}
 }
 Keys.onReleased:event=>{if(event.isAutoRepeat)return;var d=direction(event.key);if(d)backend.setMovement(d,false);if(event.key===Qt.Key_F)backend.fly(false);if(event.key===Qt.Key_Space||event.key===Qt.Key_Up||event.key===Qt.Key_W)backend.releaseJump()}
 ColumnLayout {anchors.fill:parent;anchors.margins:8;spacing:6
 RowLayout {id:headerBar;Layout.fillWidth:true;spacing:12
 Label {text:"WondersLand [WL]";font.pixelSize:19;font.bold:true;color:"#e6dfb8"}
 Item {Layout.fillWidth:true}
 Label {text:qsTr("Best: %1 m").arg(s.best);color:"#abbba4";visible:win.width>650}
 Label {objectName:"coinBalance";text:(translator.language,translator.coins(s.wallet));font.pixelSize:20;font.bold:true;color:"#ffdf87"}
 NavButton {id:settingsButton;objectName:"settings";text:qsTr("Settings");onClicked:win.openSettings()}
 NavButton {id:helpButton;text:"?";implicitWidth:42;onClicked:{backend.stopMovement();if(s.phase==="running")backend.pause();help=!help}}
 }
 Item {id:playArea;Layout.fillWidth:true;Layout.fillHeight:true;clip:true
 // One uniform nearest-neighbour camera scale fills the available rectangle.
 // Physics always stays in the 640×360 world; menus are laid out in screen pixels.
 Item {id:viewport;objectName:"viewport";anchors.centerIn:parent;width:640;height:360;scale:Math.min(parent.width/640,parent.height/360)
 Canvas {
 id:scene;anchors.fill:parent;renderTarget:Canvas.Image;smooth:false;visible:s.phase!=="camp"&&s.phase!=="creation"
 onPaint:{
 var c=getContext('2d');c.reset();c.scale(width/640,height/360);c.imageSmoothingEnabled=false;
 var d=s.distance*10,t=s.animation,ground=284;
 function rect(x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)}
 function hill(offset,base,col){for(var x=0;x<=640;x+=8){var y=Math.round(base+Math.sin((x+offset)*.012)*18+Math.sin((x+offset)*.028)*9);rect(x,y,8,ground-y,col)}}
 rect(0,0,640,360,win.sky);
 for(var i=0;i<65;i++){var sx=(i*149.3)%640,sy=(i*i*17.3)%183;rect(sx,sy,i%7===0?2:1,1,i%3?"#425e70":"#b6c7b2")}
 rect(542,38,23,23,"#e3d7a1");rect(535,32,19,22,win.sky);
 hill(d*.12,224,Qt.darker(win.sky,1.1));hill(d*.25,247,Qt.lighter(win.foliage,.65));
 for(i=0;i<s.regionIndex*5;i++)rect((i*137-d*.2+64000)%640,190+(i*29)%80,3,3,win.foliage);
 for(i=0;i<13;i++){var bx=((i*83-d*.4)%760+760)%760-60;c.globalAlpha=.5;PixelArt.plant(c,{x:bx,h:65+(i%3)*14,w:34,type:i%2?"pine":"birch",txid:"ab12"},ground-7);c.globalAlpha=1}
 rect(0,ground,640,76,win.soil);rect(0,ground+12,640,64,"#513c30");
 for(i=0;i<180;i++)rect(((i*37-d)%680+680)%680-20,ground+7+(i*13)%64,3,2,i%3?"#805b42":"#aa7b53");
 // Non-colliding regional roots, mushrooms and spores stay separate from transaction geometry.
 for(i=0;i<s.regionIndex*6;i++){
  var decorX=((i*113-d*.55)%700+700)%700-30;
  if(s.regionIndex>=3){rect(decorX,ground-13,2,13,"#b3a6bd");rect(decorX-6,ground-18,14,6,win.foliage)}
  else {rect(decorX,ground-6,18,3,win.soil);rect(decorX+10,ground-10,4,8,win.foliage)}
 }
 rect(0,ground,640,4,win.foliage);rect(0,ground,640,1,"#a6c779");for(i=0;i<214;i++)rect(i*3,ground-1-(i%3),1,3,"#779e53");
 function plant(p){PixelArt.plant(c,p,ground)}
 var obstacles=s.obstacles||[];for(i=0;i<obstacles.length;i++)plant(obstacles[i]);
 var coins=s.coins||[];for(i=0;i<coins.length;i++){var coin=coins[i];if(!coin.taken){rect(coin.x,ground-coin.y,7,9,"#d9a94f");rect(coin.x+2,ground-coin.y+2,2,5,"#ffe6a0")}}
 var pose=s.phase==="over"?"hit":s.y>0?"jump":s.landing>0?"land":s.phase==="running"?"run":"idle";
 PixelArt.character(c,96,ground-s.y-40,s.profile.character,Math.floor(t*10),s.profile.hands,s.profile.boots,pose);
 if(s.invulnerable>0){c.strokeStyle="#bfe9d4";c.strokeRect(93,ground-s.y-43,30,46)}
 if(s.flying.id&&!s.flying.blocked){var fl=s.flying;c.fillStyle=fl.age<0?"#b8a4d5":"#e4d28b";c.fillRect(Math.round(fl.x),ground-fl.y-7,10,10);c.font="9px monospace";c.fillText(win.trText(fl.name),Math.max(180,fl.x),ground-100)}
 if(s.obstacles.some(p=>p.h>ground)){c.fillStyle="#e7ba85";c.font="10px monospace";c.fillText(qsTr("Tall canopy continues above the view"),210,75)}
 if(s.phase==="over"){c.strokeStyle="#e2a27b";c.lineWidth=2;var hit=s.hit;c.strokeRect(hit.x-4,ground-hit.h-4,hit.w+8,hit.h+8)}
 }
 }

 MouseArea {anchors.fill:parent;enabled:s.phase==="running"&&!win.menuRoot;onPressed:{win.focusGame();backend.jump()}onReleased:backend.releaseJump()}
 CampView {anchors.fill:parent;visible:s.phase==="camp";enabled:win.menuRoot===null;onFocusGame:win.focusGame()}
 Column {visible:s.phase!=="camp"&&s.phase!=="creation";anchors.left:parent.left;anchors.top:parent.top;anchors.margins:10;spacing:3
 Label {text:qsTr("%1 m").arg(s.score)+" · "+win.trText(s.region.name);font.pixelSize:18;color:"#eee1ae"}
 Label {text:qsTr("%1 s · %2 · rescues: %3").arg(Math.floor(s.time)).arg(translator.coins(s.earned)).arg(s.rescues);font.pixelSize:11;color:"#e1c47d"}
 }
 Label {visible:s.phase!=="camp"&&s.phase!=="creation";anchors.right:parent.right;anchors.top:parent.top;anchors.margins:10;text:s.demo?qsTr("TRAINING · NO REWARDS"):s.replay?qsTr("RECORDED DATA · NOT LIVE"):qsTr("REAL TRANSACTIONS");font.pixelSize:9;color:"#b2c8a4"}
 Row {visible:s.phase!=="camp"&&s.phase!=="creation";anchors.left:parent.left;anchors.bottom:parent.bottom;anchors.margins:6;spacing:3
 Repeater {model:s.skillHud.filter(sk=>sk.rank>0)
 Rectangle {required property var modelData;width:98;height:25;color:"#e0192d31";border.color:"#526655"
 Label {anchors.centerIn:parent;text:win.trText(modelData.name)+" "+modelData.rank;font.pixelSize:8;color:"#d7d5af"}
 }
 }
 }
 } // End world camera. All following menus use screen coordinates.
 Label {visible:s.skillHud.some(sk=>sk.id==="jetpack");anchors.right:parent.right;anchors.bottom:parent.bottom;anchors.margins:8;text:qsTr("Fuel %1 s · hold F").arg(Number(s.fuel).toLocaleString(Qt.locale(),'f',1));color:"#d4cb8c"}
 CharacterView {id:creator;anchors.fill:parent;anchors.margins:12;visible:s.phase==="creation";onFocusGame:win.focusGame()}
 Rectangle {anchors.centerIn:parent;width:Math.min(parent.width-16,620);height:Math.min(parent.height-12,490);color:"#16292f";border.color:"#859378";visible:s.phase==="camp"&&s.station!==""
 StationPanel {id:stationPanel;anchors.fill:parent;anchors.margins:16;onFocusGame:win.focusGame()}
 }
 Rectangle {anchors.centerIn:parent;width:Math.min(parent.width-16,620);height:Math.min(parent.height-12,skillContent.implicitHeight+36);color:"#16292f";border.color:"#9c9972";visible:s.phase==="select"
 ScrollView {id:skillPanel;anchors.fill:parent;anchors.margins:16;clip:true;contentWidth:availableWidth
 ColumnLayout {id:skillContent;width:parent.width;spacing:12
 Label {text:qsTr("Choose your starting skill");font.pixelSize:24;color:"#e4d3a0";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Repeater {model:s.choices
 NavButton {required property int index;required property var modelData;objectName:"skill"+index;Layout.fillWidth:true;text:win.trText(modelData.name)+"\n"+win.skillDescription(modelData);onClicked:backend.chooseSkill(index)}
 }
 Label {text:qsTr("WASD / arrows · select   E · confirm   Esc · camp");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#a9bba6"}
 }
 }
 }
 Rectangle {anchors.centerIn:parent;width:Math.min(parent.width-16,520);height:Math.min(parent.height-12,210);color:"#16282c";visible:s.phase==="waiting"||s.phase==="connecting"||s.phase==="countdown"
 ColumnLayout {id:waitPanel;anchors.fill:parent;anchors.margins:20
 ColumnLayout {id:waitContent;Layout.fillWidth:true
 Label {text:s.phase==="connecting"?qsTr("Connecting to the forest…"):s.phase==="waiting"?qsTr("Waiting for real transactions…"):qsTr("Continue in %1").arg(Math.ceil(s.countdown));font.pixelSize:20;color:"#e5d4a6";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Label {text:qsTr("Expedition time is paused.");color:"#adc0a9"}
 NavButton {text:qsTr("Base Camp");Layout.fillWidth:true;onClicked:backend.returnToCamp()}
 }
 }
 }
 Rectangle {anchors.centerIn:parent;width:Math.min(parent.width-16,580);height:Math.min(parent.height-12,resultContent.implicitHeight+36);color:"#14252d";border.color:"#59705a";visible:s.phase==="over"||s.phase==="paused"
 ScrollView {id:resultPanel;anchors.fill:parent;anchors.margins:16;clip:true;contentWidth:availableWidth
 ColumnLayout {id:resultContent;width:parent.width;spacing:10
 Label {objectName:"stateTitle";text:s.phase==="over"?qsTr("Your run ends here."):qsTr("Take a breath.");font.pixelSize:25;wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#e7dfb7"}
 Label {text:qsTr("%1 m · %2").arg(s.score).arg(translator.coins(s.earned));color:"#c6c6a7";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Label {visible:s.phase==="over";text:qsTr("You hit: %1").arg(win.trText(s.hit.type||""))+" · "+(s.hit.h||0)+" px";color:"#e4c681";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Label {visible:s.phase==="over";text:qsTr("Output total: %1 BTC").arg((translator.language,translator.btc(s.hit.btc||"0.00000000")))+"\n"+(translator.language,translator.integer(s.hit.sats||"0"))+" satoshi";color:"#d8d7bd";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Label {visible:s.phase==="over"&&!s.demo;text:s.hit.txid||"";font.family:"monospace";font.pixelSize:11;color:"#9bad9c";Layout.fillWidth:true;wrapMode:Text.WrapAnywhere}
 Label {visible:s.phase==="over";text:s.demo?qsTr("Training · coins and score are not saved"):s.hit.status==="confirmed"?qsTr("Confirmed in a block"):s.hit.status==="pending"?qsTr("Still in the mempool"):s.hit.status==="checking"?qsTr("Observed in mempool · checking current status"):qsTr("Observed in mempool · current status unverified");color:"#93ab9d";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 NavButton {objectName:"playLive";text:s.phase==="paused"?qsTr("Continue"):qsTr("Next run");Layout.fillWidth:true;onClicked:{if(s.phase==="paused")backend.pause();else backend.start(s.demo)}}
 NavButton {objectName:"returnCamp";text:qsTr("Base Camp");Layout.fillWidth:true;onClicked:backend.returnToCamp()}
 NavButton {visible:s.phase==="over"&&!s.demo;text:qsTr("View transaction");Layout.fillWidth:true;onClicked:backend.openTransaction()}
 }
 }
 }
 Rectangle {anchors.centerIn:parent;width:Math.min(parent.width-16,500);height:180;color:"#182e2d";border.color:"#ad9c68";visible:s.phase==="camp"&&s.station===""&&s.announcement!==""
 ColumnLayout {id:announcementPanel;anchors.fill:parent;anchors.margins:20
 ColumnLayout {id:announcementContent;Layout.fillWidth:true
 Label {text:qsTr("New discovery: %1").arg(win.trText(s.announcement));wrapMode:Text.WordWrap;Layout.fillWidth:true;font.pixelSize:23;color:"#ead59e"}
 NavButton {text:qsTr("Continue");Layout.fillWidth:true;onClicked:backend.dismissAnnouncement()}
 }
 }
 }
 }
 RowLayout {Layout.fillWidth:true
 Label {Layout.fillWidth:true;text:s.profile.error?win.trText(s.profile.error):s.source==="live"?qsTr("Live: recent transactions · %1 available").arg(s.poolSize):s.source==="replay"?qsTr("Recorded data · no permanent rewards"):s.source==="offline"?qsTr("Source unavailable · waiting for connection"):qsTr("Connecting to mempool.space…");wrapMode:Text.WordWrap;font.pixelSize:11;color:"#93a99a"}
 Label {visible:win.width>800;text:qsTr("WASD / arrows · E · Esc");font.pixelSize:11;color:"#b2bba0"}
 }
 }
 Rectangle {anchors.fill:parent;color:"#101d2b";visible:help||settingsOpen||resetting
 MouseArea {anchors.fill:parent} // Modal sheets consume clicks before the underlying scene.
 ScrollView {anchors.centerIn:parent;width:Math.min(parent.width-32,580);height:Math.min(parent.height-24,600);clip:true;contentWidth:availableWidth
 ColumnLayout {width:parent.width;spacing:16
 ColumnLayout {id:settingsPanel;visible:settingsOpen&&!resetting;Layout.fillWidth:true
 Label {text:qsTr("Settings");font.pixelSize:28;color:"#e9d8a8"}
 Label {text:qsTr("Language");font.pixelSize:20;color:"#d2c7a3"}
 NavButton {text:"English";Layout.fillWidth:true;highlighted:translator.language==="en";onClicked:translator.setLanguage("en")}
 NavButton {text:"Čeština";Layout.fillWidth:true;highlighted:translator.language==="cs";onClicked:translator.setLanguage("cs")}
 NavButton {text:qsTr("Reset character and all progress?");Layout.fillWidth:true;onClicked:resetting=true}
 NavButton {text:qsTr("Back");Layout.fillWidth:true;onClicked:{settingsOpen=false;if(!menuRoot)win.focusGame()}}
 }
 ColumnLayout {id:resetPanel;visible:resetting;Layout.fillWidth:true
 Label {text:qsTr("This erases the character, coins, equipment, research and records.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#e3b99a"}
 NavButton {text:qsTr("Cancel");Layout.fillWidth:true;onClicked:resetting=false}
 NavButton {text:qsTr("Reset progress");Layout.fillWidth:true;onClicked:{backend.resetCharacter(true);resetting=false;settingsOpen=false}}
 }
 ColumnLayout {id:helpPanel;visible:help&&!settingsOpen&&!resetting;Layout.fillWidth:true
 Label {text:qsTr("A small field guide");font.pixelSize:26;color:"#e8dfb5"}
 Label {text:qsTr("MENUS: WASD or arrows to select, E to confirm, Esc to go back. Mouse also works.\nCAMP: WASD or arrows to walk, E at the portal to choose a skill and start from 0 m.\nRUN: Space / W / Up or click to jump; hold for height. F operates an acquired jetpack. P / Esc pauses. B returns to camp. F11 changes fullscreen.\n\nExplore one continuous forest. Systems unlock through live expeditions and distance. Training grants no permanent rewards. Coins are game points, not bitcoin.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b9c8b6"}
 NavButton {text:qsTr("Back");Layout.fillWidth:true;onClicked:{help=false;if(!menuRoot)win.focusGame()}}
 }
 }
 }
 }
 }
}
