/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.adapter.DndToDojo"]){
dojo._hasResource["dojox.mdnd.adapter.DndToDojo"]=true;
dojo.provide("dojox.mdnd.adapter.DndToDojo");
dojo.require("dojox.mdnd.PureSource");
dojo.require("dojox.mdnd.LazyManager");
dojo.declare("dojox.mdnd.adapter.DndToDojo",null,{_dojoList:null,_currentDojoArea:null,_dojoxManager:null,_dragStartHandler:null,_dropHandler:null,_moveHandler:null,_moveUpHandler:null,_draggedNode:null,constructor:function(){
this._dojoList=[];
this._currentDojoArea=null;
this._dojoxManager=dojox.mdnd.areaManager();
this._dragStartHandler=dojo.subscribe("/dojox/mdnd/drag/start",this,function(_1,_2,_3){
this._draggedNode=_1;
this._moveHandler=dojo.connect(dojo.doc,"onmousemove",this,"onMouseMove");
});
this._dropHandler=dojo.subscribe("/dojox/mdnd/drop",this,function(_4,_5,_6){
if(this._currentDojoArea){
dojo.publish("/dojox/mdnd/adapter/dndToDojo/cancel",[this._currentDojoArea.node,this._currentDojoArea.type,this._draggedNode,this.accept]);
}
this._draggedNode=null;
this._currentDojoArea=null;
dojo.disconnect(this._moveHandler);
});
},_getIndexDojoArea:function(_7){
if(_7){
for(var i=0,l=this._dojoList.length;i<l;i++){
if(this._dojoList[i].node===_7){
return i;
}
}
}
return -1;
},_initCoordinates:function(_8){
if(_8){
var _9=dojo.position(_8,true),_a={};
_a.x=_9.x;
_a.y=_9.y;
_a.x1=_9.x+_9.w;
_a.y1=_9.y+_9.h;
return _a;
}
return null;
},register:function(_b,_c,_d){
if(this._getIndexDojoArea(_b)==-1){
var _e=this._initCoordinates(_b),_f={"node":_b,"type":_c,"dojo":(_d)?_d:false,"coords":_e};
this._dojoList.push(_f);
if(_d&&!this._lazyManager){
this._lazyManager=new dojox.mdnd.LazyManager();
}
}
},unregisterByNode:function(_10){
var _11=this._getIndexDojoArea(_10);
if(_11!=-1){
this._dojoList.splice(_11,1);
}
},unregisterByType:function(_12){
if(_12){
var _13=[];
dojo.forEach(this._dojoList,function(_14,i){
if(_14.type!=_12){
_13.push(_14);
}
});
this._dojoList=_13;
}
},unregister:function(){
this._dojoList=[];
},refresh:function(){
var _15=this._dojoList;
this.unregister();
dojo.forEach(_15,function(_16){
_16.coords=this._initCoordinates(_16.node);
},this);
this._dojoList=_15;
},refreshByType:function(_17){
var _18=this._dojoList;
this.unregister();
dojo.forEach(_18,function(_19){
if(_19.type==_17){
_19.coords=this._initCoordinates(_19.node);
}
},this);
this._dojoList=_18;
},_getHoverDojoArea:function(_1a){
this._oldDojoArea=this._currentDojoArea;
this._currentDojoArea=null;
var x=_1a.x;
var y=_1a.y;
var _1b=this._dojoList.length;
for(var i=0;i<_1b;i++){
var _1c=this._dojoList[i];
var _1d=_1c.coords;
if(_1d.x<=x&&x<=_1d.x1&&_1d.y<=y&&y<=_1d.y1){
this._currentDojoArea=_1c;
break;
}
}
},onMouseMove:function(e){
var _1e={"x":e.pageX,"y":e.pageY};
this._getHoverDojoArea(_1e);
if(this._currentDojoArea!=this._oldDojoArea){
if(this._currentDojoArea==null){
this.onDragExit(e);
}else{
if(this._oldDojoArea==null){
this.onDragEnter(e);
}else{
this.onDragExit(e);
this.onDragEnter(e);
}
}
}
},isAccepted:function(_1f,_20){
return true;
},onDragEnter:function(e){
if(this._currentDojoArea.dojo){
dojo.disconnect(this._dojoxManager._dragItem.handlers.pop());
dojo.disconnect(this._dojoxManager._dragItem.handlers.pop());
dojo.disconnect(this._dojoxManager._dragItem.item.events.pop());
dojo.body().removeChild(this._dojoxManager._cover);
dojo.body().removeChild(this._dojoxManager._cover2);
var _21=this._dojoxManager._dragItem.item.node;
if(dojox.mdnd.adapter._dndFromDojo){
dojox.mdnd.adapter._dndFromDojo.unsubscribeDnd();
}
dojo.style(_21,{"position":"relative","top":"0","left":"0"});
this._lazyManager.startDrag(e,_21);
var _22=dojo.connect(this._lazyManager.manager,"overSource",this,function(){
dojo.disconnect(_22);
if(this._lazyManager.manager.canDropFlag){
this._dojoxManager._dropIndicator.node.style.display="none";
}
});
this.cancelHandler=dojo.subscribe("/dnd/cancel",this,function(){
var _23=this._dojoxManager._dragItem.item;
_23.events=[dojo.connect(_23.handle,"onmousedown",_23,"onMouseDown")];
dojo.body().appendChild(this._dojoxManager._cover);
dojo.body().appendChild(this._dojoxManager._cover2);
this._dojoxManager._cover.appendChild(_23.node);
var _24=this._dojoxManager._areaList[this._dojoxManager._sourceIndexArea];
var _25=this._dojoxManager._sourceDropIndex;
var _26=null;
if(_25!=_24.items.length&&_25!=-1){
_26=_24.items[this._dojoxManager._sourceDropIndex].item.node;
}
if(this._dojoxManager._dropIndicator.node.style.display=="none"){
this._dojoxManager._dropIndicator.node.style.display=="";
}
this._dojoxManager._dragItem.handlers.push(dojo.connect(this._dojoxManager._dragItem.item,"onDrag",this._dojoxManager,"onDrag"));
this._dojoxManager._dragItem.handlers.push(dojo.connect(this._dojoxManager._dragItem.item,"onDragEnd",this._dojoxManager,"onDrop"));
this._draggedNode.style.display="";
this._dojoxManager.onDrop(this._draggedNode);
dojo.unsubscribe(this.cancelHandler);
dojo.unsubscribe(this.dropHandler);
if(dojox.mdnd.adapter._dndFromDojo){
dojox.mdnd.adapter._dndFromDojo.subscribeDnd();
}
});
this.dropHandler=dojo.subscribe("/dnd/drop/before",this,function(_27){
dojo.unsubscribe(this.cancelHandler);
dojo.unsubscribe(this.dropHandler);
this.onDrop();
});
}else{
this.accept=this.isAccepted(this._dojoxManager._dragItem.item.node,this._currentDojoArea);
if(this.accept){
dojo.disconnect(this._dojoxManager._dragItem.handlers.pop());
dojo.disconnect(this._dojoxManager._dragItem.handlers.pop());
this._dojoxManager._dropIndicator.node.style.display="none";
if(!this._moveUpHandler){
this._moveUpHandler=dojo.connect(dojo.doc,"onmouseup",this,"onDrop");
}
}
}
dojo.publish("/dojox/mdnd/adapter/dndToDojo/over",[this._currentDojoArea.node,this._currentDojoArea.type,this._draggedNode,this.accept]);
},onDragExit:function(e){
if(this._oldDojoArea.dojo){
dojo.unsubscribe(this.cancelHandler);
dojo.unsubscribe(this.dropHandler);
var _28=this._dojoxManager._dragItem.item;
this._dojoxManager._dragItem.item.events.push(dojo.connect(_28.node.ownerDocument,"onmousemove",_28,"onMove"));
dojo.body().appendChild(this._dojoxManager._cover);
dojo.body().appendChild(this._dojoxManager._cover2);
this._dojoxManager._cover.appendChild(_28.node);
var _29=_28.node.style;
_29.position="absolute";
_29.left=(_28.offsetDrag.l+e.pageX)+"px";
_29.top=(_28.offsetDrag.t+e.pageX)+"px";
_29.display="";
this._lazyManager.cancelDrag();
if(dojox.mdnd.adapter._dndFromDojo){
dojox.mdnd.adapter._dndFromDojo.subscribeDnd();
}
if(this._dojoxManager._dropIndicator.node.style.display=="none"){
this._dojoxManager._dropIndicator.node.style.display="";
}
this._dojoxManager._dragItem.handlers.push(dojo.connect(this._dojoxManager._dragItem.item,"onDrag",this._dojoxManager,"onDrag"));
this._dojoxManager._dragItem.handlers.push(dojo.connect(this._dojoxManager._dragItem.item,"onDragEnd",this._dojoxManager,"onDrop"));
this._dojoxManager._dragItem.item.onMove(e);
}else{
if(this.accept){
if(this._moveUpHandler){
dojo.disconnect(this._moveUpHandler);
this._moveUpHandler=null;
}
if(this._dojoxManager._dropIndicator.node.style.display=="none"){
this._dojoxManager._dropIndicator.node.style.display="";
}
this._dojoxManager._dragItem.handlers.push(dojo.connect(this._dojoxManager._dragItem.item,"onDrag",this._dojoxManager,"onDrag"));
this._dojoxManager._dragItem.handlers.push(dojo.connect(this._dojoxManager._dragItem.item,"onDragEnd",this._dojoxManager,"onDrop"));
this._dojoxManager._dragItem.item.onMove(e);
}
}
dojo.publish("/dojox/mdnd/adapter/dndToDojo/out",[this._oldDojoArea.node,this._oldDojoArea.type,this._draggedNode,this.accept]);
},onDrop:function(e){
if(this._currentDojoArea.dojo){
if(dojox.mdnd.adapter._dndFromDojo){
dojox.mdnd.adapter._dndFromDojo.subscribeDnd();
}
}
if(this._dojoxManager._dropIndicator.node.style.display=="none"){
this._dojoxManager._dropIndicator.node.style.display="";
}
if(this._dojoxManager._cover.parentNode&&this._dojoxManager._cover.parentNode.nodeType==1){
dojo.body().removeChild(this._dojoxManager._cover);
dojo.body().removeChild(this._dojoxManager._cover2);
}
if(this._draggedNode.parentNode==this._dojoxManager._cover){
this._dojoxManager._cover.removeChild(this._draggedNode);
}
dojo.disconnect(this._moveHandler);
dojo.disconnect(this._moveUpHandler);
this._moveHandler=this._moveUpHandler=null;
dojo.publish("/dojox/mdnd/adapter/dndToDojo/drop",[this._draggedNode,this._currentDojoArea.node,this._currentDojoArea.type]);
dojo.removeClass(this._draggedNode,"dragNode");
var _2a=this._draggedNode.style;
_2a.position="relative";
_2a.left="0";
_2a.top="0";
_2a.width="auto";
dojo.forEach(this._dojoxManager._dragItem.handlers,dojo.disconnect);
this._dojoxManager._deleteMoveableItem(this._dojoxManager._dragItem);
this._draggedNode=null;
this._currentDojoArea=null;
this._dojoxManager._resetAfterDrop();
}});
dojox.mdnd.adapter._dndToDojo=null;
dojox.mdnd.adapter.dndToDojo=function(){
if(!dojox.mdnd.adapter._dndToDojo){
dojox.mdnd.adapter._dndToDojo=new dojox.mdnd.adapter.DndToDojo();
}
return dojox.mdnd.adapter._dndToDojo;
};
}
