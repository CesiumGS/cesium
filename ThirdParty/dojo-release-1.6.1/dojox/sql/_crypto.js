/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.sql._crypto"]){
dojo._hasResource["dojox.sql._crypto"]=true;
dojo.provide("dojox.sql._crypto");
dojo.mixin(dojox.sql._crypto,{_POOL_SIZE:100,encrypt:function(_1,_2,_3){
this._initWorkerPool();
var _4={plaintext:_1,password:_2};
_4=dojo.toJson(_4);
_4="encr:"+String(_4);
this._assignWork(_4,_3);
},decrypt:function(_5,_6,_7){
this._initWorkerPool();
var _8={ciphertext:_5,password:_6};
_8=dojo.toJson(_8);
_8="decr:"+String(_8);
this._assignWork(_8,_7);
},_initWorkerPool:function(){
if(!this._manager){
try{
this._manager=google.gears.factory.create("beta.workerpool","1.0");
this._unemployed=[];
this._employed={};
this._handleMessage=[];
var _9=this;
this._manager.onmessage=function(_a,_b){
var _c=_9._employed["_"+_b];
_9._employed["_"+_b]=undefined;
_9._unemployed.push("_"+_b);
if(_9._handleMessage.length){
var _d=_9._handleMessage.shift();
_9._assignWork(_d.msg,_d.callback);
}
_c(_a);
};
var _e="function _workerInit(){"+"gearsWorkerPool.onmessage = "+String(this._workerHandler)+";"+"}";
var _f=_e+" _workerInit();";
for(var i=0;i<this._POOL_SIZE;i++){
this._unemployed.push("_"+this._manager.createWorker(_f));
}
}
catch(exp){
throw exp.message||exp;
}
}
},_assignWork:function(msg,_10){
if(!this._handleMessage.length&&this._unemployed.length){
var _11=this._unemployed.shift().substring(1);
this._employed["_"+_11]=_10;
this._manager.sendMessage(msg,parseInt(_11,10));
}else{
this._handleMessage={msg:msg,callback:_10};
}
},_workerHandler:function(msg,_12){
var _13=[99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];
var _14=[[0,0,0,0],[1,0,0,0],[2,0,0,0],[4,0,0,0],[8,0,0,0],[16,0,0,0],[32,0,0,0],[64,0,0,0],[128,0,0,0],[27,0,0,0],[54,0,0,0]];
function _15(_16,w){
var Nb=4;
var Nr=w.length/Nb-1;
var _17=[[],[],[],[]];
for(var i=0;i<4*Nb;i++){
_17[i%4][Math.floor(i/4)]=_16[i];
}
_17=_18(_17,w,0,Nb);
for(var _19=1;_19<Nr;_19++){
_17=_1a(_17,Nb);
_17=_1b(_17,Nb);
_17=_1c(_17,Nb);
_17=_18(_17,w,_19,Nb);
}
_17=_1a(_17,Nb);
_17=_1b(_17,Nb);
_17=_18(_17,w,Nr,Nb);
var _1d=new Array(4*Nb);
for(var i=0;i<4*Nb;i++){
_1d[i]=_17[i%4][Math.floor(i/4)];
}
return _1d;
};
function _1a(s,Nb){
for(var r=0;r<4;r++){
for(var c=0;c<Nb;c++){
s[r][c]=_13[s[r][c]];
}
}
return s;
};
function _1b(s,Nb){
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
function _1c(s,Nb){
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
function _18(_1e,w,rnd,Nb){
for(var r=0;r<4;r++){
for(var c=0;c<Nb;c++){
_1e[r][c]^=w[rnd*4+c][r];
}
}
return _1e;
};
function _1f(key){
var Nb=4;
var Nk=key.length/4;
var Nr=Nk+6;
var w=new Array(Nb*(Nr+1));
var _20=new Array(4);
for(var i=0;i<Nk;i++){
var r=[key[4*i],key[4*i+1],key[4*i+2],key[4*i+3]];
w[i]=r;
}
for(var i=Nk;i<(Nb*(Nr+1));i++){
w[i]=new Array(4);
for(var t=0;t<4;t++){
_20[t]=w[i-1][t];
}
if(i%Nk==0){
_20=_21(_22(_20));
for(var t=0;t<4;t++){
_20[t]^=_14[i/Nk][t];
}
}else{
if(Nk>6&&i%Nk==4){
_20=_21(_20);
}
}
for(var t=0;t<4;t++){
w[i][t]=w[i-Nk][t]^_20[t];
}
}
return w;
};
function _21(w){
for(var i=0;i<4;i++){
w[i]=_13[w[i]];
}
return w;
};
function _22(w){
w[4]=w[0];
for(var i=0;i<4;i++){
w[i]=w[i+1];
}
return w;
};
function _23(_24,_25,_26){
if(!(_26==128||_26==192||_26==256)){
return "";
}
var _27=_26/8;
var _28=new Array(_27);
for(var i=0;i<_27;i++){
_28[i]=_25.charCodeAt(i)&255;
}
var key=_15(_28,_1f(_28));
key=key.concat(key.slice(0,_27-16));
var _29=16;
var _2a=new Array(_29);
var _2b=(new Date()).getTime();
for(var i=0;i<4;i++){
_2a[i]=(_2b>>>i*8)&255;
}
for(var i=0;i<4;i++){
_2a[i+4]=(_2b/4294967296>>>i*8)&255;
}
var _2c=_1f(key);
var _2d=Math.ceil(_24.length/_29);
var _2e=new Array(_2d);
for(var b=0;b<_2d;b++){
for(var c=0;c<4;c++){
_2a[15-c]=(b>>>c*8)&255;
}
for(var c=0;c<4;c++){
_2a[15-c-4]=(b/4294967296>>>c*8);
}
var _2f=_15(_2a,_2c);
var _30=b<_2d-1?_29:(_24.length-1)%_29+1;
var ct="";
for(var i=0;i<_30;i++){
var _31=_24.charCodeAt(b*_29+i);
var _32=_31^_2f[i];
ct+=String.fromCharCode(_32);
}
_2e[b]=_33(ct);
}
var _34="";
for(var i=0;i<8;i++){
_34+=String.fromCharCode(_2a[i]);
}
_34=_33(_34);
return _34+"-"+_2e.join("-");
};
function _35(_36,_37,_38){
if(!(_38==128||_38==192||_38==256)){
return "";
}
var _39=_38/8;
var _3a=new Array(_39);
for(var i=0;i<_39;i++){
_3a[i]=_37.charCodeAt(i)&255;
}
var _3b=_1f(_3a);
var key=_15(_3a,_3b);
key=key.concat(key.slice(0,_39-16));
var _3c=_1f(key);
_36=_36.split("-");
var _3d=16;
var _3e=new Array(_3d);
var _3f=_40(_36[0]);
for(var i=0;i<8;i++){
_3e[i]=_3f.charCodeAt(i);
}
var _41=new Array(_36.length-1);
for(var b=1;b<_36.length;b++){
for(var c=0;c<4;c++){
_3e[15-c]=((b-1)>>>c*8)&255;
}
for(var c=0;c<4;c++){
_3e[15-c-4]=((b/4294967296-1)>>>c*8)&255;
}
var _42=_15(_3e,_3c);
_36[b]=_40(_36[b]);
var pt="";
for(var i=0;i<_36[b].length;i++){
var _43=_36[b].charCodeAt(i);
var _44=_43^_42[i];
pt+=String.fromCharCode(_44);
}
_41[b-1]=pt;
}
return _41.join("");
};
function _33(str){
return str.replace(/[\0\t\n\v\f\r\xa0!-]/g,function(c){
return "!"+c.charCodeAt(0)+"!";
});
};
function _40(str){
return str.replace(/!\d\d?\d?!/g,function(c){
return String.fromCharCode(c.slice(1,-1));
});
};
function _45(_46,_47){
return _23(_46,_47,256);
};
function _48(_49,_4a){
return _35(_49,_4a,256);
};
var cmd=msg.substr(0,4);
var arg=msg.substr(5);
if(cmd=="encr"){
arg=eval("("+arg+")");
var _4b=arg.plaintext;
var _4c=arg.password;
var _4d=_45(_4b,_4c);
gearsWorkerPool.sendMessage(String(_4d),_12);
}else{
if(cmd=="decr"){
arg=eval("("+arg+")");
var _4e=arg.ciphertext;
var _4c=arg.password;
var _4d=_48(_4e,_4c);
gearsWorkerPool.sendMessage(String(_4d),_12);
}
}
}});
}
