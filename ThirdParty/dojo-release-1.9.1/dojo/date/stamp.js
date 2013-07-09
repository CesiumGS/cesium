/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/date/stamp",["../_base/lang","../_base/array"],function(_1,_2){
var _3={};
_1.setObject("dojo.date.stamp",_3);
_3.fromISOString=function(_4,_5){
if(!_3._isoRegExp){
_3._isoRegExp=/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;
}
var _6=_3._isoRegExp.exec(_4),_7=null;
if(_6){
_6.shift();
if(_6[1]){
_6[1]--;
}
if(_6[6]){
_6[6]*=1000;
}
if(_5){
_5=new Date(_5);
_2.forEach(_2.map(["FullYear","Month","Date","Hours","Minutes","Seconds","Milliseconds"],function(_8){
return _5["get"+_8]();
}),function(_9,_a){
_6[_a]=_6[_a]||_9;
});
}
_7=new Date(_6[0]||1970,_6[1]||0,_6[2]||1,_6[3]||0,_6[4]||0,_6[5]||0,_6[6]||0);
if(_6[0]<100){
_7.setFullYear(_6[0]||1970);
}
var _b=0,_c=_6[7]&&_6[7].charAt(0);
if(_c!="Z"){
_b=((_6[8]||0)*60)+(Number(_6[9])||0);
if(_c!="-"){
_b*=-1;
}
}
if(_c){
_b-=_7.getTimezoneOffset();
}
if(_b){
_7.setTime(_7.getTime()+_b*60000);
}
}
return _7;
};
_3.toISOString=function(_d,_e){
var _f=function(n){
return (n<10)?"0"+n:n;
};
_e=_e||{};
var _10=[],_11=_e.zulu?"getUTC":"get",_12="";
if(_e.selector!="time"){
var _13=_d[_11+"FullYear"]();
_12=["0000".substr((_13+"").length)+_13,_f(_d[_11+"Month"]()+1),_f(_d[_11+"Date"]())].join("-");
}
_10.push(_12);
if(_e.selector!="date"){
var _14=[_f(_d[_11+"Hours"]()),_f(_d[_11+"Minutes"]()),_f(_d[_11+"Seconds"]())].join(":");
var _15=_d[_11+"Milliseconds"]();
if(_e.milliseconds){
_14+="."+(_15<100?"0":"")+_f(_15);
}
if(_e.zulu){
_14+="Z";
}else{
if(_e.selector!="time"){
var _16=_d.getTimezoneOffset();
var _17=Math.abs(_16);
_14+=(_16>0?"-":"+")+_f(Math.floor(_17/60))+":"+_f(_17%60);
}
}
_10.push(_14);
}
return _10.join("T");
};
return _3;
});
