/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.FilteringSelect"]){
dojo._hasResource["dijit.form.FilteringSelect"]=true;
dojo.provide("dijit.form.FilteringSelect");
dojo.require("dijit.form.ComboBox");
dojo.declare("dijit.form.FilteringSelect",[dijit.form.MappedTextBox,dijit.form.ComboBoxMixin],{required:true,_lastDisplayedValue:"",_isValidSubset:function(){
return this._opened;
},isValid:function(){
return this.item||(!this.required&&this.get("displayedValue")=="");
},_refreshState:function(){
if(!this.searchTimer){
this.inherited(arguments);
}
},_callbackSetLabel:function(_1,_2,_3){
if((_2&&_2.query[this.searchAttr]!=this._lastQuery)||(!_2&&_1.length&&this.store.getIdentity(_1[0])!=this._lastQuery)){
return;
}
if(!_1.length){
this.valueNode.value="";
dijit.form.TextBox.superclass._setValueAttr.call(this,"",_3||(_3===undefined&&!this._focused));
this._set("item",null);
this.validate(this._focused);
}else{
this.set("item",_1[0],_3);
}
},_openResultList:function(_4,_5){
if(_5.query[this.searchAttr]!=this._lastQuery){
return;
}
dijit.form.ComboBoxMixin.prototype._openResultList.apply(this,arguments);
if(this.item===undefined){
this.validate(true);
}
},_getValueAttr:function(){
return this.valueNode.value;
},_getValueField:function(){
return "value";
},_setValueAttr:function(_6,_7){
if(!this._onChangeActive){
_7=null;
}
this._lastQuery=_6;
if(_6===null||_6===""){
this._setDisplayedValueAttr("",_7);
return;
}
var _8=this;
this.store.fetchItemByIdentity({identity:_6,onItem:function(_9){
_8._callbackSetLabel(_9?[_9]:[],undefined,_7);
}});
},_setItemAttr:function(_a,_b,_c){
this.inherited(arguments);
this.valueNode.value=this.value;
this._lastDisplayedValue=this.textbox.value;
},_getDisplayQueryString:function(_d){
return _d.replace(/([\\\*\?])/g,"\\$1");
},_setDisplayedValueAttr:function(_e,_f){
if(_e==null){
_e="";
}
if(!this._created){
if(!("displayedValue" in this.params)){
return;
}
_f=false;
}
if(this.store){
this.closeDropDown();
var _10=dojo.clone(this.query);
this._lastQuery=_10[this.searchAttr]=this._getDisplayQueryString(_e);
this.textbox.value=_e;
this._lastDisplayedValue=_e;
this._set("displayedValue",_e);
var _11=this;
var _12={query:_10,queryOptions:{ignoreCase:this.ignoreCase,deep:true},onComplete:function(_13,_14){
_11._fetchHandle=null;
dojo.hitch(_11,"_callbackSetLabel")(_13,_14,_f);
},onError:function(_15){
_11._fetchHandle=null;
console.error("dijit.form.FilteringSelect: "+_15);
dojo.hitch(_11,"_callbackSetLabel")([],undefined,false);
}};
dojo.mixin(_12,this.fetchProperties);
this._fetchHandle=this.store.fetch(_12);
}
},undo:function(){
this.set("displayedValue",this._lastDisplayedValue);
}});
}
