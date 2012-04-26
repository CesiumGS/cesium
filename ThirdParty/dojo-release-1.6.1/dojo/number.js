/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.number"]){
dojo._hasResource["dojo.number"]=true;
dojo.provide("dojo.number");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojo.cldr","number",null,"ROOT,ar,ca,cs,da,de,el,en,en-au,en-gb,es,fi,fr,fr-ch,he,hu,it,ja,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-hant,zh-hk");
dojo.require("dojo.string");
dojo.require("dojo.regexp");
dojo.getObject("number",true,dojo);
dojo.number.format=function(_1,_2){
_2=dojo.mixin({},_2||{});
var _3=dojo.i18n.normalizeLocale(_2.locale),_4=dojo.i18n.getLocalization("dojo.cldr","number",_3);
_2.customs=_4;
var _5=_2.pattern||_4[(_2.type||"decimal")+"Format"];
if(isNaN(_1)||Math.abs(_1)==Infinity){
return null;
}
return dojo.number._applyPattern(_1,_5,_2);
};
dojo.number._numberPatternRE=/[#0,]*[#0](?:\.0*#*)?/;
dojo.number._applyPattern=function(_6,_7,_8){
_8=_8||{};
var _9=_8.customs.group,_a=_8.customs.decimal,_b=_7.split(";"),_c=_b[0];
_7=_b[(_6<0)?1:0]||("-"+_c);
if(_7.indexOf("%")!=-1){
_6*=100;
}else{
if(_7.indexOf("‰")!=-1){
_6*=1000;
}else{
if(_7.indexOf("¤")!=-1){
_9=_8.customs.currencyGroup||_9;
_a=_8.customs.currencyDecimal||_a;
_7=_7.replace(/\u00a4{1,3}/,function(_d){
var _e=["symbol","currency","displayName"][_d.length-1];
return _8[_e]||_8.currency||"";
});
}else{
if(_7.indexOf("E")!=-1){
throw new Error("exponential notation not supported");
}
}
}
}
var _f=dojo.number._numberPatternRE;
var _10=_c.match(_f);
if(!_10){
throw new Error("unable to find a number expression in pattern: "+_7);
}
if(_8.fractional===false){
_8.places=0;
}
return _7.replace(_f,dojo.number._formatAbsolute(_6,_10[0],{decimal:_a,group:_9,places:_8.places,round:_8.round}));
};
dojo.number.round=function(_11,_12,_13){
var _14=10/(_13||10);
return (_14*+_11).toFixed(_12)/_14;
};
if((0.9).toFixed()==0){
(function(){
var _15=dojo.number.round;
dojo.number.round=function(v,p,m){
var d=Math.pow(10,-p||0),a=Math.abs(v);
if(!v||a>=d||a*Math.pow(10,p+1)<5){
d=0;
}
return _15(v,p,m)+(v>0?d:-d);
};
})();
}
dojo.number._formatAbsolute=function(_16,_17,_18){
_18=_18||{};
if(_18.places===true){
_18.places=0;
}
if(_18.places===Infinity){
_18.places=6;
}
var _19=_17.split("."),_1a=typeof _18.places=="string"&&_18.places.indexOf(","),_1b=_18.places;
if(_1a){
_1b=_18.places.substring(_1a+1);
}else{
if(!(_1b>=0)){
_1b=(_19[1]||[]).length;
}
}
if(!(_18.round<0)){
_16=dojo.number.round(_16,_1b,_18.round);
}
var _1c=String(Math.abs(_16)).split("."),_1d=_1c[1]||"";
if(_19[1]||_18.places){
if(_1a){
_18.places=_18.places.substring(0,_1a);
}
var pad=_18.places!==undefined?_18.places:(_19[1]&&_19[1].lastIndexOf("0")+1);
if(pad>_1d.length){
_1c[1]=dojo.string.pad(_1d,pad,"0",true);
}
if(_1b<_1d.length){
_1c[1]=_1d.substr(0,_1b);
}
}else{
if(_1c[1]){
_1c.pop();
}
}
var _1e=_19[0].replace(",","");
pad=_1e.indexOf("0");
if(pad!=-1){
pad=_1e.length-pad;
if(pad>_1c[0].length){
_1c[0]=dojo.string.pad(_1c[0],pad);
}
if(_1e.indexOf("#")==-1){
_1c[0]=_1c[0].substr(_1c[0].length-pad);
}
}
var _1f=_19[0].lastIndexOf(","),_20,_21;
if(_1f!=-1){
_20=_19[0].length-_1f-1;
var _22=_19[0].substr(0,_1f);
_1f=_22.lastIndexOf(",");
if(_1f!=-1){
_21=_22.length-_1f-1;
}
}
var _23=[];
for(var _24=_1c[0];_24;){
var off=_24.length-_20;
_23.push((off>0)?_24.substr(off):_24);
_24=(off>0)?_24.slice(0,off):"";
if(_21){
_20=_21;
delete _21;
}
}
_1c[0]=_23.reverse().join(_18.group||",");
return _1c.join(_18.decimal||".");
};
dojo.number.regexp=function(_25){
return dojo.number._parseInfo(_25).regexp;
};
dojo.number._parseInfo=function(_26){
_26=_26||{};
var _27=dojo.i18n.normalizeLocale(_26.locale),_28=dojo.i18n.getLocalization("dojo.cldr","number",_27),_29=_26.pattern||_28[(_26.type||"decimal")+"Format"],_2a=_28.group,_2b=_28.decimal,_2c=1;
if(_29.indexOf("%")!=-1){
_2c/=100;
}else{
if(_29.indexOf("‰")!=-1){
_2c/=1000;
}else{
var _2d=_29.indexOf("¤")!=-1;
if(_2d){
_2a=_28.currencyGroup||_2a;
_2b=_28.currencyDecimal||_2b;
}
}
}
var _2e=_29.split(";");
if(_2e.length==1){
_2e.push("-"+_2e[0]);
}
var re=dojo.regexp.buildGroupRE(_2e,function(_2f){
_2f="(?:"+dojo.regexp.escapeString(_2f,".")+")";
return _2f.replace(dojo.number._numberPatternRE,function(_30){
var _31={signed:false,separator:_26.strict?_2a:[_2a,""],fractional:_26.fractional,decimal:_2b,exponent:false},_32=_30.split("."),_33=_26.places;
if(_32.length==1&&_2c!=1){
_32[1]="###";
}
if(_32.length==1||_33===0){
_31.fractional=false;
}else{
if(_33===undefined){
_33=_26.pattern?_32[1].lastIndexOf("0")+1:Infinity;
}
if(_33&&_26.fractional==undefined){
_31.fractional=true;
}
if(!_26.places&&(_33<_32[1].length)){
_33+=","+_32[1].length;
}
_31.places=_33;
}
var _34=_32[0].split(",");
if(_34.length>1){
_31.groupSize=_34.pop().length;
if(_34.length>1){
_31.groupSize2=_34.pop().length;
}
}
return "("+dojo.number._realNumberRegexp(_31)+")";
});
},true);
if(_2d){
re=re.replace(/([\s\xa0]*)(\u00a4{1,3})([\s\xa0]*)/g,function(_35,_36,_37,_38){
var _39=["symbol","currency","displayName"][_37.length-1],_3a=dojo.regexp.escapeString(_26[_39]||_26.currency||"");
_36=_36?"[\\s\\xa0]":"";
_38=_38?"[\\s\\xa0]":"";
if(!_26.strict){
if(_36){
_36+="*";
}
if(_38){
_38+="*";
}
return "(?:"+_36+_3a+_38+")?";
}
return _36+_3a+_38;
});
}
return {regexp:re.replace(/[\xa0 ]/g,"[\\s\\xa0]"),group:_2a,decimal:_2b,factor:_2c};
};
dojo.number.parse=function(_3b,_3c){
var _3d=dojo.number._parseInfo(_3c),_3e=(new RegExp("^"+_3d.regexp+"$")).exec(_3b);
if(!_3e){
return NaN;
}
var _3f=_3e[1];
if(!_3e[1]){
if(!_3e[2]){
return NaN;
}
_3f=_3e[2];
_3d.factor*=-1;
}
_3f=_3f.replace(new RegExp("["+_3d.group+"\\s\\xa0"+"]","g"),"").replace(_3d.decimal,".");
return _3f*_3d.factor;
};
dojo.number._realNumberRegexp=function(_40){
_40=_40||{};
if(!("places" in _40)){
_40.places=Infinity;
}
if(typeof _40.decimal!="string"){
_40.decimal=".";
}
if(!("fractional" in _40)||/^0/.test(_40.places)){
_40.fractional=[true,false];
}
if(!("exponent" in _40)){
_40.exponent=[true,false];
}
if(!("eSigned" in _40)){
_40.eSigned=[true,false];
}
var _41=dojo.number._integerRegexp(_40),_42=dojo.regexp.buildGroupRE(_40.fractional,function(q){
var re="";
if(q&&(_40.places!==0)){
re="\\"+_40.decimal;
if(_40.places==Infinity){
re="(?:"+re+"\\d+)?";
}else{
re+="\\d{"+_40.places+"}";
}
}
return re;
},true);
var _43=dojo.regexp.buildGroupRE(_40.exponent,function(q){
if(q){
return "([eE]"+dojo.number._integerRegexp({signed:_40.eSigned})+")";
}
return "";
});
var _44=_41+_42;
if(_42){
_44="(?:(?:"+_44+")|(?:"+_42+"))";
}
return _44+_43;
};
dojo.number._integerRegexp=function(_45){
_45=_45||{};
if(!("signed" in _45)){
_45.signed=[true,false];
}
if(!("separator" in _45)){
_45.separator="";
}else{
if(!("groupSize" in _45)){
_45.groupSize=3;
}
}
var _46=dojo.regexp.buildGroupRE(_45.signed,function(q){
return q?"[-+]":"";
},true);
var _47=dojo.regexp.buildGroupRE(_45.separator,function(sep){
if(!sep){
return "(?:\\d+)";
}
sep=dojo.regexp.escapeString(sep);
if(sep==" "){
sep="\\s";
}else{
if(sep==" "){
sep="\\s\\xa0";
}
}
var grp=_45.groupSize,_48=_45.groupSize2;
if(_48){
var _49="(?:0|[1-9]\\d{0,"+(_48-1)+"}(?:["+sep+"]\\d{"+_48+"})*["+sep+"]\\d{"+grp+"})";
return ((grp-_48)>0)?"(?:"+_49+"|(?:0|[1-9]\\d{0,"+(grp-1)+"}))":_49;
}
return "(?:0|[1-9]\\d{0,"+(grp-1)+"}(?:["+sep+"]\\d{"+grp+"})*)";
},true);
return _46+_47;
};
}
