/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.manager.Mouse"]){
dojo._hasResource["dojox.drawing.manager.Mouse"]=true;
dojo.provide("dojox.drawing.manager.Mouse");
dojox.drawing.manager.Mouse=dojox.drawing.util.oo.declare(function(_1){
this.util=_1.util;
this.keys=_1.keys;
this.id=_1.id||this.util.uid("mouse");
this.currentNodeId="";
this.registered={};
},{doublClickSpeed:400,rightClickMenu:false,_lastx:0,_lasty:0,__reg:0,_downOnCanvas:false,init:function(_2){
this.container=_2;
this.setCanvas();
var c;
var _3=false;
dojo.connect(this.container,"rightclick",this,function(_4){
console.warn("RIGHTCLICK");
});
dojo.connect(document.body,"mousedown",this,function(_5){
});
dojo.connect(this.container,"mousedown",this,function(_6){
this.down(_6);
if(_6.button!=dojo.mouseButtons.RIGHT){
_3=true;
c=dojo.connect(document,"mousemove",this,"drag");
}
});
dojo.connect(document,"mouseup",this,function(_7){
if(_7.button!=dojo.mouseButtons.RIGHT){
dojo.disconnect(c);
_3=false;
}
this.up(_7);
});
dojo.connect(document,"mousemove",this,function(_8){
if(!_3){
this.move(_8);
}
});
dojo.connect(this.keys,"onEsc",this,function(_9){
this._dragged=false;
});
},setCanvas:function(){
var _a=dojo.coords(this.container.parentNode);
this.origin=dojo.clone(_a);
},scrollOffset:function(){
return {top:this.container.parentNode.scrollTop,left:this.container.parentNode.scrollLeft};
},resize:function(_b,_c){
if(this.origin){
this.origin.w=_b;
this.origin.h=_c;
}
},register:function(_d){
var _e=_d.id||"reg_"+(this.__reg++);
if(!this.registered[_e]){
this.registered[_e]=_d;
}
return _e;
},unregister:function(_f){
if(!this.registered[_f]){
return;
}
delete this.registered[_f];
},_broadcastEvent:function(_10,obj){
for(var nm in this.registered){
if(this.registered[nm][_10]){
this.registered[nm][_10](obj);
}
}
},onDown:function(obj){
this._broadcastEvent(this.eventName("down"),obj);
},onDrag:function(obj){
var nm=this.eventName("drag");
if(this._selected&&nm=="onDrag"){
nm="onStencilDrag";
}
this._broadcastEvent(nm,obj);
},onMove:function(obj){
this._broadcastEvent("onMove",obj);
},overName:function(obj,evt){
var nm=obj.id.split(".");
evt=evt.charAt(0).toUpperCase()+evt.substring(1);
if(nm[0]=="dojox"&&(dojox.drawing.defaults.clickable||!dojox.drawing.defaults.clickMode)){
return "onStencil"+evt;
}else{
return "on"+evt;
}
},onOver:function(obj){
this._broadcastEvent(this.overName(obj,"over"),obj);
},onOut:function(obj){
this._broadcastEvent(this.overName(obj,"out"),obj);
},onUp:function(obj){
var nm=this.eventName("up");
if(nm=="onStencilUp"){
this._selected=true;
}else{
if(this._selected&&nm=="onUp"){
nm="onStencilUp";
this._selected=false;
}
}
this._broadcastEvent(nm,obj);
if(dojox.gfx.renderer=="silverlight"){
return;
}
this._clickTime=new Date().getTime();
if(this._lastClickTime){
if(this._clickTime-this._lastClickTime<this.doublClickSpeed){
var dnm=this.eventName("doubleClick");
console.warn("DOUBLE CLICK",dnm,obj);
this._broadcastEvent(dnm,obj);
}else{
}
}
this._lastClickTime=this._clickTime;
},zoom:1,setZoom:function(_11){
this.zoom=1/_11;
},setEventMode:function(_12){
this.mode=_12?"on"+_12.charAt(0).toUpperCase()+_12.substring(1):"";
},eventName:function(_13){
_13=_13.charAt(0).toUpperCase()+_13.substring(1);
if(this.mode){
if(this.mode=="onPathEdit"){
return "on"+_13;
}
if(this.mode=="onUI"){
}
return this.mode+_13;
}else{
if(!dojox.drawing.defaults.clickable&&dojox.drawing.defaults.clickMode){
return "on"+_13;
}
var dt=!this.drawingType||this.drawingType=="surface"||this.drawingType=="canvas"?"":this.drawingType;
var t=!dt?"":dt.charAt(0).toUpperCase()+dt.substring(1);
return "on"+t+_13;
}
},up:function(evt){
this.onUp(this.create(evt));
},down:function(evt){
this._downOnCanvas=true;
var sc=this.scrollOffset();
var dim=this._getXY(evt);
this._lastpagex=dim.x;
this._lastpagey=dim.y;
var o=this.origin;
var x=dim.x-o.x+sc.left;
var y=dim.y-o.y+sc.top;
var _14=x>=0&&y>=0&&x<=o.w&&y<=o.h;
x*=this.zoom;
y*=this.zoom;
o.startx=x;
o.starty=y;
this._lastx=x;
this._lasty=y;
this.drawingType=this.util.attr(evt,"drawingType")||"";
var id=this._getId(evt);
if(this.rightClickMenu&&(evt.button==dojo.mouseButtons.RIGHT)&&this.id=="mse"){
}else{
evt.preventDefault();
dojo.stopEvent(evt);
}
this.onDown({mid:this.id,x:x,y:y,pageX:dim.x,pageY:dim.y,withinCanvas:_14,id:id});
},over:function(obj){
this.onOver(obj);
},out:function(obj){
this.onOut(obj);
},move:function(evt){
var obj=this.create(evt);
if(this.id=="MUI"){
}
if(obj.id!=this.currentNodeId){
var _15={};
for(var nm in obj){
_15[nm]=obj[nm];
}
_15.id=this.currentNodeId;
this.currentNodeId&&this.out(_15);
obj.id&&this.over(obj);
this.currentNodeId=obj.id;
}
this.onMove(obj);
},drag:function(evt){
this.onDrag(this.create(evt,true));
},create:function(evt,_16){
var sc=this.scrollOffset();
var dim=this._getXY(evt);
var _17=dim.x;
var _18=dim.y;
var o=this.origin;
var x=dim.x-o.x+sc.left;
var y=dim.y-o.y+sc.top;
var _19=x>=0&&y>=0&&x<=o.w&&y<=o.h;
x*=this.zoom;
y*=this.zoom;
var id=_19?this._getId(evt,_16):"";
var ret={mid:this.id,x:x,y:y,pageX:dim.x,pageY:dim.y,page:{x:dim.x,y:dim.y},orgX:o.x,orgY:o.y,last:{x:this._lastx,y:this._lasty},start:{x:this.origin.startx,y:this.origin.starty},move:{x:_17-this._lastpagex,y:_18-this._lastpagey},scroll:sc,id:id,withinCanvas:_19};
this._lastx=x;
this._lasty=y;
this._lastpagex=_17;
this._lastpagey=_18;
dojo.stopEvent(evt);
return ret;
},_getId:function(evt,_1a){
return this.util.attr(evt,"id",null,_1a);
},_getXY:function(evt){
return {x:evt.pageX,y:evt.pageY};
},setCursor:function(_1b,_1c){
if(!_1c){
dojo.style(this.container,"cursor",_1b);
}else{
dojo.style(_1c,"cursor",_1b);
}
}});
}
