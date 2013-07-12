/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/currency",["./_base/array","./_base/lang","./number","./i18n","./i18n!./cldr/nls/currency","./cldr/monetary"],function(_1,_2,_3,_4,_5,_6){
var _7={};
_2.setObject("dojo.currency",_7);
_7._mixInDefaults=function(_8){
_8=_8||{};
_8.type="currency";
var _9=_4.getLocalization("dojo.cldr","currency",_8.locale)||{};
var _a=_8.currency;
var _b=_6.getData(_a);
_1.forEach(["displayName","symbol","group","decimal"],function(_c){
_b[_c]=_9[_a+"_"+_c];
});
_b.fractional=[true,false];
return _2.mixin(_b,_8);
};
_7.format=function(_d,_e){
return _3.format(_d,_7._mixInDefaults(_e));
};
_7.regexp=function(_f){
return _3.regexp(_7._mixInDefaults(_f));
};
_7.parse=function(_10,_11){
return _3.parse(_10,_7._mixInDefaults(_11));
};
return _7;
});
