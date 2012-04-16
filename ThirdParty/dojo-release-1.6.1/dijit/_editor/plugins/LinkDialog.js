/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.LinkDialog"]){
dojo._hasResource["dijit._editor.plugins.LinkDialog"]=true;
dojo.provide("dijit._editor.plugins.LinkDialog");
dojo.require("dijit._Widget");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit.form.Select");
dojo.require("dijit._editor.range");
dojo.require("dojo.i18n");
dojo.require("dojo.string");
dojo.requireLocalization("dijit","common",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.requireLocalization("dijit._editor","LinkDialog",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit._editor.plugins.LinkDialog",dijit._editor._Plugin,{buttonClass:dijit.form.DropDownButton,useDefaultCommand:false,urlRegExp:"((https?|ftps?|file)\\://|./|/|)(/[a-zA-Z]{1,1}:/|)(((?:(?:[\\da-zA-Z](?:[-\\da-zA-Z]{0,61}[\\da-zA-Z])?)\\.)*(?:[a-zA-Z](?:[-\\da-zA-Z]{0,80}[\\da-zA-Z])?)\\.?)|(((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])|(0[xX]0*[\\da-fA-F]?[\\da-fA-F]\\.){3}0[xX]0*[\\da-fA-F]?[\\da-fA-F]|(0+[0-3][0-7][0-7]\\.){3}0+[0-3][0-7][0-7]|(0|[1-9]\\d{0,8}|[1-3]\\d{9}|4[01]\\d{8}|42[0-8]\\d{7}|429[0-3]\\d{6}|4294[0-8]\\d{5}|42949[0-5]\\d{4}|429496[0-6]\\d{3}|4294967[01]\\d{2}|42949672[0-8]\\d|429496729[0-5])|0[xX]0*[\\da-fA-F]{1,8}|([\\da-fA-F]{1,4}\\:){7}[\\da-fA-F]{1,4}|([\\da-fA-F]{1,4}\\:){6}((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])))(\\:\\d+)?(/(?:[^?#\\s/]+/)*(?:[^?#\\s/]{0,}(?:\\?[^?#\\s/]*)?(?:#.*)?)?)?",emailRegExp:"<?(mailto\\:)([!#-'*+\\-\\/-9=?A-Z^-~]+[.])*[!#-'*+\\-\\/-9=?A-Z^-~]+"+"@"+"((?:(?:[\\da-zA-Z](?:[-\\da-zA-Z]{0,61}[\\da-zA-Z])?)\\.)+(?:[a-zA-Z](?:[-\\da-zA-Z]{0,6}[\\da-zA-Z])?)\\.?)|localhost|^[^-][a-zA-Z0-9_-]*>?",htmlTemplate:"<a href=\"${urlInput}\" _djrealurl=\"${urlInput}\""+" target=\"${targetSelect}\""+">${textInput}</a>",tag:"a",_hostRxp:new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$"),_userAtRxp:new RegExp("^([!#-'*+\\-\\/-9=?A-Z^-~]+[.])*[!#-'*+\\-\\/-9=?A-Z^-~]+@","i"),linkDialogTemplate:["<table><tr><td>","<label for='${id}_urlInput'>${url}</label>","</td><td>","<input dojoType='dijit.form.ValidationTextBox' required='true' "+"id='${id}_urlInput' name='urlInput' intermediateChanges='true'/>","</td></tr><tr><td>","<label for='${id}_textInput'>${text}</label>","</td><td>","<input dojoType='dijit.form.ValidationTextBox' required='true' id='${id}_textInput' "+"name='textInput' intermediateChanges='true'/>","</td></tr><tr><td>","<label for='${id}_targetSelect'>${target}</label>","</td><td>","<select id='${id}_targetSelect' name='targetSelect' dojoType='dijit.form.Select'>","<option selected='selected' value='_self'>${currentWindow}</option>","<option value='_blank'>${newWindow}</option>","<option value='_top'>${topWindow}</option>","<option value='_parent'>${parentWindow}</option>","</select>","</td></tr><tr><td colspan='2'>","<button dojoType='dijit.form.Button' type='submit' id='${id}_setButton'>${set}</button>","<button dojoType='dijit.form.Button' type='button' id='${id}_cancelButton'>${buttonCancel}</button>","</td></tr></table>"].join(""),_initButton:function(){
var _1=this;
this.tag=this.command=="insertImage"?"img":"a";
var _2=dojo.mixin(dojo.i18n.getLocalization("dijit","common",this.lang),dojo.i18n.getLocalization("dijit._editor","LinkDialog",this.lang));
var _3=(this.dropDown=new dijit.TooltipDialog({title:_2[this.command+"Title"],execute:dojo.hitch(this,"setValue"),onOpen:function(){
_1._onOpenDialog();
dijit.TooltipDialog.prototype.onOpen.apply(this,arguments);
},onCancel:function(){
setTimeout(dojo.hitch(_1,"_onCloseDialog"),0);
}}));
_2.urlRegExp=this.urlRegExp;
_2.id=dijit.getUniqueId(this.editor.id);
this._uniqueId=_2.id;
this._setContent(_3.title+"<div style='border-bottom: 1px black solid;padding-bottom:2pt;margin-bottom:4pt'></div>"+dojo.string.substitute(this.linkDialogTemplate,_2));
_3.startup();
this._urlInput=dijit.byId(this._uniqueId+"_urlInput");
this._textInput=dijit.byId(this._uniqueId+"_textInput");
this._setButton=dijit.byId(this._uniqueId+"_setButton");
this.connect(dijit.byId(this._uniqueId+"_cancelButton"),"onClick",function(){
this.dropDown.onCancel();
});
if(this._urlInput){
this.connect(this._urlInput,"onChange","_checkAndFixInput");
}
if(this._textInput){
this.connect(this._textInput,"onChange","_checkAndFixInput");
}
this._urlRegExp=new RegExp("^"+this.urlRegExp+"$","i");
this._emailRegExp=new RegExp("^"+this.emailRegExp+"$","i");
this._urlInput.isValid=dojo.hitch(this,function(){
var _4=this._urlInput.get("value");
return this._urlRegExp.test(_4)||this._emailRegExp.test(_4);
});
this._connectTagEvents();
this.inherited(arguments);
},_checkAndFixInput:function(){
var _5=this;
var _6=this._urlInput.get("value");
var _7=function(_8){
var _9=false;
var _a=false;
if(_8&&_8.length>1){
_8=dojo.trim(_8);
if(_8.indexOf("mailto:")!==0){
if(_8.indexOf("/")>0){
if(_8.indexOf("://")===-1){
if(_8.charAt(0)!=="/"&&_8.indexOf("./")!==0){
if(_5._hostRxp.test(_8)){
_9=true;
}
}
}
}else{
if(_5._userAtRxp.test(_8)){
_a=true;
}
}
}
}
if(_9){
_5._urlInput.set("value","http://"+_8);
}
if(_a){
_5._urlInput.set("value","mailto:"+_8);
}
_5._setButton.set("disabled",!_5._isValid());
};
if(this._delayedCheck){
clearTimeout(this._delayedCheck);
this._delayedCheck=null;
}
this._delayedCheck=setTimeout(function(){
_7(_6);
},250);
},_connectTagEvents:function(){
this.editor.onLoadDeferred.addCallback(dojo.hitch(this,function(){
this.connect(this.editor.editNode,"ondblclick",this._onDblClick);
}));
},_isValid:function(){
return this._urlInput.isValid()&&this._textInput.isValid();
},_setContent:function(_b){
this.dropDown.set({parserScope:"dojo",content:_b});
},_checkValues:function(_c){
if(_c&&_c.urlInput){
_c.urlInput=_c.urlInput.replace(/"/g,"&quot;");
}
return _c;
},setValue:function(_d){
this._onCloseDialog();
if(dojo.isIE<9){
var _e=dijit.range.getSelection(this.editor.window);
var _f=_e.getRangeAt(0);
var a=_f.endContainer;
if(a.nodeType===3){
a=a.parentNode;
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()!==this.tag)){
a=dojo.withGlobal(this.editor.window,"getSelectedElement",dijit._editor.selection,[this.tag]);
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()===this.tag)){
if(this.editor.queryCommandEnabled("unlink")){
dojo.withGlobal(this.editor.window,"selectElementChildren",dijit._editor.selection,[a]);
this.editor.execCommand("unlink");
}
}
}
_d=this._checkValues(_d);
this.editor.execCommand("inserthtml",dojo.string.substitute(this.htmlTemplate,_d));
},_onCloseDialog:function(){
this.editor.focus();
},_getCurrentValues:function(a){
var url,_10,_11;
if(a&&a.tagName.toLowerCase()===this.tag){
url=a.getAttribute("_djrealurl")||a.getAttribute("href");
_11=a.getAttribute("target")||"_self";
_10=a.textContent||a.innerText;
dojo.withGlobal(this.editor.window,"selectElement",dijit._editor.selection,[a,true]);
}else{
_10=dojo.withGlobal(this.editor.window,dijit._editor.selection.getSelectedText);
}
return {urlInput:url||"",textInput:_10||"",targetSelect:_11||""};
},_onOpenDialog:function(){
var a;
if(dojo.isIE<9){
var sel=dijit.range.getSelection(this.editor.window);
var _12=sel.getRangeAt(0);
a=_12.endContainer;
if(a.nodeType===3){
a=a.parentNode;
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()!==this.tag)){
a=dojo.withGlobal(this.editor.window,"getSelectedElement",dijit._editor.selection,[this.tag]);
}
}else{
a=dojo.withGlobal(this.editor.window,"getAncestorElement",dijit._editor.selection,[this.tag]);
}
this.dropDown.reset();
this._setButton.set("disabled",true);
this.dropDown.set("value",this._getCurrentValues(a));
},_onDblClick:function(e){
if(e&&e.target){
var t=e.target;
var tg=t.tagName?t.tagName.toLowerCase():"";
if(tg===this.tag&&dojo.attr(t,"href")){
dojo.withGlobal(this.editor.window,"selectElement",dijit._editor.selection,[t]);
this.editor.onDisplayChanged();
setTimeout(dojo.hitch(this,function(){
this.button.set("disabled",false);
this.button.openDropDown();
}),10);
}
}
}});
dojo.declare("dijit._editor.plugins.ImgLinkDialog",[dijit._editor.plugins.LinkDialog],{linkDialogTemplate:["<table><tr><td>","<label for='${id}_urlInput'>${url}</label>","</td><td>","<input dojoType='dijit.form.ValidationTextBox' regExp='${urlRegExp}' "+"required='true' id='${id}_urlInput' name='urlInput' intermediateChanges='true'/>","</td></tr><tr><td>","<label for='${id}_textInput'>${text}</label>","</td><td>","<input dojoType='dijit.form.ValidationTextBox' required='false' id='${id}_textInput' "+"name='textInput' intermediateChanges='true'/>","</td></tr><tr><td>","</td><td>","</td></tr><tr><td colspan='2'>","<button dojoType='dijit.form.Button' type='submit' id='${id}_setButton'>${set}</button>","<button dojoType='dijit.form.Button' type='button' id='${id}_cancelButton'>${buttonCancel}</button>","</td></tr></table>"].join(""),htmlTemplate:"<img src=\"${urlInput}\" _djrealurl=\"${urlInput}\" alt=\"${textInput}\" />",tag:"img",_getCurrentValues:function(img){
var url,_13;
if(img&&img.tagName.toLowerCase()===this.tag){
url=img.getAttribute("_djrealurl")||img.getAttribute("src");
_13=img.getAttribute("alt");
dojo.withGlobal(this.editor.window,"selectElement",dijit._editor.selection,[img,true]);
}else{
_13=dojo.withGlobal(this.editor.window,dijit._editor.selection.getSelectedText);
}
return {urlInput:url||"",textInput:_13||""};
},_isValid:function(){
return this._urlInput.isValid();
},_connectTagEvents:function(){
this.inherited(arguments);
this.editor.onLoadDeferred.addCallback(dojo.hitch(this,function(){
this.connect(this.editor.editNode,"onmousedown",this._selectTag);
}));
},_selectTag:function(e){
if(e&&e.target){
var t=e.target;
var tg=t.tagName?t.tagName.toLowerCase():"";
if(tg===this.tag){
dojo.withGlobal(this.editor.window,"selectElement",dijit._editor.selection,[t]);
}
}
},_checkValues:function(_14){
if(_14&&_14.urlInput){
_14.urlInput=_14.urlInput.replace(/"/g,"&quot;");
}
if(_14&&_14.textInput){
_14.textInput=_14.textInput.replace(/"/g,"&quot;");
}
return _14;
},_onDblClick:function(e){
if(e&&e.target){
var t=e.target;
var tg=t.tagName?t.tagName.toLowerCase():"";
if(tg===this.tag&&dojo.attr(t,"src")){
dojo.withGlobal(this.editor.window,"selectElement",dijit._editor.selection,[t]);
this.editor.onDisplayChanged();
setTimeout(dojo.hitch(this,function(){
this.button.set("disabled",false);
this.button.openDropDown();
}),10);
}
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
switch(o.args.name){
case "createLink":
o.plugin=new dijit._editor.plugins.LinkDialog({command:o.args.name});
break;
case "insertImage":
o.plugin=new dijit._editor.plugins.ImgLinkDialog({command:o.args.name});
break;
}
});
}
