/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.FindReplace"]){
dojo._hasResource["dojox.editor.plugins.FindReplace"]=true;
dojo.provide("dojox.editor.plugins.FindReplace");
dojo.require("dojo.string");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.Toolbar");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojox.editor.plugins.ToolbarLineBreak");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","FindReplace",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.editor.plugins.FindReplace");
dojo.declare("dojox.editor.plugins._FindReplaceCloseBox",[dijit._Widget,dijit._Templated],{btnId:"",widget:null,widgetsInTemplate:true,templateString:"<span style='float: right' class='dijitInline' tabindex='-1'>"+"<button class='dijit dijitReset dijitInline' "+"id='${btnId}' dojoAttachPoint='button' dojoType='dijit.form.Button' tabindex='-1' iconClass='dijitEditorIconsFindReplaceClose' showLabel='false'>X</button>"+"</span>",postMixInProperties:function(){
this.id=dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
this.btnId=this.id+"_close";
this.inherited(arguments);
},startup:function(){
this.connect(this.button,"onClick","onClick");
},onClick:function(){
}});
dojo.declare("dojox.editor.plugins._FindReplaceTextBox",[dijit._Widget,dijit._Templated],{textId:"",label:"",toolTip:"",widget:null,widgetsInTemplate:true,templateString:"<span style='white-space: nowrap' class='dijit dijitReset dijitInline dijitEditorFindReplaceTextBox' "+"title='${tooltip}' tabindex='-1'>"+"<label class='dijitLeft dijitInline' for='${textId}' tabindex='-1'>${label}</label>"+"<input dojoType='dijit.form.TextBox' required='false' intermediateChanges='true' class='focusTextBox'"+"tabIndex='0' id='${textId}' dojoAttachPoint='textBox, focusNode' value='' dojoAttachEvent='onKeyPress: _onKeyPress'/>"+"</span>",postMixInProperties:function(){
this.id=dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
this.textId=this.id+"_text";
this.inherited(arguments);
},postCreate:function(){
this.textBox.set("value","");
this.disabled=this.textBox.get("disabled");
this.connect(this.textBox,"onChange","onChange");
},_setValueAttr:function(_1){
this.value=_1;
this.textBox.set("value",_1);
},focus:function(){
this.textBox.focus();
},_setDisabledAttr:function(_2){
this.disabled=_2;
this.textBox.set("disabled",_2);
},onChange:function(_3){
this.value=_3;
},_onKeyPress:function(_4){
var _5=0;
var _6=0;
if(_4.target&&!_4.ctrlKey&&!_4.altKey&&!_4.shiftKey){
if(_4.keyCode==dojo.keys.LEFT_ARROW){
_5=_4.target.selectionStart;
_6=_4.target.selectionEnd;
if(_5<_6){
dijit.selectInputText(_4.target,_5,_5);
dojo.stopEvent(_4);
}
}else{
if(_4.keyCode==dojo.keys.RIGHT_ARROW){
_5=_4.target.selectionStart;
_6=_4.target.selectionEnd;
if(_5<_6){
dijit.selectInputText(_4.target,_6,_6);
dojo.stopEvent(_4);
}
}
}
}
}});
dojo.declare("dojox.editor.plugins._FindReplaceCheckBox",[dijit._Widget,dijit._Templated],{checkId:"",label:"",tooltip:"",widget:null,widgetsInTemplate:true,templateString:"<span style='white-space: nowrap' tabindex='-1' "+"class='dijit dijitReset dijitInline dijitEditorFindReplaceCheckBox' title='${tooltip}' >"+"<input dojoType='dijit.form.CheckBox' required=false "+"tabIndex='0' id='${checkId}' dojoAttachPoint='checkBox, focusNode' value=''/>"+"<label tabindex='-1' class='dijitLeft dijitInline' for='${checkId}'>${label}</label>"+"</span>",postMixInProperties:function(){
this.id=dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
this.checkId=this.id+"_check";
this.inherited(arguments);
},postCreate:function(){
this.checkBox.set("checked",false);
this.disabled=this.checkBox.get("disabled");
this.checkBox.isFocusable=function(){
return false;
};
},_setValueAttr:function(_7){
this.checkBox.set("value",_7);
},_getValueAttr:function(){
return this.checkBox.get("value");
},focus:function(){
this.checkBox.focus();
},_setDisabledAttr:function(_8){
this.disabled=_8;
this.checkBox.set("disabled",_8);
}});
dojo.declare("dojox.editor.plugins._FindReplaceToolbar",dijit.Toolbar,{postCreate:function(){
this.connectKeyNavHandlers([],[]);
this.connect(this.containerNode,"onclick","_onToolbarEvent");
this.connect(this.containerNode,"onkeydown","_onToolbarEvent");
dojo.addClass(this.domNode,"dijitToolbar");
},addChild:function(_9,_a){
dijit._KeyNavContainer.superclass.addChild.apply(this,arguments);
},_onToolbarEvent:function(_b){
_b.stopPropagation();
}});
dojo.declare("dojox.editor.plugins.FindReplace",[dijit._editor._Plugin],{buttonClass:dijit.form.ToggleButton,iconClassPrefix:"dijitEditorIconsFindReplace",editor:null,button:null,_frToolbar:null,_closeBox:null,_findField:null,_replaceField:null,_findButton:null,_replaceButton:null,_replaceAllButton:null,_caseSensitive:null,_backwards:null,_promDialog:null,_promDialogTimeout:null,_strings:null,_initButton:function(){
this._strings=dojo.i18n.getLocalization("dojox.editor.plugins","FindReplace");
this.button=new dijit.form.ToggleButton({label:this._strings["findReplace"],showLabel:false,iconClass:this.iconClassPrefix+" dijitEditorIconFindString",tabIndex:"-1",onChange:dojo.hitch(this,"_toggleFindReplace")});
if(dojo.isOpera){
this.button.set("disabled",true);
}
this.connect(this.button,"set",dojo.hitch(this,function(_c,_d){
if(_c==="disabled"){
this._toggleFindReplace((!_d&&this._displayed),true,true);
}
}));
},setEditor:function(_e){
this.editor=_e;
this._initButton();
},toggle:function(){
this.button.set("checked",!this.button.get("checked"));
},_toggleFindReplace:function(_f,_10,_11){
var _12=dojo.marginBox(this.editor.domNode);
if(_f&&!dojo.isOpera){
dojo.style(this._frToolbar.domNode,"display","block");
this._populateFindField();
if(!_10){
this._displayed=true;
}
}else{
dojo.style(this._frToolbar.domNode,"display","none");
if(!_10){
this._displayed=false;
}
if(!_11){
this.editor.focus();
}
}
this.editor.resize({h:_12.h});
},_populateFindField:function(){
var ed=this.editor;
var win=ed.window;
var _13=dojo.withGlobal(ed.window,"getSelectedText",dijit._editor.selection,[null]);
if(this._findField&&this._findField.textBox){
if(_13){
this._findField.textBox.set("value",_13);
}
this._findField.textBox.focus();
dijit.selectInputText(this._findField.textBox.focusNode);
}
},setToolbar:function(_14){
this.inherited(arguments);
if(!dojo.isOpera){
var _15=this._frToolbar=new dojox.editor.plugins._FindReplaceToolbar();
dojo.style(_15.domNode,"display","none");
dojo.place(_15.domNode,_14.domNode,"after");
_15.startup();
this._closeBox=new dojox.editor.plugins._FindReplaceCloseBox();
_15.addChild(this._closeBox);
this._findField=new dojox.editor.plugins._FindReplaceTextBox({label:this._strings["findLabel"],tooltip:this._strings["findTooltip"]});
_15.addChild(this._findField);
this._replaceField=new dojox.editor.plugins._FindReplaceTextBox({label:this._strings["replaceLabel"],tooltip:this._strings["replaceTooltip"]});
_15.addChild(this._replaceField);
_15.addChild(new dojox.editor.plugins.ToolbarLineBreak());
this._findButton=new dijit.form.Button({label:this._strings["findButton"],showLabel:true,iconClass:this.iconClassPrefix+" dijitEditorIconFind"});
this._findButton.titleNode.title=this._strings["findButtonTooltip"];
_15.addChild(this._findButton);
this._replaceButton=new dijit.form.Button({label:this._strings["replaceButton"],showLabel:true,iconClass:this.iconClassPrefix+" dijitEditorIconReplace"});
this._replaceButton.titleNode.title=this._strings["replaceButtonTooltip"];
_15.addChild(this._replaceButton);
this._replaceAllButton=new dijit.form.Button({label:this._strings["replaceAllButton"],showLabel:true,iconClass:this.iconClassPrefix+" dijitEditorIconReplaceAll"});
this._replaceAllButton.titleNode.title=this._strings["replaceAllButtonTooltip"];
_15.addChild(this._replaceAllButton);
this._caseSensitive=new dojox.editor.plugins._FindReplaceCheckBox({label:this._strings["matchCase"],tooltip:this._strings["matchCaseTooltip"]});
_15.addChild(this._caseSensitive);
this._backwards=new dojox.editor.plugins._FindReplaceCheckBox({label:this._strings["backwards"],tooltip:this._strings["backwardsTooltip"]});
_15.addChild(this._backwards);
this._findButton.set("disabled",true);
this._replaceButton.set("disabled",true);
this._replaceAllButton.set("disabled",true);
this.connect(this._findField,"onChange","_checkButtons");
this.connect(this._findField,"onKeyDown","_onFindKeyDown");
this.connect(this._replaceField,"onKeyDown","_onReplaceKeyDown");
this.connect(this._findButton,"onClick","_find");
this.connect(this._replaceButton,"onClick","_replace");
this.connect(this._replaceAllButton,"onClick","_replaceAll");
this.connect(this._closeBox,"onClick","toggle");
this._promDialog=new dijit.TooltipDialog();
this._promDialog.startup();
this._promDialog.set("content","");
}
},_checkButtons:function(){
var _16=this._findField.get("value");
if(_16){
this._findButton.set("disabled",false);
this._replaceButton.set("disabled",false);
this._replaceAllButton.set("disabled",false);
}else{
this._findButton.set("disabled",true);
this._replaceButton.set("disabled",true);
this._replaceAllButton.set("disabled",true);
}
},_onFindKeyDown:function(evt){
if(evt.keyCode==dojo.keys.ENTER){
this._find();
dojo.stopEvent(evt);
}
},_onReplaceKeyDown:function(evt){
if(evt.keyCode==dojo.keys.ENTER){
if(!this._replace()){
this._replace();
}
dojo.stopEvent(evt);
}
},_find:function(_17){
var txt=this._findField.get("value")||"";
if(txt){
var _18=this._caseSensitive.get("value");
var _19=this._backwards.get("value");
var _1a=this._findText(txt,_18,_19);
if(!_1a&&_17){
this._promDialog.set("content",dojo.string.substitute(this._strings["eofDialogText"],{"0":this._strings["eofDialogTextFind"]}));
dijit.popup.open({popup:this._promDialog,around:this._findButton.domNode});
this._promDialogTimeout=setTimeout(dojo.hitch(this,function(){
clearTimeout(this._promDialogTimeout);
this._promDialogTimeout=null;
dijit.popup.close(this._promDialog);
}),3000);
setTimeout(dojo.hitch(this,function(){
this.editor.focus();
}),0);
}
return _1a;
}
return false;
},_replace:function(_1b){
var _1c=false;
var ed=this.editor;
ed.focus();
var txt=this._findField.get("value")||"";
var _1d=this._replaceField.get("value")||"";
if(txt){
var _1e=this._caseSensitive.get("value");
var _1f=this._backwards.get("value");
var _20=dojo.withGlobal(ed.window,"getSelectedText",dijit._editor.selection,[null]);
if(dojo.isMoz){
txt=dojo.trim(txt);
_20=dojo.trim(_20);
}
var _21=this._filterRegexp(txt,!_1e);
if(_20&&_21.test(_20)){
ed.execCommand("inserthtml",_1d);
_1c=true;
if(_1f){
this._findText(_1d,_1e,_1f);
dojo.withGlobal(ed.window,"collapse",dijit._editor.selection,[true]);
}
}
if(!this._find(false)&&_1b){
this._promDialog.set("content",dojo.string.substitute(this._strings["eofDialogText"],{"0":this._strings["eofDialogTextReplace"]}));
dijit.popup.open({popup:this._promDialog,around:this._replaceButton.domNode});
this._promDialogTimeout=setTimeout(dojo.hitch(this,function(){
clearTimeout(this._promDialogTimeout);
this._promDialogTimeout=null;
dijit.popup.close(this._promDialog);
}),3000);
setTimeout(dojo.hitch(this,function(){
this.editor.focus();
}),0);
}
return _1c;
}
return null;
},_replaceAll:function(_22){
var _23=0;
var _24=this._backwards.get("value");
if(_24){
this.editor.placeCursorAtEnd();
}else{
this.editor.placeCursorAtStart();
}
if(this._replace(false)){
_23++;
}
var _25=dojo.hitch(this,function(){
if(this._replace(false)){
_23++;
setTimeout(_25,10);
}else{
if(_22){
this._promDialog.set("content",dojo.string.substitute(this._strings["replaceDialogText"],{"0":""+_23}));
dijit.popup.open({popup:this._promDialog,around:this._replaceAllButton.domNode});
this._promDialogTimeout=setTimeout(dojo.hitch(this,function(){
clearTimeout(this._promDialogTimeout);
this._promDialogTimeout=null;
dijit.popup.close(this._promDialog);
}),3000);
setTimeout(dojo.hitch(this,function(){
this._findField.focus();
this._findField.textBox.focusNode.select();
}),0);
}
}
});
_25();
},_findText:function(txt,_26,_27){
var ed=this.editor;
var win=ed.window;
var _28=false;
if(txt){
if(win.find){
_28=win.find(txt,_26,_27,false,false,false,false);
}else{
var doc=ed.document;
if(doc.selection){
this.editor.focus();
var _29=doc.body.createTextRange();
var _2a=doc.selection?doc.selection.createRange():null;
if(_2a){
if(_27){
_29.setEndPoint("EndToStart",_2a);
}else{
_29.setEndPoint("StartToEnd",_2a);
}
}
var _2b=_26?4:0;
if(_27){
_2b=_2b|1;
}
_28=_29.findText(txt,_29.text.length,_2b);
if(_28){
_29.select();
}
}
}
}
return _28;
},_filterRegexp:function(_2c,_2d){
var rxp="";
var c=null;
for(var i=0;i<_2c.length;i++){
c=_2c.charAt(i);
switch(c){
case "\\":
rxp+=c;
i++;
rxp+=_2c.charAt(i);
break;
case "$":
case "^":
case "/":
case "+":
case ".":
case "|":
case "(":
case ")":
case "{":
case "}":
case "[":
case "]":
rxp+="\\";
default:
rxp+=c;
}
}
rxp="^"+rxp+"$";
if(_2d){
return new RegExp(rxp,"mi");
}else{
return new RegExp(rxp,"m");
}
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},destroy:function(){
this.inherited(arguments);
if(this._promDialogTimeout){
clearTimeout(this._promDialogTimeout);
this._promDialogTimeout=null;
dijit.popup.close(this._promDialog);
}
if(this._frToolbar){
this._frToolbar.destroyRecursive();
this._frToolbar=null;
}
if(this._promDialog){
this._promDialog.destroyRecursive();
this._promDialog=null;
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _2e=o.args.name.toLowerCase();
if(_2e==="findreplace"){
o.plugin=new dojox.editor.plugins.FindReplace({});
}
});
}
