/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(typeof window!="undefined"){
dojo.isBrowser=true;
dojo._name="browser";
(function(){
var d=dojo;
if(document&&document.getElementsByTagName){
var _1=document.getElementsByTagName("script");
var _2=/dojo(\.xd)?\.js(\W|$)/i;
for(var i=0;i<_1.length;i++){
var _3=_1[i].getAttribute("src");
if(!_3){
continue;
}
var m=_3.match(_2);
if(m){
if(!d.config.baseUrl){
d.config.baseUrl=_3.substring(0,m.index);
}
var _4=(_1[i].getAttribute("djConfig")||_1[i].getAttribute("data-dojo-config"));
if(_4){
var _5=eval("({ "+_4+" })");
for(var x in _5){
dojo.config[x]=_5[x];
}
}
break;
}
}
}
d.baseUrl=d.config.baseUrl;
var n=navigator;
var _6=n.userAgent,_7=n.appVersion,tv=parseFloat(_7);
if(_6.indexOf("Opera")>=0){
d.isOpera=tv;
}
if(_6.indexOf("AdobeAIR")>=0){
d.isAIR=1;
}
d.isKhtml=(_7.indexOf("Konqueror")>=0)?tv:0;
d.isWebKit=parseFloat(_6.split("WebKit/")[1])||undefined;
d.isChrome=parseFloat(_6.split("Chrome/")[1])||undefined;
d.isMac=_7.indexOf("Macintosh")>=0;
var _8=Math.max(_7.indexOf("WebKit"),_7.indexOf("Safari"),0);
if(_8&&!dojo.isChrome){
d.isSafari=parseFloat(_7.split("Version/")[1]);
if(!d.isSafari||parseFloat(_7.substr(_8+7))<=419.3){
d.isSafari=2;
}
}
if(_6.indexOf("Gecko")>=0&&!d.isKhtml&&!d.isWebKit){
d.isMozilla=d.isMoz=tv;
}
if(d.isMoz){
d.isFF=parseFloat(_6.split("Firefox/")[1]||_6.split("Minefield/")[1])||undefined;
}
if(document.all&&!d.isOpera){
d.isIE=parseFloat(_7.split("MSIE ")[1])||undefined;
var _9=document.documentMode;
if(_9&&_9!=5&&Math.floor(d.isIE)!=_9){
d.isIE=_9;
}
}
if(dojo.isIE&&window.location.protocol==="file:"){
dojo.config.ieForceActiveXXhr=true;
}
d.isQuirks=document.compatMode=="BackCompat";
d.locale=dojo.config.locale||(d.isIE?n.userLanguage:n.language).toLowerCase();
d._XMLHTTP_PROGIDS=["Msxml2.XMLHTTP","Microsoft.XMLHTTP","Msxml2.XMLHTTP.4.0"];
d._xhrObj=function(){
var _a,_b;
if(!dojo.isIE||!dojo.config.ieForceActiveXXhr){
try{
_a=new XMLHttpRequest();
}
catch(e){
}
}
if(!_a){
for(var i=0;i<3;++i){
var _c=d._XMLHTTP_PROGIDS[i];
try{
_a=new ActiveXObject(_c);
}
catch(e){
_b=e;
}
if(_a){
d._XMLHTTP_PROGIDS=[_c];
break;
}
}
}
if(!_a){
throw new Error("XMLHTTP not available: "+_b);
}
return _a;
};
d._isDocumentOk=function(_d){
var _e=_d.status||0,lp=location.protocol;
return (_e>=200&&_e<300)||_e==304||_e==1223||(!_e&&(lp=="file:"||lp=="chrome:"||lp=="chrome-extension:"||lp=="app:"));
};
var _f=window.location+"";
var _10=document.getElementsByTagName("base");
var _11=(_10&&_10.length>0);
d._getText=function(uri,_12){
var _13=d._xhrObj();
if(!_11&&dojo._Url){
uri=(new dojo._Url(_f,uri)).toString();
}
if(d.config.cacheBust){
uri+="";
uri+=(uri.indexOf("?")==-1?"?":"&")+String(d.config.cacheBust).replace(/\W+/g,"");
}
_13.open("GET",uri,false);
try{
_13.send(null);
if(!d._isDocumentOk(_13)){
var err=Error("Unable to load "+uri+" status:"+_13.status);
err.status=_13.status;
err.responseText=_13.responseText;
throw err;
}
}
catch(e){
if(_12){
return null;
}
throw e;
}
return _13.responseText;
};
var _14=window;
var _15=function(_16,fp){
var _17=_14.attachEvent||_14.addEventListener;
_16=_14.attachEvent?_16:_16.substring(2);
_17(_16,function(){
fp.apply(_14,arguments);
},false);
};
d._windowUnloaders=[];
d.windowUnloaded=function(){
var mll=d._windowUnloaders;
while(mll.length){
(mll.pop())();
}
d=null;
};
var _18=0;
d.addOnWindowUnload=function(obj,_19){
d._onto(d._windowUnloaders,obj,_19);
if(!_18){
_18=1;
_15("onunload",d.windowUnloaded);
}
};
var _1a=0;
d.addOnUnload=function(obj,_1b){
d._onto(d._unloaders,obj,_1b);
if(!_1a){
_1a=1;
_15("onbeforeunload",dojo.unloaded);
}
};
})();
dojo._initFired=false;
dojo._loadInit=function(e){
if(dojo._scrollIntervalId){
clearInterval(dojo._scrollIntervalId);
dojo._scrollIntervalId=0;
}
if(!dojo._initFired){
dojo._initFired=true;
if(!dojo.config.afterOnLoad&&window.detachEvent){
window.detachEvent("onload",dojo._loadInit);
}
if(dojo._inFlightCount==0){
dojo._modulesLoaded();
}
}
};
if(!dojo.config.afterOnLoad){
if(document.addEventListener){
document.addEventListener("DOMContentLoaded",dojo._loadInit,false);
window.addEventListener("load",dojo._loadInit,false);
}else{
if(window.attachEvent){
window.attachEvent("onload",dojo._loadInit);
if(!dojo.config.skipIeDomLoaded&&self===self.top){
dojo._scrollIntervalId=setInterval(function(){
try{
if(document.body){
document.documentElement.doScroll("left");
dojo._loadInit();
}
}
catch(e){
}
},30);
}
}
}
}
if(dojo.isIE){
try{
(function(){
document.namespaces.add("v","urn:schemas-microsoft-com:vml");
var _1c=["*","group","roundrect","oval","shape","rect","imagedata","path","textpath","text"],i=0,l=1,s=document.createStyleSheet();
if(dojo.isIE>=8){
i=1;
l=_1c.length;
}
for(;i<l;++i){
s.addRule("v\\:"+_1c[i],"behavior:url(#default#VML); display:inline-block");
}
})();
}
catch(e){
}
}
}
(function(){
var mp=dojo.config["modulePaths"];
if(mp){
for(var _1d in mp){
dojo.registerModulePath(_1d,mp[_1d]);
}
}
})();
if(dojo.config.isDebug){
dojo.require("dojo._firebug.firebug");
}
if(dojo.config.debugAtAllCosts){
dojo.require("dojo._base._loader.loader_debug");
dojo.require("dojo.i18n");
}
