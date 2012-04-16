/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.AndOrReadStore"]){
dojo._hasResource["dojox.data.AndOrReadStore"]=true;
dojo.provide("dojox.data.AndOrReadStore");
dojo.require("dojo.data.util.filter");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.date.stamp");
dojo.declare("dojox.data.AndOrReadStore",null,{constructor:function(_1){
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
},url:"",_ccUrl:"",data:null,typeMap:null,clearOnClose:false,urlPreventCache:false,hierarchical:true,_assertIsItem:function(_3){
if(!this.isItem(_3)){
throw new Error("dojox.data.AndOrReadStore: Invalid item argument.");
}
},_assertIsAttribute:function(_4){
if(typeof _4!=="string"){
throw new Error("dojox.data.AndOrReadStore: Invalid attribute argument.");
}
},getValue:function(_5,_6,_7){
var _8=this.getValues(_5,_6);
return (_8.length>0)?_8[0]:_7;
},getValues:function(_9,_a){
this._assertIsItem(_9);
this._assertIsAttribute(_a);
var _b=_9[_a]||[];
return _b.slice(0,_b.length);
},getAttributes:function(_c){
this._assertIsItem(_c);
var _d=[];
for(var _e in _c){
if((_e!==this._storeRefPropName)&&(_e!==this._itemNumPropName)&&(_e!==this._rootItemPropName)&&(_e!==this._reverseRefMap)){
_d.push(_e);
}
}
return _d;
},hasAttribute:function(_f,_10){
this._assertIsItem(_f);
this._assertIsAttribute(_10);
return (_10 in _f);
},containsValue:function(_11,_12,_13){
var _14=undefined;
if(typeof _13==="string"){
_14=dojo.data.util.filter.patternToRegExp(_13,false);
}
return this._containsValue(_11,_12,_13,_14);
},_containsValue:function(_15,_16,_17,_18){
return dojo.some(this.getValues(_15,_16),function(_19){
if(_19!==null&&!dojo.isObject(_19)&&_18){
if(_19.toString().match(_18)){
return true;
}
}else{
if(_17===_19){
return true;
}
}
});
},isItem:function(_1a){
if(_1a&&_1a[this._storeRefPropName]===this){
if(this._arrayOfAllItems[_1a[this._itemNumPropName]]===_1a){
return true;
}
}
return false;
},isItemLoaded:function(_1b){
return this.isItem(_1b);
},loadItem:function(_1c){
this._assertIsItem(_1c.item);
},getFeatures:function(){
return this._features;
},getLabel:function(_1d){
if(this._labelAttr&&this.isItem(_1d)){
return this.getValue(_1d,this._labelAttr);
}
return undefined;
},getLabelAttributes:function(_1e){
if(this._labelAttr){
return [this._labelAttr];
}
return null;
},_fetchItems:function(_1f,_20,_21){
var _22=this;
var _23=function(_24,_25){
var _26=[];
if(_24.query){
var _27=dojo.fromJson(dojo.toJson(_24.query));
if(typeof _27=="object"){
var _28=0;
var p;
for(p in _27){
_28++;
}
if(_28>1&&_27.complexQuery){
var cq=_27.complexQuery;
var _29=false;
for(p in _27){
if(p!=="complexQuery"){
if(!_29){
cq="( "+cq+" )";
_29=true;
}
var v=_24.query[p];
if(dojo.isString(v)){
v="'"+v+"'";
}
cq+=" AND "+p+":"+v;
delete _27[p];
}
}
_27.complexQuery=cq;
}
}
var _2a=_24.queryOptions?_24.queryOptions.ignoreCase:false;
if(typeof _27!="string"){
_27=dojo.toJson(_27);
_27=_27.replace(/\\\\/g,"\\");
}
_27=_27.replace(/\\"/g,"\"");
var _2b=dojo.trim(_27.replace(/{|}/g,""));
var _2c,i;
if(_2b.match(/"? *complexQuery *"?:/)){
_2b=dojo.trim(_2b.replace(/"?\s*complexQuery\s*"?:/,""));
var _2d=["'","\""];
var _2e,_2f;
var _30=false;
for(i=0;i<_2d.length;i++){
_2e=_2b.indexOf(_2d[i]);
_2c=_2b.indexOf(_2d[i],1);
_2f=_2b.indexOf(":",1);
if(_2e===0&&_2c!=-1&&_2f<_2c){
_30=true;
break;
}
}
if(_30){
_2b=_2b.replace(/^\"|^\'|\"$|\'$/g,"");
}
}
var _31=_2b;
var _32=/^,|^NOT |^AND |^OR |^\(|^\)|^!|^&&|^\|\|/i;
var _33="";
var op="";
var val="";
var pos=-1;
var err=false;
var key="";
var _34="";
var tok="";
_2c=-1;
for(i=0;i<_25.length;++i){
var _35=true;
var _36=_25[i];
if(_36===null){
_35=false;
}else{
_2b=_31;
_33="";
while(_2b.length>0&&!err){
op=_2b.match(_32);
while(op&&!err){
_2b=dojo.trim(_2b.replace(op[0],""));
op=dojo.trim(op[0]).toUpperCase();
op=op=="NOT"?"!":op=="AND"||op==","?"&&":op=="OR"?"||":op;
op=" "+op+" ";
_33+=op;
op=_2b.match(_32);
}
if(_2b.length>0){
pos=_2b.indexOf(":");
if(pos==-1){
err=true;
break;
}else{
key=dojo.trim(_2b.substring(0,pos).replace(/\"|\'/g,""));
_2b=dojo.trim(_2b.substring(pos+1));
tok=_2b.match(/^\'|^\"/);
if(tok){
tok=tok[0];
pos=_2b.indexOf(tok);
_2c=_2b.indexOf(tok,pos+1);
if(_2c==-1){
err=true;
break;
}
_34=_2b.substring(pos+1,_2c);
if(_2c==_2b.length-1){
_2b="";
}else{
_2b=dojo.trim(_2b.substring(_2c+1));
}
_33+=_22._containsValue(_36,key,_34,dojo.data.util.filter.patternToRegExp(_34,_2a));
}else{
tok=_2b.match(/\s|\)|,/);
if(tok){
var _37=new Array(tok.length);
for(var j=0;j<tok.length;j++){
_37[j]=_2b.indexOf(tok[j]);
}
pos=_37[0];
if(_37.length>1){
for(var j=1;j<_37.length;j++){
pos=Math.min(pos,_37[j]);
}
}
_34=dojo.trim(_2b.substring(0,pos));
_2b=dojo.trim(_2b.substring(pos));
}else{
_34=dojo.trim(_2b);
_2b="";
}
_33+=_22._containsValue(_36,key,_34,dojo.data.util.filter.patternToRegExp(_34,_2a));
}
}
}
}
_35=eval(_33);
}
if(_35){
_26.push(_36);
}
}
if(err){
_26=[];
}
_20(_26,_24);
}else{
for(var i=0;i<_25.length;++i){
var _38=_25[i];
if(_38!==null){
_26.push(_38);
}
}
_20(_26,_24);
}
};
if(this._loadFinished){
_23(_1f,this._getItemsArray(_1f.queryOptions));
}else{
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojox.data.AndOrReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
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
this._queuedFetches.push({args:_1f,filter:_23});
}else{
this._loadInProgress=true;
var _39={url:_22._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache};
var _3a=dojo.xhrGet(_39);
_3a.addCallback(function(_3b){
try{
_22._getItemsFromLoadedData(_3b);
_22._loadFinished=true;
_22._loadInProgress=false;
_23(_1f,_22._getItemsArray(_1f.queryOptions));
_22._handleQueuedFetches();
}
catch(e){
_22._loadFinished=true;
_22._loadInProgress=false;
_21(e,_1f);
}
});
_3a.addErrback(function(_3c){
_22._loadInProgress=false;
_21(_3c,_1f);
});
var _3d=null;
if(_1f.abort){
_3d=_1f.abort;
}
_1f.abort=function(){
var df=_3a;
if(df&&df.fired===-1){
df.cancel();
df=null;
}
if(_3d){
_3d.call(_1f);
}
};
}
}else{
if(this._jsonData){
try{
this._loadFinished=true;
this._getItemsFromLoadedData(this._jsonData);
this._jsonData=null;
_23(_1f,this._getItemsArray(_1f.queryOptions));
}
catch(e){
_21(e,_1f);
}
}else{
_21(new Error("dojox.data.AndOrReadStore: No JSON source data was provided as either URL or a nested Javascript object."),_1f);
}
}
}
},_handleQueuedFetches:function(){
if(this._queuedFetches.length>0){
for(var i=0;i<this._queuedFetches.length;i++){
var _3e=this._queuedFetches[i];
var _3f=_3e.args;
var _40=_3e.filter;
if(_40){
_40(_3f,this._getItemsArray(_3f.queryOptions));
}else{
this.fetchItemByIdentity(_3f);
}
}
this._queuedFetches=[];
}
},_getItemsArray:function(_41){
if(_41&&_41.deep){
return this._arrayOfAllItems;
}
return this._arrayOfTopLevelItems;
},close:function(_42){
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
},_getItemsFromLoadedData:function(_43){
var _44=this;
function _45(_46){
var _47=((_46!==null)&&(typeof _46==="object")&&(!dojo.isArray(_46))&&(!dojo.isFunction(_46))&&(_46.constructor==Object)&&(typeof _46._reference==="undefined")&&(typeof _46._type==="undefined")&&(typeof _46._value==="undefined")&&_44.hierarchical);
return _47;
};
function _48(_49){
_44._arrayOfAllItems.push(_49);
for(var _4a in _49){
var _4b=_49[_4a];
if(_4b){
if(dojo.isArray(_4b)){
var _4c=_4b;
for(var k=0;k<_4c.length;++k){
var _4d=_4c[k];
if(_45(_4d)){
_48(_4d);
}
}
}else{
if(_45(_4b)){
_48(_4b);
}
}
}
}
};
this._labelAttr=_43.label;
var i;
var _4e;
this._arrayOfAllItems=[];
this._arrayOfTopLevelItems=_43.items;
for(i=0;i<this._arrayOfTopLevelItems.length;++i){
_4e=this._arrayOfTopLevelItems[i];
_48(_4e);
_4e[this._rootItemPropName]=true;
}
var _4f={};
var key;
for(i=0;i<this._arrayOfAllItems.length;++i){
_4e=this._arrayOfAllItems[i];
for(key in _4e){
if(key!==this._rootItemPropName){
var _50=_4e[key];
if(_50!==null){
if(!dojo.isArray(_50)){
_4e[key]=[_50];
}
}else{
_4e[key]=[null];
}
}
_4f[key]=key;
}
}
while(_4f[this._storeRefPropName]){
this._storeRefPropName+="_";
}
while(_4f[this._itemNumPropName]){
this._itemNumPropName+="_";
}
while(_4f[this._reverseRefMap]){
this._reverseRefMap+="_";
}
var _51;
var _52=_43.identifier;
if(_52){
this._itemsByIdentity={};
this._features["dojo.data.api.Identity"]=_52;
for(i=0;i<this._arrayOfAllItems.length;++i){
_4e=this._arrayOfAllItems[i];
_51=_4e[_52];
var _53=_51[0];
if(!this._itemsByIdentity[_53]){
this._itemsByIdentity[_53]=_4e;
}else{
if(this._jsonFileUrl){
throw new Error("dojox.data.AndOrReadStore:  The json data as specified by: ["+this._jsonFileUrl+"] is malformed.  Items within the list have identifier: ["+_52+"].  Value collided: ["+_53+"]");
}else{
if(this._jsonData){
throw new Error("dojox.data.AndOrReadStore:  The json data provided by the creation arguments is malformed.  Items within the list have identifier: ["+_52+"].  Value collided: ["+_53+"]");
}
}
}
}
}else{
this._features["dojo.data.api.Identity"]=Number;
}
for(i=0;i<this._arrayOfAllItems.length;++i){
_4e=this._arrayOfAllItems[i];
_4e[this._storeRefPropName]=this;
_4e[this._itemNumPropName]=i;
}
for(i=0;i<this._arrayOfAllItems.length;++i){
_4e=this._arrayOfAllItems[i];
for(key in _4e){
_51=_4e[key];
for(var j=0;j<_51.length;++j){
_50=_51[j];
if(_50!==null&&typeof _50=="object"){
if(("_type" in _50)&&("_value" in _50)){
var _54=_50._type;
var _55=this._datatypeMap[_54];
if(!_55){
throw new Error("dojox.data.AndOrReadStore: in the typeMap constructor arg, no object class was specified for the datatype '"+_54+"'");
}else{
if(dojo.isFunction(_55)){
_51[j]=new _55(_50._value);
}else{
if(dojo.isFunction(_55.deserialize)){
_51[j]=_55.deserialize(_50._value);
}else{
throw new Error("dojox.data.AndOrReadStore: Value provided in typeMap was neither a constructor, nor a an object with a deserialize function");
}
}
}
}
if(_50._reference){
var _56=_50._reference;
if(!dojo.isObject(_56)){
_51[j]=this._getItemByIdentity(_56);
}else{
for(var k=0;k<this._arrayOfAllItems.length;++k){
var _57=this._arrayOfAllItems[k];
var _58=true;
for(var _59 in _56){
if(_57[_59]!=_56[_59]){
_58=false;
}
}
if(_58){
_51[j]=_57;
}
}
}
if(this.referenceIntegrity){
var _5a=_51[j];
if(this.isItem(_5a)){
this._addReferenceToMap(_5a,_4e,key);
}
}
}else{
if(this.isItem(_50)){
if(this.referenceIntegrity){
this._addReferenceToMap(_50,_4e,key);
}
}
}
}
}
}
}
},_addReferenceToMap:function(_5b,_5c,_5d){
},getIdentity:function(_5e){
var _5f=this._features["dojo.data.api.Identity"];
if(_5f===Number){
return _5e[this._itemNumPropName];
}else{
var _60=_5e[_5f];
if(_60){
return _60[0];
}
}
return null;
},fetchItemByIdentity:function(_61){
if(!this._loadFinished){
var _62=this;
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojox.data.AndOrReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
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
this._queuedFetches.push({args:_61});
}else{
this._loadInProgress=true;
var _63={url:_62._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache};
var _64=dojo.xhrGet(_63);
_64.addCallback(function(_65){
var _66=_61.scope?_61.scope:dojo.global;
try{
_62._getItemsFromLoadedData(_65);
_62._loadFinished=true;
_62._loadInProgress=false;
var _67=_62._getItemByIdentity(_61.identity);
if(_61.onItem){
_61.onItem.call(_66,_67);
}
_62._handleQueuedFetches();
}
catch(error){
_62._loadInProgress=false;
if(_61.onError){
_61.onError.call(_66,error);
}
}
});
_64.addErrback(function(_68){
_62._loadInProgress=false;
if(_61.onError){
var _69=_61.scope?_61.scope:dojo.global;
_61.onError.call(_69,_68);
}
});
}
}else{
if(this._jsonData){
_62._getItemsFromLoadedData(_62._jsonData);
_62._jsonData=null;
_62._loadFinished=true;
var _6a=_62._getItemByIdentity(_61.identity);
if(_61.onItem){
var _6b=_61.scope?_61.scope:dojo.global;
_61.onItem.call(_6b,_6a);
}
}
}
}else{
var _6a=this._getItemByIdentity(_61.identity);
if(_61.onItem){
var _6b=_61.scope?_61.scope:dojo.global;
_61.onItem.call(_6b,_6a);
}
}
},_getItemByIdentity:function(_6c){
var _6d=null;
if(this._itemsByIdentity){
_6d=this._itemsByIdentity[_6c];
}else{
_6d=this._arrayOfAllItems[_6c];
}
if(_6d===undefined){
_6d=null;
}
return _6d;
},getIdentityAttributes:function(_6e){
var _6f=this._features["dojo.data.api.Identity"];
if(_6f===Number){
return null;
}else{
return [_6f];
}
},_forceLoad:function(){
var _70=this;
if(this._jsonFileUrl!==this._ccUrl){
dojo.deprecated("dojox.data.AndOrReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
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
var _71={url:_70._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,sync:true};
var _72=dojo.xhrGet(_71);
_72.addCallback(function(_73){
try{
if(_70._loadInProgress!==true&&!_70._loadFinished){
_70._getItemsFromLoadedData(_73);
_70._loadFinished=true;
}else{
if(_70._loadInProgress){
throw new Error("dojox.data.AndOrReadStore:  Unable to perform a synchronous load, an async load is in progress.");
}
}
}
catch(e){
throw e;
}
});
_72.addErrback(function(_74){
throw _74;
});
}else{
if(this._jsonData){
_70._getItemsFromLoadedData(_70._jsonData);
_70._jsonData=null;
_70._loadFinished=true;
}
}
}});
dojo.extend(dojox.data.AndOrReadStore,dojo.data.util.simpleFetch);
}
