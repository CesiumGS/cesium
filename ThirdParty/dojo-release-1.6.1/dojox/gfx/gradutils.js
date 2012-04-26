/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.gradutils"]){
dojo._hasResource["dojox.gfx.gradutils"]=true;
dojo.provide("dojox.gfx.gradutils");
dojo.require("dojox.gfx.matrix");
(function(){
var d=dojo,m=dojox.gfx.matrix,C=d.Color;
function _1(o,c){
if(o<=0){
return c[0].color;
}
var _2=c.length;
if(o>=1){
return c[_2-1].color;
}
for(var i=0;i<_2;++i){
var _3=c[i];
if(_3.offset>=o){
if(i){
var _4=c[i-1];
return d.blendColors(new C(_4.color),new C(_3.color),(o-_4.offset)/(_3.offset-_4.offset));
}
return _3.color;
}
}
return c[_2-1].color;
};
dojox.gfx.gradutils.getColor=function(_5,pt){
var o;
if(_5){
switch(_5.type){
case "linear":
var _6=Math.atan2(_5.y2-_5.y1,_5.x2-_5.x1),_7=m.rotate(-_6),_8=m.project(_5.x2-_5.x1,_5.y2-_5.y1),p=m.multiplyPoint(_8,pt),_9=m.multiplyPoint(_8,_5.x1,_5.y1),_a=m.multiplyPoint(_8,_5.x2,_5.y2),_b=m.multiplyPoint(_7,_a.x-_9.x,_a.y-_9.y).x,o=m.multiplyPoint(_7,p.x-_9.x,p.y-_9.y).x/_b;
break;
case "radial":
var dx=pt.x-_5.cx,dy=pt.y-_5.cy,o=Math.sqrt(dx*dx+dy*dy)/_5.r;
break;
}
return _1(o,_5.colors);
}
return new C(_5||[0,0,0,0]);
};
dojox.gfx.gradutils.reverse=function(_c){
if(_c){
switch(_c.type){
case "linear":
case "radial":
_c=dojo.delegate(_c);
if(_c.colors){
var c=_c.colors,l=c.length,i=0,_d,n=_c.colors=new Array(c.length);
for(;i<l;++i){
_d=c[i];
n[i]={offset:1-_d.offset,color:_d.color};
}
n.sort(function(a,b){
return a.offset-b.offset;
});
}
break;
}
}
return _c;
};
})();
}
