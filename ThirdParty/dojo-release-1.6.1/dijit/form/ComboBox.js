/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.ComboBox"]){
dojo._hasResource["dijit.form.ComboBox"]=true;
dojo.provide("dijit.form.ComboBox");
dojo.require("dojo.window");
dojo.require("dojo.regexp");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.data.util.filter");
dojo.require("dijit._CssStateMixin");
dojo.require("dijit.form._FormWidget");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit._HasDropDown");
dojo.requireLocalization("dijit.form","ComboBox",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit.form.ComboBoxMixin",dijit._HasDropDown,{item:null,pageSize:Infinity,store:null,fetchProperties:{},query:{},autoComplete:true,highlightMatch:"first",searchDelay:100,searchAttr:"name",labelAttr:"",labelType:"text",queryExpr:"${0}*",ignoreCase:true,hasDownArrow:true,templateString:dojo.cache("dijit.form","templates/DropDownBox.html","<div class=\"dijit dijitReset dijitInlineTable dijitLeft\"\n\tid=\"widget_${id}\"\n\trole=\"combobox\"\n\t><div class='dijitReset dijitRight dijitButtonNode dijitArrowButton dijitDownArrowButton dijitArrowButtonContainer'\n\t\tdojoAttachPoint=\"_buttonNode, _popupStateNode\" role=\"presentation\"\n\t\t><input class=\"dijitReset dijitInputField dijitArrowButtonInner\" value=\"&#9660; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"presentation\"\n\t\t\t${_buttonInputDisabled}\n\t/></div\n\t><div class='dijitReset dijitValidationContainer'\n\t\t><input class=\"dijitReset dijitInputField dijitValidationIcon dijitValidationInner\" value=\"&#935; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"presentation\"\n\t/></div\n\t><div class=\"dijitReset dijitInputField dijitInputContainer\"\n\t\t><input class='dijitReset dijitInputInner' ${!nameAttrSetting} type=\"text\" autocomplete=\"off\"\n\t\t\tdojoAttachPoint=\"textbox,focusNode\" role=\"textbox\" aria-haspopup=\"true\"\n\t/></div\n></div>\n"),baseClass:"dijitTextBox dijitComboBox",dropDownClass:"dijit.form._ComboBoxMenu",cssStateNodes:{"_buttonNode":"dijitDownArrowButton"},maxHeight:-1,_stopClickEvents:false,_getCaretPos:function(_1){
var _2=0;
if(typeof (_1.selectionStart)=="number"){
_2=_1.selectionStart;
}else{
if(dojo.isIE){
var tr=dojo.doc.selection.createRange().duplicate();
var _3=_1.createTextRange();
tr.move("character",0);
_3.move("character",0);
try{
_3.setEndPoint("EndToEnd",tr);
_2=String(_3.text).replace(/\r/g,"").length;
}
catch(e){
}
}
}
return _2;
},_setCaretPos:function(_4,_5){
_5=parseInt(_5);
dijit.selectInputText(_4,_5,_5);
},_setDisabledAttr:function(_6){
this.inherited(arguments);
dijit.setWaiState(this.domNode,"disabled",_6);
},_abortQuery:function(){
if(this.searchTimer){
clearTimeout(this.searchTimer);
this.searchTimer=null;
}
if(this._fetchHandle){
if(this._fetchHandle.abort){
this._fetchHandle.abort();
}
this._fetchHandle=null;
}
},_onInput:function(_7){
if(!this.searchTimer&&(_7.type=="paste"||_7.type=="input")&&this._lastInput!=this.textbox.value){
this.searchTimer=setTimeout(dojo.hitch(this,function(){
this._onKey({charOrCode:229});
}),100);
}
this.inherited(arguments);
},_onKey:function(_8){
var _9=_8.charOrCode;
if(_8.altKey||((_8.ctrlKey||_8.metaKey)&&(_9!="x"&&_9!="v"))||_9==dojo.keys.SHIFT){
return;
}
var _a=false;
var pw=this.dropDown;
var dk=dojo.keys;
var _b=null;
this._prev_key_backspace=false;
this._abortQuery();
this.inherited(arguments);
if(this._opened){
_b=pw.getHighlightedOption();
}
switch(_9){
case dk.PAGE_DOWN:
case dk.DOWN_ARROW:
case dk.PAGE_UP:
case dk.UP_ARROW:
if(this._opened){
this._announceOption(_b);
}
dojo.stopEvent(_8);
break;
case dk.ENTER:
if(_b){
if(_b==pw.nextButton){
this._nextSearch(1);
dojo.stopEvent(_8);
break;
}else{
if(_b==pw.previousButton){
this._nextSearch(-1);
dojo.stopEvent(_8);
break;
}
}
}else{
this._setBlurValue();
this._setCaretPos(this.focusNode,this.focusNode.value.length);
}
if(this._opened||this._fetchHandle){
_8.preventDefault();
}
case dk.TAB:
var _c=this.get("displayedValue");
if(pw&&(_c==pw._messages["previousMessage"]||_c==pw._messages["nextMessage"])){
break;
}
if(_b){
this._selectOption();
}
if(this._opened){
this._lastQuery=null;
this.closeDropDown();
}
break;
case " ":
if(_b){
dojo.stopEvent(_8);
this._selectOption();
this.closeDropDown();
}else{
_a=true;
}
break;
case dk.DELETE:
case dk.BACKSPACE:
this._prev_key_backspace=true;
_a=true;
break;
default:
_a=typeof _9=="string"||_9==229;
}
if(_a){
this.item=undefined;
this.searchTimer=setTimeout(dojo.hitch(this,"_startSearchFromInput"),1);
}
},_autoCompleteText:function(_d){
var fn=this.focusNode;
dijit.selectInputText(fn,fn.value.length);
var _e=this.ignoreCase?"toLowerCase":"substr";
if(_d[_e](0).indexOf(this.focusNode.value[_e](0))==0){
var _f=this._getCaretPos(fn);
if((_f+1)>fn.value.length){
fn.value=_d;
dijit.selectInputText(fn,_f);
}
}else{
fn.value=_d;
dijit.selectInputText(fn);
}
},_openResultList:function(_10,_11){
this._fetchHandle=null;
if(this.disabled||this.readOnly||(_11.query[this.searchAttr]!=this._lastQuery)){
return;
}
var _12=this.dropDown._highlighted_option&&dojo.hasClass(this.dropDown._highlighted_option,"dijitMenuItemSelected");
this.dropDown.clearResultList();
if(!_10.length&&!this._maxOptions){
this.closeDropDown();
return;
}
_11._maxOptions=this._maxOptions;
var _13=this.dropDown.createOptions(_10,_11,dojo.hitch(this,"_getMenuLabelFromItem"));
this._showResultList();
if(_11.direction){
if(1==_11.direction){
this.dropDown.highlightFirstOption();
}else{
if(-1==_11.direction){
this.dropDown.highlightLastOption();
}
}
if(_12){
this._announceOption(this.dropDown.getHighlightedOption());
}
}else{
if(this.autoComplete&&!this._prev_key_backspace&&!/^[*]+$/.test(_11.query[this.searchAttr])){
this._announceOption(_13[1]);
}
}
},_showResultList:function(){
this.closeDropDown(true);
this.displayMessage("");
this.openDropDown();
dijit.setWaiState(this.domNode,"expanded","true");
},loadDropDown:function(_14){
this._startSearchAll();
},isLoaded:function(){
return false;
},closeDropDown:function(){
this._abortQuery();
if(this._opened){
this.inherited(arguments);
dijit.setWaiState(this.domNode,"expanded","false");
dijit.removeWaiState(this.focusNode,"activedescendant");
}
},_setBlurValue:function(){
var _15=this.get("displayedValue");
var pw=this.dropDown;
if(pw&&(_15==pw._messages["previousMessage"]||_15==pw._messages["nextMessage"])){
this._setValueAttr(this._lastValueReported,true);
}else{
if(typeof this.item=="undefined"){
this.item=null;
this.set("displayedValue",_15);
}else{
if(this.value!=this._lastValueReported){
dijit.form._FormValueWidget.prototype._setValueAttr.call(this,this.value,true);
}
this._refreshState();
}
}
},_onBlur:function(){
this.closeDropDown();
this.inherited(arguments);
},_setItemAttr:function(_16,_17,_18){
if(!_18){
_18=this.store.getValue(_16,this.searchAttr);
}
var _19=this._getValueField()!=this.searchAttr?this.store.getIdentity(_16):_18;
this._set("item",_16);
dijit.form.ComboBox.superclass._setValueAttr.call(this,_19,_17,_18);
},_announceOption:function(_1a){
if(!_1a){
return;
}
var _1b;
if(_1a==this.dropDown.nextButton||_1a==this.dropDown.previousButton){
_1b=_1a.innerHTML;
this.item=undefined;
this.value="";
}else{
_1b=this.store.getValue(_1a.item,this.searchAttr).toString();
this.set("item",_1a.item,false,_1b);
}
this.focusNode.value=this.focusNode.value.substring(0,this._lastInput.length);
dijit.setWaiState(this.focusNode,"activedescendant",dojo.attr(_1a,"id"));
this._autoCompleteText(_1b);
},_selectOption:function(evt){
if(evt){
this._announceOption(evt.target);
}
this.closeDropDown();
this._setCaretPos(this.focusNode,this.focusNode.value.length);
dijit.form._FormValueWidget.prototype._setValueAttr.call(this,this.value,true);
},_startSearchAll:function(){
this._startSearch("");
},_startSearchFromInput:function(){
this._startSearch(this.focusNode.value.replace(/([\\\*\?])/g,"\\$1"));
},_getQueryString:function(_1c){
return dojo.string.substitute(this.queryExpr,[_1c]);
},_startSearch:function(key){
if(!this.dropDown){
var _1d=this.id+"_popup",_1e=dojo.getObject(this.dropDownClass,false);
this.dropDown=new _1e({onChange:dojo.hitch(this,this._selectOption),id:_1d,dir:this.dir});
dijit.removeWaiState(this.focusNode,"activedescendant");
dijit.setWaiState(this.textbox,"owns",_1d);
}
var _1f=dojo.clone(this.query);
this._lastInput=key;
this._lastQuery=_1f[this.searchAttr]=this._getQueryString(key);
this.searchTimer=setTimeout(dojo.hitch(this,function(_20,_21){
this.searchTimer=null;
var _22={queryOptions:{ignoreCase:this.ignoreCase,deep:true},query:_20,onBegin:dojo.hitch(this,"_setMaxOptions"),onComplete:dojo.hitch(this,"_openResultList"),onError:function(_23){
_21._fetchHandle=null;
console.error("dijit.form.ComboBox: "+_23);
_21.closeDropDown();
},start:0,count:this.pageSize};
dojo.mixin(_22,_21.fetchProperties);
this._fetchHandle=_21.store.fetch(_22);
var _24=function(_25,_26){
_25.start+=_25.count*_26;
_25.direction=_26;
this._fetchHandle=this.store.fetch(_25);
this.focus();
};
this._nextSearch=this.dropDown.onPage=dojo.hitch(this,_24,this._fetchHandle);
},_1f,this),this.searchDelay);
},_setMaxOptions:function(_27,_28){
this._maxOptions=_27;
},_getValueField:function(){
return this.searchAttr;
},constructor:function(){
this.query={};
this.fetchProperties={};
},postMixInProperties:function(){
if(!this.store){
var _29=this.srcNodeRef;
this.store=new dijit.form._ComboBoxDataStore(_29);
if(!("value" in this.params)){
var _2a=(this.item=this.store.fetchSelectedItem());
if(_2a){
var _2b=this._getValueField();
this.value=this.store.getValue(_2a,_2b);
}
}
}
this.inherited(arguments);
},postCreate:function(){
var _2c=dojo.query("label[for=\""+this.id+"\"]");
if(_2c.length){
_2c[0].id=(this.id+"_label");
dijit.setWaiState(this.domNode,"labelledby",_2c[0].id);
}
this.inherited(arguments);
},_setHasDownArrowAttr:function(val){
this.hasDownArrow=val;
this._buttonNode.style.display=val?"":"none";
},_getMenuLabelFromItem:function(_2d){
var _2e=this.labelFunc(_2d,this.store),_2f=this.labelType;
if(this.highlightMatch!="none"&&this.labelType=="text"&&this._lastInput){
_2e=this.doHighlight(_2e,this._escapeHtml(this._lastInput));
_2f="html";
}
return {html:_2f=="html",label:_2e};
},doHighlight:function(_30,_31){
var _32=(this.ignoreCase?"i":"")+(this.highlightMatch=="all"?"g":""),i=this.queryExpr.indexOf("${0}");
_31=dojo.regexp.escapeString(_31);
return this._escapeHtml(_30).replace(new RegExp((i==0?"^":"")+"("+_31+")"+(i==(this.queryExpr.length-4)?"$":""),_32),"<span class=\"dijitComboBoxHighlightMatch\">$1</span>");
},_escapeHtml:function(str){
str=String(str).replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;");
return str;
},reset:function(){
this.item=null;
this.inherited(arguments);
},labelFunc:function(_33,_34){
return _34.getValue(_33,this.labelAttr||this.searchAttr).toString();
}});
dojo.declare("dijit.form._ComboBoxMenu",[dijit._Widget,dijit._Templated,dijit._CssStateMixin],{templateString:"<ul class='dijitReset dijitMenu' dojoAttachEvent='onmousedown:_onMouseDown,onmouseup:_onMouseUp,onmouseover:_onMouseOver,onmouseout:_onMouseOut' style='overflow: \"auto\"; overflow-x: \"hidden\";'>"+"<li class='dijitMenuItem dijitMenuPreviousButton' dojoAttachPoint='previousButton' role='option'></li>"+"<li class='dijitMenuItem dijitMenuNextButton' dojoAttachPoint='nextButton' role='option'></li>"+"</ul>",_messages:null,baseClass:"dijitComboBoxMenu",postMixInProperties:function(){
this.inherited(arguments);
this._messages=dojo.i18n.getLocalization("dijit.form","ComboBox",this.lang);
},buildRendering:function(){
this.inherited(arguments);
this.previousButton.innerHTML=this._messages["previousMessage"];
this.nextButton.innerHTML=this._messages["nextMessage"];
},_setValueAttr:function(_35){
this.value=_35;
this.onChange(_35);
},onChange:function(_36){
},onPage:function(_37){
},onClose:function(){
this._blurOptionNode();
},_createOption:function(_38,_39){
var _3a=dojo.create("li",{"class":"dijitReset dijitMenuItem"+(this.isLeftToRight()?"":" dijitMenuItemRtl"),role:"option"});
var _3b=_39(_38);
if(_3b.html){
_3a.innerHTML=_3b.label;
}else{
_3a.appendChild(dojo.doc.createTextNode(_3b.label));
}
if(_3a.innerHTML==""){
_3a.innerHTML="&nbsp;";
}
_3a.item=_38;
return _3a;
},createOptions:function(_3c,_3d,_3e){
this.previousButton.style.display=(_3d.start==0)?"none":"";
dojo.attr(this.previousButton,"id",this.id+"_prev");
dojo.forEach(_3c,function(_3f,i){
var _40=this._createOption(_3f,_3e);
dojo.attr(_40,"id",this.id+i);
this.domNode.insertBefore(_40,this.nextButton);
},this);
var _41=false;
if(_3d._maxOptions&&_3d._maxOptions!=-1){
if((_3d.start+_3d.count)<_3d._maxOptions){
_41=true;
}else{
if((_3d.start+_3d.count)>_3d._maxOptions&&_3d.count==_3c.length){
_41=true;
}
}
}else{
if(_3d.count==_3c.length){
_41=true;
}
}
this.nextButton.style.display=_41?"":"none";
dojo.attr(this.nextButton,"id",this.id+"_next");
return this.domNode.childNodes;
},clearResultList:function(){
while(this.domNode.childNodes.length>2){
this.domNode.removeChild(this.domNode.childNodes[this.domNode.childNodes.length-2]);
}
this._blurOptionNode();
},_onMouseDown:function(evt){
dojo.stopEvent(evt);
},_onMouseUp:function(evt){
if(evt.target===this.domNode||!this._highlighted_option){
return;
}else{
if(evt.target==this.previousButton){
this._blurOptionNode();
this.onPage(-1);
}else{
if(evt.target==this.nextButton){
this._blurOptionNode();
this.onPage(1);
}else{
var tgt=evt.target;
while(!tgt.item){
tgt=tgt.parentNode;
}
this._setValueAttr({target:tgt},true);
}
}
}
},_onMouseOver:function(evt){
if(evt.target===this.domNode){
return;
}
var tgt=evt.target;
if(!(tgt==this.previousButton||tgt==this.nextButton)){
while(!tgt.item){
tgt=tgt.parentNode;
}
}
this._focusOptionNode(tgt);
},_onMouseOut:function(evt){
if(evt.target===this.domNode){
return;
}
this._blurOptionNode();
},_focusOptionNode:function(_42){
if(this._highlighted_option!=_42){
this._blurOptionNode();
this._highlighted_option=_42;
dojo.addClass(this._highlighted_option,"dijitMenuItemSelected");
}
},_blurOptionNode:function(){
if(this._highlighted_option){
dojo.removeClass(this._highlighted_option,"dijitMenuItemSelected");
this._highlighted_option=null;
}
},_highlightNextOption:function(){
if(!this.getHighlightedOption()){
var fc=this.domNode.firstChild;
this._focusOptionNode(fc.style.display=="none"?fc.nextSibling:fc);
}else{
var ns=this._highlighted_option.nextSibling;
if(ns&&ns.style.display!="none"){
this._focusOptionNode(ns);
}else{
this.highlightFirstOption();
}
}
dojo.window.scrollIntoView(this._highlighted_option);
},highlightFirstOption:function(){
var _43=this.domNode.firstChild;
var _44=_43.nextSibling;
this._focusOptionNode(_44.style.display=="none"?_43:_44);
dojo.window.scrollIntoView(this._highlighted_option);
},highlightLastOption:function(){
this._focusOptionNode(this.domNode.lastChild.previousSibling);
dojo.window.scrollIntoView(this._highlighted_option);
},_highlightPrevOption:function(){
if(!this.getHighlightedOption()){
var lc=this.domNode.lastChild;
this._focusOptionNode(lc.style.display=="none"?lc.previousSibling:lc);
}else{
var ps=this._highlighted_option.previousSibling;
if(ps&&ps.style.display!="none"){
this._focusOptionNode(ps);
}else{
this.highlightLastOption();
}
}
dojo.window.scrollIntoView(this._highlighted_option);
},_page:function(up){
var _45=0;
var _46=this.domNode.scrollTop;
var _47=dojo.style(this.domNode,"height");
if(!this.getHighlightedOption()){
this._highlightNextOption();
}
while(_45<_47){
if(up){
if(!this.getHighlightedOption().previousSibling||this._highlighted_option.previousSibling.style.display=="none"){
break;
}
this._highlightPrevOption();
}else{
if(!this.getHighlightedOption().nextSibling||this._highlighted_option.nextSibling.style.display=="none"){
break;
}
this._highlightNextOption();
}
var _48=this.domNode.scrollTop;
_45+=(_48-_46)*(up?-1:1);
_46=_48;
}
},pageUp:function(){
this._page(true);
},pageDown:function(){
this._page(false);
},getHighlightedOption:function(){
var ho=this._highlighted_option;
return (ho&&ho.parentNode)?ho:null;
},handleKey:function(evt){
switch(evt.charOrCode){
case dojo.keys.DOWN_ARROW:
this._highlightNextOption();
return false;
case dojo.keys.PAGE_DOWN:
this.pageDown();
return false;
case dojo.keys.UP_ARROW:
this._highlightPrevOption();
return false;
case dojo.keys.PAGE_UP:
this.pageUp();
return false;
default:
return true;
}
}});
dojo.declare("dijit.form.ComboBox",[dijit.form.ValidationTextBox,dijit.form.ComboBoxMixin],{_setValueAttr:function(_49,_4a,_4b){
this._set("item",null);
if(!_49){
_49="";
}
dijit.form.ValidationTextBox.prototype._setValueAttr.call(this,_49,_4a,_4b);
}});
dojo.declare("dijit.form._ComboBoxDataStore",null,{constructor:function(_4c){
this.root=_4c;
if(_4c.tagName!="SELECT"&&_4c.firstChild){
_4c=dojo.query("select",_4c);
if(_4c.length>0){
_4c=_4c[0];
}else{
this.root.innerHTML="<SELECT>"+this.root.innerHTML+"</SELECT>";
_4c=this.root.firstChild;
}
this.root=_4c;
}
dojo.query("> option",_4c).forEach(function(_4d){
_4d.innerHTML=dojo.trim(_4d.innerHTML);
});
},getValue:function(_4e,_4f,_50){
return (_4f=="value")?_4e.value:(_4e.innerText||_4e.textContent||"");
},isItemLoaded:function(_51){
return true;
},getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
},_fetchItems:function(_52,_53,_54){
if(!_52.query){
_52.query={};
}
if(!_52.query.name){
_52.query.name="";
}
if(!_52.queryOptions){
_52.queryOptions={};
}
var _55=dojo.data.util.filter.patternToRegExp(_52.query.name,_52.queryOptions.ignoreCase),_56=dojo.query("> option",this.root).filter(function(_57){
return (_57.innerText||_57.textContent||"").match(_55);
});
if(_52.sort){
_56.sort(dojo.data.util.sorter.createSortFunction(_52.sort,this));
}
_53(_56,_52);
},close:function(_58){
return;
},getLabel:function(_59){
return _59.innerHTML;
},getIdentity:function(_5a){
return dojo.attr(_5a,"value");
},fetchItemByIdentity:function(_5b){
var _5c=dojo.query("> option[value='"+_5b.identity+"']",this.root)[0];
_5b.onItem(_5c);
},fetchSelectedItem:function(){
var _5d=this.root,si=_5d.selectedIndex;
return typeof si=="number"?dojo.query("> option:nth-child("+(si!=-1?si+1:1)+")",_5d)[0]:null;
}});
dojo.extend(dijit.form._ComboBoxDataStore,dojo.data.util.simpleFetch);
}
