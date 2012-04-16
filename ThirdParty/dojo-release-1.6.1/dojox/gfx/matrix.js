/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.matrix"]){
dojo._hasResource["dojox.gfx.matrix"]=true;
dojo.provide("dojox.gfx.matrix");
(function(){
var m=dojox.gfx.matrix;
var _1={};
m._degToRad=function(_2){
return _1[_2]||(_1[_2]=(Math.PI*_2/180));
};
m._radToDeg=function(_3){
return _3/Math.PI*180;
};
m.Matrix2D=function(_4){
if(_4){
if(typeof _4=="number"){
this.xx=this.yy=_4;
}else{
if(_4 instanceof Array){
if(_4.length>0){
var _5=m.normalize(_4[0]);
for(var i=1;i<_4.length;++i){
var l=_5,r=dojox.gfx.matrix.normalize(_4[i]);
_5=new m.Matrix2D();
_5.xx=l.xx*r.xx+l.xy*r.yx;
_5.xy=l.xx*r.xy+l.xy*r.yy;
_5.yx=l.yx*r.xx+l.yy*r.yx;
_5.yy=l.yx*r.xy+l.yy*r.yy;
_5.dx=l.xx*r.dx+l.xy*r.dy+l.dx;
_5.dy=l.yx*r.dx+l.yy*r.dy+l.dy;
}
dojo.mixin(this,_5);
}
}else{
dojo.mixin(this,_4);
}
}
}
};
dojo.extend(m.Matrix2D,{xx:1,xy:0,yx:0,yy:1,dx:0,dy:0});
dojo.mixin(m,{identity:new m.Matrix2D(),flipX:new m.Matrix2D({xx:-1}),flipY:new m.Matrix2D({yy:-1}),flipXY:new m.Matrix2D({xx:-1,yy:-1}),translate:function(a,b){
if(arguments.length>1){
return new m.Matrix2D({dx:a,dy:b});
}
return new m.Matrix2D({dx:a.x,dy:a.y});
},scale:function(a,b){
if(arguments.length>1){
return new m.Matrix2D({xx:a,yy:b});
}
if(typeof a=="number"){
return new m.Matrix2D({xx:a,yy:a});
}
return new m.Matrix2D({xx:a.x,yy:a.y});
},rotate:function(_6){
var c=Math.cos(_6);
var s=Math.sin(_6);
return new m.Matrix2D({xx:c,xy:-s,yx:s,yy:c});
},rotateg:function(_7){
return m.rotate(m._degToRad(_7));
},skewX:function(_8){
return new m.Matrix2D({xy:Math.tan(_8)});
},skewXg:function(_9){
return m.skewX(m._degToRad(_9));
},skewY:function(_a){
return new m.Matrix2D({yx:Math.tan(_a)});
},skewYg:function(_b){
return m.skewY(m._degToRad(_b));
},reflect:function(a,b){
if(arguments.length==1){
b=a.y;
a=a.x;
}
var a2=a*a,b2=b*b,n2=a2+b2,xy=2*a*b/n2;
return new m.Matrix2D({xx:2*a2/n2-1,xy:xy,yx:xy,yy:2*b2/n2-1});
},project:function(a,b){
if(arguments.length==1){
b=a.y;
a=a.x;
}
var a2=a*a,b2=b*b,n2=a2+b2,xy=a*b/n2;
return new m.Matrix2D({xx:a2/n2,xy:xy,yx:xy,yy:b2/n2});
},normalize:function(_c){
return (_c instanceof m.Matrix2D)?_c:new m.Matrix2D(_c);
},clone:function(_d){
var _e=new m.Matrix2D();
for(var i in _d){
if(typeof (_d[i])=="number"&&typeof (_e[i])=="number"&&_e[i]!=_d[i]){
_e[i]=_d[i];
}
}
return _e;
},invert:function(_f){
var M=m.normalize(_f),D=M.xx*M.yy-M.xy*M.yx,M=new m.Matrix2D({xx:M.yy/D,xy:-M.xy/D,yx:-M.yx/D,yy:M.xx/D,dx:(M.xy*M.dy-M.yy*M.dx)/D,dy:(M.yx*M.dx-M.xx*M.dy)/D});
return M;
},_multiplyPoint:function(_10,x,y){
return {x:_10.xx*x+_10.xy*y+_10.dx,y:_10.yx*x+_10.yy*y+_10.dy};
},multiplyPoint:function(_11,a,b){
var M=m.normalize(_11);
if(typeof a=="number"&&typeof b=="number"){
return m._multiplyPoint(M,a,b);
}
return m._multiplyPoint(M,a.x,a.y);
},multiply:function(_12){
var M=m.normalize(_12);
for(var i=1;i<arguments.length;++i){
var l=M,r=m.normalize(arguments[i]);
M=new m.Matrix2D();
M.xx=l.xx*r.xx+l.xy*r.yx;
M.xy=l.xx*r.xy+l.xy*r.yy;
M.yx=l.yx*r.xx+l.yy*r.yx;
M.yy=l.yx*r.xy+l.yy*r.yy;
M.dx=l.xx*r.dx+l.xy*r.dy+l.dx;
M.dy=l.yx*r.dx+l.yy*r.dy+l.dy;
}
return M;
},_sandwich:function(_13,x,y){
return m.multiply(m.translate(x,y),_13,m.translate(-x,-y));
},scaleAt:function(a,b,c,d){
switch(arguments.length){
case 4:
return m._sandwich(m.scale(a,b),c,d);
case 3:
if(typeof c=="number"){
return m._sandwich(m.scale(a),b,c);
}
return m._sandwich(m.scale(a,b),c.x,c.y);
}
return m._sandwich(m.scale(a),b.x,b.y);
},rotateAt:function(_14,a,b){
if(arguments.length>2){
return m._sandwich(m.rotate(_14),a,b);
}
return m._sandwich(m.rotate(_14),a.x,a.y);
},rotategAt:function(_15,a,b){
if(arguments.length>2){
return m._sandwich(m.rotateg(_15),a,b);
}
return m._sandwich(m.rotateg(_15),a.x,a.y);
},skewXAt:function(_16,a,b){
if(arguments.length>2){
return m._sandwich(m.skewX(_16),a,b);
}
return m._sandwich(m.skewX(_16),a.x,a.y);
},skewXgAt:function(_17,a,b){
if(arguments.length>2){
return m._sandwich(m.skewXg(_17),a,b);
}
return m._sandwich(m.skewXg(_17),a.x,a.y);
},skewYAt:function(_18,a,b){
if(arguments.length>2){
return m._sandwich(m.skewY(_18),a,b);
}
return m._sandwich(m.skewY(_18),a.x,a.y);
},skewYgAt:function(_19,a,b){
if(arguments.length>2){
return m._sandwich(m.skewYg(_19),a,b);
}
return m._sandwich(m.skewYg(_19),a.x,a.y);
}});
})();
dojox.gfx.Matrix2D=dojox.gfx.matrix.Matrix2D;
}
