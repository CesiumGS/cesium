/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.KeyValueStore"]){
dojo._hasResource["dojox.data.KeyValueStore"]=true;
dojo.provide("dojox.data.KeyValueStore");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.data.util.filter");
dojo.declare("dojox.data.KeyValueStore",null,{constructor:function(_1){
if(_1.url){
this.url=_1.url;
}
this._keyValueString=_1.data;
this._keyValueVar=_1.dataVar;
this._keyAttribute="key";
this._valueAttribute="value";
this._storeProp="_keyValueStore";
this._features={"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
this._loadInProgress=false;
this._queuedFetches=[];
if(_1&&"urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
},url:"",data:"",urlPreventCache:false,_assertIsItem:function(_2){
if(!this.isItem(_2)){
throw new Error("dojox.data.KeyValueStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_3,_4){
if(!dojo.isString(_4)){
throw new Error("dojox.data.KeyValueStore: a function was passed an attribute argument that was not an attribute object nor an attribute name string");
}
},getValue:function(_5,_6,_7){
this._assertIsItem(_5);
this._assertIsAttribute(_5,_6);
var _8;
if(_6==this._keyAttribute){
_8=_5[this._keyAttribute];
}else{
_8=_5[this._valueAttribute];
}
if(_8===undefined){
_8=_7;
}
return _8;
},getValues:function(_9,_a){
var _b=this.getValue(_9,_a);
return (_b?[_b]:[]);
},getAttributes:function(_c){
return [this._keyAttribute,this._valueAttribute,_c[this._keyAttribute]];
},hasAttribute:function(_d,_e){
this._assertIsItem(_d);
this._assertIsAttribute(_d,_e);
return (_e==this._keyAttribute||_e==this._valueAttribute||_e==_d[this._keyAttribute]);
},containsValue:function(_f,_10,_11){
var _12=undefined;
if(typeof _11==="string"){
_12=dojo.data.util.filter.patternToRegExp(_11,false);
}
return this._containsValue(_f,_10,_11,_12);
},_containsValue:function(_13,_14,_15,_16){
var _17=this.getValues(_13,_14);
for(var i=0;i<_17.length;++i){
var _18=_17[i];
if(typeof _18==="string"&&_16){
return (_18.match(_16)!==null);
}else{
if(_15===_18){
return true;
}
}
}
return false;
},isItem:function(_19){
if(_19&&_19[this._storeProp]===this){
return true;
}
return false;
},isItemLoaded:function(_1a){
return this.isItem(_1a);
},loadItem:function(_1b){
},getFeatures:function(){
return this._features;
},close:function(_1c){
},getLabel:function(_1d){
return _1d[this._keyAttribute];
},getLabelAttributes:function(_1e){
return [this._keyAttribute];
},_fetchItems:function(_1f,_20,_21){
var _22=this;
var _23=function(_24,_25){
var _26=null;
if(_24.query){
_26=[];
var _27=_24.queryOptions?_24.queryOptions.ignoreCase:false;
var _28={};
for(var key in _24.query){
var _29=_24.query[key];
if(typeof _29==="string"){
_28[key]=dojo.data.util.filter.patternToRegExp(_29,_27);
}
}
for(var i=0;i<_25.length;++i){
var _2a=true;
var _2b=_25[i];
for(var key in _24.query){
var _29=_24.query[key];
if(!_22._containsValue(_2b,key,_29,_28[key])){
_2a=false;
}
}
if(_2a){
_26.push(_2b);
}
}
}else{
if(_24.identity){
_26=[];
var _2c;
for(var key in _25){
_2c=_25[key];
if(_2c[_22._keyAttribute]==_24.identity){
_26.push(_2c);
break;
}
}
}else{
if(_25.length>0){
_26=_25.slice(0,_25.length);
}
}
}
_20(_26,_24);
};
if(this._loadFinished){
_23(_1f,this._arrayOfAllItems);
}else{
if(this.url!==""){
if(this._loadInProgress){
this._queuedFetches.push({args:_1f,filter:_23});
}else{
this._loadInProgress=true;
var _2d={url:_22.url,handleAs:"json-comment-filtered",preventCache:this.urlPreventCache};
var _2e=dojo.xhrGet(_2d);
_2e.addCallback(function(_2f){
_22._processData(_2f);
_23(_1f,_22._arrayOfAllItems);
_22._handleQueuedFetches();
});
_2e.addErrback(function(_30){
_22._loadInProgress=false;
throw _30;
});
}
}else{
if(this._keyValueString){
this._processData(eval(this._keyValueString));
this._keyValueString=null;
_23(_1f,this._arrayOfAllItems);
}else{
if(this._keyValueVar){
this._processData(this._keyValueVar);
this._keyValueVar=null;
_23(_1f,this._arrayOfAllItems);
}else{
throw new Error("dojox.data.KeyValueStore: No source data was provided as either URL, String, or Javascript variable data input.");
}
}
}
}
},_handleQueuedFetches:function(){
if(this._queuedFetches.length>0){
for(var i=0;i<this._queuedFetches.length;i++){
var _31=this._queuedFetches[i];
var _32=_31.filter;
var _33=_31.args;
if(_32){
_32(_33,this._arrayOfAllItems);
}else{
this.fetchItemByIdentity(_31.args);
}
}
this._queuedFetches=[];
}
},_processData:function(_34){
this._arrayOfAllItems=[];
for(var i=0;i<_34.length;i++){
this._arrayOfAllItems.push(this._createItem(_34[i]));
}
this._loadFinished=true;
this._loadInProgress=false;
},_createItem:function(_35){
var _36={};
_36[this._storeProp]=this;
for(var i in _35){
_36[this._keyAttribute]=i;
_36[this._valueAttribute]=_35[i];
break;
}
return _36;
},getIdentity:function(_37){
if(this.isItem(_37)){
return _37[this._keyAttribute];
}
return null;
},getIdentityAttributes:function(_38){
return [this._keyAttribute];
},fetchItemByIdentity:function(_39){
_39.oldOnItem=_39.onItem;
_39.onItem=null;
_39.onComplete=this._finishFetchItemByIdentity;
this.fetch(_39);
},_finishFetchItemByIdentity:function(_3a,_3b){
var _3c=_3b.scope||dojo.global;
if(_3a.length){
_3b.oldOnItem.call(_3c,_3a[0]);
}else{
_3b.oldOnItem.call(_3c,null);
}
}});
dojo.extend(dojox.data.KeyValueStore,dojo.data.util.simpleFetch);
}
