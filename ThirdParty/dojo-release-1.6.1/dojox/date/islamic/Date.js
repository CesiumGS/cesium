/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.islamic.Date"]){
dojo._hasResource["dojox.date.islamic.Date"]=true;
dojo.provide("dojox.date.islamic.Date");
dojo.require("dojo.date");
dojo.requireLocalization("dojo.cldr","islamic",null,"ROOT,ar,da,de,en,en-gb,es,fi,he,zh-hant");
dojo.declare("dojox.date.islamic.Date",null,{_date:0,_month:0,_year:0,_hours:0,_minutes:0,_seconds:0,_milliseconds:0,_day:0,_GREGORIAN_EPOCH:1721425.5,_ISLAMIC_EPOCH:1948439.5,constructor:function(){
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
this._hours+=arguments[3]||0;
this._minutes+=arguments[4]||0;
this._seconds+=arguments[5]||0;
this._milliseconds+=arguments[6]||0;
}
}
}
},getDate:function(){
return this._date;
},getMonth:function(){
return this._month;
},getFullYear:function(){
return this._year;
},getDay:function(){
return this.toGregorian().getDay();
},getHours:function(){
return this._hours;
},getMinutes:function(){
return this._minutes;
},getSeconds:function(){
return this._seconds;
},getMilliseconds:function(){
return this._milliseconds;
},setDate:function(_3){
_3=parseInt(_3);
if(_3>0&&_3<=this.getDaysInIslamicMonth(this._month,this._year)){
this._date=_3;
}else{
var _4;
if(_3>0){
for(_4=this.getDaysInIslamicMonth(this._month,this._year);_3>_4;_3-=_4,_4=this.getDaysInIslamicMonth(this._month,this._year)){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
}
this._date=_3;
}else{
for(_4=this.getDaysInIslamicMonth((this._month-1)>=0?(this._month-1):11,((this._month-1)>=0)?this._year:this._year-1);_3<=0;_4=this.getDaysInIslamicMonth((this._month-1)>=0?(this._month-1):11,((this._month-1)>=0)?this._year:this._year-1)){
this._month--;
if(this._month<0){
this._year--;
this._month+=12;
}
_3+=_4;
}
this._date=_3;
}
}
return this;
},setFullYear:function(_5){
this._year=+_5;
},setMonth:function(_6){
this._year+=Math.floor(_6/12);
if(_6>0){
this._month=Math.floor(_6%12);
}else{
this._month=Math.floor(((_6%12)+12)%12);
}
},setHours:function(){
var _7=arguments.length;
var _8=0;
if(_7>=1){
_8=parseInt(arguments[0]);
}
if(_7>=2){
this._minutes=parseInt(arguments[1]);
}
if(_7>=3){
this._seconds=parseInt(arguments[2]);
}
if(_7==4){
this._milliseconds=parseInt(arguments[3]);
}
while(_8>=24){
this._date++;
var _9=this.getDaysInIslamicMonth(this._month,this._year);
if(this._date>_9){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
this._date-=_9;
}
_8-=24;
}
this._hours=_8;
},setMinutes:function(_a){
while(_a>=60){
this._hours++;
if(this._hours>=24){
this._date++;
this._hours-=24;
var _b=this.getDaysInIslamicMonth(this._month,this._year);
if(this._date>_b){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
this._date-=_b;
}
}
_a-=60;
}
this._minutes=_a;
},setSeconds:function(_c){
while(_c>=60){
this._minutes++;
if(this._minutes>=60){
this._hours++;
this._minutes-=60;
if(this._hours>=24){
this._date++;
this._hours-=24;
var _d=this.getDaysInIslamicMonth(this._month,this._year);
if(this._date>_d){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
this._date-=_d;
}
}
}
_c-=60;
}
this._seconds=_c;
},setMilliseconds:function(_e){
while(_e>=1000){
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
var _f=this.getDaysInIslamicMonth(this._month,this._year);
if(this._date>_f){
this._month++;
if(this._month>=12){
this._year++;
this._month-=12;
}
this._date-=_f;
}
}
}
}
_e-=1000;
}
this._milliseconds=_e;
},toString:function(){
var x=new Date();
x.setHours(this._hours);
x.setMinutes(this._minutes);
x.setSeconds(this._seconds);
x.setMilliseconds(this._milliseconds);
return this._month+" "+this._date+" "+this._year+" "+x.toTimeString();
},toGregorian:function(){
var _10=this._year;
var _11=this._month;
var _12=this._date;
var _13=_12+Math.ceil(29.5*_11)+(_10-1)*354+Math.floor((3+(11*_10))/30)+this._ISLAMIC_EPOCH-1;
var wjd=Math.floor(_13-0.5)+0.5,_14=wjd-this._GREGORIAN_EPOCH,_15=Math.floor(_14/146097),dqc=this._mod(_14,146097),_16=Math.floor(dqc/36524),_17=this._mod(dqc,36524),_18=Math.floor(_17/1461),_19=this._mod(_17,1461),_1a=Math.floor(_19/365),_1b=(_15*400)+(_16*100)+(_18*4)+_1a;
if(!(_16==4||_1a==4)){
_1b++;
}
var _1c=this._GREGORIAN_EPOCH+(365*(_1b-1))+Math.floor((_1b-1)/4)-(Math.floor((_1b-1)/100))+Math.floor((_1b-1)/400);
var _1d=wjd-_1c;
var tjd=(this._GREGORIAN_EPOCH-1)+(365*(_1b-1))+Math.floor((_1b-1)/4)-(Math.floor((_1b-1)/100))+Math.floor((_1b-1)/400)+Math.floor((739/12)+((dojo.date.isLeapYear(new Date(_1b,3,1))?-1:-2))+1);
var _1e=((wjd<tjd)?0:(dojo.date.isLeapYear(new Date(_1b,3,1))?1:2));
var _1f=Math.floor((((_1d+_1e)*12)+373)/367);
var _20=(this._GREGORIAN_EPOCH-1)+(365*(_1b-1))+Math.floor((_1b-1)/4)-(Math.floor((_1b-1)/100))+Math.floor((_1b-1)/400)+Math.floor((((367*_1f)-362)/12)+((_1f<=2)?0:(dojo.date.isLeapYear(new Date(_1b,_1f,1))?-1:-2))+1);
var day=(wjd-_20)+1;
var _21=new Date(_1b,(_1f-1),day,this._hours,this._minutes,this._seconds,this._milliseconds);
return _21;
},fromGregorian:function(_22){
var _23=new Date(_22);
var _24=_23.getFullYear(),_25=_23.getMonth(),_26=_23.getDate();
var _27=(this._GREGORIAN_EPOCH-1)+(365*(_24-1))+Math.floor((_24-1)/4)+(-Math.floor((_24-1)/100))+Math.floor((_24-1)/400)+Math.floor((((367*(_25+1))-362)/12)+(((_25+1)<=2)?0:(dojo.date.isLeapYear(_23)?-1:-2))+_26);
_27=Math.floor(_27)+0.5;
var _28=_27-this._ISLAMIC_EPOCH;
var _29=Math.floor((30*_28+10646)/10631);
var _2a=Math.ceil((_28-29-this._yearStart(_29))/29.5);
_2a=Math.min(_2a,11);
var _2b=Math.ceil(_28-this._monthStart(_29,_2a))+1;
this._date=_2b;
this._month=_2a;
this._year=_29;
this._hours=_23.getHours();
this._minutes=_23.getMinutes();
this._seconds=_23.getSeconds();
this._milliseconds=_23.getMilliseconds();
this._day=_23.getDay();
return this;
},valueOf:function(){
return this.toGregorian().valueOf();
},_yearStart:function(_2c){
return (_2c-1)*354+Math.floor((3+11*_2c)/30);
},_monthStart:function(_2d,_2e){
return Math.ceil(29.5*_2e)+(_2d-1)*354+Math.floor((3+11*_2d)/30);
},_civilLeapYear:function(_2f){
return (14+11*_2f)%30<11;
},getDaysInIslamicMonth:function(_30,_31){
var _32=0;
_32=29+((_30+1)%2);
if(_30==11&&this._civilLeapYear(_31)){
_32++;
}
return _32;
},_mod:function(a,b){
return a-(b*Math.floor(a/b));
}});
dojox.date.islamic.Date.getDaysInIslamicMonth=function(_33){
return new dojox.date.islamic.Date().getDaysInIslamicMonth(_33.getMonth(),_33.getFullYear());
};
}
