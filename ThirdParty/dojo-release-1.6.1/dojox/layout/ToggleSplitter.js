/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.ToggleSplitter"]){
dojo._hasResource["dojox.layout.ToggleSplitter"]=true;
dojo.provide("dojox.layout.ToggleSplitter");
dojo.experimental("dojox.layout.ToggleSplitter");
dojo.require("dijit.layout.BorderContainer");
dojo.declare("dojox.layout.ToggleSplitter",[dijit.layout._Splitter],{open:true,closedThreshold:5,openSize:"",_closedSize:"0",templateString:"<div class=\"dijitSplitter dojoxToggleSplitter\" dojoAttachEvent=\"onkeypress:_onKeyPress,onmousedown:_onMouseDown\" tabIndex=\"0\" role=\"separator\"><div dojoAttachPoint=\"toggleNode\" class=\"dijitSplitterThumb dojoxToggleSplitterIcon\"></div></div>",postCreate:function(){
this._started=false;
this.inherited(arguments);
var _1=this.region;
dojo.addClass(this.domNode,"dojoxToggleSplitter"+_1.charAt(0).toUpperCase()+_1.substring(1));
this.connect(this,"onDblClick","_toggleMe");
},startup:function(){
this.inherited(arguments);
var _2=this.child.domNode,_3=dojo.style(_2,(this.horizontal?"height":"width"));
dojo.forEach(["toggleSplitterOpen","toggleSplitterClosedThreshold","toggleSplitterOpenSize"],function(_4){
var _5=_4.substring("toggleSplitter".length);
_5=_5.charAt(0).toLowerCase()+_5.substring(1);
if(_4 in this.child){
this[_5]=this.child[_4];
}
},this);
if(!this.openSize){
this.openSize=(this.open)?_3+"px":"75px";
}
this._openStyleProps=this._getStyleProps(_2,true);
this._started=true;
this.set("open",this.open);
return this;
},_onMouseUp:function(_6){
dojo.disconnect(this._onMoveHandle);
dojo.disconnect(this._onUpHandle);
delete this._onMoveHandle;
delete this._onUpHandle;
delete this._startPosn;
},_onPrelimMouseMove:function(_7){
var _8=this._startPosn||0;
var _9=3;
var _a=Math.abs(_8-(this.horizontal?_7.clientY:_7.clientX));
if(_a>=_9){
dojo.disconnect(this._onMoveHandle);
this._startDrag(_7);
}
},_onMouseDown:function(_b){
if(!this.open){
return;
}
if(!this._onUpHandle){
this._onUpHandle=dojo.connect(dojo.body(),"onmouseup",this,"_onMouseUp");
}
if(!this._onMoveHandle){
this._startPosn=this.horizontal?_b.clientY:_b.clientX;
this._onMoveHandle=dojo.connect(dojo.body(),"onmousemove",this,"_onPrelimMouseMove");
}
},_handleOnChange:function(){
var _c=this.child.domNode,_d,_e=this.horizontal?"height":"width";
if(this.open){
var _f=dojo.mixin({display:"block",overflow:"auto",visibility:"visible"},this._openStyleProps);
_f[_e]=(this._openStyleProps&&this._openStyleProps[_e])?this._openStyleProps[_e]:this.openSize;
dojo.style(_c,_f);
this.connect(this.domNode,"onmousedown","_onMouseDown");
}else{
var _10=dojo.getComputedStyle(_c);
_d=this._getStyleProps(_c,true,_10);
var _11=this._getStyleProps(_c,false,_10);
this._openStyleProps=_d;
dojo.style(_c,_11);
}
this._setStateClass();
if(this.container._started){
this.container._layoutChildren(this.region);
}
},_getStyleProps:function(_12,_13,_14){
if(!_14){
_14=dojo.getComputedStyle(_12);
}
var _15={},dim=this.horizontal?"height":"width";
_15["overflow"]=(_13)?_14["overflow"]:"hidden";
_15["visibility"]=(_13)?_14["visibility"]:"hidden";
_15[dim]=(_13)?_12.style[dim]||_14[dim]:this._closedSize;
var _16=["Top","Right","Bottom","Left"];
dojo.forEach(["padding","margin","border"],function(_17){
for(var i=0;i<_16.length;i++){
var _18=_17+_16[i];
if(_17=="border"){
_17+="Width";
}
if(undefined!==_14[_18]){
_15[_18]=(_13)?_14[_18]:0;
}
}
});
return _15;
},_setStateClass:function(){
if(this.open){
dojo.removeClass(this.domNode,"dojoxToggleSplitterClosed");
dojo.addClass(this.domNode,"dojoxToggleSplitterOpen");
dojo.removeClass(this.toggleNode,"dojoxToggleSplitterIconClosed");
dojo.addClass(this.toggleNode,"dojoxToggleSplitterIconOpen");
}else{
dojo.addClass(this.domNode,"dojoxToggleSplitterClosed");
dojo.removeClass(this.domNode,"dojoxToggleSplitterOpen");
dojo.addClass(this.toggleNode,"dojoxToggleSplitterIconClosed");
dojo.removeClass(this.toggleNode,"dojoxToggleSplitterIconOpen");
}
},_setOpenAttr:function(_19){
if(!this._started){
return;
}
this.open=_19;
this._handleOnChange(_19,true);
var evt=this.open?"onOpen":"onClose";
this[evt](this.child);
},onOpen:function(){
},onClose:function(){
},_toggleMe:function(evt){
if(evt){
dojo.stopEvent(evt);
}
this.set("open",!this.open);
},_onKeyPress:function(e){
this.inherited(arguments);
}});
dojo.extend(dijit._Widget,{toggleSplitterOpen:true,toggleSplitterClosedThreshold:5,toggleSplitterOpenSize:""});
}
