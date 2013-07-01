/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/move",["../_base/declare","../dom-geometry","../dom-style","./common","./Mover","./Moveable"],function(_1,_2,_3,_4,_5,_6){
var _7=_1("dojo.dnd.move.constrainedMoveable",_6,{constraints:function(){
},within:false,constructor:function(_8,_9){
if(!_9){
_9={};
}
this.constraints=_9.constraints;
this.within=_9.within;
},onFirstMove:function(_a){
var c=this.constraintBox=this.constraints.call(this,_a);
c.r=c.l+c.w;
c.b=c.t+c.h;
if(this.within){
var mb=_2.getMarginSize(_a.node);
c.r-=mb.w;
c.b-=mb.h;
}
},onMove:function(_b,_c){
var c=this.constraintBox,s=_b.node.style;
this.onMoving(_b,_c);
_c.l=_c.l<c.l?c.l:c.r<_c.l?c.r:_c.l;
_c.t=_c.t<c.t?c.t:c.b<_c.t?c.b:_c.t;
s.left=_c.l+"px";
s.top=_c.t+"px";
this.onMoved(_b,_c);
}});
var _d=_1("dojo.dnd.move.boxConstrainedMoveable",_7,{box:{},constructor:function(_e,_f){
var box=_f&&_f.box;
this.constraints=function(){
return box;
};
}});
var _10=_1("dojo.dnd.move.parentConstrainedMoveable",_7,{area:"content",constructor:function(_11,_12){
var _13=_12&&_12.area;
this.constraints=function(){
var n=this.node.parentNode,s=_3.getComputedStyle(n),mb=_2.getMarginBox(n,s);
if(_13=="margin"){
return mb;
}
var t=_2.getMarginExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
if(_13=="border"){
return mb;
}
t=_2.getBorderExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
if(_13=="padding"){
return mb;
}
t=_2.getPadExtents(n,s);
mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;
return mb;
};
}});
return {constrainedMoveable:_7,boxConstrainedMoveable:_d,parentConstrainedMoveable:_10};
});
