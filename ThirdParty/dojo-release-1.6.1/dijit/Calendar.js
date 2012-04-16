/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.Calendar"]){
dojo._hasResource["dijit.Calendar"]=true;
dojo.provide("dijit.Calendar");
dojo.require("dojo.cldr.supplemental");
dojo.require("dojo.date");
dojo.require("dojo.date.locale");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._CssStateMixin");
dojo.require("dijit.form.DropDownButton");
dojo.declare("dijit.Calendar",[dijit._Widget,dijit._Templated,dijit._CssStateMixin],{templateString:dojo.cache("dijit","templates/Calendar.html","<table cellspacing=\"0\" cellpadding=\"0\" class=\"dijitCalendarContainer\" role=\"grid\" dojoAttachEvent=\"onkeypress: _onKeyPress\" aria-labelledby=\"${id}_year\">\n\t<thead>\n\t\t<tr class=\"dijitReset dijitCalendarMonthContainer\" valign=\"top\">\n\t\t\t<th class='dijitReset dijitCalendarArrow' dojoAttachPoint=\"decrementMonth\">\n\t\t\t\t<img src=\"${_blankGif}\" alt=\"\" class=\"dijitCalendarIncrementControl dijitCalendarDecrease\" role=\"presentation\"/>\n\t\t\t\t<span dojoAttachPoint=\"decreaseArrowNode\" class=\"dijitA11ySideArrow\">-</span>\n\t\t\t</th>\n\t\t\t<th class='dijitReset' colspan=\"5\">\n\t\t\t\t<div dojoType=\"dijit.form.DropDownButton\" dojoAttachPoint=\"monthDropDownButton\"\n\t\t\t\t\tid=\"${id}_mddb\" tabIndex=\"-1\">\n\t\t\t\t</div>\n\t\t\t</th>\n\t\t\t<th class='dijitReset dijitCalendarArrow' dojoAttachPoint=\"incrementMonth\">\n\t\t\t\t<img src=\"${_blankGif}\" alt=\"\" class=\"dijitCalendarIncrementControl dijitCalendarIncrease\" role=\"presentation\"/>\n\t\t\t\t<span dojoAttachPoint=\"increaseArrowNode\" class=\"dijitA11ySideArrow\">+</span>\n\t\t\t</th>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<th class=\"dijitReset dijitCalendarDayLabelTemplate\" role=\"columnheader\"><span class=\"dijitCalendarDayLabel\"></span></th>\n\t\t</tr>\n\t</thead>\n\t<tbody dojoAttachEvent=\"onclick: _onDayClick, onmouseover: _onDayMouseOver, onmouseout: _onDayMouseOut, onmousedown: _onDayMouseDown, onmouseup: _onDayMouseUp\" class=\"dijitReset dijitCalendarBodyContainer\">\n\t\t<tr class=\"dijitReset dijitCalendarWeekTemplate\" role=\"row\">\n\t\t\t<td class=\"dijitReset dijitCalendarDateTemplate\" role=\"gridcell\"><span class=\"dijitCalendarDateLabel\"></span></td>\n\t\t</tr>\n\t</tbody>\n\t<tfoot class=\"dijitReset dijitCalendarYearContainer\">\n\t\t<tr>\n\t\t\t<td class='dijitReset' valign=\"top\" colspan=\"7\">\n\t\t\t\t<h3 class=\"dijitCalendarYearLabel\">\n\t\t\t\t\t<span dojoAttachPoint=\"previousYearLabelNode\" class=\"dijitInline dijitCalendarPreviousYear\"></span>\n\t\t\t\t\t<span dojoAttachPoint=\"currentYearLabelNode\" class=\"dijitInline dijitCalendarSelectedYear\" id=\"${id}_year\"></span>\n\t\t\t\t\t<span dojoAttachPoint=\"nextYearLabelNode\" class=\"dijitInline dijitCalendarNextYear\"></span>\n\t\t\t\t</h3>\n\t\t\t</td>\n\t\t</tr>\n\t</tfoot>\n</table>\n"),widgetsInTemplate:true,value:new Date(""),datePackage:"dojo.date",dayWidth:"narrow",tabIndex:"0",currentFocus:new Date(),baseClass:"dijitCalendar",cssStateNodes:{"decrementMonth":"dijitCalendarArrow","incrementMonth":"dijitCalendarArrow","previousYearLabelNode":"dijitCalendarPreviousYear","nextYearLabelNode":"dijitCalendarNextYear"},_isValidDate:function(_1){
return _1&&!isNaN(_1)&&typeof _1=="object"&&_1.toString()!=this.constructor.prototype.value.toString();
},setValue:function(_2){
dojo.deprecated("dijit.Calendar:setValue() is deprecated.  Use set('value', ...) instead.","","2.0");
this.set("value",_2);
},_getValueAttr:function(){
var _3=new this.dateClassObj(this.value);
_3.setHours(0,0,0,0);
if(_3.getDate()<this.value.getDate()){
_3=this.dateFuncObj.add(_3,"hour",1);
}
return _3;
},_setValueAttr:function(_4,_5){
if(_4){
_4=new this.dateClassObj(_4);
}
if(this._isValidDate(_4)){
if(!this._isValidDate(this.value)||this.dateFuncObj.compare(_4,this.value)){
_4.setHours(1,0,0,0);
if(!this.isDisabledDate(_4,this.lang)){
this._set("value",_4);
this.set("currentFocus",_4);
if(_5||typeof _5=="undefined"){
this.onChange(this.get("value"));
this.onValueSelected(this.get("value"));
}
}
}
}else{
this._set("value",null);
this.set("currentFocus",this.currentFocus);
}
},_setText:function(_6,_7){
while(_6.firstChild){
_6.removeChild(_6.firstChild);
}
_6.appendChild(dojo.doc.createTextNode(_7));
},_populateGrid:function(){
var _8=new this.dateClassObj(this.currentFocus);
_8.setDate(1);
var _9=_8.getDay(),_a=this.dateFuncObj.getDaysInMonth(_8),_b=this.dateFuncObj.getDaysInMonth(this.dateFuncObj.add(_8,"month",-1)),_c=new this.dateClassObj(),_d=dojo.cldr.supplemental.getFirstDayOfWeek(this.lang);
if(_d>_9){
_d-=7;
}
dojo.query(".dijitCalendarDateTemplate",this.domNode).forEach(function(_e,i){
i+=_d;
var _f=new this.dateClassObj(_8),_10,_11="dijitCalendar",adj=0;
if(i<_9){
_10=_b-_9+i+1;
adj=-1;
_11+="Previous";
}else{
if(i>=(_9+_a)){
_10=i-_9-_a+1;
adj=1;
_11+="Next";
}else{
_10=i-_9+1;
_11+="Current";
}
}
if(adj){
_f=this.dateFuncObj.add(_f,"month",adj);
}
_f.setDate(_10);
if(!this.dateFuncObj.compare(_f,_c,"date")){
_11="dijitCalendarCurrentDate "+_11;
}
if(this._isSelectedDate(_f,this.lang)){
_11="dijitCalendarSelectedDate "+_11;
}
if(this.isDisabledDate(_f,this.lang)){
_11="dijitCalendarDisabledDate "+_11;
}
var _12=this.getClassForDate(_f,this.lang);
if(_12){
_11=_12+" "+_11;
}
_e.className=_11+"Month dijitCalendarDateTemplate";
_e.dijitDateValue=_f.valueOf();
dojo.attr(_e,"dijitDateValue",_f.valueOf());
var _13=dojo.query(".dijitCalendarDateLabel",_e)[0],_14=_f.getDateLocalized?_f.getDateLocalized(this.lang):_f.getDate();
this._setText(_13,_14);
},this);
var _15=this.dateLocaleModule.getNames("months","wide","standAlone",this.lang,_8);
this.monthDropDownButton.dropDown.set("months",_15);
this.monthDropDownButton.containerNode.innerHTML=(dojo.isIE==6?"":"<div class='dijitSpacer'>"+this.monthDropDownButton.dropDown.domNode.innerHTML+"</div>")+"<div class='dijitCalendarMonthLabel dijitCalendarCurrentMonthLabel'>"+_15[_8.getMonth()]+"</div>";
var y=_8.getFullYear()-1;
var d=new this.dateClassObj();
dojo.forEach(["previous","current","next"],function(_16){
d.setFullYear(y++);
this._setText(this[_16+"YearLabelNode"],this.dateLocaleModule.format(d,{selector:"year",locale:this.lang}));
},this);
},goToToday:function(){
this.set("value",new this.dateClassObj());
},constructor:function(_17){
var _18=(_17.datePackage&&(_17.datePackage!="dojo.date"))?_17.datePackage+".Date":"Date";
this.dateClassObj=dojo.getObject(_18,false);
this.datePackage=_17.datePackage||this.datePackage;
this.dateFuncObj=dojo.getObject(this.datePackage,false);
this.dateLocaleModule=dojo.getObject(this.datePackage+".locale",false);
},postMixInProperties:function(){
if(isNaN(this.value)){
delete this.value;
}
this.inherited(arguments);
},buildRendering:function(){
this.inherited(arguments);
dojo.setSelectable(this.domNode,false);
var _19=dojo.hitch(this,function(_1a,n){
var _1b=dojo.query(_1a,this.domNode)[0];
for(var i=0;i<n;i++){
_1b.parentNode.appendChild(_1b.cloneNode(true));
}
});
_19(".dijitCalendarDayLabelTemplate",6);
_19(".dijitCalendarDateTemplate",6);
_19(".dijitCalendarWeekTemplate",5);
var _1c=this.dateLocaleModule.getNames("days",this.dayWidth,"standAlone",this.lang);
var _1d=dojo.cldr.supplemental.getFirstDayOfWeek(this.lang);
dojo.query(".dijitCalendarDayLabel",this.domNode).forEach(function(_1e,i){
this._setText(_1e,_1c[(i+_1d)%7]);
},this);
var _1f=new this.dateClassObj(this.currentFocus);
this.monthDropDownButton.dropDown=new dijit.Calendar._MonthDropDown({id:this.id+"_mdd",onChange:dojo.hitch(this,"_onMonthSelect")});
this.set("currentFocus",_1f,false);
var _20=this;
var _21=function(_22,_23,adj){
_20._connects.push(dijit.typematic.addMouseListener(_20[_22],_20,function(_24){
if(_24>=0){
_20._adjustDisplay(_23,adj);
}
},0.8,500));
};
_21("incrementMonth","month",1);
_21("decrementMonth","month",-1);
_21("nextYearLabelNode","year",1);
_21("previousYearLabelNode","year",-1);
},_adjustDisplay:function(_25,_26){
this._setCurrentFocusAttr(this.dateFuncObj.add(this.currentFocus,_25,_26));
},_setCurrentFocusAttr:function(_27,_28){
var _29=this.currentFocus,_2a=_29?dojo.query("[dijitDateValue="+_29.valueOf()+"]",this.domNode)[0]:null;
_27=new this.dateClassObj(_27);
_27.setHours(1,0,0,0);
this._set("currentFocus",_27);
this._populateGrid();
var _2b=dojo.query("[dijitDateValue="+_27.valueOf()+"]",this.domNode)[0];
_2b.setAttribute("tabIndex",this.tabIndex);
if(this._focused||_28){
_2b.focus();
}
if(_2a&&_2a!=_2b){
if(dojo.isWebKit){
_2a.setAttribute("tabIndex","-1");
}else{
_2a.removeAttribute("tabIndex");
}
}
},focus:function(){
this._setCurrentFocusAttr(this.currentFocus,true);
},_onMonthSelect:function(_2c){
this.currentFocus=this.dateFuncObj.add(this.currentFocus,"month",_2c-this.currentFocus.getMonth());
this._populateGrid();
},_onDayClick:function(evt){
dojo.stopEvent(evt);
for(var _2d=evt.target;_2d&&!_2d.dijitDateValue;_2d=_2d.parentNode){
}
if(_2d&&!dojo.hasClass(_2d,"dijitCalendarDisabledDate")){
this.set("value",_2d.dijitDateValue);
}
},_onDayMouseOver:function(evt){
var _2e=dojo.hasClass(evt.target,"dijitCalendarDateLabel")?evt.target.parentNode:evt.target;
if(_2e&&(_2e.dijitDateValue||_2e==this.previousYearLabelNode||_2e==this.nextYearLabelNode)){
dojo.addClass(_2e,"dijitCalendarHoveredDate");
this._currentNode=_2e;
}
},_onDayMouseOut:function(evt){
if(!this._currentNode){
return;
}
if(evt.relatedTarget&&evt.relatedTarget.parentNode==this._currentNode){
return;
}
var cls="dijitCalendarHoveredDate";
if(dojo.hasClass(this._currentNode,"dijitCalendarActiveDate")){
cls+=" dijitCalendarActiveDate";
}
dojo.removeClass(this._currentNode,cls);
this._currentNode=null;
},_onDayMouseDown:function(evt){
var _2f=evt.target.parentNode;
if(_2f&&_2f.dijitDateValue){
dojo.addClass(_2f,"dijitCalendarActiveDate");
this._currentNode=_2f;
}
},_onDayMouseUp:function(evt){
var _30=evt.target.parentNode;
if(_30&&_30.dijitDateValue){
dojo.removeClass(_30,"dijitCalendarActiveDate");
}
},handleKey:function(evt){
var dk=dojo.keys,_31=-1,_32,_33=this.currentFocus;
switch(evt.keyCode){
case dk.RIGHT_ARROW:
_31=1;
case dk.LEFT_ARROW:
_32="day";
if(!this.isLeftToRight()){
_31*=-1;
}
break;
case dk.DOWN_ARROW:
_31=1;
case dk.UP_ARROW:
_32="week";
break;
case dk.PAGE_DOWN:
_31=1;
case dk.PAGE_UP:
_32=evt.ctrlKey||evt.altKey?"year":"month";
break;
case dk.END:
_33=this.dateFuncObj.add(_33,"month",1);
_32="day";
case dk.HOME:
_33=new this.dateClassObj(_33);
_33.setDate(1);
break;
case dk.ENTER:
case dk.SPACE:
this.set("value",this.currentFocus);
break;
default:
return true;
}
if(_32){
_33=this.dateFuncObj.add(_33,_32,_31);
}
this._setCurrentFocusAttr(_33);
return false;
},_onKeyPress:function(evt){
if(!this.handleKey(evt)){
dojo.stopEvent(evt);
}
},onValueSelected:function(_34){
},onChange:function(_35){
},_isSelectedDate:function(_36,_37){
return this._isValidDate(this.value)&&!this.dateFuncObj.compare(_36,this.value,"date");
},isDisabledDate:function(_38,_39){
},getClassForDate:function(_3a,_3b){
}});
dojo.declare("dijit.Calendar._MonthDropDown",[dijit._Widget,dijit._Templated],{months:[],templateString:"<div class='dijitCalendarMonthMenu dijitMenu' "+"dojoAttachEvent='onclick:_onClick,onmouseover:_onMenuHover,onmouseout:_onMenuHover'></div>",_setMonthsAttr:function(_3c){
this.domNode.innerHTML=dojo.map(_3c,function(_3d,idx){
return _3d?"<div class='dijitCalendarMonthLabel' month='"+idx+"'>"+_3d+"</div>":"";
}).join("");
},_onClick:function(evt){
this.onChange(dojo.attr(evt.target,"month"));
},onChange:function(_3e){
},_onMenuHover:function(evt){
dojo.toggleClass(evt.target,"dijitCalendarMonthLabelHover",evt.type=="mouseover");
}});
}
