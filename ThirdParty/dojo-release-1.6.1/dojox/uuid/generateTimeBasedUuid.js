/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.uuid.generateTimeBasedUuid"]){
dojo._hasResource["dojox.uuid.generateTimeBasedUuid"]=true;
dojo.provide("dojox.uuid.generateTimeBasedUuid");
dojox.uuid.generateTimeBasedUuid=function(_1){
var _2=dojox.uuid.generateTimeBasedUuid._generator.generateUuidString(_1);
return _2;
};
dojox.uuid.generateTimeBasedUuid.isValidNode=function(_3){
var _4=16;
var _5=parseInt(_3,_4);
var _6=dojo.isString(_3)&&_3.length==12&&isFinite(_5);
return _6;
};
dojox.uuid.generateTimeBasedUuid.setNode=function(_7){
dojox.uuid.assert((_7===null)||this.isValidNode(_7));
this._uniformNode=_7;
};
dojox.uuid.generateTimeBasedUuid.getNode=function(){
return this._uniformNode;
};
dojox.uuid.generateTimeBasedUuid._generator=new function(){
this.GREGORIAN_CHANGE_OFFSET_IN_HOURS=3394248;
var _8=null;
var _9=null;
var _a=null;
var _b=0;
var _c=null;
var _d=null;
var _e=16;
function _f(_10){
_10[2]+=_10[3]>>>16;
_10[3]&=65535;
_10[1]+=_10[2]>>>16;
_10[2]&=65535;
_10[0]+=_10[1]>>>16;
_10[1]&=65535;
dojox.uuid.assert((_10[0]>>>16)===0);
};
function _11(x){
var _12=new Array(0,0,0,0);
_12[3]=x%65536;
x-=_12[3];
x/=65536;
_12[2]=x%65536;
x-=_12[2];
x/=65536;
_12[1]=x%65536;
x-=_12[1];
x/=65536;
_12[0]=x;
return _12;
};
function _13(_14,_15){
dojox.uuid.assert(dojo.isArray(_14));
dojox.uuid.assert(dojo.isArray(_15));
dojox.uuid.assert(_14.length==4);
dojox.uuid.assert(_15.length==4);
var _16=new Array(0,0,0,0);
_16[3]=_14[3]+_15[3];
_16[2]=_14[2]+_15[2];
_16[1]=_14[1]+_15[1];
_16[0]=_14[0]+_15[0];
_f(_16);
return _16;
};
function _17(_18,_19){
dojox.uuid.assert(dojo.isArray(_18));
dojox.uuid.assert(dojo.isArray(_19));
dojox.uuid.assert(_18.length==4);
dojox.uuid.assert(_19.length==4);
var _1a=false;
if(_18[0]*_19[0]!==0){
_1a=true;
}
if(_18[0]*_19[1]!==0){
_1a=true;
}
if(_18[0]*_19[2]!==0){
_1a=true;
}
if(_18[1]*_19[0]!==0){
_1a=true;
}
if(_18[1]*_19[1]!==0){
_1a=true;
}
if(_18[2]*_19[0]!==0){
_1a=true;
}
dojox.uuid.assert(!_1a);
var _1b=new Array(0,0,0,0);
_1b[0]+=_18[0]*_19[3];
_f(_1b);
_1b[0]+=_18[1]*_19[2];
_f(_1b);
_1b[0]+=_18[2]*_19[1];
_f(_1b);
_1b[0]+=_18[3]*_19[0];
_f(_1b);
_1b[1]+=_18[1]*_19[3];
_f(_1b);
_1b[1]+=_18[2]*_19[2];
_f(_1b);
_1b[1]+=_18[3]*_19[1];
_f(_1b);
_1b[2]+=_18[2]*_19[3];
_f(_1b);
_1b[2]+=_18[3]*_19[2];
_f(_1b);
_1b[3]+=_18[3]*_19[3];
_f(_1b);
return _1b;
};
function _1c(_1d,_1e){
while(_1d.length<_1e){
_1d="0"+_1d;
}
return _1d;
};
function _1f(){
var _20=Math.floor((Math.random()%1)*Math.pow(2,32));
var _21=_20.toString(_e);
while(_21.length<8){
_21="0"+_21;
}
return _21;
};
this.generateUuidString=function(_22){
if(_22){
dojox.uuid.assert(dojox.uuid.generateTimeBasedUuid.isValidNode(_22));
}else{
if(dojox.uuid.generateTimeBasedUuid._uniformNode){
_22=dojox.uuid.generateTimeBasedUuid._uniformNode;
}else{
if(!_8){
var _23=32768;
var _24=Math.floor((Math.random()%1)*Math.pow(2,15));
var _25=(_23|_24).toString(_e);
_8=_25+_1f();
}
_22=_8;
}
}
if(!_9){
var _26=32768;
var _27=Math.floor((Math.random()%1)*Math.pow(2,14));
_9=(_26|_27).toString(_e);
}
var now=new Date();
var _28=now.valueOf();
var _29=_11(_28);
if(!_c){
var _2a=_11(60*60);
var _2b=_11(dojox.uuid.generateTimeBasedUuid._generator.GREGORIAN_CHANGE_OFFSET_IN_HOURS);
var _2c=_17(_2b,_2a);
var _2d=_11(1000);
_c=_17(_2c,_2d);
_d=_11(10000);
}
var _2e=_29;
var _2f=_13(_c,_2e);
var _30=_17(_2f,_d);
if(now.valueOf()==_a){
_30[3]+=_b;
_f(_30);
_b+=1;
if(_b==10000){
while(now.valueOf()==_a){
now=new Date();
}
}
}else{
_a=now.valueOf();
_b=1;
}
var _31=_30[2].toString(_e);
var _32=_30[3].toString(_e);
var _33=_1c(_31,4)+_1c(_32,4);
var _34=_30[1].toString(_e);
_34=_1c(_34,4);
var _35=_30[0].toString(_e);
_35=_1c(_35,3);
var _36="-";
var _37="1";
var _38=_33+_36+_34+_36+_37+_35+_36+_9+_36+_22;
_38=_38.toLowerCase();
return _38;
};
}();
}
