/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.robotx"]){
dojo._hasResource["dojo.robotx"]=true;
dojo.provide("dojo.robotx");
dojo.require("dojo.robot");
dojo.experimental("dojo.robotx");
(function(){
var _1=null;
var _2=dojo.connect(doh,"_groupStarted",function(){
dojo.disconnect(_2);
_1.style.visibility="visible";
});
var _3=function(){
dojo.addOnLoad(function(){
var _4={overflow:dojo.isWebKit?"hidden":"visible",margin:"0px",borderWidth:"0px",height:"100%",width:"100%"};
dojo.style(document.documentElement,_4);
dojo.style(document.body,_4);
document.body.appendChild(_1);
var _5=document.createElement("base");
_5.href=_1.src;
document.getElementsByTagName("head")[0].appendChild(_5);
});
};
var _6=false;
var _7=null;
var _8=doh.robot._run;
doh.robot._run=function(_9){
_6=true;
_7=_9;
doh.robot._run=_8;
if(_1.src){
_3();
}
};
var _a=function(){
doh.robot._updateDocument();
_a=null;
var _b=(document.compatMode=="BackCompat")?document.body:document.documentElement;
var _c=document.getElementById("robotconsole").offsetHeight;
if(_c){
_1.style.height=(_b.clientHeight-_c)+"px";
}
if(_1.contentWindow.dojo){
_1.contentWindow.dojo.addOnLoad(function(){
doh.robot._run(_7);
});
}else{
doh.robot._run(_7);
}
};
var _d=function(){
if(_a){
_a();
}
var _e=dojo.connect(dojo.body(),"onunload",function(){
dojo.global=window;
dojo.doc=document;
dojo.disconnect(_e);
});
};
dojo.config.debugContainerId="robotconsole";
dojo.config.debugHeight=dojo.config.debugHeight||200;
document.write("<div id=\"robotconsole\" style=\"position:absolute;left:0px;bottom:0px;width:100%;\"></div>");
_1=document.createElement("iframe");
_1.setAttribute("ALLOWTRANSPARENCY","true");
_1.scrolling=dojo.isIE?"yes":"auto";
dojo.style(_1,{visibility:"hidden",border:"0px none",padding:"0px",margin:"0px",position:"absolute",left:"0px",top:"0px",width:"100%",height:"100%"});
if(_1["attachEvent"]!==undefined){
_1.attachEvent("onload",_d);
}else{
dojo.connect(_1,"onload",_d);
}
dojo.mixin(doh.robot,{_updateDocument:function(){
dojo.setContext(_1.contentWindow,_1.contentWindow.document);
var _f=dojo.global;
if(_f["dojo"]){
dojo._topics=_f.dojo._topics;
}
},initRobot:function(url){
_1.src=url;
if(_6){
_3();
}
},waitForPageToLoad:function(_10){
var d=new doh.Deferred();
_a=function(){
_a=null;
doh.robot._updateDocument();
d.callback(true);
};
_10();
return d;
}});
})();
}
