/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.InsertAnchor"]){
dojo._hasResource["dojox.editor.plugins.InsertAnchor"]=true;
dojo.provide("dojox.editor.plugins.InsertAnchor");
dojo.require("dojo.string");
dojo.require("dijit._Widget");
dojo.require("dijit._editor.range");
dojo.require("dijit._Templated");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit.form.Select");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojox.editor.plugins.ToolbarLineBreak");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","InsertAnchor",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.requireLocalization("dijit","common",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins.InsertAnchor",dijit._editor._Plugin,{htmlTemplate:"<a name=\"${anchorInput}\" class=\"dijitEditorPluginInsertAnchorStyle\">${textInput}</a>",iconClassPrefix:"dijitAdditionalEditorIcon",_template:["<table><tr><td>","<label for='${id}_anchorInput'>${anchor}</label>","</td><td>","<input dojoType='dijit.form.ValidationTextBox' required='true' "+"id='${id}_anchorInput' name='anchorInput' intermediateChanges='true'>","</td></tr><tr><td>","<label for='${id}_textInput'>${text}</label>","</td><td>","<input dojoType='dijit.form.ValidationTextBox' required='true' id='${id}_textInput' "+"name='textInput' intermediateChanges='true'>","</td></tr>","<tr><td colspan='2'>","<button dojoType='dijit.form.Button' type='submit' id='${id}_setButton'>${set}</button>","<button dojoType='dijit.form.Button' type='button' id='${id}_cancelButton'>${cancel}</button>","</td></tr></table>"].join(""),_initButton:function(){
var _1=this;
var _2=dojo.i18n.getLocalization("dojox.editor.plugins","InsertAnchor",this.lang);
var _3=(this.dropDown=new dijit.TooltipDialog({title:_2["title"],execute:dojo.hitch(this,"setValue"),onOpen:function(){
_1._onOpenDialog();
dijit.TooltipDialog.prototype.onOpen.apply(this,arguments);
},onCancel:function(){
setTimeout(dojo.hitch(_1,"_onCloseDialog"),0);
}}));
this.button=new dijit.form.DropDownButton({label:_2["insertAnchor"],showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"InsertAnchor",tabIndex:"-1",dropDown:this.dropDown});
_2.id=dijit.getUniqueId(this.editor.id);
this._uniqueId=_2.id;
this.dropDown.set("content",_3.title+"<div style='border-bottom: 1px black solid;padding-bottom:2pt;margin-bottom:4pt'></div>"+dojo.string.substitute(this._template,_2));
_3.startup();
this._anchorInput=dijit.byId(this._uniqueId+"_anchorInput");
this._textInput=dijit.byId(this._uniqueId+"_textInput");
this._setButton=dijit.byId(this._uniqueId+"_setButton");
this.connect(dijit.byId(this._uniqueId+"_cancelButton"),"onClick",function(){
this.dropDown.onCancel();
});
if(this._anchorInput){
this.connect(this._anchorInput,"onChange","_checkInput");
}
if(this._textInput){
this.connect(this._anchorInput,"onChange","_checkInput");
}
this.editor.contentDomPreFilters.push(dojo.hitch(this,this._preDomFilter));
this.editor.contentDomPostFilters.push(dojo.hitch(this,this._postDomFilter));
this._setup();
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},setEditor:function(_4){
this.editor=_4;
this._initButton();
},_checkInput:function(){
var _5=true;
if(this._anchorInput.isValid()){
_5=false;
}
this._setButton.set("disabled",_5);
},_setup:function(){
this.editor.onLoadDeferred.addCallback(dojo.hitch(this,function(){
this.connect(this.editor.editNode,"ondblclick",this._onDblClick);
setTimeout(dojo.hitch(this,function(){
this._applyStyles();
}),100);
}));
},getAnchorStyle:function(){
var _6="@media screen {\n"+"\t.dijitEditorPluginInsertAnchorStyle {\n"+"\t\tbackground-image: url({MODURL}/images/anchor.gif);\n"+"\t\tbackground-repeat: no-repeat;\n"+"\t\tbackground-position: top left;\n"+"\t\tborder-width: 1px;\n"+"\t\tborder-style: dashed;\n"+"\t\tborder-color: #D0D0D0;\n"+"\t\tpadding-left: 20px;\n"+"\t}\n"+"}\n";
var _7=dojo.moduleUrl(dojox._scopeName,"editor/plugins/resources").toString();
if(!(_7.match(/^https?:\/\//i))&&!(_7.match(/^file:\/\//i))){
var _8;
if(_7.charAt(0)==="/"){
var _9=dojo.doc.location.protocol;
var _a=dojo.doc.location.host;
_8=_9+"//"+_a;
}else{
_8=this._calcBaseUrl(dojo.global.location.href);
}
if(_8[_8.length-1]!=="/"&&_7.charAt(0)!=="/"){
_8+="/";
}
_7=_8+_7;
}
return _6.replace(/\{MODURL\}/gi,_7);
},_applyStyles:function(){
if(!this._styled){
try{
this._styled=true;
var _b=this.editor.document;
var _c=this.getAnchorStyle();
if(!dojo.isIE){
var _d=_b.createElement("style");
_d.appendChild(_b.createTextNode(_c));
_b.getElementsByTagName("head")[0].appendChild(_d);
}else{
var ss=_b.createStyleSheet("");
ss.cssText=_c;
}
}
catch(e){
}
}
},_calcBaseUrl:function(_e){
var _f=null;
if(_e!==null){
var _10=_e.indexOf("?");
if(_10!=-1){
_e=_e.substring(0,_10);
}
_10=_e.lastIndexOf("/");
if(_10>0&&_10<_e.length){
_f=_e.substring(0,_10);
}else{
_f=_e;
}
}
return _f;
},_checkValues:function(_11){
if(_11){
if(_11.anchorInput){
_11.anchorInput=_11.anchorInput.replace(/"/g,"&quot;");
}
if(!_11.textInput){
_11.textInput="&nbsp;";
}
}
return _11;
},setValue:function(_12){
this._onCloseDialog();
if(!this.editor.window.getSelection){
var sel=dijit.range.getSelection(this.editor.window);
var _13=sel.getRangeAt(0);
var a=_13.endContainer;
if(a.nodeType===3){
a=a.parentNode;
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()!=="a")){
a=dojo.withGlobal(this.editor.window,"getSelectedElement",dijit._editor.selection,["a"]);
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()==="a")){
if(this.editor.queryCommandEnabled("unlink")){
dojo.withGlobal(this.editor.window,"selectElementChildren",dijit._editor.selection,[a]);
this.editor.execCommand("unlink");
}
}
}
_12=this._checkValues(_12);
this.editor.execCommand("inserthtml",dojo.string.substitute(this.htmlTemplate,_12));
},_onCloseDialog:function(){
this.editor.focus();
},_getCurrentValues:function(a){
var _14,_15;
if(a&&a.tagName.toLowerCase()==="a"&&dojo.attr(a,"name")){
_14=dojo.attr(a,"name");
_15=a.textContent||a.innerText;
dojo.withGlobal(this.editor.window,"selectElement",dijit._editor.selection,[a,true]);
}else{
_15=dojo.withGlobal(this.editor.window,dijit._editor.selection.getSelectedText);
}
return {anchorInput:_14||"",textInput:_15||""};
},_onOpenDialog:function(){
var a;
if(!this.editor.window.getSelection){
var sel=dijit.range.getSelection(this.editor.window);
var _16=sel.getRangeAt(0);
a=_16.endContainer;
if(a.nodeType===3){
a=a.parentNode;
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()!=="a")){
a=dojo.withGlobal(this.editor.window,"getSelectedElement",dijit._editor.selection,["a"]);
}
}else{
a=dojo.withGlobal(this.editor.window,"getAncestorElement",dijit._editor.selection,["a"]);
}
this.dropDown.reset();
this._setButton.set("disabled",true);
this.dropDown.set("value",this._getCurrentValues(a));
},_onDblClick:function(e){
if(e&&e.target){
var t=e.target;
var tg=t.tagName?t.tagName.toLowerCase():"";
if(tg==="a"&&dojo.attr(t,"name")){
this.editor.onDisplayChanged();
dojo.withGlobal(this.editor.window,"selectElement",dijit._editor.selection,[t]);
setTimeout(dojo.hitch(this,function(){
this.button.set("disabled",false);
this.button.openDropDown();
}),10);
}
}
},_preDomFilter:function(_17){
var ed=this.editor;
dojo.withGlobal(ed.window,function(){
dojo.query("a",ed.editNode).forEach(function(a){
if(dojo.attr(a,"name")&&!dojo.attr(a,"href")){
if(!dojo.hasClass(a,"dijitEditorPluginInsertAnchorStyle")){
dojo.addClass(a,"dijitEditorPluginInsertAnchorStyle");
}
}
});
});
},_postDomFilter:function(_18){
var ed=this.editor;
dojo.withGlobal(ed.window,function(){
dojo.query("a",_18).forEach(function(a){
if(dojo.attr(a,"name")&&!dojo.attr(a,"href")){
if(dojo.hasClass(a,"dijitEditorPluginInsertAnchorStyle")){
dojo.removeClass(a,"dijitEditorPluginInsertAnchorStyle");
}
}
});
});
return _18;
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _19=o.args.name;
if(_19){
_19=_19.toLowerCase();
}
if(_19==="insertanchor"){
o.plugin=new dojox.editor.plugins.InsertAnchor();
}
});
}
