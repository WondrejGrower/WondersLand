import "PixelArt.js" as PixelArt
import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
Item {
 id:panel
 property var s:backend.state
 property string selectedItem:""
 function itemName(id){for(var item of s.config.clothing)if(item.id===id)return trText(item.name);return trText("Empty")}
 property string station:s.station
 signal focusGame()
 function trText(value){var lang=translator.language;return translator.text(value)}
 function has(id){return s.profile.unlocked.indexOf(id)>=0}
 function job(id){for(var j of s.profile.research)if(j.id===id)return j;return null}
 function close(){backend.closeStation();panel.focusGame()}
 ScrollView {anchors.fill:parent;clip:true;contentWidth:availableWidth
 ColumnLayout {width:parent.width;spacing:12
 Label {text:panel.station==="inventory"?qsTr("Inventory"):panel.station==="training"?qsTr("Training Grounds"):panel.station==="forge"?qsTr("Runic Workshop"):panel.station==="wardrobe"?qsTr("Wardrobe"):panel.station==="library"?qsTr("Spell Garden"):qsTr("Base Camp");font.pixelSize:24;color:"#e9d8a8";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 NavButton {visible:panel.station==="home"||panel.station==="wardrobe";text:qsTr("Inventory");Layout.fillWidth:true;onClicked:backend.openInventory()}
 Label {visible:panel.station==="home";text:qsTr("Your supplies and equipment survive each expedition.")+"\n"+qsTr("Best run: %1 m · total live distance: %2 m").arg(s.profile.bestDistance||0).arg(Math.floor(s.profile.totalDistance||0));wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b3c5ac"}
 ColumnLayout {visible:panel.station==="inventory";Layout.fillWidth:true
 Canvas {id:inventoryPortrait;Layout.alignment:Qt.AlignHCenter;Layout.preferredWidth:120;Layout.preferredHeight:200;smooth:false
 property var profile:s.profile
 onProfileChanged:requestPaint()
 onPaint:{var c=getContext('2d');c.reset();c.scale(5,5);PixelArt.character(c,0,0,s.profile.character,0,false,false,"idle",s.profile.equipment)}
 }
 Label {text:qsTr("No gameplay bonuses");color:"#abc3a6";Layout.fillWidth:true;wrapMode:Text.WordWrap}
 Repeater {model:["head","torso","legs","feet","hands","belt"]
 Label {required property string modelData;text:panel.trText(modelData.charAt(0).toUpperCase()+modelData.slice(1))+": "+panel.itemName(s.profile.equipment[modelData]);Layout.fillWidth:true;wrapMode:Text.WordWrap;color:"#e2d6b4"}
 }
 NavButton {text:qsTr("Hair style %1").arg((s.profile.character.hairStyle||0)+1);Layout.fillWidth:true;onClicked:backend.changeAppearance("hairStyle")}
 NavButton {text:qsTr("Hair color");Layout.fillWidth:true;onClicked:backend.changeAppearance("hair")}
 NavButton {text:qsTr("Skin tone");Layout.fillWidth:true;onClicked:backend.changeAppearance("skin")}
 Repeater {model:s.config.clothing
 ColumnLayout {required property var modelData;Layout.fillWidth:true
 Label {text:panel.trText(modelData.name)+" · "+panel.trText(modelData.slot.charAt(0).toUpperCase()+modelData.slot.slice(1));color:"#d6cfac";Layout.fillWidth:true;wrapMode:Text.WordWrap}
 NavButton {Layout.fillWidth:true;text:s.profile.inventory.indexOf(modelData.id)<0?qsTr("Take · free"):s.profile.equipment[modelData.slot]===modelData.id?qsTr("Unequip"):qsTr("Equip");highlighted:s.profile.equipment[modelData.slot]===modelData.id;onClicked:{if(s.profile.inventory.indexOf(modelData.id)<0)backend.takeClothing(modelData.id);else backend.equipClothing(modelData.id)}}
 }
 }
 }
 ColumnLayout {visible:panel.station==="training";Layout.fillWidth:true
 Label {text:qsTr("Permanent character development");color:"#d6c38d";Layout.fillWidth:true;wrapMode:Text.WordWrap}
 Repeater {model:s.profile.branches.filter(b=>panel.has(b.id))
 RowLayout {required property var modelData;Layout.fillWidth:true
 ColumnLayout {Layout.fillWidth:true
 Label {text:panel.trText(modelData.name)+" · "+modelData.level+" / 50";color:"#e1d8b7";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Label {text:panel.trText(modelData.description);Layout.fillWidth:true;wrapMode:Text.WordWrap;color:"#b8cbb0";font.pixelSize:12}
 Label {text:(modelData.id==="agility"?qsTr("Time slowdown %1 → %2%"):qsTr("Effect %1 → %2")).arg(Number(modelData.bonus*100).toLocaleString(Qt.locale(),'f',2)).arg(Number(modelData.nextBonus*100).toLocaleString(Qt.locale(),'f',2))+(modelData.id==="agility"?"":" %");color:"#9eb59d";font.pixelSize:11;wrapMode:Text.WordWrap;Layout.fillWidth:true}
 }
 NavButton {text:modelData.price<0?qsTr("Max"):qsTr("Buy · %1").arg(translator.coins(modelData.price));enabled:modelData.price>=0&&s.wallet>=modelData.price;onClicked:backend.buy(modelData.id);Layout.maximumWidth:200}
 }
 }
 Label {text:qsTr("Choose a model to practice repeatedly, or try them all. Uses your current attributes and equipment, without random skill upgrades. No permanent rewards.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#bbc5aa"}
 NavButton {objectName:"campTraining";text:qsTr("Try all models");Layout.fillWidth:true;onClicked:{backend.startPractice("all");panel.focusGame()}}
 Repeater {model:s.config.trainingModels
 ColumnLayout {required property var modelData;Layout.fillWidth:true
 Canvas {Layout.alignment:Qt.AlignHCenter;Layout.preferredWidth:128;Layout.preferredHeight:100;smooth:false
 Component.onCompleted:loadImage("qrc:/art/flora.png")
 onImageLoaded:requestPaint()
 onPaint:{var c=getContext('2d');c.reset();var p=backend.previewPlant(modelData.sats);var scale=Math.min(1,84/p.h,112/p.w);p.x=64-p.w*scale/2;p.w*=scale;p.h*=scale;if(isImageLoaded("qrc:/art/flora.png"))PixelArt.plant(c,p,92)}
 }
 NavButton {text:qsTr("Try %1").arg(panel.trText(modelData.name));Layout.fillWidth:true;onClicked:{backend.startPractice(modelData.id);panel.focusGame()}}
 }
 }
 }
 ColumnLayout {visible:panel.station==="forge";Layout.fillWidth:true
 Label {text:qsTr("Craft equipment for your expeditions.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b9cbb4"}
 Repeater {model:s.config.items.filter(item=>panel.has(item.feature)||s.profile.owned.indexOf(item.id)>=0)
 ColumnLayout {required property var modelData;Layout.fillWidth:true
 Label {text:panel.trText(modelData.name);color:"#d7ddbc";Layout.fillWidth:true;wrapMode:Text.WordWrap}
 Label {text:modelData.id==="hands"?qsTr("Collection range +10%"):qsTr("Jump height +5%. Recipe: 1,500 m in one live run.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#a9bba6"}
 NavButton {text:s.profile.owned.indexOf(modelData.id)>=0?qsTr("Owned"):qsTr("Craft · %1").arg(translator.coins(modelData.cost));Layout.fillWidth:true;enabled:s.profile.owned.indexOf(modelData.id)<0&&s.wallet>=modelData.cost&&(!modelData.recipe||(s.profile.recipes||[]).indexOf(modelData.id)>=0||(s.profile.bestDistance||0)>=Number(modelData.recipe.split(':')[1]));onClicked:backend.craft(modelData.id)}
 }
 }
 Label {visible:panel.has("diamond");text:qsTr("Diamond Hands Set: equip both pieces for one rescue.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#a9bba6"}
 }
 ColumnLayout {visible:panel.station==="wardrobe";Layout.fillWidth:true
 NavButton {text:qsTr("Hair style %1").arg((s.profile.character.hairStyle||0)+1);Layout.fillWidth:true;onClicked:backend.changeAppearance("hairStyle")}
 NavButton {text:qsTr("Hair color");Layout.fillWidth:true;onClicked:backend.changeAppearance("hair")}
 NavButton {text:qsTr("Skin tone");Layout.fillWidth:true;onClicked:backend.changeAppearance("skin")}
 NavButton {text:qsTr("Clothing color");Layout.fillWidth:true;onClicked:backend.changeAppearance("shirt")}
 Repeater {model:s.config.items.filter(item=>s.profile.owned.indexOf(item.id)>=0)
 NavButton {required property var modelData;Layout.fillWidth:true;text:panel.trText(modelData.name)+" · "+(s.profile[modelData.id]?qsTr("Equipped"):qsTr("Equip"));highlighted:s.profile[modelData.id]===true;onClicked:backend.equip(modelData.id)}
 }
 Label {visible:s.profile.owned.length===0;text:qsTr("Craft your first equipment in the Runic Workshop.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#b3c5ac"}
 }
 ColumnLayout {visible:panel.station==="library";Layout.fillWidth:true
 Label {text:qsTr("Research slots: %1 · seeds: %2").arg(s.profile.researchSlots).arg(s.profile.seeds);color:"#d6c28b";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Label {text:qsTr("Research continues while the application is closed.");wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#aabfa8"}
 Repeater {model:s.config.research.filter(r=>r.id!=="stable"||panel.has("diamond"))
 ColumnLayout {required property var modelData;Layout.fillWidth:true;spacing:4
 Label {text:panel.trText(modelData.name);color:"#e5d8b5"}
 Label {text:(translator.language,translator.coins(modelData.cost))+" · "+translator.seeds(modelData.seeds)+" · "+(modelData.seconds/60)+" min";wrapMode:Text.WordWrap;Layout.fillWidth:true;color:"#a9bba6"}
 Label {visible:panel.job(modelData.id)!==null;text:qsTr("Remaining: %1 s").arg(panel.job(modelData.id)?Math.max(0,panel.job(modelData.id).end-s.profile.lastClock):0);color:"#8facab"}
 NavButton {text:s.profile.completed.indexOf(modelData.id)>=0?qsTr("Complete"):panel.job(modelData.id)?qsTr("In progress"):qsTr("Start research");Layout.fillWidth:true;enabled:!panel.job(modelData.id)&&s.profile.completed.indexOf(modelData.id)<0&&s.wallet>=modelData.cost&&s.profile.seeds>=modelData.seeds&&s.profile.research.length<s.profile.researchSlots;onClicked:backend.research(modelData.id)}
 }
 }
 ColumnLayout {visible:s.profile.completed.indexOf("stable")>=0;Layout.fillWidth:true
 Label {text:qsTr("Exclude one skill (at least three must remain)");color:"#c6c09e";wrapMode:Text.WordWrap;Layout.fillWidth:true}
 Repeater {id:exclusions;model:s.config.skills.filter(sk=>(sk.unlock==="base"||s.profile.completed.indexOf(sk.unlock)>=0)&&(sk.id!=="jetpack"||panel.has("diamond")))
 NavButton {required property var modelData;enabled:exclusions.count>3||s.profile.excluded===modelData.id;text:panel.trText(modelData.name);Layout.fillWidth:true;highlighted:s.profile.excluded===modelData.id;onClicked:backend.excludeSkill(s.profile.excluded===modelData.id?"":modelData.id)}
 }
 }
 }
 Label {text:panel.trText(s.notice||"");visible:text!=="";Layout.fillWidth:true;wrapMode:Text.WordWrap;color:"#e0be87"}
 NavButton {text:qsTr("Back")+" · Esc";Layout.fillWidth:true;onClicked:panel.close()}
 }
 }
}
