/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.AirFileStorageProvider"]){
dojo._hasResource["dojox.storage.AirFileStorageProvider"]=true;
dojo.provide("dojox.storage.AirFileStorageProvider");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.Provider");
if(dojo.isAIR){
(function(){
if(!_1){
var _1={};
}
_1.File=window.runtime.flash.filesystem.File;
_1.FileStream=window.runtime.flash.filesystem.FileStream;
_1.FileMode=window.runtime.flash.filesystem.FileMode;
dojo.declare("dojox.storage.AirFileStorageProvider",[dojox.storage.Provider],{initialized:false,_storagePath:"__DOJO_STORAGE/",initialize:function(){
this.initialized=false;
try{
var _2=_1.File.applicationStorageDirectory.resolvePath(this._storagePath);
if(!_2.exists){
_2.createDirectory();
}
this.initialized=true;
}
catch(e){
}
dojox.storage.manager.loaded();
},isAvailable:function(){
return true;
},put:function(_3,_4,_5,_6){
if(this.isValidKey(_3)==false){
throw new Error("Invalid key given: "+_3);
}
_6=_6||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_6)==false){
throw new Error("Invalid namespace given: "+_6);
}
try{
this.remove(_3,_6);
var _7=_1.File.applicationStorageDirectory.resolvePath(this._storagePath+_6);
if(!_7.exists){
_7.createDirectory();
}
var _8=_7.resolvePath(_3);
var _9=new _1.FileStream();
_9.open(_8,_1.FileMode.WRITE);
_9.writeObject(_4);
_9.close();
}
catch(e){
_5(this.FAILED,_3,e.toString(),_6);
return;
}
if(_5){
_5(this.SUCCESS,_3,null,_6);
}
},get:function(_a,_b){
if(this.isValidKey(_a)==false){
throw new Error("Invalid key given: "+_a);
}
_b=_b||this.DEFAULT_NAMESPACE;
var _c=null;
var _d=_1.File.applicationStorageDirectory.resolvePath(this._storagePath+_b+"/"+_a);
if(_d.exists&&!_d.isDirectory){
var _e=new _1.FileStream();
_e.open(_d,_1.FileMode.READ);
_c=_e.readObject();
_e.close();
}
return _c;
},getNamespaces:function(){
var _f=[this.DEFAULT_NAMESPACE];
var dir=_1.File.applicationStorageDirectory.resolvePath(this._storagePath);
var _10=dir.getDirectoryListing(),i;
for(i=0;i<_10.length;i++){
if(_10[i].isDirectory&&_10[i].name!=this.DEFAULT_NAMESPACE){
_f.push(_10[i].name);
}
}
return _f;
},getKeys:function(_11){
_11=_11||this.DEFAULT_NAMESPACE;
if(this.isValidKey(_11)==false){
throw new Error("Invalid namespace given: "+_11);
}
var _12=[];
var dir=_1.File.applicationStorageDirectory.resolvePath(this._storagePath+_11);
if(dir.exists&&dir.isDirectory){
var _13=dir.getDirectoryListing(),i;
for(i=0;i<_13.length;i++){
_12.push(_13[i].name);
}
}
return _12;
},clear:function(_14){
if(this.isValidKey(_14)==false){
throw new Error("Invalid namespace given: "+_14);
}
var dir=_1.File.applicationStorageDirectory.resolvePath(this._storagePath+_14);
if(dir.exists&&dir.isDirectory){
dir.deleteDirectory(true);
}
},remove:function(key,_15){
_15=_15||this.DEFAULT_NAMESPACE;
var _16=_1.File.applicationStorageDirectory.resolvePath(this._storagePath+_15+"/"+key);
if(_16.exists&&!_16.isDirectory){
_16.deleteFile();
}
},putMultiple:function(_17,_18,_19,_1a){
if(this.isValidKeyArray(_17)===false||!_18 instanceof Array||_17.length!=_18.length){
throw new Error("Invalid arguments: keys = ["+_17+"], values = ["+_18+"]");
}
if(_1a==null||typeof _1a=="undefined"){
_1a=this.DEFAULT_NAMESPACE;
}
if(this.isValidKey(_1a)==false){
throw new Error("Invalid namespace given: "+_1a);
}
this._statusHandler=_19;
try{
for(var i=0;i<_17.length;i++){
this.put(_17[i],_18[i],null,_1a);
}
}
catch(e){
if(_19){
_19(this.FAILED,_17,e.toString(),_1a);
}
return;
}
if(_19){
_19(this.SUCCESS,_17,null,_1a);
}
},getMultiple:function(_1b,_1c){
if(this.isValidKeyArray(_1b)===false){
throw new Error("Invalid key array given: "+_1b);
}
if(_1c==null||typeof _1c=="undefined"){
_1c=this.DEFAULT_NAMESPACE;
}
if(this.isValidKey(_1c)==false){
throw new Error("Invalid namespace given: "+_1c);
}
var _1d=[];
for(var i=0;i<_1b.length;i++){
_1d[i]=this.get(_1b[i],_1c);
}
return _1d;
},removeMultiple:function(_1e,_1f){
_1f=_1f||this.DEFAULT_NAMESPACE;
for(var i=0;i<_1e.length;i++){
this.remove(_1e[i],_1f);
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
dojox.storage.manager.register("dojox.storage.AirFileStorageProvider",new dojox.storage.AirFileStorageProvider());
dojox.storage.manager.initialize();
})();
}
}
