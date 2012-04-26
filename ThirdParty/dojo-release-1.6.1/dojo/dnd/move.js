/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.dnd.move"]){
dojo._hasResource["dojo.dnd.move"]=true;
dojo.provide("dojo.dnd.move");
dojo.require("dojo.dnd.Mover");
dojo.require("dojo.dnd.Moveable");
dojo.declare("dojo.dnd.move.constrainedMoveable",dojo.dnd.Moveable,{constraints:function(){
},within:false,markupFactory:function(_1,_2){
return new dojo.dnd.move.constrainedMoveable(_2,_1);
},constructor:function(_3,_4){
if(!_4){
_4={};
}
this.constraints=_4.constraints;
this.within=_4.within;
},onFirstMove:function(_5){
var c=this.constraintBox=this.constraints.call(this,_5);
c.r=c.l+c.w;
c.b=c.t+c.h;
if(this.within){
var mb=dojo._getMarginSize(_5.node);
c.r-=mb.w;
c.b-=mb.h;
}
},onMove:function(_6,_7){
var c=this.constraintBox,s=_6.node.style;
this.onMoving(_6,_7);
_7.l=_7.l<c.l?c.l:c.r<_7.l?c.r:_7.l;
_7.t=_7.t<c.t?c.t:c.b<_7.t?c.b:_7.t;
s.left=_7.l+"px";
s.top=_7.t+"px";
this.onMoved(_6,_7);
}});
dojo.declare("dojo.dnd.move.boxConstrainedMoveable",dojo.dnd.move.constrainedMoveable,{box:{},markupFactory:function(_8,_9){
return new dojo.dnd.move.boxConstrainedMoveable(_9,_8);
},constructor:function(_a,_b){
var _c=_b&&_b.box;
this.constraints=function(){
return _c;
};
}});
dojo.declare("dojo.dnd.move.parentConstrainedMoveable",dojo.dnd.move.constrainedMoveable,{area:"content",markupFactory:function(_d,_e){
return new dojo.dnd.move.parentConstrainedMoveable(_e,_d);
},constructor:function(_f,_10){
var _11=_10&&_10.area;
this.constraints=function(){
var n=this.node.parentNode,s=dojo.getComputedStyle(n),mb=dojo._getMarginBox(n,s);
if(_11=="margin"){
return mb;
}
var t=dojo._getMarginExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
if(_11=="border"){
return mb;
}
t=dojo._getBorderExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
if(_11=="padding"){
return mb;
}
t=dojo._getPadExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
return mb;
};
}});
dojo.dnd.constrainedMover=dojo.dnd.move.constrainedMover;
dojo.dnd.boxConstrainedMover=dojo.dnd.move.boxConstrainedMover;
dojo.dnd.parentConstrainedMover=dojo.dnd.move.parentConstrainedMover;
}
