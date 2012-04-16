/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.buddhist"]){
dojo._hasResource["dojox.date.buddhist"]=true;
dojo.provide("dojox.date.buddhist");
dojo.experimental("dojox.date.buddhist");
dojo.require("dojox.date.buddhist.Date");
dojo.require("dojo.date");
dojox.date.buddhist.getDaysInMonth=function(_1){
return dojo.date.getDaysInMonth(_1.toGregorian());
};
dojox.date.buddhist.isLeapYear=function(_2){
return dojo.date.isLeapYear(_2.toGregorian());
};
dojox.date.buddhist.compare=function(_3,_4,_5){
return dojo.date.compare(_3,_4,_5);
};
dojox.date.buddhist.add=function(_6,_7,_8){
var _9=new dojox.date.buddhist.Date(_6);
switch(_7){
case "day":
_9.setDate(_6.getDate(true)+_8);
break;
case "weekday":
var _a,_b;
var _c=_8%5;
if(!_c){
_a=(_8>0)?5:-5;
_b=(_8>0)?((_8-5)/5):((_8+5)/5);
}else{
_a=_c;
_b=parseInt(_8/5);
}
var _d=_6.getDay();
var _e=0;
if(_d==6&&_8>0){
_e=1;
}else{
if(_d==0&&_8<0){
_e=-1;
}
}
var _f=_d+_a;
if(_f==0||_f==6){
_e=(_8>0)?2:-2;
}
_8=(7*_b)+_a+_e;
_9.setDate(_6.getDate(true)+_8);
break;
case "year":
_9.setFullYear(_6.getFullYear()+_8);
break;
case "week":
_8*=7;
_9.setDate(_6.getDate(true)+_8);
break;
case "month":
_9.setMonth(_6.getMonth()+_8);
break;
case "hour":
_9.setHours(_6.getHours()+_8);
break;
case "minute":
_9.setMinutes(_6.getMinutes()+_8);
break;
case "second":
_9.setSeconds(_6.getSeconds()+_8);
break;
case "millisecond":
_9.setMilliseconds(_6.getMilliseconds()+_8);
break;
}
return _9;
};
dojox.date.buddhist.difference=function(_10,_11,_12){
_11=_11||new dojox.date.buddhist.Date();
_12=_12||"day";
var _13=_10.getFullYear()-_11.getFullYear();
var _14=1;
switch(_12){
case "weekday":
var _15=Math.round(dojox.date.buddhist.difference(_10,_11,"day"));
var _16=parseInt(dojox.date.buddhist.difference(_10,_11,"week"));
var mod=_15%7;
if(mod==0){
_15=_16*5;
}else{
var adj=0;
var _17=_11.getDay();
var _18=_10.getDay();
_16=parseInt(_15/7);
mod=_15%7;
var _19=new dojox.date.buddhist.Date(_10);
_19.setDate(_19.getDate(true)+(_16*7));
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
_14=parseInt(dojox.date.buddhist.difference(_10,_11,"day")/7);
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
