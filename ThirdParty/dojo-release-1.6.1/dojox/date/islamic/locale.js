/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.islamic.locale"]){
dojo._hasResource["dojox.date.islamic.locale"]=true;
dojo.provide("dojox.date.islamic.locale");
dojo.require("dojox.date.islamic.Date");
dojo.require("dojo.regexp");
dojo.require("dojo.string");
dojo.require("dojo.i18n");
dojo.require("dojo.date");
dojo.requireLocalization("dojo.cldr","islamic",null,"ROOT,ar,da,de,en,en-gb,es,fi,he,zh-hant");
(function(){
function _1(_2,_3,_4,_5,_6){
return _6.replace(/([a-z])\1*/ig,function(_7){
var s,_8;
var c=_7.charAt(0);
var l=_7.length;
var _9=["abbr","wide","narrow"];
switch(c){
case "G":
s=_3["eraAbbr"][0];
break;
case "y":
s=String(_2.getFullYear());
break;
case "M":
var m=_2.getMonth();
if(l<3){
s=m+1;
_8=true;
}else{
var _a=["months","format",_9[l-3]].join("-");
s=_3[_a][m];
}
break;
case "d":
s=_2.getDate(true);
_8=true;
break;
case "E":
var d=_2.getDay();
if(l<3){
s=d+1;
_8=true;
}else{
var _b=["days","format",_9[l-3]].join("-");
s=_3[_b][d];
}
break;
case "a":
var _c=(_2.getHours()<12)?"am":"pm";
s=_3["dayPeriods-format-wide-"+_c];
break;
case "h":
case "H":
case "K":
case "k":
var h=_2.getHours();
switch(c){
case "h":
s=(h%12)||12;
break;
case "H":
s=h;
break;
case "K":
s=(h%12);
break;
case "k":
s=h||24;
break;
}
_8=true;
break;
case "m":
s=_2.getMinutes();
_8=true;
break;
case "s":
s=_2.getSeconds();
_8=true;
break;
case "S":
s=Math.round(_2.getMilliseconds()*Math.pow(10,l-3));
_8=true;
break;
case "z":
s=dojo.date.getTimezoneName(_2.toGregorian());
if(s){
break;
}
l=4;
case "Z":
var _d=_2.toGregorian().getTimezoneOffset();
var tz=[(_d<=0?"+":"-"),dojo.string.pad(Math.floor(Math.abs(_d)/60),2),dojo.string.pad(Math.abs(_d)%60,2)];
if(l==4){
tz.splice(0,0,"GMT");
tz.splice(3,0,":");
}
s=tz.join("");
break;
default:
throw new Error("dojox.date.islamic.locale.formatPattern: invalid pattern char: "+_6);
}
if(_8){
s=dojo.string.pad(s,l);
}
return s;
});
};
dojox.date.islamic.locale.format=function(_e,_f){
_f=_f||{};
var _10=dojo.i18n.normalizeLocale(_f.locale);
var _11=_f.formatLength||"short";
var _12=dojox.date.islamic.locale._getIslamicBundle(_10);
var str=[];
var _13=dojo.hitch(this,_1,_e,_12,_10,_f.fullYear);
if(_f.selector=="year"){
var _14=_e.getFullYear();
return _14;
}
if(_f.selector!="time"){
var _15=_f.datePattern||_12["dateFormat-"+_11];
if(_15){
str.push(_16(_15,_13));
}
}
if(_f.selector!="date"){
var _17=_f.timePattern||_12["timeFormat-"+_11];
if(_17){
str.push(_16(_17,_13));
}
}
var _18=str.join(" ");
return _18;
};
dojox.date.islamic.locale.regexp=function(_19){
return dojox.date.islamic.locale._parseInfo(_19).regexp;
};
dojox.date.islamic.locale._parseInfo=function(_1a){
_1a=_1a||{};
var _1b=dojo.i18n.normalizeLocale(_1a.locale);
var _1c=dojox.date.islamic.locale._getIslamicBundle(_1b);
var _1d=_1a.formatLength||"short";
var _1e=_1a.datePattern||_1c["dateFormat-"+_1d];
var _1f=_1a.timePattern||_1c["timeFormat-"+_1d];
var _20;
if(_1a.selector=="date"){
_20=_1e;
}else{
if(_1a.selector=="time"){
_20=_1f;
}else{
_20=(typeof (_1f)=="undefined")?_1e:_1e+" "+_1f;
}
}
var _21=[];
var re=_16(_20,dojo.hitch(this,_22,_21,_1c,_1a));
return {regexp:re,tokens:_21,bundle:_1c};
};
dojox.date.islamic.locale.parse=function(_23,_24){
_23=_23.replace(/[\u200E\u200F\u202A\u202E]/g,"");
if(!_24){
_24={};
}
var _25=dojox.date.islamic.locale._parseInfo(_24);
var _26=_25.tokens,_27=_25.bundle;
var _28=_25.regexp.replace(/[\u200E\u200F\u202A\u202E]/g,"");
var re=new RegExp("^"+_28+"$");
var _29=re.exec(_23);
var _2a=dojo.i18n.normalizeLocale(_24.locale);
if(!_29){
return null;
}
var _2b,_2c;
var _2d=[1389,0,1,0,0,0,0];
var _2e="";
var _2f=0;
var _30=["abbr","wide","narrow"];
var _31=dojo.every(_29,function(v,i){
if(!i){
return true;
}
var _32=_26[i-1];
var l=_32.length;
switch(_32.charAt(0)){
case "y":
_2d[0]=Number(v);
break;
case "M":
if(l>2){
var _33=_27["months-format-"+_30[l-3]].concat();
if(!_24.strict){
v=v.replace(".","").toLowerCase();
_33=dojo.map(_33,function(s){
return s?s.replace(".","").toLowerCase():s;
});
}
v=dojo.indexOf(_33,v);
if(v==-1){
return false;
}
_2f=l;
}else{
v--;
}
_2d[1]=Number(v);
break;
case "D":
_2d[1]=0;
case "d":
_2d[2]=Number(v);
break;
case "a":
var am=_24.am||_27["dayPeriods-format-wide-am"],pm=_24.pm||_27["dayPeriods-format-wide-pm"];
if(!_24.strict){
var _34=/\./g;
v=v.replace(_34,"").toLowerCase();
am=am.replace(_34,"").toLowerCase();
pm=pm.replace(_34,"").toLowerCase();
}
if(_24.strict&&v!=am&&v!=pm){
return false;
}
_2e=(v==pm)?"p":(v==am)?"a":"";
break;
case "K":
if(v==24){
v=0;
}
case "h":
case "H":
case "k":
_2d[3]=Number(v);
break;
case "m":
_2d[4]=Number(v);
break;
case "s":
_2d[5]=Number(v);
break;
case "S":
_2d[6]=Number(v);
}
return true;
});
var _35=+_2d[3];
if(_2e==="p"&&_35<12){
_2d[3]=_35+12;
}else{
if(_2e==="a"&&_35==12){
_2d[3]=0;
}
}
var _36=new dojox.date.islamic.Date(_2d[0],_2d[1],_2d[2],_2d[3],_2d[4],_2d[5],_2d[6]);
return _36;
};
function _16(_37,_38,_39,_3a){
var _3b=function(x){
return x;
};
_38=_38||_3b;
_39=_39||_3b;
_3a=_3a||_3b;
var _3c=_37.match(/(''|[^'])+/g);
var _3d=_37.charAt(0)=="'";
dojo.forEach(_3c,function(_3e,i){
if(!_3e){
_3c[i]="";
}else{
_3c[i]=(_3d?_39:_38)(_3e);
_3d=!_3d;
}
});
return _3a(_3c.join(""));
};
function _22(_3f,_40,_41,_42){
_42=dojo.regexp.escapeString(_42);
var _43=dojo.i18n.normalizeLocale(_41.locale);
return _42.replace(/([a-z])\1*/ig,function(_44){
var s;
var c=_44.charAt(0);
var l=_44.length;
var p2="",p3="";
if(_41.strict){
if(l>1){
p2="0"+"{"+(l-1)+"}";
}
if(l>2){
p3="0"+"{"+(l-2)+"}";
}
}else{
p2="0?";
p3="0{0,2}";
}
switch(c){
case "y":
s="\\d+";
break;
case "M":
s=(l>2)?"\\S+ ?\\S+":p2+"[1-9]|1[0-2]";
break;
case "d":
s="[12]\\d|"+p2+"[1-9]|3[01]";
break;
case "E":
s="\\S+";
break;
case "h":
s=p2+"[1-9]|1[0-2]";
break;
case "k":
s=p2+"\\d|1[01]";
break;
case "H":
s=p2+"\\d|1\\d|2[0-3]";
break;
case "K":
s=p2+"[1-9]|1\\d|2[0-4]";
break;
case "m":
case "s":
s=p2+"\\d|[0-5]\\d";
break;
case "S":
s="\\d{"+l+"}";
break;
case "a":
var am=_41.am||_40["dayPeriods-format-wide-am"],pm=_41.pm||_40["dayPeriods-format-wide-pm"];
if(_41.strict){
s=am+"|"+pm;
}else{
s=am+"|"+pm;
if(am!=am.toLowerCase()){
s+="|"+am.toLowerCase();
}
if(pm!=pm.toLowerCase()){
s+="|"+pm.toLowerCase();
}
}
break;
default:
s=".*";
}
if(_3f){
_3f.push(_44);
}
return "("+s+")";
}).replace(/[\xa0 ]/g,"[\\s\\xa0]");
};
})();
(function(){
var _45=[];
dojox.date.islamic.locale.addCustomFormats=function(_46,_47){
_45.push({pkg:_46,name:_47});
};
dojox.date.islamic.locale._getIslamicBundle=function(_48){
var _49={};
dojo.forEach(_45,function(_4a){
var _4b=dojo.i18n.getLocalization(_4a.pkg,_4a.name,_48);
_49=dojo.mixin(_49,_4b);
},this);
return _49;
};
})();
dojox.date.islamic.locale.addCustomFormats("dojo.cldr","islamic");
dojox.date.islamic.locale.getNames=function(_4c,_4d,_4e,_4f,_50){
var _51;
var _52=dojox.date.islamic.locale._getIslamicBundle(_4f);
var _53=[_4c,_4e,_4d];
if(_4e=="standAlone"){
var key=_53.join("-");
_51=_52[key];
if(_51[0]==1){
_51=undefined;
}
}
_53[1]="format";
return (_51||_52[_53.join("-")]).concat();
};
dojox.date.islamic.locale.weekDays=dojox.date.islamic.locale.getNames("days","wide","format");
dojox.date.islamic.locale.months=dojox.date.islamic.locale.getNames("months","wide","format");
}
