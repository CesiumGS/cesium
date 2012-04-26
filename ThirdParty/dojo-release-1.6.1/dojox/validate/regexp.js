/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.validate.regexp"]){
dojo._hasResource["dojox.validate.regexp"]=true;
dojo.provide("dojox.validate.regexp");
dojo.require("dojo.regexp");
dojo.mixin(dojox.validate.regexp,{ipAddress:function(_1){
_1=(typeof _1=="object")?_1:{};
if(typeof _1.allowDottedDecimal!="boolean"){
_1.allowDottedDecimal=true;
}
if(typeof _1.allowDottedHex!="boolean"){
_1.allowDottedHex=true;
}
if(typeof _1.allowDottedOctal!="boolean"){
_1.allowDottedOctal=true;
}
if(typeof _1.allowDecimal!="boolean"){
_1.allowDecimal=true;
}
if(typeof _1.allowHex!="boolean"){
_1.allowHex=true;
}
if(typeof _1.allowIPv6!="boolean"){
_1.allowIPv6=true;
}
if(typeof _1.allowHybrid!="boolean"){
_1.allowHybrid=true;
}
var _2="((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])";
var _3="(0[xX]0*[\\da-fA-F]?[\\da-fA-F]\\.){3}0[xX]0*[\\da-fA-F]?[\\da-fA-F]";
var _4="(0+[0-3][0-7][0-7]\\.){3}0+[0-3][0-7][0-7]";
var _5="(0|[1-9]\\d{0,8}|[1-3]\\d{9}|4[01]\\d{8}|42[0-8]\\d{7}|429[0-3]\\d{6}|"+"4294[0-8]\\d{5}|42949[0-5]\\d{4}|429496[0-6]\\d{3}|4294967[01]\\d{2}|42949672[0-8]\\d|429496729[0-5])";
var _6="0[xX]0*[\\da-fA-F]{1,8}";
var _7="([\\da-fA-F]{1,4}\\:){7}[\\da-fA-F]{1,4}";
var _8="([\\da-fA-F]{1,4}\\:){6}"+"((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])";
var a=[];
if(_1.allowDottedDecimal){
a.push(_2);
}
if(_1.allowDottedHex){
a.push(_3);
}
if(_1.allowDottedOctal){
a.push(_4);
}
if(_1.allowDecimal){
a.push(_5);
}
if(_1.allowHex){
a.push(_6);
}
if(_1.allowIPv6){
a.push(_7);
}
if(_1.allowHybrid){
a.push(_8);
}
var _9="";
if(a.length>0){
_9="("+a.join("|")+")";
}
return _9;
},host:function(_a){
_a=(typeof _a=="object")?_a:{};
if(typeof _a.allowIP!="boolean"){
_a.allowIP=true;
}
if(typeof _a.allowLocal!="boolean"){
_a.allowLocal=false;
}
if(typeof _a.allowPort!="boolean"){
_a.allowPort=true;
}
if(typeof _a.allowNamed!="boolean"){
_a.allowNamed=false;
}
var _b="(?:[\\da-zA-Z](?:[-\\da-zA-Z]{0,61}[\\da-zA-Z])?)";
var _c="(?:[a-zA-Z](?:[-\\da-zA-Z]{0,6}[\\da-zA-Z])?)";
var _d=_a.allowPort?"(\\:\\d+)?":"";
var _e="((?:"+_b+"\\.)+"+_c+"\\.?)";
if(_a.allowIP){
_e+="|"+dojox.validate.regexp.ipAddress(_a);
}
if(_a.allowLocal){
_e+="|localhost";
}
if(_a.allowNamed){
_e+="|^[^-][a-zA-Z0-9_-]*";
}
return "("+_e+")"+_d;
},url:function(_f){
_f=(typeof _f=="object")?_f:{};
if(!("scheme" in _f)){
_f.scheme=[true,false];
}
var _10=dojo.regexp.buildGroupRE(_f.scheme,function(q){
if(q){
return "(https?|ftps?)\\://";
}
return "";
});
var _11="(/(?:[^?#\\s/]+/)*(?:[^?#\\s/]+(?:\\?[^?#\\s/]*)?(?:#[A-Za-z][\\w.:-]*)?)?)?";
return _10+dojox.validate.regexp.host(_f)+_11;
},emailAddress:function(_12){
_12=(typeof _12=="object")?_12:{};
if(typeof _12.allowCruft!="boolean"){
_12.allowCruft=false;
}
_12.allowPort=false;
var _13="([!#-'*+\\-\\/-9=?A-Z^-~]+[.])*[!#-'*+\\-\\/-9=?A-Z^-~]+";
var _14=_13+"@"+dojox.validate.regexp.host(_12);
if(_12.allowCruft){
_14="<?(mailto\\:)?"+_14+">?";
}
return _14;
},emailAddressList:function(_15){
_15=(typeof _15=="object")?_15:{};
if(typeof _15.listSeparator!="string"){
_15.listSeparator="\\s;,";
}
var _16=dojox.validate.regexp.emailAddress(_15);
var _17="("+_16+"\\s*["+_15.listSeparator+"]\\s*)*"+_16+"\\s*["+_15.listSeparator+"]?\\s*";
return _17;
},numberFormat:function(_18){
_18=(typeof _18=="object")?_18:{};
if(typeof _18.format=="undefined"){
_18.format="###-###-####";
}
var _19=function(_1a){
return dojo.regexp.escapeString(_1a,"?").replace(/\?/g,"\\d?").replace(/#/g,"\\d");
};
return dojo.regexp.buildGroupRE(_18.format,_19);
}});
dojox.validate.regexp.ca={postalCode:function(){
return "([A-Z][0-9][A-Z] [0-9][A-Z][0-9])";
},province:function(){
return "(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)";
}};
dojox.validate.regexp.us={state:function(_1b){
_1b=(typeof _1b=="object")?_1b:{};
if(typeof _1b.allowTerritories!="boolean"){
_1b.allowTerritories=true;
}
if(typeof _1b.allowMilitary!="boolean"){
_1b.allowMilitary=true;
}
var _1c="AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|"+"NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY";
var _1d="AS|FM|GU|MH|MP|PW|PR|VI";
var _1e="AA|AE|AP";
if(_1b.allowTerritories){
_1c+="|"+_1d;
}
if(_1b.allowMilitary){
_1c+="|"+_1e;
}
return "("+_1c+")";
}};
}
