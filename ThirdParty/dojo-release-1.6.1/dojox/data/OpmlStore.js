/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.OpmlStore"]){
dojo._hasResource["dojox.data.OpmlStore"]=true;
dojo.provide("dojox.data.OpmlStore");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.data.util.filter");
dojo.declare("dojox.data.OpmlStore",null,{constructor:function(_1){
this._xmlData=null;
this._arrayOfTopLevelItems=[];
this._arrayOfAllItems=[];
this._metadataNodes=null;
this._loadFinished=false;
this.url=_1.url;
this._opmlData=_1.data;
if(_1.label){
this.label=_1.label;
}
this._loadInProgress=false;
this._queuedFetches=[];
this._identityMap={};
this._identCount=0;
this._idProp="_I";
if(_1&&"urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
},label:"text",url:"",urlPreventCache:false,_assertIsItem:function(_2){
if(!this.isItem(_2)){
throw new Error("dojo.data.OpmlStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_3){
if(!dojo.isString(_3)){
throw new Error("dojox.data.OpmlStore: a function was passed an attribute argument that was not an attribute object nor an attribute name string");
}
},_removeChildNodesThatAreNotElementNodes:function(_4,_5){
var _6=_4.childNodes;
if(_6.length===0){
return;
}
var _7=[];
var i,_8;
for(i=0;i<_6.length;++i){
_8=_6[i];
if(_8.nodeType!=1){
_7.push(_8);
}
}
for(i=0;i<_7.length;++i){
_8=_7[i];
_4.removeChild(_8);
}
if(_5){
for(i=0;i<_6.length;++i){
_8=_6[i];
this._removeChildNodesThatAreNotElementNodes(_8,_5);
}
}
},_processRawXmlTree:function(_9){
this._loadFinished=true;
this._xmlData=_9;
var _a=_9.getElementsByTagName("head");
var _b=_a[0];
if(_b){
this._removeChildNodesThatAreNotElementNodes(_b);
this._metadataNodes=_b.childNodes;
}
var _c=_9.getElementsByTagName("body");
var _d=_c[0];
if(_d){
this._removeChildNodesThatAreNotElementNodes(_d,true);
var _e=_c[0].childNodes;
for(var i=0;i<_e.length;++i){
var _f=_e[i];
if(_f.tagName=="outline"){
this._identityMap[this._identCount]=_f;
this._identCount++;
this._arrayOfTopLevelItems.push(_f);
this._arrayOfAllItems.push(_f);
this._checkChildNodes(_f);
}
}
}
},_checkChildNodes:function(_10){
if(_10.firstChild){
for(var i=0;i<_10.childNodes.length;i++){
var _11=_10.childNodes[i];
if(_11.tagName=="outline"){
this._identityMap[this._identCount]=_11;
this._identCount++;
this._arrayOfAllItems.push(_11);
this._checkChildNodes(_11);
}
}
}
},_getItemsArray:function(_12){
if(_12&&_12.deep){
return this._arrayOfAllItems;
}
return this._arrayOfTopLevelItems;
},getValue:function(_13,_14,_15){
this._assertIsItem(_13);
this._assertIsAttribute(_14);
if(_14=="children"){
return (_13.firstChild||_15);
}else{
var _16=_13.getAttribute(_14);
return (_16!==undefined)?_16:_15;
}
},getValues:function(_17,_18){
this._assertIsItem(_17);
this._assertIsAttribute(_18);
var _19=[];
if(_18=="children"){
for(var i=0;i<_17.childNodes.length;++i){
_19.push(_17.childNodes[i]);
}
}else{
if(_17.getAttribute(_18)!==null){
_19.push(_17.getAttribute(_18));
}
}
return _19;
},getAttributes:function(_1a){
this._assertIsItem(_1a);
var _1b=[];
var _1c=_1a;
var _1d=_1c.attributes;
for(var i=0;i<_1d.length;++i){
var _1e=_1d.item(i);
_1b.push(_1e.nodeName);
}
if(_1c.childNodes.length>0){
_1b.push("children");
}
return _1b;
},hasAttribute:function(_1f,_20){
return (this.getValues(_1f,_20).length>0);
},containsValue:function(_21,_22,_23){
var _24=undefined;
if(typeof _23==="string"){
_24=dojo.data.util.filter.patternToRegExp(_23,false);
}
return this._containsValue(_21,_22,_23,_24);
},_containsValue:function(_25,_26,_27,_28){
var _29=this.getValues(_25,_26);
for(var i=0;i<_29.length;++i){
var _2a=_29[i];
if(typeof _2a==="string"&&_28){
return (_2a.match(_28)!==null);
}else{
if(_27===_2a){
return true;
}
}
}
return false;
},isItem:function(_2b){
return (_2b&&_2b.nodeType==1&&_2b.tagName=="outline"&&_2b.ownerDocument===this._xmlData);
},isItemLoaded:function(_2c){
return this.isItem(_2c);
},loadItem:function(_2d){
},getLabel:function(_2e){
if(this.isItem(_2e)){
return this.getValue(_2e,this.label);
}
return undefined;
},getLabelAttributes:function(_2f){
return [this.label];
},_fetchItems:function(_30,_31,_32){
var _33=this;
var _34=function(_35,_36){
var _37=null;
if(_35.query){
_37=[];
var _38=_35.queryOptions?_35.queryOptions.ignoreCase:false;
var _39={};
for(var key in _35.query){
var _3a=_35.query[key];
if(typeof _3a==="string"){
_39[key]=dojo.data.util.filter.patternToRegExp(_3a,_38);
}
}
for(var i=0;i<_36.length;++i){
var _3b=true;
var _3c=_36[i];
for(var key in _35.query){
var _3a=_35.query[key];
if(!_33._containsValue(_3c,key,_3a,_39[key])){
_3b=false;
}
}
if(_3b){
_37.push(_3c);
}
}
}else{
if(_36.length>0){
_37=_36.slice(0,_36.length);
}
}
_31(_37,_35);
};
if(this._loadFinished){
_34(_30,this._getItemsArray(_30.queryOptions));
}else{
if(this._loadInProgress){
this._queuedFetches.push({args:_30,filter:_34});
}else{
if(this.url!==""){
this._loadInProgress=true;
var _3d={url:_33.url,handleAs:"xml",preventCache:_33.urlPreventCache};
var _3e=dojo.xhrGet(_3d);
_3e.addCallback(function(_3f){
_33._processRawXmlTree(_3f);
_34(_30,_33._getItemsArray(_30.queryOptions));
_33._handleQueuedFetches();
});
_3e.addErrback(function(_40){
throw _40;
});
}else{
if(this._opmlData){
this._processRawXmlTree(this._opmlData);
this._opmlData=null;
_34(_30,this._getItemsArray(_30.queryOptions));
}else{
throw new Error("dojox.data.OpmlStore: No OPML source data was provided as either URL or XML data input.");
}
}
}
}
},getFeatures:function(){
var _41={"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
return _41;
},getIdentity:function(_42){
if(this.isItem(_42)){
for(var i in this._identityMap){
if(this._identityMap[i]===_42){
return i;
}
}
}
return null;
},fetchItemByIdentity:function(_43){
if(!this._loadFinished){
var _44=this;
if(this.url!==""){
if(this._loadInProgress){
this._queuedFetches.push({args:_43});
}else{
this._loadInProgress=true;
var _45={url:_44.url,handleAs:"xml"};
var _46=dojo.xhrGet(_45);
_46.addCallback(function(_47){
var _48=_43.scope?_43.scope:dojo.global;
try{
_44._processRawXmlTree(_47);
var _49=_44._identityMap[_43.identity];
if(!_44.isItem(_49)){
_49=null;
}
if(_43.onItem){
_43.onItem.call(_48,_49);
}
_44._handleQueuedFetches();
}
catch(error){
if(_43.onError){
_43.onError.call(_48,error);
}
}
});
_46.addErrback(function(_4a){
this._loadInProgress=false;
if(_43.onError){
var _4b=_43.scope?_43.scope:dojo.global;
_43.onError.call(_4b,_4a);
}
});
}
}else{
if(this._opmlData){
this._processRawXmlTree(this._opmlData);
this._opmlData=null;
var _4c=this._identityMap[_43.identity];
if(!_44.isItem(_4c)){
_4c=null;
}
if(_43.onItem){
var _4d=_43.scope?_43.scope:dojo.global;
_43.onItem.call(_4d,_4c);
}
}
}
}else{
var _4c=this._identityMap[_43.identity];
if(!this.isItem(_4c)){
_4c=null;
}
if(_43.onItem){
var _4d=_43.scope?_43.scope:dojo.global;
_43.onItem.call(_4d,_4c);
}
}
},getIdentityAttributes:function(_4e){
return null;
},_handleQueuedFetches:function(){
if(this._queuedFetches.length>0){
for(var i=0;i<this._queuedFetches.length;i++){
var _4f=this._queuedFetches[i];
var _50=_4f.args;
var _51=_4f.filter;
if(_51){
_51(_50,this._getItemsArray(_50.queryOptions));
}else{
this.fetchItemByIdentity(_50);
}
}
this._queuedFetches=[];
}
},close:function(_52){
}});
dojo.extend(dojox.data.OpmlStore,dojo.data.util.simpleFetch);
}
