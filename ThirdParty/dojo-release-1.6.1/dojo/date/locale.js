/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.date.locale"]){
dojo._hasResource["dojo.date.locale"]=true;
dojo.provide("dojo.date.locale");
dojo.require("dojo.date");
dojo.require("dojo.cldr.supplemental");
dojo.require("dojo.regexp");
dojo.require("dojo.string");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojo.cldr","gregorian",null,"ROOT,ar,ca,cs,da,de,el,en,en-au,en-ca,en-gb,es,fi,fr,fr-ch,he,hu,it,ja,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-hant,zh-hk,zh-tw");
dojo.getObject("date.locale",true,dojo);
(function(){
function _1(_2,_3,_4,_5){
return _5.replace(/([a-z])\1*/ig,function(_6){
var s,_7,c=_6.charAt(0),l=_6.length,_8=["abbr","wide","narrow"];
switch(c){
case "G":
s=_3[(l<4)?"eraAbbr":"eraNames"][_2.getFullYear()<0?0:1];
break;
case "y":
s=_2.getFullYear();
switch(l){
case 1:
break;
case 2:
if(!_4.fullYear){
s=String(s);
s=s.substr(s.length-2);
break;
}
default:
_7=true;
}
break;
case "Q":
case "q":
s=Math.ceil((_2.getMonth()+1)/3);
_7=true;
break;
case "M":
var m=_2.getMonth();
if(l<3){
s=m+1;
_7=true;
}else{
var _9=["months","format",_8[l-3]].join("-");
s=_3[_9][m];
}
break;
case "w":
var _a=0;
s=dojo.date.locale._getWeekOfYear(_2,_a);
_7=true;
break;
case "d":
s=_2.getDate();
_7=true;
break;
case "D":
s=dojo.date.locale._getDayOfYear(_2);
_7=true;
break;
case "E":
var d=_2.getDay();
if(l<3){
s=d+1;
_7=true;
}else{
var _b=["days","format",_8[l-3]].join("-");
s=_3[_b][d];
}
break;
case "a":
var _c=(_2.getHours()<12)?"am":"pm";
s=_4[_c]||_3["dayPeriods-format-wide-"+_c];
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
_7=true;
break;
case "m":
s=_2.getMinutes();
_7=true;
break;
case "s":
s=_2.getSeconds();
_7=true;
break;
case "S":
s=Math.round(_2.getMilliseconds()*Math.pow(10,l-3));
_7=true;
break;
case "v":
case "z":
s=dojo.date.locale._getZone(_2,true,_4);
if(s){
break;
}
l=4;
case "Z":
var _d=dojo.date.locale._getZone(_2,false,_4);
var tz=[(_d<=0?"+":"-"),dojo.string.pad(Math.floor(Math.abs(_d)/60),2),dojo.string.pad(Math.abs(_d)%60,2)];
if(l==4){
tz.splice(0,0,"GMT");
tz.splice(3,0,":");
}
s=tz.join("");
break;
default:
throw new Error("dojo.date.locale.format: invalid pattern char: "+_5);
}
if(_7){
s=dojo.string.pad(s,l);
}
return s;
});
};
dojo.date.locale._getZone=function(_e,_f,_10){
if(_f){
return dojo.date.getTimezoneName(_e);
}else{
return _e.getTimezoneOffset();
}
};
dojo.date.locale.format=function(_11,_12){
_12=_12||{};
var _13=dojo.i18n.normalizeLocale(_12.locale),_14=_12.formatLength||"short",_15=dojo.date.locale._getGregorianBundle(_13),str=[],_16=dojo.hitch(this,_1,_11,_15,_12);
if(_12.selector=="year"){
return _17(_15["dateFormatItem-yyyy"]||"yyyy",_16);
}
var _18;
if(_12.selector!="date"){
_18=_12.timePattern||_15["timeFormat-"+_14];
if(_18){
str.push(_17(_18,_16));
}
}
if(_12.selector!="time"){
_18=_12.datePattern||_15["dateFormat-"+_14];
if(_18){
str.push(_17(_18,_16));
}
}
return str.length==1?str[0]:_15["dateTimeFormat-"+_14].replace(/\{(\d+)\}/g,function(_19,key){
return str[key];
});
};
dojo.date.locale.regexp=function(_1a){
return dojo.date.locale._parseInfo(_1a).regexp;
};
dojo.date.locale._parseInfo=function(_1b){
_1b=_1b||{};
var _1c=dojo.i18n.normalizeLocale(_1b.locale),_1d=dojo.date.locale._getGregorianBundle(_1c),_1e=_1b.formatLength||"short",_1f=_1b.datePattern||_1d["dateFormat-"+_1e],_20=_1b.timePattern||_1d["timeFormat-"+_1e],_21;
if(_1b.selector=="date"){
_21=_1f;
}else{
if(_1b.selector=="time"){
_21=_20;
}else{
_21=_1d["dateTimeFormat-"+_1e].replace(/\{(\d+)\}/g,function(_22,key){
return [_20,_1f][key];
});
}
}
var _23=[],re=_17(_21,dojo.hitch(this,_24,_23,_1d,_1b));
return {regexp:re,tokens:_23,bundle:_1d};
};
dojo.date.locale.parse=function(_25,_26){
var _27=/[\u200E\u200F\u202A\u202E]/g,_28=dojo.date.locale._parseInfo(_26),_29=_28.tokens,_2a=_28.bundle,re=new RegExp("^"+_28.regexp.replace(_27,"")+"$",_28.strict?"":"i"),_2b=re.exec(_25&&_25.replace(_27,""));
if(!_2b){
return null;
}
var _2c=["abbr","wide","narrow"],_2d=[1970,0,1,0,0,0,0],_2e="",_2f=dojo.every(_2b,function(v,i){
if(!i){
return true;
}
var _30=_29[i-1];
var l=_30.length;
switch(_30.charAt(0)){
case "y":
if(l!=2&&_26.strict){
_2d[0]=v;
}else{
if(v<100){
v=Number(v);
var _31=""+new Date().getFullYear(),_32=_31.substring(0,2)*100,_33=Math.min(Number(_31.substring(2,4))+20,99),num=(v<_33)?_32+v:_32-100+v;
_2d[0]=num;
}else{
if(_26.strict){
return false;
}
_2d[0]=v;
}
}
break;
case "M":
if(l>2){
var _34=_2a["months-format-"+_2c[l-3]].concat();
if(!_26.strict){
v=v.replace(".","").toLowerCase();
_34=dojo.map(_34,function(s){
return s.replace(".","").toLowerCase();
});
}
v=dojo.indexOf(_34,v);
if(v==-1){
return false;
}
}else{
v--;
}
_2d[1]=v;
break;
case "E":
case "e":
var _35=_2a["days-format-"+_2c[l-3]].concat();
if(!_26.strict){
v=v.toLowerCase();
_35=dojo.map(_35,function(d){
return d.toLowerCase();
});
}
v=dojo.indexOf(_35,v);
if(v==-1){
return false;
}
break;
case "D":
_2d[1]=0;
case "d":
_2d[2]=v;
break;
case "a":
var am=_26.am||_2a["dayPeriods-format-wide-am"],pm=_26.pm||_2a["dayPeriods-format-wide-pm"];
if(!_26.strict){
var _36=/\./g;
v=v.replace(_36,"").toLowerCase();
am=am.replace(_36,"").toLowerCase();
pm=pm.replace(_36,"").toLowerCase();
}
if(_26.strict&&v!=am&&v!=pm){
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
if(v>23){
return false;
}
_2d[3]=v;
break;
case "m":
_2d[4]=v;
break;
case "s":
_2d[5]=v;
break;
case "S":
_2d[6]=v;
}
return true;
});
var _37=+_2d[3];
if(_2e==="p"&&_37<12){
_2d[3]=_37+12;
}else{
if(_2e==="a"&&_37==12){
_2d[3]=0;
}
}
var _38=new Date(_2d[0],_2d[1],_2d[2],_2d[3],_2d[4],_2d[5],_2d[6]);
if(_26.strict){
_38.setFullYear(_2d[0]);
}
var _39=_29.join(""),_3a=_39.indexOf("d")!=-1,_3b=_39.indexOf("M")!=-1;
if(!_2f||(_3b&&_38.getMonth()>_2d[1])||(_3a&&_38.getDate()>_2d[2])){
return null;
}
if((_3b&&_38.getMonth()<_2d[1])||(_3a&&_38.getDate()<_2d[2])){
_38=dojo.date.add(_38,"hour",1);
}
return _38;
};
function _17(_3c,_3d,_3e,_3f){
var _40=function(x){
return x;
};
_3d=_3d||_40;
_3e=_3e||_40;
_3f=_3f||_40;
var _41=_3c.match(/(''|[^'])+/g),_42=_3c.charAt(0)=="'";
dojo.forEach(_41,function(_43,i){
if(!_43){
_41[i]="";
}else{
_41[i]=(_42?_3e:_3d)(_43.replace(/''/g,"'"));
_42=!_42;
}
});
return _3f(_41.join(""));
};
function _24(_44,_45,_46,_47){
_47=dojo.regexp.escapeString(_47);
if(!_46.strict){
_47=_47.replace(" a"," ?a");
}
return _47.replace(/([a-z])\1*/ig,function(_48){
var s,c=_48.charAt(0),l=_48.length,p2="",p3="";
if(_46.strict){
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
s="\\d{2,4}";
break;
case "M":
s=(l>2)?"\\S+?":"1[0-2]|"+p2+"[1-9]";
break;
case "D":
s="[12][0-9][0-9]|3[0-5][0-9]|36[0-6]|"+p3+"[1-9][0-9]|"+p2+"[1-9]";
break;
case "d":
s="3[01]|[12]\\d|"+p2+"[1-9]";
break;
case "w":
s="[1-4][0-9]|5[0-3]|"+p2+"[1-9]";
break;
case "E":
s="\\S+";
break;
case "h":
s="1[0-2]|"+p2+"[1-9]";
break;
case "k":
s="1[01]|"+p2+"\\d";
break;
case "H":
s="1\\d|2[0-3]|"+p2+"\\d";
break;
case "K":
s="1\\d|2[0-4]|"+p2+"[1-9]";
break;
case "m":
case "s":
s="[0-5]\\d";
break;
case "S":
s="\\d{"+l+"}";
break;
case "a":
var am=_46.am||_45["dayPeriods-format-wide-am"],pm=_46.pm||_45["dayPeriods-format-wide-pm"];
s=am+"|"+pm;
if(!_46.strict){
if(am!=am.toLowerCase()){
s+="|"+am.toLowerCase();
}
if(pm!=pm.toLowerCase()){
s+="|"+pm.toLowerCase();
}
if(s.indexOf(".")!=-1){
s+="|"+s.replace(/\./g,"");
}
}
s=s.replace(/\./g,"\\.");
break;
default:
s=".*";
}
if(_44){
_44.push(_48);
}
return "("+s+")";
}).replace(/[\xa0 ]/g,"[\\s\\xa0]");
};
})();
(function(){
var _49=[];
dojo.date.locale.addCustomFormats=function(_4a,_4b){
_49.push({pkg:_4a,name:_4b});
};
dojo.date.locale._getGregorianBundle=function(_4c){
var _4d={};
dojo.forEach(_49,function(_4e){
var _4f=dojo.i18n.getLocalization(_4e.pkg,_4e.name,_4c);
_4d=dojo.mixin(_4d,_4f);
},this);
return _4d;
};
})();
dojo.date.locale.addCustomFormats("dojo.cldr","gregorian");
dojo.date.locale.getNames=function(_50,_51,_52,_53){
var _54,_55=dojo.date.locale._getGregorianBundle(_53),_56=[_50,_52,_51];
if(_52=="standAlone"){
var key=_56.join("-");
_54=_55[key];
if(_54[0]==1){
_54=undefined;
}
}
_56[1]="format";
return (_54||_55[_56.join("-")]).concat();
};
dojo.date.locale.isWeekend=function(_57,_58){
var _59=dojo.cldr.supplemental.getWeekend(_58),day=(_57||new Date()).getDay();
if(_59.end<_59.start){
_59.end+=7;
if(day<_59.start){
day+=7;
}
}
return day>=_59.start&&day<=_59.end;
};
dojo.date.locale._getDayOfYear=function(_5a){
return dojo.date.difference(new Date(_5a.getFullYear(),0,1,_5a.getHours()),_5a)+1;
};
dojo.date.locale._getWeekOfYear=function(_5b,_5c){
if(arguments.length==1){
_5c=0;
}
var _5d=new Date(_5b.getFullYear(),0,1).getDay(),adj=(_5d-_5c+7)%7,_5e=Math.floor((dojo.date.locale._getDayOfYear(_5b)+adj-1)/7);
if(_5d==_5c){
_5e++;
}
return _5e;
};
}
