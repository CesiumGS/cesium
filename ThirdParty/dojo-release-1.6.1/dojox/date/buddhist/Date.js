/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.buddhist.Date"]){
dojo._hasResource["dojox.date.buddhist.Date"]=true;
dojo.provide("dojox.date.buddhist.Date");
dojo.experimental("dojox.date.buddhist.Date");
dojo.declare("dojox.date.buddhist.Date",null,{_date:0,_month:0,_year:0,_hours:0,_minutes:0,_seconds:0,_milliseconds:0,_day:0,constructor:function(){
var _1=arguments.length;
if(!_1){
this.fromGregorian(new Date());
}else{
if(_1==1){
var _2=arguments[0];
if(typeof _2=="number"){
_2=new Date(_2);
}
if(_2 instanceof Date){
this.fromGregorian(_2);
}else{
if(_2==""){
this._date=new Date("");
}else{
this._year=_2._year;
this._month=_2._month;
this._date=_2._date;
this._hours=_2._hours;
this._minutes=_2._minutes;
this._seconds=_2._seconds;
this._milliseconds=_2._milliseconds;
}
}
}else{
if(_1>=3){
this._year+=arguments[0];
this._month+=arguments[1];
this._date+=arguments[2];
if(this._month>11){
console.warn("the month is incorrect , set 0");
this._month=0;
}
this._hours+=arguments[3]||0;
this._minutes+=arguments[4]||0;
this._seconds+=arguments[5]||0;
this._milliseconds+=arguments[6]||0;
}
}
}
},getDate:function(_3){
return parseInt(this._date);
},getMonth:function(){
return parseInt(this._month);
},getFullYear:function(){
return parseInt(this._year);
},getHours:function(){
return this._hours;
},getMinutes:function(){
return this._minutes;
},getSeconds:function(){
return this._seconds;
},getMilliseconds:function(){
return this._milliseconds;
},setDate:function(_4){
_4=parseInt(_4);
if(_4>0&&_4<=this._getDaysInMonth(this._month,this._year)){
this._date=_4;
}else{
var _5;
if(_4>0){
for(_5=this._getDaysInMonth(this._month,this._year);_4>_5;_4-=_5,_5=this._getDaysInMonth(this._month,this._year)){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
}
this._date=_4;
}else{
for(_5=this._getDaysInMonth((this._month-1)>=0?(this._month-1):11,((this._month-1)>=0)?this._year:this._year-1);_4<=0;_5=this._getDaysInMonth((this._month-1)>=0?(this._month-1):11,((this._month-1)>=0)?this._year:this._year-1)){
this._month--;
if(this._month<0){
this._year--;
this._month+=12;
}
_4+=_5;
}
this._date=_4;
}
}
return this;
},setFullYear:function(_6,_7,_8){
this._year=parseInt(_6);
},setMonth:function(_9){
this._year+=Math.floor(_9/12);
this._month=Math.floor(_9%12);
for(;this._month<0;this._month=this._month+12){
}
},setHours:function(){
var _a=arguments.length;
var _b=0;
if(_a>=1){
_b=parseInt(arguments[0]);
}
if(_a>=2){
this._minutes=parseInt(arguments[1]);
}
if(_a>=3){
this._seconds=parseInt(arguments[2]);
}
if(_a==4){
this._milliseconds=parseInt(arguments[3]);
}
while(_b>=24){
this._date++;
var _c=this._getDaysInMonth(this._month,this._year);
if(this._date>_c){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
this._date-=_c;
}
_b-=24;
}
this._hours=_b;
},setMinutes:function(_d){
while(_d>=60){
this._hours++;
if(this._hours>=24){
this._date++;
this._hours-=24;
var _e=this._getDaysInMonth(this._month,this._year);
if(this._date>_e){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
this._date-=_e;
}
}
_d-=60;
}
this._minutes=_d;
},setSeconds:function(_f){
while(_f>=60){
this._minutes++;
if(this._minutes>=60){
this._hours++;
this._minutes-=60;
if(this._hours>=24){
this._date++;
this._hours-=24;
var _10=this._getDaysInMonth(this._month,this._year);
if(this._date>_10){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
this._date-=_10;
}
}
}
_f-=60;
}
this._seconds=_f;
},setMilliseconds:function(_11){
while(_11>=1000){
this.setSeconds++;
if(this.setSeconds>=60){
this._minutes++;
this.setSeconds-=60;
if(this._minutes>=60){
this._hours++;
this._minutes-=60;
if(this._hours>=24){
this._date++;
this._hours-=24;
var _12=this._getDaysInMonth(this._month,this._year);
if(this._date>_12){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
this._date-=_12;
}
}
}
}
_11-=1000;
}
this._milliseconds=_11;
},toString:function(){
return this._date+", "+this._month+", "+this._year+"  "+this._hours+":"+this._minutes+":"+this._seconds;
},_getDaysInMonth:function(_13,_14){
return dojo.date.getDaysInMonth(new Date(_14-543,_13));
},fromGregorian:function(_15){
var _16=new Date(_15);
this._date=_16.getDate();
this._month=_16.getMonth();
this._year=_16.getFullYear()+543;
this._hours=_16.getHours();
this._minutes=_16.getMinutes();
this._seconds=_16.getSeconds();
this._milliseconds=_16.getMilliseconds();
this._day=_16.getDay();
return this;
},toGregorian:function(){
return new Date(this._year-543,this._month,this._date,this._hours,this._minutes,this._seconds,this._milliseconds);
},getDay:function(){
return this.toGregorian().getDay();
}});
dojox.date.buddhist.Date.prototype.valueOf=function(){
return this.toGregorian().valueOf();
};
}
