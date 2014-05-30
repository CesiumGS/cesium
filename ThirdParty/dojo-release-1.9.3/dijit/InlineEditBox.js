//>>built
require({cache:{"url:dijit/templates/InlineEditBox.html":"<span data-dojo-attach-point=\"editNode\" role=\"presentation\" class=\"dijitReset dijitInline dijitOffScreen\"\n\t><span data-dojo-attach-point=\"editorPlaceholder\"></span\n\t><span data-dojo-attach-point=\"buttonContainer\"\n\t\t><button data-dojo-type=\"./form/Button\" data-dojo-props=\"label: '${buttonSave}', 'class': 'saveButton'\"\n\t\t\tdata-dojo-attach-point=\"saveButton\" data-dojo-attach-event=\"onClick:save\"></button\n\t\t><button data-dojo-type=\"./form/Button\"  data-dojo-props=\"label: '${buttonCancel}', 'class': 'cancelButton'\"\n\t\t\tdata-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:cancel\"></button\n\t></span\n></span>\n"}});
define("dijit/InlineEditBox",["require","dojo/_base/array","dojo/aspect","dojo/_base/declare","dojo/dom-attr","dojo/dom-class","dojo/dom-construct","dojo/dom-style","dojo/i18n","dojo/_base/kernel","dojo/keys","dojo/_base/lang","dojo/on","dojo/sniff","dojo/when","./a11yclick","./focus","./_Widget","./_TemplatedMixin","./_WidgetsInTemplateMixin","./_Container","./form/Button","./form/_TextBoxMixin","./form/TextBox","dojo/text!./templates/InlineEditBox.html","dojo/i18n!./nls/common"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,on,_d,_e,_f,fm,_10,_11,_12,_13,_14,_15,_16,_17){
var _18=_4("dijit._InlineEditor",[_10,_11,_12],{templateString:_17,contextRequire:_1,postMixInProperties:function(){
this.inherited(arguments);
this.messages=_9.getLocalization("dijit","common",this.lang);
_2.forEach(["buttonSave","buttonCancel"],function(_19){
if(!this[_19]){
this[_19]=this.messages[_19];
}
},this);
},buildRendering:function(){
this.inherited(arguments);
var Cls=typeof this.editor=="string"?(_c.getObject(this.editor)||_1(this.editor)):this.editor;
var _1a=this.sourceStyle,_1b="line-height:"+_1a.lineHeight+";",_1c=_8.getComputedStyle(this.domNode);
_2.forEach(["Weight","Family","Size","Style"],function(_1d){
var _1e=_1a["font"+_1d],_1f=_1c["font"+_1d];
if(_1f!=_1e){
_1b+="font-"+_1d+":"+_1a["font"+_1d]+";";
}
},this);
_2.forEach(["marginTop","marginBottom","marginLeft","marginRight","position","left","top","right","bottom","float","clear","display"],function(_20){
this.domNode.style[_20]=_1a[_20];
},this);
var _21=this.inlineEditBox.width;
if(_21=="100%"){
_1b+="width:100%;";
this.domNode.style.display="block";
}else{
_1b+="width:"+(_21+(Number(_21)==_21?"px":""))+";";
}
var _22=_c.delegate(this.inlineEditBox.editorParams,{style:_1b,dir:this.dir,lang:this.lang,textDir:this.textDir});
this.editWidget=new Cls(_22,this.editorPlaceholder);
if(this.inlineEditBox.autoSave){
_7.destroy(this.buttonContainer);
}
},postCreate:function(){
this.inherited(arguments);
var ew=this.editWidget;
if(this.inlineEditBox.autoSave){
this.own(_3.after(ew,"onChange",_c.hitch(this,"_onChange"),true),on(ew,"keydown",_c.hitch(this,"_onKeyDown")));
}else{
if("intermediateChanges" in ew){
ew.set("intermediateChanges",true);
this.own(_3.after(ew,"onChange",_c.hitch(this,"_onIntermediateChange"),true));
this.saveButton.set("disabled",true);
}
}
},startup:function(){
this.editWidget.startup();
this.inherited(arguments);
},_onIntermediateChange:function(){
this.saveButton.set("disabled",(this.getValue()==this._resetValue)||!this.enableSave());
},destroy:function(){
this.editWidget.destroy(true);
this.inherited(arguments);
},getValue:function(){
var ew=this.editWidget;
return String(ew.get(("displayedValue" in ew||"_getDisplayedValueAttr" in ew)?"displayedValue":"value"));
},_onKeyDown:function(e){
if(this.inlineEditBox.autoSave&&this.inlineEditBox.editing){
if(e.altKey||e.ctrlKey){
return;
}
if(e.keyCode==_b.ESCAPE){
e.stopPropagation();
e.preventDefault();
this.cancel(true);
}else{
if(e.keyCode==_b.ENTER&&e.target.tagName=="INPUT"){
e.stopPropagation();
e.preventDefault();
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
fm.focus(this.inlineEditBox.displayNode);
}
},enableSave:function(){
return this.editWidget.isValid?this.editWidget.isValid():true;
},focus:function(){
this.editWidget.focus();
if(this.editWidget.focusNode){
fm._onFocusNode(this.editWidget.focusNode);
if(this.editWidget.focusNode.tagName=="INPUT"){
this.defer(function(){
_15.selectInputText(this.editWidget.focusNode);
});
}
}
}});
var _23=_4("dijit.InlineEditBox"+(_d("dojo-bidi")?"_NoBidi":""),_10,{editing:false,autoSave:true,buttonSave:"",buttonCancel:"",renderAsHtml:false,editor:_16,editorWrapper:_18,editorParams:{},disabled:false,onChange:function(){
},onCancel:function(){
},width:"100%",value:"",noValueIndicator:_d("ie")<=6?"<span style='font-family: wingdings; text-decoration: underline;'>&#160;&#160;&#160;&#160;&#x270d;&#160;&#160;&#160;&#160;</span>":"<span style='text-decoration: underline;'>&#160;&#160;&#160;&#160;&#x270d;&#160;&#160;&#160;&#160;</span>",constructor:function(){
this.editorParams={};
},postMixInProperties:function(){
this.inherited(arguments);
this.displayNode=this.srcNodeRef;
this.own(on(this.displayNode,_f,_c.hitch(this,"_onClick")),on(this.displayNode,"mouseover, focus",_c.hitch(this,"_onMouseOver")),on(this.displayNode,"mouseout, blur",_c.hitch(this,"_onMouseOut")));
this.displayNode.setAttribute("role","button");
if(!this.displayNode.getAttribute("tabIndex")){
this.displayNode.setAttribute("tabIndex",0);
}
if(!this.value&&!("value" in this.params)){
this.value=_c.trim(this.renderAsHtml?this.displayNode.innerHTML:(this.displayNode.innerText||this.displayNode.textContent||""));
}
if(!this.value){
this.displayNode.innerHTML=this.noValueIndicator;
}
_6.add(this.displayNode,"dijitInlineEditBoxDisplayMode");
},setDisabled:function(_24){
_a.deprecated("dijit.InlineEditBox.setDisabled() is deprecated.  Use set('disabled', bool) instead.","","2.0");
this.set("disabled",_24);
},_setDisabledAttr:function(_25){
this.domNode.setAttribute("aria-disabled",_25?"true":"false");
if(_25){
this.displayNode.removeAttribute("tabIndex");
}else{
this.displayNode.setAttribute("tabIndex",0);
}
_6.toggle(this.displayNode,"dijitInlineEditBoxDisplayModeDisabled",_25);
this._set("disabled",_25);
},_onMouseOver:function(){
if(!this.disabled){
_6.add(this.displayNode,"dijitInlineEditBoxDisplayModeHover");
}
},_onMouseOut:function(){
_6.remove(this.displayNode,"dijitInlineEditBoxDisplayModeHover");
},_onClick:function(e){
if(this.disabled){
return;
}
if(e){
e.stopPropagation();
e.preventDefault();
}
this._onMouseOut();
this.defer("edit");
},edit:function(){
if(this.disabled||this.editing){
return;
}
this._set("editing",true);
this._savedTabIndex=_5.get(this.displayNode,"tabIndex")||"0";
if(!this.wrapperWidget){
var _26=_7.create("span",null,this.domNode,"before");
var Ewc=typeof this.editorWrapper=="string"?_c.getObject(this.editorWrapper):this.editorWrapper;
this.wrapperWidget=new Ewc({value:this.value,buttonSave:this.buttonSave,buttonCancel:this.buttonCancel,dir:this.dir,lang:this.lang,tabIndex:this._savedTabIndex,editor:this.editor,inlineEditBox:this,sourceStyle:_8.getComputedStyle(this.displayNode),save:_c.hitch(this,"save"),cancel:_c.hitch(this,"cancel"),textDir:this.textDir},_26);
if(!this.wrapperWidget._started){
this.wrapperWidget.startup();
}
if(!this._started){
this.startup();
}
}
var ww=this.wrapperWidget;
_6.add(this.displayNode,"dijitOffScreen");
_6.remove(ww.domNode,"dijitOffScreen");
_8.set(ww.domNode,{visibility:"visible"});
_5.set(this.displayNode,"tabIndex","-1");
var ew=ww.editWidget;
var _27=this;
_e(ew.onLoadDeferred,_c.hitch(ww,function(){
ew.set(("displayedValue" in ew||"_setDisplayedValueAttr" in ew)?"displayedValue":"value",_27.value);
this.defer(function(){
ww.saveButton.set("disabled","intermediateChanges" in ew);
this.focus();
this._resetValue=this.getValue();
});
}));
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
},_showText:function(_28){
var ww=this.wrapperWidget;
_8.set(ww.domNode,{visibility:"hidden"});
_6.add(ww.domNode,"dijitOffScreen");
_6.remove(this.displayNode,"dijitOffScreen");
_5.set(this.displayNode,"tabIndex",this._savedTabIndex);
if(_28){
fm.focus(this.displayNode);
}
},save:function(_29){
if(this.disabled||!this.editing){
return;
}
this._set("editing",false);
var ww=this.wrapperWidget;
var _2a=ww.getValue();
this.set("value",_2a);
this._showText(_29);
},setValue:function(val){
_a.deprecated("dijit.InlineEditBox.setValue() is deprecated.  Use set('value', ...) instead.","","2.0");
return this.set("value",val);
},_setValueAttr:function(val){
val=_c.trim(val);
var _2b=this.renderAsHtml?val:val.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;").replace(/\n/g,"<br>");
this.displayNode.innerHTML=_2b||this.noValueIndicator;
this._set("value",val);
if(this._started){
this.defer(function(){
this.onChange(val);
});
}
},getValue:function(){
_a.deprecated("dijit.InlineEditBox.getValue() is deprecated.  Use get('value') instead.","","2.0");
return this.get("value");
},cancel:function(_2c){
if(this.disabled||!this.editing){
return;
}
this._set("editing",false);
this.defer("onCancel");
this._showText(_2c);
}});
if(_d("dojo-bidi")){
_23=_4("dijit.InlineEditBox",_23,{_setValueAttr:function(){
this.inherited(arguments);
this.applyTextDir(this.displayNode);
}});
}
_23._InlineEditor=_18;
return _23;
});
