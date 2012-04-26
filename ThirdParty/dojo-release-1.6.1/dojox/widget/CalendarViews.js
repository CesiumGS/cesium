/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.CalendarViews"]){
dojo._hasResource["dojox.widget.CalendarViews"]=true;
dojo.provide("dojox.widget.CalendarViews");
dojo.experimental("dojox.widget.CalendarViews");
dojo.require("dojox.widget.Calendar");
dojo.declare("dojox.widget._CalendarMonth",null,{constructor:function(){
this._addView(dojox.widget._CalendarMonthView);
}});
dojo.declare("dojox.widget._CalendarMonthView",[dojox.widget._CalendarView,dijit._Templated],{templateString:dojo.cache("dojox.widget","Calendar/CalendarMonth.html","<div class=\"dojoxCalendarMonthLabels\" style=\"left: 0px;\"  \n\tdojoAttachPoint=\"monthContainer\" dojoAttachEvent=\"onclick: onClick\">\n    <table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin: auto;\">\n        <tbody>\n            <tr class=\"dojoxCalendarMonthGroupTemplate\">\n                <td class=\"dojoxCalendarMonthTemplate\">\n                    <div class=\"dojoxCalendarMonthLabel\"></div>\n                </td>\n             </tr>\n        </tbody>\n    </table>\n</div>\n"),datePart:"year",headerClass:"dojoxCalendarMonthHeader",postCreate:function(){
this.cloneClass(".dojoxCalendarMonthTemplate",3);
this.cloneClass(".dojoxCalendarMonthGroupTemplate",2);
this._populateMonths();
this.addFx(".dojoxCalendarMonthLabel",this.domNode);
},_setValueAttr:function(_1){
this.header.innerHTML=_1.getFullYear();
},_getMonthNames:dojox.widget._CalendarMonthYearView.prototype._getMonthNames,_populateMonths:dojox.widget._CalendarMonthYearView.prototype._populateMonths,onClick:function(_2){
if(!dojo.hasClass(_2.target,"dojoxCalendarMonthLabel")){
dojo.stopEvent(_2);
return;
}
var _3=_2.target.parentNode;
var _4=_3.cellIndex+(_3.parentNode.rowIndex*4);
var _5=this.get("value");
_5.setMonth(_4);
_5.setMonth(_4);
this.onValueSelected(_5,_4);
}});
dojo.declare("dojox.widget._CalendarYear",null,{parent:null,constructor:function(){
this._addView(dojox.widget._CalendarYearView);
}});
dojo.declare("dojox.widget._CalendarYearView",[dojox.widget._CalendarView,dijit._Templated],{templateString:dojo.cache("dojox.widget","Calendar/CalendarYear.html","<div class=\"dojoxCalendarYearLabels\" style=\"left: 0px;\" dojoAttachPoint=\"yearContainer\">\n    <table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin: auto;\" dojoAttachEvent=\"onclick: onClick\">\n        <tbody>\n            <tr class=\"dojoxCalendarYearGroupTemplate\">\n                <td class=\"dojoxCalendarNextMonth dojoxCalendarYearTemplate\">\n                    <div class=\"dojoxCalendarYearLabel\">\n                    </div>\n                </td>\n            </tr>\n        </tbody>\n    </table>\n</div>\n"),displayedYears:6,postCreate:function(){
this.cloneClass(".dojoxCalendarYearTemplate",3);
this.cloneClass(".dojoxCalendarYearGroupTemplate",2);
this._populateYears();
this.addFx(".dojoxCalendarYearLabel",this.domNode);
},_setValueAttr:function(_6){
this._populateYears(_6.getFullYear());
},_populateYears:dojox.widget._CalendarMonthYearView.prototype._populateYears,adjustDate:function(_7,_8){
return dojo.date.add(_7,"year",_8*12);
},onClick:function(_9){
if(!dojo.hasClass(_9.target,"dojoxCalendarYearLabel")){
dojo.stopEvent(_9);
return;
}
var _a=Number(_9.target.innerHTML);
var _b=this.get("value");
_b.setYear(_a);
this.onValueSelected(_b,_a);
}});
dojo.declare("dojox.widget.Calendar3Pane",[dojox.widget._CalendarBase,dojox.widget._CalendarDay,dojox.widget._CalendarMonth,dojox.widget._CalendarYear],{});
dojo.declare("dojox.widget.MonthlyCalendar",[dojox.widget._CalendarBase,dojox.widget._CalendarMonth],{_makeDate:function(_c){
var _d=new Date();
_d.setMonth(_c);
return _d;
}});
dojo.declare("dojox.widget.YearlyCalendar",[dojox.widget._CalendarBase,dojox.widget._CalendarYear],{_makeDate:function(_e){
var _f=new Date();
_f.setFullYear(_e);
return _f;
}});
}
