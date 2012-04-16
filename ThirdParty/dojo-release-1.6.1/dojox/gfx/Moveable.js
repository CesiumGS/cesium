/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.Moveable"]){
dojo._hasResource["dojox.gfx.Moveable"]=true;
dojo.provide("dojox.gfx.Moveable");
dojo.require("dojox.gfx.Mover");
dojo.declare("dojox.gfx.Moveable",null,{constructor:function(_1,_2){
this.shape=_1;
this.delay=(_2&&_2.delay>0)?_2.delay:0;
this.mover=(_2&&_2.mover)?_2.mover:dojox.gfx.Mover;
this.events=[this.shape.connect("onmousedown",this,"onMouseDown")];
},destroy:function(){
dojo.forEach(this.events,this.shape.disconnect,this.shape);
this.events=this.shape=null;
},onMouseDown:function(e){
if(this.delay){
this.events.push(this.shape.connect("onmousemove",this,"onMouseMove"),this.shape.connect("onmouseup",this,"onMouseUp"));
this._lastX=e.clientX;
this._lastY=e.clientY;
}else{
new this.mover(this.shape,e,this);
}
dojo.stopEvent(e);
},onMouseMove:function(e){
if(Math.abs(e.clientX-this._lastX)>this.delay||Math.abs(e.clientY-this._lastY)>this.delay){
this.onMouseUp(e);
new this.mover(this.shape,e,this);
}
dojo.stopEvent(e);
},onMouseUp:function(e){
this.shape.disconnect(this.events.pop());
this.shape.disconnect(this.events.pop());
},onMoveStart:function(_3){
dojo.publish("/gfx/move/start",[_3]);
dojo.addClass(dojo.body(),"dojoMove");
},onMoveStop:function(_4){
dojo.publish("/gfx/move/stop",[_4]);
dojo.removeClass(dojo.body(),"dojoMove");
},onFirstMove:function(_5){
},onMove:function(_6,_7){
this.onMoving(_6,_7);
this.shape.applyLeftTransform(_7);
this.onMoved(_6,_7);
},onMoving:function(_8,_9){
},onMoved:function(_a,_b){
}});
}
