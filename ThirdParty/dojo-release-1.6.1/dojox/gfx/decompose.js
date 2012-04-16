/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.decompose"]){
dojo._hasResource["dojox.gfx.decompose"]=true;
dojo.provide("dojox.gfx.decompose");
dojo.require("dojox.gfx.matrix");
(function(){
var m=dojox.gfx.matrix;
function eq(a,b){
return Math.abs(a-b)<=0.000001*(Math.abs(a)+Math.abs(b));
};
function _1(r1,m1,r2,m2){
if(!isFinite(r1)){
return r2;
}else{
if(!isFinite(r2)){
return r1;
}
}
m1=Math.abs(m1),m2=Math.abs(m2);
return (m1*r1+m2*r2)/(m1+m2);
};
function _2(_3){
var M=new m.Matrix2D(_3);
return dojo.mixin(M,{dx:0,dy:0,xy:M.yx,yx:M.xy});
};
function _4(_5){
return (_5.xx*_5.yy<0||_5.xy*_5.yx>0)?-1:1;
};
function _6(_7){
var M=m.normalize(_7),b=-M.xx-M.yy,c=M.xx*M.yy-M.xy*M.yx,d=Math.sqrt(b*b-4*c),l1=-(b+(b<0?-d:d))/2,l2=c/l1,_8=M.xy/(l1-M.xx),_9=1,_a=M.xy/(l2-M.xx),_b=1;
if(eq(l1,l2)){
_8=1,_9=0,_a=0,_b=1;
}
if(!isFinite(_8)){
_8=1,_9=(l1-M.xx)/M.xy;
if(!isFinite(_9)){
_8=(l1-M.yy)/M.yx,_9=1;
if(!isFinite(_8)){
_8=1,_9=M.yx/(l1-M.yy);
}
}
}
if(!isFinite(_a)){
_a=1,_b=(l2-M.xx)/M.xy;
if(!isFinite(_b)){
_a=(l2-M.yy)/M.yx,_b=1;
if(!isFinite(_a)){
_a=1,_b=M.yx/(l2-M.yy);
}
}
}
var d1=Math.sqrt(_8*_8+_9*_9),d2=Math.sqrt(_a*_a+_b*_b);
if(!isFinite(_8/=d1)){
_8=0;
}
if(!isFinite(_9/=d1)){
_9=0;
}
if(!isFinite(_a/=d2)){
_a=0;
}
if(!isFinite(_b/=d2)){
_b=0;
}
return {value1:l1,value2:l2,vector1:{x:_8,y:_9},vector2:{x:_a,y:_b}};
};
function _c(M,_d){
var _e=_4(M),a=_d.angle1=(Math.atan2(M.yx,M.yy)+Math.atan2(-_e*M.xy,_e*M.xx))/2,_f=Math.cos(a),sin=Math.sin(a);
_d.sx=_1(M.xx/_f,_f,-M.xy/sin,sin);
_d.sy=_1(M.yy/_f,_f,M.yx/sin,sin);
return _d;
};
function _10(M,_11){
var _12=_4(M),a=_11.angle2=(Math.atan2(_12*M.yx,_12*M.xx)+Math.atan2(-M.xy,M.yy))/2,cos=Math.cos(a),sin=Math.sin(a);
_11.sx=_1(M.xx/cos,cos,M.yx/sin,sin);
_11.sy=_1(M.yy/cos,cos,-M.xy/sin,sin);
return _11;
};
dojox.gfx.decompose=function(_13){
var M=m.normalize(_13),_14={dx:M.dx,dy:M.dy,sx:1,sy:1,angle1:0,angle2:0};
if(eq(M.xy,0)&&eq(M.yx,0)){
return dojo.mixin(_14,{sx:M.xx,sy:M.yy});
}
if(eq(M.xx*M.yx,-M.xy*M.yy)){
return _c(M,_14);
}
if(eq(M.xx*M.xy,-M.yx*M.yy)){
return _10(M,_14);
}
var MT=_2(M),u=_6([M,MT]),v=_6([MT,M]),U=new m.Matrix2D({xx:u.vector1.x,xy:u.vector2.x,yx:u.vector1.y,yy:u.vector2.y}),VT=new m.Matrix2D({xx:v.vector1.x,xy:v.vector1.y,yx:v.vector2.x,yy:v.vector2.y}),S=new m.Matrix2D([m.invert(U),M,m.invert(VT)]);
_c(VT,_14);
S.xx*=_14.sx;
S.yy*=_14.sy;
_10(U,_14);
S.xx*=_14.sx;
S.yy*=_14.sy;
return dojo.mixin(_14,{sx:S.xx,sy:S.yy});
};
})();
}
