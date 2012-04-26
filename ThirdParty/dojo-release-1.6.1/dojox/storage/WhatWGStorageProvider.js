/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.WhatWGStorageProvider"]){
dojo._hasResource["dojox.storage.WhatWGStorageProvider"]=true;
dojo.provide("dojox.storage.WhatWGStorageProvider");
dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");
dojo.declare("dojox.storage.WhatWGStorageProvider",[dojox.storage.Provider],{initialized:false,_domain:null,_available:null,_statusHandler:null,_allNamespaces:null,_storageEventListener:null,initialize:function(){
if(dojo.config["disableWhatWGStorage"]==true){
return;
}
this._domain=location.hostname;
this.initialized=true;
dojox.storage.manager.loaded();
},isAvailable:function(){
try{
var _1=globalStorage[location.hostname];
}
catch(e){
this._available=false;
return this._available;
}
this._available=true;
return this._available;
},put:function(_2,_3,_4,_5){
if(this.isValidKey(_2)==false){
throw new Error("Invalid key given: "+_2);
}
_5=_5||this.DEFAULT_NAMESPACE;
_2=this.getFullKey(_2,_5);
this._statusHandler=_4;
if(dojo.isString(_3)){
_3="string:"+_3;
}else{
_3=dojo.toJson(_3);
}
var _6=dojo.hitch(this,function(_7){
window.removeEventListener("storage",_6,false);
if(_4){
_4.call(null,this.SUCCESS,_2,null,_5);
}
});
window.addEventListener("storage",_6,false);
try{
var _8=globalStorage[this._domain];
_8.setItem(_2,_3);
}
catch(e){
this._statusHandler.call(null,this.FAILED,_2,e.toString(),_5);
}
},get:function(_9,_a){
if(this.isValidKey(_9)==false){
throw new Error("Invalid key given: "+_9);
}
_a=_a||this.DEFAULT_NAMESPACE;
_9=this.getFullKey(_9,_a);
var _b=globalStorage[this._domain];
var _c=_b.getItem(_9);
if(_c==null||_c==""){
return null;
}
_c=_c.value;
if(dojo.isString(_c)&&(/^string:/.test(_c))){
_c=_c.substring("string:".length);
}else{
_c=dojo.fromJson(_c);
}
return _c;
},getNamespaces:function(){
var _d=[this.DEFAULT_NAMESPACE];
var _e={};
var _f=globalStorage[this._domain];
var _10=/^__([^_]*)_/;
for(var i=0;i<_f.length;i++){
var _11=_f.key(i);
if(_10.test(_11)==true){
var _12=_11.match(_10)[1];
if(typeof _e[_12]=="undefined"){
_e[_12]=true;
_d.push(_12);
}
}
}
return _d;
},getKeys:function(_13){
_13=_13||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_13)==false){
throw new Error("Invalid namespace given: "+_13);
}
var _14;
if(_13==this.DEFAULT_NAMESPACE){
_14=new RegExp("^([^_]{2}.*)$");
}else{
_14=new RegExp("^__"+_13+"_(.*)$");
}
var _15=globalStorage[this._domain];
var _16=[];
for(var i=0;i<_15.length;i++){
var _17=_15.key(i);
if(_14.test(_17)==true){
_17=_17.match(_14)[1];
_16.push(_17);
}
}
return _16;
},clear:function(_18){
_18=_18||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_18)==false){
throw new Error("Invalid namespace given: "+_18);
}
var _19;
if(_18==this.DEFAULT_NAMESPACE){
_19=new RegExp("^[^_]{2}");
}else{
_19=new RegExp("^__"+_18+"_");
}
var _1a=globalStorage[this._domain];
var _1b=[];
for(var i=0;i<_1a.length;i++){
if(_19.test(_1a.key(i))==true){
_1b[_1b.length]=_1a.key(i);
}
}
dojo.forEach(_1b,dojo.hitch(_1a,"removeItem"));
},remove:function(key,_1c){
key=this.getFullKey(key,_1c);
var _1d=globalStorage[this._domain];
_1d.removeItem(key);
},isPermanent:function(){
return true;
},getMaximumSize:function(){
return this.SIZE_NO_LIMIT;
},hasSettingsUI:function(){
return false;
},showSettingsUI:function(){
throw new Error(this.declaredClass+" does not support a storage settings user-interface");
},hideSettingsUI:function(){
throw new Error(this.declaredClass+" does not support a storage settings user-interface");
},getFullKey:function(key,_1e){
_1e=_1e||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_1e)==false){
throw new Error("Invalid namespace given: "+_1e);
}
if(_1e==this.DEFAULT_NAMESPACE){
return key;
}else{
return "__"+_1e+"_"+key;
}
}});
dojox.storage.manager.register("dojox.storage.WhatWGStorageProvider",new dojox.storage.WhatWGStorageProvider());
}
