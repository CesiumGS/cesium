//>>built
require({cache:{"url:dijit/form/templates/ValidationTextBox.html":"<div class=\"dijit dijitReset dijitInline dijitLeft\"\n\tid=\"widget_${id}\" role=\"presentation\"\n\t><div class='dijitReset dijitValidationContainer'\n\t\t><input class=\"dijitReset dijitInputField dijitValidationIcon dijitValidationInner\" value=\"&#935; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"presentation\"\n\t/></div\n\t><div class=\"dijitReset dijitInputField dijitInputContainer\"\n\t\t><input class=\"dijitReset dijitInputInner\" data-dojo-attach-point='textbox,focusNode' autocomplete=\"off\"\n\t\t\t${!nameAttrSetting} type='${type}'\n\t/></div\n></div>\n"}});
define("dijit/form/ValidationTextBox",["dojo/_base/declare","dojo/_base/kernel","dojo/i18n","./TextBox","../Tooltip","dojo/text!./templates/ValidationTextBox.html","dojo/i18n!./nls/validate"],function(_1,_2,_3,_4,_5,_6){
var _7;
return _7=_1("dijit.form.ValidationTextBox",_4,{templateString:_6,required:false,promptMessage:"",invalidMessage:"$_unset_$",missingMessage:"$_unset_$",message:"",constraints:{},pattern:".*",regExp:"",regExpGen:function(){
},state:"",tooltipPosition:[],_deprecateRegExp:function(_8,_9){
if(_9!=_7.prototype[_8]){
_2.deprecated("ValidationTextBox id="+this.id+", set('"+_8+"', ...) is deprecated.  Use set('pattern', ...) instead.","","2.0");
this.set("pattern",_9);
}
},_setRegExpGenAttr:function(_a){
this._deprecateRegExp("regExpGen",_a);
this._set("regExpGen",this._computeRegexp);
},_setRegExpAttr:function(_b){
this._deprecateRegExp("regExp",_b);
},_setValueAttr:function(){
this.inherited(arguments);
this._refreshState();
},validator:function(_c,_d){
return (new RegExp("^(?:"+this._computeRegexp(_d)+")"+(this.required?"":"?")+"$")).test(_c)&&(!this.required||!this._isEmpty(_c))&&(this._isEmpty(_c)||this.parse(_c,_d)!==undefined);
},_isValidSubset:function(){
return this.textbox.value.search(this._partialre)==0;
},isValid:function(){
return this.validator(this.textbox.value,this.get("constraints"));
},_isEmpty:function(_e){
return (this.trim?/^\s*$/:/^$/).test(_e);
},getErrorMessage:function(){
var _f=this.invalidMessage=="$_unset_$"?this.messages.invalidMessage:!this.invalidMessage?this.promptMessage:this.invalidMessage;
var _10=this.missingMessage=="$_unset_$"?this.messages.missingMessage:!this.missingMessage?_f:this.missingMessage;
return (this.required&&this._isEmpty(this.textbox.value))?_10:_f;
},getPromptMessage:function(){
return this.promptMessage;
},_maskValidSubsetError:true,validate:function(_11){
var _12="";
var _13=this.disabled||this.isValid(_11);
if(_13){
this._maskValidSubsetError=true;
}
var _14=this._isEmpty(this.textbox.value);
var _15=!_13&&_11&&this._isValidSubset();
this._set("state",_13?"":(((((!this._hasBeenBlurred||_11)&&_14)||_15)&&(this._maskValidSubsetError||(_15&&!this._hasBeenBlurred&&_11)))?"Incomplete":"Error"));
this.focusNode.setAttribute("aria-invalid",_13?"false":"true");
if(this.state=="Error"){
this._maskValidSubsetError=_11&&_15;
_12=this.getErrorMessage(_11);
}else{
if(this.state=="Incomplete"){
_12=this.getPromptMessage(_11);
this._maskValidSubsetError=!this._hasBeenBlurred||_11;
}else{
if(_14){
_12=this.getPromptMessage(_11);
}
}
}
this.set("message",_12);
return _13;
},displayMessage:function(_16){
if(_16&&this.focused){
_5.show(_16,this.domNode,this.tooltipPosition,!this.isLeftToRight());
}else{
_5.hide(this.domNode);
}
},_refreshState:function(){
if(this._created){
this.validate(this.focused);
}
this.inherited(arguments);
},constructor:function(_17){
this.constraints={};
this.baseClass+=" dijitValidationTextBox";
},startup:function(){
this.inherited(arguments);
this._refreshState();
},_setConstraintsAttr:function(_18){
if(!_18.locale&&this.lang){
_18.locale=this.lang;
}
this._set("constraints",_18);
this._refreshState();
},_setPatternAttr:function(_19){
this._set("pattern",_19);
},_computeRegexp:function(_1a){
var p=this.pattern;
if(typeof p=="function"){
p=p.call(this,_1a);
}
if(p!=this._lastRegExp){
var _1b="";
this._lastRegExp=p;
if(p!=".*"){
p.replace(/\\.|\[\]|\[.*?[^\\]{1}\]|\{.*?\}|\(\?[=:!]|./g,function(re){
switch(re.charAt(0)){
case "{":
case "+":
case "?":
case "*":
case "^":
case "$":
case "|":
case "(":
_1b+=re;
break;
case ")":
_1b+="|$)";
break;
default:
_1b+="(?:"+re+"|$)";
break;
}
});
}
try{
"".search(_1b);
}
catch(e){
_1b=this.pattern;
console.warn("RegExp error in "+this.declaredClass+": "+this.pattern);
}
this._partialre="^(?:"+_1b+")$";
}
return p;
},postMixInProperties:function(){
this.inherited(arguments);
this.messages=_3.getLocalization("dijit.form","validate",this.lang);
this._setConstraintsAttr(this.constraints);
},_setDisabledAttr:function(_1c){
this.inherited(arguments);
this._refreshState();
},_setRequiredAttr:function(_1d){
this._set("required",_1d);
this.focusNode.setAttribute("aria-required",_1d);
this._refreshState();
},_setMessageAttr:function(_1e){
this._set("message",_1e);
this.displayMessage(_1e);
},reset:function(){
this._maskValidSubsetError=true;
this.inherited(arguments);
},_onBlur:function(){
this.displayMessage("");
this.inherited(arguments);
}});
});
