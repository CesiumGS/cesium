/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.ListInput"]){
dojo._hasResource["dojox.form.ListInput"]=true;
dojo.experimental("dojox.form.ListInput");
dojo.provide("dojox.form.ListInput");
dojo.require("dijit.form._FormWidget");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit.InlineEditBox");
dojo.requireLocalization("dijit","common",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.form.ListInput",[dijit.form._FormValueWidget],{constructor:function(){
this._items=[];
if(!dojo.isArray(this.delimiter)){
this.delimiter=[this.delimiter];
}
var r="("+this.delimiter.join("|")+")?";
this.regExp="^"+this.regExp+r+"$";
},inputClass:"dojox.form._ListInputInputBox",inputHandler:"onChange",inputProperties:{minWidth:50},submitOnlyValidValue:true,useOnBlur:true,readOnlyInput:false,maxItems:null,showCloseButtonWhenValid:true,showCloseButtonWhenInvalid:true,regExp:".*",delimiter:",",constraints:{},baseClass:"dojoxListInput",type:"select",value:"",templateString:"<div dojoAttachPoint=\"focusNode\" class=\"dijit dijitReset dijitLeft dojoxListInput\"><select dojoAttachpoint=\"_selectNode\" multiple=\"multiple\" class=\"dijitHidden\" ${!nameAttrSetting}></select><ul dojoAttachPoint=\"_listInput\"><li dojoAttachEvent=\"onclick: _onClick\" class=\"dijitInputField dojoxListInputNode dijitHidden\" dojoAttachPoint=\"_inputNode\"></li></ul></div>",useAnim:true,duration:500,easingIn:null,easingOut:null,readOnlyItem:false,useArrowForEdit:true,_items:null,_lastAddedItem:null,_currentItem:null,_input:null,_count:0,postCreate:function(){
this.inherited(arguments);
this._createInputBox();
},_setReadOnlyInputAttr:function(_1){
if(!this._started){
return this._createInputBox();
}
this.readOnlyInput=_1;
this._createInputBox();
},_setReadOnlyItemAttr:function(_2){
if(!this._started){
return;
}
for(var i in this._items){
this._items[i].set("readOnlyItem",_2);
}
},_createInputBox:function(){
dojo.toggleClass(this._inputNode,"dijitHidden",this.readOnlyInput);
if(this.readOnlyInput){
return;
}
if(this._input){
return;
}
if(this.inputHandler===null){
console.warn("you must add some handler to connect to input field");
return false;
}
if(dojo.isString(this.inputHandler)){
this.inputHandler=this.inputHandler.split(",");
}
if(dojo.isString(this.inputProperties)){
this.inputProperties=dojo.fromJson(this.inputProperties);
}
var _3=dojo.getObject(this.inputClass,false);
this.inputProperties.regExp=this.regExpGen(this.constraints);
this._input=new _3(this.inputProperties);
this._input.startup();
this._inputNode.appendChild(this._input.domNode);
dojo.forEach(this.inputHandler,function(_4){
this.connect(this._input,dojo.string.trim(_4),"_onHandler");
},this);
this.connect(this._input,"onKeyDown","_inputOnKeyDown");
this.connect(this._input,"onBlur","_inputOnBlur");
},compare:function(_5,_6){
_5=_5.join(",");
_6=_6.join(",");
if(_5>_6){
return 1;
}else{
if(_5<_6){
return -1;
}else{
return 0;
}
}
},add:function(_7){
if(this._count>=this.maxItems&&this.maxItems!==null){
return;
}
this._lastValueReported=this._getValues();
if(!dojo.isArray(_7)){
_7=[_7];
}
for(var i in _7){
var _8=_7[i];
if(_8===""||typeof _8!="string"){
continue;
}
this._count++;
var re=new RegExp(this.regExpGen(this.constraints));
this._lastAddedItem=new dojox.form._ListInputInputItem({"index":this._items.length,readOnlyItem:this.readOnlyItem,value:_8,regExp:this.regExpGen(this.constraints)});
this._lastAddedItem.startup();
this._testItem(this._lastAddedItem,_8);
this._lastAddedItem.onClose=dojo.hitch(this,"_onItemClose",this._lastAddedItem);
this._lastAddedItem.onChange=dojo.hitch(this,"_onItemChange",this._lastAddedItem);
this._lastAddedItem.onEdit=dojo.hitch(this,"_onItemEdit",this._lastAddedItem);
this._lastAddedItem.onKeyDown=dojo.hitch(this,"_onItemKeyDown",this._lastAddedItem);
if(this.useAnim){
dojo.style(this._lastAddedItem.domNode,{opacity:0,display:""});
}
this._placeItem(this._lastAddedItem.domNode);
if(this.useAnim){
var _9=dojo.fadeIn({node:this._lastAddedItem.domNode,duration:this.duration,easing:this.easingIn}).play();
}
this._items[this._lastAddedItem.index]=this._lastAddedItem;
if(this._onChangeActive&&this.intermediateChanges){
this.onChange(_8);
}
if(this._count>=this.maxItems&&this.maxItems!==null){
break;
}
}
this._updateValues();
if(this._lastValueReported.length==0){
this._lastValueReported=this.value;
}
if(!this.readOnlyInput){
this._input.set("value","");
}
if(this._onChangeActive){
this.onChange(this.value);
}
this._setReadOnlyWhenMaxItemsReached();
},_setReadOnlyWhenMaxItemsReached:function(){
this.set("readOnlyInput",(this._count>=this.maxItems&&this.maxItems!==null));
},_setSelectNode:function(){
this._selectNode.options.length=0;
var _a=this.submitOnlyValidValue?this.get("MatchedValue"):this.value;
if(!dojo.isArray(_a)){
return;
}
dojo.forEach(_a,function(_b){
this._selectNode.options[this._selectNode.options.length]=new Option(_b,_b,true,true);
},this);
},_placeItem:function(_c){
dojo.place(_c,this._inputNode,"before");
},_getCursorPos:function(_d){
if(typeof _d.selectionStart!="undefined"){
return _d.selectionStart;
}
try{
_d.focus();
}
catch(e){
}
var _e=_d.createTextRange();
_e.moveToBookmark(dojo.doc.selection.createRange().getBookmark());
_e.moveEnd("character",_d.value.length);
try{
return _d.value.length-_e.text.length;
}
finally{
_e=null;
}
},_onItemClose:function(_f){
if(this.disabled){
return;
}
if(this.useAnim){
var _10=dojo.fadeOut({node:_f.domNode,duration:this.duration,easing:this.easingOut,onEnd:dojo.hitch(this,"_destroyItem",_f)}).play();
}else{
this._destroyItem(_f);
}
},_onItemKeyDown:function(_11,e){
if(this.readOnlyItem||!this.useArrowForEdit){
return;
}
if(e.keyCode==dojo.keys.LEFT_ARROW&&this._getCursorPos(e.target)==0){
this._editBefore(_11);
}else{
if(e.keyCode==dojo.keys.RIGHT_ARROW&&this._getCursorPos(e.target)==e.target.value.length){
this._editAfter(_11);
}
}
},_editBefore:function(_12){
this._currentItem=this._getPreviousItem(_12);
if(this._currentItem!==null){
this._currentItem.edit();
}
},_editAfter:function(_13){
this._currentItem=this._getNextItem(_13);
if(this._currentItem!==null){
this._currentItem.edit();
}
if(!this.readOnlyInput){
if(this._currentItem===null){
this._focusInput();
}
}
},_onItemChange:function(_14,_15){
_15=_15||_14.get("value");
this._testItem(_14,_15);
this._updateValues();
},_onItemEdit:function(_16){
dojo.removeClass(_16.domNode,["dijitError",this.baseClass+"Match",this.baseClass+"Mismatch"]);
},_testItem:function(_17,_18){
var re=new RegExp(this.regExpGen(this.constraints));
var _19=_18.match(re);
dojo.removeClass(_17.domNode,this.baseClass+(!_19?"Match":"Mismatch"));
dojo.addClass(_17.domNode,this.baseClass+(_19?"Match":"Mismatch"));
dojo.toggleClass(_17.domNode,"dijitError",!_19);
if((this.showCloseButtonWhenValid&&_19)||(this.showCloseButtonWhenInvalid&&!_19)){
dojo.addClass(_17.domNode,this.baseClass+"Closable");
}else{
dojo.removeClass(_17.domNode,this.baseClass+"Closable");
}
},_getValueAttr:function(){
return this.value;
},_setValueAttr:function(_1a){
this._destroyAllItems();
this.add(this._parseValue(_1a));
},_parseValue:function(_1b){
if(typeof _1b=="string"){
if(dojo.isString(this.delimiter)){
this.delimiter=[this.delimiter];
}
var re=new RegExp("^.*("+this.delimiter.join("|")+").*");
if(_1b.match(re)){
re=new RegExp(this.delimiter.join("|"));
return _1b.split(re);
}
}
return _1b;
},regExpGen:function(_1c){
return this.regExp;
},_setDisabledAttr:function(_1d){
if(!this.readOnlyItem){
for(var i in this._items){
this._items[i].set("disabled",_1d);
}
}
if(!this.readOnlyInput){
this._input.set("disabled",_1d);
}
this.inherited(arguments);
},_onHandler:function(_1e){
var _1f=this._parseValue(_1e);
if(dojo.isArray(_1f)){
this.add(_1f);
}
},_onClick:function(e){
this._focusInput();
},_focusInput:function(){
if(!this.readOnlyInput&&this._input.focus){
this._input.focus();
}
},_inputOnKeyDown:function(e){
this._currentItem=null;
var val=this._input.get("value");
if(e.keyCode==dojo.keys.BACKSPACE&&val==""&&this.get("lastItem")){
this._destroyItem(this.get("lastItem"));
}else{
if(e.keyCode==dojo.keys.ENTER&&val!=""){
this.add(val);
}else{
if(e.keyCode==dojo.keys.LEFT_ARROW&&this._getCursorPos(this._input.focusNode)==0&&!this.readOnlyItem&&this.useArrowForEdit){
this._editBefore();
}
}
}
},_inputOnBlur:function(){
var val=this._input.get("value");
if(this.useOnBlur&&val!=""){
this.add(val);
}
},_getMatchedValueAttr:function(){
return this._getValues(dojo.hitch(this,this._matchValidator));
},_getMismatchedValueAttr:function(){
return this._getValues(dojo.hitch(this,this._mismatchValidator));
},_getValues:function(_20){
var _21=[];
_20=_20||this._nullValidator;
for(var i in this._items){
var _22=this._items[i];
if(_22===null){
continue;
}
var _23=_22.get("value");
if(_20(_23)){
_21.push(_23);
}
}
return _21;
},_nullValidator:function(_24){
return true;
},_matchValidator:function(_25){
var re=new RegExp(this.regExpGen(this.constraints));
return _25.match(re);
},_mismatchValidator:function(_26){
var re=new RegExp(this.regExpGen(this.constraints));
return !(_26.match(re));
},_getLastItemAttr:function(){
return this._getSomeItem();
},_getSomeItem:function(_27,_28){
_27=_27||false;
_28=_28||"last";
var _29=null;
var _2a=-1;
for(var i in this._items){
if(this._items[i]===null){
continue;
}
if(_28=="before"&&this._items[i]===_27){
break;
}
_29=this._items[i];
if(_28=="first"||_2a==0){
_2a=1;
break;
}
if(_28=="after"&&this._items[i]===_27){
_2a=0;
}
}
if(_28=="after"&&_2a==0){
_29=null;
}
return _29;
},_getPreviousItem:function(_2b){
return this._getSomeItem(_2b,"before");
},_getNextItem:function(_2c){
return this._getSomeItem(_2c,"after");
},_destroyItem:function(_2d,_2e){
this._items[_2d.index]=null;
_2d.destroy();
this._count--;
if(_2e!==false){
this._updateValues();
this._setReadOnlyWhenMaxItemsReached();
}
},_updateValues:function(){
this.value=this._getValues();
this._setSelectNode();
},_destroyAllItems:function(){
for(var i in this._items){
if(this._items[i]==null){
continue;
}
this._destroyItem(this._items[i],false);
}
this._items=[];
this._count=0;
this.value=null;
this._setSelectNode();
this._setReadOnlyWhenMaxItemsReached();
},destroy:function(){
this._destroyAllItems();
this._lastAddedItem=null;
if(!this._input){
this._input.destroy();
}
this.inherited(arguments);
}});
dojo.declare("dojox.form._ListInputInputItem",[dijit._Widget,dijit._Templated],{templateString:"<li class=\"dijit dijitReset dijitLeft dojoxListInputItem\" dojoAttachEvent=\"onclick: onClick\" ><span dojoAttachPoint=\"labelNode\"></span></li>",closeButtonNode:null,readOnlyItem:true,baseClass:"dojoxListInputItem",value:"",regExp:".*",_editBox:null,_handleKeyDown:null,attributeMap:{value:{node:"labelNode",type:"innerHTML"}},postMixInProperties:function(){
var _2f=dojo.i18n.getLocalization("dijit","common");
dojo.mixin(this,_2f);
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
this.closeButtonNode=dojo.create("span",{"class":"dijitButtonNode dijitDialogCloseIcon",title:this.itemClose,onclick:dojo.hitch(this,"onClose"),onmouseenter:dojo.hitch(this,"_onCloseEnter"),onmouseleave:dojo.hitch(this,"_onCloseLeave")},this.domNode);
dojo.create("span",{"class":"closeText",title:this.itemClose,innerHTML:"x"},this.closeButtonNode);
},startup:function(){
this.inherited(arguments);
this._createInlineEditBox();
},_setReadOnlyItemAttr:function(_30){
this.readOnlyItem=_30;
if(!_30){
this._createInlineEditBox();
}else{
if(this._editBox){
this._editBox.set("disabled",true);
}
}
},_createInlineEditBox:function(){
if(this.readOnlyItem){
return;
}
if(!this._started){
return;
}
if(this._editBox){
this._editBox.set("disabled",false);
return;
}
this._editBox=new dijit.InlineEditBox({value:this.value,editor:"dijit.form.ValidationTextBox",editorParams:{regExp:this.regExp}},this.labelNode);
this.connect(this._editBox,"edit","_onEdit");
this.connect(this._editBox,"onChange","_onCloseEdit");
this.connect(this._editBox,"onCancel","_onCloseEdit");
},edit:function(){
if(!this.readOnlyItem){
this._editBox.edit();
}
},_onCloseEdit:function(_31){
dojo.removeClass(this.closeButtonNode,this.baseClass+"Edited");
dojo.disconnect(this._handleKeyDown);
this.onChange(_31);
},_onEdit:function(){
dojo.addClass(this.closeButtonNode,this.baseClass+"Edited");
this._handleKeyDown=dojo.connect(this._editBox.editWidget,"_onKeyPress",this,"onKeyDown");
this.onEdit();
},_setDisabledAttr:function(_32){
if(!this.readOnlyItem){
this._editBox.set("disabled",_32);
}
},_getValueAttr:function(){
return (!this.readOnlyItem&&this._started?this._editBox.get("value"):this.value);
},destroy:function(){
if(this._editBox){
this._editBox.destroy();
}
this.inherited(arguments);
},_onCloseEnter:function(){
dojo.addClass(this.closeButtonNode,"dijitDialogCloseIcon-hover");
},_onCloseLeave:function(){
dojo.removeClass(this.closeButtonNode,"dijitDialogCloseIcon-hover");
},onClose:function(){
},onEdit:function(){
},onClick:function(){
},onChange:function(_33){
},onKeyDown:function(_34){
}});
dojo.declare("dojox.form._ListInputInputBox",[dijit.form.ValidationTextBox],{minWidth:50,intermediateChanges:true,regExp:".*",_sizer:null,onChange:function(_35){
this.inherited(arguments);
if(this._sizer===null){
this._sizer=dojo.create("div",{style:{position:"absolute",left:"-10000px",top:"-10000px"}},dojo.body());
}
this._sizer.innerHTML=_35;
var w=dojo.contentBox(this._sizer).w+this.minWidth;
dojo.contentBox(this.domNode,{w:w});
},destroy:function(){
dojo.destroy(this._sizer);
this.inherited(arguments);
}});
}
