/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.Moveable"]){
dojo._hasResource["dojox.mdnd.Moveable"]=true;
dojo.provide("dojox.mdnd.Moveable");
dojo.declare("dojox.mdnd.Moveable",null,{handle:null,skip:true,dragDistance:3,constructor:function(_1,_2){
this.node=dojo.byId(_2);
this.d=this.node.ownerDocument;
if(!_1){
_1={};
}
this.handle=_1.handle?dojo.byId(_1.handle):null;
if(!this.handle){
this.handle=this.node;
}
this.skip=_1.skip;
this.events=[dojo.connect(this.handle,"onmousedown",this,"onMouseDown")];
if(dojox.mdnd.autoScroll){
this.autoScroll=dojox.mdnd.autoScroll;
}
},isFormElement:function(e){
var t=e.target;
if(t.nodeType==3){
t=t.parentNode;
}
return " a button textarea input select option ".indexOf(" "+t.tagName.toLowerCase()+" ")>=0;
},onMouseDown:function(e){
if(this._isDragging){
return;
}
var _3=dojo.isIE?(e.button==1):(e.which==1);
if(!_3){
return;
}
if(this.skip&&this.isFormElement(e)){
return;
}
if(this.autoScroll){
this.autoScroll.setAutoScrollNode(this.node);
this.autoScroll.setAutoScrollMaxPage();
}
this.events.push(dojo.connect(this.d,"onmouseup",this,"onMouseUp"));
this.events.push(dojo.connect(this.d,"onmousemove",this,"onFirstMove"));
this._selectStart=dojo.connect(dojo.body(),"onselectstart",dojo.stopEvent);
this._firstX=e.clientX;
this._firstY=e.clientY;
dojo.stopEvent(e);
},onFirstMove:function(e){
dojo.stopEvent(e);
var d=(this._firstX-e.clientX)*(this._firstX-e.clientX)+(this._firstY-e.clientY)*(this._firstY-e.clientY);
if(d>this.dragDistance*this.dragDistance){
this._isDragging=true;
dojo.disconnect(this.events.pop());
dojo.style(this.node,"width",dojo.contentBox(this.node).w+"px");
this.initOffsetDrag(e);
this.events.push(dojo.connect(this.d,"onmousemove",this,"onMove"));
}
},initOffsetDrag:function(e){
this.offsetDrag={"l":e.pageX,"t":e.pageY};
var s=this.node.style;
var _4=dojo.position(this.node,true);
this.offsetDrag.l=_4.x-this.offsetDrag.l;
this.offsetDrag.t=_4.y-this.offsetDrag.t;
var _5={"x":_4.x,"y":_4.y};
this.size={"w":_4.w,"h":_4.h};
this.onDragStart(this.node,_5,this.size);
},onMove:function(e){
dojo.stopEvent(e);
if(dojo.isIE==8&&new Date()-this.date<20){
return;
}
if(this.autoScroll){
this.autoScroll.checkAutoScroll(e);
}
var _6={"x":this.offsetDrag.l+e.pageX,"y":this.offsetDrag.t+e.pageY};
var s=this.node.style;
s.left=_6.x+"px";
s.top=_6.y+"px";
this.onDrag(this.node,_6,this.size,{"x":e.pageX,"y":e.pageY});
if(dojo.isIE==8){
this.date=new Date();
}
},onMouseUp:function(e){
if(this._isDragging){
dojo.stopEvent(e);
this._isDragging=false;
if(this.autoScroll){
this.autoScroll.stopAutoScroll();
}
delete this.onMove;
this.onDragEnd(this.node);
this.node.focus();
}
dojo.disconnect(this.events.pop());
dojo.disconnect(this.events.pop());
},onDragStart:function(_7,_8,_9){
},onDragEnd:function(_a){
},onDrag:function(_b,_c,_d,_e){
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
this.events=this.node=null;
}});
}
