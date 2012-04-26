/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Calendar"]){
dojo._hasResource["dojox.widget.Calendar"]=true;
dojo.provide("dojox.widget.Calendar");
dojo.experimental("dojox.widget.Calendar");
dojo.require("dijit.Calendar");
dojo.require("dijit._Container");
dojo.declare("dojox.widget._CalendarBase",[dijit._Widget,dijit._Templated,dijit._Container],{templateString:dojo.cache("dojox.widget","Calendar/Calendar.html","<div class=\"dojoxCalendar\">\n    <div tabindex=\"0\" class=\"dojoxCalendarContainer\" style=\"visibility: visible;\" dojoAttachPoint=\"container\">\n\t\t<div style=\"display:none\">\n\t\t\t<div dojoAttachPoint=\"previousYearLabelNode\"></div>\n\t\t\t<div dojoAttachPoint=\"nextYearLabelNode\"></div>\n\t\t\t<div dojoAttachPoint=\"monthLabelSpacer\"></div>\n\t\t</div>\n        <div class=\"dojoxCalendarHeader\">\n            <div>\n                <div class=\"dojoxCalendarDecrease\" dojoAttachPoint=\"decrementMonth\"></div>\n            </div>\n            <div class=\"\">\n                <div class=\"dojoxCalendarIncrease\" dojoAttachPoint=\"incrementMonth\"></div>\n            </div>\n            <div class=\"dojoxCalendarTitle\" dojoAttachPoint=\"header\" dojoAttachEvent=\"onclick: onHeaderClick\">\n            </div>\n        </div>\n        <div class=\"dojoxCalendarBody\" dojoAttachPoint=\"containerNode\"></div>\n        <div class=\"\">\n            <div class=\"dojoxCalendarFooter\" dojoAttachPoint=\"footer\">                        \n            </div>\n        </div>\n    </div>\n</div>\n"),_views:null,useFx:true,widgetsInTemplate:true,value:new Date(),constraints:null,footerFormat:"medium",constructor:function(){
this._views=[];
this.value=new Date();
},postMixInProperties:function(){
var c=this.constraints;
if(c){
var _1=dojo.date.stamp.fromISOString;
if(typeof c.min=="string"){
c.min=_1(c.min);
}
if(typeof c.max=="string"){
c.max=_1(c.max);
}
}
this.value=this.parseInitialValue(this.value);
},parseInitialValue:function(_2){
if(!_2||_2===-1){
return new Date();
}else{
if(_2.getFullYear){
return _2;
}else{
if(!isNaN(_2)){
if(typeof this.value=="string"){
_2=parseInt(_2);
}
_2=this._makeDate(_2);
}
}
}
return _2;
},_makeDate:function(_3){
return _3;
},postCreate:function(){
this.displayMonth=new Date(this.get("value"));
if(this._isInvalidDate(this.displayMonth)){
this.displayMonth=new Date();
}
var _4={parent:this,_getValueAttr:dojo.hitch(this,function(){
return new Date(this._internalValue||this.value);
}),_getDisplayMonthAttr:dojo.hitch(this,function(){
return new Date(this.displayMonth);
}),_getConstraintsAttr:dojo.hitch(this,function(){
return this.constraints;
}),getLang:dojo.hitch(this,function(){
return this.lang;
}),isDisabledDate:dojo.hitch(this,this.isDisabledDate),getClassForDate:dojo.hitch(this,this.getClassForDate),addFx:this.useFx?dojo.hitch(this,this.addFx):function(){
}};
dojo.forEach(this._views,function(_5){
var _6=new _5(_4,dojo.create("div"));
this.addChild(_6);
var _7=_6.getHeader();
if(_7){
this.header.appendChild(_7);
dojo.style(_7,"display","none");
}
dojo.style(_6.domNode,"visibility","hidden");
dojo.connect(_6,"onValueSelected",this,"_onDateSelected");
_6.set("value",this.get("value"));
},this);
if(this._views.length<2){
dojo.style(this.header,"cursor","auto");
}
this.inherited(arguments);
this._children=this.getChildren();
this._currentChild=0;
var _8=new Date();
this.footer.innerHTML="Today: "+dojo.date.locale.format(_8,{formatLength:this.footerFormat,selector:"date",locale:this.lang});
dojo.connect(this.footer,"onclick",this,"goToToday");
var _9=this._children[0];
dojo.style(_9.domNode,"top","0px");
dojo.style(_9.domNode,"visibility","visible");
var _a=_9.getHeader();
if(_a){
dojo.style(_9.getHeader(),"display","");
}
dojo[_9.useHeader?"removeClass":"addClass"](this.container,"no-header");
_9.onDisplay();
var _b=this;
var _c=function(_d,_e,_f){
dijit.typematic.addMouseListener(_b[_d],_b,function(_10){
if(_10>=0){
_b._adjustDisplay(_e,_f);
}
},0.8,500);
};
_c("incrementMonth","month",1);
_c("decrementMonth","month",-1);
this._updateTitleStyle();
},addFx:function(_11,_12){
},_isInvalidDate:function(_13){
return !_13||isNaN(_13)||typeof _13!="object"||_13.toString()==this._invalidDate;
},_setValueAttr:function(_14){
if(!_14){
_14=new Date();
}
if(!_14["getFullYear"]){
_14=dojo.date.stamp.fromISOString(_14+"");
}
if(this._isInvalidDate(_14)){
return false;
}
if(!this.value||dojo.date.compare(_14,this.value)){
_14=new Date(_14);
this.displayMonth=new Date(_14);
this._internalValue=_14;
if(!this.isDisabledDate(_14,this.lang)&&this._currentChild==0){
this.value=_14;
this.onChange(_14);
}
if(this._children&&this._children.length>0){
this._children[this._currentChild].set("value",this.value);
}
return true;
}
return false;
},isDisabledDate:function(_15,_16){
var c=this.constraints;
var _17=dojo.date.compare;
return c&&(c.min&&(_17(c.min,_15,"date")>0)||(c.max&&_17(c.max,_15,"date")<0));
},onValueSelected:function(_18){
},_onDateSelected:function(_19,_1a,_1b){
this.displayMonth=_19;
this.set("value",_19);
if(!this._transitionVert(-1)){
if(!_1a&&_1a!==0){
_1a=this.get("value");
}
this.onValueSelected(_1a);
}
},onChange:function(_1c){
},onHeaderClick:function(e){
this._transitionVert(1);
},goToToday:function(){
this.set("value",new Date());
this.onValueSelected(this.get("value"));
},_transitionVert:function(_1d){
var _1e=this._children[this._currentChild];
var _1f=this._children[this._currentChild+_1d];
if(!_1f){
return false;
}
dojo.style(_1f.domNode,"visibility","visible");
var _20=dojo.style(this.containerNode,"height");
_1f.set("value",this.displayMonth);
if(_1e.header){
dojo.style(_1e.header,"display","none");
}
if(_1f.header){
dojo.style(_1f.header,"display","");
}
dojo.style(_1f.domNode,"top",(_20*-1)+"px");
dojo.style(_1f.domNode,"visibility","visible");
this._currentChild+=_1d;
var _21=_20*_1d;
var _22=0;
dojo.style(_1f.domNode,"top",(_21*-1)+"px");
var _23=dojo.animateProperty({node:_1e.domNode,properties:{top:_21},onEnd:function(){
dojo.style(_1e.domNode,"visibility","hidden");
}});
var _24=dojo.animateProperty({node:_1f.domNode,properties:{top:_22},onEnd:function(){
_1f.onDisplay();
}});
dojo[_1f.useHeader?"removeClass":"addClass"](this.container,"no-header");
_23.play();
_24.play();
_1e.onBeforeUnDisplay();
_1f.onBeforeDisplay();
this._updateTitleStyle();
return true;
},_updateTitleStyle:function(){
dojo[this._currentChild<this._children.length-1?"addClass":"removeClass"](this.header,"navToPanel");
},_slideTable:function(_25,_26,_27){
var _28=_25.domNode;
var _29=_28.cloneNode(true);
var _2a=dojo.style(_28,"width");
_28.parentNode.appendChild(_29);
dojo.style(_28,"left",(_2a*_26)+"px");
_27();
var _2b=dojo.animateProperty({node:_29,properties:{left:_2a*_26*-1},duration:500,onEnd:function(){
_29.parentNode.removeChild(_29);
}});
var _2c=dojo.animateProperty({node:_28,properties:{left:0},duration:500});
_2b.play();
_2c.play();
},_addView:function(_2d){
this._views.push(_2d);
},getClassForDate:function(_2e,_2f){
},_adjustDisplay:function(_30,_31,_32){
var _33=this._children[this._currentChild];
var _34=this.displayMonth=_33.adjustDate(this.displayMonth,_31);
this._slideTable(_33,_31,function(){
_33.set("value",_34);
});
}});
dojo.declare("dojox.widget._CalendarView",dijit._Widget,{headerClass:"",useHeader:true,cloneClass:function(_35,n,_36){
var _37=dojo.query(_35,this.domNode)[0];
var i;
if(!_36){
for(i=0;i<n;i++){
_37.parentNode.appendChild(_37.cloneNode(true));
}
}else{
var _38=dojo.query(_35,this.domNode)[0];
for(i=0;i<n;i++){
_37.parentNode.insertBefore(_37.cloneNode(true),_38);
}
}
},_setText:function(_39,_3a){
if(_39.innerHTML!=_3a){
dojo.empty(_39);
_39.appendChild(dojo.doc.createTextNode(_3a));
}
},getHeader:function(){
return this.header||(this.header=this.header=dojo.create("span",{"class":this.headerClass}));
},onValueSelected:function(_3b){
},adjustDate:function(_3c,_3d){
return dojo.date.add(_3c,this.datePart,_3d);
},onDisplay:function(){
},onBeforeDisplay:function(){
},onBeforeUnDisplay:function(){
}});
dojo.declare("dojox.widget._CalendarDay",null,{parent:null,constructor:function(){
this._addView(dojox.widget._CalendarDayView);
}});
dojo.declare("dojox.widget._CalendarDayView",[dojox.widget._CalendarView,dijit._Templated],{templateString:dojo.cache("dojox.widget","Calendar/CalendarDay.html","<div class=\"dijitCalendarDayLabels\" style=\"left: 0px;\" dojoAttachPoint=\"dayContainer\">\n\t<div dojoAttachPoint=\"header\">\n\t\t<div dojoAttachPoint=\"monthAndYearHeader\">\n\t\t\t<span dojoAttachPoint=\"monthLabelNode\" class=\"dojoxCalendarMonthLabelNode\"></span>\n\t\t\t<span dojoAttachPoint=\"headerComma\" class=\"dojoxCalendarComma\">,</span>\n\t\t\t<span dojoAttachPoint=\"yearLabelNode\" class=\"dojoxCalendarDayYearLabel\"></span>\n\t\t</div>\n\t</div>\n\t<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin: auto;\">\n\t\t<thead>\n\t\t\t<tr>\n\t\t\t\t<td class=\"dijitCalendarDayLabelTemplate\"><div class=\"dijitCalendarDayLabel\"></div></td>\n\t\t\t</tr>\n\t\t</thead>\n\t\t<tbody dojoAttachEvent=\"onclick: _onDayClick\">\n\t\t\t<tr class=\"dijitCalendarWeekTemplate\">\n\t\t\t\t<td class=\"dojoxCalendarNextMonth dijitCalendarDateTemplate\">\n\t\t\t\t\t<div class=\"dijitCalendarDateLabel\"></div>\n\t\t\t\t</td>\n\t\t\t</tr>\n\t\t</tbody>\n\t</table>\n</div>\n"),datePart:"month",dayWidth:"narrow",postCreate:function(){
this.cloneClass(".dijitCalendarDayLabelTemplate",6);
this.cloneClass(".dijitCalendarDateTemplate",6);
this.cloneClass(".dijitCalendarWeekTemplate",5);
var _3e=dojo.date.locale.getNames("days",this.dayWidth,"standAlone",this.getLang());
var _3f=dojo.cldr.supplemental.getFirstDayOfWeek(this.getLang());
dojo.query(".dijitCalendarDayLabel",this.domNode).forEach(function(_40,i){
this._setText(_40,_3e[(i+_3f)%7]);
},this);
},onDisplay:function(){
if(!this._addedFx){
this._addedFx=true;
this.addFx(".dijitCalendarDateTemplate div",this.domNode);
}
},_onDayClick:function(e){
if(typeof (e.target._date)=="undefined"){
return;
}
var _41=new Date(this.get("displayMonth"));
var p=e.target.parentNode;
var c="dijitCalendar";
var d=dojo.hasClass(p,c+"PreviousMonth")?-1:(dojo.hasClass(p,c+"NextMonth")?1:0);
if(d){
_41=dojo.date.add(_41,"month",d);
}
_41.setDate(e.target._date);
if(this.isDisabledDate(_41)){
dojo.stopEvent(e);
return;
}
this.parent._onDateSelected(_41);
},_setValueAttr:function(_42){
this._populateDays();
},_populateDays:function(){
var _43=new Date(this.get("displayMonth"));
_43.setDate(1);
var _44=_43.getDay();
var _45=dojo.date.getDaysInMonth(_43);
var _46=dojo.date.getDaysInMonth(dojo.date.add(_43,"month",-1));
var _47=new Date();
var _48=this.get("value");
var _49=dojo.cldr.supplemental.getFirstDayOfWeek(this.getLang());
if(_49>_44){
_49-=7;
}
var _4a=dojo.date.compare;
var _4b=".dijitCalendarDateTemplate";
var _4c="dijitCalendarSelectedDate";
var _4d=this._lastDate;
var _4e=_4d==null||_4d.getMonth()!=_43.getMonth()||_4d.getFullYear()!=_43.getFullYear();
this._lastDate=_43;
if(!_4e){
dojo.query(_4b,this.domNode).removeClass(_4c).filter(function(_4f){
return _4f.className.indexOf("dijitCalendarCurrent")>-1&&_4f._date==_48.getDate();
}).addClass(_4c);
return;
}
dojo.query(_4b,this.domNode).forEach(function(_50,i){
i+=_49;
var _51=new Date(_43);
var _52,_53="dijitCalendar",adj=0;
if(i<_44){
_52=_46-_44+i+1;
adj=-1;
_53+="Previous";
}else{
if(i>=(_44+_45)){
_52=i-_44-_45+1;
adj=1;
_53+="Next";
}else{
_52=i-_44+1;
_53+="Current";
}
}
if(adj){
_51=dojo.date.add(_51,"month",adj);
}
_51.setDate(_52);
if(!_4a(_51,_47,"date")){
_53="dijitCalendarCurrentDate "+_53;
}
if(!_4a(_51,_48,"date")&&!_4a(_51,_48,"month")&&!_4a(_51,_48,"year")){
_53=_4c+" "+_53;
}
if(this.isDisabledDate(_51,this.getLang())){
_53=" dijitCalendarDisabledDate "+_53;
}
var _54=this.getClassForDate(_51,this.getLang());
if(_54){
_53=_54+" "+_53;
}
_50.className=_53+"Month dijitCalendarDateTemplate";
_50.dijitDateValue=_51.valueOf();
var _55=dojo.query(".dijitCalendarDateLabel",_50)[0];
this._setText(_55,_51.getDate());
_55._date=_55.parentNode._date=_51.getDate();
},this);
var _56=dojo.date.locale.getNames("months","wide","standAlone",this.getLang());
this._setText(this.monthLabelNode,_56[_43.getMonth()]);
this._setText(this.yearLabelNode,_43.getFullYear());
}});
dojo.declare("dojox.widget._CalendarMonthYear",null,{constructor:function(){
this._addView(dojox.widget._CalendarMonthYearView);
}});
dojo.declare("dojox.widget._CalendarMonthYearView",[dojox.widget._CalendarView,dijit._Templated],{templateString:dojo.cache("dojox.widget","Calendar/CalendarMonthYear.html","<div class=\"dojoxCal-MY-labels\" style=\"left: 0px;\"\t\n\tdojoAttachPoint=\"myContainer\" dojoAttachEvent=\"onclick: onClick\">\n\t\t<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin: auto;\">\n\t\t\t\t<tbody>\n\t\t\t\t\t\t<tr class=\"dojoxCal-MY-G-Template\">\n\t\t\t\t\t\t\t\t<td class=\"dojoxCal-MY-M-Template\">\n\t\t\t\t\t\t\t\t\t\t<div class=\"dojoxCalendarMonthLabel\"></div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t\t<td class=\"dojoxCal-MY-M-Template\">\n\t\t\t\t\t\t\t\t\t\t<div class=\"dojoxCalendarMonthLabel\"></div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t\t<td class=\"dojoxCal-MY-Y-Template\">\n\t\t\t\t\t\t\t\t\t\t<div class=\"dojoxCalendarYearLabel\"></div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t\t<td class=\"dojoxCal-MY-Y-Template\">\n\t\t\t\t\t\t\t\t\t\t<div class=\"dojoxCalendarYearLabel\"></div>\n\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t </tr>\n\t\t\t\t\t\t <tr class=\"dojoxCal-MY-btns\">\n\t\t\t\t\t\t \t <td class=\"dojoxCal-MY-btns\" colspan=\"4\">\n\t\t\t\t\t\t \t\t <span class=\"dijitReset dijitInline dijitButtonNode ok-btn\" dojoAttachEvent=\"onclick: onOk\" dojoAttachPoint=\"okBtn\">\n\t\t\t\t\t\t \t \t \t <button\tclass=\"dijitReset dijitStretch dijitButtonContents\">OK</button>\n\t\t\t\t\t\t\t\t </span>\n\t\t\t\t\t\t\t\t <span class=\"dijitReset dijitInline dijitButtonNode cancel-btn\" dojoAttachEvent=\"onclick: onCancel\" dojoAttachPoint=\"cancelBtn\">\n\t\t\t\t\t\t \t \t\t <button\tclass=\"dijitReset dijitStretch dijitButtonContents\">Cancel</button>\n\t\t\t\t\t\t\t\t </span>\n\t\t\t\t\t\t \t </td>\n\t\t\t\t\t\t </tr>\n\t\t\t\t</tbody>\n\t\t</table>\n</div>\n"),datePart:"year",displayedYears:10,useHeader:false,postCreate:function(){
this.cloneClass(".dojoxCal-MY-G-Template",5,".dojoxCal-MY-btns");
this.monthContainer=this.yearContainer=this.myContainer;
var _57="dojoxCalendarYearLabel";
var _58="dojoxCalendarDecrease";
var _59="dojoxCalendarIncrease";
dojo.query("."+_57,this.myContainer).forEach(function(_5a,idx){
var _5b=_59;
switch(idx){
case 0:
_5b=_58;
case 1:
dojo.removeClass(_5a,_57);
dojo.addClass(_5a,_5b);
break;
}
});
this._decBtn=dojo.query("."+_58,this.myContainer)[0];
this._incBtn=dojo.query("."+_59,this.myContainer)[0];
dojo.query(".dojoxCal-MY-M-Template",this.domNode).filter(function(_5c){
return _5c.cellIndex==1;
}).addClass("dojoxCal-MY-M-last");
dojo.connect(this,"onBeforeDisplay",dojo.hitch(this,function(){
this._cachedDate=new Date(this.get("value").getTime());
this._populateYears(this._cachedDate.getFullYear());
this._populateMonths();
this._updateSelectedMonth();
this._updateSelectedYear();
}));
dojo.connect(this,"_populateYears",dojo.hitch(this,function(){
this._updateSelectedYear();
}));
dojo.connect(this,"_populateMonths",dojo.hitch(this,function(){
this._updateSelectedMonth();
}));
this._cachedDate=this.get("value");
this._populateYears();
this._populateMonths();
this.addFx(".dojoxCalendarMonthLabel,.dojoxCalendarYearLabel ",this.myContainer);
},_setValueAttr:function(_5d){
if(_5d&&_5d.getFullYear()){
this._populateYears(_5d.getFullYear());
}
},getHeader:function(){
return null;
},_getMonthNames:function(_5e){
this._monthNames=this._monthNames||dojo.date.locale.getNames("months",_5e,"standAlone",this.getLang());
return this._monthNames;
},_populateMonths:function(){
var _5f=this._getMonthNames("abbr");
dojo.query(".dojoxCalendarMonthLabel",this.monthContainer).forEach(dojo.hitch(this,function(_60,cnt){
this._setText(_60,_5f[cnt]);
}));
var _61=this.get("constraints");
if(_61){
var _62=new Date();
_62.setFullYear(this._year);
var min=-1,max=12;
if(_61.min){
var _63=_61.min.getFullYear();
if(_63>this._year){
min=12;
}else{
if(_63==this._year){
min=_61.min.getMonth();
}
}
}
if(_61.max){
var _64=_61.max.getFullYear();
if(_64<this._year){
max=-1;
}else{
if(_64==this._year){
max=_61.max.getMonth();
}
}
}
dojo.query(".dojoxCalendarMonthLabel",this.monthContainer).forEach(dojo.hitch(this,function(_65,cnt){
dojo[(cnt<min||cnt>max)?"addClass":"removeClass"](_65,"dijitCalendarDisabledDate");
}));
}
var h=this.getHeader();
if(h){
this._setText(this.getHeader(),this.get("value").getFullYear());
}
},_populateYears:function(_66){
var _67=this.get("constraints");
var _68=_66||this.get("value").getFullYear();
var _69=_68-Math.floor(this.displayedYears/2);
var min=_67&&_67.min?_67.min.getFullYear():_69-10000;
_69=Math.max(min,_69);
this._displayedYear=_68;
var _6a=dojo.query(".dojoxCalendarYearLabel",this.yearContainer);
var max=_67&&_67.max?_67.max.getFullYear()-_69:_6a.length;
var _6b="dijitCalendarDisabledDate";
_6a.forEach(dojo.hitch(this,function(_6c,cnt){
if(cnt<=max){
this._setText(_6c,_69+cnt);
dojo.removeClass(_6c,_6b);
}else{
dojo.addClass(_6c,_6b);
}
}));
if(this._incBtn){
dojo[max<_6a.length?"addClass":"removeClass"](this._incBtn,_6b);
}
if(this._decBtn){
dojo[min>=_69?"addClass":"removeClass"](this._decBtn,_6b);
}
var h=this.getHeader();
if(h){
this._setText(this.getHeader(),_69+" - "+(_69+11));
}
},_updateSelectedYear:function(){
this._year=String((this._cachedDate||this.get("value")).getFullYear());
this._updateSelectedNode(".dojoxCalendarYearLabel",dojo.hitch(this,function(_6d,idx){
return this._year!==null&&_6d.innerHTML==this._year;
}));
},_updateSelectedMonth:function(){
var _6e=(this._cachedDate||this.get("value")).getMonth();
this._month=_6e;
this._updateSelectedNode(".dojoxCalendarMonthLabel",function(_6f,idx){
return idx==_6e;
});
},_updateSelectedNode:function(_70,_71){
var sel="dijitCalendarSelectedDate";
dojo.query(_70,this.domNode).forEach(function(_72,idx,_73){
dojo[_71(_72,idx,_73)?"addClass":"removeClass"](_72.parentNode,sel);
});
var _74=dojo.query(".dojoxCal-MY-M-Template div",this.myContainer).filter(function(_75){
return dojo.hasClass(_75.parentNode,sel);
})[0];
if(!_74){
return;
}
var _76=dojo.hasClass(_74,"dijitCalendarDisabledDate");
dojo[_76?"addClass":"removeClass"](this.okBtn,"dijitDisabled");
},onClick:function(evt){
var _77;
var _78=this;
var sel="dijitCalendarSelectedDate";
function hc(c){
return dojo.hasClass(evt.target,c);
};
if(hc("dijitCalendarDisabledDate")){
dojo.stopEvent(evt);
return false;
}
if(hc("dojoxCalendarMonthLabel")){
_77="dojoxCal-MY-M-Template";
this._month=evt.target.parentNode.cellIndex+(evt.target.parentNode.parentNode.rowIndex*2);
this._cachedDate.setMonth(this._month);
this._updateSelectedMonth();
}else{
if(hc("dojoxCalendarYearLabel")){
_77="dojoxCal-MY-Y-Template";
this._year=Number(evt.target.innerHTML);
this._cachedDate.setYear(this._year);
this._populateMonths();
this._updateSelectedYear();
}else{
if(hc("dojoxCalendarDecrease")){
this._populateYears(this._displayedYear-10);
return true;
}else{
if(hc("dojoxCalendarIncrease")){
this._populateYears(this._displayedYear+10);
return true;
}else{
return true;
}
}
}
}
dojo.stopEvent(evt);
return false;
},onOk:function(evt){
dojo.stopEvent(evt);
if(dojo.hasClass(this.okBtn,"dijitDisabled")){
return false;
}
this.onValueSelected(this._cachedDate);
return false;
},onCancel:function(evt){
dojo.stopEvent(evt);
this.onValueSelected(this.get("value"));
return false;
}});
dojo.declare("dojox.widget.Calendar2Pane",[dojox.widget._CalendarBase,dojox.widget._CalendarDay,dojox.widget._CalendarMonthYear],{});
dojo.declare("dojox.widget.Calendar",[dojox.widget._CalendarBase,dojox.widget._CalendarDay,dojox.widget._CalendarMonthYear],{});
dojo.declare("dojox.widget.DailyCalendar",[dojox.widget._CalendarBase,dojox.widget._CalendarDay],{_makeDate:function(_79){
var now=new Date();
now.setDate(_79);
return now;
}});
dojo.declare("dojox.widget.MonthAndYearlyCalendar",[dojox.widget._CalendarBase,dojox.widget._CalendarMonthYear],{});
}
