/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app._FormWidget"]){
dojo._hasResource["dojox.mobile.app._FormWidget"]=true;
dojo.provide("dojox.mobile.app._FormWidget");
dojo.experimental("dojox.mobile.app._FormWidget");
dojo.require("dojo.window");
dojo.require("dijit._WidgetBase");
dojo.declare("dojox.mobile.app._FormWidget",dijit._WidgetBase,{name:"",alt:"",value:"",type:"text",disabled:false,intermediateChanges:false,scrollOnFocus:false,attributeMap:dojo.delegate(dijit._WidgetBase.prototype.attributeMap,{value:"focusNode",id:"focusNode",alt:"focusNode",title:"focusNode"}),postMixInProperties:function(){
this.nameAttrSetting=this.name?("name=\""+this.name.replace(/'/g,"&quot;")+"\""):"";
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
this.connect(this.domNode,"onmousedown","_onMouseDown");
},_setDisabledAttr:function(_1){
this.disabled=_1;
dojo.attr(this.focusNode,"disabled",_1);
if(this.valueNode){
dojo.attr(this.valueNode,"disabled",_1);
}
},_onFocus:function(e){
if(this.scrollOnFocus){
dojo.window.scrollIntoView(this.domNode);
}
this.inherited(arguments);
},isFocusable:function(){
return !this.disabled&&!this.readOnly&&this.focusNode&&(dojo.style(this.domNode,"display")!="none");
},focus:function(){
this.focusNode.focus();
},compare:function(_2,_3){
if(typeof _2=="number"&&typeof _3=="number"){
return (isNaN(_2)&&isNaN(_3))?0:_2-_3;
}else{
if(_2>_3){
return 1;
}else{
if(_2<_3){
return -1;
}else{
return 0;
}
}
}
},onChange:function(_4){
},_onChangeActive:false,_handleOnChange:function(_5,_6){
this._lastValue=_5;
if(this._lastValueReported==undefined&&(_6===null||!this._onChangeActive)){
this._resetValue=this._lastValueReported=_5;
}
if((this.intermediateChanges||_6||_6===undefined)&&((typeof _5!=typeof this._lastValueReported)||this.compare(_5,this._lastValueReported)!=0)){
this._lastValueReported=_5;
if(this._onChangeActive){
if(this._onChangeHandle){
clearTimeout(this._onChangeHandle);
}
this._onChangeHandle=setTimeout(dojo.hitch(this,function(){
this._onChangeHandle=null;
this.onChange(_5);
}),0);
}
}
},create:function(){
this.inherited(arguments);
this._onChangeActive=true;
},destroy:function(){
if(this._onChangeHandle){
clearTimeout(this._onChangeHandle);
this.onChange(this._lastValueReported);
}
this.inherited(arguments);
},_onMouseDown:function(e){
if(this.isFocusable()){
var _7=this.connect(dojo.body(),"onmouseup",function(){
if(this.isFocusable()){
this.focus();
}
this.disconnect(_7);
});
}
},selectInputText:function(_8,_9,_a){
var _b=dojo.global;
var _c=dojo.doc;
_8=dojo.byId(_8);
if(isNaN(_9)){
_9=0;
}
if(isNaN(_a)){
_a=_8.value?_8.value.length:0;
}
dijit.focus(_8);
if(_b["getSelection"]&&_8.setSelectionRange){
_8.setSelectionRange(_9,_a);
}
}});
dojo.declare("dojox.mobile.app._FormValueWidget",dojox.mobile.app._FormWidget,{readOnly:false,attributeMap:dojo.delegate(dojox.mobile.app._FormWidget.prototype.attributeMap,{value:"",readOnly:"focusNode"}),_setReadOnlyAttr:function(_d){
this.readOnly=_d;
dojo.attr(this.focusNode,"readOnly",_d);
},postCreate:function(){
this.inherited(arguments);
if(this._resetValue===undefined){
this._resetValue=this.value;
}
},_setValueAttr:function(_e,_f){
this.value=_e;
this._handleOnChange(_e,_f);
},_getValueAttr:function(){
return this._lastValue;
},undo:function(){
this._setValueAttr(this._lastValueReported,false);
},reset:function(){
this._hasBeenBlurred=false;
this._setValueAttr(this._resetValue,true);
}});
}
