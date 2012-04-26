/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.io.xhrPlugins"]){
dojo._hasResource["dojox.io.xhrPlugins"]=true;
dojo.provide("dojox.io.xhrPlugins");
dojo.require("dojo.AdapterRegistry");
dojo.require("dojo._base.xhr");
(function(){
var _1;
var _2;
function _3(){
return _2=dojox.io.xhrPlugins.plainXhr=_2||dojo._defaultXhr||dojo.xhr;
};
dojox.io.xhrPlugins.register=function(){
var _4=_3();
if(!_1){
_1=new dojo.AdapterRegistry();
dojo[dojo._defaultXhr?"_defaultXhr":"xhr"]=function(_5,_6,_7){
return _1.match.apply(_1,arguments);
};
_1.register("xhr",function(_8,_9){
if(!_9.url.match(/^\w*:\/\//)){
return true;
}
var _a=window.location.href.match(/^.*?\/\/.*?\//)[0];
return _9.url.substring(0,_a.length)==_a;
},_4);
}
return _1.register.apply(_1,arguments);
};
dojox.io.xhrPlugins.addProxy=function(_b){
var _c=_3();
dojox.io.xhrPlugins.register("proxy",function(_d,_e){
return true;
},function(_f,_10,_11){
_10.url=_b+encodeURIComponent(_10.url);
return _c.call(dojo,_f,_10,_11);
});
};
var _12;
dojox.io.xhrPlugins.addCrossSiteXhr=function(url,_13){
var _14=_3();
if(_12===undefined&&window.XMLHttpRequest){
try{
var xhr=new XMLHttpRequest();
xhr.open("GET","http://testing-cross-domain-capability.com",true);
_12=true;
dojo.config.noRequestedWithHeaders=true;
}
catch(e){
_12=false;
}
}
dojox.io.xhrPlugins.register("cs-xhr",function(_15,_16){
return (_12||(window.XDomainRequest&&_16.sync!==true&&(_15=="GET"||_15=="POST"||_13)))&&(_16.url.substring(0,url.length)==url);
},_12?_14:function(){
var _17=dojo._xhrObj;
dojo._xhrObj=function(){
var xdr=new XDomainRequest();
xdr.readyState=1;
xdr.setRequestHeader=function(){
};
xdr.getResponseHeader=function(_18){
return _18=="Content-Type"?xdr.contentType:null;
};
function _19(_1a,_1b){
return function(){
xdr.readyState=_1b;
xdr.status=_1a;
};
};
xdr.onload=_19(200,4);
xdr.onprogress=_19(200,3);
xdr.onerror=_19(404,4);
return xdr;
};
var dfd=(_13?_13(_3()):_3()).apply(dojo,arguments);
dojo._xhrObj=_17;
return dfd;
});
};
dojox.io.xhrPlugins.fullHttpAdapter=function(_1c,_1d){
return function(_1e,_1f,_20){
var _21={};
var _22={};
if(_1e!="GET"){
_22["http-method"]=_1e;
if(_1f.putData&&_1d){
_21["http-content"]=_1f.putData;
delete _1f.putData;
_20=false;
}
if(_1f.postData&&_1d){
_21["http-content"]=_1f.postData;
delete _1f.postData;
_20=false;
}
_1e="POST";
}
for(var i in _1f.headers){
var _23=i.match(/^X-/)?i.substring(2).replace(/-/g,"_").toLowerCase():("http-"+i);
_22[_23]=_1f.headers[i];
}
_1f.query=dojo.objectToQuery(_22);
dojo._ioAddQueryToUrl(_1f);
_1f.content=dojo.mixin(_1f.content||{},_21);
return _1c.call(dojo,_1e,_1f,_20);
};
};
})();
}
