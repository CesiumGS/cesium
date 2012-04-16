/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.encoding.crypto.SimpleAES"]){
dojo._hasResource["dojox.encoding.crypto.SimpleAES"]=true;
dojo.provide("dojox.encoding.crypto.SimpleAES");
dojo.require("dojox.encoding.base64");
dojo.require("dojox.encoding.crypto._base");
dojo.getObject("encoding.crypto.SimpleAES",true,dojox);
(function(){
var _1=[99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];
var _2=[[0,0,0,0],[1,0,0,0],[2,0,0,0],[4,0,0,0],[8,0,0,0],[16,0,0,0],[32,0,0,0],[64,0,0,0],[128,0,0,0],[27,0,0,0],[54,0,0,0]];
function _3(_4,w){
var Nb=4;
var Nr=w.length/Nb-1;
var _5=[[],[],[],[]];
for(var i=0;i<4*Nb;i++){
_5[i%4][Math.floor(i/4)]=_4[i];
}
_5=_6(_5,w,0,Nb);
for(var _7=1;_7<Nr;_7++){
_5=_8(_5,Nb);
_5=_9(_5,Nb);
_5=_a(_5,Nb);
_5=_6(_5,w,_7,Nb);
}
_5=_8(_5,Nb);
_5=_9(_5,Nb);
_5=_6(_5,w,Nr,Nb);
var _b=new Array(4*Nb);
for(var i=0;i<4*Nb;i++){
_b[i]=_5[i%4][Math.floor(i/4)];
}
return _b;
};
function _8(s,Nb){
for(var r=0;r<4;r++){
for(var c=0;c<Nb;c++){
s[r][c]=_1[s[r][c]];
}
}
return s;
};
function _9(s,Nb){
var t=new Array(4);
for(var r=1;r<4;r++){
for(var c=0;c<4;c++){
t[c]=s[r][(c+r)%Nb];
}
for(var c=0;c<4;c++){
s[r][c]=t[c];
}
}
return s;
};
function _a(s,Nb){
for(var c=0;c<4;c++){
var a=new Array(4);
var b=new Array(4);
for(var i=0;i<4;i++){
a[i]=s[i][c];
b[i]=s[i][c]&128?s[i][c]<<1^283:s[i][c]<<1;
}
s[0][c]=b[0]^a[1]^b[1]^a[2]^a[3];
s[1][c]=a[0]^b[1]^a[2]^b[2]^a[3];
s[2][c]=a[0]^a[1]^b[2]^a[3]^b[3];
s[3][c]=a[0]^b[0]^a[1]^a[2]^b[3];
}
return s;
};
function _6(_c,w,_d,Nb){
for(var r=0;r<4;r++){
for(var c=0;c<Nb;c++){
_c[r][c]^=w[_d*4+c][r];
}
}
return _c;
};
function _e(_f){
var Nb=4;
var Nk=_f.length/4;
var Nr=Nk+6;
var w=new Array(Nb*(Nr+1));
var _10=new Array(4);
for(var i=0;i<Nk;i++){
var r=[_f[4*i],_f[4*i+1],_f[4*i+2],_f[4*i+3]];
w[i]=r;
}
for(var i=Nk;i<(Nb*(Nr+1));i++){
w[i]=new Array(4);
for(var t=0;t<4;t++){
_10[t]=w[i-1][t];
}
if(i%Nk==0){
_10=_11(_12(_10));
for(var t=0;t<4;t++){
_10[t]^=_2[i/Nk][t];
}
}else{
if(Nk>6&&i%Nk==4){
_10=_11(_10);
}
}
for(var t=0;t<4;t++){
w[i][t]=w[i-Nk][t]^_10[t];
}
}
return w;
};
function _11(w){
for(var i=0;i<4;i++){
w[i]=_1[w[i]];
}
return w;
};
function _12(w){
w[4]=w[0];
for(var i=0;i<4;i++){
w[i]=w[i+1];
}
return w;
};
function _13(_14,_15,_16){
if(!(_16==128||_16==192||_16==256)){
return "";
}
var _17=_16/8;
var _18=new Array(_17);
for(var i=0;i<_17;i++){
_18[i]=_15.charCodeAt(i)&255;
}
var key=_3(_18,_e(_18));
key=key.concat(key.slice(0,_17-16));
var _19=16;
var _1a=new Array(_19);
var _1b=(new Date()).getTime();
for(var i=0;i<4;i++){
_1a[i]=(_1b>>>i*8)&255;
}
for(var i=0;i<4;i++){
_1a[i+4]=(_1b/4294967296>>>i*8)&255;
}
var _1c=_e(key);
var _1d=Math.ceil(_14.length/_19);
var _1e=new Array(_1d);
for(var b=0;b<_1d;b++){
for(var c=0;c<4;c++){
_1a[15-c]=(b>>>c*8)&255;
}
for(var c=0;c<4;c++){
_1a[15-c-4]=(b/4294967296>>>c*8);
}
var _1f=_3(_1a,_1c);
var _20=b<_1d-1?_19:(_14.length-1)%_19+1;
var ct="";
for(var i=0;i<_20;i++){
var _21=_14.charCodeAt(b*_19+i);
var _22=_21^_1f[i];
ct+=((_22<16)?"0":"")+_22.toString(16);
}
_1e[b]=ct;
}
var _23="";
for(var i=0;i<8;i++){
_23+=((_1a[i]<16)?"0":"")+_1a[i].toString(16);
}
return _23+" "+_1e.join(" ");
};
function _24(s){
var ret=[];
s.replace(/(..)/g,function(str){
ret.push(parseInt(str,16));
});
return ret;
};
function _25(_26,_27,_28){
if(!(_28==128||_28==192||_28==256)){
return "";
}
var _29=_28/8;
var _2a=new Array(_29);
for(var i=0;i<_29;i++){
_2a[i]=_27.charCodeAt(i)&255;
}
var _2b=_e(_2a);
var key=_3(_2a,_2b);
key=key.concat(key.slice(0,_29-16));
var _2c=_e(key);
_26=_26.split(" ");
var _2d=16;
var _2e=new Array(_2d);
var _2f=_26[0];
_2e=_24(_2f);
var _30=new Array(_26.length-1);
for(var b=1;b<_26.length;b++){
for(var c=0;c<4;c++){
_2e[15-c]=((b-1)>>>c*8)&255;
}
for(var c=0;c<4;c++){
_2e[15-c-4]=((b/4294967296-1)>>>c*8)&255;
}
var _31=_3(_2e,_2c);
var pt="";
var tmp=_24(_26[b]);
for(var i=0;i<tmp.length;i++){
var _32=_26[b].charCodeAt(i);
var _33=tmp[i]^_31[i];
pt+=String.fromCharCode(_33);
}
_30[b-1]=pt;
}
return _30.join("");
};
function _34(str){
return str.replace(/[\0\t\n\v\f\r\xa0!-]/g,function(c){
return "!"+c.charCodeAt(0)+"!";
});
};
function _35(str){
return str.replace(/!\d\d?\d?!/g,function(c){
return String.fromCharCode(c.slice(1,-1));
});
};
dojox.encoding.crypto.SimpleAES=new (function(){
this.encrypt=function(_36,key){
return _13(_36,key,256);
};
this.decrypt=function(_37,key){
return _25(_37,key,256);
};
})();
})();
}
