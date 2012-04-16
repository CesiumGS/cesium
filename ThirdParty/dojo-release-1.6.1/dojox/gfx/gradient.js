/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.gradient"]){
dojo._hasResource["dojox.gfx.gradient"]=true;
dojo.provide("dojox.gfx.gradient");
dojo.require("dojox.gfx.matrix");
(function(){
var d=dojo,m=dojox.gfx.matrix,C=d.Color;
dojox.gfx.gradient.rescale=function(_1,_2,to){
var _3=_1.length,_4=(to<_2),_5;
if(_4){
var _6=_2;
_2=to;
to=_6;
}
if(!_3){
return [];
}
if(to<=_1[0].offset){
_5=[{offset:0,color:_1[0].color},{offset:1,color:_1[0].color}];
}else{
if(_2>=_1[_3-1].offset){
_5=[{offset:0,color:_1[_3-1].color},{offset:1,color:_1[_3-1].color}];
}else{
var _7=to-_2,_8,_9,i;
_5=[];
if(_2<0){
_5.push({offset:0,color:new C(_1[0].color)});
}
for(i=0;i<_3;++i){
_8=_1[i];
if(_8.offset>=_2){
break;
}
}
if(i){
_9=_1[i-1];
_5.push({offset:0,color:d.blendColors(new C(_9.color),new C(_8.color),(_2-_9.offset)/(_8.offset-_9.offset))});
}else{
_5.push({offset:0,color:new C(_8.color)});
}
for(;i<_3;++i){
_8=_1[i];
if(_8.offset>=to){
break;
}
_5.push({offset:(_8.offset-_2)/_7,color:new C(_8.color)});
}
if(i<_3){
_9=_1[i-1];
_5.push({offset:1,color:d.blendColors(new C(_9.color),new C(_8.color),(to-_9.offset)/(_8.offset-_9.offset))});
}else{
_5.push({offset:1,color:new C(_1[_3-1].color)});
}
}
}
if(_4){
_5.reverse();
for(i=0,_3=_5.length;i<_3;++i){
_8=_5[i];
_8.offset=1-_8.offset;
}
}
return _5;
};
function _a(x,y,_b,_c,_d,_e){
var r=m.multiplyPoint(_b,x,y),p=m.multiplyPoint(_c,r);
return {r:r,p:p,o:m.multiplyPoint(_d,p).x/_e};
};
function _f(a,b){
return a.o-b.o;
};
dojox.gfx.gradient.project=function(_10,_11,tl,rb,ttl,trb){
_10=_10||m.identity;
var f1=m.multiplyPoint(_10,_11.x1,_11.y1),f2=m.multiplyPoint(_10,_11.x2,_11.y2),_12=Math.atan2(f2.y-f1.y,f2.x-f1.x),_13=m.project(f2.x-f1.x,f2.y-f1.y),pf1=m.multiplyPoint(_13,f1),pf2=m.multiplyPoint(_13,f2),_14=new m.Matrix2D([m.rotate(-_12),{dx:-pf1.x,dy:-pf1.y}]),_15=m.multiplyPoint(_14,pf2).x,_16=[_a(tl.x,tl.y,_10,_13,_14,_15),_a(rb.x,rb.y,_10,_13,_14,_15),_a(tl.x,rb.y,_10,_13,_14,_15),_a(rb.x,tl.y,_10,_13,_14,_15)].sort(_f),_17=_16[0].o,to=_16[3].o,_18=dojox.gfx.gradient.rescale(_11.colors,_17,to),_19=Math.atan2(_16[3].r.y-_16[0].r.y,_16[3].r.x-_16[0].r.x);
return {type:"linear",x1:_16[0].p.x,y1:_16[0].p.y,x2:_16[3].p.x,y2:_16[3].p.y,colors:_18,angle:_12};
};
})();
}
