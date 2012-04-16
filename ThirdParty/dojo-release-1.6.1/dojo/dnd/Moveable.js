/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.dnd.Moveable"]){
dojo._hasResource["dojo.dnd.Moveable"]=true;
dojo.provide("dojo.dnd.Moveable");
dojo.require("dojo.dnd.Mover");
dojo.declare("dojo.dnd.Moveable",null,{handle:"",delay:0,skip:false,constructor:function(_1,_2){
this.node=dojo.byId(_1);
if(!_2){
_2={};
}
this.handle=_2.handle?dojo.byId(_2.handle):null;
if(!this.handle){
this.handle=this.node;
}
this.delay=_2.delay>0?_2.delay:0;
this.skip=_2.skip;
this.mover=_2.mover?_2.mover:dojo.dnd.Mover;
this.events=[dojo.connect(this.handle,"onmousedown",this,"onMouseDown"),dojo.connect(this.handle,"ontouchstart",this,"onMouseDown"),dojo.connect(this.handle,"ondragstart",this,"onSelectStart"),dojo.connect(this.handle,"onselectstart",this,"onSelectStart")];
},markupFactory:function(_3,_4){
return new dojo.dnd.Moveable(_4,_3);
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
this.events=this.node=this.handle=null;
},onMouseDown:function(e){
if(this.skip&&dojo.dnd.isFormElement(e)){
return;
}
if(this.delay){
this.events.push(dojo.connect(this.handle,"onmousemove",this,"onMouseMove"),dojo.connect(this.handle,"ontouchmove",this,"onMouseMove"),dojo.connect(this.handle,"onmouseup",this,"onMouseUp"),dojo.connect(this.handle,"ontouchend",this,"onMouseUp"));
var _5=e.touches?e.touches[0]:e;
this._lastX=_5.pageX;
this._lastY=_5.pageY;
}else{
this.onDragDetected(e);
}
dojo.stopEvent(e);
},onMouseMove:function(e){
var _6=e.touches?e.touches[0]:e;
if(Math.abs(_6.pageX-this._lastX)>this.delay||Math.abs(_6.pageY-this._lastY)>this.delay){
this.onMouseUp(e);
this.onDragDetected(e);
}
dojo.stopEvent(e);
},onMouseUp:function(e){
for(var i=0;i<2;++i){
dojo.disconnect(this.events.pop());
}
dojo.stopEvent(e);
},onSelectStart:function(e){
if(!this.skip||!dojo.dnd.isFormElement(e)){
dojo.stopEvent(e);
}
},onDragDetected:function(e){
new this.mover(this.node,e,this);
},onMoveStart:function(_7){
dojo.publish("/dnd/move/start",[_7]);
dojo.addClass(dojo.body(),"dojoMove");
dojo.addClass(this.node,"dojoMoveItem");
},onMoveStop:function(_8){
dojo.publish("/dnd/move/stop",[_8]);
dojo.removeClass(dojo.body(),"dojoMove");
dojo.removeClass(this.node,"dojoMoveItem");
},onFirstMove:function(_9,e){
},onMove:function(_a,_b,e){
this.onMoving(_a,_b);
var s=_a.node.style;
s.left=_b.l+"px";
s.top=_b.t+"px";
this.onMoved(_a,_b);
},onMoving:function(_c,_d){
},onMoved:function(_e,_f){
}});
}
