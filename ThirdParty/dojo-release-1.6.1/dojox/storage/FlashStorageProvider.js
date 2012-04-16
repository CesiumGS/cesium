/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.FlashStorageProvider"]){
dojo._hasResource["dojox.storage.FlashStorageProvider"]=true;
dojo.provide("dojox.storage.FlashStorageProvider");
dojo.require("dojox.flash");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.Provider");
dojo.declare("dojox.storage.FlashStorageProvider",dojox.storage.Provider,{initialized:false,_available:null,_statusHandler:null,_flashReady:false,_pageReady:false,initialize:function(){
if(dojo.config["disableFlashStorage"]==true){
return;
}
dojox.flash.addLoadedListener(dojo.hitch(this,function(){
this._flashReady=true;
if(this._flashReady&&this._pageReady){
this._loaded();
}
}));
var _1=dojo.moduleUrl("dojox","storage/Storage.swf").toString();
dojox.flash.setSwf(_1,false);
dojo.connect(dojo,"loaded",this,function(){
this._pageReady=true;
if(this._flashReady&&this._pageReady){
this._loaded();
}
});
},setFlushDelay:function(_2){
if(_2===null||typeof _2==="undefined"||isNaN(_2)){
throw new Error("Invalid argunment: "+_2);
}
dojox.flash.comm.setFlushDelay(String(_2));
},getFlushDelay:function(){
return Number(dojox.flash.comm.getFlushDelay());
},flush:function(_3){
if(_3==null||typeof _3=="undefined"){
_3=dojox.storage.DEFAULT_NAMESPACE;
}
dojox.flash.comm.flush(_3);
},isAvailable:function(){
return (this._available=!dojo.config["disableFlashStorage"]);
},put:function(_4,_5,_6,_7){
if(!this.isValidKey(_4)){
throw new Error("Invalid key given: "+_4);
}
if(!_7){
_7=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_7)){
throw new Error("Invalid namespace given: "+_7);
}
this._statusHandler=_6;
if(dojo.isString(_5)){
_5="string:"+_5;
}else{
_5=dojo.toJson(_5);
}
dojox.flash.comm.put(_4,_5,_7);
},putMultiple:function(_8,_9,_a,_b){
if(!this.isValidKeyArray(_8)||!_9 instanceof Array||_8.length!=_9.length){
throw new Error("Invalid arguments: keys = ["+_8+"], values = ["+_9+"]");
}
if(!_b){
_b=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_b)){
throw new Error("Invalid namespace given: "+_b);
}
this._statusHandler=_a;
var _c=_8.join(",");
var _d=[];
for(var i=0;i<_9.length;i++){
if(dojo.isString(_9[i])){
_9[i]="string:"+_9[i];
}else{
_9[i]=dojo.toJson(_9[i]);
}
_d[i]=_9[i].length;
}
var _e=_9.join("");
var _f=_d.join(",");
dojox.flash.comm.putMultiple(_c,_e,_f,_b);
},get:function(key,_10){
if(!this.isValidKey(key)){
throw new Error("Invalid key given: "+key);
}
if(!_10){
_10=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_10)){
throw new Error("Invalid namespace given: "+_10);
}
var _11=dojox.flash.comm.get(key,_10);
if(_11==""){
return null;
}
return this._destringify(_11);
},getMultiple:function(_12,_13){
if(!this.isValidKeyArray(_12)){
throw new ("Invalid key array given: "+_12);
}
if(!_13){
_13=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_13)){
throw new Error("Invalid namespace given: "+_13);
}
var _14=_12.join(",");
var _15=dojox.flash.comm.getMultiple(_14,_13);
var _16=eval("("+_15+")");
for(var i=0;i<_16.length;i++){
_16[i]=(_16[i]=="")?null:this._destringify(_16[i]);
}
return _16;
},_destringify:function(_17){
if(dojo.isString(_17)&&(/^string:/.test(_17))){
_17=_17.substring("string:".length);
}else{
_17=dojo.fromJson(_17);
}
return _17;
},getKeys:function(_18){
if(!_18){
_18=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_18)){
throw new Error("Invalid namespace given: "+_18);
}
var _19=dojox.flash.comm.getKeys(_18);
if(_19==null||_19=="null"){
_19="";
}
_19=_19.split(",");
_19.sort();
return _19;
},getNamespaces:function(){
var _1a=dojox.flash.comm.getNamespaces();
if(_1a==null||_1a=="null"){
_1a=dojox.storage.DEFAULT_NAMESPACE;
}
_1a=_1a.split(",");
_1a.sort();
return _1a;
},clear:function(_1b){
if(!_1b){
_1b=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_1b)){
throw new Error("Invalid namespace given: "+_1b);
}
dojox.flash.comm.clear(_1b);
},remove:function(key,_1c){
if(!_1c){
_1c=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_1c)){
throw new Error("Invalid namespace given: "+_1c);
}
dojox.flash.comm.remove(key,_1c);
},removeMultiple:function(_1d,_1e){
if(!this.isValidKeyArray(_1d)){
dojo.raise("Invalid key array given: "+_1d);
}
if(!_1e){
_1e=dojox.storage.DEFAULT_NAMESPACE;
}
if(!this.isValidKey(_1e)){
throw new Error("Invalid namespace given: "+_1e);
}
var _1f=_1d.join(",");
dojox.flash.comm.removeMultiple(_1f,_1e);
},isPermanent:function(){
return true;
},getMaximumSize:function(){
return dojox.storage.SIZE_NO_LIMIT;
},hasSettingsUI:function(){
return true;
},showSettingsUI:function(){
dojox.flash.comm.showSettings();
dojox.flash.obj.setVisible(true);
dojox.flash.obj.center();
},hideSettingsUI:function(){
dojox.flash.obj.setVisible(false);
if(dojo.isFunction(dojox.storage.onHideSettingsUI)){
dojox.storage.onHideSettingsUI.call(null);
}
},getResourceList:function(){
return [];
},_loaded:function(){
this._allNamespaces=this.getNamespaces();
this.initialized=true;
dojox.storage.manager.loaded();
},_onStatus:function(_20,key,_21){
var ds=dojox.storage;
var dfo=dojox.flash.obj;
if(_20==ds.PENDING){
dfo.center();
dfo.setVisible(true);
}else{
dfo.setVisible(false);
}
if(ds._statusHandler){
ds._statusHandler.call(null,_20,key,null,_21);
}
}});
dojox.storage.manager.register("dojox.storage.FlashStorageProvider",new dojox.storage.FlashStorageProvider());
}
