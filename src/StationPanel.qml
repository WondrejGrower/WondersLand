import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
Item {
 id:panel
 property var s:backend.state
 property string station:s.station
 signal focusGame()
 implicitHeight:Math.min(content.implicitHeight,410)
 function job(id){for(var j of s.profile.research)if(j.id===id)return j;return null}
 Connections {target:panel.Window.window
 function onActiveFocusItemChanged(){
  var item=panel.Window.window.activeFocusItem;if(!panel.visible||!item)return;
  var node=item;while(node&&node!==content)node=node.parent;if(!node)return;
  var y=item.mapToItem(content,0,0).y;var flick=stationScroll.contentItem;
  if(y<flick.contentY)flick.contentY=Math.max(0,y-8);
  else if(y+item.height>flick.contentY+stationScroll.availableHeight)flick.contentY=y+item.height-stationScroll.availableHeight+8;
 }
 }
 ScrollView {id:stationScroll;anchors.fill:parent;clip:true;contentWidth:availableWidth
 ColumnLayout {id:content;width:parent.width;spacing:12
 Label {text:panel.station==="portal"?qsTr("Choose an expedition"):panel.station==="training"?qsTr("Practice without rewards"):panel.station==="forge"?qsTr("Workshop & crafting"):panel.station==="wardrobe"?qsTr("Equipment"):panel.station==="library"?qsTr("Research garden"):qsTr("Hearth & home");font.pixelSize:23;color:"#e9d8a8";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Label {visible:panel.station==="home"&&(s.profile.legacyBest||0)>0;text:qsTr("Legacy record: %1 m (old balance)").arg(s.profile.legacyBest||0);color:"#a6b09e"}
 Label {visible:panel.station==="home";text:qsTr("Your character and supplies survive ordinary deaths. Return here to change equipment and grow stronger.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b3c5ac"}
 ColumnLayout {visible:panel.station==="portal";Layout.fillWidth:true
 ComboBox {objectName:"tierChoice";Layout.fillWidth:true;model:s.config.tiers.slice(0,s.profile.tier).map((t,i)=>"T"+(i+1)+" · "+qsTr(t.name));currentIndex:s.tier-1;onActivated:backend.setTier(currentIndex+1)}
 Label {text:qsTr("Plant size ×%1 · coins ×%2").arg(s.config.tiers[s.tier-1].size).arg(s.config.tiers[s.tier-1].coins);color:"#d3c590"}
 Label {text:qsTr("Next tier: survive %1 seconds. Large trees may be impossible without a rescue.").arg(s.config.tiers[s.tier-1].unlock);visible:s.tier<6;wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#aebda7"}
 Label {text:qsTr("Live: recent transactions · %1 available").arg(s.poolSize);color:"#b1c695"}
 Button {objectName:"campLive";text:qsTr("Choose starting skill")+" [E]";highlighted:true;enabled:s.poolSize>0;onClicked:{backend.start(false);panel.focusGame()}}
 }
 ColumnLayout {visible:panel.station==="training"
 Label {text:qsTr("Training has sample plants and grants no saved rewards, milestones or tier unlocks.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#bbc5aa"}
 Button {objectName:"campTraining";text:qsTr("Start training")+" [E]";highlighted:true;onClicked:{backend.start(true);panel.focusGame()}}
 }
 ColumnLayout {visible:panel.station==="forge";Layout.fillWidth:true
 Label {visible:s.profile.runs<1;text:qsTr("Complete one live expedition to open the workshop.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#debd7d"}
 Repeater {model:s.profile.branches
 RowLayout {required property var modelData;Layout.fillWidth:true
 ColumnLayout {Layout.fillWidth:true;spacing:2
 Label {text:qsTr(modelData.name)+" · "+modelData.level+" / 50";color:"#e1d8b7"}
 Label {text:qsTr("Effect %1 → %2").arg((modelData.bonus*(modelData.id==="agility"?1000:100)).toFixed(2)).arg((modelData.nextBonus*(modelData.id==="agility"?1000:100)).toFixed(2))+(modelData.id==="agility"?" ms":" %");font.pixelSize:10;color:"#9eb59d"}
 }
 Button {text:modelData.price<0?qsTr("Max"):qsTr("Buy · %1").arg(modelData.price);enabled:s.profile.runs>0&&modelData.price>=0&&s.wallet>=modelData.price;onClicked:backend.buy(modelData.id)}
 }
 }
 Label {text:qsTr("Diamond equipment");font.pixelSize:17;color:"#d3c38d"}
 Repeater {model:s.config.items
 RowLayout {required property var modelData;Layout.fillWidth:true
 Label {text:qsTr(modelData.name);Layout.fillWidth:true;color:"#b9d8d3"}
 Button {text:s.profile.owned.indexOf(modelData.id)>=0?qsTr("Owned"):qsTr("Craft · %1").arg(modelData.cost);enabled:s.profile.runs>0&&s.profile.owned.indexOf(modelData.id)<0&&s.wallet>=modelData.cost&&(modelData.id!=="boots"||s.profile.milestones.indexOf("T2:120")>=0);onClicked:backend.craft(modelData.id)}
 }
 }
 Label {text:qsTr("Boots recipe: 120 s in T2. Hands +10% magnet; boots +5% jump; both grant one rescue.");wrapMode:Text.WordWrap;Layout.fillWidth:true;font.pixelSize:11;color:"#a9bba6"}
 }
 ColumnLayout {visible:panel.station==="wardrobe";Layout.fillWidth:true
 Label {text:qsTr("Equipment affects your build. Future skins remain cosmetic.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b7c6ad"}
 Repeater {model:s.config.items
 Button {required property var modelData;text:qsTr(modelData.name)+" · "+(s.profile[modelData.id]?qsTr("Equipped"):qsTr("Equip"));highlighted:s.profile[modelData.id]===true;enabled:s.profile.owned.indexOf(modelData.id)>=0;onClicked:backend.equip(modelData.id)}
 }
 }
 ColumnLayout {visible:panel.station==="library";Layout.fillWidth:true
 Label {text:qsTr("Research slots: %1 · seeds: %2").arg(s.profile.researchSlots).arg(s.profile.seeds);color:"#d6c28b"}
 Label {text:qsTr("Unlock research at 60 s in T1. Timers continue while the application is closed.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#aabfa8"}
 Repeater {model:s.config.research
 ColumnLayout {required property var modelData;Layout.fillWidth:true;spacing:4
 Label {text:qsTr(modelData.name);color:"#e5d8b5"}
 Label {text:modelData.cost+" "+qsTr("coins")+" + "+modelData.seeds+" "+qsTr("seeds")+" · "+(modelData.seconds/60)+" min";font.pixelSize:10;color:"#a9bba6"}
 Label {visible:panel.job(modelData.id)!==null;text:qsTr("Remaining: %1 s").arg(panel.job(modelData.id)?Math.max(0,panel.job(modelData.id).end-s.profile.lastClock):0);color:"#8facab";font.pixelSize:10}
 Button {text:s.profile.completed.indexOf(modelData.id)>=0?qsTr("Complete"):panel.job(modelData.id)?qsTr("In progress"):qsTr("Start research");enabled:s.profile.researchSlots>0&&!panel.job(modelData.id)&&s.profile.completed.indexOf(modelData.id)<0&&s.wallet>=modelData.cost&&s.profile.seeds>=modelData.seeds&&s.profile.research.length<s.profile.researchSlots;onClicked:backend.research(modelData.id)}
 }
 }
 ColumnLayout {visible:s.profile.completed.indexOf("stable")>=0
 Label {text:qsTr("Exclude one skill (at least three must remain)");color:"#c6c09e"}
 Repeater {model:s.config.skills
 Button {required property var modelData;text:qsTr(modelData.name);highlighted:s.profile.excluded===modelData.id;onClicked:backend.excludeSkill(s.profile.excluded===modelData.id?"":modelData.id)}
 }
 }
 }
 Label {text:qsTr(s.notice||"");visible:text!=="";Layout.fillWidth:true;wrapMode:Text.WordWrap;color:"#e0be87"}
 Button {text:qsTr("Back")+" [Esc]";onClicked:{backend.closeStation();panel.focusGame()}}
 }
 }
}
