/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.ml.Data"]){
dojo._hasResource["dojox.wire.ml.Data"]=true;
dojo.provide("dojox.wire.ml.Data");
dojo.provide("dojox.wire.ml.DataProperty");
dojo.require("dijit._Widget");
dojo.require("dijit._Container");
dojo.require("dojox.wire.ml.util");
dojo.declare("dojox.wire.ml.Data",[dijit._Widget,dijit._Container],{startup:function(){
this._initializeProperties();
},_initializeProperties:function(_1){
if(!this._properties||_1){
this._properties={};
}
var _2=this.getChildren();
for(var i in _2){
var _3=_2[i];
if((_3 instanceof dojox.wire.ml.DataProperty)&&_3.name){
this.setPropertyValue(_3.name,_3.getValue());
}
}
},getPropertyValue:function(_4){
return this._properties[_4];
},setPropertyValue:function(_5,_6){
this._properties[_5]=_6;
}});
dojo.declare("dojox.wire.ml.DataProperty",[dijit._Widget,dijit._Container],{name:"",type:"",value:"",_getValueAttr:function(){
return this.getValue();
},getValue:function(){
var _7=this.value;
if(this.type){
if(this.type=="number"){
_7=parseInt(_7);
}else{
if(this.type=="boolean"){
_7=(_7=="true");
}else{
if(this.type=="array"){
_7=[];
var _8=this.getChildren();
for(var i in _8){
var _9=_8[i];
if(_9 instanceof dojox.wire.ml.DataProperty){
_7.push(_9.getValue());
}
}
}else{
if(this.type=="object"){
_7={};
var _8=this.getChildren();
for(var i in _8){
var _9=_8[i];
if((_9 instanceof dojox.wire.ml.DataProperty)&&_9.name){
_7[_9.name]=_9.getValue();
}
}
}else{
if(this.type=="element"){
_7=new dojox.wire.ml.XmlElement(_7);
var _8=this.getChildren();
for(var i in _8){
var _9=_8[i];
if((_9 instanceof dojox.wire.ml.DataProperty)&&_9.name){
_7.setPropertyValue(_9.name,_9.getValue());
}
}
}
}
}
}
}
}
return _7;
}});
}
