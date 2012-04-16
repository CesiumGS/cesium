/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form._FormWidget"]){
dojo._hasResource["dijit.form._FormWidget"]=true;
dojo.provide("dijit.form._FormWidget");
dojo.require("dojo.window");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._CssStateMixin");
dojo.declare("dijit.form._FormWidget",[dijit._Widget,dijit._Templated,dijit._CssStateMixin],{name:"",alt:"",value:"",type:"text",tabIndex:"0",disabled:false,intermediateChanges:false,scrollOnFocus:true,attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{value:"focusNode",id:"focusNode",tabIndex:"focusNode",alt:"focusNode",title:"focusNode"}),postMixInProperties:function(){
this.nameAttrSetting=this.name?("name=\""+this.name.replace(/'/g,"&quot;")+"\""):"";
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
this.connect(this.domNode,"onmousedown","_onMouseDown");
},_setDisabledAttr:function(_1){
this._set("disabled",_1);
dojo.attr(this.focusNode,"disabled",_1);
if(this.valueNode){
dojo.attr(this.valueNode,"disabled",_1);
}
dijit.setWaiState(this.focusNode,"disabled",_1);
if(_1){
this._set("hovering",false);
this._set("active",false);
var _2="tabIndex" in this.attributeMap?this.attributeMap.tabIndex:"focusNode";
dojo.forEach(dojo.isArray(_2)?_2:[_2],function(_3){
var _4=this[_3];
if(dojo.isWebKit||dijit.hasDefaultTabStop(_4)){
_4.setAttribute("tabIndex","-1");
}else{
_4.removeAttribute("tabIndex");
}
},this);
}else{
if(this.tabIndex!=""){
this.focusNode.setAttribute("tabIndex",this.tabIndex);
}
}
},setDisabled:function(_5){
dojo.deprecated("setDisabled("+_5+") is deprecated. Use set('disabled',"+_5+") instead.","","2.0");
this.set("disabled",_5);
},_onFocus:function(e){
if(this.scrollOnFocus){
dojo.window.scrollIntoView(this.domNode);
}
this.inherited(arguments);
},isFocusable:function(){
return !this.disabled&&this.focusNode&&(dojo.style(this.domNode,"display")!="none");
},focus:function(){
if(!this.disabled){
dijit.focus(this.focusNode);
}
},compare:function(_6,_7){
if(typeof _6=="number"&&typeof _7=="number"){
return (isNaN(_6)&&isNaN(_7))?0:_6-_7;
}else{
if(_6>_7){
return 1;
}else{
if(_6<_7){
return -1;
}else{
return 0;
}
}
}
},onChange:function(_8){
},_onChangeActive:false,_handleOnChange:function(_9,_a){
if(this._lastValueReported==undefined&&(_a===null||!this._onChangeActive)){
this._resetValue=this._lastValueReported=_9;
}
this._pendingOnChange=this._pendingOnChange||(typeof _9!=typeof this._lastValueReported)||(this.compare(_9,this._lastValueReported)!=0);
if((this.intermediateChanges||_a||_a===undefined)&&this._pendingOnChange){
this._lastValueReported=_9;
this._pendingOnChange=false;
if(this._onChangeActive){
if(this._onChangeHandle){
clearTimeout(this._onChangeHandle);
}
this._onChangeHandle=setTimeout(dojo.hitch(this,function(){
this._onChangeHandle=null;
this.onChange(_9);
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
},setValue:function(_b){
dojo.deprecated("dijit.form._FormWidget:setValue("+_b+") is deprecated.  Use set('value',"+_b+") instead.","","2.0");
this.set("value",_b);
},getValue:function(){
dojo.deprecated(this.declaredClass+"::getValue() is deprecated. Use get('value') instead.","","2.0");
return this.get("value");
},_onMouseDown:function(e){
if(!e.ctrlKey&&dojo.mouseButtons.isLeft(e)&&this.isFocusable()){
var _c=this.connect(dojo.body(),"onmouseup",function(){
if(this.isFocusable()){
this.focus();
}
this.disconnect(_c);
});
}
}});
dojo.declare("dijit.form._FormValueWidget",dijit.form._FormWidget,{readOnly:false,attributeMap:dojo.delegate(dijit.form._FormWidget.prototype.attributeMap,{value:"",readOnly:"focusNode"}),_setReadOnlyAttr:function(_d){
dojo.attr(this.focusNode,"readOnly",_d);
dijit.setWaiState(this.focusNode,"readonly",_d);
this._set("readOnly",_d);
},postCreate:function(){
this.inherited(arguments);
if(dojo.isIE<9||(dojo.isIE&&dojo.isQuirks)){
this.connect(this.focusNode||this.domNode,"onkeydown",this._onKeyDown);
}
if(this._resetValue===undefined){
this._lastValueReported=this._resetValue=this.value;
}
},_setValueAttr:function(_e,_f){
this._handleOnChange(_e,_f);
},_handleOnChange:function(_10,_11){
this._set("value",_10);
this.inherited(arguments);
},undo:function(){
this._setValueAttr(this._lastValueReported,false);
},reset:function(){
this._hasBeenBlurred=false;
this._setValueAttr(this._resetValue,true);
},_onKeyDown:function(e){
if(e.keyCode==dojo.keys.ESCAPE&&!(e.ctrlKey||e.altKey||e.metaKey)){
var te;
if(dojo.isIE){
e.preventDefault();
te=document.createEventObject();
te.keyCode=dojo.keys.ESCAPE;
te.shiftKey=e.shiftKey;
e.srcElement.fireEvent("onkeypress",te);
}
}
},_layoutHackIE7:function(){
if(dojo.isIE==7){
var _12=this.domNode;
var _13=_12.parentNode;
var _14=_12.firstChild||_12;
var _15=_14.style.filter;
var _16=this;
while(_13&&_13.clientHeight==0){
(function ping(){
var _17=_16.connect(_13,"onscroll",function(e){
_16.disconnect(_17);
_14.style.filter=(new Date()).getMilliseconds();
setTimeout(function(){
_14.style.filter=_15;
},0);
});
})();
_13=_13.parentNode;
}
}
}});
}
