/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.analytics.plugins.window"]){
dojo._hasResource["dojox.analytics.plugins.window"]=true;
dojo.require("dojox.analytics._base");
dojo.provide("dojox.analytics.plugins.window");
dojox.analytics.plugins.window=new (function(){
this.addData=dojo.hitch(dojox.analytics,"addData","window");
this.windowConnects=dojo.config["windowConnects"]||["open","onerror"];
for(var i=0;i<this.windowConnects.length;i++){
dojo.connect(window,this.windowConnects[i],dojo.hitch(this,"addData",this.windowConnects[i]));
}
dojo.addOnLoad(dojo.hitch(this,function(){
var _1={};
for(var i in window){
if(dojo.isObject(window[i])){
switch(i){
case "location":
case "console":
_1[i]=window[i];
break;
default:
break;
}
}else{
_1[i]=window[i];
}
}
this.addData(_1);
}));
})();
}
