/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.manager"]){
dojo._hasResource["dojox.storage.manager"]=true;
dojo.provide("dojox.storage.manager");
dojox.storage.manager=new function(){
this.currentProvider=null;
this.available=false;
this.providers=[];
this._initialized=false;
this._onLoadListeners=[];
this.initialize=function(){
this.autodetect();
};
this.register=function(_1,_2){
this.providers.push(_2);
this.providers[_1]=_2;
};
this.setProvider=function(_3){
};
this.autodetect=function(){
if(this._initialized){
return;
}
var _4=dojo.config["forceStorageProvider"]||false;
var _5;
for(var i=0;i<this.providers.length;i++){
_5=this.providers[i];
if(_4&&_4==_5.declaredClass){
_5.isAvailable();
break;
}else{
if(!_4&&_5.isAvailable()){
break;
}
}
}
if(!_5){
this._initialized=true;
this.available=false;
this.currentProvider=null;
console.warn("No storage provider found for this platform");
this.loaded();
return;
}
this.currentProvider=_5;
dojo.mixin(dojox.storage,this.currentProvider);
dojox.storage.initialize();
this._initialized=true;
this.available=true;
};
this.isAvailable=function(){
return this.available;
};
this.addOnLoad=function(_6){
this._onLoadListeners.push(_6);
if(this.isInitialized()){
this._fireLoaded();
}
};
this.removeOnLoad=function(_7){
for(var i=0;i<this._onLoadListeners.length;i++){
if(_7==this._onLoadListeners[i]){
this._onLoadListeners.splice(i,1);
break;
}
}
};
this.isInitialized=function(){
if(this.currentProvider!=null&&this.currentProvider.declaredClass=="dojox.storage.FlashStorageProvider"&&dojox.flash.ready==false){
return false;
}else{
return this._initialized;
}
};
this.supportsProvider=function(_8){
try{
var _9=eval("new "+_8+"()");
var _a=_9.isAvailable();
if(!_a){
return false;
}
return _a;
}
catch(e){
return false;
}
};
this.getProvider=function(){
return this.currentProvider;
};
this.loaded=function(){
this._fireLoaded();
};
this._fireLoaded=function(){
dojo.forEach(this._onLoadListeners,function(i){
try{
i();
}
catch(e){
}
});
};
this.getResourceList=function(){
var _b=[];
dojo.forEach(dojox.storage.manager.providers,function(_c){
_b=_b.concat(_c.getResourceList());
});
return _b;
};
};
}
