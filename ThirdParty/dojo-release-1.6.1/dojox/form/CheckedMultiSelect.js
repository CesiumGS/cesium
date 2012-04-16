/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.CheckedMultiSelect"]){
dojo._hasResource["dojox.form.CheckedMultiSelect"]=true;
dojo.provide("dojox.form.CheckedMultiSelect");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.Tooltip");
dojo.require("dijit.form._FormSelectWidget");
dojo.declare("dojox.form._CheckedMultiSelectItem",[dijit._Widget,dijit._Templated],{widgetsInTemplate:true,templateString:dojo.cache("dojox.form","resources/_CheckedMultiSelectItem.html","<div class=\"dijitReset ${baseClass}\"\n\t><input class=\"${baseClass}Box\" dojoType=\"dijit.form.CheckBox\" dojoAttachPoint=\"checkBox\" \n\t\tdojoAttachEvent=\"_onClick:_changeBox\" type=\"${_type.type}\" baseClass=\"${_type.baseClass}\"\n\t/><div class=\"dijitInline ${baseClass}Label\" dojoAttachPoint=\"labelNode\" dojoAttachEvent=\"onclick:_onClick\"></div\n></div>\n"),baseClass:"dojoxMultiSelectItem",option:null,parent:null,disabled:false,readOnly:false,postMixInProperties:function(){
if(this.parent.multiple){
this._type={type:"checkbox",baseClass:"dijitCheckBox"};
}else{
this._type={type:"radio",baseClass:"dijitRadio"};
}
this.disabled=this.option.disabled=this.option.disabled||false;
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
this.labelNode.innerHTML=this.option.label;
},_changeBox:function(){
if(this.get("disabled")||this.get("readOnly")){
return;
}
if(this.parent.multiple){
this.option.selected=this.checkBox.get("value")&&true;
}else{
this.parent.set("value",this.option.value);
}
this.parent._updateSelection();
this.parent.focus();
},_onClick:function(e){
if(this.get("disabled")||this.get("readOnly")){
dojo.stopEvent(e);
}else{
this.checkBox._onClick(e);
}
},_updateBox:function(){
this.checkBox.set("value",this.option.selected);
},_setDisabledAttr:function(_1){
this.disabled=_1||this.option.disabled;
this.checkBox.set("disabled",this.disabled);
dojo.toggleClass(this.domNode,"dojoxMultiSelectDisabled",this.disabled);
},_setReadOnlyAttr:function(_2){
this.checkBox.set("readOnly",_2);
this.readOnly=_2;
}});
dojo.declare("dojox.form.CheckedMultiSelect",dijit.form._FormSelectWidget,{templateString:dojo.cache("dojox.form","resources/CheckedMultiSelect.html","<div class=\"dijit dijitReset dijitInline\" dojoAttachEvent=\"onmousedown:_onMouseDown,onclick:focus\"\n\t><select class=\"${baseClass}Select\" multiple=\"true\" dojoAttachPoint=\"containerNode,focusNode\"></select\n\t><div dojoAttachPoint=\"wrapperDiv\"></div\n></div>\n"),baseClass:"dojoxMultiSelect",required:false,invalidMessage:"At least one item must be selected.",_message:"",tooltipPosition:[],_onMouseDown:function(e){
dojo.stopEvent(e);
},validator:function(){
if(!this.required){
return true;
}
return dojo.some(this.getOptions(),function(_3){
return _3.selected&&_3.value!=null&&_3.value.toString().length!=0;
});
},validate:function(_4){
dijit.hideTooltip(this.domNode);
var _5=this.isValid(_4);
if(!_5){
this.displayMessage(this.invalidMessage);
}
return _5;
},isValid:function(_6){
return this.validator();
},getErrorMessage:function(_7){
return this.invalidMessage;
},displayMessage:function(_8){
dijit.hideTooltip(this.domNode);
if(_8){
dijit.showTooltip(_8,this.domNode,this.tooltipPosition);
}
},onAfterAddOptionItem:function(_9,_a){
},_addOptionItem:function(_b){
var _c=new dojox.form._CheckedMultiSelectItem({option:_b,parent:this});
this.wrapperDiv.appendChild(_c.domNode);
this.onAfterAddOptionItem(_c,_b);
},_refreshState:function(){
this.validate(this._focused);
},onChange:function(_d){
this._refreshState();
},reset:function(){
this.inherited(arguments);
dijit.hideTooltip(this.domNode);
},_updateSelection:function(){
this.inherited(arguments);
this._handleOnChange(this.value);
dojo.forEach(this._getChildren(),function(c){
c._updateBox();
});
},_getChildren:function(){
return dojo.map(this.wrapperDiv.childNodes,function(n){
return dijit.byNode(n);
});
},invertSelection:function(_e){
dojo.forEach(this.options,function(i){
i.selected=!i.selected;
});
this._updateSelection();
},_setDisabledAttr:function(_f){
this.inherited(arguments);
dojo.forEach(this._getChildren(),function(_10){
if(_10&&_10.set){
_10.set("disabled",_f);
}
});
},_setReadOnlyAttr:function(_11){
if("readOnly" in this.attributeMap){
this._attrToDom("readOnly",_11);
}
this.readOnly=_11;
dojo.forEach(this._getChildren(),function(_12){
if(_12&&_12.set){
_12.set("readOnly",_11);
}
});
},uninitialize:function(){
dijit.hideTooltip(this.domNode);
dojo.forEach(this._getChildren(),function(_13){
_13.destroyRecursive();
});
this.inherited(arguments);
}});
}
