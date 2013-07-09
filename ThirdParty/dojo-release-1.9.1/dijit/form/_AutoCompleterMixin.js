//>>built
define("dijit/form/_AutoCompleterMixin",["dojo/aspect","dojo/_base/declare","dojo/dom-attr","dojo/keys","dojo/_base/lang","dojo/query","dojo/regexp","dojo/sniff","./DataList","./_TextBoxMixin","./_SearchMixin"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b){
var _c=_2("dijit.form._AutoCompleterMixin",_b,{item:null,autoComplete:true,highlightMatch:"first",labelAttr:"",labelType:"text",maxHeight:-1,_stopClickEvents:false,_getCaretPos:function(_d){
var _e=0;
if(typeof (_d.selectionStart)=="number"){
_e=_d.selectionStart;
}else{
if(_8("ie")){
var tr=_d.ownerDocument.selection.createRange().duplicate();
var _f=_d.createTextRange();
tr.move("character",0);
_f.move("character",0);
try{
_f.setEndPoint("EndToEnd",tr);
_e=String(_f.text).replace(/\r/g,"").length;
}
catch(e){
}
}
}
return _e;
},_setCaretPos:function(_10,_11){
_11=parseInt(_11);
_a.selectInputText(_10,_11,_11);
},_setDisabledAttr:function(_12){
this.inherited(arguments);
this.domNode.setAttribute("aria-disabled",_12?"true":"false");
},_onKey:function(evt){
if(evt.charCode>=32){
return;
}
var key=evt.charCode||evt.keyCode;
if(key==_4.ALT||key==_4.CTRL||key==_4.META||key==_4.SHIFT){
return;
}
var pw=this.dropDown;
var _13=null;
this._abortQuery();
this.inherited(arguments);
if(evt.altKey||evt.ctrlKey||evt.metaKey){
return;
}
if(this._opened){
_13=pw.getHighlightedOption();
}
switch(key){
case _4.PAGE_DOWN:
case _4.DOWN_ARROW:
case _4.PAGE_UP:
case _4.UP_ARROW:
if(this._opened){
this._announceOption(_13);
}
evt.stopPropagation();
evt.preventDefault();
break;
case _4.ENTER:
if(_13){
if(_13==pw.nextButton){
this._nextSearch(1);
evt.stopPropagation();
evt.preventDefault();
break;
}else{
if(_13==pw.previousButton){
this._nextSearch(-1);
evt.stopPropagation();
evt.preventDefault();
break;
}
}
evt.stopPropagation();
evt.preventDefault();
}else{
this._setBlurValue();
this._setCaretPos(this.focusNode,this.focusNode.value.length);
}
case _4.TAB:
var _14=this.get("displayedValue");
if(pw&&(_14==pw._messages["previousMessage"]||_14==pw._messages["nextMessage"])){
break;
}
if(_13){
this._selectOption(_13);
}
case _4.ESCAPE:
if(this._opened){
this._lastQuery=null;
this.closeDropDown();
}
break;
}
},_autoCompleteText:function(_15){
var fn=this.focusNode;
_a.selectInputText(fn,fn.value.length);
var _16=this.ignoreCase?"toLowerCase":"substr";
if(_15[_16](0).indexOf(this.focusNode.value[_16](0))==0){
var _17=this.autoComplete?this._getCaretPos(fn):fn.value.length;
if((_17+1)>fn.value.length){
fn.value=_15;
_a.selectInputText(fn,_17);
}
}else{
fn.value=_15;
_a.selectInputText(fn);
}
},_openResultList:function(_18,_19,_1a){
var _1b=this.dropDown.getHighlightedOption();
this.dropDown.clearResultList();
if(!_18.length&&_1a.start==0){
this.closeDropDown();
return;
}
this._nextSearch=this.dropDown.onPage=_5.hitch(this,function(_1c){
_18.nextPage(_1c!==-1);
this.focus();
});
this.dropDown.createOptions(_18,_1a,_5.hitch(this,"_getMenuLabelFromItem"));
this._showResultList();
if("direction" in _1a){
if(_1a.direction){
this.dropDown.highlightFirstOption();
}else{
if(!_1a.direction){
this.dropDown.highlightLastOption();
}
}
if(_1b){
this._announceOption(this.dropDown.getHighlightedOption());
}
}else{
if(this.autoComplete&&!this._prev_key_backspace&&!/^[*]+$/.test(_19[this.searchAttr].toString())){
this._announceOption(this.dropDown.containerNode.firstChild.nextSibling);
}
}
},_showResultList:function(){
this.closeDropDown(true);
this.openDropDown();
this.domNode.setAttribute("aria-expanded","true");
},loadDropDown:function(){
this._startSearchAll();
},isLoaded:function(){
return false;
},closeDropDown:function(){
this._abortQuery();
if(this._opened){
this.inherited(arguments);
this.domNode.setAttribute("aria-expanded","false");
}
},_setBlurValue:function(){
var _1d=this.get("displayedValue");
var pw=this.dropDown;
if(pw&&(_1d==pw._messages["previousMessage"]||_1d==pw._messages["nextMessage"])){
this._setValueAttr(this._lastValueReported,true);
}else{
if(typeof this.item=="undefined"){
this.item=null;
this.set("displayedValue",_1d);
}else{
if(this.value!=this._lastValueReported){
this._handleOnChange(this.value,true);
}
this._refreshState();
}
}
this.focusNode.removeAttribute("aria-activedescendant");
},_setItemAttr:function(_1e,_1f,_20){
var _21="";
if(_1e){
if(!_20){
_20=this.store._oldAPI?this.store.getValue(_1e,this.searchAttr):_1e[this.searchAttr];
}
_21=this._getValueField()!=this.searchAttr?this.store.getIdentity(_1e):_20;
}
this.set("value",_21,_1f,_20,_1e);
},_announceOption:function(_22){
if(!_22){
return;
}
var _23;
if(_22==this.dropDown.nextButton||_22==this.dropDown.previousButton){
_23=_22.innerHTML;
this.item=undefined;
this.value="";
}else{
var _24=this.dropDown.items[_22.getAttribute("item")];
_23=(this.store._oldAPI?this.store.getValue(_24,this.searchAttr):_24[this.searchAttr]).toString();
this.set("item",_24,false,_23);
}
this.focusNode.value=this.focusNode.value.substring(0,this._lastInput.length);
this.focusNode.setAttribute("aria-activedescendant",_3.get(_22,"id"));
this._autoCompleteText(_23);
},_selectOption:function(_25){
this.closeDropDown();
if(_25){
this._announceOption(_25);
}
this._setCaretPos(this.focusNode,this.focusNode.value.length);
this._handleOnChange(this.value,true);
this.focusNode.removeAttribute("aria-activedescendant");
},_startSearchAll:function(){
this._startSearch("");
},_startSearchFromInput:function(){
this.item=undefined;
this.inherited(arguments);
},_startSearch:function(key){
if(!this.dropDown){
var _26=this.id+"_popup",_27=_5.isString(this.dropDownClass)?_5.getObject(this.dropDownClass,false):this.dropDownClass;
this.dropDown=new _27({onChange:_5.hitch(this,this._selectOption),id:_26,dir:this.dir,textDir:this.textDir});
}
this._lastInput=key;
this.inherited(arguments);
},_getValueField:function(){
return this.searchAttr;
},postMixInProperties:function(){
this.inherited(arguments);
if(!this.store){
var _28=this.srcNodeRef;
this.store=new _9({},_28);
if(!("value" in this.params)){
var _29=(this.item=this.store.fetchSelectedItem());
if(_29){
var _2a=this._getValueField();
this.value=this.store._oldAPI?this.store.getValue(_29,_2a):_29[_2a];
}
}
}
},postCreate:function(){
var _2b=_6("label[for=\""+this.id+"\"]");
if(_2b.length){
if(!_2b[0].id){
_2b[0].id=this.id+"_label";
}
this.domNode.setAttribute("aria-labelledby",_2b[0].id);
}
this.inherited(arguments);
_1.after(this,"onSearch",_5.hitch(this,"_openResultList"),true);
},_getMenuLabelFromItem:function(_2c){
var _2d=this.labelFunc(_2c,this.store),_2e=this.labelType;
if(this.highlightMatch!="none"&&this.labelType=="text"&&this._lastInput){
_2d=this.doHighlight(_2d,this._lastInput);
_2e="html";
}
return {html:_2e=="html",label:_2d};
},doHighlight:function(_2f,_30){
var _31=(this.ignoreCase?"i":"")+(this.highlightMatch=="all"?"g":""),i=this.queryExpr.indexOf("${0}");
_30=_7.escapeString(_30);
return this._escapeHtml(_2f.replace(new RegExp((i==0?"^":"")+"("+_30+")"+(i==(this.queryExpr.length-4)?"$":""),_31),"\uffff$1\uffff")).replace(/\uFFFF([^\uFFFF]+)\uFFFF/g,"<span class=\"dijitComboBoxHighlightMatch\">$1</span>");
},_escapeHtml:function(str){
str=String(str).replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;");
return str;
},reset:function(){
this.item=null;
this.inherited(arguments);
},labelFunc:function(_32,_33){
return (_33._oldAPI?_33.getValue(_32,this.labelAttr||this.searchAttr):_32[this.labelAttr||this.searchAttr]).toString();
},_setValueAttr:function(_34,_35,_36,_37){
this._set("item",_37||null);
if(_34==null){
_34="";
}
this.inherited(arguments);
}});
if(_8("dojo-bidi")){
_c.extend({_setTextDirAttr:function(_38){
this.inherited(arguments);
if(this.dropDown){
this.dropDown._set("textDir",_38);
}
}});
}
return _c;
});
