/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.rotator.Slide"]){
dojo._hasResource["dojox.widget.rotator.Slide"]=true;
dojo.provide("dojox.widget.rotator.Slide");
(function(d){
var _1=0,_2=1,UP=2,_3=3;
function _4(_5,_6){
var _7=_6.node=_6.next.node,r=_6.rotatorBox,m=_5%2,s=(m?r.w:r.h)*(_5<2?-1:1);
d.style(_7,{display:"",zIndex:(d.style(_6.current.node,"zIndex")||1)+1});
if(!_6.properties){
_6.properties={};
}
_6.properties[m?"left":"top"]={start:s,end:0};
return d.animateProperty(_6);
};
d.mixin(dojox.widget.rotator,{slideDown:function(_8){
return _4(_1,_8);
},slideRight:function(_9){
return _4(_2,_9);
},slideUp:function(_a){
return _4(UP,_a);
},slideLeft:function(_b){
return _4(_3,_b);
}});
})(dojo);
}
