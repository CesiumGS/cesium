/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/Color",["./kernel","./lang","./array","./config"],function(_1,_2,_3,_4){
var _5=_1.Color=function(_6){
if(_6){
this.setColor(_6);
}
};
_5.named={"black":[0,0,0],"silver":[192,192,192],"gray":[128,128,128],"white":[255,255,255],"maroon":[128,0,0],"red":[255,0,0],"purple":[128,0,128],"fuchsia":[255,0,255],"green":[0,128,0],"lime":[0,255,0],"olive":[128,128,0],"yellow":[255,255,0],"navy":[0,0,128],"blue":[0,0,255],"teal":[0,128,128],"aqua":[0,255,255],"transparent":_4.transparentColor||[0,0,0,0]};
_2.extend(_5,{r:255,g:255,b:255,a:1,_set:function(r,g,b,a){
var t=this;
t.r=r;
t.g=g;
t.b=b;
t.a=a;
},setColor:function(_7){
if(_2.isString(_7)){
_5.fromString(_7,this);
}else{
if(_2.isArray(_7)){
_5.fromArray(_7,this);
}else{
this._set(_7.r,_7.g,_7.b,_7.a);
if(!(_7 instanceof _5)){
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
var _8=_3.map(["r","g","b"],function(x){
var s=this[x].toString(16);
return s.length<2?"0"+s:s;
},this);
return "#"+_8.join("");
},toCss:function(_9){
var t=this,_a=t.r+", "+t.g+", "+t.b;
return (_9?"rgba("+_a+", "+t.a:"rgb("+_a)+")";
},toString:function(){
return this.toCss(true);
}});
_5.blendColors=_1.blendColors=function(_b,_c,_d,_e){
var t=_e||new _5();
_3.forEach(["r","g","b","a"],function(x){
t[x]=_b[x]+(_c[x]-_b[x])*_d;
if(x!="a"){
t[x]=Math.round(t[x]);
}
});
return t.sanitize();
};
_5.fromRgb=_1.colorFromRgb=function(_f,obj){
var m=_f.toLowerCase().match(/^rgba?\(([\s\.,0-9]+)\)/);
return m&&_5.fromArray(m[1].split(/\s*,\s*/),obj);
};
_5.fromHex=_1.colorFromHex=function(_10,obj){
var t=obj||new _5(),_11=(_10.length==4)?4:8,_12=(1<<_11)-1;
_10=Number("0x"+_10.substr(1));
if(isNaN(_10)){
return null;
}
_3.forEach(["b","g","r"],function(x){
var c=_10&_12;
_10>>=_11;
t[x]=_11==4?17*c:c;
});
t.a=1;
return t;
};
_5.fromArray=_1.colorFromArray=function(a,obj){
var t=obj||new _5();
t._set(Number(a[0]),Number(a[1]),Number(a[2]),Number(a[3]));
if(isNaN(t.a)){
t.a=1;
}
return t.sanitize();
};
_5.fromString=_1.colorFromString=function(str,obj){
var a=_5.named[str];
return a&&_5.fromArray(a,obj)||_5.fromRgb(str,obj)||_5.fromHex(str,obj);
};
return _5;
});
