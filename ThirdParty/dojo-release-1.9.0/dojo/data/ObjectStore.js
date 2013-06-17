/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/ObjectStore",["../_base/lang","../Evented","../_base/declare","../_base/Deferred","../_base/array","../_base/connect","../regexp"],function(_1,_2,_3,_4,_5,_6,_7){
function _8(_9){
return _9=="*"?".*":_9=="?"?".":_9;
};
return _3("dojo.data.ObjectStore",[_2],{objectStore:null,constructor:function(_a){
this._dirtyObjects=[];
if(_a.labelAttribute){
_a.labelProperty=_a.labelAttribute;
}
_1.mixin(this,_a);
},labelProperty:"label",getValue:function(_b,_c,_d){
return typeof _b.get==="function"?_b.get(_c):_c in _b?_b[_c]:_d;
},getValues:function(_e,_f){
var val=this.getValue(_e,_f);
return val instanceof Array?val:val===undefined?[]:[val];
},getAttributes:function(_10){
var res=[];
for(var i in _10){
if(_10.hasOwnProperty(i)&&!(i.charAt(0)=="_"&&i.charAt(1)=="_")){
res.push(i);
}
}
return res;
},hasAttribute:function(_11,_12){
return _12 in _11;
},containsValue:function(_13,_14,_15){
return _5.indexOf(this.getValues(_13,_14),_15)>-1;
},isItem:function(_16){
return (typeof _16=="object")&&_16&&!(_16 instanceof Date);
},isItemLoaded:function(_17){
return _17&&typeof _17.load!=="function";
},loadItem:function(_18){
var _19;
if(typeof _18.item.load==="function"){
_4.when(_18.item.load(),function(_1a){
_19=_1a;
var _1b=_1a instanceof Error?_18.onError:_18.onItem;
if(_1b){
_1b.call(_18.scope,_1a);
}
});
}else{
if(_18.onItem){
_18.onItem.call(_18.scope,_18.item);
}
}
return _19;
},close:function(_1c){
return _1c&&_1c.abort&&_1c.abort();
},fetch:function(_1d){
_1d=_1.delegate(_1d,_1d&&_1d.queryOptions);
var _1e=this;
var _1f=_1d.scope||_1e;
var _20=_1d.query;
if(typeof _20=="object"){
_20=_1.delegate(_20);
for(var i in _20){
var _21=_20[i];
if(typeof _21=="string"){
_20[i]=RegExp("^"+_7.escapeString(_21,"*?\\").replace(/\\.|\*|\?/g,_8)+"$",_1d.ignoreCase?"mi":"m");
_20[i].toString=(function(_22){
return function(){
return _22;
};
})(_21);
}
}
}
var _23=this.objectStore.query(_20,_1d);
_4.when(_23.total,function(_24){
_4.when(_23,function(_25){
if(_1d.onBegin){
_1d.onBegin.call(_1f,_24||_25.length,_1d);
}
if(_1d.onItem){
for(var i=0;i<_25.length;i++){
_1d.onItem.call(_1f,_25[i],_1d);
}
}
if(_1d.onComplete){
_1d.onComplete.call(_1f,_1d.onItem?null:_25,_1d);
}
return _25;
},_26);
},_26);
function _26(_27){
if(_1d.onError){
_1d.onError.call(_1f,_27,_1d);
}
};
_1d.abort=function(){
if(_23.cancel){
_23.cancel();
}
};
if(_23.observe){
if(this.observing){
this.observing.cancel();
}
this.observing=_23.observe(function(_28,_29,_2a){
if(_5.indexOf(_1e._dirtyObjects,_28)==-1){
if(_29==-1){
_1e.onNew(_28);
}else{
if(_2a==-1){
_1e.onDelete(_28);
}else{
for(var i in _28){
if(i!=_1e.objectStore.idProperty){
_1e.onSet(_28,i,null,_28[i]);
}
}
}
}
}
},true);
}
this.onFetch(_23);
_1d.store=this;
return _1d;
},getFeatures:function(){
return {"dojo.data.api.Read":!!this.objectStore.get,"dojo.data.api.Identity":true,"dojo.data.api.Write":!!this.objectStore.put,"dojo.data.api.Notification":true};
},getLabel:function(_2b){
if(this.isItem(_2b)){
return this.getValue(_2b,this.labelProperty);
}
return undefined;
},getLabelAttributes:function(_2c){
return [this.labelProperty];
},getIdentity:function(_2d){
return this.objectStore.getIdentity?this.objectStore.getIdentity(_2d):_2d[this.objectStore.idProperty||"id"];
},getIdentityAttributes:function(_2e){
return [this.objectStore.idProperty];
},fetchItemByIdentity:function(_2f){
var _30;
_4.when(this.objectStore.get(_2f.identity),function(_31){
_30=_31;
_2f.onItem.call(_2f.scope,_31);
},function(_32){
_2f.onError.call(_2f.scope,_32);
});
return _30;
},newItem:function(_33,_34){
if(_34){
var _35=this.getValue(_34.parent,_34.attribute,[]);
_35=_35.concat([_33]);
_33.__parent=_35;
this.setValue(_34.parent,_34.attribute,_35);
}
this._dirtyObjects.push({object:_33,save:true});
this.onNew(_33);
return _33;
},deleteItem:function(_36){
this.changing(_36,true);
this.onDelete(_36);
},setValue:function(_37,_38,_39){
var old=_37[_38];
this.changing(_37);
_37[_38]=_39;
this.onSet(_37,_38,old,_39);
},setValues:function(_3a,_3b,_3c){
if(!_1.isArray(_3c)){
throw new Error("setValues expects to be passed an Array object as its value");
}
this.setValue(_3a,_3b,_3c);
},unsetAttribute:function(_3d,_3e){
this.changing(_3d);
var old=_3d[_3e];
delete _3d[_3e];
this.onSet(_3d,_3e,old,undefined);
},changing:function(_3f,_40){
_3f.__isDirty=true;
for(var i=0;i<this._dirtyObjects.length;i++){
var _41=this._dirtyObjects[i];
if(_3f==_41.object){
if(_40){
_41.object=false;
if(!this._saveNotNeeded){
_41.save=true;
}
}
return;
}
}
var old=_3f instanceof Array?[]:{};
for(i in _3f){
if(_3f.hasOwnProperty(i)){
old[i]=_3f[i];
}
}
this._dirtyObjects.push({object:!_40&&_3f,old:old,save:!this._saveNotNeeded});
},save:function(_42){
_42=_42||{};
var _43,_44=[];
var _45=[];
var _46=this;
var _47=this._dirtyObjects;
var _48=_47.length;
try{
_6.connect(_42,"onError",function(){
if(_42.revertOnError!==false){
var _49=_47;
_47=_45;
_46.revert();
_46._dirtyObjects=_49;
}else{
_46._dirtyObjects=_47.concat(_45);
}
});
if(this.objectStore.transaction){
var _4a=this.objectStore.transaction();
}
for(var i=0;i<_47.length;i++){
var _4b=_47[i];
var _4c=_4b.object;
var old=_4b.old;
delete _4c.__isDirty;
if(_4c){
_43=this.objectStore.put(_4c,{overwrite:!!old});
}else{
if(typeof old!="undefined"){
_43=this.objectStore.remove(this.getIdentity(old));
}
}
_45.push(_4b);
_47.splice(i--,1);
_4.when(_43,function(_4d){
if(!(--_48)){
if(_42.onComplete){
_42.onComplete.call(_42.scope,_44);
}
}
},function(_4e){
_48=-1;
_42.onError.call(_42.scope,_4e);
});
}
if(_4a){
_4a.commit();
}
}
catch(e){
_42.onError.call(_42.scope,value);
}
},revert:function(){
var _4f=this._dirtyObjects;
for(var i=_4f.length;i>0;){
i--;
var _50=_4f[i];
var _51=_50.object;
var old=_50.old;
if(_51&&old){
for(var j in old){
if(old.hasOwnProperty(j)&&_51[j]!==old[j]){
this.onSet(_51,j,_51[j],old[j]);
_51[j]=old[j];
}
}
for(j in _51){
if(!old.hasOwnProperty(j)){
this.onSet(_51,j,_51[j]);
delete _51[j];
}
}
}else{
if(!old){
this.onDelete(_51);
}else{
this.onNew(old);
}
}
delete (_51||old).__isDirty;
_4f.splice(i,1);
}
},isDirty:function(_52){
if(!_52){
return !!this._dirtyObjects.length;
}
return _52.__isDirty;
},onSet:function(){
},onNew:function(){
},onDelete:function(){
},onFetch:function(_53){
}});
});
