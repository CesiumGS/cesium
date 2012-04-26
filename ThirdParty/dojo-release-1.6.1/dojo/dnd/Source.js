/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.dnd.Source"]){
dojo._hasResource["dojo.dnd.Source"]=true;
dojo.provide("dojo.dnd.Source");
dojo.require("dojo.dnd.Selector");
dojo.require("dojo.dnd.Manager");
dojo.declare("dojo.dnd.Source",dojo.dnd.Selector,{isSource:true,horizontal:false,copyOnly:false,selfCopy:false,selfAccept:true,skipForm:false,withHandles:false,autoSync:false,delay:0,accept:["text"],generateText:true,constructor:function(_1,_2){
dojo.mixin(this,dojo.mixin({},_2));
var _3=this.accept;
if(_3.length){
this.accept={};
for(var i=0;i<_3.length;++i){
this.accept[_3[i]]=1;
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
dojo.addClass(this.node,"dojoDndSource");
}
this.targetState="";
if(this.accept){
dojo.addClass(this.node,"dojoDndTarget");
}
if(this.horizontal){
dojo.addClass(this.node,"dojoDndHorizontal");
}
this.topics=[dojo.subscribe("/dnd/source/over",this,"onDndSourceOver"),dojo.subscribe("/dnd/start",this,"onDndStart"),dojo.subscribe("/dnd/drop",this,"onDndDrop"),dojo.subscribe("/dnd/cancel",this,"onDndCancel")];
},checkAcceptance:function(_4,_5){
if(this==_4){
return !this.copyOnly||this.selfAccept;
}
for(var i=0;i<_5.length;++i){
var _6=_4.getItem(_5[i].id).type;
var _7=false;
for(var j=0;j<_6.length;++j){
if(_6[j] in this.accept){
_7=true;
break;
}
}
if(!_7){
return false;
}
}
return true;
},copyState:function(_8,_9){
if(_8){
return true;
}
if(arguments.length<2){
_9=this==dojo.dnd.manager().target;
}
if(_9){
if(this.copyOnly){
return this.selfCopy;
}
}else{
return this.copyOnly;
}
return false;
},destroy:function(){
dojo.dnd.Source.superclass.destroy.call(this);
dojo.forEach(this.topics,dojo.unsubscribe);
this.targetAnchor=null;
},markupFactory:function(_a,_b){
_a._skipStartup=true;
return new dojo.dnd.Source(_b,_a);
},onMouseMove:function(e){
if(this.isDragging&&this.targetState=="Disabled"){
return;
}
dojo.dnd.Source.superclass.onMouseMove.call(this,e);
var m=dojo.dnd.manager();
if(!this.isDragging){
if(this.mouseDown&&this.isSource&&(Math.abs(e.pageX-this._lastX)>this.delay||Math.abs(e.pageY-this._lastY)>this.delay)){
var _c=this.getSelectedNodes();
if(_c.length){
m.startDrag(this,_c,this.copyState(dojo.isCopyKey(e),true));
}
}
}
if(this.isDragging){
var _d=false;
if(this.current){
if(!this.targetBox||this.targetAnchor!=this.current){
this.targetBox=dojo.position(this.current,true);
}
if(this.horizontal){
_d=(e.pageX-this.targetBox.x)<(this.targetBox.w/2);
}else{
_d=(e.pageY-this.targetBox.y)<(this.targetBox.h/2);
}
}
if(this.current!=this.targetAnchor||_d!=this.before){
this._markTargetAnchor(_d);
m.canDrop(!this.current||m.source!=this||!(this.current.id in this.selection));
}
}
},onMouseDown:function(e){
if(!this.mouseDown&&this._legalMouseDown(e)&&(!this.skipForm||!dojo.dnd.isFormElement(e))){
this.mouseDown=true;
this._lastX=e.pageX;
this._lastY=e.pageY;
dojo.dnd.Source.superclass.onMouseDown.call(this,e);
}
},onMouseUp:function(e){
if(this.mouseDown){
this.mouseDown=false;
dojo.dnd.Source.superclass.onMouseUp.call(this,e);
}
},onDndSourceOver:function(_e){
if(this!=_e){
this.mouseDown=false;
if(this.targetAnchor){
this._unmarkTargetAnchor();
}
}else{
if(this.isDragging){
var m=dojo.dnd.manager();
m.canDrop(this.targetState!="Disabled"&&(!this.current||m.source!=this||!(this.current.id in this.selection)));
}
}
},onDndStart:function(_f,_10,_11){
if(this.autoSync){
this.sync();
}
if(this.isSource){
this._changeState("Source",this==_f?(_11?"Copied":"Moved"):"");
}
var _12=this.accept&&this.checkAcceptance(_f,_10);
this._changeState("Target",_12?"":"Disabled");
if(this==_f){
dojo.dnd.manager().overSource(this);
}
this.isDragging=true;
},onDndDrop:function(_13,_14,_15,_16){
if(this==_16){
this.onDrop(_13,_14,_15);
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
},onDrop:function(_17,_18,_19){
if(this!=_17){
this.onDropExternal(_17,_18,_19);
}else{
this.onDropInternal(_18,_19);
}
},onDropExternal:function(_1a,_1b,_1c){
var _1d=this._normalizedCreator;
if(this.creator){
this._normalizedCreator=function(_1e,_1f){
return _1d.call(this,_1a.getItem(_1e.id).data,_1f);
};
}else{
if(_1c){
this._normalizedCreator=function(_20,_21){
var t=_1a.getItem(_20.id);
var n=_20.cloneNode(true);
n.id=dojo.dnd.getUniqueId();
return {node:n,data:t.data,type:t.type};
};
}else{
this._normalizedCreator=function(_22,_23){
var t=_1a.getItem(_22.id);
_1a.delItem(_22.id);
return {node:_22,data:t.data,type:t.type};
};
}
}
this.selectNone();
if(!_1c&&!this.creator){
_1a.selectNone();
}
this.insertNodes(true,_1b,this.before,this.current);
if(!_1c&&this.creator){
_1a.deleteSelectedNodes();
}
this._normalizedCreator=_1d;
},onDropInternal:function(_24,_25){
var _26=this._normalizedCreator;
if(this.current&&this.current.id in this.selection){
return;
}
if(_25){
if(this.creator){
this._normalizedCreator=function(_27,_28){
return _26.call(this,this.getItem(_27.id).data,_28);
};
}else{
this._normalizedCreator=function(_29,_2a){
var t=this.getItem(_29.id);
var n=_29.cloneNode(true);
n.id=dojo.dnd.getUniqueId();
return {node:n,data:t.data,type:t.type};
};
}
}else{
if(!this.current){
return;
}
this._normalizedCreator=function(_2b,_2c){
var t=this.getItem(_2b.id);
return {node:_2b,data:t.data,type:t.type};
};
}
this._removeSelection();
this.insertNodes(true,_24,this.before,this.current);
this._normalizedCreator=_26;
},onDraggingOver:function(){
},onDraggingOut:function(){
},onOverEvent:function(){
dojo.dnd.Source.superclass.onOverEvent.call(this);
dojo.dnd.manager().overSource(this);
if(this.isDragging&&this.targetState!="Disabled"){
this.onDraggingOver();
}
},onOutEvent:function(){
dojo.dnd.Source.superclass.onOutEvent.call(this);
dojo.dnd.manager().outSource(this);
if(this.isDragging&&this.targetState!="Disabled"){
this.onDraggingOut();
}
},_markTargetAnchor:function(_2d){
if(this.current==this.targetAnchor&&this.before==_2d){
return;
}
if(this.targetAnchor){
this._removeItemClass(this.targetAnchor,this.before?"Before":"After");
}
this.targetAnchor=this.current;
this.targetBox=null;
this.before=_2d;
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
},_markDndStatus:function(_2e){
this._changeState("Source",_2e?"Copied":"Moved");
},_legalMouseDown:function(e){
if(!dojo.mouseButtons.isLeft(e)){
return false;
}
if(!this.withHandles){
return true;
}
for(var _2f=e.target;_2f&&_2f!==this.node;_2f=_2f.parentNode){
if(dojo.hasClass(_2f,"dojoDndHandle")){
return true;
}
if(dojo.hasClass(_2f,"dojoDndItem")||dojo.hasClass(_2f,"dojoDndIgnore")){
break;
}
}
return false;
}});
dojo.declare("dojo.dnd.Target",dojo.dnd.Source,{constructor:function(_30,_31){
this.isSource=false;
dojo.removeClass(this.node,"dojoDndSource");
},markupFactory:function(_32,_33){
_32._skipStartup=true;
return new dojo.dnd.Target(_33,_32);
}});
dojo.declare("dojo.dnd.AutoSource",dojo.dnd.Source,{constructor:function(_34,_35){
this.autoSync=true;
},markupFactory:function(_36,_37){
_36._skipStartup=true;
return new dojo.dnd.AutoSource(_37,_36);
}});
}
