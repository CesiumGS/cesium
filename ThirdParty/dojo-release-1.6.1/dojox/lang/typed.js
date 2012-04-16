/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.typed"]){
dojo._hasResource["dojox.lang.typed"]=true;
(function(){
var _1,_2=typeof dojo!="undefined";
if(_2){
dojo.provide("dojox.lang.typed");
dojo.require("dojox.json.schema");
_1=dojox.json.schema;
}else{
if(typeof JSONSchema=="undefined"){
throw new Error("Dojo or JSON Schema library must be present");
}
_1=JSONSchema;
}
function _3(_4,_5){
var _6=function(){
var _7=_5();
if(_7&&_7.parameters){
var _8=_7.parameters;
for(var j=0;j<_8.length;j++){
arguments[j]=_9(arguments[j],_8[j],j.toString());
}
if(_7.additionalParameters){
for(;j<arguments.length;j++){
arguments[j]=_9(arguments[j],_7.additionalParameters,j.toString());
}
}
}
var _a=_4.apply(this,arguments);
if(_7.returns){
_9(_a,_7.returns);
}
return _a;
};
_6.__typedFunction__=true;
for(var i in _4){
_6[i]=_4[i];
}
return _6;
};
function _b(_c){
return function(){
return _c;
};
};
function _9(_d,_e,_f){
if(typeof _d=="function"&&_e&&!_d.__typedFunction__){
_d=_3(_d,_b(_e));
}
var _10=_1._validate(_d,_e,_f);
if(!_10.valid){
var _11="";
var _12=_10.errors;
for(var i=0;i<_12.length;i++){
_11+=_12[i].property+" "+_12[i].message+"\n";
}
throw new TypeError(_11);
}
return _d;
};
var _13=_1.__defineGetter__;
var _14=function(_15){
if(_15.__typedClass__){
return _15;
}
var _16=function(){
var i,_17,_18=_16.properties;
var _19=_16.methods;
_15.apply(this,arguments);
this.__props__={};
for(i in _19){
_17=this[i];
if(_17){
if(!_17.__typedFunction__){
var _1a=this;
while(!_1a.hasOwnProperty(i)&&_1a.__proto__){
_1a=_1a.__proto__;
}
(function(i){
_1a[i]=_3(_17,function(){
return _19[i];
});
})(i);
}
}else{
(function(i){
this[i]=function(){
throw new TypeError("The method "+i+" is defined but not implemented");
};
})(i);
}
}
if(_13){
var _1b=this;
for(i in _18){
_17=this[i];
if(this.hasOwnProperty(i)){
this.__props__[i]=_17;
}
(function(i){
delete _1b[i];
_1b.__defineGetter__(i,function(){
return i in this.__props__?this.__props__[i]:this.__proto__[i];
});
_1b.__defineSetter__(i,function(_1c){
_9(_1c,_18[i],i);
return this.__props__[i]=_1c;
});
})(i);
}
}
_9(this,_16);
};
_16.prototype=_15.prototype;
for(var i in _15){
_16[i]=_15[i];
}
if(_15.prototype.declaredClass&&_2){
dojo.setObject(_15.prototype.declaredClass,_16);
}
_16.__typedClass__=true;
return _16;
};
if(_2){
dojox.lang.typed=_14;
if(dojo.config.typeCheckAllClasses){
var _1d=dojo.declare;
dojo.declare=function(_1e){
var _1f=_1d.apply(this,arguments);
_1f=_14(_1f);
return _1f;
};
dojo.mixin(dojo.declare,_1d);
}
}else{
typed=_14;
}
})();
}
