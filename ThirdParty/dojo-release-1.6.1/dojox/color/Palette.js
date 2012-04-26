/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.color.Palette"]){
dojo._hasResource["dojox.color.Palette"]=true;
dojo.provide("dojox.color.Palette");
dojo.require("dojox.color");
(function(){
var _1=dojox.color;
_1.Palette=function(_2){
this.colors=[];
if(_2 instanceof dojox.color.Palette){
this.colors=_2.colors.slice(0);
}else{
if(_2 instanceof dojox.color.Color){
this.colors=[null,null,_2,null,null];
}else{
if(dojo.isArray(_2)){
this.colors=dojo.map(_2.slice(0),function(_3){
if(dojo.isString(_3)){
return new dojox.color.Color(_3);
}
return _3;
});
}else{
if(dojo.isString(_2)){
this.colors=[null,null,new dojox.color.Color(_2),null,null];
}
}
}
}
};
function _4(p,_5,_6){
var _7=new dojox.color.Palette();
_7.colors=[];
dojo.forEach(p.colors,function(_8){
var r=(_5=="dr")?_8.r+_6:_8.r,g=(_5=="dg")?_8.g+_6:_8.g,b=(_5=="db")?_8.b+_6:_8.b,a=(_5=="da")?_8.a+_6:_8.a;
_7.colors.push(new dojox.color.Color({r:Math.min(255,Math.max(0,r)),g:Math.min(255,Math.max(0,g)),b:Math.min(255,Math.max(0,b)),a:Math.min(1,Math.max(0,a))}));
});
return _7;
};
function _9(p,_a,_b){
var _c=new dojox.color.Palette();
_c.colors=[];
dojo.forEach(p.colors,function(_d){
var o=_d.toCmy(),c=(_a=="dc")?o.c+_b:o.c,m=(_a=="dm")?o.m+_b:o.m,y=(_a=="dy")?o.y+_b:o.y;
_c.colors.push(dojox.color.fromCmy(Math.min(100,Math.max(0,c)),Math.min(100,Math.max(0,m)),Math.min(100,Math.max(0,y))));
});
return _c;
};
function _e(p,_f,val){
var ret=new dojox.color.Palette();
ret.colors=[];
dojo.forEach(p.colors,function(_10){
var o=_10.toCmyk(),c=(_f=="dc")?o.c+val:o.c,m=(_f=="dm")?o.m+val:o.m,y=(_f=="dy")?o.y+val:o.y,k=(_f=="dk")?o.b+val:o.b;
ret.colors.push(dojox.color.fromCmyk(Math.min(100,Math.max(0,c)),Math.min(100,Math.max(0,m)),Math.min(100,Math.max(0,y)),Math.min(100,Math.max(0,k))));
});
return ret;
};
function _11(p,_12,val){
var ret=new dojox.color.Palette();
ret.colors=[];
dojo.forEach(p.colors,function(_13){
var o=_13.toHsl(),h=(_12=="dh")?o.h+val:o.h,s=(_12=="ds")?o.s+val:o.s,l=(_12=="dl")?o.l+val:o.l;
ret.colors.push(dojox.color.fromHsl(h%360,Math.min(100,Math.max(0,s)),Math.min(100,Math.max(0,l))));
});
return ret;
};
function _14(p,_15,val){
var ret=new dojox.color.Palette();
ret.colors=[];
dojo.forEach(p.colors,function(_16){
var o=_16.toHsv(),h=(_15=="dh")?o.h+val:o.h,s=(_15=="ds")?o.s+val:o.s,v=(_15=="dv")?o.v+val:o.v;
ret.colors.push(dojox.color.fromHsv(h%360,Math.min(100,Math.max(0,s)),Math.min(100,Math.max(0,v))));
});
return ret;
};
function _17(val,low,_18){
return _18-((_18-val)*((_18-low)/_18));
};
dojo.extend(_1.Palette,{transform:function(_19){
var fn=_4;
if(_19.use){
var use=_19.use.toLowerCase();
if(use.indexOf("hs")==0){
if(use.charAt(2)=="l"){
fn=_11;
}else{
fn=_14;
}
}else{
if(use.indexOf("cmy")==0){
if(use.charAt(3)=="k"){
fn=_e;
}else{
fn=_9;
}
}
}
}else{
if("dc" in _19||"dm" in _19||"dy" in _19){
if("dk" in _19){
fn=_e;
}else{
fn=_9;
}
}else{
if("dh" in _19||"ds" in _19){
if("dv" in _19){
fn=_14;
}else{
fn=_11;
}
}
}
}
var _1a=this;
for(var p in _19){
if(p=="use"){
continue;
}
_1a=fn(_1a,p,_19[p]);
}
return _1a;
},clone:function(){
return new _1.Palette(this);
}});
dojo.mixin(_1.Palette,{generators:{analogous:function(_1b){
var _1c=_1b.high||60,low=_1b.low||18,_1d=dojo.isString(_1b.base)?new dojox.color.Color(_1b.base):_1b.base,hsv=_1d.toHsv();
var h=[(hsv.h+low+360)%360,(hsv.h+Math.round(low/2)+360)%360,hsv.h,(hsv.h-Math.round(_1c/2)+360)%360,(hsv.h-_1c+360)%360];
var s1=Math.max(10,(hsv.s<=95)?hsv.s+5:(100-(hsv.s-95))),s2=(hsv.s>1)?hsv.s-1:21-hsv.s,v1=(hsv.v>=92)?hsv.v-9:Math.max(hsv.v+9,20),v2=(hsv.v<=90)?Math.max(hsv.v+5,20):(95+Math.ceil((hsv.v-90)/2)),s=[s1,s2,hsv.s,s1,s1],v=[v1,v2,hsv.v,v1,v2];
return new _1.Palette(dojo.map(h,function(hue,i){
return dojox.color.fromHsv(hue,s[i],v[i]);
}));
},monochromatic:function(_1e){
var _1f=dojo.isString(_1e.base)?new dojox.color.Color(_1e.base):_1e.base,hsv=_1f.toHsv();
var s1=(hsv.s-30>9)?hsv.s-30:hsv.s+30,s2=hsv.s,v1=_17(hsv.v,20,100),v2=(hsv.v-20>20)?hsv.v-20:hsv.v+60,v3=(hsv.v-50>20)?hsv.v-50:hsv.v+30;
return new _1.Palette([dojox.color.fromHsv(hsv.h,s1,v1),dojox.color.fromHsv(hsv.h,s2,v3),_1f,dojox.color.fromHsv(hsv.h,s1,v3),dojox.color.fromHsv(hsv.h,s2,v2)]);
},triadic:function(_20){
var _21=dojo.isString(_20.base)?new dojox.color.Color(_20.base):_20.base,hsv=_21.toHsv();
var h1=(hsv.h+57+360)%360,h2=(hsv.h-157+360)%360,s1=(hsv.s>20)?hsv.s-10:hsv.s+10,s2=(hsv.s>90)?hsv.s-10:hsv.s+10,s3=(hsv.s>95)?hsv.s-5:hsv.s+5,v1=(hsv.v-20>20)?hsv.v-20:hsv.v+20,v2=(hsv.v-30>20)?hsv.v-30:hsv.v+30,v3=(hsv.v-30>70)?hsv.v-30:hsv.v+30;
return new _1.Palette([dojox.color.fromHsv(h1,s1,hsv.v),dojox.color.fromHsv(hsv.h,s2,v2),_21,dojox.color.fromHsv(h2,s2,v1),dojox.color.fromHsv(h2,s3,v3)]);
},complementary:function(_22){
var _23=dojo.isString(_22.base)?new dojox.color.Color(_22.base):_22.base,hsv=_23.toHsv();
var h1=((hsv.h*2)+137<360)?(hsv.h*2)+137:Math.floor(hsv.h/2)-137,s1=Math.max(hsv.s-10,0),s2=_17(hsv.s,10,100),s3=Math.min(100,hsv.s+20),v1=Math.min(100,hsv.v+30),v2=(hsv.v>20)?hsv.v-30:hsv.v+30;
return new _1.Palette([dojox.color.fromHsv(hsv.h,s1,v1),dojox.color.fromHsv(hsv.h,s2,v2),_23,dojox.color.fromHsv(h1,s3,v2),dojox.color.fromHsv(h1,hsv.s,hsv.v)]);
},splitComplementary:function(_24){
var _25=dojo.isString(_24.base)?new dojox.color.Color(_24.base):_24.base,_26=_24.da||30,hsv=_25.toHsv();
var _27=((hsv.h*2)+137<360)?(hsv.h*2)+137:Math.floor(hsv.h/2)-137,h1=(_27-_26+360)%360,h2=(_27+_26)%360,s1=Math.max(hsv.s-10,0),s2=_17(hsv.s,10,100),s3=Math.min(100,hsv.s+20),v1=Math.min(100,hsv.v+30),v2=(hsv.v>20)?hsv.v-30:hsv.v+30;
return new _1.Palette([dojox.color.fromHsv(h1,s1,v1),dojox.color.fromHsv(h1,s2,v2),_25,dojox.color.fromHsv(h2,s3,v2),dojox.color.fromHsv(h2,hsv.s,hsv.v)]);
},compound:function(_28){
var _29=dojo.isString(_28.base)?new dojox.color.Color(_28.base):_28.base,hsv=_29.toHsv();
var h1=((hsv.h*2)+18<360)?(hsv.h*2)+18:Math.floor(hsv.h/2)-18,h2=((hsv.h*2)+120<360)?(hsv.h*2)+120:Math.floor(hsv.h/2)-120,h3=((hsv.h*2)+99<360)?(hsv.h*2)+99:Math.floor(hsv.h/2)-99,s1=(hsv.s-40>10)?hsv.s-40:hsv.s+40,s2=(hsv.s-10>80)?hsv.s-10:hsv.s+10,s3=(hsv.s-25>10)?hsv.s-25:hsv.s+25,v1=(hsv.v-40>10)?hsv.v-40:hsv.v+40,v2=(hsv.v-20>80)?hsv.v-20:hsv.v+20,v3=Math.max(hsv.v,20);
return new _1.Palette([dojox.color.fromHsv(h1,s1,v1),dojox.color.fromHsv(h1,s2,v2),_29,dojox.color.fromHsv(h2,s3,v3),dojox.color.fromHsv(h3,s2,v2)]);
},shades:function(_2a){
var _2b=dojo.isString(_2a.base)?new dojox.color.Color(_2a.base):_2a.base,hsv=_2b.toHsv();
var s=(hsv.s==100&&hsv.v==0)?0:hsv.s,v1=(hsv.v-50>20)?hsv.v-50:hsv.v+30,v2=(hsv.v-25>=20)?hsv.v-25:hsv.v+55,v3=(hsv.v-75>=20)?hsv.v-75:hsv.v+5,v4=Math.max(hsv.v-10,20);
return new _1.Palette([new dojox.color.fromHsv(hsv.h,s,v1),new dojox.color.fromHsv(hsv.h,s,v2),_2b,new dojox.color.fromHsv(hsv.h,s,v3),new dojox.color.fromHsv(hsv.h,s,v4)]);
}},generate:function(_2c,_2d){
if(dojo.isFunction(_2d)){
return _2d({base:_2c});
}else{
if(_1.Palette.generators[_2d]){
return _1.Palette.generators[_2d]({base:_2c});
}
}
throw new Error("dojox.color.Palette.generate: the specified generator ('"+_2d+"') does not exist.");
}});
})();
}
