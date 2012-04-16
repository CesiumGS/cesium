/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.ml.Action"]){
dojo._hasResource["dojox.wire.ml.Action"]=true;
dojo.provide("dojox.wire.ml.Action");
dojo.provide("dojox.wire.ml.ActionFilter");
dojo.require("dijit._Widget");
dojo.require("dijit._Container");
dojo.require("dojox.wire.Wire");
dojo.require("dojox.wire.ml.util");
dojo.declare("dojox.wire.ml.Action",[dijit._Widget,dijit._Container],{trigger:"",triggerEvent:"",triggerTopic:"",postCreate:function(){
this._connect();
},_connect:function(){
if(this.triggerEvent){
if(this.trigger){
var _1=dojox.wire.ml._getValue(this.trigger);
if(_1){
if(!_1[this.triggerEvent]){
_1[this.triggerEvent]=function(){
};
}
this._triggerHandle=dojo.connect(_1,this.triggerEvent,this,"run");
}
}else{
var _2=this.triggerEvent.toLowerCase();
if(_2=="onload"){
var _3=this;
dojo.addOnLoad(function(){
_3._run.apply(_3,arguments);
});
}
}
}else{
if(this.triggerTopic){
this._triggerHandle=dojo.subscribe(this.triggerTopic,this,"run");
}
}
},_disconnect:function(){
if(this._triggerHandle){
if(this.triggerTopic){
dojo.unsubscribe(this.triggerTopic,this._triggerHandle);
}else{
dojo.disconnect(this._triggerHandle);
}
}
},run:function(){
var _4=this.getChildren();
for(var i in _4){
var _5=_4[i];
if(_5 instanceof dojox.wire.ml.ActionFilter){
if(!_5.filter.apply(_5,arguments)){
return;
}
}
}
this._run.apply(this,arguments);
},_run:function(){
var _6=this.getChildren();
for(var i in _6){
var _7=_6[i];
if(_7 instanceof dojox.wire.ml.Action){
_7.run.apply(_7,arguments);
}
}
},uninitialize:function(){
this._disconnect();
return true;
}});
dojo.declare("dojox.wire.ml.ActionFilter",dijit._Widget,{required:"",requiredValue:"",type:"",message:"",error:"",filter:function(){
if(this.required===""){
return true;
}else{
var _8=dojox.wire.ml._getValue(this.required,arguments);
if(this.requiredValue===""){
if(_8){
return true;
}
}else{
var _9=this.requiredValue;
if(this.type!==""){
var _a=this.type.toLowerCase();
if(_a==="boolean"){
if(_9.toLowerCase()==="false"){
_9=false;
}else{
_9=true;
}
}else{
if(_a==="number"){
_9=parseInt(_9,10);
}
}
}
if(_8===_9){
return true;
}
}
}
if(this.message){
if(this.error){
dojox.wire.ml._setValue(this.error,this.message);
}else{
alert(this.message);
}
}
return false;
}});
}
