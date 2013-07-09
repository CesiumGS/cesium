/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/Moveable",["../_base/array","../_base/declare","../_base/lang","../dom","../dom-class","../Evented","../on","../topic","../touch","./common","./Mover","../_base/window"],function(_1,_2,_3,_4,_5,_6,on,_7,_8,_9,_a,_b){
var _c=_2("dojo.dnd.Moveable",[_6],{handle:"",delay:0,skip:false,constructor:function(_d,_e){
this.node=_4.byId(_d);
if(!_e){
_e={};
}
this.handle=_e.handle?_4.byId(_e.handle):null;
if(!this.handle){
this.handle=this.node;
}
this.delay=_e.delay>0?_e.delay:0;
this.skip=_e.skip;
this.mover=_e.mover?_e.mover:_a;
this.events=[on(this.handle,_8.press,_3.hitch(this,"onMouseDown")),on(this.handle,"dragstart",_3.hitch(this,"onSelectStart")),on(this.handle,"selectstart",_3.hitch(this,"onSelectStart"))];
},markupFactory:function(_f,_10,_11){
return new _11(_10,_f);
},destroy:function(){
_1.forEach(this.events,function(_12){
_12.remove();
});
this.events=this.node=this.handle=null;
},onMouseDown:function(e){
if(this.skip&&_9.isFormElement(e)){
return;
}
if(this.delay){
this.events.push(on(this.handle,_8.move,_3.hitch(this,"onMouseMove")),on(this.handle,_8.release,_3.hitch(this,"onMouseUp")));
this._lastX=e.pageX;
this._lastY=e.pageY;
}else{
this.onDragDetected(e);
}
e.stopPropagation();
e.preventDefault();
},onMouseMove:function(e){
if(Math.abs(e.pageX-this._lastX)>this.delay||Math.abs(e.pageY-this._lastY)>this.delay){
this.onMouseUp(e);
this.onDragDetected(e);
}
e.stopPropagation();
e.preventDefault();
},onMouseUp:function(e){
for(var i=0;i<2;++i){
this.events.pop().remove();
}
e.stopPropagation();
e.preventDefault();
},onSelectStart:function(e){
if(!this.skip||!_9.isFormElement(e)){
e.stopPropagation();
e.preventDefault();
}
},onDragDetected:function(e){
new this.mover(this.node,e,this);
},onMoveStart:function(_13){
_7.publish("/dnd/move/start",_13);
_5.add(_b.body(),"dojoMove");
_5.add(this.node,"dojoMoveItem");
},onMoveStop:function(_14){
_7.publish("/dnd/move/stop",_14);
_5.remove(_b.body(),"dojoMove");
_5.remove(this.node,"dojoMoveItem");
},onFirstMove:function(){
},onMove:function(_15,_16){
this.onMoving(_15,_16);
var s=_15.node.style;
s.left=_16.l+"px";
s.top=_16.t+"px";
this.onMoved(_15,_16);
},onMoving:function(){
},onMoved:function(){
}});
return _c;
});
