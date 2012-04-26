/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.aspect.memoizerGuard"]){
dojo._hasResource["dojox.lang.aspect.memoizerGuard"]=true;
dojo.provide("dojox.lang.aspect.memoizerGuard");
(function(){
var _1=dojox.lang.aspect,_2=function(_3){
var _4=_1.getContext().instance,t;
if(!(t=_4.__memoizerCache)){
return;
}
if(arguments.length==0){
delete _4.__memoizerCache;
}else{
if(dojo.isArray(_3)){
dojo.forEach(_3,function(m){
delete t[m];
});
}else{
delete t[_3];
}
}
};
_1.memoizerGuard=function(_5){
return {after:function(){
_2(_5);
}};
};
})();
}
