/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.Wire"]){
dojo._hasResource["dojox.wire.Wire"]=true;
dojo.provide("dojox.wire.Wire");
dojo.require("dojox.wire._base");
dojo.declare("dojox.wire.Wire",null,{_wireClass:"dojox.wire.Wire",constructor:function(_1){
dojo.mixin(this,_1);
if(this.converter){
if(dojo.isString(this.converter)){
var _2=dojo.getObject(this.converter);
if(dojo.isFunction(_2)){
try{
var _3=new _2();
if(_3&&!dojo.isFunction(_3["convert"])){
this.converter={convert:_2};
}else{
this.converter=_3;
}
}
catch(e){
}
}else{
if(dojo.isObject(_2)){
if(dojo.isFunction(_2["convert"])){
this.converter=_2;
}
}
}
if(dojo.isString(this.converter)){
var _4=dojox.wire._getClass(this.converter);
if(_4){
this.converter=new _4();
}else{
this.converter=undefined;
}
}
}else{
if(dojo.isFunction(this.converter)){
this.converter={convert:this.converter};
}
}
}
},getValue:function(_5){
var _6=undefined;
if(dojox.wire.isWire(this.object)){
_6=this.object.getValue(_5);
}else{
_6=(this.object||_5);
}
if(this.property){
var _7=this.property.split(".");
for(var i in _7){
if(!_6){
return _6;
}
_6=this._getPropertyValue(_6,_7[i]);
}
}
var _8=undefined;
if(this._getValue){
_8=this._getValue(_6);
}else{
_8=_6;
}
if(_8){
if(this.type){
if(this.type=="string"){
_8=_8.toString();
}else{
if(this.type=="number"){
_8=parseInt(_8,10);
}else{
if(this.type=="boolean"){
_8=(_8!="false");
}else{
if(this.type=="array"){
if(!dojo.isArray(_8)){
_8=[_8];
}
}
}
}
}
}
if(this.converter&&this.converter.convert){
_8=this.converter.convert(_8,this);
}
}
return _8;
},setValue:function(_9,_a){
var _b=undefined;
if(dojox.wire.isWire(this.object)){
_b=this.object.getValue(_a);
}else{
_b=(this.object||_a);
}
var _c=undefined;
var o;
if(this.property){
if(!_b){
if(dojox.wire.isWire(this.object)){
_b={};
this.object.setValue(_b,_a);
}else{
throw new Error(this._wireClass+".setValue(): invalid object");
}
}
var _d=this.property.split(".");
var _e=_d.length-1;
for(var i=0;i<_e;i++){
var p=_d[i];
o=this._getPropertyValue(_b,p);
if(!o){
o={};
this._setPropertyValue(_b,p,o);
}
_b=o;
}
_c=_d[_e];
}
if(this._setValue){
if(_c){
o=this._getPropertyValue(_b,_c);
if(!o){
o={};
this._setPropertyValue(_b,_c,o);
}
_b=o;
}
var _f=this._setValue(_b,_9);
if(!_b&&_f){
if(dojox.wire.isWire(this.object)){
this.object.setValue(_f,_a);
}else{
throw new Error(this._wireClass+".setValue(): invalid object");
}
}
}else{
if(_c){
this._setPropertyValue(_b,_c,_9);
}else{
if(dojox.wire.isWire(this.object)){
this.object.setValue(_9,_a);
}else{
throw new Error(this._wireClass+".setValue(): invalid property");
}
}
}
},_getPropertyValue:function(_10,_11){
var _12=undefined;
var i1=_11.indexOf("[");
if(i1>=0){
var i2=_11.indexOf("]");
var _13=_11.substring(i1+1,i2);
var _14=null;
if(i1===0){
_14=_10;
}else{
_11=_11.substring(0,i1);
_14=this._getPropertyValue(_10,_11);
if(_14&&!dojo.isArray(_14)){
_14=[_14];
}
}
if(_14){
_12=_14[_13];
}
}else{
if(_10.getPropertyValue){
_12=_10.getPropertyValue(_11);
}else{
var _15="get"+_11.charAt(0).toUpperCase()+_11.substring(1);
if(this._useGet(_10)){
_12=_10.get(_11);
}else{
if(this._useAttr(_10)){
_12=_10.attr(_11);
}else{
if(_10[_15]){
_12=_10[_15]();
}else{
_12=_10[_11];
}
}
}
}
}
return _12;
},_setPropertyValue:function(_16,_17,_18){
var i1=_17.indexOf("[");
if(i1>=0){
var i2=_17.indexOf("]");
var _19=_17.substring(i1+1,i2);
var _1a=null;
if(i1===0){
_1a=_16;
}else{
_17=_17.substring(0,i1);
_1a=this._getPropertyValue(_16,_17);
if(!_1a){
_1a=[];
this._setPropertyValue(_16,_17,_1a);
}
}
_1a[_19]=_18;
}else{
if(_16.setPropertyValue){
_16.setPropertyValue(_17,_18);
}else{
var _1b="set"+_17.charAt(0).toUpperCase()+_17.substring(1);
if(this._useSet(_16)){
_16.set(_17,_18);
}else{
if(this._useAttr(_16)){
_16.attr(_17,_18);
}else{
if(_16[_1b]){
_16[_1b](_18);
}else{
_16[_17]=_18;
}
}
}
}
}
},_useGet:function(_1c){
var _1d=false;
if(dojo.isFunction(_1c.get)){
_1d=true;
}
return _1d;
},_useSet:function(_1e){
var _1f=false;
if(dojo.isFunction(_1e.set)){
_1f=true;
}
return _1f;
},_useAttr:function(_20){
var _21=false;
if(dojo.isFunction(_20.attr)){
_21=true;
}
return _21;
}});
}
