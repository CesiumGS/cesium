/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form._DateTimeTextBox"]){
dojo._hasResource["dijit.form._DateTimeTextBox"]=true;
dojo.provide("dijit.form._DateTimeTextBox");
dojo.require("dojo.date");
dojo.require("dojo.date.locale");
dojo.require("dojo.date.stamp");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit._HasDropDown");
new Date("X");
dojo.declare("dijit.form._DateTimeTextBox",[dijit.form.RangeBoundTextBox,dijit._HasDropDown],{templateString:dojo.cache("dijit.form","templates/DropDownBox.html","<div class=\"dijit dijitReset dijitInlineTable dijitLeft\"\n\tid=\"widget_${id}\"\n\trole=\"combobox\"\n\t><div class='dijitReset dijitRight dijitButtonNode dijitArrowButton dijitDownArrowButton dijitArrowButtonContainer'\n\t\tdojoAttachPoint=\"_buttonNode, _popupStateNode\" role=\"presentation\"\n\t\t><input class=\"dijitReset dijitInputField dijitArrowButtonInner\" value=\"&#9660; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"presentation\"\n\t\t\t${_buttonInputDisabled}\n\t/></div\n\t><div class='dijitReset dijitValidationContainer'\n\t\t><input class=\"dijitReset dijitInputField dijitValidationIcon dijitValidationInner\" value=\"&#935; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"presentation\"\n\t/></div\n\t><div class=\"dijitReset dijitInputField dijitInputContainer\"\n\t\t><input class='dijitReset dijitInputInner' ${!nameAttrSetting} type=\"text\" autocomplete=\"off\"\n\t\t\tdojoAttachPoint=\"textbox,focusNode\" role=\"textbox\" aria-haspopup=\"true\"\n\t/></div\n></div>\n"),hasDownArrow:true,openOnClick:true,regExpGen:dojo.date.locale.regexp,datePackage:"dojo.date",compare:function(_1,_2){
var _3=this._isInvalidDate(_1);
var _4=this._isInvalidDate(_2);
return _3?(_4?0:-1):(_4?1:dojo.date.compare(_1,_2,this._selector));
},forceWidth:true,format:function(_5,_6){
if(!_5){
return "";
}
return this.dateLocaleModule.format(_5,_6);
},"parse":function(_7,_8){
return this.dateLocaleModule.parse(_7,_8)||(this._isEmpty(_7)?null:undefined);
},serialize:function(_9,_a){
if(_9.toGregorian){
_9=_9.toGregorian();
}
return dojo.date.stamp.toISOString(_9,_a);
},dropDownDefaultValue:new Date(),value:new Date(""),_blankValue:null,popupClass:"",_selector:"",constructor:function(_b){
var _c=_b.datePackage?_b.datePackage+".Date":"Date";
this.dateClassObj=dojo.getObject(_c,false);
this.value=new this.dateClassObj("");
this.datePackage=_b.datePackage||this.datePackage;
this.dateLocaleModule=dojo.getObject(this.datePackage+".locale",false);
this.regExpGen=this.dateLocaleModule.regexp;
this._invalidDate=dijit.form._DateTimeTextBox.prototype.value.toString();
},buildRendering:function(){
this.inherited(arguments);
if(!this.hasDownArrow){
this._buttonNode.style.display="none";
}
if(this.openOnClick||!this.hasDownArrow){
this._buttonNode=this.domNode;
this.baseClass+=" dijitComboBoxOpenOnClick";
}
},_setConstraintsAttr:function(_d){
_d.selector=this._selector;
_d.fullYear=true;
var _e=dojo.date.stamp.fromISOString;
if(typeof _d.min=="string"){
_d.min=_e(_d.min);
}
if(typeof _d.max=="string"){
_d.max=_e(_d.max);
}
this.inherited(arguments);
},_isInvalidDate:function(_f){
return !_f||isNaN(_f)||typeof _f!="object"||_f.toString()==this._invalidDate;
},_setValueAttr:function(_10,_11,_12){
if(_10!==undefined){
if(typeof _10=="string"){
_10=dojo.date.stamp.fromISOString(_10);
}
if(this._isInvalidDate(_10)){
_10=null;
}
if(_10 instanceof Date&&!(this.dateClassObj instanceof Date)){
_10=new this.dateClassObj(_10);
}
}
this.inherited(arguments);
if(this.dropDown){
this.dropDown.set("value",_10,false);
}
},_set:function(_13,_14){
if(_13=="value"&&this.value instanceof Date&&this.compare(_14,this.value)==0){
return;
}
this.inherited(arguments);
},_setDropDownDefaultValueAttr:function(val){
if(this._isInvalidDate(val)){
val=new this.dateClassObj();
}
this.dropDownDefaultValue=val;
},openDropDown:function(_15){
if(this.dropDown){
this.dropDown.destroy();
}
var _16=dojo.getObject(this.popupClass,false),_17=this,_18=this.get("value");
this.dropDown=new _16({onChange:function(_19){
dijit.form._DateTimeTextBox.superclass._setValueAttr.call(_17,_19,true);
},id:this.id+"_popup",dir:_17.dir,lang:_17.lang,value:_18,currentFocus:!this._isInvalidDate(_18)?_18:this.dropDownDefaultValue,constraints:_17.constraints,filterString:_17.filterString,datePackage:_17.datePackage,isDisabledDate:function(_1a){
return !_17.rangeCheck(_1a,_17.constraints);
}});
this.inherited(arguments);
},_getDisplayedValueAttr:function(){
return this.textbox.value;
},_setDisplayedValueAttr:function(_1b,_1c){
this._setValueAttr(this.parse(_1b,this.constraints),_1c,_1b);
}});
}
