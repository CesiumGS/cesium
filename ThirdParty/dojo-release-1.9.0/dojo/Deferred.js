/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/Deferred",["./has","./_base/lang","./errors/CancelError","./promise/Promise","./promise/instrumentation"],function(_1,_2,_3,_4,_5){
"use strict";
var _6=0,_7=1,_8=2;
var _9="This deferred has already been fulfilled.";
var _a=Object.freeze||function(){
};
var _b=function(_c,_d,_e,_f,_10){
if(1){
if(_d===_8&&_11.instrumentRejected&&_c.length===0){
_11.instrumentRejected(_e,false,_f,_10);
}
}
for(var i=0;i<_c.length;i++){
_12(_c[i],_d,_e,_f);
}
};
var _12=function(_13,_14,_15,_16){
var _17=_13[_14];
var _18=_13.deferred;
if(_17){
try{
var _19=_17(_15);
if(_14===_6){
if(typeof _19!=="undefined"){
_1a(_18,_14,_19);
}
}else{
if(_19&&typeof _19.then==="function"){
_13.cancel=_19.cancel;
_19.then(_1b(_18,_7),_1b(_18,_8),_1b(_18,_6));
return;
}
_1a(_18,_7,_19);
}
}
catch(error){
_1a(_18,_8,error);
}
}else{
_1a(_18,_14,_15);
}
if(1){
if(_14===_8&&_11.instrumentRejected){
_11.instrumentRejected(_15,!!_17,_16,_18.promise);
}
}
};
var _1b=function(_1c,_1d){
return function(_1e){
_1a(_1c,_1d,_1e);
};
};
var _1a=function(_1f,_20,_21){
if(!_1f.isCanceled()){
switch(_20){
case _6:
_1f.progress(_21);
break;
case _7:
_1f.resolve(_21);
break;
case _8:
_1f.reject(_21);
break;
}
}
};
var _11=function(_22){
var _23=this.promise=new _4();
var _24=this;
var _25,_26,_27;
var _28=false;
var _29=[];
if(1&&Error.captureStackTrace){
Error.captureStackTrace(_24,_11);
Error.captureStackTrace(_23,_11);
}
this.isResolved=_23.isResolved=function(){
return _25===_7;
};
this.isRejected=_23.isRejected=function(){
return _25===_8;
};
this.isFulfilled=_23.isFulfilled=function(){
return !!_25;
};
this.isCanceled=_23.isCanceled=function(){
return _28;
};
this.progress=function(_2a,_2b){
if(!_25){
_b(_29,_6,_2a,null,_24);
return _23;
}else{
if(_2b===true){
throw new Error(_9);
}else{
return _23;
}
}
};
this.resolve=function(_2c,_2d){
if(!_25){
_b(_29,_25=_7,_26=_2c,null,_24);
_29=null;
return _23;
}else{
if(_2d===true){
throw new Error(_9);
}else{
return _23;
}
}
};
var _2e=this.reject=function(_2f,_30){
if(!_25){
if(1&&Error.captureStackTrace){
Error.captureStackTrace(_27={},_2e);
}
_b(_29,_25=_8,_26=_2f,_27,_24);
_29=null;
return _23;
}else{
if(_30===true){
throw new Error(_9);
}else{
return _23;
}
}
};
this.then=_23.then=function(_31,_32,_33){
var _34=[_33,_31,_32];
_34.cancel=_23.cancel;
_34.deferred=new _11(function(_35){
return _34.cancel&&_34.cancel(_35);
});
if(_25&&!_29){
_12(_34,_25,_26,_27);
}else{
_29.push(_34);
}
return _34.deferred.promise;
};
this.cancel=_23.cancel=function(_36,_37){
if(!_25){
if(_22){
var _38=_22(_36);
_36=typeof _38==="undefined"?_36:_38;
}
_28=true;
if(!_25){
if(typeof _36==="undefined"){
_36=new _3();
}
_2e(_36);
return _36;
}else{
if(_25===_8&&_26===_36){
return _36;
}
}
}else{
if(_37===true){
throw new Error(_9);
}
}
};
_a(_23);
};
_11.prototype.toString=function(){
return "[object Deferred]";
};
if(_5){
_5(_11);
}
return _11;
});
