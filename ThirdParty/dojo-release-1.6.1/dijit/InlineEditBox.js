/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.InlineEditBox"]){
dojo._hasResource["dijit.InlineEditBox"]=true;
dojo.provide("dijit.InlineEditBox");
dojo.require("dojo.i18n");
dojo.require("dijit._Widget");
dojo.require("dijit._Container");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.TextBox");
dojo.requireLocalization("dijit","common",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit.InlineEditBox",dijit._Widget,{editing:false,autoSave:true,buttonSave:"",buttonCancel:"",renderAsHtml:false,editor:"dijit.form.TextBox",editorWrapper:"dijit._InlineEditor",editorParams:{},disabled:false,onChange:function(_1){
},onCancel:function(){
},width:"100%",value:"",noValueIndicator:dojo.isIE<=6?"<span style='font-family: wingdings; text-decoration: underline;'>&nbsp;&nbsp;&nbsp;&nbsp;&#x270d;&nbsp;&nbsp;&nbsp;&nbsp;</span>":"<span style='text-decoration: underline;'>&nbsp;&nbsp;&nbsp;&nbsp;&#x270d;&nbsp;&nbsp;&nbsp;&nbsp;</span>",constructor:function(){
this.editorParams={};
},postMixInProperties:function(){
this.inherited(arguments);
this.displayNode=this.srcNodeRef;
var _2={ondijitclick:"_onClick",onmouseover:"_onMouseOver",onmouseout:"_onMouseOut",onfocus:"_onMouseOver",onblur:"_onMouseOut"};
for(var _3 in _2){
this.connect(this.displayNode,_3,_2[_3]);
}
dijit.setWaiRole(this.displayNode,"button");
if(!this.displayNode.getAttribute("tabIndex")){
this.displayNode.setAttribute("tabIndex",0);
}
if(!this.value&&!("value" in this.params)){
this.value=dojo.trim(this.renderAsHtml?this.displayNode.innerHTML:(this.displayNode.innerText||this.displayNode.textContent||""));
}
if(!this.value){
this.displayNode.innerHTML=this.noValueIndicator;
}
dojo.addClass(this.displayNode,"dijitInlineEditBoxDisplayMode");
},setDisabled:function(_4){
dojo.deprecated("dijit.InlineEditBox.setDisabled() is deprecated.  Use set('disabled', bool) instead.","","2.0");
this.set("disabled",_4);
},_setDisabledAttr:function(_5){
dijit.setWaiState(this.domNode,"disabled",_5);
if(_5){
this.displayNode.removeAttribute("tabIndex");
}else{
this.displayNode.setAttribute("tabIndex",0);
}
dojo.toggleClass(this.displayNode,"dijitInlineEditBoxDisplayModeDisabled",_5);
this._set("disabled",_5);
},_onMouseOver:function(){
if(!this.disabled){
dojo.addClass(this.displayNode,"dijitInlineEditBoxDisplayModeHover");
}
},_onMouseOut:function(){
dojo.removeClass(this.displayNode,"dijitInlineEditBoxDisplayModeHover");
},_onClick:function(e){
if(this.disabled){
return;
}
if(e){
dojo.stopEvent(e);
}
this._onMouseOut();
setTimeout(dojo.hitch(this,"edit"),0);
},edit:function(){
if(this.disabled||this.editing){
return;
}
this.editing=true;
this._savedPosition=dojo.style(this.displayNode,"position")||"static";
this._savedOpacity=dojo.style(this.displayNode,"opacity")||"1";
this._savedTabIndex=dojo.attr(this.displayNode,"tabIndex")||"0";
if(this.wrapperWidget){
var ew=this.wrapperWidget.editWidget;
ew.set("displayedValue" in ew?"displayedValue":"value",this.value);
}else{
var _6=dojo.create("span",null,this.domNode,"before");
var _7=typeof this.editorWrapper=="string"?dojo.getObject(this.editorWrapper):this.editorWrapper;
this.wrapperWidget=new _7({value:this.value,buttonSave:this.buttonSave,buttonCancel:this.buttonCancel,dir:this.dir,lang:this.lang,tabIndex:this._savedTabIndex,editor:this.editor,inlineEditBox:this,sourceStyle:dojo.getComputedStyle(this.displayNode),save:dojo.hitch(this,"save"),cancel:dojo.hitch(this,"cancel")},_6);
if(!this._started){
this.startup();
}
}
var ww=this.wrapperWidget;
if(dojo.isIE){
dijit.focus(dijit.getFocus());
}
dojo.style(this.displayNode,{position:"absolute",opacity:"0",display:"none"});
dojo.style(ww.domNode,{position:this._savedPosition,visibility:"visible",opacity:"1"});
dojo.attr(this.displayNode,"tabIndex","-1");
setTimeout(dojo.hitch(this,function(){
ww.focus();
ww._resetValue=ww.getValue();
}),0);
},_onBlur:function(){
this.inherited(arguments);
if(!this.editing){
}
},destroy:function(){
if(this.wrapperWidget&&!this.wrapperWidget._destroyed){
this.wrapperWidget.destroy();
delete this.wrapperWidget;
}
this.inherited(arguments);
},_showText:function(_8){
var ww=this.wrapperWidget;
dojo.style(ww.domNode,{position:"absolute",visibility:"hidden",opacity:"0"});
dojo.style(this.displayNode,{position:this._savedPosition,opacity:this._savedOpacity,display:""});
dojo.attr(this.displayNode,"tabIndex",this._savedTabIndex);
if(_8){
dijit.focus(this.displayNode);
}
},save:function(_9){
if(this.disabled||!this.editing){
return;
}
this.editing=false;
var ww=this.wrapperWidget;
var _a=ww.getValue();
this.set("value",_a);
this._showText(_9);
},setValue:function(_b){
dojo.deprecated("dijit.InlineEditBox.setValue() is deprecated.  Use set('value', ...) instead.","","2.0");
return this.set("value",_b);
},_setValueAttr:function(_c){
_c=dojo.trim(_c);
var _d=this.renderAsHtml?_c:_c.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;").replace(/\n/g,"<br>");
this.displayNode.innerHTML=_d||this.noValueIndicator;
this._set("value",_c);
if(this._started){
setTimeout(dojo.hitch(this,"onChange",_c),0);
}
},getValue:function(){
dojo.deprecated("dijit.InlineEditBox.getValue() is deprecated.  Use get('value') instead.","","2.0");
return this.get("value");
},cancel:function(_e){
if(this.disabled||!this.editing){
return;
}
this.editing=false;
setTimeout(dojo.hitch(this,"onCancel"),0);
this._showText(_e);
}});
dojo.declare("dijit._InlineEditor",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dijit","templates/InlineEditBox.html","<span data-dojo-attach-point=\"editNode\" role=\"presentation\" style=\"position: absolute; visibility:hidden\" class=\"dijitReset dijitInline\"\n\tdata-dojo-attach-event=\"onkeypress: _onKeyPress\"\n\t><span data-dojo-attach-point=\"editorPlaceholder\"></span\n\t><span data-dojo-attach-point=\"buttonContainer\"\n\t\t><button data-dojo-type=\"dijit.form.Button\" data-dojo-props=\"label: '${buttonSave}', 'class': 'saveButton'\"\n\t\t\tdata-dojo-attach-point=\"saveButton\" data-dojo-attach-event=\"onClick:save\"></button\n\t\t><button data-dojo-type=\"dijit.form.Button\"  data-dojo-props=\"label: '${buttonCancel}', 'class': 'cancelButton'\"\n\t\t\tdata-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:cancel\"></button\n\t></span\n></span>\n"),widgetsInTemplate:true,postMixInProperties:function(){
this.inherited(arguments);
this.messages=dojo.i18n.getLocalization("dijit","common",this.lang);
dojo.forEach(["buttonSave","buttonCancel"],function(_f){
if(!this[_f]){
this[_f]=this.messages[_f];
}
},this);
},buildRendering:function(){
this.inherited(arguments);
var cls=typeof this.editor=="string"?dojo.getObject(this.editor):this.editor;
var _10=this.sourceStyle,_11="line-height:"+_10.lineHeight+";",_12=dojo.getComputedStyle(this.domNode);
dojo.forEach(["Weight","Family","Size","Style"],function(_13){
var _14=_10["font"+_13],_15=_12["font"+_13];
if(_15!=_14){
_11+="font-"+_13+":"+_10["font"+_13]+";";
}
},this);
dojo.forEach(["marginTop","marginBottom","marginLeft","marginRight"],function(_16){
this.domNode.style[_16]=_10[_16];
},this);
var _17=this.inlineEditBox.width;
if(_17=="100%"){
_11+="width:100%;";
this.domNode.style.display="block";
}else{
_11+="width:"+(_17+(Number(_17)==_17?"px":""))+";";
}
var _18=dojo.delegate(this.inlineEditBox.editorParams,{style:_11,dir:this.dir,lang:this.lang});
_18["displayedValue" in cls.prototype?"displayedValue":"value"]=this.value;
this.editWidget=new cls(_18,this.editorPlaceholder);
if(this.inlineEditBox.autoSave){
dojo.destroy(this.buttonContainer);
}
},postCreate:function(){
this.inherited(arguments);
var ew=this.editWidget;
if(this.inlineEditBox.autoSave){
this.connect(ew,"onChange","_onChange");
this.connect(ew,"onKeyPress","_onKeyPress");
}else{
if("intermediateChanges" in ew){
ew.set("intermediateChanges",true);
this.connect(ew,"onChange","_onIntermediateChange");
this.saveButton.set("disabled",true);
}
}
},_onIntermediateChange:function(val){
this.saveButton.set("disabled",(this.getValue()==this._resetValue)||!this.enableSave());
},destroy:function(){
this.editWidget.destroy(true);
this.inherited(arguments);
},getValue:function(){
var ew=this.editWidget;
return String(ew.get("displayedValue" in ew?"displayedValue":"value"));
},_onKeyPress:function(e){
if(this.inlineEditBox.autoSave&&this.inlineEditBox.editing){
if(e.altKey||e.ctrlKey){
return;
}
if(e.charOrCode==dojo.keys.ESCAPE){
dojo.stopEvent(e);
this.cancel(true);
}else{
if(e.charOrCode==dojo.keys.ENTER&&e.target.tagName=="INPUT"){
dojo.stopEvent(e);
this._onChange();
}
}
}
},_onBlur:function(){
this.inherited(arguments);
if(this.inlineEditBox.autoSave&&this.inlineEditBox.editing){
if(this.getValue()==this._resetValue){
this.cancel(false);
}else{
if(this.enableSave()){
this.save(false);
}
}
}
},_onChange:function(){
if(this.inlineEditBox.autoSave&&this.inlineEditBox.editing&&this.enableSave()){
dojo.style(this.inlineEditBox.displayNode,{display:""});
dijit.focus(this.inlineEditBox.displayNode);
}
},enableSave:function(){
return (this.editWidget.isValid?this.editWidget.isValid():true);
},focus:function(){
this.editWidget.focus();
setTimeout(dojo.hitch(this,function(){
if(this.editWidget.focusNode&&this.editWidget.focusNode.tagName=="INPUT"){
dijit.selectInputText(this.editWidget.focusNode);
}
}),0);
}});
}
