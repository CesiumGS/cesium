/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/date",["./has","./_base/lang"],function(_1,_2){
var _3={};
_3.getDaysInMonth=function(_4){
var _5=_4.getMonth();
var _6=[31,28,31,30,31,30,31,31,30,31,30,31];
if(_5==1&&_3.isLeapYear(_4)){
return 29;
}
return _6[_5];
};
_3.isLeapYear=function(_7){
var _8=_7.getFullYear();
return !(_8%400)||(!(_8%4)&&!!(_8%100));
};
_3.getTimezoneName=function(_9){
var _a=_9.toString();
var tz="";
var _b;
var _c=_a.indexOf("(");
if(_c>-1){
tz=_a.substring(++_c,_a.indexOf(")"));
}else{
var _d=/([A-Z\/]+) \d{4}$/;
if((_b=_a.match(_d))){
tz=_b[1];
}else{
_a=_9.toLocaleString();
_d=/ ([A-Z\/]+)$/;
if((_b=_a.match(_d))){
tz=_b[1];
}
}
}
return (tz=="AM"||tz=="PM")?"":tz;
};
_3.compare=function(_e,_f,_10){
_e=new Date(+_e);
_f=new Date(+(_f||new Date()));
if(_10=="date"){
_e.setHours(0,0,0,0);
_f.setHours(0,0,0,0);
}else{
if(_10=="time"){
_e.setFullYear(0,0,0);
_f.setFullYear(0,0,0);
}
}
if(_e>_f){
return 1;
}
if(_e<_f){
return -1;
}
return 0;
};
_3.add=function(_11,_12,_13){
var sum=new Date(+_11);
var _14=false;
var _15="Date";
switch(_12){
case "day":
break;
case "weekday":
var _16,_17;
var mod=_13%5;
if(!mod){
_16=(_13>0)?5:-5;
_17=(_13>0)?((_13-5)/5):((_13+5)/5);
}else{
_16=mod;
_17=parseInt(_13/5);
}
var _18=_11.getDay();
var adj=0;
if(_18==6&&_13>0){
adj=1;
}else{
if(_18==0&&_13<0){
adj=-1;
}
}
var _19=_18+_16;
if(_19==0||_19==6){
adj=(_13>0)?2:-2;
}
_13=(7*_17)+_16+adj;
break;
case "year":
_15="FullYear";
_14=true;
break;
case "week":
_13*=7;
break;
case "quarter":
_13*=3;
case "month":
_14=true;
_15="Month";
break;
default:
_15="UTC"+_12.charAt(0).toUpperCase()+_12.substring(1)+"s";
}
if(_15){
sum["set"+_15](sum["get"+_15]()+_13);
}
if(_14&&(sum.getDate()<_11.getDate())){
sum.setDate(0);
}
return sum;
};
_3.difference=function(_1a,_1b,_1c){
_1b=_1b||new Date();
_1c=_1c||"day";
var _1d=_1b.getFullYear()-_1a.getFullYear();
var _1e=1;
switch(_1c){
case "quarter":
var m1=_1a.getMonth();
var m2=_1b.getMonth();
var q1=Math.floor(m1/3)+1;
var q2=Math.floor(m2/3)+1;
q2+=(_1d*4);
_1e=q2-q1;
break;
case "weekday":
var _1f=Math.round(_3.difference(_1a,_1b,"day"));
var _20=parseInt(_3.difference(_1a,_1b,"week"));
var mod=_1f%7;
if(mod==0){
_1f=_20*5;
}else{
var adj=0;
var _21=_1a.getDay();
var _22=_1b.getDay();
_20=parseInt(_1f/7);
mod=_1f%7;
var _23=new Date(_1a);
_23.setDate(_23.getDate()+(_20*7));
var _24=_23.getDay();
if(_1f>0){
switch(true){
case _21==6:
adj=-1;
break;
case _21==0:
adj=0;
break;
case _22==6:
adj=-1;
break;
case _22==0:
adj=-2;
break;
case (_24+mod)>5:
adj=-2;
}
}else{
if(_1f<0){
switch(true){
case _21==6:
adj=0;
break;
case _21==0:
adj=1;
break;
case _22==6:
adj=2;
break;
case _22==0:
adj=1;
break;
case (_24+mod)<0:
adj=2;
}
}
}
_1f+=adj;
_1f-=(_20*2);
}
_1e=_1f;
break;
case "year":
_1e=_1d;
break;
case "month":
_1e=(_1b.getMonth()-_1a.getMonth())+(_1d*12);
break;
case "week":
_1e=parseInt(_3.difference(_1a,_1b,"day")/7);
break;
case "day":
_1e/=24;
case "hour":
_1e/=60;
case "minute":
_1e/=60;
case "second":
_1e/=1000;
case "millisecond":
_1e*=_1b.getTime()-_1a.getTime();
}
return Math.round(_1e);
};
1&&_2.mixin(_2.getObject("dojo.date",true),_3);
return _3;
});
