/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/Source",["../_base/array","../_base/declare","../_base/kernel","../_base/lang","../dom-class","../dom-geometry","../mouse","../ready","../topic","./common","./Selector","./Manager"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c){
if(!_3.isAsync){
_8(0,function(){
var _d=["dojo/dnd/AutoSource","dojo/dnd/Target"];
require(_d);
});
}
var _e=_2("dojo.dnd.Source",_b,{isSource:true,horizontal:false,copyOnly:false,selfCopy:false,selfAccept:true,skipForm:false,withHandles:false,autoSync:false,delay:0,accept:["text"],generateText:true,constructor:function(_f,_10){
_4.mixin(this,_4.mixin({},_10));
var _11=this.accept;
if(_11.length){
this.accept={};
for(var i=0;i<_11.length;++i){
this.accept[_11[i]]=1;
}
}
this.isDragging=false;
this.mouseDown=false;
this.targetAnchor=null;
this.targetBox=null;
this.before=true;
this._lastX=0;
this._lastY=0;
this.sourceState="";
if(this.isSource){
_5.add(this.node,"dojoDndSource");
}
this.targetState="";
if(this.accept){
_5.add(this.node,"dojoDndTarget");
}
if(this.horizontal){
_5.add(this.node,"dojoDndHorizontal");
}
this.topics=[_9.subscribe("/dnd/source/over",_4.hitch(this,"onDndSourceOver")),_9.subscribe("/dnd/start",_4.hitch(this,"onDndStart")),_9.subscribe("/dnd/drop",_4.hitch(this,"onDndDrop")),_9.subscribe("/dnd/cancel",_4.hitch(this,"onDndCancel"))];
},checkAcceptance:function(_12,_13){
if(this==_12){
return !this.copyOnly||this.selfAccept;
}
for(var i=0;i<_13.length;++i){
var _14=_12.getItem(_13[i].id).type;
var _15=false;
for(var j=0;j<_14.length;++j){
if(_14[j] in this.accept){
_15=true;
break;
}
}
if(!_15){
return false;
}
}
return true;
},copyState:function(_16,_17){
if(_16){
return true;
}
if(arguments.length<2){
_17=this==_c.manager().target;
}
if(_17){
if(this.copyOnly){
return this.selfCopy;
}
}else{
return this.copyOnly;
}
return false;
},destroy:function(){
_e.superclass.destroy.call(this);
_1.forEach(this.topics,function(t){
t.remove();
});
this.targetAnchor=null;
},onMouseMove:function(e){
if(this.isDragging&&this.targetState=="Disabled"){
return;
}
_e.superclass.onMouseMove.call(this,e);
var m=_c.manager();
if(!this.isDragging){
if(this.mouseDown&&this.isSource&&(Math.abs(e.pageX-this._lastX)>this.delay||Math.abs(e.pageY-this._lastY)>this.delay)){
var _18=this.getSelectedNodes();
if(_18.length){
m.startDrag(this,_18,this.copyState(_a.getCopyKeyState(e),true));
}
}
}
if(this.isDragging){
var _19=false;
if(this.current){
if(!this.targetBox||this.targetAnchor!=this.current){
this.targetBox=_6.position(this.current,true);
}
if(this.horizontal){
_19=(e.pageX-this.targetBox.x<this.targetBox.w/2)==_6.isBodyLtr(this.current.ownerDocument);
}else{
_19=(e.pageY-this.targetBox.y)<(this.targetBox.h/2);
}
}
if(this.current!=this.targetAnchor||_19!=this.before){
this._markTargetAnchor(_19);
m.canDrop(!this.current||m.source!=this||!(this.current.id in this.selection));
}
}
},onMouseDown:function(e){
if(!this.mouseDown&&this._legalMouseDown(e)&&(!this.skipForm||!_a.isFormElement(e))){
this.mouseDown=true;
this._lastX=e.pageX;
this._lastY=e.pageY;
_e.superclass.onMouseDown.call(this,e);
}
},onMouseUp:function(e){
if(this.mouseDown){
this.mouseDown=false;
_e.superclass.onMouseUp.call(this,e);
}
},onDndSourceOver:function(_1a){
if(this!==_1a){
this.mouseDown=false;
if(this.targetAnchor){
this._unmarkTargetAnchor();
}
}else{
if(this.isDragging){
var m=_c.manager();
m.canDrop(this.targetState!="Disabled"&&(!this.current||m.source!=this||!(this.current.id in this.selection)));
}
}
},onDndStart:function(_1b,_1c,_1d){
if(this.autoSync){
this.sync();
}
if(this.isSource){
this._changeState("Source",this==_1b?(_1d?"Copied":"Moved"):"");
}
var _1e=this.accept&&this.checkAcceptance(_1b,_1c);
this._changeState("Target",_1e?"":"Disabled");
if(this==_1b){
_c.manager().overSource(this);
}
this.isDragging=true;
},onDndDrop:function(_1f,_20,_21,_22){
if(this==_22){
this.onDrop(_1f,_20,_21);
}
this.onDndCancel();
},onDndCancel:function(){
if(this.targetAnchor){
this._unmarkTargetAnchor();
this.targetAnchor=null;
}
this.before=true;
this.isDragging=false;
this.mouseDown=false;
this._changeState("Source","");
this._changeState("Target","");
},onDrop:function(_23,_24,_25){
if(this!=_23){
this.onDropExternal(_23,_24,_25);
}else{
this.onDropInternal(_24,_25);
}
},onDropExternal:function(_26,_27,_28){
var _29=this._normalizedCreator;
if(this.creator){
this._normalizedCreator=function(_2a,_2b){
return _29.call(this,_26.getItem(_2a.id).data,_2b);
};
}else{
if(_28){
this._normalizedCreator=function(_2c){
var t=_26.getItem(_2c.id);
var n=_2c.cloneNode(true);
n.id=_a.getUniqueId();
return {node:n,data:t.data,type:t.type};
};
}else{
this._normalizedCreator=function(_2d){
var t=_26.getItem(_2d.id);
_26.delItem(_2d.id);
return {node:_2d,data:t.data,type:t.type};
};
}
}
this.selectNone();
if(!_28&&!this.creator){
_26.selectNone();
}
this.insertNodes(true,_27,this.before,this.current);
if(!_28&&this.creator){
_26.deleteSelectedNodes();
}
this._normalizedCreator=_29;
},onDropInternal:function(_2e,_2f){
var _30=this._normalizedCreator;
if(this.current&&this.current.id in this.selection){
return;
}
if(_2f){
if(this.creator){
this._normalizedCreator=function(_31,_32){
return _30.call(this,this.getItem(_31.id).data,_32);
};
}else{
this._normalizedCreator=function(_33){
var t=this.getItem(_33.id);
var n=_33.cloneNode(true);
n.id=_a.getUniqueId();
return {node:n,data:t.data,type:t.type};
};
}
}else{
if(!this.current){
return;
}
this._normalizedCreator=function(_34){
var t=this.getItem(_34.id);
return {node:_34,data:t.data,type:t.type};
};
}
this._removeSelection();
this.insertNodes(true,_2e,this.before,this.current);
this._normalizedCreator=_30;
},onDraggingOver:function(){
},onDraggingOut:function(){
},onOverEvent:function(){
_e.superclass.onOverEvent.call(this);
_c.manager().overSource(this);
if(this.isDragging&&this.targetState!="Disabled"){
this.onDraggingOver();
}
},onOutEvent:function(){
_e.superclass.onOutEvent.call(this);
_c.manager().outSource(this);
if(this.isDragging&&this.targetState!="Disabled"){
this.onDraggingOut();
}
},_markTargetAnchor:function(_35){
if(this.current==this.targetAnchor&&this.before==_35){
return;
}
if(this.targetAnchor){
this._removeItemClass(this.targetAnchor,this.before?"Before":"After");
}
this.targetAnchor=this.current;
this.targetBox=null;
this.before=_35;
if(this.targetAnchor){
this._addItemClass(this.targetAnchor,this.before?"Before":"After");
}
},_unmarkTargetAnchor:function(){
if(!this.targetAnchor){
return;
}
this._removeItemClass(this.targetAnchor,this.before?"Before":"After");
this.targetAnchor=null;
this.targetBox=null;
this.before=true;
},_markDndStatus:function(_36){
this._changeState("Source",_36?"Copied":"Moved");
},_legalMouseDown:function(e){
if(e.type!="touchstart"&&!_7.isLeft(e)){
return false;
}
if(!this.withHandles){
return true;
}
for(var _37=e.target;_37&&_37!==this.node;_37=_37.parentNode){
if(_5.contains(_37,"dojoDndHandle")){
return true;
}
if(_5.contains(_37,"dojoDndItem")||_5.contains(_37,"dojoDndIgnore")){
break;
}
}
return false;
}});
return _e;
});
