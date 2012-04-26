/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.FileStore"]){
dojo._hasResource["dojox.data.FileStore"]=true;
dojo.provide("dojox.data.FileStore");
dojo.declare("dojox.data.FileStore",null,{constructor:function(_1){
if(_1&&_1.label){
this.label=_1.label;
}
if(_1&&_1.url){
this.url=_1.url;
}
if(_1&&_1.options){
if(dojo.isArray(_1.options)){
this.options=_1.options;
}else{
if(dojo.isString(_1.options)){
this.options=_1.options.split(",");
}
}
}
if(_1&&_1.pathAsQueryParam){
this.pathAsQueryParam=true;
}
if(_1&&"urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
},url:"",_storeRef:"_S",label:"name",_identifier:"path",_attributes:["children","directory","name","path","modified","size","parentDir"],pathSeparator:"/",options:[],failOk:false,urlPreventCache:true,_assertIsItem:function(_2){
if(!this.isItem(_2)){
throw new Error("dojox.data.FileStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_3){
if(typeof _3!=="string"){
throw new Error("dojox.data.FileStore: a function was passed an attribute argument that was not an attribute name string");
}
},pathAsQueryParam:false,getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
},getValue:function(_4,_5,_6){
var _7=this.getValues(_4,_5);
if(_7&&_7.length>0){
return _7[0];
}
return _6;
},getAttributes:function(_8){
return this._attributes;
},hasAttribute:function(_9,_a){
this._assertIsItem(_9);
this._assertIsAttribute(_a);
return (_a in _9);
},getIdentity:function(_b){
return this.getValue(_b,this._identifier);
},getIdentityAttributes:function(_c){
return [this._identifier];
},isItemLoaded:function(_d){
var _e=this.isItem(_d);
if(_e&&typeof _d._loaded=="boolean"&&!_d._loaded){
_e=false;
}
return _e;
},loadItem:function(_f){
var _10=_f.item;
var _11=this;
var _12=_f.scope||dojo.global;
var _13={};
if(this.options.length>0){
_13.options=dojo.toJson(this.options);
}
if(this.pathAsQueryParam){
_13.path=_10.parentPath+this.pathSeparator+_10.name;
}
var _14={url:this.pathAsQueryParam?this.url:this.url+"/"+_10.parentPath+"/"+_10.name,handleAs:"json-comment-optional",content:_13,preventCache:this.urlPreventCache,failOk:this.failOk};
var _15=dojo.xhrGet(_14);
_15.addErrback(function(_16){
if(_f.onError){
_f.onError.call(_12,_16);
}
});
_15.addCallback(function(_17){
delete _10.parentPath;
delete _10._loaded;
dojo.mixin(_10,_17);
_11._processItem(_10);
if(_f.onItem){
_f.onItem.call(_12,_10);
}
});
},getLabel:function(_18){
return this.getValue(_18,this.label);
},getLabelAttributes:function(_19){
return [this.label];
},containsValue:function(_1a,_1b,_1c){
var _1d=this.getValues(_1a,_1b);
for(var i=0;i<_1d.length;i++){
if(_1d[i]==_1c){
return true;
}
}
return false;
},getValues:function(_1e,_1f){
this._assertIsItem(_1e);
this._assertIsAttribute(_1f);
var _20=_1e[_1f];
if(typeof _20!=="undefined"&&!dojo.isArray(_20)){
_20=[_20];
}else{
if(typeof _20==="undefined"){
_20=[];
}
}
return _20;
},isItem:function(_21){
if(_21&&_21[this._storeRef]===this){
return true;
}
return false;
},close:function(_22){
},fetch:function(_23){
_23=_23||{};
if(!_23.store){
_23.store=this;
}
var _24=this;
var _25=_23.scope||dojo.global;
var _26={};
if(_23.query){
_26.query=dojo.toJson(_23.query);
}
if(_23.sort){
_26.sort=dojo.toJson(_23.sort);
}
if(_23.queryOptions){
_26.queryOptions=dojo.toJson(_23.queryOptions);
}
if(typeof _23.start=="number"){
_26.start=""+_23.start;
}
if(typeof _23.count=="number"){
_26.count=""+_23.count;
}
if(this.options.length>0){
_26.options=dojo.toJson(this.options);
}
var _27={url:this.url,preventCache:this.urlPreventCache,failOk:this.failOk,handleAs:"json-comment-optional",content:_26};
var _28=dojo.xhrGet(_27);
_28.addCallback(function(_29){
_24._processResult(_29,_23);
});
_28.addErrback(function(_2a){
if(_23.onError){
_23.onError.call(_25,_2a,_23);
}
});
},fetchItemByIdentity:function(_2b){
var _2c=_2b.identity;
var _2d=this;
var _2e=_2b.scope||dojo.global;
var _2f={};
if(this.options.length>0){
_2f.options=dojo.toJson(this.options);
}
if(this.pathAsQueryParam){
_2f.path=_2c;
}
var _30={url:this.pathAsQueryParam?this.url:this.url+"/"+_2c,handleAs:"json-comment-optional",content:_2f,preventCache:this.urlPreventCache,failOk:this.failOk};
var _31=dojo.xhrGet(_30);
_31.addErrback(function(_32){
if(_2b.onError){
_2b.onError.call(_2e,_32);
}
});
_31.addCallback(function(_33){
var _34=_2d._processItem(_33);
if(_2b.onItem){
_2b.onItem.call(_2e,_34);
}
});
},_processResult:function(_35,_36){
var _37=_36.scope||dojo.global;
try{
if(_35.pathSeparator){
this.pathSeparator=_35.pathSeparator;
}
if(_36.onBegin){
_36.onBegin.call(_37,_35.total,_36);
}
var _38=this._processItemArray(_35.items);
if(_36.onItem){
var i;
for(i=0;i<_38.length;i++){
_36.onItem.call(_37,_38[i],_36);
}
_38=null;
}
if(_36.onComplete){
_36.onComplete.call(_37,_38,_36);
}
}
catch(e){
if(_36.onError){
_36.onError.call(_37,e,_36);
}else{
}
}
},_processItemArray:function(_39){
var i;
for(i=0;i<_39.length;i++){
this._processItem(_39[i]);
}
return _39;
},_processItem:function(_3a){
if(!_3a){
return null;
}
_3a[this._storeRef]=this;
if(_3a.children&&_3a.directory){
if(dojo.isArray(_3a.children)){
var _3b=_3a.children;
var i;
for(i=0;i<_3b.length;i++){
var _3c=_3b[i];
if(dojo.isObject(_3c)){
_3b[i]=this._processItem(_3c);
}else{
_3b[i]={name:_3c,_loaded:false,parentPath:_3a.path};
_3b[i][this._storeRef]=this;
}
}
}else{
delete _3a.children;
}
}
return _3a;
}});
}
