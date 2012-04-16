/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.timing.doLater"]){
dojo._hasResource["dojox.timing.doLater"]=true;
dojo.provide("dojox.timing.doLater");
dojo.experimental("dojox.timing.doLater");
dojox.timing.doLater=function(_1,_2,_3){
if(_1){
return false;
}
var _4=dojox.timing.doLater.caller,_5=dojox.timing.doLater.caller.arguments;
_3=_3||100;
_2=_2||dojo.global;
setTimeout(function(){
_4.apply(_2,_5);
},_3);
return true;
};
}
