/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.AndOrWriteStore"]){
dojo._hasResource["dojox.data.AndOrWriteStore"]=true;
dojo.provide("dojox.data.AndOrWriteStore");
dojo.require("dojox.data.AndOrReadStore");
dojo.declare("dojox.data.AndOrWriteStore",dojox.data.AndOrReadStore,{constructor:function(_1){
this._features["dojo.data.api.Write"]=true;
this._features["dojo.data.api.Notification"]=true;
this._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
if(!this._datatypeMap["Date"].serialize){
this._datatypeMap["Date"].serialize=function(_2){
return dojo.date.stamp.toISOString(_2,{zulu:true});
};
}
if(_1&&(_1.referenceIntegrity===false)){
this.referenceIntegrity=false;
}
this._saveInProgress=false;
},referenceIntegrity:true,_assert:function(_3){
if(!_3){
throw new Error("assertion failed in ItemFileWriteStore");
}
},_getIdentifierAttribute:function(){
var _4=this.getFeatures()["dojo.data.api.Identity"];
return _4;
},newItem:function(_5,_6){
this._assert(!this._saveInProgress);
if(!this._loadFinished){
this._forceLoad();
}
if(typeof _5!="object"&&typeof _5!="undefined"){
throw new Error("newItem() was passed something other than an object");
}
var _7=null;
var _8=this._getIdentifierAttribute();
if(_8===Number){
_7=this._arrayOfAllItems.length;
}else{
_7=_5[_8];
if(typeof _7==="undefined"){
throw new Error("newItem() was not passed an identity for the new item");
}
if(dojo.isArray(_7)){
throw new Error("newItem() was not passed an single-valued identity");
}
}
if(this._itemsByIdentity){
this._assert(typeof this._itemsByIdentity[_7]==="undefined");
}
this._assert(typeof this._pending._newItems[_7]==="undefined");
this._assert(typeof this._pending._deletedItems[_7]==="undefined");
var _9={};
_9[this._storeRefPropName]=this;
_9[this._itemNumPropName]=this._arrayOfAllItems.length;
if(this._itemsByIdentity){
this._itemsByIdentity[_7]=_9;
_9[_8]=[_7];
}
this._arrayOfAllItems.push(_9);
var _a=null;
if(_6&&_6.parent&&_6.attribute){
_a={item:_6.parent,attribute:_6.attribute,oldValue:undefined};
var _b=this.getValues(_6.parent,_6.attribute);
if(_b&&_b.length>0){
var _c=_b.slice(0,_b.length);
if(_b.length===1){
_a.oldValue=_b[0];
}else{
_a.oldValue=_b.slice(0,_b.length);
}
_c.push(_9);
this._setValueOrValues(_6.parent,_6.attribute,_c,false);
_a.newValue=this.getValues(_6.parent,_6.attribute);
}else{
this._setValueOrValues(_6.parent,_6.attribute,_9,false);
_a.newValue=_9;
}
}else{
_9[this._rootItemPropName]=true;
this._arrayOfTopLevelItems.push(_9);
}
this._pending._newItems[_7]=_9;
for(var _d in _5){
if(_d===this._storeRefPropName||_d===this._itemNumPropName){
throw new Error("encountered bug in ItemFileWriteStore.newItem");
}
var _e=_5[_d];
if(!dojo.isArray(_e)){
_e=[_e];
}
_9[_d]=_e;
if(this.referenceIntegrity){
for(var i=0;i<_e.length;i++){
var _f=_e[i];
if(this.isItem(_f)){
this._addReferenceToMap(_f,_9,_d);
}
}
}
}
this.onNew(_9,_a);
return _9;
},_removeArrayElement:function(_10,_11){
var _12=dojo.indexOf(_10,_11);
if(_12!=-1){
_10.splice(_12,1);
return true;
}
return false;
},deleteItem:function(_13){
this._assert(!this._saveInProgress);
this._assertIsItem(_13);
var _14=_13[this._itemNumPropName];
var _15=this.getIdentity(_13);
if(this.referenceIntegrity){
var _16=this.getAttributes(_13);
if(_13[this._reverseRefMap]){
_13["backup_"+this._reverseRefMap]=dojo.clone(_13[this._reverseRefMap]);
}
dojo.forEach(_16,function(_17){
dojo.forEach(this.getValues(_13,_17),function(_18){
if(this.isItem(_18)){
if(!_13["backupRefs_"+this._reverseRefMap]){
_13["backupRefs_"+this._reverseRefMap]=[];
}
_13["backupRefs_"+this._reverseRefMap].push({id:this.getIdentity(_18),attr:_17});
this._removeReferenceFromMap(_18,_13,_17);
}
},this);
},this);
var _19=_13[this._reverseRefMap];
if(_19){
for(var _1a in _19){
var _1b=null;
if(this._itemsByIdentity){
_1b=this._itemsByIdentity[_1a];
}else{
_1b=this._arrayOfAllItems[_1a];
}
if(_1b){
for(var _1c in _19[_1a]){
var _1d=this.getValues(_1b,_1c)||[];
var _1e=dojo.filter(_1d,function(_1f){
return !(this.isItem(_1f)&&this.getIdentity(_1f)==_15);
},this);
this._removeReferenceFromMap(_13,_1b,_1c);
if(_1e.length<_1d.length){
this._setValueOrValues(_1b,_1c,_1e);
}
}
}
}
}
}
this._arrayOfAllItems[_14]=null;
_13[this._storeRefPropName]=null;
if(this._itemsByIdentity){
delete this._itemsByIdentity[_15];
}
this._pending._deletedItems[_15]=_13;
if(_13[this._rootItemPropName]){
this._removeArrayElement(this._arrayOfTopLevelItems,_13);
}
this.onDelete(_13);
return true;
},setValue:function(_20,_21,_22){
return this._setValueOrValues(_20,_21,_22,true);
},setValues:function(_23,_24,_25){
return this._setValueOrValues(_23,_24,_25,true);
},unsetAttribute:function(_26,_27){
return this._setValueOrValues(_26,_27,[],true);
},_setValueOrValues:function(_28,_29,_2a,_2b){
this._assert(!this._saveInProgress);
this._assertIsItem(_28);
this._assert(dojo.isString(_29));
this._assert(typeof _2a!=="undefined");
var _2c=this._getIdentifierAttribute();
if(_29==_2c){
throw new Error("ItemFileWriteStore does not have support for changing the value of an item's identifier.");
}
var _2d=this._getValueOrValues(_28,_29);
var _2e=this.getIdentity(_28);
if(!this._pending._modifiedItems[_2e]){
var _2f={};
for(var key in _28){
if((key===this._storeRefPropName)||(key===this._itemNumPropName)||(key===this._rootItemPropName)){
_2f[key]=_28[key];
}else{
if(key===this._reverseRefMap){
_2f[key]=dojo.clone(_28[key]);
}else{
_2f[key]=_28[key].slice(0,_28[key].length);
}
}
}
this._pending._modifiedItems[_2e]=_2f;
}
var _30=false;
if(dojo.isArray(_2a)&&_2a.length===0){
_30=delete _28[_29];
_2a=undefined;
if(this.referenceIntegrity&&_2d){
var _31=_2d;
if(!dojo.isArray(_31)){
_31=[_31];
}
for(var i=0;i<_31.length;i++){
var _32=_31[i];
if(this.isItem(_32)){
this._removeReferenceFromMap(_32,_28,_29);
}
}
}
}else{
var _33;
if(dojo.isArray(_2a)){
var _34=_2a;
_33=_2a.slice(0,_2a.length);
}else{
_33=[_2a];
}
if(this.referenceIntegrity){
if(_2d){
var _31=_2d;
if(!dojo.isArray(_31)){
_31=[_31];
}
var map={};
dojo.forEach(_31,function(_35){
if(this.isItem(_35)){
var id=this.getIdentity(_35);
map[id.toString()]=true;
}
},this);
dojo.forEach(_33,function(_36){
if(this.isItem(_36)){
var id=this.getIdentity(_36);
if(map[id.toString()]){
delete map[id.toString()];
}else{
this._addReferenceToMap(_36,_28,_29);
}
}
},this);
for(var rId in map){
var _37;
if(this._itemsByIdentity){
_37=this._itemsByIdentity[rId];
}else{
_37=this._arrayOfAllItems[rId];
}
this._removeReferenceFromMap(_37,_28,_29);
}
}else{
for(var i=0;i<_33.length;i++){
var _32=_33[i];
if(this.isItem(_32)){
this._addReferenceToMap(_32,_28,_29);
}
}
}
}
_28[_29]=_33;
_30=true;
}
if(_2b){
this.onSet(_28,_29,_2d,_2a);
}
return _30;
},_addReferenceToMap:function(_38,_39,_3a){
var _3b=this.getIdentity(_39);
var _3c=_38[this._reverseRefMap];
if(!_3c){
_3c=_38[this._reverseRefMap]={};
}
var _3d=_3c[_3b];
if(!_3d){
_3d=_3c[_3b]={};
}
_3d[_3a]=true;
},_removeReferenceFromMap:function(_3e,_3f,_40){
var _41=this.getIdentity(_3f);
var _42=_3e[this._reverseRefMap];
var _43;
if(_42){
for(_43 in _42){
if(_43==_41){
delete _42[_43][_40];
if(this._isEmpty(_42[_43])){
delete _42[_43];
}
}
}
if(this._isEmpty(_42)){
delete _3e[this._reverseRefMap];
}
}
},_dumpReferenceMap:function(){
var i;
for(i=0;i<this._arrayOfAllItems.length;i++){
var _44=this._arrayOfAllItems[i];
if(_44&&_44[this._reverseRefMap]){
}
}
},_getValueOrValues:function(_45,_46){
var _47=undefined;
if(this.hasAttribute(_45,_46)){
var _48=this.getValues(_45,_46);
if(_48.length==1){
_47=_48[0];
}else{
_47=_48;
}
}
return _47;
},_flatten:function(_49){
if(this.isItem(_49)){
var _4a=_49;
var _4b=this.getIdentity(_4a);
var _4c={_reference:_4b};
return _4c;
}else{
if(typeof _49==="object"){
for(var _4d in this._datatypeMap){
var _4e=this._datatypeMap[_4d];
if(dojo.isObject(_4e)&&!dojo.isFunction(_4e)){
if(_49 instanceof _4e.type){
if(!_4e.serialize){
throw new Error("ItemFileWriteStore:  No serializer defined for type mapping: ["+_4d+"]");
}
return {_type:_4d,_value:_4e.serialize(_49)};
}
}else{
if(_49 instanceof _4e){
return {_type:_4d,_value:_49.toString()};
}
}
}
}
return _49;
}
},_getNewFileContentString:function(){
var _4f={};
var _50=this._getIdentifierAttribute();
if(_50!==Number){
_4f.identifier=_50;
}
if(this._labelAttr){
_4f.label=this._labelAttr;
}
_4f.items=[];
for(var i=0;i<this._arrayOfAllItems.length;++i){
var _51=this._arrayOfAllItems[i];
if(_51!==null){
var _52={};
for(var key in _51){
if(key!==this._storeRefPropName&&key!==this._itemNumPropName&&key!==this._reverseRefMap&&key!==this._rootItemPropName){
var _53=key;
var _54=this.getValues(_51,_53);
if(_54.length==1){
_52[_53]=this._flatten(_54[0]);
}else{
var _55=[];
for(var j=0;j<_54.length;++j){
_55.push(this._flatten(_54[j]));
_52[_53]=_55;
}
}
}
}
_4f.items.push(_52);
}
}
var _56=true;
return dojo.toJson(_4f,_56);
},_isEmpty:function(_57){
var _58=true;
if(dojo.isObject(_57)){
var i;
for(i in _57){
_58=false;
break;
}
}else{
if(dojo.isArray(_57)){
if(_57.length>0){
_58=false;
}
}
}
return _58;
},save:function(_59){
this._assert(!this._saveInProgress);
this._saveInProgress=true;
var _5a=this;
var _5b=function(){
_5a._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
_5a._saveInProgress=false;
if(_59&&_59.onComplete){
var _5c=_59.scope||dojo.global;
_59.onComplete.call(_5c);
}
};
var _5d=function(){
_5a._saveInProgress=false;
if(_59&&_59.onError){
var _5e=_59.scope||dojo.global;
_59.onError.call(_5e);
}
};
if(this._saveEverything){
var _5f=this._getNewFileContentString();
this._saveEverything(_5b,_5d,_5f);
}
if(this._saveCustom){
this._saveCustom(_5b,_5d);
}
if(!this._saveEverything&&!this._saveCustom){
_5b();
}
},revert:function(){
this._assert(!this._saveInProgress);
var _60;
for(_60 in this._pending._modifiedItems){
var _61=this._pending._modifiedItems[_60];
var _62=null;
if(this._itemsByIdentity){
_62=this._itemsByIdentity[_60];
}else{
_62=this._arrayOfAllItems[_60];
}
_61[this._storeRefPropName]=this;
for(key in _62){
delete _62[key];
}
dojo.mixin(_62,_61);
}
var _63;
for(_60 in this._pending._deletedItems){
_63=this._pending._deletedItems[_60];
_63[this._storeRefPropName]=this;
var _64=_63[this._itemNumPropName];
if(_63["backup_"+this._reverseRefMap]){
_63[this._reverseRefMap]=_63["backup_"+this._reverseRefMap];
delete _63["backup_"+this._reverseRefMap];
}
this._arrayOfAllItems[_64]=_63;
if(this._itemsByIdentity){
this._itemsByIdentity[_60]=_63;
}
if(_63[this._rootItemPropName]){
this._arrayOfTopLevelItems.push(_63);
}
}
for(_60 in this._pending._deletedItems){
_63=this._pending._deletedItems[_60];
if(_63["backupRefs_"+this._reverseRefMap]){
dojo.forEach(_63["backupRefs_"+this._reverseRefMap],function(_65){
var _66;
if(this._itemsByIdentity){
_66=this._itemsByIdentity[_65.id];
}else{
_66=this._arrayOfAllItems[_65.id];
}
this._addReferenceToMap(_66,_63,_65.attr);
},this);
delete _63["backupRefs_"+this._reverseRefMap];
}
}
for(_60 in this._pending._newItems){
var _67=this._pending._newItems[_60];
_67[this._storeRefPropName]=null;
this._arrayOfAllItems[_67[this._itemNumPropName]]=null;
if(_67[this._rootItemPropName]){
this._removeArrayElement(this._arrayOfTopLevelItems,_67);
}
if(this._itemsByIdentity){
delete this._itemsByIdentity[_60];
}
}
this._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
return true;
},isDirty:function(_68){
if(_68){
var _69=this.getIdentity(_68);
return new Boolean(this._pending._newItems[_69]||this._pending._modifiedItems[_69]||this._pending._deletedItems[_69]).valueOf();
}else{
if(!this._isEmpty(this._pending._newItems)||!this._isEmpty(this._pending._modifiedItems)||!this._isEmpty(this._pending._deletedItems)){
return true;
}
return false;
}
},onSet:function(_6a,_6b,_6c,_6d){
},onNew:function(_6e,_6f){
},onDelete:function(_70){
},close:function(_71){
if(this.clearOnClose){
if(!this.isDirty()){
this.inherited(arguments);
}else{
throw new Error("dojox.data.AndOrWriteStore: There are unsaved changes present in the store.  Please save or revert the changes before invoking close.");
}
}
}});
}
