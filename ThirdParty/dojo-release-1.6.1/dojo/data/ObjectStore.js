/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.data.ObjectStore"]){
dojo._hasResource["dojo.data.ObjectStore"]=true;
dojo.provide("dojo.data.ObjectStore");
dojo.require("dojo.regexp");
dojo.declare("dojo.data.ObjectStore",null,{objectStore:null,constructor:function(_1){
dojo.mixin(this,_1);
},labelProperty:"label",getValue:function(_2,_3,_4){
return typeof _2.get==="function"?_2.get(_3):_3 in _2?_2[_3]:_4;
},getValues:function(_5,_6){
var _7=this.getValue(_5,_6);
return _7 instanceof Array?_7:_7===undefined?[]:[_7];
},getAttributes:function(_8){
var _9=[];
for(var i in _8){
if(_8.hasOwnProperty(i)&&!(i.charAt(0)=="_"&&i.charAt(1)=="_")){
_9.push(i);
}
}
return _9;
},hasAttribute:function(_a,_b){
return _b in _a;
},containsValue:function(_c,_d,_e){
return dojo.indexOf(this.getValues(_c,_d),_e)>-1;
},isItem:function(_f){
return (typeof _f=="object")&&_f&&!(_f instanceof Date);
},isItemLoaded:function(_10){
return _10&&typeof _10.load!=="function";
},loadItem:function(_11){
var _12;
if(typeof _11.item.load==="function"){
dojo.when(_11.item.load(),function(_13){
_12=_13;
var _14=_13 instanceof Error?_11.onError:_11.onItem;
if(_14){
_14.call(_11.scope,_13);
}
});
}else{
if(_11.onItem){
_11.onItem.call(_11.scope,_11.item);
}
}
return _12;
},close:function(_15){
return _15&&_15.abort&&_15.abort();
},fetch:function(_16){
_16=_16||{};
var _17=this;
var _18=_16.scope||_17;
var _19=_16.query;
if(typeof _19=="object"){
_19=dojo.delegate(_19);
for(var i in _19){
var _1a=_19[i];
if(typeof _1a=="string"){
_19[i]=RegExp("^"+dojo.regexp.escapeString(_1a,"*?").replace(/\*/g,".*").replace(/\?/g,".")+"$",_16.queryOptions&&_16.queryOptions.ignoreCase?"mi":"m");
_19[i].toString=(function(_1b){
return function(){
return _1b;
};
})(_1a);
}
}
}
var _1c=this.objectStore.query(_19,_16);
dojo.when(_1c.total,function(_1d){
dojo.when(_1c,function(_1e){
if(_16.onBegin){
_16.onBegin.call(_18,_1d||_1e.length,_16);
}
if(_16.onItem){
for(var i=0;i<_1e.length;i++){
_16.onItem.call(_18,_1e[i],_16);
}
}
if(_16.onComplete){
_16.onComplete.call(_18,_16.onItem?null:_1e,_16);
}
return _1e;
},_1f);
},_1f);
function _1f(_20){
if(_16.onError){
_16.onError.call(_18,_20,_16);
}
};
_16.abort=function(){
if(_1c.cancel){
_1c.cancel();
}
};
_16.store=this;
return _16;
},getFeatures:function(){
return {"dojo.data.api.Read":!!this.objectStore.get,"dojo.data.api.Identity":true,"dojo.data.api.Write":!!this.objectStore.put,"dojo.data.api.Notification":true};
},getLabel:function(_21){
if(this.isItem(_21)){
return this.getValue(_21,this.labelProperty);
}
return undefined;
},getLabelAttributes:function(_22){
return [this.labelProperty];
},getIdentity:function(_23){
return _23.getId?_23.getId():_23[this.objectStore.idProperty||"id"];
},getIdentityAttributes:function(_24){
return [this.objectStore.idProperty];
},fetchItemByIdentity:function(_25){
var _26;
dojo.when(this.objectStore.get(_25.identity),function(_27){
_26=_27;
_25.onItem.call(_25.scope,_27);
},function(_28){
_25.onError.call(_25.scope,_28);
});
return _26;
},newItem:function(_29,_2a){
if(_2a){
var _2b=this.getValue(_2a.parent,_2a.attribute,[]);
_2b=_2b.concat([_29]);
_29.__parent=_2b;
this.setValue(_2a.parent,_2a.attribute,_2b);
}
this._dirtyObjects.push({object:_29,save:true});
this.onNew(_29);
return _29;
},deleteItem:function(_2c){
this.changing(_2c,true);
this.onDelete(_2c);
},setValue:function(_2d,_2e,_2f){
var old=_2d[_2e];
this.changing(_2d);
_2d[_2e]=_2f;
this.onSet(_2d,_2e,old,_2f);
},setValues:function(_30,_31,_32){
if(!dojo.isArray(_32)){
throw new Error("setValues expects to be passed an Array object as its value");
}
this.setValue(_30,_31,_32);
},unsetAttribute:function(_33,_34){
this.changing(_33);
var old=_33[_34];
delete _33[_34];
this.onSet(_33,_34,old,undefined);
},_dirtyObjects:[],changing:function(_35,_36){
_35.__isDirty=true;
for(var i=0;i<this._dirtyObjects.length;i++){
var _37=this._dirtyObjects[i];
if(_35==_37.object){
if(_36){
_37.object=false;
if(!this._saveNotNeeded){
_37.save=true;
}
}
return;
}
}
var old=_35 instanceof Array?[]:{};
for(i in _35){
if(_35.hasOwnProperty(i)){
old[i]=_35[i];
}
}
this._dirtyObjects.push({object:!_36&&_35,old:old,save:!this._saveNotNeeded});
},save:function(_38){
_38=_38||{};
var _39,_3a=[];
var _3b={};
var _3c=[];
var _3d;
var _3e=this._dirtyObjects;
var _3f=_3e.length;
try{
dojo.connect(_38,"onError",function(){
if(_38.revertOnError!==false){
var _40=_3e;
_3e=_3c;
var _41=0;
jr.revert();
_3d._dirtyObjects=_40;
}else{
_3d._dirtyObjects=dirtyObject.concat(_3c);
}
});
if(this.objectStore.transaction){
var _42=this.objectStore.transaction();
}
for(var i=0;i<_3e.length;i++){
var _43=_3e[i];
var _44=_43.object;
var old=_43.old;
delete _44.__isDirty;
if(_44){
_39=this.objectStore.put(_44,{overwrite:!!old});
}else{
_39=this.objectStore.remove(this.getIdentity(old));
}
_3c.push(_43);
_3e.splice(i--,1);
dojo.when(_39,function(_45){
if(!(--_3f)){
if(_38.onComplete){
_38.onComplete.call(_38.scope,_3a);
}
}
},function(_46){
_3f=-1;
_38.onError.call(_38.scope,_46);
});
}
if(_42){
_42.commit();
}
}
catch(e){
_38.onError.call(_38.scope,value);
}
},revert:function(_47){
var _48=this._dirtyObjects;
for(var i=_48.length;i>0;){
i--;
var _49=_48[i];
var _4a=_49.object;
var old=_49.old;
if(_4a&&old){
for(var j in old){
if(old.hasOwnProperty(j)&&_4a[j]!==old[j]){
this.onSet(_4a,j,_4a[j],old[j]);
_4a[j]=old[j];
}
}
for(j in _4a){
if(!old.hasOwnProperty(j)){
this.onSet(_4a,j,_4a[j]);
delete _4a[j];
}
}
}else{
if(!old){
this.onDelete(_4a);
}else{
this.onNew(old);
}
}
delete (_4a||old).__isDirty;
_48.splice(i,1);
}
},isDirty:function(_4b){
if(!_4b){
return !!this._dirtyObjects.length;
}
return _4b.__isDirty;
},onSet:function(){
},onNew:function(){
},onDelete:function(){
}});
}
