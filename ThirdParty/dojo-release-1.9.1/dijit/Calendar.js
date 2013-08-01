//>>built
define("dijit/Calendar",["dojo/_base/array","dojo/date","dojo/date/locale","dojo/_base/declare","dojo/dom-attr","dojo/dom-class","dojo/_base/kernel","dojo/keys","dojo/_base/lang","dojo/on","dojo/sniff","./CalendarLite","./_Widget","./_CssStateMixin","./_TemplatedMixin","./form/DropDownButton"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,on,_a,_b,_c,_d,_e,_f){
var _10=_4("dijit.Calendar",[_b,_c,_d],{cssStateNodes:{"decrementMonth":"dijitCalendarArrow","incrementMonth":"dijitCalendarArrow","previousYearLabelNode":"dijitCalendarPreviousYear","nextYearLabelNode":"dijitCalendarNextYear"},setValue:function(_11){
_7.deprecated("dijit.Calendar:setValue() is deprecated.  Use set('value', ...) instead.","","2.0");
this.set("value",_11);
},_createMonthWidget:function(){
return new _10._MonthDropDownButton({id:this.id+"_mddb",tabIndex:-1,onMonthSelect:_9.hitch(this,"_onMonthSelect"),lang:this.lang,dateLocaleModule:this.dateLocaleModule},this.monthNode);
},postCreate:function(){
this.inherited(arguments);
this.own(on(this.domNode,"keydown",_9.hitch(this,"_onKeyDown")),on(this.dateRowsNode,"mouseover",_9.hitch(this,"_onDayMouseOver")),on(this.dateRowsNode,"mouseout",_9.hitch(this,"_onDayMouseOut")),on(this.dateRowsNode,"mousedown",_9.hitch(this,"_onDayMouseDown")),on(this.dateRowsNode,"mouseup",_9.hitch(this,"_onDayMouseUp")));
},_onMonthSelect:function(_12){
var _13=new this.dateClassObj(this.currentFocus);
_13.setDate(1);
_13.setMonth(_12);
var _14=this.dateModule.getDaysInMonth(_13);
var _15=this.currentFocus.getDate();
_13.setDate(Math.min(_15,_14));
this._setCurrentFocusAttr(_13);
},_onDayMouseOver:function(evt){
var _16=_6.contains(evt.target,"dijitCalendarDateLabel")?evt.target.parentNode:evt.target;
if(_16&&((_16.dijitDateValue&&!_6.contains(_16,"dijitCalendarDisabledDate"))||_16==this.previousYearLabelNode||_16==this.nextYearLabelNode)){
_6.add(_16,"dijitCalendarHoveredDate");
this._currentNode=_16;
}
},_onDayMouseOut:function(evt){
if(!this._currentNode){
return;
}
if(evt.relatedTarget&&evt.relatedTarget.parentNode==this._currentNode){
return;
}
var cls="dijitCalendarHoveredDate";
if(_6.contains(this._currentNode,"dijitCalendarActiveDate")){
cls+=" dijitCalendarActiveDate";
}
_6.remove(this._currentNode,cls);
this._currentNode=null;
},_onDayMouseDown:function(evt){
var _17=evt.target.parentNode;
if(_17&&_17.dijitDateValue&&!_6.contains(_17,"dijitCalendarDisabledDate")){
_6.add(_17,"dijitCalendarActiveDate");
this._currentNode=_17;
}
},_onDayMouseUp:function(evt){
var _18=evt.target.parentNode;
if(_18&&_18.dijitDateValue){
_6.remove(_18,"dijitCalendarActiveDate");
}
},handleKey:function(evt){
var _19=-1,_1a,_1b=this.currentFocus;
switch(evt.keyCode){
case _8.RIGHT_ARROW:
_19=1;
case _8.LEFT_ARROW:
_1a="day";
if(!this.isLeftToRight()){
_19*=-1;
}
break;
case _8.DOWN_ARROW:
_19=1;
case _8.UP_ARROW:
_1a="week";
break;
case _8.PAGE_DOWN:
_19=1;
case _8.PAGE_UP:
_1a=evt.ctrlKey||evt.altKey?"year":"month";
break;
case _8.END:
_1b=this.dateModule.add(_1b,"month",1);
_1a="day";
case _8.HOME:
_1b=new this.dateClassObj(_1b);
_1b.setDate(1);
break;
default:
return true;
}
if(_1a){
_1b=this.dateModule.add(_1b,_1a,_19);
}
this._setCurrentFocusAttr(_1b);
return false;
},_onKeyDown:function(evt){
if(!this.handleKey(evt)){
evt.stopPropagation();
evt.preventDefault();
}
},onValueSelected:function(){
},onChange:function(_1c){
this.onValueSelected(_1c);
},getClassForDate:function(){
}});
_10._MonthDropDownButton=_4("dijit.Calendar._MonthDropDownButton",_f,{onMonthSelect:function(){
},postCreate:function(){
this.inherited(arguments);
this.dropDown=new _10._MonthDropDown({id:this.id+"_mdd",onChange:this.onMonthSelect});
},_setMonthAttr:function(_1d){
var _1e=this.dateLocaleModule.getNames("months","wide","standAlone",this.lang,_1d);
this.dropDown.set("months",_1e);
this.containerNode.innerHTML=(_a("ie")==6?"":"<div class='dijitSpacer'>"+this.dropDown.domNode.innerHTML+"</div>")+"<div class='dijitCalendarMonthLabel dijitCalendarCurrentMonthLabel'>"+_1e[_1d.getMonth()]+"</div>";
}});
_10._MonthDropDown=_4("dijit.Calendar._MonthDropDown",[_c,_e],{months:[],templateString:"<div class='dijitCalendarMonthMenu dijitMenu' "+"data-dojo-attach-event='onclick:_onClick,onmouseover:_onMenuHover,onmouseout:_onMenuHover'></div>",_setMonthsAttr:function(_1f){
this.domNode.innerHTML=_1.map(_1f,function(_20,idx){
return _20?"<div class='dijitCalendarMonthLabel' month='"+idx+"'>"+_20+"</div>":"";
}).join("");
},_onClick:function(evt){
this.onChange(_5.get(evt.target,"month"));
},onChange:function(){
},_onMenuHover:function(evt){
_6.toggle(evt.target,"dijitCalendarMonthLabelHover",evt.type=="mouseover");
}});
return _10;
});
