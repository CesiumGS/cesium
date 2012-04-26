/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.date"]){
dojo._hasResource["dojo.date"]=true;
dojo.provide("dojo.date");
dojo.getObject("date",true,dojo);
dojo.date.getDaysInMonth=function(_1){
var _2=_1.getMonth();
var _3=[31,28,31,30,31,30,31,31,30,31,30,31];
if(_2==1&&dojo.date.isLeapYear(_1)){
return 29;
}
return _3[_2];
};
dojo.date.isLeapYear=function(_4){
var _5=_4.getFullYear();
return !(_5%400)||(!(_5%4)&&!!(_5%100));
};
dojo.date.getTimezoneName=function(_6){
var _7=_6.toString();
var tz="";
var _8;
var _9=_7.indexOf("(");
if(_9>-1){
tz=_7.substring(++_9,_7.indexOf(")"));
}else{
var _a=/([A-Z\/]+) \d{4}$/;
if((_8=_7.match(_a))){
tz=_8[1];
}else{
_7=_6.toLocaleString();
_a=/ ([A-Z\/]+)$/;
if((_8=_7.match(_a))){
tz=_8[1];
}
}
}
return (tz=="AM"||tz=="PM")?"":tz;
};
dojo.date.compare=function(_b,_c,_d){
_b=new Date(+_b);
_c=new Date(+(_c||new Date()));
if(_d=="date"){
_b.setHours(0,0,0,0);
_c.setHours(0,0,0,0);
}else{
if(_d=="time"){
_b.setFullYear(0,0,0);
_c.setFullYear(0,0,0);
}
}
if(_b>_c){
return 1;
}
if(_b<_c){
return -1;
}
return 0;
};
dojo.date.add=function(_e,_f,_10){
var sum=new Date(+_e);
var _11=false;
var _12="Date";
switch(_f){
case "day":
break;
case "weekday":
var _13,_14;
var mod=_10%5;
if(!mod){
_13=(_10>0)?5:-5;
_14=(_10>0)?((_10-5)/5):((_10+5)/5);
}else{
_13=mod;
_14=parseInt(_10/5);
}
var _15=_e.getDay();
var adj=0;
if(_15==6&&_10>0){
adj=1;
}else{
if(_15==0&&_10<0){
adj=-1;
}
}
var _16=_15+_13;
if(_16==0||_16==6){
adj=(_10>0)?2:-2;
}
_10=(7*_14)+_13+adj;
break;
case "year":
_12="FullYear";
_11=true;
break;
case "week":
_10*=7;
break;
case "quarter":
_10*=3;
case "month":
_11=true;
_12="Month";
break;
default:
_12="UTC"+_f.charAt(0).toUpperCase()+_f.substring(1)+"s";
}
if(_12){
sum["set"+_12](sum["get"+_12]()+_10);
}
if(_11&&(sum.getDate()<_e.getDate())){
sum.setDate(0);
}
return sum;
};
dojo.date.difference=function(_17,_18,_19){
_18=_18||new Date();
_19=_19||"day";
var _1a=_18.getFullYear()-_17.getFullYear();
var _1b=1;
switch(_19){
case "quarter":
var m1=_17.getMonth();
var m2=_18.getMonth();
var q1=Math.floor(m1/3)+1;
var q2=Math.floor(m2/3)+1;
q2+=(_1a*4);
_1b=q2-q1;
break;
case "weekday":
var _1c=Math.round(dojo.date.difference(_17,_18,"day"));
var _1d=parseInt(dojo.date.difference(_17,_18,"week"));
var mod=_1c%7;
if(mod==0){
_1c=_1d*5;
}else{
var adj=0;
var _1e=_17.getDay();
var _1f=_18.getDay();
_1d=parseInt(_1c/7);
mod=_1c%7;
var _20=new Date(_17);
_20.setDate(_20.getDate()+(_1d*7));
var _21=_20.getDay();
if(_1c>0){
switch(true){
case _1e==6:
adj=-1;
break;
case _1e==0:
adj=0;
break;
case _1f==6:
adj=-1;
break;
case _1f==0:
adj=-2;
break;
case (_21+mod)>5:
adj=-2;
}
}else{
if(_1c<0){
switch(true){
case _1e==6:
adj=0;
break;
case _1e==0:
adj=1;
break;
case _1f==6:
adj=2;
break;
case _1f==0:
adj=1;
break;
case (_21+mod)<0:
adj=2;
}
}
}
_1c+=adj;
_1c-=(_1d*2);
}
_1b=_1c;
break;
case "year":
_1b=_1a;
break;
case "month":
_1b=(_18.getMonth()-_17.getMonth())+(_1a*12);
break;
case "week":
_1b=parseInt(dojo.date.difference(_17,_18,"day")/7);
break;
case "day":
_1b/=24;
case "hour":
_1b/=60;
case "minute":
_1b/=60;
case "second":
_1b/=1000;
case "millisecond":
_1b*=_18.getTime()-_17.getTime();
}
return Math.round(_1b);
};
}
