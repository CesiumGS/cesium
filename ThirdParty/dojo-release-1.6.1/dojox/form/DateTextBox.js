/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.DateTextBox"]){
dojo._hasResource["dojox.form.DateTextBox"]=true;
dojo.provide("dojox.form.DateTextBox");
dojo.experimental("dojox.form.DateTextBox");
dojo.require("dojox.widget.Calendar");
dojo.require("dojox.widget.CalendarViews");
dojo.require("dijit.form._DateTimeTextBox");
dojo.declare("dojox.form.DateTextBox",dijit.form._DateTimeTextBox,{popupClass:"dojox.widget.Calendar",_selector:"date",openDropDown:function(){
this.inherited(arguments);
dojo.style(this.dropDown.domNode.parentNode,"position","absolute");
}});
dojo.declare("dojox.form.DayTextBox",dojox.form.DateTextBox,{popupClass:"dojox.widget.DailyCalendar",parse:function(_1){
return _1;
},format:function(_2){
return _2.getDate?_2.getDate():_2;
},validator:function(_3){
var _4=Number(_3);
var _5=/(^-?\d\d*$)/.test(String(_3));
return _3==""||_3==null||(_5&&_4>=1&&_4<=31);
},_setValueAttr:function(_6,_7,_8){
if(_6){
if(_6.getDate){
_6=_6.getDate();
}
}
dijit.form.TextBox.prototype._setValueAttr.call(this,_6,_7,_8);
},openDropDown:function(){
this.inherited(arguments);
this.dropDown.onValueSelected=dojo.hitch(this,function(_9){
this.focus();
setTimeout(dojo.hitch(this,"closeDropDown"),1);
dijit.form.TextBox.prototype._setValueAttr.call(this,String(_9.getDate()),true,String(_9.getDate()));
});
}});
dojo.declare("dojox.form.MonthTextBox",dojox.form.DateTextBox,{popupClass:"dojox.widget.MonthlyCalendar",selector:"date",postMixInProperties:function(){
this.inherited(arguments);
this.constraints.datePattern="MM";
},format:function(_a){
if(!_a&&_a!==0){
return 1;
}
if(_a.getMonth){
return _a.getMonth()+1;
}
return Number(_a)+1;
},parse:function(_b,_c){
return Number(_b)-1;
},serialize:function(_d,_e){
return String(_d);
},validator:function(_f){
var num=Number(_f);
var _10=/(^-?\d\d*$)/.test(String(_f));
return _f==""||_f==null||(_10&&num>=1&&num<=12);
},_setValueAttr:function(_11,_12,_13){
if(_11){
if(_11.getMonth){
_11=_11.getMonth();
}
}
dijit.form.TextBox.prototype._setValueAttr.call(this,_11,_12,_13);
},openDropDown:function(){
this.inherited(arguments);
this.dropDown.onValueSelected=dojo.hitch(this,function(_14){
this.focus();
setTimeout(dojo.hitch(this,"closeDropDown"),1);
dijit.form.TextBox.prototype._setValueAttr.call(this,_14,true,_14);
});
}});
dojo.declare("dojox.form.YearTextBox",dojox.form.DateTextBox,{popupClass:"dojox.widget.YearlyCalendar",format:function(_15){
if(typeof _15=="string"){
return _15;
}else{
if(_15.getFullYear){
return _15.getFullYear();
}
}
return _15;
},validator:function(_16){
return _16==""||_16==null||/(^-?\d\d*$)/.test(String(_16));
},_setValueAttr:function(_17,_18,_19){
if(_17){
if(_17.getFullYear){
_17=_17.getFullYear();
}
}
dijit.form.TextBox.prototype._setValueAttr.call(this,_17,_18,_19);
},openDropDown:function(){
this.inherited(arguments);
this.dropDown.onValueSelected=dojo.hitch(this,function(_1a){
this.focus();
setTimeout(dojo.hitch(this,"closeDropDown"),1);
dijit.form.TextBox.prototype._setValueAttr.call(this,_1a,true,_1a);
});
},parse:function(_1b,_1c){
return _1b||(this._isEmpty(_1b)?null:undefined);
},filter:function(val){
if(val&&val.getFullYear){
return val.getFullYear().toString();
}
return this.inherited(arguments);
}});
}
