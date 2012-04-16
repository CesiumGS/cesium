/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.islamic"]){
dojo._hasResource["dojox.date.islamic"]=true;
dojo.provide("dojox.date.islamic");
dojo.require("dojox.date.islamic.Date");
dojo.require("dojo.date");
dojox.date.islamic.getDaysInMonth=function(_1){
return _1.getDaysInIslamicMonth(_1.getMonth(),_1.getFullYear());
};
dojox.date.islamic.compare=function(_2,_3,_4){
if(_2 instanceof dojox.date.islamic.Date){
_2=_2.toGregorian();
}
if(_3 instanceof dojox.date.islamic.Date){
_3=_3.toGregorian();
}
return dojo.date.compare.apply(null,arguments);
};
dojox.date.islamic.add=function(_5,_6,_7){
var _8=new dojox.date.islamic.Date(_5);
switch(_6){
case "day":
_8.setDate(_5.getDate()+_7);
break;
case "weekday":
var _9=_5.getDay();
if(((_9+_7)<5)&&((_9+_7)>0)){
_8.setDate(_5.getDate()+_7);
}else{
var _a=0,_b=0;
if(_9==5){
_9=4;
_b=(_7>0)?-1:1;
}else{
if(_9==6){
_9=4;
_b=(_7>0)?-2:2;
}
}
var _c=(_7>0)?(5-_9-1):-_9;
var _d=_7-_c;
var _e=parseInt(_d/5);
if(_d%5!=0){
_a=(_7>0)?2:-2;
}
_a=_a+_e*7+_d%5+_c;
_8.setDate(_5.getDate()+_a+_b);
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
var _f=_5.getMonth();
_8.setMonth(_f+_7);
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
dojox.date.islamic.difference=function(_10,_11,_12){
_11=_11||new dojox.date.islamic.Date();
_12=_12||"day";
var _13=_10.getFullYear()-_11.getFullYear();
var _14=1;
switch(_12){
case "weekday":
var _15=Math.round(dojox.date.islamic.difference(_10,_11,"day"));
var _16=parseInt(dojox.date.islamic.difference(_10,_11,"week"));
var mod=_15%7;
if(mod==0){
_15=_16*5;
}else{
var adj=0;
var _17=_11.getDay();
var _18=_10.getDay();
_16=parseInt(_15/7);
mod=_15%7;
var _19=new dojox.date.islamic.Date(_11);
_19.setDate(_19.getDate()+(_16*7));
var _1a=_19.getDay();
if(_15>0){
switch(true){
case _17==5:
adj=-1;
break;
case _17==6:
adj=0;
break;
case _18==5:
adj=-1;
break;
case _18==6:
adj=-2;
break;
case (_1a+mod)>5:
adj=-2;
}
}else{
if(_15<0){
switch(true){
case _17==5:
adj=0;
break;
case _17==6:
adj=1;
break;
case _18==5:
adj=2;
break;
case _18==6:
adj=1;
break;
case (_1a+mod)<0:
adj=2;
}
}
}
_15+=adj;
_15-=(_16*2);
}
_14=_15;
break;
case "year":
_14=_13;
break;
case "month":
var _1b=(_10.toGregorian()>_11.toGregorian())?_10:_11;
var _1c=(_10.toGregorian()>_11.toGregorian())?_11:_10;
var _1d=_1b.getMonth();
var _1e=_1c.getMonth();
if(_13==0){
_14=_1b.getMonth()-_1c.getMonth();
}else{
_14=12-_1e;
_14+=_1d;
var i=_1c.getFullYear()+1;
var e=_1b.getFullYear();
for(i;i<e;i++){
_14+=12;
}
}
if(_10.toGregorian()<_11.toGregorian()){
_14=-_14;
}
break;
case "week":
_14=parseInt(dojox.date.islamic.difference(_10,_11,"day")/7);
break;
case "day":
_14/=24;
case "hour":
_14/=60;
case "minute":
_14/=60;
case "second":
_14/=1000;
case "millisecond":
_14*=_10.toGregorian().getTime()-_11.toGregorian().getTime();
}
return Math.round(_14);
};
}
