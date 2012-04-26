/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.currency"]){
dojo._hasResource["dojo.currency"]=true;
dojo.provide("dojo.currency");
dojo.require("dojo.number");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojo.cldr","currency",null,"ROOT,ar,ca,cs,da,de,el,en,en-au,en-ca,es,fi,fr,he,hu,it,ja,ko,nb,nl,pl,pt,ro,ru,sk,sl,sv,th,tr,zh,zh-hant,zh-hk,zh-tw");
dojo.require("dojo.cldr.monetary");
dojo.getObject("currency",true,dojo);
dojo.currency._mixInDefaults=function(_1){
_1=_1||{};
_1.type="currency";
var _2=dojo.i18n.getLocalization("dojo.cldr","currency",_1.locale)||{};
var _3=_1.currency;
var _4=dojo.cldr.monetary.getData(_3);
dojo.forEach(["displayName","symbol","group","decimal"],function(_5){
_4[_5]=_2[_3+"_"+_5];
});
_4.fractional=[true,false];
return dojo.mixin(_4,_1);
};
dojo.currency.format=function(_6,_7){
return dojo.number.format(_6,dojo.currency._mixInDefaults(_7));
};
dojo.currency.regexp=function(_8){
return dojo.number.regexp(dojo.currency._mixInDefaults(_8));
};
dojo.currency.parse=function(_9,_a){
return dojo.number.parse(_9,dojo.currency._mixInDefaults(_a));
};
}
