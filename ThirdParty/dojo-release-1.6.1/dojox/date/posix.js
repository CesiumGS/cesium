/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.posix"]){
dojo._hasResource["dojox.date.posix"]=true;
dojo.provide("dojox.date.posix");
dojo.require("dojo.date");
dojo.require("dojo.date.locale");
dojo.require("dojo.string");
dojox.date.posix.strftime=function(_1,_2,_3){
var _4=null;
var _5=function(s,n){
return dojo.string.pad(s,n||2,_4||"0");
};
var _6=dojo.date.locale._getGregorianBundle(_3);
var $=function(_7){
switch(_7){
case "a":
return dojo.date.locale.getNames("days","abbr","format",_3)[_1.getDay()];
case "A":
return dojo.date.locale.getNames("days","wide","format",_3)[_1.getDay()];
case "b":
case "h":
return dojo.date.locale.getNames("months","abbr","format",_3)[_1.getMonth()];
case "B":
return dojo.date.locale.getNames("months","wide","format",_3)[_1.getMonth()];
case "c":
return dojo.date.locale.format(_1,{formatLength:"full",locale:_3});
case "C":
return _5(Math.floor(_1.getFullYear()/100));
case "d":
return _5(_1.getDate());
case "D":
return $("m")+"/"+$("d")+"/"+$("y");
case "e":
if(_4==null){
_4=" ";
}
return _5(_1.getDate());
case "f":
if(_4==null){
_4=" ";
}
return _5(_1.getMonth()+1);
case "g":
break;
case "G":
dojo.unimplemented("unimplemented modifier 'G'");
break;
case "F":
return $("Y")+"-"+$("m")+"-"+$("d");
case "H":
return _5(_1.getHours());
case "I":
return _5(_1.getHours()%12||12);
case "j":
return _5(dojo.date.locale._getDayOfYear(_1),3);
case "k":
if(_4==null){
_4=" ";
}
return _5(_1.getHours());
case "l":
if(_4==null){
_4=" ";
}
return _5(_1.getHours()%12||12);
case "m":
return _5(_1.getMonth()+1);
case "M":
return _5(_1.getMinutes());
case "n":
return "\n";
case "p":
return _6["dayPeriods-format-wide-"+(_1.getHours()<12?"am":"pm")];
case "r":
return $("I")+":"+$("M")+":"+$("S")+" "+$("p");
case "R":
return $("H")+":"+$("M");
case "S":
return _5(_1.getSeconds());
case "t":
return "\t";
case "T":
return $("H")+":"+$("M")+":"+$("S");
case "u":
return String(_1.getDay()||7);
case "U":
return _5(dojo.date.locale._getWeekOfYear(_1));
case "V":
return _5(dojox.date.posix.getIsoWeekOfYear(_1));
case "W":
return _5(dojo.date.locale._getWeekOfYear(_1,1));
case "w":
return String(_1.getDay());
case "x":
return dojo.date.locale.format(_1,{selector:"date",formatLength:"full",locale:_3});
case "X":
return dojo.date.locale.format(_1,{selector:"time",formatLength:"full",locale:_3});
case "y":
return _5(_1.getFullYear()%100);
case "Y":
return String(_1.getFullYear());
case "z":
var _8=_1.getTimezoneOffset();
return (_8>0?"-":"+")+_5(Math.floor(Math.abs(_8)/60))+":"+_5(Math.abs(_8)%60);
case "Z":
return dojo.date.getTimezoneName(_1);
case "%":
return "%";
}
};
var _9="";
var i=0;
var _a=0;
var _b=null;
while((_a=_2.indexOf("%",i))!=-1){
_9+=_2.substring(i,_a++);
switch(_2.charAt(_a++)){
case "_":
_4=" ";
break;
case "-":
_4="";
break;
case "0":
_4="0";
break;
case "^":
_b="upper";
break;
case "*":
_b="lower";
break;
case "#":
_b="swap";
break;
default:
_4=null;
_a--;
break;
}
var _c=$(_2.charAt(_a++));
switch(_b){
case "upper":
_c=_c.toUpperCase();
break;
case "lower":
_c=_c.toLowerCase();
break;
case "swap":
var _d=_c.toLowerCase();
var _e="";
var ch="";
for(var j=0;j<_c.length;j++){
ch=_c.charAt(j);
_e+=(ch==_d.charAt(j))?ch.toUpperCase():ch.toLowerCase();
}
_c=_e;
break;
default:
break;
}
_b=null;
_9+=_c;
i=_a;
}
_9+=_2.substring(i);
return _9;
};
dojox.date.posix.getStartOfWeek=function(_f,_10){
if(isNaN(_10)){
_10=dojo.cldr.supplemental.getFirstDayOfWeek?dojo.cldr.supplemental.getFirstDayOfWeek():0;
}
var _11=_10;
if(_f.getDay()>=_10){
_11-=_f.getDay();
}else{
_11-=(7-_f.getDay());
}
var _12=new Date(_f);
_12.setHours(0,0,0,0);
return dojo.date.add(_12,"day",_11);
};
dojox.date.posix.setIsoWeekOfYear=function(_13,_14){
if(!_14){
return _13;
}
var _15=dojox.date.posix.getIsoWeekOfYear(_13);
var _16=_14-_15;
if(_14<0){
var _17=dojox.date.posix.getIsoWeeksInYear(_13);
_16=(_17+_14+1)-_15;
}
return dojo.date.add(_13,"week",_16);
};
dojox.date.posix.getIsoWeekOfYear=function(_18){
var _19=dojox.date.posix.getStartOfWeek(_18,1);
var _1a=new Date(_18.getFullYear(),0,4);
_1a=dojox.date.posix.getStartOfWeek(_1a,1);
var _1b=_19.getTime()-_1a.getTime();
if(_1b<0){
return dojox.date.posix.getIsoWeeksInYear(_19);
}
return Math.ceil(_1b/604800000)+1;
};
dojox.date.posix.getIsoWeeksInYear=function(_1c){
function p(y){
return y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400);
};
var y=_1c.getFullYear();
return (p(y)%7==4||p(y-1)%7==3)?53:52;
};
}
