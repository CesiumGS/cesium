/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/store/util/SimpleQueryEngine",["../../_base/array"],function(_1){
return function(_2,_3){
switch(typeof _2){
default:
throw new Error("Can not query with a "+typeof _2);
case "object":
case "undefined":
var _4=_2;
_2=function(_5){
for(var _6 in _4){
var _7=_4[_6];
if(_7&&_7.test){
if(!_7.test(_5[_6],_5)){
return false;
}
}else{
if(_7!=_5[_6]){
return false;
}
}
}
return true;
};
break;
case "string":
if(!this[_2]){
throw new Error("No filter function "+_2+" was found in store");
}
_2=this[_2];
case "function":
}
function _8(_9){
var _a=_1.filter(_9,_2);
var _b=_3&&_3.sort;
if(_b){
_a.sort(typeof _b=="function"?_b:function(a,b){
for(var _c,i=0;_c=_b[i];i++){
var _d=a[_c.attribute];
var _e=b[_c.attribute];
_d=_d!=null?_d.valueOf():_d;
_e=_e!=null?_e.valueOf():_e;
if(_d!=_e){
return !!_c.descending==(_d==null||_d>_e)?-1:1;
}
}
return 0;
});
}
if(_3&&(_3.start||_3.count)){
var _f=_a.length;
_a=_a.slice(_3.start||0,(_3.start||0)+(_3.count||Infinity));
_a.total=_f;
}
return _a;
};
_8.matches=_2;
return _8;
};
});
