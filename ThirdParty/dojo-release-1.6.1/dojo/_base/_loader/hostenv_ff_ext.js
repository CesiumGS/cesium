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
d.baseUrl=d.config.baseUrl;
var n=navigator;
var _1=n.userAgent;
var _2=n.appVersion;
var tv=parseFloat(_2);
d.isMozilla=d.isMoz=tv;
if(d.isMoz){
d.isFF=parseFloat(_1.split("Firefox/")[1])||undefined;
}
d.isQuirks=document.compatMode=="BackCompat";
d.locale=dojo.config.locale||n.language.toLowerCase();
d._xhrObj=function(){
return new XMLHttpRequest();
};
var _3=d._loadUri;
d._loadUri=function(_4,cb){
var _5=["file:","chrome:","resource:"].some(function(_6){
return String(_4).indexOf(_6)==0;
});
if(_5){
var l=Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
var _7=l.loadSubScript(_4,d.global);
if(cb){
cb(_7);
}
return true;
}else{
return _3.apply(d,arguments);
}
};
d._isDocumentOk=function(_8){
var _9=_8.status||0;
return (_9>=200&&_9<300)||_9==304||_9==1223||(!_9&&(location.protocol=="file:"||location.protocol=="chrome:"));
};
var _a=false;
d._getText=function(_b,_c){
var _d=d._xhrObj();
if(!_a&&dojo._Url){
_b=(new dojo._Url(_b)).toString();
}
if(d.config.cacheBust){
_b+="";
_b+=(_b.indexOf("?")==-1?"?":"&")+String(d.config.cacheBust).replace(/\W+/g,"");
}
var _e=["file:","chrome:","resource:"].some(function(_f){
return String(_b).indexOf(_f)==0;
});
if(_e){
var _10=Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
var _11=Components.classes["@mozilla.org/scriptableinputstream;1"].getService(Components.interfaces.nsIScriptableInputStream);
var _12=_10.newChannel(_b,null,null);
var _13=_12.open();
_11.init(_13);
var str=_11.read(_13.available());
_11.close();
_13.close();
return str;
}else{
_d.open("GET",_b,false);
try{
_d.send(null);
if(!d._isDocumentOk(_d)){
var err=Error("Unable to load "+_b+" status:"+_d.status);
err.status=_d.status;
err.responseText=_d.responseText;
throw err;
}
}
catch(e){
if(_c){
return null;
}
throw e;
}
return _d.responseText;
}
};
d._windowUnloaders=[];
d.windowUnloaded=function(){
var mll=d._windowUnloaders;
while(mll.length){
(mll.pop())();
}
};
d.addOnWindowUnload=function(obj,_14){
d._onto(d._windowUnloaders,obj,_14);
};
var _15=[];
var _16=null;
dojo._defaultContext=[window,document];
dojo.pushContext=function(g,d){
var old=[dojo.global,dojo.doc];
_15.push(old);
var n;
if(!g&&!d){
n=dojo._defaultContext;
}else{
n=[g,d];
if(!d&&dojo.isString(g)){
var t=document.getElementById(g);
if(t.contentDocument){
n=[t.contentWindow,t.contentDocument];
}
}
}
_16=n;
dojo.setContext.apply(dojo,n);
return old;
};
dojo.popContext=function(){
var oc=_16;
if(!_15.length){
return oc;
}
dojo.setContext.apply(dojo,_15.pop());
return oc;
};
dojo._inContext=function(g,d,f){
var a=dojo._toArray(arguments);
f=a.pop();
if(a.length==1){
d=null;
}
dojo.pushContext(g,d);
var r=f();
dojo.popContext();
return r;
};
})();
dojo._initFired=false;
dojo._loadInit=function(e){
dojo._initFired=true;
var _17=(e&&e.type)?e.type.toLowerCase():"load";
if(arguments.callee.initialized||(_17!="domcontentloaded"&&_17!="load")){
return;
}
arguments.callee.initialized=true;
if(dojo._inFlightCount==0){
dojo._modulesLoaded();
}
};
if(!dojo.config.afterOnLoad){
window.addEventListener("DOMContentLoaded",function(e){
dojo._loadInit(e);
},false);
}
}
(function(){
var mp=dojo.config["modulePaths"];
if(mp){
for(var _18 in mp){
dojo.registerModulePath(_18,mp[_18]);
}
}
})();
if(dojo.config.isDebug){
console.log=function(m){
var s=Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
s.logStringMessage(m);
};
console.debug=function(){
};
}
