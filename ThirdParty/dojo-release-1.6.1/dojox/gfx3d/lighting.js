/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx3d.lighting"]){
dojo._hasResource["dojox.gfx3d.lighting"]=true;
dojo.provide("dojox.gfx3d.lighting");
dojo.require("dojox.gfx._base");
(function(){
var _1=dojox.gfx3d.lighting;
dojo.mixin(dojox.gfx3d.lighting,{black:function(){
return {r:0,g:0,b:0,a:1};
},white:function(){
return {r:1,g:1,b:1,a:1};
},toStdColor:function(c){
c=dojox.gfx.normalizeColor(c);
return {r:c.r/255,g:c.g/255,b:c.b/255,a:c.a};
},fromStdColor:function(c){
return new dojo.Color([Math.round(255*c.r),Math.round(255*c.g),Math.round(255*c.b),c.a]);
},scaleColor:function(s,c){
return {r:s*c.r,g:s*c.g,b:s*c.b,a:s*c.a};
},addColor:function(a,b){
return {r:a.r+b.r,g:a.g+b.g,b:a.b+b.b,a:a.a+b.a};
},multiplyColor:function(a,b){
return {r:a.r*b.r,g:a.g*b.g,b:a.b*b.b,a:a.a*b.a};
},saturateColor:function(c){
return {r:c.r<0?0:c.r>1?1:c.r,g:c.g<0?0:c.g>1?1:c.g,b:c.b<0?0:c.b>1?1:c.b,a:c.a<0?0:c.a>1?1:c.a};
},mixColor:function(c1,c2,s){
return _1.addColor(_1.scaleColor(s,c1),_1.scaleColor(1-s,c2));
},diff2Color:function(c1,c2){
var r=c1.r-c2.r;
var g=c1.g-c2.g;
var b=c1.b-c2.b;
var a=c1.a-c2.a;
return r*r+g*g+b*b+a*a;
},length2Color:function(c){
return c.r*c.r+c.g*c.g+c.b*c.b+c.a*c.a;
},dot:function(a,b){
return a.x*b.x+a.y*b.y+a.z*b.z;
},scale:function(s,v){
return {x:s*v.x,y:s*v.y,z:s*v.z};
},add:function(a,b){
return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};
},saturate:function(v){
return Math.min(Math.max(v,0),1);
},length:function(v){
return Math.sqrt(dojox.gfx3d.lighting.dot(v,v));
},normalize:function(v){
return _1.scale(1/_1.length(v),v);
},faceforward:function(n,i){
var p=dojox.gfx3d.lighting;
var s=p.dot(i,n)<0?1:-1;
return p.scale(s,n);
},reflect:function(i,n){
var p=dojox.gfx3d.lighting;
return p.add(i,p.scale(-2*p.dot(i,n),n));
},diffuse:function(_2,_3){
var c=_1.black();
for(var i=0;i<_3.length;++i){
var l=_3[i],d=_1.dot(_1.normalize(l.direction),_2);
c=_1.addColor(c,_1.scaleColor(d,l.color));
}
return _1.saturateColor(c);
},specular:function(_4,v,_5,_6){
var c=_1.black();
for(var i=0;i<_6.length;++i){
var l=_6[i],h=_1.normalize(_1.add(_1.normalize(l.direction),v)),s=Math.pow(Math.max(0,_1.dot(_4,h)),1/_5);
c=_1.addColor(c,_1.scaleColor(s,l.color));
}
return _1.saturateColor(c);
},phong:function(_7,v,_8,_9){
_7=_1.normalize(_7);
var c=_1.black();
for(var i=0;i<_9.length;++i){
var l=_9[i],r=_1.reflect(_1.scale(-1,_1.normalize(v)),_7),s=Math.pow(Math.max(0,_1.dot(r,_1.normalize(l.direction))),_8);
c=_1.addColor(c,_1.scaleColor(s,l.color));
}
return _1.saturateColor(c);
}});
dojo.declare("dojox.gfx3d.lighting.Model",null,{constructor:function(_a,_b,_c,_d){
this.incident=_1.normalize(_a);
this.lights=[];
for(var i=0;i<_b.length;++i){
var l=_b[i];
this.lights.push({direction:_1.normalize(l.direction),color:_1.toStdColor(l.color)});
}
this.ambient=_1.toStdColor(_c.color?_c.color:"white");
this.ambient=_1.scaleColor(_c.intensity,this.ambient);
this.ambient=_1.scaleColor(this.ambient.a,this.ambient);
this.ambient.a=1;
this.specular=_1.toStdColor(_d?_d:"white");
this.specular=_1.scaleColor(this.specular.a,this.specular);
this.specular.a=1;
this.npr_cool={r:0,g:0,b:0.4,a:1};
this.npr_warm={r:0.4,g:0.4,b:0.2,a:1};
this.npr_alpha=0.2;
this.npr_beta=0.6;
this.npr_scale=0.6;
},constant:function(_e,_f,_10){
_10=_1.toStdColor(_10);
var _11=_10.a,_12=_1.scaleColor(_11,_10);
_12.a=_11;
return _1.fromStdColor(_1.saturateColor(_12));
},matte:function(_13,_14,_15){
if(typeof _14=="string"){
_14=_1.finish[_14];
}
_15=_1.toStdColor(_15);
_13=_1.faceforward(_1.normalize(_13),this.incident);
var _16=_1.scaleColor(_14.Ka,this.ambient),_17=_1.saturate(-4*_1.dot(_13,this.incident)),_18=_1.scaleColor(_17*_14.Kd,_1.diffuse(_13,this.lights)),_19=_1.scaleColor(_15.a,_1.multiplyColor(_15,_1.addColor(_16,_18)));
_19.a=_15.a;
return _1.fromStdColor(_1.saturateColor(_19));
},metal:function(_1a,_1b,_1c){
if(typeof _1b=="string"){
_1b=_1.finish[_1b];
}
_1c=_1.toStdColor(_1c);
_1a=_1.faceforward(_1.normalize(_1a),this.incident);
var v=_1.scale(-1,this.incident),_1d,_1e,_1f=_1.scaleColor(_1b.Ka,this.ambient),_20=_1.saturate(-4*_1.dot(_1a,this.incident));
if("phong" in _1b){
_1d=_1.scaleColor(_20*_1b.Ks*_1b.phong,_1.phong(_1a,v,_1b.phong_size,this.lights));
}else{
_1d=_1.scaleColor(_20*_1b.Ks,_1.specular(_1a,v,_1b.roughness,this.lights));
}
_1e=_1.scaleColor(_1c.a,_1.addColor(_1.multiplyColor(_1c,_1f),_1.multiplyColor(this.specular,_1d)));
_1e.a=_1c.a;
return _1.fromStdColor(_1.saturateColor(_1e));
},plastic:function(_21,_22,_23){
if(typeof _22=="string"){
_22=_1.finish[_22];
}
_23=_1.toStdColor(_23);
_21=_1.faceforward(_1.normalize(_21),this.incident);
var v=_1.scale(-1,this.incident),_24,_25,_26=_1.scaleColor(_22.Ka,this.ambient),_27=_1.saturate(-4*_1.dot(_21,this.incident)),_28=_1.scaleColor(_27*_22.Kd,_1.diffuse(_21,this.lights));
if("phong" in _22){
_24=_1.scaleColor(_27*_22.Ks*_22.phong,_1.phong(_21,v,_22.phong_size,this.lights));
}else{
_24=_1.scaleColor(_27*_22.Ks,_1.specular(_21,v,_22.roughness,this.lights));
}
_25=_1.scaleColor(_23.a,_1.addColor(_1.multiplyColor(_23,_1.addColor(_26,_28)),_1.multiplyColor(this.specular,_24)));
_25.a=_23.a;
return _1.fromStdColor(_1.saturateColor(_25));
},npr:function(_29,_2a,_2b){
if(typeof _2a=="string"){
_2a=_1.finish[_2a];
}
_2b=_1.toStdColor(_2b);
_29=_1.faceforward(_1.normalize(_29),this.incident);
var _2c=_1.scaleColor(_2a.Ka,this.ambient),_2d=_1.saturate(-4*_1.dot(_29,this.incident)),_2e=_1.scaleColor(_2d*_2a.Kd,_1.diffuse(_29,this.lights)),_2f=_1.scaleColor(_2b.a,_1.multiplyColor(_2b,_1.addColor(_2c,_2e))),_30=_1.addColor(this.npr_cool,_1.scaleColor(this.npr_alpha,_2f)),_31=_1.addColor(this.npr_warm,_1.scaleColor(this.npr_beta,_2f)),d=(1+_1.dot(this.incident,_29))/2,_2f=_1.scaleColor(this.npr_scale,_1.addColor(_2f,_1.mixColor(_30,_31,d)));
_2f.a=_2b.a;
return _1.fromStdColor(_1.saturateColor(_2f));
}});
})();
dojox.gfx3d.lighting.finish={defaults:{Ka:0.1,Kd:0.6,Ks:0,roughness:0.05},dull:{Ka:0.1,Kd:0.6,Ks:0.5,roughness:0.15},shiny:{Ka:0.1,Kd:0.6,Ks:1,roughness:0.001},glossy:{Ka:0.1,Kd:0.6,Ks:1,roughness:0.0001},phong_dull:{Ka:0.1,Kd:0.6,Ks:0.5,phong:0.5,phong_size:1},phong_shiny:{Ka:0.1,Kd:0.6,Ks:1,phong:1,phong_size:200},phong_glossy:{Ka:0.1,Kd:0.6,Ks:1,phong:1,phong_size:300},luminous:{Ka:1,Kd:0,Ks:0,roughness:0.05},metalA:{Ka:0.35,Kd:0.3,Ks:0.8,roughness:1/20},metalB:{Ka:0.3,Kd:0.4,Ks:0.7,roughness:1/60},metalC:{Ka:0.25,Kd:0.5,Ks:0.8,roughness:1/80},metalD:{Ka:0.15,Kd:0.6,Ks:0.8,roughness:1/100},metalE:{Ka:0.1,Kd:0.7,Ks:0.8,roughness:1/120}};
}
