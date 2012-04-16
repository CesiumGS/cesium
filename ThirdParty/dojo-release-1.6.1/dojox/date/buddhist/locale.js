/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.buddhist.locale"]){
dojo._hasResource["dojox.date.buddhist.locale"]=true;
dojo.provide("dojox.date.buddhist.locale");
dojo.experimental("dojox.date.buddhist.locale");
dojo.require("dojox.date.buddhist.Date");
dojo.require("dojo.regexp");
dojo.require("dojo.string");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojo.cldr","buddhist",null,"ROOT,ar,da,de,el,en,en-gb,es,fi,ro,th,zh-hant");
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
throw new Error("dojox.date.buddhist.locale.formatPattern: invalid pattern char: "+_6);
}
if(_8){
s=dojo.string.pad(s,l);
}
return s;
});
};
dojox.date.buddhist.locale.format=function(_e,_f){
_f=_f||{};
var _10=dojo.i18n.normalizeLocale(_f.locale);
var _11=_f.formatLength||"short";
var _12=dojox.date.buddhist.locale._getBuddhistBundle(_10);
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
dojox.date.buddhist.locale.regexp=function(_19){
return dojox.date.buddhist.locale._parseInfo(_19).regexp;
};
dojox.date.buddhist.locale._parseInfo=function(_1a){
_1a=_1a||{};
var _1b=dojo.i18n.normalizeLocale(_1a.locale);
var _1c=dojox.date.buddhist.locale._getBuddhistBundle(_1b);
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
dojox.date.buddhist.locale.parse=function(_23,_24){
_23=_23.replace(/[\u200E\u200F\u202A-\u202E]/g,"");
if(!_24){
_24={};
}
var _25=dojox.date.buddhist.locale._parseInfo(_24);
var _26=_25.tokens,_27=_25.bundle;
var re=new RegExp("^"+_25.regexp+"$");
var _28=re.exec(_23);
var _29=dojo.i18n.normalizeLocale(_24.locale);
if(!_28){
return null;
}
var _2a,_2b;
var _2c=[2513,0,1,0,0,0,0];
var _2d="";
var _2e=0;
var _2f=["abbr","wide","narrow"];
var _30=dojo.every(_28,function(v,i){
if(!i){
return true;
}
var _31=_26[i-1];
var l=_31.length;
switch(_31.charAt(0)){
case "y":
_2c[0]=Number(v);
break;
case "M":
if(l>2){
var _32=_27["months-format-"+_2f[l-3]].concat();
if(!_24.strict){
v=v.replace(".","").toLowerCase();
_32=dojo.map(_32,function(s){
return s?s.replace(".","").toLowerCase():s;
});
}
v=dojo.indexOf(_32,v);
if(v==-1){
return false;
}
_2e=l;
}else{
v--;
}
_2c[1]=Number(v);
break;
case "D":
_2c[1]=0;
case "d":
_2c[2]=Number(v);
break;
case "a":
var am=_24.am||_27["dayPeriods-format-wide-am"],pm=_24.pm||_27["dayPeriods-format-wide-pm"];
if(!_24.strict){
var _33=/\./g;
v=v.replace(_33,"").toLowerCase();
am=am.replace(_33,"").toLowerCase();
pm=pm.replace(_33,"").toLowerCase();
}
if(_24.strict&&v!=am&&v!=pm){
return false;
}
_2d=(v==pm)?"p":(v==am)?"a":"";
break;
case "K":
if(v==24){
v=0;
}
case "h":
case "H":
case "k":
_2c[3]=Number(v);
break;
case "m":
_2c[4]=Number(v);
break;
case "s":
_2c[5]=Number(v);
break;
case "S":
_2c[6]=Number(v);
}
return true;
});
var _34=+_2c[3];
if(_2d==="p"&&_34<12){
_2c[3]=_34+12;
}else{
if(_2d==="a"&&_34==12){
_2c[3]=0;
}
}
var _35=new dojox.date.buddhist.Date(_2c[0],_2c[1],_2c[2],_2c[3],_2c[4],_2c[5],_2c[6]);
return _35;
};
function _16(_36,_37,_38,_39){
var _3a=function(x){
return x;
};
_37=_37||_3a;
_38=_38||_3a;
_39=_39||_3a;
var _3b=_36.match(/(''|[^'])+/g);
var _3c=_36.charAt(0)=="'";
dojo.forEach(_3b,function(_3d,i){
if(!_3d){
_3b[i]="";
}else{
_3b[i]=(_3c?_38:_37)(_3d);
_3c=!_3c;
}
});
return _39(_3b.join(""));
};
function _22(_3e,_3f,_40,_41){
_41=dojo.regexp.escapeString(_41);
var _42=dojo.i18n.normalizeLocale(_40.locale);
return _41.replace(/([a-z])\1*/ig,function(_43){
var s;
var c=_43.charAt(0);
var l=_43.length;
var p2="",p3="";
if(_40.strict){
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
s=(l>2)?"\\S+":p2+"[1-9]|1[0-2]";
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
var am=_40.am||_3f["dayPeriods-format-wide-am"],pm=_40.pm||_3f["dayPeriods-format-wide-pm"];
if(_40.strict){
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
if(_3e){
_3e.push(_43);
}
return "("+s+")";
}).replace(/[\xa0 ]/g,"[\\s\\xa0]");
};
})();
(function(){
var _44=[];
dojox.date.buddhist.locale.addCustomFormats=function(_45,_46){
_44.push({pkg:_45,name:_46});
};
dojox.date.buddhist.locale._getBuddhistBundle=function(_47){
var _48={};
dojo.forEach(_44,function(_49){
var _4a=dojo.i18n.getLocalization(_49.pkg,_49.name,_47);
_48=dojo.mixin(_48,_4a);
},this);
return _48;
};
})();
dojox.date.buddhist.locale.addCustomFormats("dojo.cldr","buddhist");
dojox.date.buddhist.locale.getNames=function(_4b,_4c,_4d,_4e,_4f){
var _50;
var _51=dojox.date.buddhist.locale._getBuddhistBundle(_4e);
var _52=[_4b,_4d,_4c];
if(_4d=="standAlone"){
var key=_52.join("-");
_50=_51[key];
if(_50[0]==1){
_50=undefined;
}
}
_52[1]="format";
return (_50||_51[_52.join("-")]).concat();
};
}
