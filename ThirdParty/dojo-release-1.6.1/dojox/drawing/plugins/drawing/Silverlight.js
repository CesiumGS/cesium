/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.plugins.drawing.Silverlight"]){
dojo._hasResource["dojox.drawing.plugins.drawing.Silverlight"]=true;
dojo.provide("dojox.drawing.plugins.drawing.Silverlight");
dojox.drawing.plugins.drawing.Silverlight=dojox.drawing.util.oo.declare(function(_1){
if(dojox.gfx.renderer!="silverlight"){
return;
}
this.mouse=_1.mouse;
this.stencils=_1.stencils;
this.anchors=_1.anchors;
this.canvas=_1.canvas;
this.util=_1.util;
dojo.connect(this.stencils,"register",this,function(_2){
var c1,c2,c3,c4,c5,_3=this;
var _4=function(){
c1=_2.container.connect("onmousedown",function(_5){
_5.superTarget=_2;
_3.mouse.down(_5);
});
};
_4();
c2=dojo.connect(_2,"setTransform",this,function(){
});
c3=dojo.connect(_2,"onBeforeRender",function(){
});
c4=dojo.connect(_2,"onRender",this,function(){
});
c5=dojo.connect(_2,"destroy",this,function(){
dojo.forEach([c1,c2,c3,c4,c5],dojo.disconnect,dojo);
});
});
dojo.connect(this.anchors,"onAddAnchor",this,function(_6){
var c1=_6.shape.connect("onmousedown",this.mouse,function(_7){
_7.superTarget=_6;
this.down(_7);
});
var c2=dojo.connect(_6,"disconnectMouse",this,function(){
dojo.disconnect(c1);
dojo.disconnect(c2);
});
});
this.mouse._down=function(_8){
var _9=this._getXY(_8);
var x=_9.x-this.origin.x;
var y=_9.y-this.origin.y;
x*=this.zoom;
y*=this.zoom;
this.origin.startx=x;
this.origin.starty=y;
this._lastx=x;
this._lasty=y;
this.drawingType=this.util.attr(_8,"drawingType")||"";
var id=this._getId(_8);
var _a={x:x,y:y,id:id};
this.onDown(_a);
this._clickTime=new Date().getTime();
if(this._lastClickTime){
if(this._clickTime-this._lastClickTime<this.doublClickSpeed){
var _b=this.eventName("doubleClick");
console.warn("DOUBLE CLICK",_b,_a);
this._broadcastEvent(_b,_a);
}else{
}
}
this._lastClickTime=this._clickTime;
};
this.mouse.down=function(_c){
clearTimeout(this.__downInv);
if(this.util.attr(_c,"drawingType")=="surface"){
this.__downInv=setTimeout(dojo.hitch(this,function(){
this._down(_c);
}),500);
return;
}
this._down(_c);
};
this.mouse._getXY=function(_d){
if(_d.pageX){
return {x:_d.pageX,y:_d.pageY,cancelBubble:true};
}
for(var nm in _d){
}
if(_d.x!==undefined){
return {x:_d.x+this.origin.x,y:_d.y+this.origin.y};
}else{
return {x:_d.pageX,y:_d.pageY};
}
};
this.mouse._getId=function(_e){
return this.util.attr(_e,"id");
};
this.util.attr=function(_f,_10,_11,_12){
if(!_f){
return false;
}
try{
var t;
if(_f.superTarget){
t=_f.superTarget;
}else{
if(_f.superClass){
t=_f.superClass;
}else{
if(_f.target){
t=_f.target;
}else{
t=_f;
}
}
}
if(_11!==undefined){
_f[_10]=_11;
return _11;
}
if(t.tagName){
if(_10=="drawingType"&&t.tagName.toLowerCase()=="object"){
return "surface";
}
var r=dojo.attr(t,_10);
}
var r=t[_10];
return r;
}
catch(e){
if(!_12){
}
return false;
}
};
},{});
}
