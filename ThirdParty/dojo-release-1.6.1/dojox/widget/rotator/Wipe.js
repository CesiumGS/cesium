/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.rotator.Wipe"]){
dojo._hasResource["dojox.widget.rotator.Wipe"]=true;
dojo.provide("dojox.widget.rotator.Wipe");
(function(d){
var _1=2,_2=3,UP=0,_3=1;
function _4(_5,w,h,x){
var a=[0,w,0,0];
if(_5==_2){
a=[0,w,h,w];
}else{
if(_5==UP){
a=[h,w,h,0];
}else{
if(_5==_3){
a=[0,0,h,0];
}
}
}
if(x!=null){
a[_5]=_5==_1||_5==_3?x:(_5%2?w:h)-x;
}
return a;
};
function _6(n,_7,w,h,x){
d.style(n,"clip",_7==null?"auto":"rect("+_4(_7,w,h,x).join("px,")+"px)");
};
function _8(_9,_a){
var _b=_a.next.node,w=_a.rotatorBox.w,h=_a.rotatorBox.h;
d.style(_b,{display:"",zIndex:(d.style(_a.current.node,"zIndex")||1)+1});
_6(_b,_9,w,h);
return new d.Animation(d.mixin({node:_b,curve:[0,_9%2?w:h],onAnimate:function(x){
_6(_b,_9,w,h,parseInt(x));
}},_a));
};
d.mixin(dojox.widget.rotator,{wipeDown:function(_c){
return _8(_1,_c);
},wipeRight:function(_d){
return _8(_2,_d);
},wipeUp:function(_e){
return _8(UP,_e);
},wipeLeft:function(_f){
return _8(_3,_f);
}});
})(dojo);
}
