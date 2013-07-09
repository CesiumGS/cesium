//>>built
require({cache:{"url:dijit/templates/Calendar.html":"<table cellspacing=\"0\" cellpadding=\"0\" class=\"dijitCalendarContainer\" role=\"grid\" aria-labelledby=\"${id}_mddb ${id}_year\" data-dojo-attach-point=\"gridNode\">\n\t<thead>\n\t\t<tr class=\"dijitReset dijitCalendarMonthContainer\" valign=\"top\">\n\t\t\t<th class='dijitReset dijitCalendarArrow' data-dojo-attach-point=\"decrementMonth\" scope=\"col\">\n\t\t\t\t<span class=\"dijitInline dijitCalendarIncrementControl dijitCalendarDecrease\" role=\"presentation\"></span>\n\t\t\t\t<span data-dojo-attach-point=\"decreaseArrowNode\" class=\"dijitA11ySideArrow\">-</span>\n\t\t\t</th>\n\t\t\t<th class='dijitReset' colspan=\"5\" scope=\"col\">\n\t\t\t\t<div data-dojo-attach-point=\"monthNode\">\n\t\t\t\t</div>\n\t\t\t</th>\n\t\t\t<th class='dijitReset dijitCalendarArrow' scope=\"col\" data-dojo-attach-point=\"incrementMonth\">\n\t\t\t\t<span class=\"dijitInline dijitCalendarIncrementControl dijitCalendarIncrease\" role=\"presentation\"></span>\n\t\t\t\t<span data-dojo-attach-point=\"increaseArrowNode\" class=\"dijitA11ySideArrow\">+</span>\n\t\t\t</th>\n\t\t</tr>\n\t\t<tr role=\"row\">\n\t\t\t${!dayCellsHtml}\n\t\t</tr>\n\t</thead>\n\t<tbody data-dojo-attach-point=\"dateRowsNode\" data-dojo-attach-event=\"ondijitclick: _onDayClick\" class=\"dijitReset dijitCalendarBodyContainer\">\n\t\t\t${!dateRowsHtml}\n\t</tbody>\n\t<tfoot class=\"dijitReset dijitCalendarYearContainer\">\n\t\t<tr>\n\t\t\t<td class='dijitReset' valign=\"top\" colspan=\"7\" role=\"presentation\">\n\t\t\t\t<div class=\"dijitCalendarYearLabel\">\n\t\t\t\t\t<span data-dojo-attach-point=\"previousYearLabelNode\" class=\"dijitInline dijitCalendarPreviousYear\" role=\"button\"></span>\n\t\t\t\t\t<span data-dojo-attach-point=\"currentYearLabelNode\" class=\"dijitInline dijitCalendarSelectedYear\" role=\"button\" id=\"${id}_year\"></span>\n\t\t\t\t\t<span data-dojo-attach-point=\"nextYearLabelNode\" class=\"dijitInline dijitCalendarNextYear\" role=\"button\"></span>\n\t\t\t\t</div>\n\t\t\t</td>\n\t\t</tr>\n\t</tfoot>\n</table>\n"}});
define("dijit/CalendarLite",["dojo/_base/array","dojo/_base/declare","dojo/cldr/supplemental","dojo/date","dojo/date/locale","dojo/date/stamp","dojo/dom","dojo/dom-class","dojo/_base/lang","dojo/on","dojo/sniff","dojo/string","./_WidgetBase","./_TemplatedMixin","dojo/text!./templates/Calendar.html","./a11yclick","./hccss"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,on,_a,_b,_c,_d,_e){
var _f=_2("dijit.CalendarLite",[_c,_d],{templateString:_e,dowTemplateString:"<th class=\"dijitReset dijitCalendarDayLabelTemplate\" role=\"columnheader\" scope=\"col\"><span class=\"dijitCalendarDayLabel\">${d}</span></th>",dateTemplateString:"<td class=\"dijitReset\" role=\"gridcell\" data-dojo-attach-point=\"dateCells\"><span class=\"dijitCalendarDateLabel\" data-dojo-attach-point=\"dateLabels\"></span></td>",weekTemplateString:"<tr class=\"dijitReset dijitCalendarWeekTemplate\" role=\"row\">${d}${d}${d}${d}${d}${d}${d}</tr>",value:new Date(""),datePackage:"",dayWidth:"narrow",tabIndex:"0",currentFocus:new Date(),_setSummaryAttr:"gridNode",baseClass:"dijitCalendar",_isValidDate:function(_10){
return _10&&!isNaN(_10)&&typeof _10=="object"&&_10.toString()!=this.constructor.prototype.value.toString();
},_getValueAttr:function(){
var _11=this._get("value");
if(_11&&!isNaN(_11)){
var _12=new this.dateClassObj(_11);
_12.setHours(0,0,0,0);
if(_12.getDate()<_11.getDate()){
_12=this.dateModule.add(_12,"hour",1);
}
return _12;
}else{
return null;
}
},_setValueAttr:function(_13,_14){
if(typeof _13=="string"){
_13=_6.fromISOString(_13);
}
_13=this._patchDate(_13);
if(this._isValidDate(_13)&&!this.isDisabledDate(_13,this.lang)){
this._set("value",_13);
this.set("currentFocus",_13);
this._markSelectedDates([_13]);
if(this._created&&(_14||typeof _14=="undefined")){
this.onChange(this.get("value"));
}
}else{
this._set("value",null);
this._markSelectedDates([]);
}
},_patchDate:function(_15){
if(_15){
_15=new this.dateClassObj(_15);
_15.setHours(1,0,0,0);
}
return _15;
},_setText:function(_16,_17){
while(_16.firstChild){
_16.removeChild(_16.firstChild);
}
_16.appendChild(_16.ownerDocument.createTextNode(_17));
},_populateGrid:function(){
var _18=new this.dateClassObj(this.currentFocus);
_18.setDate(1);
var _19=_18.getDay(),_1a=this.dateModule.getDaysInMonth(_18),_1b=this.dateModule.getDaysInMonth(this.dateModule.add(_18,"month",-1)),_1c=new this.dateClassObj(),_1d=_3.getFirstDayOfWeek(this.lang);
if(_1d>_19){
_1d-=7;
}
if(!this.summary){
var _1e=this.dateLocaleModule.getNames("months","wide","standAlone",this.lang,_18);
this.gridNode.setAttribute("summary",_1e[_18.getMonth()]);
}
this._date2cell={};
_1.forEach(this.dateCells,function(_1f,idx){
var i=idx+_1d;
var _20=new this.dateClassObj(_18),_21,_22="dijitCalendar",adj=0;
if(i<_19){
_21=_1b-_19+i+1;
adj=-1;
_22+="Previous";
}else{
if(i>=(_19+_1a)){
_21=i-_19-_1a+1;
adj=1;
_22+="Next";
}else{
_21=i-_19+1;
_22+="Current";
}
}
if(adj){
_20=this.dateModule.add(_20,"month",adj);
}
_20.setDate(_21);
if(!this.dateModule.compare(_20,_1c,"date")){
_22="dijitCalendarCurrentDate "+_22;
}
if(this.isDisabledDate(_20,this.lang)){
_22="dijitCalendarDisabledDate "+_22;
_1f.setAttribute("aria-disabled","true");
}else{
_22="dijitCalendarEnabledDate "+_22;
_1f.removeAttribute("aria-disabled");
_1f.setAttribute("aria-selected","false");
}
var _23=this.getClassForDate(_20,this.lang);
if(_23){
_22=_23+" "+_22;
}
_1f.className=_22+"Month dijitCalendarDateTemplate";
var _24=_20.valueOf();
this._date2cell[_24]=_1f;
_1f.dijitDateValue=_24;
this._setText(this.dateLabels[idx],_20.getDateLocalized?_20.getDateLocalized(this.lang):_20.getDate());
},this);
},_populateControls:function(){
var _25=new this.dateClassObj(this.currentFocus);
_25.setDate(1);
this.monthWidget.set("month",_25);
var y=_25.getFullYear()-1;
var d=new this.dateClassObj();
_1.forEach(["previous","current","next"],function(_26){
d.setFullYear(y++);
this._setText(this[_26+"YearLabelNode"],this.dateLocaleModule.format(d,{selector:"year",locale:this.lang}));
},this);
},goToToday:function(){
this.set("value",new this.dateClassObj());
},constructor:function(_27){
this.dateModule=_27.datePackage?_9.getObject(_27.datePackage,false):_4;
this.dateClassObj=this.dateModule.Date||Date;
this.dateLocaleModule=_27.datePackage?_9.getObject(_27.datePackage+".locale",false):_5;
},_createMonthWidget:function(){
return _f._MonthWidget({id:this.id+"_mddb",lang:this.lang,dateLocaleModule:this.dateLocaleModule},this.monthNode);
},buildRendering:function(){
var d=this.dowTemplateString,_28=this.dateLocaleModule.getNames("days",this.dayWidth,"standAlone",this.lang),_29=_3.getFirstDayOfWeek(this.lang);
this.dayCellsHtml=_b.substitute([d,d,d,d,d,d,d].join(""),{d:""},function(){
return _28[_29++%7];
});
var r=_b.substitute(this.weekTemplateString,{d:this.dateTemplateString});
this.dateRowsHtml=[r,r,r,r,r,r].join("");
this.dateCells=[];
this.dateLabels=[];
this.inherited(arguments);
_7.setSelectable(this.domNode,false);
var _2a=new this.dateClassObj(this.currentFocus);
this.monthWidget=this._createMonthWidget();
this.set("currentFocus",_2a,false);
},postCreate:function(){
this.inherited(arguments);
this._connectControls();
},_connectControls:function(){
var _2b=_9.hitch(this,function(_2c,_2d,_2e){
return on(this[_2c],"click",_9.hitch(this,function(){
this._setCurrentFocusAttr(this.dateModule.add(this.currentFocus,_2d,_2e));
}));
});
this.own(_2b("incrementMonth","month",1),_2b("decrementMonth","month",-1),_2b("nextYearLabelNode","year",1),_2b("previousYearLabelNode","year",-1));
},_setCurrentFocusAttr:function(_2f,_30){
var _31=this.currentFocus,_32=this._getNodeByDate(_31);
_2f=this._patchDate(_2f);
this._set("currentFocus",_2f);
if(!this._date2cell||this.dateModule.difference(_31,_2f,"month")!=0){
this._populateGrid();
this._populateControls();
this._markSelectedDates([this.value]);
}
var _33=this._getNodeByDate(_2f);
_33.setAttribute("tabIndex",this.tabIndex);
if(this.focused||_30){
_33.focus();
}
if(_32&&_32!=_33){
if(_a("webkit")){
_32.setAttribute("tabIndex","-1");
}else{
_32.removeAttribute("tabIndex");
}
}
},focus:function(){
this._setCurrentFocusAttr(this.currentFocus,true);
},_onDayClick:function(evt){
evt.stopPropagation();
evt.preventDefault();
for(var _34=evt.target;_34&&!_34.dijitDateValue;_34=_34.parentNode){
}
if(_34&&!_8.contains(_34,"dijitCalendarDisabledDate")){
this.set("value",_34.dijitDateValue);
}
},_getNodeByDate:function(_35){
_35=this._patchDate(_35);
return _35&&this._date2cell?this._date2cell[_35.valueOf()]:null;
},_markSelectedDates:function(_36){
function _37(_38,_39){
_8.toggle(_39,"dijitCalendarSelectedDate",_38);
_39.setAttribute("aria-selected",_38?"true":"false");
};
_1.forEach(this._selectedCells||[],_9.partial(_37,false));
this._selectedCells=_1.filter(_1.map(_36,this._getNodeByDate,this),function(n){
return n;
});
_1.forEach(this._selectedCells,_9.partial(_37,true));
},onChange:function(){
},isDisabledDate:function(){
},getClassForDate:function(){
}});
_f._MonthWidget=_2("dijit.CalendarLite._MonthWidget",_c,{_setMonthAttr:function(_3a){
var _3b=this.dateLocaleModule.getNames("months","wide","standAlone",this.lang,_3a),_3c=(_a("ie")==6?"":"<div class='dijitSpacer'>"+_1.map(_3b,function(s){
return "<div>"+s+"</div>";
}).join("")+"</div>");
this.domNode.innerHTML=_3c+"<div class='dijitCalendarMonthLabel dijitCalendarCurrentMonthLabel'>"+_3b[_3a.getMonth()]+"</div>";
}});
return _f;
});
