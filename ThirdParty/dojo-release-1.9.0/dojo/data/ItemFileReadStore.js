/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/ItemFileReadStore",["../_base/kernel","../_base/lang","../_base/declare","../_base/array","../_base/xhr","../Evented","./util/filter","./util/simpleFetch","../date/stamp"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9){
var _a=_3("dojo.data.ItemFileReadStore",[_6],{constructor:function(_b){
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=[];
this._loadFinished=false;
this._jsonFileUrl=_b.url;
this._ccUrl=_b.url;
this.url=_b.url;
this._jsonData=_b.data;
this.data=null;
this._datatypeMap=_b.typeMap||{};
if(!this._datatypeMap["Date"]){
this._datatypeMap["Date"]={type:Date,deserialize:function(_c){
return _9.fromISOString(_c);
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
if(_b.urlPreventCache!==undefined){
this.urlPreventCache=_b.urlPreventCache?true:false;
}
if(_b.hierarchical!==undefined){
this.hierarchical=_b.hierarchical?true:false;
}
if(_b.clearOnClose){
this.clearOnClose=true;
}
if("failOk" in _b){
this.failOk=_b.failOk?true:false;
}
},url:"",_ccUrl:"",data:null,typeMap:null,clearOnClose:false,urlPreventCache:false,failOk:false,hierarchical:true,_assertIsItem:function(_d){
if(!this.isItem(_d)){
throw new Error(this.declaredClass+": Invalid item argument.");
}
},_assertIsAttribute:function(_e){
if(typeof _e!=="string"){
throw new Error(this.declaredClass+": Invalid attribute argument.");
}
},getValue:function(_f,_10,_11){
var _12=this.getValues(_f,_10);
return (_12.length>0)?_12[0]:_11;
},getValues:function(_13,_14){
this._assertIsItem(_13);
this._assertIsAttribute(_14);
return (_13[_14]||[]).slice(0);
},getAttributes:function(_15){
this._assertIsItem(_15);
var _16=[];
for(var key in _15){
if((key!==this._storeRefPropName)&&(key!==this._itemNumPropName)&&(key!==this._rootItemPropName)&&(key!==this._reverseRefMap)){
_16.push(key);
}
}
return _16;
},hasAttribute:function(_17,_18){
this._assertIsItem(_17);
this._assertIsAttribute(_18);
return (_18 in _17);
},containsValue:function(_19,_1a,_1b){
var _1c=undefined;
if(typeof _1b==="string"){
_1c=_7.patternToRegExp(_1b,false);
}
return this._containsValue(_19,_1a,_1b,_1c);
},_containsValue:function(_1d,_1e,_1f,_20){
return _4.some(this.getValues(_1d,_1e),function(_21){
if(_21!==null&&!_2.isObject(_21)&&_20){
if(_21.toString().match(_20)){
return true;
}
}else{
if(_1f===_21){
return true;
}
}
});
},isItem:function(_22){
if(_22&&_22[this._storeRefPropName]===this){
if(this._arrayOfAllItems[_22[this._itemNumPropName]]===_22){
return true;
}
}
return false;
},isItemLoaded:function(_23){
return this.isItem(_23);
},loadItem:function(_24){
this._assertIsItem(_24.item);
},getFeatures:function(){
return this._features;
},getLabel:function(_25){
if(this._labelAttr&&this.isItem(_25)){
return this.getValue(_25,this._labelAttr);
}
return undefined;
},getLabelAttributes:function(_26){
if(this._labelAttr){
return [this._labelAttr];
}
return null;
},filter:function(_27,_28,_29){
var _2a=[],i,key;
if(_27.query){
var _2b,_2c=_27.queryOptions?_27.queryOptions.ignoreCase:false;
var _2d={};
for(key in _27.query){
_2b=_27.query[key];
if(typeof _2b==="string"){
_2d[key]=_7.patternToRegExp(_2b,_2c);
}else{
if(_2b instanceof RegExp){
_2d[key]=_2b;
}
}
}
for(i=0;i<_28.length;++i){
var _2e=true;
var _2f=_28[i];
if(_2f===null){
_2e=false;
}else{
for(key in _27.query){
_2b=_27.query[key];
if(!this._containsValue(_2f,key,_2b,_2d[key])){
_2e=false;
}
}
}
if(_2e){
_2a.push(_2f);
}
}
_29(_2a,_27);
}else{
for(i=0;i<_28.length;++i){
var _30=_28[i];
if(_30!==null){
_2a.push(_30);
}
}
_29(_2a,_27);
}
},_fetchItems:function(_31,_32,_33){
var _34=this;
if(this._loadFinished){
this.filter(_31,this._getItemsArray(_31.queryOptions),_32);
}else{
if(this._jsonFileUrl!==this._ccUrl){
_1.deprecated(this.declaredClass+": ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
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
this._queuedFetches.push({args:_31,filter:_2.hitch(_34,"filter"),findCallback:_2.hitch(_34,_32)});
}else{
this._loadInProgress=true;
var _35={url:_34._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk};
var _36=_5.get(_35);
_36.addCallback(function(_37){
try{
_34._getItemsFromLoadedData(_37);
_34._loadFinished=true;
_34._loadInProgress=false;
_34.filter(_31,_34._getItemsArray(_31.queryOptions),_32);
_34._handleQueuedFetches();
}
catch(e){
_34._loadFinished=true;
_34._loadInProgress=false;
_33(e,_31);
}
});
_36.addErrback(function(_38){
_34._loadInProgress=false;
_33(_38,_31);
});
var _39=null;
if(_31.abort){
_39=_31.abort;
}
_31.abort=function(){
var df=_36;
if(df&&df.fired===-1){
df.cancel();
df=null;
}
if(_39){
_39.call(_31);
}
};
}
}else{
if(this._jsonData){
try{
this._loadFinished=true;
this._getItemsFromLoadedData(this._jsonData);
this._jsonData=null;
_34.filter(_31,this._getItemsArray(_31.queryOptions),_32);
}
catch(e){
_33(e,_31);
}
}else{
_33(new Error(this.declaredClass+": No JSON source data was provided as either URL or a nested Javascript object."),_31);
}
}
}
},_handleQueuedFetches:function(){
if(this._queuedFetches.length>0){
for(var i=0;i<this._queuedFetches.length;i++){
var _3a=this._queuedFetches[i],_3b=_3a.args,_3c=_3a.filter,_3d=_3a.findCallback;
if(_3c){
_3c(_3b,this._getItemsArray(_3b.queryOptions),_3d);
}else{
this.fetchItemByIdentity(_3b);
}
}
this._queuedFetches=[];
}
},_getItemsArray:function(_3e){
if(_3e&&_3e.deep){
return this._arrayOfAllItems;
}
return this._arrayOfTopLevelItems;
},close:function(_3f){
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
},_getItemsFromLoadedData:function(_40){
var _41=false,_42=this;
function _43(_44){
return (_44!==null)&&(typeof _44==="object")&&(!_2.isArray(_44)||_41)&&(!_2.isFunction(_44))&&(_44.constructor==Object||_2.isArray(_44))&&(typeof _44._reference==="undefined")&&(typeof _44._type==="undefined")&&(typeof _44._value==="undefined")&&_42.hierarchical;
};
function _45(_46){
_42._arrayOfAllItems.push(_46);
for(var _47 in _46){
var _48=_46[_47];
if(_48){
if(_2.isArray(_48)){
var _49=_48;
for(var k=0;k<_49.length;++k){
var _4a=_49[k];
if(_43(_4a)){
_45(_4a);
}
}
}else{
if(_43(_48)){
_45(_48);
}
}
}
}
};
this._labelAttr=_40.label;
var i,_4b;
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=_40.items;
for(i=0;i<this._arrayOfTopLevelItems.length;++i){
_4b=this._arrayOfTopLevelItems[i];
if(_2.isArray(_4b)){
_41=true;
}
_45(_4b);
_4b[this._rootItemPropName]=true;
}
var _4c={},key;
for(i=0;i<this._arrayOfAllItems.length;++i){
_4b=this._arrayOfAllItems[i];
for(key in _4b){
if(key!==this._rootItemPropName){
var _4d=_4b[key];
if(_4d!==null){
if(!_2.isArray(_4d)){
_4b[key]=[_4d];
}
}else{
_4b[key]=[null];
}
}
_4c[key]=key;
}
}
while(_4c[this._storeRefPropName]){
this._storeRefPropName+="_";
}
while(_4c[this._itemNumPropName]){
this._itemNumPropName+="_";
}
while(_4c[this._reverseRefMap]){
this._reverseRefMap+="_";
}
var _4e;
var _4f=_40.identifier;
if(_4f){
this._itemsByIdentity={};
this._features["dojo.data.api.Identity"]=_4f;
for(i=0;i<this._arrayOfAllItems.length;++i){
_4b=this._arrayOfAllItems[i];
_4e=_4b[_4f];
var _50=_4e[0];
if(!Object.hasOwnProperty.call(this._itemsByIdentity,_50)){
this._itemsByIdentity[_50]=_4b;
}else{
if(this._jsonFileUrl){
throw new Error(this.declaredClass+":  The json data as specified by: ["+this._jsonFileUrl+"] is malformed.  Items within the list have identifier: ["+_4f+"].  Value collided: ["+_50+"]");
}else{
if(this._jsonData){
throw new Error(this.declaredClass+":  The json data provided by the creation arguments is malformed.  Items within the list have identifier: ["+_4f+"].  Value collided: ["+_50+"]");
}
}
}
}
}else{
this._features["dojo.data.api.Identity"]=Number;
}
for(i=0;i<this._arrayOfAllItems.length;++i){
_4b=this._arrayOfAllItems[i];
_4b[this._storeRefPropName]=this;
_4b[this._itemNumPropName]=i;
}
for(i=0;i<this._arrayOfAllItems.length;++i){
_4b=this._arrayOfAllItems[i];
for(key in _4b){
_4e=_4b[key];
for(var j=0;j<_4e.length;++j){
_4d=_4e[j];
if(_4d!==null&&typeof _4d=="object"){
if(("_type" in _4d)&&("_value" in _4d)){
var _51=_4d._type;
var _52=this._datatypeMap[_51];
if(!_52){
throw new Error("dojo.data.ItemFileReadStore: in the typeMap constructor arg, no object class was specified for the datatype '"+_51+"'");
}else{
if(_2.isFunction(_52)){
_4e[j]=new _52(_4d._value);
}else{
if(_2.isFunction(_52.deserialize)){
_4e[j]=_52.deserialize(_4d._value);
}else{
throw new Error("dojo.data.ItemFileReadStore: Value provided in typeMap was neither a constructor, nor a an object with a deserialize function");
}
}
}
}
if(_4d._reference){
var _53=_4d._reference;
if(!_2.isObject(_53)){
_4e[j]=this._getItemByIdentity(_53);
}else{
for(var k=0;k<this._arrayOfAllItems.length;++k){
var _54=this._arrayOfAllItems[k],_55=true;
for(var _56 in _53){
if(_54[_56]!=_53[_56]){
_55=false;
}
}
if(_55){
_4e[j]=_54;
}
}
}
if(this.referenceIntegrity){
var _57=_4e[j];
if(this.isItem(_57)){
this._addReferenceToMap(_57,_4b,key);
}
}
}else{
if(this.isItem(_4d)){
if(this.referenceIntegrity){
this._addReferenceToMap(_4d,_4b,key);
}
}
}
}
}
}
}
},_addReferenceToMap:function(_58,_59,_5a){
},getIdentity:function(_5b){
var _5c=this._features["dojo.data.api.Identity"];
if(_5c===Number){
return _5b[this._itemNumPropName];
}else{
var _5d=_5b[_5c];
if(_5d){
return _5d[0];
}
}
return null;
},fetchItemByIdentity:function(_5e){
var _5f,_60;
if(!this._loadFinished){
var _61=this;
if(this._jsonFileUrl!==this._ccUrl){
_1.deprecated(this.declaredClass+": ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
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
this._queuedFetches.push({args:_5e});
}else{
this._loadInProgress=true;
var _62={url:_61._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk};
var _63=_5.get(_62);
_63.addCallback(function(_64){
var _65=_5e.scope?_5e.scope:_1.global;
try{
_61._getItemsFromLoadedData(_64);
_61._loadFinished=true;
_61._loadInProgress=false;
_5f=_61._getItemByIdentity(_5e.identity);
if(_5e.onItem){
_5e.onItem.call(_65,_5f);
}
_61._handleQueuedFetches();
}
catch(error){
_61._loadInProgress=false;
if(_5e.onError){
_5e.onError.call(_65,error);
}
}
});
_63.addErrback(function(_66){
_61._loadInProgress=false;
if(_5e.onError){
var _67=_5e.scope?_5e.scope:_1.global;
_5e.onError.call(_67,_66);
}
});
}
}else{
if(this._jsonData){
_61._getItemsFromLoadedData(_61._jsonData);
_61._jsonData=null;
_61._loadFinished=true;
_5f=_61._getItemByIdentity(_5e.identity);
if(_5e.onItem){
_60=_5e.scope?_5e.scope:_1.global;
_5e.onItem.call(_60,_5f);
}
}
}
}else{
_5f=this._getItemByIdentity(_5e.identity);
if(_5e.onItem){
_60=_5e.scope?_5e.scope:_1.global;
_5e.onItem.call(_60,_5f);
}
}
},_getItemByIdentity:function(_68){
var _69=null;
if(this._itemsByIdentity){
if(Object.hasOwnProperty.call(this._itemsByIdentity,_68)){
_69=this._itemsByIdentity[_68];
}
}else{
if(Object.hasOwnProperty.call(this._arrayOfAllItems,_68)){
_69=this._arrayOfAllItems[_68];
}
}
if(_69===undefined){
_69=null;
}
return _69;
},getIdentityAttributes:function(_6a){
var _6b=this._features["dojo.data.api.Identity"];
if(_6b===Number){
return null;
}else{
return [_6b];
}
},_forceLoad:function(){
var _6c=this;
if(this._jsonFileUrl!==this._ccUrl){
_1.deprecated(this.declaredClass+": ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
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
var _6d={url:this._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk,sync:true};
var _6e=_5.get(_6d);
_6e.addCallback(function(_6f){
try{
if(_6c._loadInProgress!==true&&!_6c._loadFinished){
_6c._getItemsFromLoadedData(_6f);
_6c._loadFinished=true;
}else{
if(_6c._loadInProgress){
throw new Error(this.declaredClass+":  Unable to perform a synchronous load, an async load is in progress.");
}
}
}
catch(e){
throw e;
}
});
_6e.addErrback(function(_70){
throw _70;
});
}else{
if(this._jsonData){
_6c._getItemsFromLoadedData(_6c._jsonData);
_6c._jsonData=null;
_6c._loadFinished=true;
}
}
}});
_2.extend(_a,_8);
return _a;
});
