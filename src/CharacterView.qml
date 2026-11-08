import "PixelArt.js" as PixelArt
import QtQuick
import QtQuick.Controls
import QtQuick.Controls.Material
import QtQuick.Layouts
Item {
 id:creator
 signal focusGame()
 property var s:backend.state
 property var hairColors:["#5e3936","#d6b96d","#bcc4c5","#302f43","#a65c50"]
 property var skinColors:["#dfaf87","#b97e5f","#82533f","#f0cbb2"]
 property var shirtColors:["#679e86","#9278aa","#c18b65","#638ba9"]
 property int hairIndex:0
 property int skinIndex:0
 property int shirtIndex:0
 property int style:0
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
 Label {text:qsTr(s.profile.error||"");visible:text!=="";wrapMode:Text.WordWrap;color:"#e7a284";Layout.fillWidth:true}
 TextField {id:nameField;objectName:"characterName";onAccepted:if(createButton.enabled)createButton.clicked();Layout.alignment:Qt.AlignHCenter;Layout.preferredWidth:300;placeholderText:qsTr("Name");maximumLength:24;selectByMouse:true}
 RowLayout {Layout.alignment:Qt.AlignHCenter;spacing:30
 Canvas {id:portrait;smooth:false;Layout.preferredWidth:96;Layout.preferredHeight:160
 property var character:({hair:creator.hairColors[creator.hairIndex],skin:creator.skinColors[creator.skinIndex],shirt:creator.shirtColors[creator.shirtIndex],hairStyle:creator.style})
 onCharacterChanged:requestPaint()
 onPaint:{var c=getContext('2d');c.reset();c.scale(4,4);PixelArt.character(c,0,0,character,0,false,false,"idle")}
 }
 ColumnLayout {spacing:8
 Button {text:qsTr("Hair style %1").arg(creator.style+1);onClicked:creator.style=(creator.style+1)%4}
 Button {text:qsTr("Hair color");onClicked:creator.hairIndex=(creator.hairIndex+1)%creator.hairColors.length}
 Button {text:qsTr("Skin tone");onClicked:creator.skinIndex=(creator.skinIndex+1)%creator.skinColors.length}
 Button {text:qsTr("Clothing color");onClicked:creator.shirtIndex=(creator.shirtIndex+1)%creator.shirtColors.length}
 }
 }
 RowLayout {Layout.alignment:Qt.AlignHCenter
 Repeater {model:s.config.classes
 Button {required property var modelData;text:qsTr(modelData.name);highlighted:creator.classId===modelData.id;onClicked:creator.classId=modelData.id}
 }
 }
 Label {Layout.alignment:Qt.AlignHCenter;Layout.maximumWidth:470;wrapMode:Text.WordWrap;color:"#bdc8ad";text:creator.classId==="gardener"?qsTr("Gardener: +10% coins, −10% magnet range."):creator.classId==="explorer"?qsTr("Explorer: one emergency double jump per run, −5% ordinary jump height."):qsTr("Collector: +20% magnet range, +1 s to catch upgrades, −5% ordinary jump height.")}
 Button {id:createButton;objectName:"createCharacter";Layout.alignment:Qt.AlignHCenter;text:qsTr("Make camp");highlighted:true;enabled:nameField.text.trim().length>0&&s.profile.error==="";onClicked:{backend.createCharacter(nameField.text,creator.classId,creator.hairColors[creator.hairIndex],creator.skinColors[creator.skinIndex],creator.shirtColors[creator.shirtIndex],creator.style);creator.focusGame()}}
 Label {visible:(s.profile.legacyBest||0)>0;Layout.alignment:Qt.AlignHCenter;text:qsTr("Legacy record: %1 m (old balance)").arg(s.profile.legacyBest||0);color:"#a6b09e"}
 Label {visible:(s.profile.legacyCoins||0)>0;Layout.alignment:Qt.AlignHCenter;text:qsTr("Legacy supplies to inherit once: %1 coins").arg(s.profile.legacyCoins||0);color:"#d3bd80"}
 }
 }
}
