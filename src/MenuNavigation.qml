import QtQuick
Item {
 id:nav
 property var scope:null
 property var window
 property bool typing:window.activeFocusItem&&window.activeFocusItem.cursorPosition!==undefined
 function choices(node,out){
  if(!node||!node.visible||!node.enabled)return;
  if(node.menuChoice===true){out.push(node);return;}
  for(var child of node.children||[])choices(child,out);
 }
 function items(){var out=[];choices(scope,out);return out}
 function focusFirst(){var list=items();if(list.length)list[0].forceActiveFocus()}
 onScopeChanged:Qt.callLater(focusFirst)
 function reveal(item){
  var parent=item.parent;
  while(parent){
   if(parent.contentY!==undefined&&parent.contentHeight!==undefined){
    var pos=item.mapToItem(parent.contentItem,0,0).y;
    parent.contentY=Math.max(0,Math.min(parent.contentHeight-parent.height,pos<parent.contentY?pos-8:pos+item.height>parent.contentY+parent.height?pos+item.height-parent.height+8:parent.contentY));
   }
   parent=parent.parent;
  }
 }
 function move(dx,dy){
  var list=items();if(!list.length)return;
  var current=window.activeFocusItem;var index=list.indexOf(current);
  if(index<0){list[0].forceActiveFocus();return;}
  var p=current.mapToItem(scope,current.width/2,current.height/2);
  var best=null,cost=1e12;
  for(var item of list){if(item===current)continue;var q=item.mapToItem(scope,item.width/2,item.height/2);var x=q.x-p.x,y=q.y-p.y;var along=x*dx+y*dy,across=Math.abs(x*dy-y*dx);
   if(along>2){var candidate=along+across*3;if(candidate<cost){cost=candidate;best=item}}
  }
  if(!best)best=list[(index+(dx+dy>0?1:list.length-1))%list.length];
  best.forceActiveFocus();reveal(best);
 }
 function confirm(){var current=window.activeFocusItem;var list=items();if(list.indexOf(current)<0){focusFirst();return;}if(current.clicked!==undefined)current.clicked();else current.forceActiveFocus()}
 Connections {target:nav.window;function onActiveFocusItemChanged(){if(nav.scope&&nav.window.activeFocusItem)nav.reveal(nav.window.activeFocusItem)}}
 Shortcut {sequences:["W","Up"];context:Qt.ApplicationShortcut;enabled:nav.scope!==null&&!nav.typing;onActivated:nav.move(0,-1)}
 Shortcut {sequences:["S","Down"];context:Qt.ApplicationShortcut;enabled:nav.scope!==null&&!nav.typing;onActivated:nav.move(0,1)}
 Shortcut {sequences:["A","Left"];context:Qt.ApplicationShortcut;enabled:nav.scope!==null&&!nav.typing;onActivated:nav.move(-1,0)}
 Shortcut {sequences:["D","Right"];context:Qt.ApplicationShortcut;enabled:nav.scope!==null&&!nav.typing;onActivated:nav.move(1,0)}
 Shortcut {sequence:"E";autoRepeat:false;context:Qt.ApplicationShortcut;enabled:nav.scope!==null&&!nav.typing;onActivated:nav.confirm()}
}
