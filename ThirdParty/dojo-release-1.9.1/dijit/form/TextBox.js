//>>built
require({cache:{"url:dijit/form/templates/TextBox.html":"<div class=\"dijit dijitReset dijitInline dijitLeft\" id=\"widget_${id}\" role=\"presentation\"\n\t><div class=\"dijitReset dijitInputField dijitInputContainer\"\n\t\t><input class=\"dijitReset dijitInputInner\" data-dojo-attach-point='textbox,focusNode' autocomplete=\"off\"\n\t\t\t${!nameAttrSetting} type='${type}'\n\t/></div\n></div>\n"}});
define("dijit/form/TextBox",["dojo/_base/declare","dojo/dom-construct","dojo/dom-style","dojo/_base/kernel","dojo/_base/lang","dojo/on","dojo/sniff","./_FormValueWidget","./_TextBoxMixin","dojo/text!./templates/TextBox.html","../main"],function(_1,_2,_3,_4,_5,on,_6,_7,_8,_9,_a){
var _b=_1("dijit.form.TextBox"+(_6("dojo-bidi")?"_NoBidi":""),[_7,_8],{templateString:_9,_singleNodeTemplate:"<input class=\"dijit dijitReset dijitLeft dijitInputField\" data-dojo-attach-point=\"textbox,focusNode\" autocomplete=\"off\" type=\"${type}\" ${!nameAttrSetting} />",_buttonInputDisabled:_6("ie")?"disabled":"",baseClass:"dijitTextBox",postMixInProperties:function(){
var _c=this.type.toLowerCase();
if(this.templateString&&this.templateString.toLowerCase()=="input"||((_c=="hidden"||_c=="file")&&this.templateString==this.constructor.prototype.templateString)){
this.templateString=this._singleNodeTemplate;
}
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
if(_6("ie")<9){
this.defer(function(){
try{
var s=_3.getComputedStyle(this.domNode);
if(s){
var ff=s.fontFamily;
if(ff){
var _d=this.domNode.getElementsByTagName("INPUT");
if(_d){
for(var i=0;i<_d.length;i++){
_d[i].style.fontFamily=ff;
}
}
}
}
}
catch(e){
}
});
}
},_setPlaceHolderAttr:function(v){
this._set("placeHolder",v);
if(!this._phspan){
this._attachPoints.push("_phspan");
this._phspan=_2.create("span",{onmousedown:function(e){
e.preventDefault();
},className:"dijitPlaceHolder dijitInputField"},this.textbox,"after");
this.own(on(this._phspan,"touchend, MSPointerUp",_5.hitch(this,function(){
this.focus();
})));
}
this._phspan.innerHTML="";
this._phspan.appendChild(this._phspan.ownerDocument.createTextNode(v));
this._updatePlaceHolder();
},_onInput:function(_e){
this.inherited(arguments);
this._updatePlaceHolder();
},_updatePlaceHolder:function(){
if(this._phspan){
this._phspan.style.display=(this.placeHolder&&!this.textbox.value)?"":"none";
}
},_setValueAttr:function(_f,_10,_11){
this.inherited(arguments);
this._updatePlaceHolder();
},getDisplayedValue:function(){
_4.deprecated(this.declaredClass+"::getDisplayedValue() is deprecated. Use get('displayedValue') instead.","","2.0");
return this.get("displayedValue");
},setDisplayedValue:function(_12){
_4.deprecated(this.declaredClass+"::setDisplayedValue() is deprecated. Use set('displayedValue', ...) instead.","","2.0");
this.set("displayedValue",_12);
},_onBlur:function(e){
if(this.disabled){
return;
}
this.inherited(arguments);
this._updatePlaceHolder();
if(_6("mozilla")){
if(this.selectOnClick){
this.textbox.selectionStart=this.textbox.selectionEnd=undefined;
}
}
},_onFocus:function(by){
if(this.disabled||this.readOnly){
return;
}
this.inherited(arguments);
this._updatePlaceHolder();
}});
if(_6("ie")){
_b.prototype._isTextSelected=function(){
var _13=this.ownerDocument.selection.createRange();
var _14=_13.parentElement();
return _14==this.textbox&&_13.text.length>0;
};
_a._setSelectionRange=_8._setSelectionRange=function(_15,_16,_17){
if(_15.createTextRange){
var r=_15.createTextRange();
r.collapse(true);
r.moveStart("character",-99999);
r.moveStart("character",_16);
r.moveEnd("character",_17-_16);
r.select();
}
};
}
if(_6("dojo-bidi")){
_b=_1("dijit.form.TextBox",_b,{_setPlaceHolderAttr:function(v){
this.inherited(arguments);
this.applyTextDir(this._phspan);
}});
}
return _b;
});
