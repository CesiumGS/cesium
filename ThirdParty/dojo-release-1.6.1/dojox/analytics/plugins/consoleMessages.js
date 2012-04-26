/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.analytics.plugins.consoleMessages"]){
dojo._hasResource["dojox.analytics.plugins.consoleMessages"]=true;
dojo.require("dojox.analytics._base");
dojo.provide("dojox.analytics.plugins.consoleMessages");
dojox.analytics.plugins.consoleMessages=new (function(){
this.addData=dojo.hitch(dojox.analytics,"addData","consoleMessages");
var _1=dojo.config["consoleLogFuncs"]||["error","warn","info","rlog"];
if(!console){
console={};
}
for(var i=0;i<_1.length;i++){
if(console[_1[i]]){
dojo.connect(console,_1[i],dojo.hitch(this,"addData",_1[i]));
}else{
console[_1[i]]=dojo.hitch(this,"addData",_1[i]);
}
}
})();
}
