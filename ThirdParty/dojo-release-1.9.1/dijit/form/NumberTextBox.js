//>>built
define("dijit/form/NumberTextBox",["dojo/_base/declare","dojo/_base/lang","dojo/number","./RangeBoundTextBox"],function(_1,_2,_3,_4){
var _5=_1("dijit.form.NumberTextBoxMixin",null,{pattern:function(_6){
return "("+(this.focused&&this.editOptions?this._regExpGenerator(_2.delegate(_6,this.editOptions))+"|":"")+this._regExpGenerator(_6)+")";
},value:NaN,editOptions:{pattern:"#.######"},_formatter:_3.format,_regExpGenerator:_3.regexp,postMixInProperties:function(){
this.inherited(arguments);
this._set("type","text");
},_setConstraintsAttr:function(_7){
var _8=typeof _7.places=="number"?_7.places:0;
if(_8){
_8++;
}
if(typeof _7.max!="number"){
_7.max=9*Math.pow(10,15-_8);
}
if(typeof _7.min!="number"){
_7.min=-9*Math.pow(10,15-_8);
}
this.inherited(arguments,[_7]);
if(this.focusNode&&this.focusNode.value&&!isNaN(this.value)){
this.set("value",this.value);
}
},_onFocus:function(){
if(this.disabled){
return;
}
var _9=this.get("value");
if(typeof _9=="number"&&!isNaN(_9)){
var _a=this.format(_9,this.constraints);
if(_a!==undefined){
this.textbox.value=_a;
}
}
this.inherited(arguments);
},format:function(_b,_c){
var _d=String(_b);
if(typeof _b!="number"){
return _d;
}
if(isNaN(_b)){
return "";
}
if(!("rangeCheck" in this&&this.rangeCheck(_b,_c))&&_c.exponent!==false&&/\de[-+]?\d/i.test(_d)){
return _d;
}
if(this.editOptions&&this.focused){
_c=_2.mixin({},_c,this.editOptions);
}
return this._formatter(_b,_c);
},_parser:_3.parse,parse:function(_e,_f){
var v=this._parser(_e,_2.mixin({},_f,(this.editOptions&&this.focused)?this.editOptions:{}));
if(this.editOptions&&this.focused&&isNaN(v)){
v=this._parser(_e,_f);
}
return v;
},_getDisplayedValueAttr:function(){
var v=this.inherited(arguments);
return isNaN(v)?this.textbox.value:v;
},filter:function(_10){
return (_10==null||_10==="")?NaN:this.inherited(arguments);
},serialize:function(_11,_12){
return (typeof _11!="number"||isNaN(_11))?"":this.inherited(arguments);
},_setBlurValue:function(){
var val=_2.hitch(_2.delegate(this,{focused:true}),"get")("value");
this._setValueAttr(val,true);
},_setValueAttr:function(_13,_14,_15){
if(_13!==undefined&&_15===undefined){
_15=String(_13);
if(typeof _13=="number"){
if(isNaN(_13)){
_15="";
}else{
if(("rangeCheck" in this&&this.rangeCheck(_13,this.constraints))||this.constraints.exponent===false||!/\de[-+]?\d/i.test(_15)){
_15=undefined;
}
}
}else{
if(!_13){
_15="";
_13=NaN;
}else{
_13=undefined;
}
}
}
this.inherited(arguments,[_13,_14,_15]);
},_getValueAttr:function(){
var v=this.inherited(arguments);
if(isNaN(v)&&this.textbox.value!==""){
if(this.constraints.exponent!==false&&/\de[-+]?\d/i.test(this.textbox.value)&&(new RegExp("^"+_3._realNumberRegexp(_2.delegate(this.constraints))+"$").test(this.textbox.value))){
var n=Number(this.textbox.value);
return isNaN(n)?undefined:n;
}else{
return undefined;
}
}else{
return v;
}
},isValid:function(_16){
if(!this.focused||this._isEmpty(this.textbox.value)){
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
var _17=_1("dijit.form.NumberTextBox",[_4,_5],{baseClass:"dijitTextBox dijitNumberTextBox"});
_17.Mixin=_5;
return _17;
});
