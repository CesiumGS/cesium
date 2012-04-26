/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.TextBox"]){
dojo._hasResource["dijit.form.TextBox"]=true;
dojo.provide("dijit.form.TextBox");
dojo.require("dijit.form._FormWidget");
dojo.declare("dijit.form.TextBox",dijit.form._FormValueWidget,{trim:false,uppercase:false,lowercase:false,propercase:false,maxLength:"",selectOnClick:false,placeHolder:"",templateString:dojo.cache("dijit.form","templates/TextBox.html","<div class=\"dijit dijitReset dijitInline dijitLeft\" id=\"widget_${id}\" role=\"presentation\"\n\t><div class=\"dijitReset dijitInputField dijitInputContainer\"\n\t\t><input class=\"dijitReset dijitInputInner\" dojoAttachPoint='textbox,focusNode' autocomplete=\"off\"\n\t\t\t${!nameAttrSetting} type='${type}'\n\t/></div\n></div>\n"),_singleNodeTemplate:"<input class=\"dijit dijitReset dijitLeft dijitInputField\" dojoAttachPoint=\"textbox,focusNode\" autocomplete=\"off\" type=\"${type}\" ${!nameAttrSetting} />",_buttonInputDisabled:dojo.isIE?"disabled":"",baseClass:"dijitTextBox",attributeMap:dojo.delegate(dijit.form._FormValueWidget.prototype.attributeMap,{maxLength:"focusNode"}),postMixInProperties:function(){
var _1=this.type.toLowerCase();
if(this.templateString&&this.templateString.toLowerCase()=="input"||((_1=="hidden"||_1=="file")&&this.templateString==dijit.form.TextBox.prototype.templateString)){
this.templateString=this._singleNodeTemplate;
}
this.inherited(arguments);
},_setPlaceHolderAttr:function(v){
this._set("placeHolder",v);
if(!this._phspan){
this._attachPoints.push("_phspan");
this._phspan=dojo.create("span",{className:"dijitPlaceHolder dijitInputField"},this.textbox,"after");
}
this._phspan.innerHTML="";
this._phspan.appendChild(document.createTextNode(v));
this._updatePlaceHolder();
},_updatePlaceHolder:function(){
if(this._phspan){
this._phspan.style.display=(this.placeHolder&&!this._focused&&!this.textbox.value)?"":"none";
}
},_getValueAttr:function(){
return this.parse(this.get("displayedValue"),this.constraints);
},_setValueAttr:function(_2,_3,_4){
var _5;
if(_2!==undefined){
_5=this.filter(_2);
if(typeof _4!="string"){
if(_5!==null&&((typeof _5!="number")||!isNaN(_5))){
_4=this.filter(this.format(_5,this.constraints));
}else{
_4="";
}
}
}
if(_4!=null&&_4!=undefined&&((typeof _4)!="number"||!isNaN(_4))&&this.textbox.value!=_4){
this.textbox.value=_4;
this._set("displayedValue",this.get("displayedValue"));
}
this._updatePlaceHolder();
this.inherited(arguments,[_5,_3]);
},displayedValue:"",getDisplayedValue:function(){
dojo.deprecated(this.declaredClass+"::getDisplayedValue() is deprecated. Use set('displayedValue') instead.","","2.0");
return this.get("displayedValue");
},_getDisplayedValueAttr:function(){
return this.filter(this.textbox.value);
},setDisplayedValue:function(_6){
dojo.deprecated(this.declaredClass+"::setDisplayedValue() is deprecated. Use set('displayedValue', ...) instead.","","2.0");
this.set("displayedValue",_6);
},_setDisplayedValueAttr:function(_7){
if(_7===null||_7===undefined){
_7="";
}else{
if(typeof _7!="string"){
_7=String(_7);
}
}
this.textbox.value=_7;
this._setValueAttr(this.get("value"),undefined);
this._set("displayedValue",this.get("displayedValue"));
},format:function(_8,_9){
return ((_8==null||_8==undefined)?"":(_8.toString?_8.toString():_8));
},parse:function(_a,_b){
return _a;
},_refreshState:function(){
},_onInput:function(e){
if(e&&e.type&&/key/i.test(e.type)&&e.keyCode){
switch(e.keyCode){
case dojo.keys.SHIFT:
case dojo.keys.ALT:
case dojo.keys.CTRL:
case dojo.keys.TAB:
return;
}
}
if(this.intermediateChanges){
var _c=this;
setTimeout(function(){
_c._handleOnChange(_c.get("value"),false);
},0);
}
this._refreshState();
this._set("displayedValue",this.get("displayedValue"));
},postCreate:function(){
if(dojo.isIE){
setTimeout(dojo.hitch(this,function(){
var s=dojo.getComputedStyle(this.domNode);
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
}),0);
}
this.textbox.setAttribute("value",this.textbox.value);
this.inherited(arguments);
if(dojo.isMoz||dojo.isOpera){
this.connect(this.textbox,"oninput","_onInput");
}else{
this.connect(this.textbox,"onkeydown","_onInput");
this.connect(this.textbox,"onkeyup","_onInput");
this.connect(this.textbox,"onpaste","_onInput");
this.connect(this.textbox,"oncut","_onInput");
}
},_blankValue:"",filter:function(_e){
if(_e===null){
return this._blankValue;
}
if(typeof _e!="string"){
return _e;
}
if(this.trim){
_e=dojo.trim(_e);
}
if(this.uppercase){
_e=_e.toUpperCase();
}
if(this.lowercase){
_e=_e.toLowerCase();
}
if(this.propercase){
_e=_e.replace(/[^\s]+/g,function(_f){
return _f.substring(0,1).toUpperCase()+_f.substring(1);
});
}
return _e;
},_setBlurValue:function(){
this._setValueAttr(this.get("value"),true);
},_onBlur:function(e){
if(this.disabled){
return;
}
this._setBlurValue();
this.inherited(arguments);
if(this._selectOnClickHandle){
this.disconnect(this._selectOnClickHandle);
}
if(this.selectOnClick&&dojo.isMoz){
this.textbox.selectionStart=this.textbox.selectionEnd=undefined;
}
this._updatePlaceHolder();
},_onFocus:function(by){
if(this.disabled||this.readOnly){
return;
}
if(this.selectOnClick&&by=="mouse"){
this._selectOnClickHandle=this.connect(this.domNode,"onmouseup",function(){
this.disconnect(this._selectOnClickHandle);
var _10;
if(dojo.isIE){
var _11=dojo.doc.selection.createRange();
var _12=_11.parentElement();
_10=_12==this.textbox&&_11.text.length==0;
}else{
_10=this.textbox.selectionStart==this.textbox.selectionEnd;
}
if(_10){
dijit.selectInputText(this.textbox);
}
});
}
this._updatePlaceHolder();
this.inherited(arguments);
this._refreshState();
},reset:function(){
this.textbox.value="";
this.inherited(arguments);
}});
dijit.selectInputText=function(_13,_14,_15){
var _16=dojo.global;
var _17=dojo.doc;
_13=dojo.byId(_13);
if(isNaN(_14)){
_14=0;
}
if(isNaN(_15)){
_15=_13.value?_13.value.length:0;
}
dijit.focus(_13);
if(_17["selection"]&&dojo.body()["createTextRange"]){
if(_13.createTextRange){
var r=_13.createTextRange();
r.collapse(true);
r.moveStart("character",-99999);
r.moveStart("character",_14);
r.moveEnd("character",_15-_14);
r.select();
}
}else{
if(_16["getSelection"]){
if(_13.setSelectionRange){
_13.setSelectionRange(_14,_15);
}
}
}
};
}
