/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.store.util.SimpleQueryEngine"]){
dojo._hasResource["dojo.store.util.SimpleQueryEngine"]=true;
dojo.provide("dojo.store.util.SimpleQueryEngine");
dojo.getObject("store.util",true,dojo);
dojo.store.util.SimpleQueryEngine=function(_1,_2){
switch(typeof _1){
default:
throw new Error("Can not query with a "+typeof _1);
case "object":
case "undefined":
var _3=_1;
_1=function(_4){
for(var _5 in _3){
var _6=_3[_5];
if(_6&&_6.test){
if(!_6.test(_4[_5])){
return false;
}
}else{
if(_6!=_4[_5]){
return false;
}
}
}
return true;
};
break;
case "string":
if(!this[_1]){
throw new Error("No filter function "+_1+" was found in store");
}
_1=this[_1];
case "function":
}
function _7(_8){
var _9=dojo.filter(_8,_1);
if(_2&&_2.sort){
_9.sort(function(a,b){
for(var _a,i=0;_a=_2.sort[i];i++){
var _b=a[_a.attribute];
var _c=b[_a.attribute];
if(_b!=_c){
return !!_a.descending==_b>_c?-1:1;
}
}
return 0;
});
}
if(_2&&(_2.start||_2.count)){
var _d=_9.length;
_9=_9.slice(_2.start||0,(_2.start||0)+(_2.count||Infinity));
_9.total=_d;
}
return _9;
};
_7.matches=_1;
return _7;
};
}
