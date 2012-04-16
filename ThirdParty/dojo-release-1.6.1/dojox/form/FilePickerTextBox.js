/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.FilePickerTextBox"]){
dojo._hasResource["dojox.form.FilePickerTextBox"]=true;
dojo.provide("dojox.form.FilePickerTextBox");
dojo.require("dojo.window");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit._HasDropDown");
dojo.require("dojox.widget.FilePicker");
dojo.declare("dojox.form.FilePickerTextBox",[dijit.form.ValidationTextBox,dijit._HasDropDown],{baseClass:"dojoxFilePickerTextBox",templateString:dojo.cache("dojox.form","resources/FilePickerTextBox.html","<div class=\"dijit dijitReset dijitInlineTable dijitLeft\"\n\tid=\"widget_${id}\"\n\trole=\"combobox\" tabIndex=\"-1\"\n\t><div style=\"overflow:hidden;\"\n\t\t><div class='dijitReset dijitRight dijitButtonNode dijitArrowButton dijitDownArrowButton'\n\t\t\tdojoAttachPoint=\"downArrowNode,_buttonNode,_popupStateNode\" role=\"presentation\"\n\t\t\t><div class=\"dijitArrowButtonInner\">&thinsp;</div\n\t\t\t><div class=\"dijitArrowButtonChar\">&#9660;</div\n\t\t></div\n\t\t><div class=\"dijitReset dijitValidationIcon\"><br></div\n\t\t><div class=\"dijitReset dijitValidationIconText\">&Chi;</div\n\t\t><div class=\"dijitReset dijitInputField\"\n\t\t\t><input type=\"text\" autocomplete=\"off\" ${!nameAttrSetting} class='dijitReset'\n\t\t\t\tdojoAttachEvent='onkeypress:_onKey' \n\t\t\t\tdojoAttachPoint='textbox,focusNode' role=\"textbox\" aria-haspopup=\"true\" aria-autocomplete=\"list\"\n\t\t/></div\n\t></div\n></div>\n"),searchDelay:500,valueItem:null,numPanes:2.25,postMixInProperties:function(){
this.inherited(arguments);
this.dropDown=new dojox.widget.FilePicker(this.constraints);
},postCreate:function(){
this.inherited(arguments);
this.connect(this.dropDown,"onChange",this._onWidgetChange);
this.connect(this.focusNode,"onblur","_focusBlur");
this.connect(this.focusNode,"onfocus","_focusFocus");
this.connect(this.focusNode,"ondblclick",function(){
dijit.selectInputText(this.focusNode);
});
},_setValueAttr:function(_1,_2,_3){
if(!this._searchInProgress){
this.inherited(arguments);
_1=_1||"";
var _4=this.dropDown.get("pathValue")||"";
if(_1!==_4){
this._skip=true;
var fx=dojo.hitch(this,"_setBlurValue");
this.dropDown._setPathValueAttr(_1,!_3,this._settingBlurValue?fx:null);
}
}
},_onWidgetChange:function(_5){
if(!_5&&this.focusNode.value){
this._hasValidPath=false;
this.focusNode.value="";
}else{
this.valueItem=_5;
var _6=this.dropDown._getPathValueAttr(_5);
if(_6){
this._hasValidPath=true;
}
if(!this._skip){
this._setValueAttr(_6,undefined,true);
}
delete this._skip;
}
this.validate();
},startup:function(){
if(!this.dropDown._started){
this.dropDown.startup();
}
this.inherited(arguments);
},openDropDown:function(){
this.dropDown.domNode.style.width="0px";
if(!("minPaneWidth" in (this.constraints||{}))){
this.dropDown.set("minPaneWidth",(this.domNode.offsetWidth/this.numPanes));
}
this.inherited(arguments);
},toggleDropDown:function(){
this.inherited(arguments);
if(this._opened){
this.dropDown.set("pathValue",this.get("value"));
}
},_focusBlur:function(e){
if(e.explicitOriginalTarget==this.focusNode&&!this._allowBlur){
window.setTimeout(dojo.hitch(this,function(){
if(!this._allowBlur){
this.focus();
}
}),1);
}else{
if(this._menuFocus){
this.dropDown._updateClass(this._menuFocus,"Item",{"Hover":false});
delete this._menuFocus;
}
}
},_focusFocus:function(e){
if(this._menuFocus){
this.dropDown._updateClass(this._menuFocus,"Item",{"Hover":false});
}
delete this._menuFocus;
var _7=dijit.getFocus(this);
if(_7&&_7.node){
_7=dijit.byNode(_7.node);
if(_7){
this._menuFocus=_7.domNode;
}
}
if(this._menuFocus){
this.dropDown._updateClass(this._menuFocus,"Item",{"Hover":true});
}
delete this._allowBlur;
},_onBlur:function(){
this._allowBlur=true;
delete this.dropDown._savedFocus;
this.inherited(arguments);
},_setBlurValue:function(){
if(this.dropDown&&!this._settingBlurValue){
this._settingBlurValue=true;
this.set("value",this.focusNode.value);
}else{
delete this._settingBlurValue;
this.inherited(arguments);
}
},parse:function(_8,_9){
if(this._hasValidPath||this._hasSelection){
return _8;
}
var dd=this.dropDown,_a=dd.topDir,_b=dd.pathSeparator;
var _c=dd.get("pathValue");
var _d=function(v){
if(_a.length&&v.indexOf(_a)===0){
v=v.substring(_a.length);
}
if(_b&&v[v.length-1]==_b){
v=v.substring(0,v.length-1);
}
return v;
};
_c=_d(_c);
var _e=_d(_8);
if(_e==_c){
return _8;
}
return undefined;
},_startSearchFromInput:function(){
var dd=this.dropDown,fn=this.focusNode;
var _f=fn.value,_10=_f,_11=dd.topDir;
if(this._hasSelection){
dijit.selectInputText(fn,_10.length);
}
this._hasSelection=false;
if(_11.length&&_f.indexOf(_11)===0){
_f=_f.substring(_11.length);
}
var _12=_f.split(dd.pathSeparator);
var _13=dojo.hitch(this,function(idx){
var dir=_12[idx];
var _14=dd.getChildren()[idx];
var _15;
this._searchInProgress=true;
var _16=dojo.hitch(this,function(){
delete this._searchInProgress;
});
if((dir||_14)&&!this._opened){
this.toggleDropDown();
}
if(dir&&_14){
var fx=dojo.hitch(this,function(){
if(_15){
this.disconnect(_15);
}
delete _15;
var _17=_14._menu.getChildren();
var _18=dojo.filter(_17,function(i){
return i.label==dir;
})[0];
var _19=dojo.filter(_17,function(i){
return (i.label.indexOf(dir)===0);
})[0];
if(_18&&((_12.length>idx+1&&_18.children)||(!_18.children))){
idx++;
_14._menu.onItemClick(_18,{type:"internal",stopPropagation:function(){
},preventDefault:function(){
}});
if(_12[idx]){
_13(idx);
}else{
_16();
}
}else{
_14._setSelected(null);
if(_19&&_12.length===idx+1){
dd._setInProgress=true;
dd._removeAfter(_14);
delete dd._setInProgress;
var _1a=_19.label;
if(_19.children){
_1a+=dd.pathSeparator;
}
_1a=_1a.substring(dir.length);
window.setTimeout(function(){
dojo.window.scrollIntoView(_19.domNode);
},1);
fn.value=_10+_1a;
dijit.selectInputText(fn,_10.length);
this._hasSelection=true;
try{
_19.focusNode.focus();
}
catch(e){
}
}else{
if(this._menuFocus){
this.dropDown._updateClass(this._menuFocus,"Item",{"Hover":false,"Focus":false});
}
delete this._menuFocus;
}
_16();
}
});
if(!_14.isLoaded){
_15=this.connect(_14,"onLoad",fx);
}else{
fx();
}
}else{
if(_14){
_14._setSelected(null);
dd._setInProgress=true;
dd._removeAfter(_14);
delete dd._setInProgress;
}
_16();
}
});
_13(0);
},_onKey:function(e){
if(this.disabled||this.readOnly){
return;
}
var dk=dojo.keys;
var c=e.charOrCode;
if(c==dk.DOWN_ARROW){
this._allowBlur=true;
}
if(c==dk.ENTER&&this._opened){
this.dropDown.onExecute();
dijit.selectInputText(this.focusNode,this.focusNode.value.length);
this._hasSelection=false;
dojo.stopEvent(e);
return;
}
if((c==dk.RIGHT_ARROW||c==dk.LEFT_ARROW||c==dk.TAB)&&this._hasSelection){
this._startSearchFromInput();
dojo.stopEvent(e);
return;
}
this.inherited(arguments);
var _1b=false;
if((c==dk.BACKSPACE||c==dk.DELETE)&&this._hasSelection){
this._hasSelection=false;
}else{
if(c==dk.BACKSPACE||c==dk.DELETE||c==" "){
_1b=true;
}else{
_1b=e.keyChar!=="";
}
}
if(this._searchTimer){
window.clearTimeout(this._searchTimer);
}
delete this._searchTimer;
if(_1b){
this._hasValidPath=false;
this._hasSelection=false;
this._searchTimer=window.setTimeout(dojo.hitch(this,"_startSearchFromInput"),this.searchDelay+1);
}
}});
}
