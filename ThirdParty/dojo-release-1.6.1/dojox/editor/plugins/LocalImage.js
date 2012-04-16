/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.LocalImage"]){
dojo._hasResource["dojox.editor.plugins.LocalImage"]=true;
dojo.provide("dojox.editor.plugins.LocalImage");
dojo.require("dijit._editor.plugins.LinkDialog");
dojo.require("dojox.form.FileUploader");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","LocalImage",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins.LocalImage",dijit._editor.plugins.ImgLinkDialog,{uploadable:false,uploadUrl:"",baseImageUrl:"",fileMask:"*.jpg;*.jpeg;*.gif;*.png;*.bmp",urlRegExp:"",_fileUploader:null,htmlFieldName:"uploadedfile",_isLocalFile:false,_messages:"",_cssPrefix:"dijitEditorEilDialog",_closable:true,linkDialogTemplate:["<div style='border-bottom: 1px solid black; padding-bottom: 2pt; margin-bottom: 4pt;'></div>","<div class='dijitEditorEilDialogDescription'>${prePopuTextUrl}${prePopuTextBrowse}</div>","<table><tr><td colspan='2'>","<label for='${id}_urlInput' title='${prePopuTextUrl}${prePopuTextBrowse}'>${url}</label>","</td></tr><tr><td class='dijitEditorEilDialogField'>","<input dojoType='dijit.form.ValidationTextBox' class='dijitEditorEilDialogField'"+"regExp='${urlRegExp}' title='${prePopuTextUrl}${prePopuTextBrowse}'  selectOnClick='true' required='true' "+"id='${id}_urlInput' name='urlInput' intermediateChanges='true' invalidMessage='${invalidMessage}' "+"prePopuText='&lt;${prePopuTextUrl}${prePopuTextBrowse}&gt'>","</td><td>","<div id='${id}_browse' style='display:${uploadable}'>${browse}</div>","</td></tr><tr><td colspan='2'>","<label for='${id}_textInput'>${text}</label>","</td></tr><tr><td>","<input dojoType='dijit.form.TextBox' required='false' id='${id}_textInput' "+"name='textInput' intermediateChanges='true' selectOnClick='true' class='dijitEditorEilDialogField'>","</td><td></td></tr><tr><td>","</td><td>","</td></tr><tr><td colspan='2'>","<button dojoType='dijit.form.Button' id='${id}_setButton'>${set}</button>","</td></tr></table>"].join(""),_initButton:function(){
var _1=this,_2=this._messages=dojo.i18n.getLocalization("dojox.editor.plugins","LocalImage");
this.tag="img";
var _3=(this.dropDown=new dijit.TooltipDialog({title:_2[this.command+"Title"],onOpen:function(){
_1._initialFileUploader();
_1._onOpenDialog();
dijit.TooltipDialog.prototype.onOpen.apply(this,arguments);
setTimeout(function(){
dijit.selectInputText(_1._urlInput.textbox);
_1._urlInput.isLoadComplete=true;
},0);
},onClose:function(){
dojo.disconnect(_1.blurHandler);
_1.blurHandler=null;
this.onHide();
},onCancel:function(){
setTimeout(dojo.hitch(_1,"_onCloseDialog"),0);
}}));
var _4=this.getLabel(this.command),_5=this.iconClassPrefix+" "+this.iconClassPrefix+this.command.charAt(0).toUpperCase()+this.command.substr(1),_6=dojo.mixin({label:_4,showLabel:false,iconClass:_5,dropDown:this.dropDown,tabIndex:"-1"},this.params||{});
if(!dojo.isIE&&(!dojo.isFF||dojo.isFF<4)){
_6.closeDropDown=function(_7){
if(_1._closable){
if(this._opened){
dijit.popup.close(this.dropDown);
if(_7){
this.focus();
}
this._opened=false;
this.state="";
}
}
setTimeout(function(){
_1._closable=true;
},10);
};
}
this.button=new dijit.form.DropDownButton(_6);
var _8=this.fileMask.split(";"),_9="";
dojo.forEach(_8,function(m){
m=m.replace(/\./,"\\.").replace(/\*/g,".*");
_9+="|"+m+"|"+m.toUpperCase();
});
_2.urlRegExp=this.urlRegExp=_9.substring(1);
if(!this.uploadable){
_2["prePopuTextBrowse"]=".";
}
_2.id=dijit.getUniqueId(this.editor.id);
_2.uploadable=this.uploadable?"inline":"none";
this._uniqueId=_2.id;
this._setContent("<div class='"+this._cssPrefix+"Title'>"+_3.title+"</div>"+dojo.string.substitute(this.linkDialogTemplate,_2));
_3.startup();
var _a=this._urlInput=dijit.byId(this._uniqueId+"_urlInput");
this._textInput=dijit.byId(this._uniqueId+"_textInput");
this._setButton=dijit.byId(this._uniqueId+"_setButton");
if(_a){
var pt=dijit.form.ValidationTextBox.prototype;
_a=dojo.mixin(_a,{isLoadComplete:false,isValid:function(_b){
if(this.isLoadComplete){
return pt.isValid.apply(this,arguments);
}else{
return this.get("value").length>0;
}
},reset:function(){
this.isLoadComplete=false;
pt.reset.apply(this,arguments);
}});
this.connect(_a,"onKeyDown","_cancelFileUpload");
this.connect(_a,"onChange","_checkAndFixInput");
}
if(this._setButton){
this.connect(this._setButton,"onClick","_checkAndSetValue");
}
this._connectTagEvents();
},_initialFileUploader:function(){
var _c=null,_d=this,_e=_d._uniqueId,_f=_e+"_browse",_10=_d._urlInput;
if(_d.uploadable&&!_d._fileUploader){
_c=_d._fileUploader=new dojox.form.FileUploader({force:"html",uploadUrl:_d.uploadUrl,htmlFieldName:_d.htmlFieldName,uploadOnChange:false,selectMultipleFiles:false,showProgress:true},_f);
_c.reset=function(){
_d._isLocalFile=false;
_c._resetHTML();
};
_d.connect(_c,"onClick",function(){
_10.validate(false);
if(!dojo.isIE&&(!dojo.isFF||dojo.isFF<4)){
_d._closable=false;
}
});
_d.connect(_c,"onChange",function(_11){
_d._isLocalFile=true;
_10.set("value",_11[0].name);
_10.focus();
});
_d.connect(_c,"onComplete",function(_12){
var _13=_d.baseImageUrl;
_13=_13&&_13.charAt(_13.length-1)=="/"?_13:_13+"/";
_10.set("value",_13+_12[0].file);
_d._isLocalFile=false;
_d._setDialogStatus(true);
_d.setValue(_d.dropDown.get("value"));
});
_d.connect(_c,"onError",function(_14){
_d._setDialogStatus(true);
});
}
},_checkAndFixInput:function(){
this._setButton.set("disabled",!this._isValid());
},_isValid:function(){
return this._urlInput.isValid();
},_cancelFileUpload:function(){
this._fileUploader.reset();
this._isLocalFile=false;
},_checkAndSetValue:function(){
if(this._fileUploader&&this._isLocalFile){
this._setDialogStatus(false);
this._fileUploader.upload();
}else{
this.setValue(this.dropDown.get("value"));
}
},_setDialogStatus:function(_15){
this._urlInput.set("disabled",!_15);
this._textInput.set("disabled",!_15);
this._setButton.set("disabled",!_15);
},destroy:function(){
this.inherited(arguments);
if(this._fileUploader){
this._fileUploader.destroy();
this._fileUploader=null;
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _16=o.args.name.toLowerCase();
if(_16==="localimage"){
o.plugin=new dojox.editor.plugins.LocalImage({command:"insertImage",uploadable:("uploadable" in o.args)?o.args.uploadable:false,uploadUrl:("uploadable" in o.args&&"uploadUrl" in o.args)?o.args.uploadUrl:"",htmlFieldName:("uploadable" in o.args&&"htmlFieldName" in o.args)?o.args.htmlFieldName:"uploadedfile",baseImageUrl:("uploadable" in o.args&&"baseImageUrl" in o.args)?o.args.baseImageUrl:"",fileMask:("fileMask" in o.args)?o.args.fileMask:"*.jpg;*.jpeg;*.gif;*.png;*.bmp"});
}
});
}
