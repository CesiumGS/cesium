/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.data.ItemFileReadStore"]){
dojo._hasResource["dojo.data.ItemFileReadStore"]=true;
dojo.provide("dojo.data.ItemFileReadStore");
dojo.require("dojo.data.util.filter");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.date.stamp");
dojo.declare("dojo.data.ItemFileReadStore",null,{constructor:function(_1){
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=[];
this._loadFinished=false;
this._jsonFileUrl=_1.url;
this._ccUrl=_1.url;
this.url=_1.url;
this._jsonData=_1.data;
this.data=null;
this._datatypeMap=_1.typeMap||{};
if(!this._datatypeMap["Date"]){
this._datatypeMap["Date"]={type:Date,deserialize:function(_2){
return dojo.date.stamp.fromISOString(_2);
}};
}
this._features={"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
this._itemsByIdentity=null;
this._storeRefPropName="_S";
this._itemNumPropName="_0";
this._rootItemPropName="_RI";
this._reverseRefMap="_RRM";
this._loadInProgress=false;
this._queuedFetches=[];
if(_1.urlPreventCache!==undefined){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
if(_1.hierarchical!==undefined){
this.hierarchical=_1.hierarchical?true:false;
}
if(_1.clearOnClose){
this.clearOnClose=true;
}
if("failOk" in _1){
this.failOk=_1.failOk?true:false;
}
},url:"",_ccUrl:"",data:null,typeMap:null,clearOnClose:false,urlPreventCache:false,failOk:false,hierarchical:true,_assertIsItem:function(_3){
if(!this.isItem(_3)){
throw new Error("dojo.data.ItemFileReadStore: Invalid item argument.");
}
},_assertIsAttribute:function(_4){
if(typeof _4!=="string"){
throw new Error("dojo.data.ItemFileReadStore: Invalid attribute argument.");
}
},getValue:function(_5,_6,_7){
var _8=this.getValues(_5,_6);
return (_8.length>0)?_8[0]:_7;
},getValues:function(_9,_a){
this._assertIsItem(_9);
this._assertIsAttribute(_a);
return (_9[_a]||[]).slice(0);
},getAttributes:function(_b){
this._assertIsItem(_b);
var _c=[];
for(var _d in _b){
if((_d!==this._storeRefPropName)&&(_d!==this._itemNumPropName)&&(_d!==this._rootItemPropName)&&(_d!==this._reverseRefMap)){
_c.push(_d);
}
}
return _c;
},hasAttribute:function(_e,_f){
this._assertIsItem(_e);
this._assertIsAttribute(_f);
return (_f in _e);
},containsValue:function(_10,_11,_12){
var _13=undefined;
if(typeof _12==="string"){
_13=dojo.data.util.filter.patternToRegExp(_12,false);
}
return this._containsValue(_10,_11,_12,_13);
},_containsValue:function(_14,_15,_16,_17){
return dojo.some(this.getValues(_14,_15),function(_18){
if(_18!==null&&!dojo.isObject(_18)&&_17){
if(_18.toString().match(_17)){
return true;
}
}else{
if(_16===_18){
return true;
}
}
});
},isItem:function(_19){
if(_19&&_19[this._storeRefPropName]===this){
if(this._arrayOfAllItems[_19[this._itemNumPropName]]===_19){
return true;
}
}
return false;
},isItemLoaded:function(_1a){
return this.isItem(_1a);
},loadItem:function(_1b){
this._assertIsItem(_1b.item);
},getFeatures:function(){
return this._features;
},getLabel:function(_1c){
if(this._labelAttr&&this.isItem(_1c)){
return this.getValue(_1c,this._labelAttr);
}
return undefined;
},getLabelAttributes:function(_1d){
if(this._labelAttr){
return [this._labelAttr];
}
return null;
},_fetchItems:function(_1e,_1f,_20){
var _21=this,_22=function(_23,_24){
var _25=[],i,key;
if(_23.query){
var _26,_27=_23.queryOptions?_23.queryOptions.ignoreCase:false;
var _28={};
for(key in _23.query){
_26=_23.query[key];
if(typeof _26==="string"){
_28[key]=dojo.data.util.filter.patternToRegExp(_26,_27);
}else{
if(_26 instanceof RegExp){
_28[key]=_26;
}
}
}
for(i=0;i<_24.length;++i){
var _29=true;
var _2a=_24[i];
if(_2a===null){
_29=false;
}else{
for(key in _23.query){
_26=_23.query[key];
if(!_21._containsValue(_2a,key,_26,_28[key])){
_29=false;
}
}
}
if(_29){
_25.push(_2a);
}
}
_1f(_25,_23);
}else{
for(i=0;i<_24.length;++i){
var _2b=_24[i];
if(_2b!==null){
_25.push(_2b);
}
}
_1f(_25,_23);
}
};
if(this._loadFinished){
_22(_1e,this._getItemsArray(_1e.queryOptions));
}else{
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
this._ccUrl=this._jsonFileUrl;
this.url=this._jsonFileUrl;
}else{
if(this.url!==this._ccUrl){
this._jsonFileUrl=this.url;
this._ccUrl=this.url;
}
}
if(this.data!=null){
this._jsonData=this.data;
this.data=null;
}
if(this._jsonFileUrl){
if(this._loadInProgress){
this._queuedFetches.push({args:_1e,filter:_22});
}else{
this._loadInProgress=true;
var _2c={url:_21._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk};
var _2d=dojo.xhrGet(_2c);
_2d.addCallback(function(_2e){
try{
_21._getItemsFromLoadedData(_2e);
_21._loadFinished=true;
_21._loadInProgress=false;
_22(_1e,_21._getItemsArray(_1e.queryOptions));
_21._handleQueuedFetches();
}
catch(e){
_21._loadFinished=true;
_21._loadInProgress=false;
_20(e,_1e);
}
});
_2d.addErrback(function(_2f){
_21._loadInProgress=false;
_20(_2f,_1e);
});
var _30=null;
if(_1e.abort){
_30=_1e.abort;
}
_1e.abort=function(){
var df=_2d;
if(df&&df.fired===-1){
df.cancel();
df=null;
}
if(_30){
_30.call(_1e);
}
};
}
}else{
if(this._jsonData){
try{
this._loadFinished=true;
this._getItemsFromLoadedData(this._jsonData);
this._jsonData=null;
_22(_1e,this._getItemsArray(_1e.queryOptions));
}
catch(e){
_20(e,_1e);
}
}else{
_20(new Error("dojo.data.ItemFileReadStore: No JSON source data was provided as either URL or a nested Javascript object."),_1e);
}
}
}
},_handleQueuedFetches:function(){
if(this._queuedFetches.length>0){
for(var i=0;i<this._queuedFetches.length;i++){
var _31=this._queuedFetches[i],_32=_31.args,_33=_31.filter;
if(_33){
_33(_32,this._getItemsArray(_32.queryOptions));
}else{
this.fetchItemByIdentity(_32);
}
}
this._queuedFetches=[];
}
},_getItemsArray:function(_34){
if(_34&&_34.deep){
return this._arrayOfAllItems;
}
return this._arrayOfTopLevelItems;
},close:function(_35){
if(this.clearOnClose&&this._loadFinished&&!this._loadInProgress){
if(((this._jsonFileUrl==""||this._jsonFileUrl==null)&&(this.url==""||this.url==null))&&this.data==null){
}
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=[];
this._loadFinished=false;
this._itemsByIdentity=null;
this._loadInProgress=false;
this._queuedFetches=[];
}
},_getItemsFromLoadedData:function(_36){
var _37=false,_38=this;
function _39(_3a){
var _3b=((_3a!==null)&&(typeof _3a==="object")&&(!dojo.isArray(_3a)||_37)&&(!dojo.isFunction(_3a))&&(_3a.constructor==Object||dojo.isArray(_3a))&&(typeof _3a._reference==="undefined")&&(typeof _3a._type==="undefined")&&(typeof _3a._value==="undefined")&&_38.hierarchical);
return _3b;
};
function _3c(_3d){
_38._arrayOfAllItems.push(_3d);
for(var _3e in _3d){
var _3f=_3d[_3e];
if(_3f){
if(dojo.isArray(_3f)){
var _40=_3f;
for(var k=0;k<_40.length;++k){
var _41=_40[k];
if(_39(_41)){
_3c(_41);
}
}
}else{
if(_39(_3f)){
_3c(_3f);
}
}
}
}
};
this._labelAttr=_36.label;
var i,_42;
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=_36.items;
for(i=0;i<this._arrayOfTopLevelItems.length;++i){
_42=this._arrayOfTopLevelItems[i];
if(dojo.isArray(_42)){
_37=true;
}
_3c(_42);
_42[this._rootItemPropName]=true;
}
var _43={},key;
for(i=0;i<this._arrayOfAllItems.length;++i){
_42=this._arrayOfAllItems[i];
for(key in _42){
if(key!==this._rootItemPropName){
var _44=_42[key];
if(_44!==null){
if(!dojo.isArray(_44)){
_42[key]=[_44];
}
}else{
_42[key]=[null];
}
}
_43[key]=key;
}
}
while(_43[this._storeRefPropName]){
this._storeRefPropName+="_";
}
while(_43[this._itemNumPropName]){
this._itemNumPropName+="_";
}
while(_43[this._reverseRefMap]){
this._reverseRefMap+="_";
}
var _45;
var _46=_36.identifier;
if(_46){
this._itemsByIdentity={};
this._features["dojo.data.api.Identity"]=_46;
for(i=0;i<this._arrayOfAllItems.length;++i){
_42=this._arrayOfAllItems[i];
_45=_42[_46];
var _47=_45[0];
if(!Object.hasOwnProperty.call(this._itemsByIdentity,_47)){
this._itemsByIdentity[_47]=_42;
}else{
if(this._jsonFileUrl){
throw new Error("dojo.data.ItemFileReadStore:  The json data as specified by: ["+this._jsonFileUrl+"] is malformed.  Items within the list have identifier: ["+_46+"].  Value collided: ["+_47+"]");
}else{
if(this._jsonData){
throw new Error("dojo.data.ItemFileReadStore:  The json data provided by the creation arguments is malformed.  Items within the list have identifier: ["+_46+"].  Value collided: ["+_47+"]");
}
}
}
}
}else{
this._features["dojo.data.api.Identity"]=Number;
}
for(i=0;i<this._arrayOfAllItems.length;++i){
_42=this._arrayOfAllItems[i];
_42[this._storeRefPropName]=this;
_42[this._itemNumPropName]=i;
}
for(i=0;i<this._arrayOfAllItems.length;++i){
_42=this._arrayOfAllItems[i];
for(key in _42){
_45=_42[key];
for(var j=0;j<_45.length;++j){
_44=_45[j];
if(_44!==null&&typeof _44=="object"){
if(("_type" in _44)&&("_value" in _44)){
var _48=_44._type;
var _49=this._datatypeMap[_48];
if(!_49){
throw new Error("dojo.data.ItemFileReadStore: in the typeMap constructor arg, no object class was specified for the datatype '"+_48+"'");
}else{
if(dojo.isFunction(_49)){
_45[j]=new _49(_44._value);
}else{
if(dojo.isFunction(_49.deserialize)){
_45[j]=_49.deserialize(_44._value);
}else{
throw new Error("dojo.data.ItemFileReadStore: Value provided in typeMap was neither a constructor, nor a an object with a deserialize function");
}
}
}
}
if(_44._reference){
var _4a=_44._reference;
if(!dojo.isObject(_4a)){
_45[j]=this._getItemByIdentity(_4a);
}else{
for(var k=0;k<this._arrayOfAllItems.length;++k){
var _4b=this._arrayOfAllItems[k],_4c=true;
for(var _4d in _4a){
if(_4b[_4d]!=_4a[_4d]){
_4c=false;
}
}
if(_4c){
_45[j]=_4b;
}
}
}
if(this.referenceIntegrity){
var _4e=_45[j];
if(this.isItem(_4e)){
this._addReferenceToMap(_4e,_42,key);
}
}
}else{
if(this.isItem(_44)){
if(this.referenceIntegrity){
this._addReferenceToMap(_44,_42,key);
}
}
}
}
}
}
}
},_addReferenceToMap:function(_4f,_50,_51){
},getIdentity:function(_52){
var _53=this._features["dojo.data.api.Identity"];
if(_53===Number){
return _52[this._itemNumPropName];
}else{
var _54=_52[_53];
if(_54){
return _54[0];
}
}
return null;
},fetchItemByIdentity:function(_55){
var _56,_57;
if(!this._loadFinished){
var _58=this;
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
this._ccUrl=this._jsonFileUrl;
this.url=this._jsonFileUrl;
}else{
if(this.url!==this._ccUrl){
this._jsonFileUrl=this.url;
this._ccUrl=this.url;
}
}
if(this.data!=null&&this._jsonData==null){
this._jsonData=this.data;
this.data=null;
}
if(this._jsonFileUrl){
if(this._loadInProgress){
this._queuedFetches.push({args:_55});
}else{
this._loadInProgress=true;
var _59={url:_58._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk};
var _5a=dojo.xhrGet(_59);
_5a.addCallback(function(_5b){
var _5c=_55.scope?_55.scope:dojo.global;
try{
_58._getItemsFromLoadedData(_5b);
_58._loadFinished=true;
_58._loadInProgress=false;
_56=_58._getItemByIdentity(_55.identity);
if(_55.onItem){
_55.onItem.call(_5c,_56);
}
_58._handleQueuedFetches();
}
catch(error){
_58._loadInProgress=false;
if(_55.onError){
_55.onError.call(_5c,error);
}
}
});
_5a.addErrback(function(_5d){
_58._loadInProgress=false;
if(_55.onError){
var _5e=_55.scope?_55.scope:dojo.global;
_55.onError.call(_5e,_5d);
}
});
}
}else{
if(this._jsonData){
_58._getItemsFromLoadedData(_58._jsonData);
_58._jsonData=null;
_58._loadFinished=true;
_56=_58._getItemByIdentity(_55.identity);
if(_55.onItem){
_57=_55.scope?_55.scope:dojo.global;
_55.onItem.call(_57,_56);
}
}
}
}else{
_56=this._getItemByIdentity(_55.identity);
if(_55.onItem){
_57=_55.scope?_55.scope:dojo.global;
_55.onItem.call(_57,_56);
}
}
},_getItemByIdentity:function(_5f){
var _60=null;
if(this._itemsByIdentity&&Object.hasOwnProperty.call(this._itemsByIdentity,_5f)){
_60=this._itemsByIdentity[_5f];
}else{
if(Object.hasOwnProperty.call(this._arrayOfAllItems,_5f)){
_60=this._arrayOfAllItems[_5f];
}
}
if(_60===undefined){
_60=null;
}
return _60;
},getIdentityAttributes:function(_61){
var _62=this._features["dojo.data.api.Identity"];
if(_62===Number){
return null;
}else{
return [_62];
}
},_forceLoad:function(){
var _63=this;
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
this._ccUrl=this._jsonFileUrl;
this.url=this._jsonFileUrl;
}else{
if(this.url!==this._ccUrl){
this._jsonFileUrl=this.url;
this._ccUrl=this.url;
}
}
if(this.data!=null){
this._jsonData=this.data;
this.data=null;
}
if(this._jsonFileUrl){
var _64={url:this._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk,sync:true};
var _65=dojo.xhrGet(_64);
_65.addCallback(function(_66){
try{
if(_63._loadInProgress!==true&&!_63._loadFinished){
_63._getItemsFromLoadedData(_66);
_63._loadFinished=true;
}else{
if(_63._loadInProgress){
throw new Error("dojo.data.ItemFileReadStore:  Unable to perform a synchronous load, an async load is in progress.");
}
}
}
catch(e){
throw e;
}
});
_65.addErrback(function(_67){
throw _67;
});
}else{
if(this._jsonData){
_63._getItemsFromLoadedData(_63._jsonData);
_63._jsonData=null;
_63._loadFinished=true;
}
}
}});
dojo.extend(dojo.data.ItemFileReadStore,dojo.data.util.simpleFetch);
}
