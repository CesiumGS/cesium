/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.NumberTextBox"]){
dojo._hasResource["dijit.form.NumberTextBox"]=true;
dojo.provide("dijit.form.NumberTextBox");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dojo.number");
dojo.declare("dijit.form.NumberTextBoxMixin",null,{regExpGen:dojo.number.regexp,value:NaN,editOptions:{pattern:"#.######"},_formatter:dojo.number.format,_setConstraintsAttr:function(_1){
var _2=typeof _1.places=="number"?_1.places:0;
if(_2){
_2++;
}
if(typeof _1.max!="number"){
_1.max=9*Math.pow(10,15-_2);
}
if(typeof _1.min!="number"){
_1.min=-9*Math.pow(10,15-_2);
}
this.inherited(arguments,[_1]);
if(this.focusNode&&this.focusNode.value&&!isNaN(this.value)){
this.set("value",this.value);
}
},_onFocus:function(){
if(this.disabled){
return;
}
var _3=this.get("value");
if(typeof _3=="number"&&!isNaN(_3)){
var _4=this.format(_3,this.constraints);
if(_4!==undefined){
this.textbox.value=_4;
}
}
this.inherited(arguments);
},format:function(_5,_6){
var _7=String(_5);
if(typeof _5!="number"){
return _7;
}
if(isNaN(_5)){
return "";
}
if(!("rangeCheck" in this&&this.rangeCheck(_5,_6))&&_6.exponent!==false&&/\de[-+]?\d/i.test(_7)){
return _7;
}
if(this.editOptions&&this._focused){
_6=dojo.mixin({},_6,this.editOptions);
}
return this._formatter(_5,_6);
},_parser:dojo.number.parse,parse:function(_8,_9){
var v=this._parser(_8,dojo.mixin({},_9,(this.editOptions&&this._focused)?this.editOptions:{}));
if(this.editOptions&&this._focused&&isNaN(v)){
v=this._parser(_8,_9);
}
return v;
},_getDisplayedValueAttr:function(){
var v=this.inherited(arguments);
return isNaN(v)?this.textbox.value:v;
},filter:function(_a){
return (_a===null||_a===""||_a===undefined)?NaN:this.inherited(arguments);
},serialize:function(_b,_c){
return (typeof _b!="number"||isNaN(_b))?"":this.inherited(arguments);
},_setBlurValue:function(){
var _d=dojo.hitch(dojo.mixin({},this,{_focused:true}),"get")("value");
this._setValueAttr(_d,true);
},_setValueAttr:function(_e,_f,_10){
if(_e!==undefined&&_10===undefined){
_10=String(_e);
if(typeof _e=="number"){
if(isNaN(_e)){
_10="";
}else{
if(("rangeCheck" in this&&this.rangeCheck(_e,this.constraints))||this.constraints.exponent===false||!/\de[-+]?\d/i.test(_10)){
_10=undefined;
}
}
}else{
if(!_e){
_10="";
_e=NaN;
}else{
_e=undefined;
}
}
}
this.inherited(arguments,[_e,_f,_10]);
},_getValueAttr:function(){
var v=this.inherited(arguments);
if(isNaN(v)&&this.textbox.value!==""){
if(this.constraints.exponent!==false&&/\de[-+]?\d/i.test(this.textbox.value)&&(new RegExp("^"+dojo.number._realNumberRegexp(dojo.mixin({},this.constraints))+"$").test(this.textbox.value))){
var n=Number(this.textbox.value);
return isNaN(n)?undefined:n;
}else{
return undefined;
}
}else{
return v;
}
},isValid:function(_11){
if(!this._focused||this._isEmpty(this.textbox.value)){
return this.inherited(arguments);
}else{
var v=this.get("value");
if(!isNaN(v)&&this.rangeCheck(v,this.constraints)){
if(this.constraints.exponent!==false&&/\de[-+]?\d/i.test(this.textbox.value)){
return true;
}else{
return this.inherited(arguments);
}
}else{
return false;
}
}
}});
dojo.declare("dijit.form.NumberTextBox",[dijit.form.RangeBoundTextBox,dijit.form.NumberTextBoxMixin],{baseClass:"dijitTextBox dijitNumberTextBox"});
}
