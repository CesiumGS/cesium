/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.TextBox"]){
dojo._hasResource["dojox.mobile.app.TextBox"]=true;
dojo.provide("dojox.mobile.app.TextBox");
dojo.experimental("dojox.mobile.app.TextBox");
dojo.require("dojox.mobile.app._Widget");
dojo.require("dojox.mobile.app._FormWidget");
dojo.declare("dojox.mobile.app.TextBox",dojox.mobile.app._FormValueWidget,{trim:false,uppercase:false,lowercase:false,propercase:false,maxLength:"",selectOnClick:false,placeHolder:"",baseClass:"mblTextBox",attributeMap:dojo.delegate(dojox.mobile.app._FormValueWidget.prototype.attributeMap,{maxLength:"focusNode"}),buildRendering:function(){
var _1=this.srcNodeRef;
if(!_1||_1.tagName!="INPUT"){
_1=dojo.create("input",{});
}
dojo.attr(_1,{type:"text",value:dojo.attr(_1,"value")||"",placeholder:this.placeHolder||null});
this.domNode=this.textbox=this.focusNode=_1;
},_setPlaceHolderAttr:function(v){
this.placeHolder=v;
if(this.textbox){
dojo.attr(this.textbox,"placeholder",v);
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
}
this.inherited(arguments,[_5,_3]);
},displayedValue:"",_getDisplayedValueAttr:function(){
return this.filter(this.textbox.value);
},_setDisplayedValueAttr:function(_6){
if(_6===null||_6===undefined){
_6="";
}else{
if(typeof _6!="string"){
_6=String(_6);
}
}
this.textbox.value=_6;
this._setValueAttr(this.get("value"),undefined,_6);
},format:function(_7,_8){
return ((_7==null||_7==undefined)?"":(_7.toString?_7.toString():_7));
},parse:function(_9,_a){
return _9;
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
var _b=this;
setTimeout(function(){
_b._handleOnChange(_b.get("value"),false);
},0);
}
this._refreshState();
},postCreate:function(){
this.textbox.setAttribute("value",this.textbox.value);
this.inherited(arguments);
if(dojo.isMoz||dojo.isOpera){
this.connect(this.textbox,"oninput",this._onInput);
}else{
this.connect(this.textbox,"onkeydown",this._onInput);
this.connect(this.textbox,"onkeyup",this._onInput);
this.connect(this.textbox,"onpaste",this._onInput);
this.connect(this.textbox,"oncut",this._onInput);
}
},_blankValue:"",filter:function(_c){
if(_c===null){
return this._blankValue;
}
if(typeof _c!="string"){
return _c;
}
if(this.trim){
_c=dojo.trim(_c);
}
if(this.uppercase){
_c=_c.toUpperCase();
}
if(this.lowercase){
_c=_c.toLowerCase();
}
if(this.propercase){
_c=_c.replace(/[^\s]+/g,function(_d){
return _d.substring(0,1).toUpperCase()+_d.substring(1);
});
}
return _c;
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
},_onFocus:function(by){
if(this.disabled||this.readOnly){
return;
}
if(this.selectOnClick&&by=="mouse"){
this._selectOnClickHandle=this.connect(this.domNode,"onmouseup",function(){
this.disconnect(this._selectOnClickHandle);
var _e;
_e=this.textbox.selectionStart==this.textbox.selectionEnd;
if(_e){
this.selectInputText(this.textbox);
}
});
}
this._refreshState();
this.inherited(arguments);
},reset:function(){
this.textbox.value="";
this.inherited(arguments);
}});
}
