import QtQuick
import QtQuick.Controls
Button {
 id:control
 property bool menuChoice:true
 hoverEnabled:true
 implicitHeight:Math.max(42,contentItem.implicitHeight+20)
 implicitWidth:Math.max(100,contentItem.implicitWidth+28)
 padding:10
 contentItem:Text {text:control.text;font:control.font;color:control.enabled?"#eee2bb":"#78867e";wrapMode:Text.WordWrap;horizontalAlignment:Text.AlignHCenter;verticalAlignment:Text.AlignVCenter}
 background:Rectangle {color:control.down?"#456151":control.activeFocus?"#354d47":control.hovered?"#30443e":"#21352f";border.width:control.activeFocus?3:1;border.color:control.activeFocus?"#ffdc87":control.highlighted?"#b49d65":"#58705c";radius:theme.radius;opacity:control.enabled?1:.5}
}
