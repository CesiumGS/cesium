/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.aspect.memoizer"]){
dojo._hasResource["dojox.lang.aspect.memoizer"]=true;
dojo.provide("dojox.lang.aspect.memoizer");
(function(){
var _1=dojox.lang.aspect;
var _2={around:function(_3){
var _4=_1.getContext(),_5=_4.joinPoint,_6=_4.instance,t,u,_7;
if((t=_6.__memoizerCache)&&(t=t[_5.targetName])&&(_3 in t)){
return t[_3];
}
var _7=_1.proceed.apply(null,arguments);
if(!(t=_6.__memoizerCache)){
t=_6.__memoizerCache={};
}
if(!(u=t[_5.targetName])){
u=t[_5.targetName]={};
}
return u[_3]=_7;
}};
var _8=function(_9){
return {around:function(){
var _a=_1.getContext(),_b=_a.joinPoint,_c=_a.instance,t,u,_d,_e=_9.apply(_c,arguments);
if((t=_c.__memoizerCache)&&(t=t[_b.targetName])&&(_e in t)){
return t[_e];
}
var _d=_1.proceed.apply(null,arguments);
if(!(t=_c.__memoizerCache)){
t=_c.__memoizerCache={};
}
if(!(u=t[_b.targetName])){
u=t[_b.targetName]={};
}
return u[_e]=_d;
}};
};
_1.memoizer=function(_f){
return arguments.length==0?_2:_8(_f);
};
})();
}
