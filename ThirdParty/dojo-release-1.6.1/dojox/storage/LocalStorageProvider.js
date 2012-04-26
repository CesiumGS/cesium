/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.LocalStorageProvider"]){
dojo._hasResource["dojox.storage.LocalStorageProvider"]=true;
dojo.provide("dojox.storage.LocalStorageProvider");
dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");
dojo.declare("dojox.storage.LocalStorageProvider",[dojox.storage.Provider],{store:null,initialize:function(){
this.store=localStorage;
this.initialized=true;
dojox.storage.manager.loaded();
},isAvailable:function(){
return typeof localStorage!="undefined";
},put:function(_1,_2,_3,_4){
this._assertIsValidKey(_1);
_4=_4||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_4);
var _5=this.getFullKey(_1,_4);
_2=dojo.toJson(_2);
try{
this.store.setItem(_5,_2);
if(_3){
_3(this.SUCCESS,_1,null,_4);
}
}
catch(e){
if(_3){
_3(this.FAILED,_1,e.toString(),_4);
}
}
},get:function(_6,_7){
this._assertIsValidKey(_6);
_7=_7||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_7);
_6=this.getFullKey(_6,_7);
return dojo.fromJson(this.store.getItem(_6));
},getKeys:function(_8){
_8=_8||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_8);
_8="__"+_8+"_";
var _9=[];
for(var i=0;i<this.store.length;i++){
var _a=this.store.key(i);
if(this._beginsWith(_a,_8)){
_a=_a.substring(_8.length);
_9.push(_a);
}
}
return _9;
},clear:function(_b){
_b=_b||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_b);
_b="__"+_b+"_";
var _c=[];
for(var i=0;i<this.store.length;i++){
if(this._beginsWith(this.store.key(i),_b)){
_c.push(this.store.key(i));
}
}
dojo.forEach(_c,dojo.hitch(this.store,"removeItem"));
},remove:function(_d,_e){
_e=_e||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_e);
this.store.removeItem(this.getFullKey(_d,_e));
},getNamespaces:function(){
var _f=[this.DEFAULT_NAMESPACE];
var _10={};
_10[this.DEFAULT_NAMESPACE]=true;
var _11=/^__([^_]*)_/;
for(var i=0;i<this.store.length;i++){
var _12=this.store.key(i);
if(_11.test(_12)==true){
var _13=_12.match(_11)[1];
if(typeof _10[_13]=="undefined"){
_10[_13]=true;
_f.push(_13);
}
}
}
return _f;
},isPermanent:function(){
return true;
},getMaximumSize:function(){
return dojox.storage.SIZE_NO_LIMIT;
},hasSettingsUI:function(){
return false;
},isValidKey:function(_14){
if(_14===null||_14===undefined){
return false;
}
return /^[0-9A-Za-z_-]*$/.test(_14);
},isValidNamespace:function(_15){
if(_15===null||_15===undefined){
return false;
}
return /^[0-9A-Za-z-]*$/.test(_15);
},getFullKey:function(key,_16){
return "__"+_16+"_"+key;
},_beginsWith:function(_17,_18){
if(_18.length>_17.length){
return false;
}
return _17.substring(0,_18.length)===_18;
},_assertIsValidNamespace:function(_19){
if(this.isValidNamespace(_19)===false){
throw new Error("Invalid namespace given: "+_19);
}
},_assertIsValidKey:function(key){
if(this.isValidKey(key)===false){
throw new Error("Invalid key given: "+key);
}
}});
dojox.storage.manager.register("dojox.storage.LocalStorageProvider",new dojox.storage.LocalStorageProvider());
}
