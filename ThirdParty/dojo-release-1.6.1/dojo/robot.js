/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.robot"]){
dojo._hasResource["dojo.robot"]=true;
dojo.provide("dojo.robot");
dojo.require("doh.robot");
dojo.require("dojo.window");
dojo.experimental("dojo.robot");
(function(){
dojo.mixin(doh.robot,{_resolveNode:function(n){
if(typeof n=="function"){
n=n();
}
return n?dojo.byId(n):null;
},_scrollIntoView:function(n){
var d=dojo,dr=doh.robot,p=null;
d.forEach(dr._getWindowChain(n),function(w){
d.withGlobal(w,function(){
var p2=d.position(n,false),b=d._getPadBorderExtents(n),_1=null;
if(!p){
p=p2;
}else{
_1=p;
p={x:p.x+p2.x+b.l,y:p.y+p2.y+b.t,w:p.w,h:p.h};
}
dojo.window.scrollIntoView(n,p);
p2=d.position(n,false);
if(!_1){
p=p2;
}else{
p={x:_1.x+p2.x+b.l,y:_1.y+p2.y+b.t,w:p.w,h:p.h};
}
n=w.frameElement;
});
});
},_position:function(n){
var d=dojo,p=null,M=Math.max,m=Math.min;
d.forEach(doh.robot._getWindowChain(n),function(w){
d.withGlobal(w,function(){
var p2=d.position(n,false),b=d._getPadBorderExtents(n);
if(!p){
p=p2;
}else{
var _2;
d.withGlobal(n.contentWindow,function(){
_2=dojo.window.getBox();
});
p2.r=p2.x+_2.w;
p2.b=p2.y+_2.h;
p={x:M(p.x+p2.x,p2.x)+b.l,y:M(p.y+p2.y,p2.y)+b.t,r:m(p.x+p2.x+p.w,p2.r)+b.l,b:m(p.y+p2.y+p.h,p2.b)+b.t};
p.w=p.r-p.x;
p.h=p.b-p.y;
}
n=w.frameElement;
});
});
return p;
},_getWindowChain:function(n){
var cW=dojo.window.get(n.ownerDocument);
var _3=[cW];
var f=cW.frameElement;
return (cW==dojo.global||f==null)?_3:_3.concat(doh.robot._getWindowChain(f));
},scrollIntoView:function(_4,_5){
doh.robot.sequence(function(){
doh.robot._scrollIntoView(doh.robot._resolveNode(_4));
},_5);
},mouseMoveAt:function(_6,_7,_8,_9,_a){
doh.robot._assertRobot();
_8=_8||100;
this.sequence(function(){
_6=doh.robot._resolveNode(_6);
doh.robot._scrollIntoView(_6);
var _b=doh.robot._position(_6);
if(_a===undefined){
_9=_b.w/2;
_a=_b.h/2;
}
var x=_b.x+_9;
var y=_b.y+_a;
doh.robot._mouseMove(x,y,false,_8);
},_7,_8);
}});
})();
}
