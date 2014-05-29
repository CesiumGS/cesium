/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/registry",["require","../_base/array","./default!platform","./util"],function(_1,_2,_3,_4){
var _5=[];
function _6(_7,_8){
var _9=_5.slice(0),i=0,_a;
while(_a=_9[i++]){
if(_a(_7,_8)){
return _a.request.call(null,_7,_8);
}
}
return _3.apply(null,arguments);
};
function _b(_c,_d){
var _e;
if(_d){
if(_c.test){
_e=function(_f){
return _c.test(_f);
};
}else{
if(_c.apply&&_c.call){
_e=function(){
return _c.apply(null,arguments);
};
}else{
_e=function(url){
return url===_c;
};
}
}
_e.request=_d;
}else{
_e=function(){
return true;
};
_e.request=_c;
}
return _e;
};
_6.register=function(url,_10,_11){
var _12=_b(url,_10);
_5[(_11?"unshift":"push")](_12);
return {remove:function(){
var idx;
if(~(idx=_2.indexOf(_5,_12))){
_5.splice(idx,1);
}
}};
};
_6.load=function(id,_13,_14,_15){
if(id){
_1([id],function(_16){
_3=_16;
_14(_6);
});
}else{
_14(_6);
}
};
_4.addCommonMethods(_6);
return _6;
});
