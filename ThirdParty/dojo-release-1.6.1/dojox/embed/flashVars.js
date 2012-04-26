/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.embed.flashVars"]){
dojo._hasResource["dojox.embed.flashVars"]=true;
dojo.provide("dojox.embed.flashVars");
dojo.mixin(dojox.embed.flashVars,{serialize:function(n,o){
var _1=function(_2){
if(typeof _2=="string"){
_2=_2.replace(/;/g,"_sc_");
_2=_2.replace(/\./g,"_pr_");
_2=_2.replace(/\:/g,"_cl_");
}
return _2;
};
var df=dojox.embed.flashVars.serialize;
var _3="";
if(dojo.isArray(o)){
for(var i=0;i<o.length;i++){
_3+=df(n+"."+i,_1(o[i]))+";";
}
return _3.replace(/;{2,}/g,";");
}else{
if(dojo.isObject(o)){
for(var nm in o){
_3+=df(n+"."+nm,_1(o[nm]))+";";
}
return _3.replace(/;{2,}/g,";");
}
}
return n+":"+o;
}});
}
