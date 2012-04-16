/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage.BehaviorStorageProvider"]){
dojo._hasResource["dojox.storage.BehaviorStorageProvider"]=true;
dojo.provide("dojox.storage.BehaviorStorageProvider");
dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");
dojo.declare("dojox.storage.BehaviorStorageProvider",[dojox.storage.Provider],{store:null,storeName:"__dojox_BehaviorStorage",keys:[],initialize:function(){
try{
this.store=this._createStore();
this.store.load(this.storeName);
}
catch(e){
throw new Error("Store is not available: "+e);
}
var _1=this.get("keys","dojoxSystemNS");
this.keys=_1||[];
this.initialized=true;
dojox.storage.manager.loaded();
},isAvailable:function(){
return dojo.isIE&&dojo.isIE>=5;
},_createStore:function(){
var _2=dojo.create("link",{id:this.storeName+"Node",style:{"display":"none"}},dojo.query("head")[0]);
_2.addBehavior("#default#userdata");
return _2;
},put:function(_3,_4,_5,_6){
this._assertIsValidKey(_3);
_6=_6||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_6);
var _7=this.getFullKey(_3,_6);
_4=dojo.toJson(_4);
this.store.setAttribute(_7,_4);
this.store.save(this.storeName);
var _8=this.store.getAttribute(_7)===_4;
if(_8){
this._addKey(_7);
this.store.setAttribute("__dojoxSystemNS_keys",dojo.toJson(this.keys));
this.store.save(this.storeName);
}
if(_5){
_5(_8?this.SUCCESS:this.FAILED,_3,null,_6);
}
},get:function(_9,_a){
this._assertIsValidKey(_9);
_a=_a||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_a);
_9=this.getFullKey(_9,_a);
return dojo.fromJson(this.store.getAttribute(_9));
},getKeys:function(_b){
_b=_b||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_b);
_b="__"+_b+"_";
var _c=[];
for(var i=0;i<this.keys.length;i++){
var _d=this.keys[i];
if(this._beginsWith(_d,_b)){
_d=_d.substring(_b.length);
_c.push(_d);
}
}
return _c;
},clear:function(_e){
_e=_e||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_e);
_e="__"+_e+"_";
var _f=[];
for(var i=0;i<this.keys.length;i++){
var _10=this.keys[i];
if(this._beginsWith(_10,_e)){
_f.push(_10);
}
}
dojo.forEach(_f,function(key){
this.store.removeAttribute(key);
this._removeKey(key);
},this);
this.put("keys",this.keys,null,"dojoxSystemNS");
this.store.save(this.storeName);
},remove:function(key,_11){
this._assertIsValidKey(key);
_11=_11||this.DEFAULT_NAMESPACE;
this._assertIsValidNamespace(_11);
key=this.getFullKey(key,_11);
this.store.removeAttribute(key);
this._removeKey(key);
this.put("keys",this.keys,null,"dojoxSystemNS");
this.store.save(this.storeName);
},getNamespaces:function(){
var _12=[this.DEFAULT_NAMESPACE];
var _13={};
_13[this.DEFAULT_NAMESPACE]=true;
var _14=/^__([^_]*)_/;
for(var i=0;i<this.keys.length;i++){
var _15=this.keys[i];
if(_14.test(_15)==true){
var _16=_15.match(_14)[1];
if(typeof _13[_16]=="undefined"){
_13[_16]=true;
_12.push(_16);
}
}
}
return _12;
},isPermanent:function(){
return true;
},getMaximumSize:function(){
return 64;
},hasSettingsUI:function(){
return false;
},isValidKey:function(_17){
if(_17===null||_17===undefined){
return false;
}
return /^[0-9A-Za-z_-]*$/.test(_17);
},isValidNamespace:function(_18){
if(_18===null||_18===undefined){
return false;
}
return /^[0-9A-Za-z-]*$/.test(_18);
},getFullKey:function(key,_19){
return "__"+_19+"_"+key;
},_beginsWith:function(_1a,_1b){
if(_1b.length>_1a.length){
return false;
}
return _1a.substring(0,_1b.length)===_1b;
},_assertIsValidNamespace:function(_1c){
if(this.isValidNamespace(_1c)===false){
throw new Error("Invalid namespace given: "+_1c);
}
},_assertIsValidKey:function(key){
if(this.isValidKey(key)===false){
throw new Error("Invalid key given: "+key);
}
},_addKey:function(key){
this._removeKey(key);
this.keys.push(key);
},_removeKey:function(key){
this.keys=dojo.filter(this.keys,function(_1d){
return _1d!==key;
},this);
}});
dojox.storage.manager.register("dojox.storage.BehaviorStorageProvider",new dojox.storage.BehaviorStorageProvider());
}
