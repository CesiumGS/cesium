//>>built
require({cache:{"url:dijit/form/templates/DropDownBox.html":"<div class=\"dijit dijitReset dijitInline dijitLeft\"\n\tid=\"widget_${id}\"\n\trole=\"combobox\"\n\taria-haspopup=\"true\"\n\tdata-dojo-attach-point=\"_popupStateNode\"\n\t><div class='dijitReset dijitRight dijitButtonNode dijitArrowButton dijitDownArrowButton dijitArrowButtonContainer'\n\t\tdata-dojo-attach-point=\"_buttonNode\" role=\"presentation\"\n\t\t><input class=\"dijitReset dijitInputField dijitArrowButtonInner\" value=\"&#9660; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"button presentation\" aria-hidden=\"true\"\n\t\t\t${_buttonInputDisabled}\n\t/></div\n\t><div class='dijitReset dijitValidationContainer'\n\t\t><input class=\"dijitReset dijitInputField dijitValidationIcon dijitValidationInner\" value=\"&#935; \" type=\"text\" tabIndex=\"-1\" readonly=\"readonly\" role=\"presentation\"\n\t/></div\n\t><div class=\"dijitReset dijitInputField dijitInputContainer\"\n\t\t><input class='dijitReset dijitInputInner' ${!nameAttrSetting} type=\"text\" autocomplete=\"off\"\n\t\t\tdata-dojo-attach-point=\"textbox,focusNode\" role=\"textbox\"\n\t/></div\n></div>\n"}});
define("dijit/form/_DateTimeTextBox",["dojo/date","dojo/date/locale","dojo/date/stamp","dojo/_base/declare","dojo/_base/lang","./RangeBoundTextBox","../_HasDropDown","dojo/text!./templates/DropDownBox.html"],function(_1,_2,_3,_4,_5,_6,_7,_8){
new Date("X");
var _9=_4("dijit.form._DateTimeTextBox",[_6,_7],{templateString:_8,hasDownArrow:true,cssStateNodes:{"_buttonNode":"dijitDownArrowButton"},pattern:_2.regexp,datePackage:"",postMixInProperties:function(){
this.inherited(arguments);
this._set("type","text");
},compare:function(_a,_b){
var _c=this._isInvalidDate(_a);
var _d=this._isInvalidDate(_b);
return _c?(_d?0:-1):(_d?1:_1.compare(_a,_b,this._selector));
},autoWidth:true,format:function(_e,_f){
if(!_e){
return "";
}
return this.dateLocaleModule.format(_e,_f);
},"parse":function(_10,_11){
return this.dateLocaleModule.parse(_10,_11)||(this._isEmpty(_10)?null:undefined);
},serialize:function(val,_12){
if(val.toGregorian){
val=val.toGregorian();
}
return _3.toISOString(val,_12);
},dropDownDefaultValue:new Date(),value:new Date(""),_blankValue:null,popupClass:"",_selector:"",constructor:function(_13){
this.dateModule=_13.datePackage?_5.getObject(_13.datePackage,false):_1;
this.dateClassObj=this.dateModule.Date||Date;
this.dateLocaleModule=_13.datePackage?_5.getObject(_13.datePackage+".locale",false):_2;
this._set("pattern",this.dateLocaleModule.regexp);
this._invalidDate=this.constructor.prototype.value.toString();
},buildRendering:function(){
this.inherited(arguments);
if(!this.hasDownArrow){
this._buttonNode.style.display="none";
}
if(!this.hasDownArrow){
this._buttonNode=this.domNode;
this.baseClass+=" dijitComboBoxOpenOnClick";
}
},_setConstraintsAttr:function(_14){
_14.selector=this._selector;
_14.fullYear=true;
var _15=_3.fromISOString;
if(typeof _14.min=="string"){
_14.min=_15(_14.min);
}
if(typeof _14.max=="string"){
_14.max=_15(_14.max);
}
this.inherited(arguments);
},_isInvalidDate:function(_16){
return !_16||isNaN(_16)||typeof _16!="object"||_16.toString()==this._invalidDate;
},_setValueAttr:function(_17,_18,_19){
if(_17!==undefined){
if(typeof _17=="string"){
_17=_3.fromISOString(_17);
}
if(this._isInvalidDate(_17)){
_17=null;
}
if(_17 instanceof Date&&!(this.dateClassObj instanceof Date)){
_17=new this.dateClassObj(_17);
}
}
this.inherited(arguments);
if(this.value instanceof Date){
this.filterString="";
}
if(this.dropDown){
this.dropDown.set("value",_17,false);
}
},_set:function(_1a,_1b){
var _1c=this._get("value");
if(_1a=="value"&&_1c instanceof Date&&this.compare(_1b,_1c)==0){
return;
}
this.inherited(arguments);
},_setDropDownDefaultValueAttr:function(val){
if(this._isInvalidDate(val)){
val=new this.dateClassObj();
}
this._set("dropDownDefaultValue",val);
},openDropDown:function(_1d){
if(this.dropDown){
this.dropDown.destroy();
}
var _1e=_5.isString(this.popupClass)?_5.getObject(this.popupClass,false):this.popupClass,_1f=this,_20=this.get("value");
this.dropDown=new _1e({onChange:function(_21){
_1f.set("value",_21,true);
},id:this.id+"_popup",dir:_1f.dir,lang:_1f.lang,value:_20,textDir:_1f.textDir,currentFocus:!this._isInvalidDate(_20)?_20:this.dropDownDefaultValue,constraints:_1f.constraints,filterString:_1f.filterString,datePackage:_1f.params.datePackage,isDisabledDate:function(_22){
return !_1f.rangeCheck(_22,_1f.constraints);
}});
this.inherited(arguments);
},_getDisplayedValueAttr:function(){
return this.textbox.value;
},_setDisplayedValueAttr:function(_23,_24){
this._setValueAttr(this.parse(_23,this.constraints),_24,_23);
}});
return _9;
});
