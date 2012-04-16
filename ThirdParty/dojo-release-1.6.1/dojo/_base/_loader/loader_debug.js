/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base._loader.loader_debug"]){
dojo._hasResource["dojo._base._loader.loader_debug"]=true;
dojo.provide("dojo._base._loader.loader_debug");
dojo.nonDebugProvide=dojo.provide;
dojo.provide=function(_1){
var _2=dojo["_xdDebugQueue"];
if(_2&&_2.length>0&&_1==_2["currentResourceName"]){
if(dojo.isAIR){
window.setTimeout(function(){
dojo._xdDebugFileLoaded(_1);
},1);
}else{
window.setTimeout(dojo._scopeName+"._xdDebugFileLoaded('"+_1+"')",1);
}
}
return dojo.nonDebugProvide.apply(dojo,arguments);
};
dojo._xdDebugFileLoaded=function(_3){
if(!dojo._xdDebugScopeChecked){
if(dojo._scopeName!="dojo"){
window.dojo=window[dojo.config.scopeMap[0][1]];
window.dijit=window[dojo.config.scopeMap[1][1]];
window.dojox=window[dojo.config.scopeMap[2][1]];
}
dojo._xdDebugScopeChecked=true;
}
var _4=dojo._xdDebugQueue;
if(_3&&_3==_4.currentResourceName){
_4.shift();
}
if(_4.length==0){
dojo._xdWatchInFlight();
}
if(_4.length==0){
_4.currentResourceName=null;
for(var _5 in dojo._xdInFlight){
if(dojo._xdInFlight[_5]===true){
return;
}
}
dojo._xdNotifyLoaded();
}else{
if(_3==_4.currentResourceName){
_4.currentResourceName=_4[0].resourceName;
var _6=document.createElement("script");
_6.type="text/javascript";
_6.src=_4[0].resourcePath;
document.getElementsByTagName("head")[0].appendChild(_6);
}
}
};
}
