/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.analytics.plugins.mouseClick"]){
dojo._hasResource["dojox.analytics.plugins.mouseClick"]=true;
dojo.require("dojox.analytics._base");
dojo.provide("dojox.analytics.plugins.mouseClick");
dojox.analytics.plugins.mouseClick=new (function(){
this.addData=dojo.hitch(dojox.analytics,"addData","mouseClick");
this.onClick=function(e){
this.addData(this.trimEvent(e));
};
dojo.connect(dojo.doc,"onclick",this,"onClick");
this.trimEvent=function(e){
var t={};
for(var i in e){
switch(i){
case "target":
case "originalTarget":
case "explicitOriginalTarget":
var _1=["id","className","nodeName","localName","href","spellcheck","lang"];
t[i]={};
for(var j=0;j<_1.length;j++){
if(e[i][_1[j]]){
if(_1[j]=="text"||_1[j]=="textContent"){
if((e[i]["localName"]!="HTML")&&(e[i]["localName"]!="BODY")){
t[i][_1[j]]=e[i][_1[j]].substr(0,50);
}
}else{
t[i][_1[j]]=e[i][_1[j]];
}
}
}
break;
case "clientX":
case "clientY":
case "pageX":
case "pageY":
case "screenX":
case "screenY":
t[i]=e[i];
break;
}
}
return t;
};
})();
}
