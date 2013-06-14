/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/number",["./_base/lang","./i18n","./i18n!./cldr/nls/number","./string","./regexp"],function(_1,_2,_3,_4,_5){
var _6={};
_1.setObject("dojo.number",_6);
_6.format=function(_7,_8){
_8=_1.mixin({},_8||{});
var _9=_2.normalizeLocale(_8.locale),_a=_2.getLocalization("dojo.cldr","number",_9);
_8.customs=_a;
var _b=_8.pattern||_a[(_8.type||"decimal")+"Format"];
if(isNaN(_7)||Math.abs(_7)==Infinity){
return null;
}
return _6._applyPattern(_7,_b,_8);
};
_6._numberPatternRE=/[#0,]*[#0](?:\.0*#*)?/;
_6._applyPattern=function(_c,_d,_e){
_e=_e||{};
var _f=_e.customs.group,_10=_e.customs.decimal,_11=_d.split(";"),_12=_11[0];
_d=_11[(_c<0)?1:0]||("-"+_12);
if(_d.indexOf("%")!=-1){
_c*=100;
}else{
if(_d.indexOf("‰")!=-1){
_c*=1000;
}else{
if(_d.indexOf("¤")!=-1){
_f=_e.customs.currencyGroup||_f;
_10=_e.customs.currencyDecimal||_10;
_d=_d.replace(/\u00a4{1,3}/,function(_13){
var _14=["symbol","currency","displayName"][_13.length-1];
return _e[_14]||_e.currency||"";
});
}else{
if(_d.indexOf("E")!=-1){
throw new Error("exponential notation not supported");
}
}
}
}
var _15=_6._numberPatternRE;
var _16=_12.match(_15);
if(!_16){
throw new Error("unable to find a number expression in pattern: "+_d);
}
if(_e.fractional===false){
_e.places=0;
}
return _d.replace(_15,_6._formatAbsolute(_c,_16[0],{decimal:_10,group:_f,places:_e.places,round:_e.round}));
};
_6.round=function(_17,_18,_19){
var _1a=10/(_19||10);
return (_1a*+_17).toFixed(_18)/_1a;
};
if((0.9).toFixed()==0){
var _1b=_6.round;
_6.round=function(v,p,m){
var d=Math.pow(10,-p||0),a=Math.abs(v);
if(!v||a>=d){
d=0;
}else{
a/=d;
if(a<0.5||a>=0.95){
d=0;
}
}
return _1b(v,p,m)+(v>0?d:-d);
};
}
_6._formatAbsolute=function(_1c,_1d,_1e){
_1e=_1e||{};
if(_1e.places===true){
_1e.places=0;
}
if(_1e.places===Infinity){
_1e.places=6;
}
var _1f=_1d.split("."),_20=typeof _1e.places=="string"&&_1e.places.indexOf(","),_21=_1e.places;
if(_20){
_21=_1e.places.substring(_20+1);
}else{
if(!(_21>=0)){
_21=(_1f[1]||[]).length;
}
}
if(!(_1e.round<0)){
_1c=_6.round(_1c,_21,_1e.round);
}
var _22=String(Math.abs(_1c)).split("."),_23=_22[1]||"";
if(_1f[1]||_1e.places){
if(_20){
_1e.places=_1e.places.substring(0,_20);
}
var pad=_1e.places!==undefined?_1e.places:(_1f[1]&&_1f[1].lastIndexOf("0")+1);
if(pad>_23.length){
_22[1]=_4.pad(_23,pad,"0",true);
}
if(_21<_23.length){
_22[1]=_23.substr(0,_21);
}
}else{
if(_22[1]){
_22.pop();
}
}
var _24=_1f[0].replace(",","");
pad=_24.indexOf("0");
if(pad!=-1){
pad=_24.length-pad;
if(pad>_22[0].length){
_22[0]=_4.pad(_22[0],pad);
}
if(_24.indexOf("#")==-1){
_22[0]=_22[0].substr(_22[0].length-pad);
}
}
var _25=_1f[0].lastIndexOf(","),_26,_27;
if(_25!=-1){
_26=_1f[0].length-_25-1;
var _28=_1f[0].substr(0,_25);
_25=_28.lastIndexOf(",");
if(_25!=-1){
_27=_28.length-_25-1;
}
}
var _29=[];
for(var _2a=_22[0];_2a;){
var off=_2a.length-_26;
_29.push((off>0)?_2a.substr(off):_2a);
_2a=(off>0)?_2a.slice(0,off):"";
if(_27){
_26=_27;
delete _27;
}
}
_22[0]=_29.reverse().join(_1e.group||",");
return _22.join(_1e.decimal||".");
};
_6.regexp=function(_2b){
return _6._parseInfo(_2b).regexp;
};
_6._parseInfo=function(_2c){
_2c=_2c||{};
var _2d=_2.normalizeLocale(_2c.locale),_2e=_2.getLocalization("dojo.cldr","number",_2d),_2f=_2c.pattern||_2e[(_2c.type||"decimal")+"Format"],_30=_2e.group,_31=_2e.decimal,_32=1;
if(_2f.indexOf("%")!=-1){
_32/=100;
}else{
if(_2f.indexOf("‰")!=-1){
_32/=1000;
}else{
var _33=_2f.indexOf("¤")!=-1;
if(_33){
_30=_2e.currencyGroup||_30;
_31=_2e.currencyDecimal||_31;
}
}
}
var _34=_2f.split(";");
if(_34.length==1){
_34.push("-"+_34[0]);
}
var re=_5.buildGroupRE(_34,function(_35){
_35="(?:"+_5.escapeString(_35,".")+")";
return _35.replace(_6._numberPatternRE,function(_36){
var _37={signed:false,separator:_2c.strict?_30:[_30,""],fractional:_2c.fractional,decimal:_31,exponent:false},_38=_36.split("."),_39=_2c.places;
if(_38.length==1&&_32!=1){
_38[1]="###";
}
if(_38.length==1||_39===0){
_37.fractional=false;
}else{
if(_39===undefined){
_39=_2c.pattern?_38[1].lastIndexOf("0")+1:Infinity;
}
if(_39&&_2c.fractional==undefined){
_37.fractional=true;
}
if(!_2c.places&&(_39<_38[1].length)){
_39+=","+_38[1].length;
}
_37.places=_39;
}
var _3a=_38[0].split(",");
if(_3a.length>1){
_37.groupSize=_3a.pop().length;
if(_3a.length>1){
_37.groupSize2=_3a.pop().length;
}
}
return "("+_6._realNumberRegexp(_37)+")";
});
},true);
if(_33){
re=re.replace(/([\s\xa0]*)(\u00a4{1,3})([\s\xa0]*)/g,function(_3b,_3c,_3d,_3e){
var _3f=["symbol","currency","displayName"][_3d.length-1],_40=_5.escapeString(_2c[_3f]||_2c.currency||"");
_3c=_3c?"[\\s\\xa0]":"";
_3e=_3e?"[\\s\\xa0]":"";
if(!_2c.strict){
if(_3c){
_3c+="*";
}
if(_3e){
_3e+="*";
}
return "(?:"+_3c+_40+_3e+")?";
}
return _3c+_40+_3e;
});
}
return {regexp:re.replace(/[\xa0 ]/g,"[\\s\\xa0]"),group:_30,decimal:_31,factor:_32};
};
_6.parse=function(_41,_42){
var _43=_6._parseInfo(_42),_44=(new RegExp("^"+_43.regexp+"$")).exec(_41);
if(!_44){
return NaN;
}
var _45=_44[1];
if(!_44[1]){
if(!_44[2]){
return NaN;
}
_45=_44[2];
_43.factor*=-1;
}
_45=_45.replace(new RegExp("["+_43.group+"\\s\\xa0"+"]","g"),"").replace(_43.decimal,".");
return _45*_43.factor;
};
_6._realNumberRegexp=function(_46){
_46=_46||{};
if(!("places" in _46)){
_46.places=Infinity;
}
if(typeof _46.decimal!="string"){
_46.decimal=".";
}
if(!("fractional" in _46)||/^0/.test(_46.places)){
_46.fractional=[true,false];
}
if(!("exponent" in _46)){
_46.exponent=[true,false];
}
if(!("eSigned" in _46)){
_46.eSigned=[true,false];
}
var _47=_6._integerRegexp(_46),_48=_5.buildGroupRE(_46.fractional,function(q){
var re="";
if(q&&(_46.places!==0)){
re="\\"+_46.decimal;
if(_46.places==Infinity){
re="(?:"+re+"\\d+)?";
}else{
re+="\\d{"+_46.places+"}";
}
}
return re;
},true);
var _49=_5.buildGroupRE(_46.exponent,function(q){
if(q){
return "([eE]"+_6._integerRegexp({signed:_46.eSigned})+")";
}
return "";
});
var _4a=_47+_48;
if(_48){
_4a="(?:(?:"+_4a+")|(?:"+_48+"))";
}
return _4a+_49;
};
_6._integerRegexp=function(_4b){
_4b=_4b||{};
if(!("signed" in _4b)){
_4b.signed=[true,false];
}
if(!("separator" in _4b)){
_4b.separator="";
}else{
if(!("groupSize" in _4b)){
_4b.groupSize=3;
}
}
var _4c=_5.buildGroupRE(_4b.signed,function(q){
return q?"[-+]":"";
},true);
var _4d=_5.buildGroupRE(_4b.separator,function(sep){
if(!sep){
return "(?:\\d+)";
}
sep=_5.escapeString(sep);
if(sep==" "){
sep="\\s";
}else{
if(sep==" "){
sep="\\s\\xa0";
}
}
var grp=_4b.groupSize,_4e=_4b.groupSize2;
if(_4e){
var _4f="(?:0|[1-9]\\d{0,"+(_4e-1)+"}(?:["+sep+"]\\d{"+_4e+"})*["+sep+"]\\d{"+grp+"})";
return ((grp-_4e)>0)?"(?:"+_4f+"|(?:0|[1-9]\\d{0,"+(grp-1)+"}))":_4f;
}
return "(?:0|[1-9]\\d{0,"+(grp-1)+"}(?:["+sep+"]\\d{"+grp+"})*)";
},true);
return _4c+_4d;
};
return _6;
});
