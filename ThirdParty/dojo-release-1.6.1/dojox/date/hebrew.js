/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.hebrew"]){
dojo._hasResource["dojox.date.hebrew"]=true;
dojo.provide("dojox.date.hebrew");
dojo.require("dojox.date.hebrew.Date");
dojo.require("dojo.date");
dojox.date.hebrew.getDaysInMonth=function(_1){
return _1.getDaysInHebrewMonth(_1.getMonth(),_1.getFullYear());
};
dojox.date.hebrew.compare=function(_2,_3,_4){
if(_2 instanceof dojox.date.hebrew.Date){
_2=_2.toGregorian();
}
if(_3 instanceof dojox.date.hebrew.Date){
_3=_3.toGregorian();
}
return dojo.date.compare.apply(null,arguments);
};
dojox.date.hebrew.add=function(_5,_6,_7){
var _8=new dojox.date.hebrew.Date(_5);
switch(_6){
case "day":
_8.setDate(_5.getDate()+_7);
break;
case "weekday":
var _9=_5.getDay();
var _a=0;
if(_7<0&&_9==6){
_9=5;
_a=-1;
}
if((_9+_7)<5&&(_9+_7)>=0){
_8.setDate(_5.getDate()+_7+_a);
}else{
var _b=(_7>0)?5:-1;
var _c=(_7>0)?2:-2;
if(_7>0&&(_9==5||_9==6)){
_a=4-_9;
_9=4;
}
var _d=_9+_7-_b;
var _e=parseInt(_d/5);
var _f=_d%5;
_8.setDate(_5.getDate()-_9+_c+_e*7+_a+_f+_b);
}
break;
case "year":
_8.setFullYear(_5.getFullYear()+_7);
break;
case "week":
_7*=7;
_8.setDate(_5.getDate()+_7);
break;
case "month":
var _10=_5.getMonth();
var _b=_10+_7;
if(!_5.isLeapYear(_5.getFullYear())){
if(_10<5&&_b>=5){
_b++;
}else{
if(_10>5&&_b<=5){
_b--;
}
}
}
_8.setMonth(_b);
break;
case "hour":
_8.setHours(_5.getHours()+_7);
break;
case "minute":
_8.setMinutes(_5.getMinutes()+_7);
break;
case "second":
_8.setSeconds(_5.getSeconds()+_7);
break;
case "millisecond":
_8.setMilliseconds(_5.getMilliseconds()+_7);
break;
}
return _8;
};
dojox.date.hebrew.difference=function(_11,_12,_13){
_12=_12||new dojox.date.hebrew.Date();
_13=_13||"day";
var _14=_11.getFullYear()-_12.getFullYear();
var _15=1;
switch(_13){
case "weekday":
var _16=Math.round(dojox.date.hebrew.difference(_11,_12,"day"));
var _17=parseInt(dojox.date.hebrew.difference(_11,_12,"week"));
var mod=_16%7;
if(mod==0){
_16=_17*5;
}else{
var adj=0;
var _18=_12.getDay();
var _19=_11.getDay();
_17=parseInt(_16/7);
mod=_16%7;
var _1a=new dojox.date.hebrew.Date(_12);
_1a.setDate(_1a.getDate()+(_17*7));
var _1b=_1a.getDay();
if(_16>0){
switch(true){
case _18==5:
adj=-1;
break;
case _18==6:
adj=0;
break;
case _19==5:
adj=-1;
break;
case _19==6:
adj=-2;
break;
case (_1b+mod)>5:
adj=-2;
}
}else{
if(_16<0){
switch(true){
case _18==5:
adj=0;
break;
case _18==6:
adj=1;
break;
case _19==5:
adj=2;
break;
case _19==6:
adj=1;
break;
case (_1b+mod)<0:
adj=2;
}
}
}
_16+=adj;
_16-=(_17*2);
}
_15=_16;
break;
case "year":
_15=_14;
break;
case "month":
var _1c=(_11.toGregorian()>_12.toGregorian())?_11:_12;
var _1d=(_11.toGregorian()>_12.toGregorian())?_12:_11;
var _1e=_1c.getMonth();
var _1f=_1d.getMonth();
if(_14==0){
_15=(!_11.isLeapYear(_11.getFullYear())&&_1c.getMonth()>5&&_1d.getMonth()<=5)?(_1c.getMonth()-_1d.getMonth()-1):(_1c.getMonth()-_1d.getMonth());
}else{
_15=(!_1d.isLeapYear(_1d.getFullYear())&&_1f<6)?(13-_1f-1):(13-_1f);
_15+=(!_1c.isLeapYear(_1c.getFullYear())&&_1e>5)?(_1e-1):_1e;
var i=_1d.getFullYear()+1;
var e=_1c.getFullYear();
for(i;i<e;i++){
_15+=_1d.isLeapYear(i)?13:12;
}
}
if(_11.toGregorian()<_12.toGregorian()){
_15=-_15;
}
break;
case "week":
_15=parseInt(dojox.date.hebrew.difference(_11,_12,"day")/7);
break;
case "day":
_15/=24;
case "hour":
_15/=60;
case "minute":
_15/=60;
case "second":
_15/=1000;
case "millisecond":
_15*=_11.toGregorian().getTime()-_12.toGregorian().getTime();
}
return Math.round(_15);
};
}
