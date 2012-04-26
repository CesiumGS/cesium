/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.PureSource"]){
dojo._hasResource["dojox.mdnd.PureSource"]=true;
dojo.provide("dojox.mdnd.PureSource");
dojo.require("dojo.dnd.Selector");
dojo.require("dojo.dnd.Manager");
dojo.declare("dojox.mdnd.PureSource",dojo.dnd.Selector,{horizontal:false,copyOnly:true,skipForm:false,withHandles:false,isSource:true,targetState:"Disabled",generateText:true,constructor:function(_1,_2){
dojo.mixin(this,dojo.mixin({},_2));
var _3=this.accept;
this.isDragging=false;
this.mouseDown=false;
this.sourceState="";
dojo.addClass(this.node,"dojoDndSource");
if(this.horizontal){
dojo.addClass(this.node,"dojoDndHorizontal");
}
this.topics=[dojo.subscribe("/dnd/cancel",this,"onDndCancel"),dojo.subscribe("/dnd/drop",this,"onDndCancel")];
},onDndCancel:function(){
this.isDragging=false;
this.mouseDown=false;
delete this.mouseButton;
},copyState:function(_4){
return this.copyOnly||_4;
},destroy:function(){
dojox.mdnd.PureSource.superclass.destroy.call(this);
dojo.forEach(this.topics,dojo.unsubscribe);
this.targetAnchor=null;
},markupFactory:function(_5,_6){
_5._skipStartup=true;
return new dojox.mdnd.PureSource(_6,_5);
},onMouseMove:function(e){
if(this.isDragging){
return;
}
dojox.mdnd.PureSource.superclass.onMouseMove.call(this,e);
var m=dojo.dnd.manager();
if(this.mouseDown&&!this.isDragging&&this.isSource){
var _7=this.getSelectedNodes();
if(_7.length){
m.startDrag(this,_7,this.copyState(dojo.isCopyKey(e)));
this.isDragging=true;
}
}
},onMouseDown:function(e){
if(this._legalMouseDown(e)&&(!this.skipForm||!dojo.dnd.isFormElement(e))){
this.mouseDown=true;
this.mouseButton=e.button;
dojox.mdnd.PureSource.superclass.onMouseDown.call(this,e);
}
},onMouseUp:function(e){
if(this.mouseDown){
this.mouseDown=false;
dojox.mdnd.PureSource.superclass.onMouseUp.call(this,e);
}
},onOverEvent:function(){
dojox.mdnd.PureSource.superclass.onOverEvent.call(this);
dojo.dnd.manager().overSource(this);
},onOutEvent:function(){
dojox.mdnd.PureSource.superclass.onOutEvent.call(this);
dojo.dnd.manager().outSource(this);
},_markDndStatus:function(_8){
this._changeState("Source",_8?"Copied":"Moved");
},_legalMouseDown:function(e){
if(!this.withHandles){
return true;
}
for(var _9=e.target;_9&&!dojo.hasClass(_9,"dojoDndItem");_9=_9.parentNode){
if(dojo.hasClass(_9,"dojoDndHandle")){
return true;
}
}
return false;
}});
}
