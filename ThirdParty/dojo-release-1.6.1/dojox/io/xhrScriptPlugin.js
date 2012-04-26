/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.io.xhrScriptPlugin"]){
dojo._hasResource["dojox.io.xhrScriptPlugin"]=true;
dojo.provide("dojox.io.xhrScriptPlugin");
dojo.require("dojox.io.xhrPlugins");
dojo.require("dojo.io.script");
dojo.require("dojox.io.scriptFrame");
dojox.io.xhrScriptPlugin=function(_1,_2,_3){
dojox.io.xhrPlugins.register("script",function(_4,_5){
return _5.sync!==true&&(_4=="GET"||_3)&&(_5.url.substring(0,_1.length)==_1);
},function(_6,_7,_8){
var _9=function(){
_7.callbackParamName=_2;
if(dojo.body()){
_7.frameDoc="frame"+Math.random();
}
return dojo.io.script.get(_7);
};
return (_3?_3(_9,true):_9)(_6,_7,_8);
});
};
}
