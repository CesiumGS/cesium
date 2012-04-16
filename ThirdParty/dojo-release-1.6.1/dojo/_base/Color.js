/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.Color"]){
dojo._hasResource["dojo._base.Color"]=true;
dojo.provide("dojo._base.Color");
dojo.require("dojo._base.array");
dojo.require("dojo._base.lang");
(function(){
var d=dojo;
dojo.Color=function(_1){
if(_1){
this.setColor(_1);
}
};
dojo.Color.named={black:[0,0,0],silver:[192,192,192],gray:[128,128,128],white:[255,255,255],maroon:[128,0,0],red:[255,0,0],purple:[128,0,128],fuchsia:[255,0,255],green:[0,128,0],lime:[0,255,0],olive:[128,128,0],yellow:[255,255,0],navy:[0,0,128],blue:[0,0,255],teal:[0,128,128],aqua:[0,255,255],transparent:d.config.transparentColor||[255,255,255]};
dojo.extend(dojo.Color,{r:255,g:255,b:255,a:1,_set:function(r,g,b,a){
var t=this;
t.r=r;
t.g=g;
t.b=b;
t.a=a;
},setColor:function(_2){
if(d.isString(_2)){
d.colorFromString(_2,this);
}else{
if(d.isArray(_2)){
d.colorFromArray(_2,this);
}else{
this._set(_2.r,_2.g,_2.b,_2.a);
if(!(_2 instanceof d.Color)){
this.sanitize();
}
}
}
return this;
},sanitize:function(){
return this;
},toRgb:function(){
var t=this;
return [t.r,t.g,t.b];
},toRgba:function(){
var t=this;
return [t.r,t.g,t.b,t.a];
},toHex:function(){
var _3=d.map(["r","g","b"],function(x){
var s=this[x].toString(16);
return s.length<2?"0"+s:s;
},this);
return "#"+_3.join("");
},toCss:function(_4){
var t=this,_5=t.r+", "+t.g+", "+t.b;
return (_4?"rgba("+_5+", "+t.a:"rgb("+_5)+")";
},toString:function(){
return this.toCss(true);
}});
dojo.blendColors=function(_6,_7,_8,_9){
var t=_9||new d.Color();
d.forEach(["r","g","b","a"],function(x){
t[x]=_6[x]+(_7[x]-_6[x])*_8;
if(x!="a"){
t[x]=Math.round(t[x]);
}
});
return t.sanitize();
};
dojo.colorFromRgb=function(_a,_b){
var m=_a.toLowerCase().match(/^rgba?\(([\s\.,0-9]+)\)/);
return m&&dojo.colorFromArray(m[1].split(/\s*,\s*/),_b);
};
dojo.colorFromHex=function(_c,_d){
var t=_d||new d.Color(),_e=(_c.length==4)?4:8,_f=(1<<_e)-1;
_c=Number("0x"+_c.substr(1));
if(isNaN(_c)){
return null;
}
d.forEach(["b","g","r"],function(x){
var c=_c&_f;
_c>>=_e;
t[x]=_e==4?17*c:c;
});
t.a=1;
return t;
};
dojo.colorFromArray=function(a,obj){
var t=obj||new d.Color();
t._set(Number(a[0]),Number(a[1]),Number(a[2]),Number(a[3]));
if(isNaN(t.a)){
t.a=1;
}
return t.sanitize();
};
dojo.colorFromString=function(str,obj){
var a=d.Color.named[str];
return a&&d.colorFromArray(a,obj)||d.colorFromRgb(str,obj)||d.colorFromHex(str,obj);
};
})();
}
