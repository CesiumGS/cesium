//>>built
define("dijit/form/FilteringSelect",["dojo/_base/declare","dojo/_base/lang","dojo/when","./MappedTextBox","./ComboBoxMixin"],function(_1,_2,_3,_4,_5){
return _1("dijit.form.FilteringSelect",[_4,_5],{required:true,_lastDisplayedValue:"",_isValidSubset:function(){
return this._opened;
},isValid:function(){
return !!this.item||(!this.required&&this.get("displayedValue")=="");
},_refreshState:function(){
if(!this.searchTimer){
this.inherited(arguments);
}
},_callbackSetLabel:function(_6,_7,_8,_9){
if((_7&&_7[this.searchAttr]!==this._lastQuery)||(!_7&&_6.length&&this.store.getIdentity(_6[0])!=this._lastQuery)){
return;
}
if(!_6.length){
this.set("value","",_9||(_9===undefined&&!this.focused),this.textbox.value,null);
}else{
this.set("item",_6[0],_9);
}
},_openResultList:function(_a,_b,_c){
if(_b[this.searchAttr]!==this._lastQuery){
return;
}
this.inherited(arguments);
if(this.item===undefined){
this.validate(true);
}
},_getValueAttr:function(){
return this.valueNode.value;
},_getValueField:function(){
return "value";
},_setValueAttr:function(_d,_e,_f,_10){
if(!this._onChangeActive){
_e=null;
}
if(_10===undefined){
if(_d===null||_d===""){
_d="";
if(!_2.isString(_f)){
this._setDisplayedValueAttr(_f||"",_e);
return;
}
}
var _11=this;
this._lastQuery=_d;
_3(this.store.get(_d),function(_12){
_11._callbackSetLabel(_12?[_12]:[],undefined,undefined,_e);
});
}else{
this.valueNode.value=_d;
this.inherited(arguments);
}
},_setItemAttr:function(_13,_14,_15){
this.inherited(arguments);
this._lastDisplayedValue=this.textbox.value;
},_getDisplayQueryString:function(_16){
return _16.replace(/([\\\*\?])/g,"\\$1");
},_setDisplayedValueAttr:function(_17,_18){
if(_17==null){
_17="";
}
if(!this._created){
if(!("displayedValue" in this.params)){
return;
}
_18=false;
}
if(this.store){
this.closeDropDown();
var _19=_2.clone(this.query);
var qs=this._getDisplayQueryString(_17),q;
if(this.store._oldAPI){
q=qs;
}else{
q=this._patternToRegExp(qs);
q.toString=function(){
return qs;
};
}
this._lastQuery=_19[this.searchAttr]=q;
this.textbox.value=_17;
this._lastDisplayedValue=_17;
this._set("displayedValue",_17);
var _1a=this;
var _1b={queryOptions:{ignoreCase:this.ignoreCase,deep:true}};
_2.mixin(_1b,this.fetchProperties);
this._fetchHandle=this.store.query(_19,_1b);
_3(this._fetchHandle,function(_1c){
_1a._fetchHandle=null;
_1a._callbackSetLabel(_1c||[],_19,_1b,_18);
},function(err){
_1a._fetchHandle=null;
if(!_1a._cancelingQuery){
console.error("dijit.form.FilteringSelect: "+err.toString());
}
});
}
},undo:function(){
this.set("displayedValue",this._lastDisplayedValue);
}});
});
