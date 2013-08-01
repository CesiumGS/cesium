//>>built
define("dijit/_editor/plugins/LinkDialog",["require","dojo/_base/declare","dojo/dom-attr","dojo/keys","dojo/_base/lang","dojo/on","dojo/sniff","dojo/query","dojo/string","../../_Widget","../_Plugin","../../form/DropDownButton","../range"],function(_1,_2,_3,_4,_5,on,_6,_7,_8,_9,_a,_b,_c){
var _d=_2("dijit._editor.plugins.LinkDialog",_a,{buttonClass:_b,useDefaultCommand:false,urlRegExp:"((https?|ftps?|file)\\://|./|../|/|)(/[a-zA-Z]{1,1}:/|)(((?:(?:[\\da-zA-Z](?:[-\\da-zA-Z]{0,61}[\\da-zA-Z])?)\\.)*(?:[a-zA-Z](?:[-\\da-zA-Z]{0,80}[\\da-zA-Z])?)\\.?)|(((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])|(0[xX]0*[\\da-fA-F]?[\\da-fA-F]\\.){3}0[xX]0*[\\da-fA-F]?[\\da-fA-F]|(0+[0-3][0-7][0-7]\\.){3}0+[0-3][0-7][0-7]|(0|[1-9]\\d{0,8}|[1-3]\\d{9}|4[01]\\d{8}|42[0-8]\\d{7}|429[0-3]\\d{6}|4294[0-8]\\d{5}|42949[0-5]\\d{4}|429496[0-6]\\d{3}|4294967[01]\\d{2}|42949672[0-8]\\d|429496729[0-5])|0[xX]0*[\\da-fA-F]{1,8}|([\\da-fA-F]{1,4}\\:){7}[\\da-fA-F]{1,4}|([\\da-fA-F]{1,4}\\:){6}((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])))(\\:\\d+)?(/(?:[^?#\\s/]+/)*(?:[^?#\\s/]{0,}(?:\\?[^?#\\s/]*)?(?:#.*)?)?)?",emailRegExp:"<?(mailto\\:)([!#-'*+\\-\\/-9=?A-Z^-~]+[.])*[!#-'*+\\-\\/-9=?A-Z^-~]+"+"@"+"((?:(?:[\\da-zA-Z](?:[-\\da-zA-Z]{0,61}[\\da-zA-Z])?)\\.)+(?:[a-zA-Z](?:[-\\da-zA-Z]{0,6}[\\da-zA-Z])?)\\.?)|localhost|^[^-][a-zA-Z0-9_-]*>?",htmlTemplate:"<a href=\"${urlInput}\" _djrealurl=\"${urlInput}\""+" target=\"${targetSelect}\""+">${textInput}</a>",tag:"a",_hostRxp:/^((([^\[:]+):)?([^@]+)@)?(\[([^\]]+)\]|([^\[:]*))(:([0-9]+))?$/,_userAtRxp:/^([!#-'*+\-\/-9=?A-Z^-~]+[.])*[!#-'*+\-\/-9=?A-Z^-~]+@/i,linkDialogTemplate:["<table role='presentation'><tr><td>","<label for='${id}_urlInput'>${url}</label>","</td><td>","<input data-dojo-type='dijit.form.ValidationTextBox' required='true' "+"id='${id}_urlInput' name='urlInput' data-dojo-props='intermediateChanges:true'/>","</td></tr><tr><td>","<label for='${id}_textInput'>${text}</label>","</td><td>","<input data-dojo-type='dijit.form.ValidationTextBox' required='true' id='${id}_textInput' "+"name='textInput' data-dojo-props='intermediateChanges:true'/>","</td></tr><tr><td>","<label for='${id}_targetSelect'>${target}</label>","</td><td>","<select id='${id}_targetSelect' name='targetSelect' data-dojo-type='dijit.form.Select'>","<option selected='selected' value='_self'>${currentWindow}</option>","<option value='_blank'>${newWindow}</option>","<option value='_top'>${topWindow}</option>","<option value='_parent'>${parentWindow}</option>","</select>","</td></tr><tr><td colspan='2'>","<button data-dojo-type='dijit.form.Button' type='submit' id='${id}_setButton'>${set}</button>","<button data-dojo-type='dijit.form.Button' type='button' id='${id}_cancelButton'>${buttonCancel}</button>","</td></tr></table>"].join(""),_initButton:function(){
this.inherited(arguments);
this.button.loadDropDown=_5.hitch(this,"_loadDropDown");
this._connectTagEvents();
},_loadDropDown:function(_e){
_1(["dojo/i18n","../../TooltipDialog","../../registry","../../form/Button","../../form/Select","../../form/ValidationTextBox","dojo/i18n!../../nls/common","dojo/i18n!../nls/LinkDialog"],_5.hitch(this,function(_f,_10,_11){
var _12=this;
this.tag=this.command=="insertImage"?"img":"a";
var _13=_5.delegate(_f.getLocalization("dijit","common",this.lang),_f.getLocalization("dijit._editor","LinkDialog",this.lang));
var _14=(this.dropDown=this.button.dropDown=new _10({title:_13[this.command+"Title"],ownerDocument:this.editor.ownerDocument,dir:this.editor.dir,execute:_5.hitch(this,"setValue"),onOpen:function(){
_12._onOpenDialog();
_10.prototype.onOpen.apply(this,arguments);
},onCancel:function(){
setTimeout(_5.hitch(_12,"_onCloseDialog"),0);
}}));
_13.urlRegExp=this.urlRegExp;
_13.id=_11.getUniqueId(this.editor.id);
this._uniqueId=_13.id;
this._setContent(_14.title+"<div style='border-bottom: 1px black solid;padding-bottom:2pt;margin-bottom:4pt'></div>"+_8.substitute(this.linkDialogTemplate,_13));
_14.startup();
this._urlInput=_11.byId(this._uniqueId+"_urlInput");
this._textInput=_11.byId(this._uniqueId+"_textInput");
this._setButton=_11.byId(this._uniqueId+"_setButton");
this.own(_11.byId(this._uniqueId+"_cancelButton").on("click",_5.hitch(this.dropDown,"onCancel")));
if(this._urlInput){
this.own(this._urlInput.on("change",_5.hitch(this,"_checkAndFixInput")));
}
if(this._textInput){
this.own(this._textInput.on("change",_5.hitch(this,"_checkAndFixInput")));
}
this._urlRegExp=new RegExp("^"+this.urlRegExp+"$","i");
this._emailRegExp=new RegExp("^"+this.emailRegExp+"$","i");
this._urlInput.isValid=_5.hitch(this,function(){
var _15=this._urlInput.get("value");
return this._urlRegExp.test(_15)||this._emailRegExp.test(_15);
});
this.own(on(_14.domNode,"keydown",_5.hitch(this,_5.hitch(this,function(e){
if(e&&e.keyCode==_4.ENTER&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
if(!this._setButton.get("disabled")){
_14.onExecute();
_14.execute(_14.get("value"));
}
}
}))));
_e();
}));
},_checkAndFixInput:function(){
var _16=this;
var url=this._urlInput.get("value");
var _17=function(url){
var _18=false;
var _19=false;
if(url&&url.length>1){
url=_5.trim(url);
if(url.indexOf("mailto:")!==0){
if(url.indexOf("/")>0){
if(url.indexOf("://")===-1){
if(url.charAt(0)!=="/"&&url.indexOf("./")&&url.indexOf("../")!==0){
if(_16._hostRxp.test(url)){
_18=true;
}
}
}
}else{
if(_16._userAtRxp.test(url)){
_19=true;
}
}
}
}
if(_18){
_16._urlInput.set("value","http://"+url);
}
if(_19){
_16._urlInput.set("value","mailto:"+url);
}
_16._setButton.set("disabled",!_16._isValid());
};
if(this._delayedCheck){
clearTimeout(this._delayedCheck);
this._delayedCheck=null;
}
this._delayedCheck=setTimeout(function(){
_17(url);
},250);
},_connectTagEvents:function(){
this.editor.onLoadDeferred.then(_5.hitch(this,function(){
this.own(on(this.editor.editNode,"dblclick",_5.hitch(this,"_onDblClick")));
}));
},_isValid:function(){
return this._urlInput.isValid()&&this._textInput.isValid();
},_setContent:function(_1a){
this.dropDown.set({parserScope:"dojo",content:_1a});
},_checkValues:function(_1b){
if(_1b&&_1b.urlInput){
_1b.urlInput=_1b.urlInput.replace(/"/g,"&quot;");
}
return _1b;
},setValue:function(_1c){
this._onCloseDialog();
if(_6("ie")<9){
var sel=_c.getSelection(this.editor.window);
var _1d=sel.getRangeAt(0);
var a=_1d.endContainer;
if(a.nodeType===3){
a=a.parentNode;
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()!==this.tag)){
a=this.editor.selection.getSelectedElement(this.tag);
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()===this.tag)){
if(this.editor.queryCommandEnabled("unlink")){
this.editor.selection.selectElementChildren(a);
this.editor.execCommand("unlink");
}
}
}
_1c=this._checkValues(_1c);
this.editor.execCommand("inserthtml",_8.substitute(this.htmlTemplate,_1c));
_7("a",this.editor.document).forEach(function(a){
if(!a.innerHTML&&!_3.has(a,"name")){
a.parentNode.removeChild(a);
}
},this);
},_onCloseDialog:function(){
if(this.editor.focused){
this.editor.focus();
}
},_getCurrentValues:function(a){
var url,_1e,_1f;
if(a&&a.tagName.toLowerCase()===this.tag){
url=a.getAttribute("_djrealurl")||a.getAttribute("href");
_1f=a.getAttribute("target")||"_self";
_1e=a.textContent||a.innerText;
this.editor.selection.selectElement(a,true);
}else{
_1e=this.editor.selection.getSelectedText();
}
return {urlInput:url||"",textInput:_1e||"",targetSelect:_1f||""};
},_onOpenDialog:function(){
var a,b,fc;
if(_6("ie")){
var sel=_c.getSelection(this.editor.window);
if(sel.rangeCount){
var _20=sel.getRangeAt(0);
a=_20.endContainer;
if(a.nodeType===3){
a=a.parentNode;
}
if(a&&(a.nodeName&&a.nodeName.toLowerCase()!==this.tag)){
a=this.editor.selection.getSelectedElement(this.tag);
}
if(!a||(a.nodeName&&a.nodeName.toLowerCase()!==this.tag)){
b=this.editor.selection.getAncestorElement(this.tag);
if(b&&(b.nodeName&&b.nodeName.toLowerCase()==this.tag)){
a=b;
this.editor.selection.selectElement(a);
}else{
if(_20.startContainer===_20.endContainer){
fc=_20.startContainer.firstChild;
if(fc&&(fc.nodeName&&fc.nodeName.toLowerCase()==this.tag)){
a=fc;
this.editor.selection.selectElement(a);
}
}
}
}
}
}else{
a=this.editor.selection.getAncestorElement(this.tag);
}
this.dropDown.reset();
this._setButton.set("disabled",true);
this.dropDown.set("value",this._getCurrentValues(a));
},_onDblClick:function(e){
if(e&&e.target){
var t=e.target;
var tg=t.tagName?t.tagName.toLowerCase():"";
if(tg===this.tag&&_3.get(t,"href")){
var _21=this.editor;
this.editor.selection.selectElement(t);
_21.onDisplayChanged();
if(_21._updateTimer){
_21._updateTimer.remove();
delete _21._updateTimer;
}
_21.onNormalizedDisplayChanged();
var _22=this.button;
setTimeout(function(){
_22.set("disabled",false);
_22.loadAndOpenDropDown().then(function(){
if(_22.dropDown.focus){
_22.dropDown.focus();
}
});
},10);
}
}
}});
var _23=_2("dijit._editor.plugins.ImgLinkDialog",[_d],{linkDialogTemplate:["<table role='presentation'><tr><td>","<label for='${id}_urlInput'>${url}</label>","</td><td>","<input dojoType='dijit.form.ValidationTextBox' regExp='${urlRegExp}' "+"required='true' id='${id}_urlInput' name='urlInput' data-dojo-props='intermediateChanges:true'/>","</td></tr><tr><td>","<label for='${id}_textInput'>${text}</label>","</td><td>","<input data-dojo-type='dijit.form.ValidationTextBox' required='false' id='${id}_textInput' "+"name='textInput' data-dojo-props='intermediateChanges:true'/>","</td></tr><tr><td>","</td><td>","</td></tr><tr><td colspan='2'>","<button data-dojo-type='dijit.form.Button' type='submit' id='${id}_setButton'>${set}</button>","<button data-dojo-type='dijit.form.Button' type='button' id='${id}_cancelButton'>${buttonCancel}</button>","</td></tr></table>"].join(""),htmlTemplate:"<img src=\"${urlInput}\" _djrealurl=\"${urlInput}\" alt=\"${textInput}\" />",tag:"img",_getCurrentValues:function(img){
var url,_24;
if(img&&img.tagName.toLowerCase()===this.tag){
url=img.getAttribute("_djrealurl")||img.getAttribute("src");
_24=img.getAttribute("alt");
this.editor.selection.selectElement(img,true);
}else{
_24=this.editor.selection.getSelectedText();
}
return {urlInput:url||"",textInput:_24||""};
},_isValid:function(){
return this._urlInput.isValid();
},_connectTagEvents:function(){
this.inherited(arguments);
this.editor.onLoadDeferred.then(_5.hitch(this,function(){
this.own(on(this.editor.editNode,"mousedown",_5.hitch(this,"_selectTag")));
}));
},_selectTag:function(e){
if(e&&e.target){
var t=e.target;
var tg=t.tagName?t.tagName.toLowerCase():"";
if(tg===this.tag){
this.editor.selection.selectElement(t);
}
}
},_checkValues:function(_25){
if(_25&&_25.urlInput){
_25.urlInput=_25.urlInput.replace(/"/g,"&quot;");
}
if(_25&&_25.textInput){
_25.textInput=_25.textInput.replace(/"/g,"&quot;");
}
return _25;
},_onDblClick:function(e){
if(e&&e.target){
var t=e.target;
var tg=t.tagName?t.tagName.toLowerCase():"";
if(tg===this.tag&&_3.get(t,"src")){
var _26=this.editor;
this.editor.selection.selectElement(t);
_26.onDisplayChanged();
if(_26._updateTimer){
_26._updateTimer.remove();
delete _26._updateTimer;
}
_26.onNormalizedDisplayChanged();
var _27=this.button;
setTimeout(function(){
_27.set("disabled",false);
_27.loadAndOpenDropDown().then(function(){
if(_27.dropDown.focus){
_27.dropDown.focus();
}
});
},10);
}
}
}});
_a.registry["createLink"]=function(){
return new _d({command:"createLink"});
};
_a.registry["insertImage"]=function(){
return new _23({command:"insertImage"});
};
_d.ImgLinkDialog=_23;
return _d;
});
