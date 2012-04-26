/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.cache"]){
dojo._hasResource["dojo.cache"]=true;
dojo.provide("dojo.cache");
var cache={};
dojo.cache=function(_1,_2,_3){
if(typeof _1=="string"){
var _4=dojo.moduleUrl(_1,_2);
}else{
_4=_1;
_3=_2;
}
var _5=_4.toString();
var _6=_3;
if(_3!=undefined&&!dojo.isString(_3)){
_6=("value" in _3?_3.value:undefined);
}
var _7=_3&&_3.sanitize?true:false;
if(typeof _6=="string"){
_6=cache[_5]=_7?dojo.cache._sanitize(_6):_6;
}else{
if(_6===null){
delete cache[_5];
}else{
if(!(_5 in cache)){
_6=dojo._getText(_5);
cache[_5]=_7?dojo.cache._sanitize(_6):_6;
}
_6=cache[_5];
}
}
return _6;
};
dojo.cache._sanitize=function(_8){
if(_8){
_8=_8.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,"");
var _9=_8.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
if(_9){
_8=_9[1];
}
}else{
_8="";
}
return _8;
};
}
