//>>built
define("dijit/form/TimeTextBox",["dojo/_base/declare","dojo/keys","dojo/_base/lang","../_TimePicker","./_DateTimeTextBox"],function(_1,_2,_3,_4,_5){
return _1("dijit.form.TimeTextBox",_5,{baseClass:"dijitTextBox dijitComboBox dijitTimeTextBox",popupClass:_4,_selector:"time",value:new Date(""),maxHeight:-1,_onKey:function(_6){
if(this.disabled||this.readOnly){
return;
}
this.inherited(arguments);
switch(_6.keyCode){
case _2.ENTER:
case _2.TAB:
case _2.ESCAPE:
case _2.DOWN_ARROW:
case _2.UP_ARROW:
break;
default:
this.defer(function(){
var _7=this.get("displayedValue");
this.filterString=(_7&&!this.parse(_7,this.constraints))?_7.toLowerCase():"";
if(this._opened){
this.closeDropDown();
}
this.openDropDown();
});
}
}});
});
