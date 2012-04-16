/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.CookieStorageProvider"]){
dojo._hasResource["dojox.storage.CookieStorageProvider"]=true;
dojo.provide("dojox.storage.CookieStorageProvider");
dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");
dojo.require("dojo.cookie");
dojo.declare("dojox.storage.CookieStorageProvider",[dojox.storage.Provider],{store:null,cookieName:"dojoxStorageCookie",storageLife:730,initialize:function(){
this.store=dojo.fromJson(dojo.cookie(this.cookieName))||{};
this.initialized=true;
dojox.storage.manager.loaded();
},isAvailable:function(){
return dojo.cookie.isSupported();
},put:function(_1,_2,_3,_4){
this._assertIsValidKey(_1);
_4=_4||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_4);
fullKey=this.getFullKey(_1,_4);
this.store[fullKey]=dojo.toJson(_2);
this._save();
var _5=dojo.toJson(this.store)===dojo.cookie(this.cookieName);
if(!_5){
this.remove(_1,_4);
}
if(_3){
_3(_5?this.SUCCESS:this.FAILED,_1,null,_4);
}
},get:function(_6,_7){
this._assertIsValidKey(_6);
_7=_7||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_7);
_6=this.getFullKey(_6,_7);
return this.store[_6]?dojo.fromJson(this.store[_6]):null;
},getKeys:function(_8){
_8=_8||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_8);
_8="__"+_8+"_";
var _9=[];
for(var _a in this.store){
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
for(var _c in this.store){
if(this._beginsWith(_c,_b)){
delete (this.store[_c]);
}
}
this._save();
},remove:function(_d,_e){
_e=_e||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_e);
this._assertIsValidKey(_d);
_d=this.getFullKey(_d,_e);
delete this.store[_d];
this._save();
},getNamespaces:function(){
var _f=[this.DEFAULT_NAMESPACE];
var _10={};
_10[this.DEFAULT_NAMESPACE]=true;
var _11=/^__([^_]*)_/;
for(var _12 in this.store){
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
return 4;
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
},_save:function(){
dojo.cookie(this.cookieName,dojo.toJson(this.store),{expires:this.storageLife});
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
dojox.storage.manager.register("dojox.storage.CookieStorageProvider",new dojox.storage.CookieStorageProvider());
}
