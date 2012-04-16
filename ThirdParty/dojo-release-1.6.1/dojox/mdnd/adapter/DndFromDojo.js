/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.adapter.DndFromDojo"]){
dojo._hasResource["dojox.mdnd.adapter.DndFromDojo"]=true;
dojo.provide("dojox.mdnd.adapter.DndFromDojo");
dojo.require("dojox.mdnd.AreaManager");
dojo.require("dojo.dnd.Manager");
dojo.declare("dojox.mdnd.adapter.DndFromDojo",null,{dropIndicatorSize:{"w":0,"h":50},dropIndicatorSize:{"w":0,"h":50},_areaManager:null,_dojoManager:null,_currentArea:null,_oldArea:null,_moveHandler:null,_subscribeHandler:null,constructor:function(){
this._areaManager=dojox.mdnd.areaManager();
this._dojoManager=dojo.dnd.manager();
this._currentArea=null;
this._moveHandler=null;
this.subscribeDnd();
},subscribeDnd:function(){
this._subscribeHandler=[dojo.subscribe("/dnd/start",this,"onDragStart"),dojo.subscribe("/dnd/drop/before",this,"onDrop"),dojo.subscribe("/dnd/cancel",this,"onDropCancel"),dojo.subscribe("/dnd/source/over",this,"onDndSource")];
},unsubscribeDnd:function(){
dojo.forEach(this._subscribeHandler,dojo.unsubscribe);
},_getHoverArea:function(_1){
var x=_1.x;
var y=_1.y;
this._oldArea=this._currentArea;
this._currentArea=null;
var _2=this._areaManager._areaList;
for(var i=0;i<_2.length;i++){
var _3=_2[i];
var _4=_3.coords.x;
var _5=_4+_3.node.offsetWidth;
var _6=_3.coords.y;
var _7=_6+_3.node.offsetHeight;
if(_4<=x&&x<=_5&&_6<=y&&y<=_7){
this._areaManager._oldIndexArea=this._areaManager._currentIndexArea;
this._areaManager._currentIndexArea=i;
this._currentArea=_3.node;
break;
}
}
if(this._currentArea!=this._oldArea){
if(this._currentArea==null){
this.onDragExit();
}else{
if(this._oldArea==null){
this.onDragEnter();
}else{
this.onDragExit();
this.onDragEnter();
}
}
}
},onDragStart:function(_8,_9,_a){
this._dragNode=_9[0];
this._copy=_a;
this._source=_8;
this._outSourceHandler=dojo.connect(this._dojoManager,"outSource",this,function(){
if(this._moveHandler==null){
this._moveHandler=dojo.connect(dojo.doc,"mousemove",this,"onMouseMove");
}
});
},onMouseMove:function(e){
var _b={"x":e.pageX,"y":e.pageY};
this._getHoverArea(_b);
if(this._currentArea&&this._areaManager._accept){
if(this._areaManager._dropIndicator.node.style.visibility=="hidden"){
this._areaManager._dropIndicator.node.style.visibility="";
dojo.addClass(this._dojoManager.avatar.node,"dojoDndAvatarCanDrop");
}
this._areaManager.placeDropIndicator(_b,this.dropIndicatorSize);
}
},onDragEnter:function(){
var _c=this._dragNode.getAttribute("dndType");
var _d=(_c)?_c.split(/\s*,\s*/):["text"];
this._areaManager._isAccepted(_d,this._areaManager._areaList[this._areaManager._currentIndexArea].accept);
if(this._dojoManager.avatar){
if(this._areaManager._accept){
dojo.addClass(this._dojoManager.avatar.node,"dojoDndAvatarCanDrop");
}else{
dojo.removeClass(this._dojoManager.avatar.node,"dojoDndAvatarCanDrop");
}
}
},onDragExit:function(){
this._areaManager._accept=false;
if(this._dojoManager.avatar){
dojo.removeClass(this._dojoManager.avatar.node,"dojoDndAvatarCanDrop");
}
if(this._currentArea==null){
this._areaManager._dropMode.refreshItems(this._areaManager._areaList[this._areaManager._oldIndexArea],this._areaManager._oldDropIndex,this.dropIndicatorSize,false);
this._areaManager._resetAfterDrop();
}else{
this._areaManager._dropIndicator.remove();
}
},isAccepted:function(_e,_f){
var _10=(_e.getAttribute("dndType"))?_e.getAttribute("dndType"):"text";
if(_10&&_10 in _f){
return true;
}else{
return false;
}
},onDndSource:function(_11){
if(this._currentArea==null){
return;
}
if(_11){
var _12=false;
if(this._dojoManager.target==_11){
_12=true;
}else{
_12=this.isAccepted(this._dragNode,_11.accept);
}
if(_12){
dojo.disconnect(this._moveHandler);
this._currentArea=this._moveHandler=null;
var _13=this._areaManager._dropIndicator.node;
if(_13&&_13.parentNode!==null&&_13.parentNode.nodeType==1){
_13.style.visibility="hidden";
}
}else{
this._resetAvatar();
}
}else{
if(!this._moveHandler){
this._moveHandler=dojo.connect(dojo.doc,"mousemove",this,"onMouseMove");
}
this._resetAvatar();
}
},_resetAvatar:function(){
if(this._dojoManager.avatar){
if(this._areaManager._accept){
dojo.addClass(this._dojoManager.avatar.node,"dojoDndAvatarCanDrop");
}else{
dojo.removeClass(this._dojoManager.avatar.node,"dojoDndAvatarCanDrop");
}
}
},onDropCancel:function(){
if(this._currentArea==null){
this._areaManager._resetAfterDrop();
dojo.disconnect(this._moveHandler);
dojo.disconnect(this._outSourceHandler);
this._currentArea=this._moveHandler=this._outSourceHandler=null;
}else{
if(this._areaManager._accept){
this.onDrop(this._source,[this._dragNode],this._copy,this._currentArea);
}else{
this._currentArea=null;
dojo.disconnect(this._outSourceHandler);
dojo.disconnect(this._moveHandler);
this._moveHandler=this._outSourceHandler=null;
}
}
},onDrop:function(_14,_15,_16){
dojo.disconnect(this._moveHandler);
dojo.disconnect(this._outSourceHandler);
this._moveHandler=this._outSourceHandler=null;
if(this._currentArea){
var _17=this._areaManager._currentDropIndex;
dojo.publish("/dnd/drop/after",[_14,_15,_16,this._currentArea,_17]);
this._currentArea=null;
}
if(this._areaManager._dropIndicator.node.style.visibility=="hidden"){
this._areaManager._dropIndicator.node.style.visibility="";
}
this._areaManager._resetAfterDrop();
}});
dojox.mdnd.adapter._dndFromDojo=null;
(function(){
dojox.mdnd.adapter._dndFromDojo=new dojox.mdnd.adapter.DndFromDojo();
}());
}
