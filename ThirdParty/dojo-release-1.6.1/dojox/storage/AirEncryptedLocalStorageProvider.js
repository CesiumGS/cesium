/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.AirEncryptedLocalStorageProvider"]){
dojo._hasResource["dojox.storage.AirEncryptedLocalStorageProvider"]=true;
dojo.provide("dojox.storage.AirEncryptedLocalStorageProvider");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.Provider");
if(dojo.isAIR){
(function(){
if(!_1){
var _1={};
}
_1.ByteArray=window.runtime.flash.utils.ByteArray;
_1.EncryptedLocalStore=window.runtime.flash.data.EncryptedLocalStore,dojo.declare("dojox.storage.AirEncryptedLocalStorageProvider",[dojox.storage.Provider],{initialize:function(){
dojox.storage.manager.loaded();
},isAvailable:function(){
return true;
},_getItem:function(_2){
var _3=_1.EncryptedLocalStore.getItem("__dojo_"+_2);
return _3?_3.readUTFBytes(_3.length):"";
},_setItem:function(_4,_5){
var _6=new _1.ByteArray();
_6.writeUTFBytes(_5);
_1.EncryptedLocalStore.setItem("__dojo_"+_4,_6);
},_removeItem:function(_7){
_1.EncryptedLocalStore.removeItem("__dojo_"+_7);
},put:function(_8,_9,_a,_b){
if(this.isValidKey(_8)==false){
throw new Error("Invalid key given: "+_8);
}
_b=_b||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_b)==false){
throw new Error("Invalid namespace given: "+_b);
}
try{
var _c=this._getItem("namespaces")||"|";
if(_c.indexOf("|"+_b+"|")==-1){
this._setItem("namespaces",_c+_b+"|");
}
var _d=this._getItem(_b+"_keys")||"|";
if(_d.indexOf("|"+_8+"|")==-1){
this._setItem(_b+"_keys",_d+_8+"|");
}
this._setItem("_"+_b+"_"+_8,_9);
}
catch(e){
_a(this.FAILED,_8,e.toString(),_b);
return;
}
if(_a){
_a(this.SUCCESS,_8,null,_b);
}
},get:function(_e,_f){
if(this.isValidKey(_e)==false){
throw new Error("Invalid key given: "+_e);
}
_f=_f||this.DEFAULT_NAMESPACE;
return this._getItem("_"+_f+"_"+_e);
},getNamespaces:function(){
var _10=[this.DEFAULT_NAMESPACE];
var _11=(this._getItem("namespaces")||"|").split("|");
for(var i=0;i<_11.length;i++){
if(_11[i].length&&_11[i]!=this.DEFAULT_NAMESPACE){
_10.push(_11[i]);
}
}
return _10;
},getKeys:function(_12){
_12=_12||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_12)==false){
throw new Error("Invalid namespace given: "+_12);
}
var _13=[];
var _14=(this._getItem(_12+"_keys")||"|").split("|");
for(var i=0;i<_14.length;i++){
if(_14[i].length){
_13.push(_14[i]);
}
}
return _13;
},clear:function(_15){
if(this.isValidKey(_15)==false){
throw new Error("Invalid namespace given: "+_15);
}
var _16=this._getItem("namespaces")||"|";
if(_16.indexOf("|"+_15+"|")!=-1){
this._setItem("namespaces",_16.replace("|"+_15+"|","|"));
}
var _17=(this._getItem(_15+"_keys")||"|").split("|");
for(var i=0;i<_17.length;i++){
if(_17[i].length){
this._removeItem(_15+"_"+_17[i]);
}
}
this._removeItem(_15+"_keys");
},remove:function(key,_18){
_18=_18||this.DEFAULT_NAMESPACE;
var _19=this._getItem(_18+"_keys")||"|";
if(_19.indexOf("|"+key+"|")!=-1){
this._setItem(_18+"_keys",_19.replace("|"+key+"|","|"));
}
this._removeItem("_"+_18+"_"+key);
},putMultiple:function(_1a,_1b,_1c,_1d){
if(this.isValidKeyArray(_1a)===false||!_1b instanceof Array||_1a.length!=_1b.length){
throw new Error("Invalid arguments: keys = ["+_1a+"], values = ["+_1b+"]");
}
if(_1d==null||typeof _1d=="undefined"){
_1d=this.DEFAULT_NAMESPACE;
}
if(this.isValidKey(_1d)==false){
throw new Error("Invalid namespace given: "+_1d);
}
this._statusHandler=_1c;
try{
for(var i=0;i<_1a.length;i++){
this.put(_1a[i],_1b[i],null,_1d);
}
}
catch(e){
if(_1c){
_1c(this.FAILED,_1a,e.toString(),_1d);
}
return;
}
if(_1c){
_1c(this.SUCCESS,_1a,null);
}
},getMultiple:function(_1e,_1f){
if(this.isValidKeyArray(_1e)===false){
throw new Error("Invalid key array given: "+_1e);
}
if(_1f==null||typeof _1f=="undefined"){
_1f=this.DEFAULT_NAMESPACE;
}
if(this.isValidKey(_1f)==false){
throw new Error("Invalid namespace given: "+_1f);
}
var _20=[];
for(var i=0;i<_1e.length;i++){
_20[i]=this.get(_1e[i],_1f);
}
return _20;
},removeMultiple:function(_21,_22){
_22=_22||this.DEFAULT_NAMESPACE;
for(var i=0;i<_21.length;i++){
this.remove(_21[i],_22);
}
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
}});
dojox.storage.manager.register("dojox.storage.AirEncryptedLocalStorageProvider",new dojox.storage.AirEncryptedLocalStorageProvider());
dojox.storage.manager.initialize();
})();
}
}
