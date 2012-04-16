/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.date.stamp"]){
dojo._hasResource["dojo.date.stamp"]=true;
dojo.provide("dojo.date.stamp");
dojo.getObject("date.stamp",true,dojo);
dojo.date.stamp.fromISOString=function(_1,_2){
if(!dojo.date.stamp._isoRegExp){
dojo.date.stamp._isoRegExp=/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;
}
var _3=dojo.date.stamp._isoRegExp.exec(_1),_4=null;
if(_3){
_3.shift();
if(_3[1]){
_3[1]--;
}
if(_3[6]){
_3[6]*=1000;
}
if(_2){
_2=new Date(_2);
dojo.forEach(dojo.map(["FullYear","Month","Date","Hours","Minutes","Seconds","Milliseconds"],function(_5){
return _2["get"+_5]();
}),function(_6,_7){
_3[_7]=_3[_7]||_6;
});
}
_4=new Date(_3[0]||1970,_3[1]||0,_3[2]||1,_3[3]||0,_3[4]||0,_3[5]||0,_3[6]||0);
if(_3[0]<100){
_4.setFullYear(_3[0]||1970);
}
var _8=0,_9=_3[7]&&_3[7].charAt(0);
if(_9!="Z"){
_8=((_3[8]||0)*60)+(Number(_3[9])||0);
if(_9!="-"){
_8*=-1;
}
}
if(_9){
_8-=_4.getTimezoneOffset();
}
if(_8){
_4.setTime(_4.getTime()+_8*60000);
}
}
return _4;
};
dojo.date.stamp.toISOString=function(_a,_b){
var _c=function(n){
return (n<10)?"0"+n:n;
};
_b=_b||{};
var _d=[],_e=_b.zulu?"getUTC":"get",_f="";
if(_b.selector!="time"){
var _10=_a[_e+"FullYear"]();
_f=["0000".substr((_10+"").length)+_10,_c(_a[_e+"Month"]()+1),_c(_a[_e+"Date"]())].join("-");
}
_d.push(_f);
if(_b.selector!="date"){
var _11=[_c(_a[_e+"Hours"]()),_c(_a[_e+"Minutes"]()),_c(_a[_e+"Seconds"]())].join(":");
var _12=_a[_e+"Milliseconds"]();
if(_b.milliseconds){
_11+="."+(_12<100?"0":"")+_c(_12);
}
if(_b.zulu){
_11+="Z";
}else{
if(_b.selector!="time"){
var _13=_a.getTimezoneOffset();
var _14=Math.abs(_13);
_11+=(_13>0?"-":"+")+_c(Math.floor(_14/60))+":"+_c(_14%60);
}
}
_d.push(_11);
}
return _d.join("T");
};
}
