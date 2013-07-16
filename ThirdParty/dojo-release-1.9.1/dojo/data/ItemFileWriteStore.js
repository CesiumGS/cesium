/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/ItemFileWriteStore",["../_base/lang","../_base/declare","../_base/array","../_base/json","../_base/kernel","./ItemFileReadStore","../date/stamp"],function(_1,_2,_3,_4,_5,_6,_7){
return _2("dojo.data.ItemFileWriteStore",_6,{constructor:function(_8){
this._features["dojo.data.api.Write"]=true;
this._features["dojo.data.api.Notification"]=true;
this._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
if(!this._datatypeMap["Date"].serialize){
this._datatypeMap["Date"].serialize=function(_9){
return _7.toISOString(_9,{zulu:true});
};
}
if(_8&&(_8.referenceIntegrity===false)){
this.referenceIntegrity=false;
}
this._saveInProgress=false;
},referenceIntegrity:true,_assert:function(_a){
if(!_a){
throw new Error("assertion failed in ItemFileWriteStore");
}
},_getIdentifierAttribute:function(){
return this.getFeatures()["dojo.data.api.Identity"];
},newItem:function(_b,_c){
this._assert(!this._saveInProgress);
if(!this._loadFinished){
this._forceLoad();
}
if(typeof _b!="object"&&typeof _b!="undefined"){
throw new Error("newItem() was passed something other than an object");
}
var _d=null;
var _e=this._getIdentifierAttribute();
if(_e===Number){
_d=this._arrayOfAllItems.length;
}else{
_d=_b[_e];
if(typeof _d==="undefined"){
throw new Error("newItem() was not passed an identity for the new item");
}
if(_1.isArray(_d)){
throw new Error("newItem() was not passed an single-valued identity");
}
}
if(this._itemsByIdentity){
this._assert(typeof this._itemsByIdentity[_d]==="undefined");
}
this._assert(typeof this._pending._newItems[_d]==="undefined");
this._assert(typeof this._pending._deletedItems[_d]==="undefined");
var _f={};
_f[this._storeRefPropName]=this;
_f[this._itemNumPropName]=this._arrayOfAllItems.length;
if(this._itemsByIdentity){
this._itemsByIdentity[_d]=_f;
_f[_e]=[_d];
}
this._arrayOfAllItems.push(_f);
var _10=null;
if(_c&&_c.parent&&_c.attribute){
_10={item:_c.parent,attribute:_c.attribute,oldValue:undefined};
var _11=this.getValues(_c.parent,_c.attribute);
if(_11&&_11.length>0){
var _12=_11.slice(0,_11.length);
if(_11.length===1){
_10.oldValue=_11[0];
}else{
_10.oldValue=_11.slice(0,_11.length);
}
_12.push(_f);
this._setValueOrValues(_c.parent,_c.attribute,_12,false);
_10.newValue=this.getValues(_c.parent,_c.attribute);
}else{
this._setValueOrValues(_c.parent,_c.attribute,_f,false);
_10.newValue=_f;
}
}else{
_f[this._rootItemPropName]=true;
this._arrayOfTopLevelItems.push(_f);
}
this._pending._newItems[_d]=_f;
for(var key in _b){
if(key===this._storeRefPropName||key===this._itemNumPropName){
throw new Error("encountered bug in ItemFileWriteStore.newItem");
}
var _13=_b[key];
if(!_1.isArray(_13)){
_13=[_13];
}
_f[key]=_13;
if(this.referenceIntegrity){
for(var i=0;i<_13.length;i++){
var val=_13[i];
if(this.isItem(val)){
this._addReferenceToMap(val,_f,key);
}
}
}
}
this.onNew(_f,_10);
return _f;
},_removeArrayElement:function(_14,_15){
var _16=_3.indexOf(_14,_15);
if(_16!=-1){
_14.splice(_16,1);
return true;
}
return false;
},deleteItem:function(_17){
this._assert(!this._saveInProgress);
this._assertIsItem(_17);
var _18=_17[this._itemNumPropName];
var _19=this.getIdentity(_17);
if(this.referenceIntegrity){
var _1a=this.getAttributes(_17);
if(_17[this._reverseRefMap]){
_17["backup_"+this._reverseRefMap]=_1.clone(_17[this._reverseRefMap]);
}
_3.forEach(_1a,function(_1b){
_3.forEach(this.getValues(_17,_1b),function(_1c){
if(this.isItem(_1c)){
if(!_17["backupRefs_"+this._reverseRefMap]){
_17["backupRefs_"+this._reverseRefMap]=[];
}
_17["backupRefs_"+this._reverseRefMap].push({id:this.getIdentity(_1c),attr:_1b});
this._removeReferenceFromMap(_1c,_17,_1b);
}
},this);
},this);
var _1d=_17[this._reverseRefMap];
if(_1d){
for(var _1e in _1d){
var _1f=null;
if(this._itemsByIdentity){
_1f=this._itemsByIdentity[_1e];
}else{
_1f=this._arrayOfAllItems[_1e];
}
if(_1f){
for(var _20 in _1d[_1e]){
var _21=this.getValues(_1f,_20)||[];
var _22=_3.filter(_21,function(_23){
return !(this.isItem(_23)&&this.getIdentity(_23)==_19);
},this);
this._removeReferenceFromMap(_17,_1f,_20);
if(_22.length<_21.length){
this._setValueOrValues(_1f,_20,_22,true);
}
}
}
}
}
}
this._arrayOfAllItems[_18]=null;
_17[this._storeRefPropName]=null;
if(this._itemsByIdentity){
delete this._itemsByIdentity[_19];
}
this._pending._deletedItems[_19]=_17;
if(_17[this._rootItemPropName]){
this._removeArrayElement(this._arrayOfTopLevelItems,_17);
}
this.onDelete(_17);
return true;
},setValue:function(_24,_25,_26){
return this._setValueOrValues(_24,_25,_26,true);
},setValues:function(_27,_28,_29){
return this._setValueOrValues(_27,_28,_29,true);
},unsetAttribute:function(_2a,_2b){
return this._setValueOrValues(_2a,_2b,[],true);
},_setValueOrValues:function(_2c,_2d,_2e,_2f){
this._assert(!this._saveInProgress);
this._assertIsItem(_2c);
this._assert(_1.isString(_2d));
this._assert(typeof _2e!=="undefined");
var _30=this._getIdentifierAttribute();
if(_2d==_30){
throw new Error("ItemFileWriteStore does not have support for changing the value of an item's identifier.");
}
var _31=this._getValueOrValues(_2c,_2d);
var _32=this.getIdentity(_2c);
if(!this._pending._modifiedItems[_32]){
var _33={};
for(var key in _2c){
if((key===this._storeRefPropName)||(key===this._itemNumPropName)||(key===this._rootItemPropName)){
_33[key]=_2c[key];
}else{
if(key===this._reverseRefMap){
_33[key]=_1.clone(_2c[key]);
}else{
_33[key]=_2c[key].slice(0,_2c[key].length);
}
}
}
this._pending._modifiedItems[_32]=_33;
}
var _34=false;
if(_1.isArray(_2e)&&_2e.length===0){
_34=delete _2c[_2d];
_2e=undefined;
if(this.referenceIntegrity&&_31){
var _35=_31;
if(!_1.isArray(_35)){
_35=[_35];
}
for(var i=0;i<_35.length;i++){
var _36=_35[i];
if(this.isItem(_36)){
this._removeReferenceFromMap(_36,_2c,_2d);
}
}
}
}else{
var _37;
if(_1.isArray(_2e)){
_37=_2e.slice(0,_2e.length);
}else{
_37=[_2e];
}
if(this.referenceIntegrity){
if(_31){
var _35=_31;
if(!_1.isArray(_35)){
_35=[_35];
}
var map={};
_3.forEach(_35,function(_38){
if(this.isItem(_38)){
var id=this.getIdentity(_38);
map[id.toString()]=true;
}
},this);
_3.forEach(_37,function(_39){
if(this.isItem(_39)){
var id=this.getIdentity(_39);
if(map[id.toString()]){
delete map[id.toString()];
}else{
this._addReferenceToMap(_39,_2c,_2d);
}
}
},this);
for(var rId in map){
var _3a;
if(this._itemsByIdentity){
_3a=this._itemsByIdentity[rId];
}else{
_3a=this._arrayOfAllItems[rId];
}
this._removeReferenceFromMap(_3a,_2c,_2d);
}
}else{
for(var i=0;i<_37.length;i++){
var _36=_37[i];
if(this.isItem(_36)){
this._addReferenceToMap(_36,_2c,_2d);
}
}
}
}
_2c[_2d]=_37;
_34=true;
}
if(_2f){
this.onSet(_2c,_2d,_31,_2e);
}
return _34;
},_addReferenceToMap:function(_3b,_3c,_3d){
var _3e=this.getIdentity(_3c);
var _3f=_3b[this._reverseRefMap];
if(!_3f){
_3f=_3b[this._reverseRefMap]={};
}
var _40=_3f[_3e];
if(!_40){
_40=_3f[_3e]={};
}
_40[_3d]=true;
},_removeReferenceFromMap:function(_41,_42,_43){
var _44=this.getIdentity(_42);
var _45=_41[this._reverseRefMap];
var _46;
if(_45){
for(_46 in _45){
if(_46==_44){
delete _45[_46][_43];
if(this._isEmpty(_45[_46])){
delete _45[_46];
}
}
}
if(this._isEmpty(_45)){
delete _41[this._reverseRefMap];
}
}
},_dumpReferenceMap:function(){
var i;
for(i=0;i<this._arrayOfAllItems.length;i++){
var _47=this._arrayOfAllItems[i];
if(_47&&_47[this._reverseRefMap]){
}
}
},_getValueOrValues:function(_48,_49){
var _4a=undefined;
if(this.hasAttribute(_48,_49)){
var _4b=this.getValues(_48,_49);
if(_4b.length==1){
_4a=_4b[0];
}else{
_4a=_4b;
}
}
return _4a;
},_flatten:function(_4c){
if(this.isItem(_4c)){
return {_reference:this.getIdentity(_4c)};
}else{
if(typeof _4c==="object"){
for(var _4d in this._datatypeMap){
var _4e=this._datatypeMap[_4d];
if(_1.isObject(_4e)&&!_1.isFunction(_4e)){
if(_4c instanceof _4e.type){
if(!_4e.serialize){
throw new Error("ItemFileWriteStore:  No serializer defined for type mapping: ["+_4d+"]");
}
return {_type:_4d,_value:_4e.serialize(_4c)};
}
}else{
if(_4c instanceof _4e){
return {_type:_4d,_value:_4c.toString()};
}
}
}
}
return _4c;
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
var _53=this.getValues(_51,key);
if(_53.length==1){
_52[key]=this._flatten(_53[0]);
}else{
var _54=[];
for(var j=0;j<_53.length;++j){
_54.push(this._flatten(_53[j]));
_52[key]=_54;
}
}
}
}
_4f.items.push(_52);
}
}
var _55=true;
return _4.toJson(_4f,_55);
},_isEmpty:function(_56){
var _57=true;
if(_1.isObject(_56)){
var i;
for(i in _56){
_57=false;
break;
}
}else{
if(_1.isArray(_56)){
if(_56.length>0){
_57=false;
}
}
}
return _57;
},save:function(_58){
this._assert(!this._saveInProgress);
this._saveInProgress=true;
var _59=this;
var _5a=function(){
_59._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
_59._saveInProgress=false;
if(_58&&_58.onComplete){
var _5b=_58.scope||_5.global;
_58.onComplete.call(_5b);
}
};
var _5c=function(err){
_59._saveInProgress=false;
if(_58&&_58.onError){
var _5d=_58.scope||_5.global;
_58.onError.call(_5d,err);
}
};
if(this._saveEverything){
var _5e=this._getNewFileContentString();
this._saveEverything(_5a,_5c,_5e);
}
if(this._saveCustom){
this._saveCustom(_5a,_5c);
}
if(!this._saveEverything&&!this._saveCustom){
_5a();
}
},revert:function(){
this._assert(!this._saveInProgress);
var _5f;
for(_5f in this._pending._modifiedItems){
var _60=this._pending._modifiedItems[_5f];
var _61=null;
if(this._itemsByIdentity){
_61=this._itemsByIdentity[_5f];
}else{
_61=this._arrayOfAllItems[_5f];
}
_60[this._storeRefPropName]=this;
for(var key in _61){
delete _61[key];
}
_1.mixin(_61,_60);
}
var _62;
for(_5f in this._pending._deletedItems){
_62=this._pending._deletedItems[_5f];
_62[this._storeRefPropName]=this;
var _63=_62[this._itemNumPropName];
if(_62["backup_"+this._reverseRefMap]){
_62[this._reverseRefMap]=_62["backup_"+this._reverseRefMap];
delete _62["backup_"+this._reverseRefMap];
}
this._arrayOfAllItems[_63]=_62;
if(this._itemsByIdentity){
this._itemsByIdentity[_5f]=_62;
}
if(_62[this._rootItemPropName]){
this._arrayOfTopLevelItems.push(_62);
}
}
for(_5f in this._pending._deletedItems){
_62=this._pending._deletedItems[_5f];
if(_62["backupRefs_"+this._reverseRefMap]){
_3.forEach(_62["backupRefs_"+this._reverseRefMap],function(_64){
var _65;
if(this._itemsByIdentity){
_65=this._itemsByIdentity[_64.id];
}else{
_65=this._arrayOfAllItems[_64.id];
}
this._addReferenceToMap(_65,_62,_64.attr);
},this);
delete _62["backupRefs_"+this._reverseRefMap];
}
}
for(_5f in this._pending._newItems){
var _66=this._pending._newItems[_5f];
_66[this._storeRefPropName]=null;
this._arrayOfAllItems[_66[this._itemNumPropName]]=null;
if(_66[this._rootItemPropName]){
this._removeArrayElement(this._arrayOfTopLevelItems,_66);
}
if(this._itemsByIdentity){
delete this._itemsByIdentity[_5f];
}
}
this._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};
return true;
},isDirty:function(_67){
if(_67){
var _68=this.getIdentity(_67);
return new Boolean(this._pending._newItems[_68]||this._pending._modifiedItems[_68]||this._pending._deletedItems[_68]).valueOf();
}else{
return !this._isEmpty(this._pending._newItems)||!this._isEmpty(this._pending._modifiedItems)||!this._isEmpty(this._pending._deletedItems);
}
},onSet:function(_69,_6a,_6b,_6c){
},onNew:function(_6d,_6e){
},onDelete:function(_6f){
},close:function(_70){
if(this.clearOnClose){
if(!this.isDirty()){
this.inherited(arguments);
}else{
throw new Error("dojo.data.ItemFileWriteStore: There are unsaved changes present in the store.  Please save or revert the changes before invoking close.");
}
}
}});
});
