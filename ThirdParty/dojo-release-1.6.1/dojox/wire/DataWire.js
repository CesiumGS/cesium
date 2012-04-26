/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.DataWire"]){
dojo._hasResource["dojox.wire.DataWire"]=true;
dojo.provide("dojox.wire.DataWire");
dojo.require("dojox.wire.Wire");
dojo.declare("dojox.wire.DataWire",dojox.wire.Wire,{_wireClass:"dojox.wire.DataWire",constructor:function(_1){
if(!this.dataStore&&this.parent){
this.dataStore=this.parent.dataStore;
}
},_getValue:function(_2){
if(!_2||!this.attribute||!this.dataStore){
return _2;
}
var _3=_2;
var _4=this.attribute.split(".");
for(var i in _4){
_3=this._getAttributeValue(_3,_4[i]);
if(!_3){
return undefined;
}
}
return _3;
},_setValue:function(_5,_6){
if(!_5||!this.attribute||!this.dataStore){
return _5;
}
var _7=_5;
var _8=this.attribute.split(".");
var _9=_8.length-1;
for(var i=0;i<_9;i++){
_7=this._getAttributeValue(_7,_8[i]);
if(!_7){
return undefined;
}
}
this._setAttributeValue(_7,_8[_9],_6);
return _5;
},_getAttributeValue:function(_a,_b){
var _c=undefined;
var i1=_b.indexOf("[");
if(i1>=0){
var i2=_b.indexOf("]");
var _d=_b.substring(i1+1,i2);
_b=_b.substring(0,i1);
var _e=this.dataStore.getValues(_a,_b);
if(_e){
if(!_d){
_c=_e;
}else{
_c=_e[_d];
}
}
}else{
_c=this.dataStore.getValue(_a,_b);
}
return _c;
},_setAttributeValue:function(_f,_10,_11){
var i1=_10.indexOf("[");
if(i1>=0){
var i2=_10.indexOf("]");
var _12=_10.substring(i1+1,i2);
_10=_10.substring(0,i1);
var _13=null;
if(!_12){
_13=_11;
}else{
_13=this.dataStore.getValues(_f,_10);
if(!_13){
_13=[];
}
_13[_12]=_11;
}
this.dataStore.setValues(_f,_10,_13);
}else{
this.dataStore.setValue(_f,_10,_11);
}
}});
}
