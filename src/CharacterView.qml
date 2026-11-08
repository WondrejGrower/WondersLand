import "PixelArt.js" as PixelArt
import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
Item {
 id:creator
 signal focusGame()
 function trText(value){var lang=translator.language;return translator.text(value)}
 property var s:backend.state
 property var hairColors:["#5e3936","#d6b96d","#bcc4c5","#302f43","#a65c50"]
 property var skinColors:["#dfaf87","#b97e5f","#82533f","#f0cbb2"]
 property var shirtColors:["#679e86","#9278aa","#c18b65","#638ba9"]
 property int hairIndex:0
 property int skinIndex:0
 property int shirtIndex:0
 property int style:0
 property var outfit:JSON.parse(JSON.stringify(s.config.starterEquipment))
 function cycleOutfit(slot){var choices=[null];for(var item of s.config.clothing)if(item.slot===slot)choices.push(item.id);var next=JSON.parse(JSON.stringify(outfit));next[slot]=choices[(choices.indexOf(outfit[slot])+1)%choices.length];outfit=next}
 function outfitName(slot){for(var item of s.config.clothing)if(item.id===outfit[slot])return trText(item.name);return trText("Empty")}
 property string classId:"gardener"
 Connections {target:creator.Window.window
 function onActiveFocusItemChanged(){
  var item=creator.Window.window.activeFocusItem;if(!creator.visible||!item)return;
  var node=item;while(node&&node!==creationContent)node=node.parent;if(!node)return;
  var y=item.mapToItem(creationContent,0,0).y;var flick=creatorScroll.contentItem;
  if(y<flick.contentY)flick.contentY=Math.max(0,y-8);
  else if(y+item.height>flick.contentY+creatorScroll.availableHeight)flick.contentY=y+item.height-creatorScroll.availableHeight+8;
 }
 }
 ScrollView {id:creatorScroll;anchors.fill:parent;clip:true;contentWidth:availableWidth
 ColumnLayout {id:creationContent;width:parent.width;spacing:14
 Label {text:qsTr("Create your wanderer");font.pixelSize:28;color:"#e9d7a3";Layout.alignment:Qt.AlignHCenter}
 Label {text:qsTr("One character. Endless expeditions.");color:"#a3b8a3";Layout.alignment:Qt.AlignHCenter}
 Label {text:creator.trText(s.profile.error||"");visible:text!=="";wrapMode:Text.WordWrap;color:"#e7a284";Layout.fillWidth:true}
 TextField {id:nameField;property bool menuChoice:true;objectName:"characterName";onAccepted:nextItemInFocusChain().forceActiveFocus();Layout.alignment:Qt.AlignHCenter;Layout.preferredWidth:300;placeholderText:qsTr("Name");maximumLength:24;selectByMouse:true}
 RowLayout {Layout.alignment:Qt.AlignHCenter;spacing:30
 Canvas {id:portrait;smooth:false;Layout.preferredWidth:96;Layout.preferredHeight:160
 property var worn:creator.outfit
 onWornChanged:requestPaint()
 property var character:({hair:creator.hairColors[creator.hairIndex],skin:creator.skinColors[creator.skinIndex],shirt:creator.shirtColors[creator.shirtIndex],hairStyle:creator.style})
 onCharacterChanged:requestPaint()
 onPaint:{var c=getContext('2d');c.reset();c.scale(4,4);PixelArt.character(c,0,0,character,0,false,false,"idle",creator.outfit)}
 }
 ColumnLayout {spacing:8
 NavButton {text:qsTr("Hair style %1").arg(creator.style+1);onClicked:creator.style=(creator.style+1)%16}
 NavButton {text:qsTr("Hair color");onClicked:creator.hairIndex=(creator.hairIndex+1)%creator.hairColors.length}
 NavButton {text:qsTr("Skin tone");onClicked:creator.skinIndex=(creator.skinIndex+1)%creator.skinColors.length}
 }
 }
 Label {text:qsTr("Starting outfit");color:"#d7c38d";Layout.fillWidth:true}
 Repeater {model:["head","torso","legs","feet","hands","belt"]
 NavButton {required property string modelData;Layout.fillWidth:true;text:creator.trText(modelData.charAt(0).toUpperCase()+modelData.slice(1))+": "+creator.outfitName(modelData);onClicked:creator.cycleOutfit(modelData)}
 }
 Label {text:qsTr("Choose your role");color:"#e2d19e";Layout.fillWidth:true;wrapMode:Text.WordWrap}
 RowLayout {Layout.fillWidth:true;spacing:8
 Repeater {model:s.config.classes
 NavButton {required property var modelData;objectName:"creationRole_"+modelData.id;Layout.fillWidth:true;text:creator.trText(modelData.name);highlighted:creator.classId===modelData.id;onClicked:creator.classId=modelData.id}
 }
 }
 Label {text:creator.classId==="gardener"?qsTr("Gardener: +10% coins, −10% magnet range."):creator.classId==="explorer"?qsTr("Explorer: one emergency double jump per run, −5% Basic Jump height."):qsTr("Collector: +20% magnet range, +1 s to catch upgrades, −5% Basic Jump height.");Layout.fillWidth:true;wrapMode:Text.WordWrap;color:"#b3c5ac"}
 Label {text:qsTr("Your role is permanent. Changing it requires resetting your character and progress.");Layout.fillWidth:true;wrapMode:Text.WordWrap;color:"#c6b58c"}
 NavButton {id:createButton;objectName:"createCharacter";Layout.alignment:Qt.AlignHCenter;text:qsTr("Make camp");highlighted:true;enabled:nameField.text.trim().length>0&&s.profile.error==="";onClicked:{backend.createCharacter(nameField.text,creator.classId,creator.hairColors[creator.hairIndex],creator.skinColors[creator.skinIndex],creator.shirtColors[creator.shirtIndex],creator.style,creator.outfit);creator.focusGame()}}
 Label {visible:(s.profile.legacyBest||0)>0;Layout.alignment:Qt.AlignHCenter;text:qsTr("Legacy record: %1 m (old balance)").arg(s.profile.legacyBest||0);color:"#a6b09e"}
 Label {visible:(s.profile.legacyCoins||0)>0;Layout.alignment:Qt.AlignHCenter;text:qsTr("Inherited supplies: %1").arg((translator.language,translator.coins(s.profile.legacyCoins||0)));color:"#d3bd80"}
 }
 }
}
