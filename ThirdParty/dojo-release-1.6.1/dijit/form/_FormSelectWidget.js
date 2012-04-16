/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form._FormSelectWidget"]){
dojo._hasResource["dijit.form._FormSelectWidget"]=true;
dojo.provide("dijit.form._FormSelectWidget");
dojo.require("dijit.form._FormWidget");
dojo.require("dojo.data.util.sorter");
dojo.declare("dijit.form._FormSelectWidget",dijit.form._FormValueWidget,{multiple:false,options:null,store:null,query:null,queryOptions:null,onFetch:null,sortByLabel:true,loadChildrenOnOpen:false,getOptions:function(_1){
var _2=_1,_3=this.options||[],l=_3.length;
if(_2===undefined){
return _3;
}
if(dojo.isArray(_2)){
return dojo.map(_2,"return this.getOptions(item);",this);
}
if(dojo.isObject(_1)){
if(!dojo.some(this.options,function(o,_4){
if(o===_2||(o.value&&o.value===_2.value)){
_2=_4;
return true;
}
return false;
})){
_2=-1;
}
}
if(typeof _2=="string"){
for(var i=0;i<l;i++){
if(_3[i].value===_2){
_2=i;
break;
}
}
}
if(typeof _2=="number"&&_2>=0&&_2<l){
return this.options[_2];
}
return null;
},addOption:function(_5){
if(!dojo.isArray(_5)){
_5=[_5];
}
dojo.forEach(_5,function(i){
if(i&&dojo.isObject(i)){
this.options.push(i);
}
},this);
this._loadChildren();
},removeOption:function(_6){
if(!dojo.isArray(_6)){
_6=[_6];
}
var _7=this.getOptions(_6);
dojo.forEach(_7,function(i){
if(i){
this.options=dojo.filter(this.options,function(_8,_9){
return (_8.value!==i.value||_8.label!==i.label);
});
this._removeOptionItem(i);
}
},this);
this._loadChildren();
},updateOption:function(_a){
if(!dojo.isArray(_a)){
_a=[_a];
}
dojo.forEach(_a,function(i){
var _b=this.getOptions(i),k;
if(_b){
for(k in i){
_b[k]=i[k];
}
}
},this);
this._loadChildren();
},setStore:function(_c,_d,_e){
var _f=this.store;
_e=_e||{};
if(_f!==_c){
dojo.forEach(this._notifyConnections||[],dojo.disconnect);
delete this._notifyConnections;
if(_c&&_c.getFeatures()["dojo.data.api.Notification"]){
this._notifyConnections=[dojo.connect(_c,"onNew",this,"_onNewItem"),dojo.connect(_c,"onDelete",this,"_onDeleteItem"),dojo.connect(_c,"onSet",this,"_onSetItem")];
}
this._set("store",_c);
}
this._onChangeActive=false;
if(this.options&&this.options.length){
this.removeOption(this.options);
}
if(_c){
this._loadingStore=true;
_c.fetch(dojo.delegate(_e,{onComplete:function(_10,_11){
if(this.sortByLabel&&!_e.sort&&_10.length){
_10.sort(dojo.data.util.sorter.createSortFunction([{attribute:_c.getLabelAttributes(_10[0])[0]}],_c));
}
if(_e.onFetch){
_10=_e.onFetch.call(this,_10,_11);
}
dojo.forEach(_10,function(i){
this._addOptionForItem(i);
},this);
this._loadingStore=false;
this.set("value","_pendingValue" in this?this._pendingValue:_d);
delete this._pendingValue;
if(!this.loadChildrenOnOpen){
this._loadChildren();
}else{
this._pseudoLoadChildren(_10);
}
this._fetchedWith=_11;
this._lastValueReported=this.multiple?[]:null;
this._onChangeActive=true;
this.onSetStore();
this._handleOnChange(this.value);
},scope:this}));
}else{
delete this._fetchedWith;
}
return _f;
},_setValueAttr:function(_12,_13){
if(this._loadingStore){
this._pendingValue=_12;
return;
}
var _14=this.getOptions()||[];
if(!dojo.isArray(_12)){
_12=[_12];
}
dojo.forEach(_12,function(i,idx){
if(!dojo.isObject(i)){
i=i+"";
}
if(typeof i==="string"){
_12[idx]=dojo.filter(_14,function(_15){
return _15.value===i;
})[0]||{value:"",label:""};
}
},this);
_12=dojo.filter(_12,function(i){
return i&&i.value;
});
if(!this.multiple&&(!_12[0]||!_12[0].value)&&_14.length){
_12[0]=_14[0];
}
dojo.forEach(_14,function(i){
i.selected=dojo.some(_12,function(v){
return v.value===i.value;
});
});
var val=dojo.map(_12,function(i){
return i.value;
}),_16=dojo.map(_12,function(i){
return i.label;
});
this._set("value",this.multiple?val:val[0]);
this._setDisplay(this.multiple?_16:_16[0]);
this._updateSelection();
this._handleOnChange(this.value,_13);
},_getDisplayedValueAttr:function(){
var val=this.get("value");
if(!dojo.isArray(val)){
val=[val];
}
var ret=dojo.map(this.getOptions(val),function(v){
if(v&&"label" in v){
return v.label;
}else{
if(v){
return v.value;
}
}
return null;
},this);
return this.multiple?ret:ret[0];
},_loadChildren:function(){
if(this._loadingStore){
return;
}
dojo.forEach(this._getChildren(),function(_17){
_17.destroyRecursive();
});
dojo.forEach(this.options,this._addOptionItem,this);
this._updateSelection();
},_updateSelection:function(){
this._set("value",this._getValueFromOpts());
var val=this.value;
if(!dojo.isArray(val)){
val=[val];
}
if(val&&val[0]){
dojo.forEach(this._getChildren(),function(_18){
var _19=dojo.some(val,function(v){
return _18.option&&(v===_18.option.value);
});
dojo.toggleClass(_18.domNode,this.baseClass+"SelectedOption",_19);
dijit.setWaiState(_18.domNode,"selected",_19);
},this);
}
},_getValueFromOpts:function(){
var _1a=this.getOptions()||[];
if(!this.multiple&&_1a.length){
var opt=dojo.filter(_1a,function(i){
return i.selected;
})[0];
if(opt&&opt.value){
return opt.value;
}else{
_1a[0].selected=true;
return _1a[0].value;
}
}else{
if(this.multiple){
return dojo.map(dojo.filter(_1a,function(i){
return i.selected;
}),function(i){
return i.value;
})||[];
}
}
return "";
},_onNewItem:function(_1b,_1c){
if(!_1c||!_1c.parent){
this._addOptionForItem(_1b);
}
},_onDeleteItem:function(_1d){
var _1e=this.store;
this.removeOption(_1e.getIdentity(_1d));
},_onSetItem:function(_1f){
this.updateOption(this._getOptionObjForItem(_1f));
},_getOptionObjForItem:function(_20){
var _21=this.store,_22=_21.getLabel(_20),_23=(_22?_21.getIdentity(_20):null);
return {value:_23,label:_22,item:_20};
},_addOptionForItem:function(_24){
var _25=this.store;
if(!_25.isItemLoaded(_24)){
_25.loadItem({item:_24,onComplete:function(i){
this._addOptionForItem(_24);
},scope:this});
return;
}
var _26=this._getOptionObjForItem(_24);
this.addOption(_26);
},constructor:function(_27){
this._oValue=(_27||{}).value||null;
},buildRendering:function(){
this.inherited(arguments);
dojo.setSelectable(this.focusNode,false);
},_fillContent:function(){
var _28=this.options;
if(!_28){
_28=this.options=this.srcNodeRef?dojo.query(">",this.srcNodeRef).map(function(_29){
if(_29.getAttribute("type")==="separator"){
return {value:"",label:"",selected:false,disabled:false};
}
return {value:(_29.getAttribute("data-"+dojo._scopeName+"-value")||_29.getAttribute("value")),label:String(_29.innerHTML),selected:_29.getAttribute("selected")||false,disabled:_29.getAttribute("disabled")||false};
},this):[];
}
if(!this.value){
this._set("value",this._getValueFromOpts());
}else{
if(this.multiple&&typeof this.value=="string"){
this_set("value",this.value.split(","));
}
}
},postCreate:function(){
this.inherited(arguments);
this.connect(this,"onChange","_updateSelection");
this.connect(this,"startup","_loadChildren");
this._setValueAttr(this.value,null);
},startup:function(){
this.inherited(arguments);
var _2a=this.store,_2b={};
dojo.forEach(["query","queryOptions","onFetch"],function(i){
if(this[i]){
_2b[i]=this[i];
}
delete this[i];
},this);
if(_2a&&_2a.getFeatures()["dojo.data.api.Identity"]){
this.store=null;
this.setStore(_2a,this._oValue,_2b);
}
},destroy:function(){
dojo.forEach(this._notifyConnections||[],dojo.disconnect);
this.inherited(arguments);
},_addOptionItem:function(_2c){
},_removeOptionItem:function(_2d){
},_setDisplay:function(_2e){
},_getChildren:function(){
return [];
},_getSelectedOptionsAttr:function(){
return this.getOptions(this.get("value"));
},_pseudoLoadChildren:function(_2f){
},onSetStore:function(){
}});
}
