/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/xhr",["../errors/RequestError","./watch","./handlers","./util","../has"],function(_1,_2,_3,_4,_5){
_5.add("native-xhr",function(){
return typeof XMLHttpRequest!=="undefined";
});
_5.add("dojo-force-activex-xhr",function(){
return _5("activex")&&!document.addEventListener&&window.location.protocol==="file:";
});
_5.add("native-xhr2",function(){
if(!_5("native-xhr")){
return;
}
var x=new XMLHttpRequest();
return typeof x["addEventListener"]!=="undefined"&&(typeof opera==="undefined"||typeof x["upload"]!=="undefined");
});
_5.add("native-formdata",function(){
return typeof FormData==="function";
});
function _6(_7,_8){
var _9=_7.xhr;
_7.status=_7.xhr.status;
_7.text=_9.responseText;
if(_7.options.handleAs==="xml"){
_7.data=_9.responseXML;
}
if(!_8){
try{
_3(_7);
}
catch(e){
_8=e;
}
}
if(_8){
this.reject(_8);
}else{
if(_4.checkStatus(_9.status)){
this.resolve(_7);
}else{
_8=new _1("Unable to load "+_7.url+" status: "+_9.status,_7);
this.reject(_8);
}
}
};
var _a,_b,_c,_d;
if(_5("native-xhr2")){
_a=function(_e){
return !this.isFulfilled();
};
_d=function(_f,_10){
_10.xhr.abort();
};
_c=function(_11,dfd,_12){
function _13(evt){
dfd.handleResponse(_12);
};
function _14(evt){
var _15=evt.target;
var _16=new _1("Unable to load "+_12.url+" status: "+_15.status,_12);
dfd.handleResponse(_12,_16);
};
function _17(evt){
if(evt.lengthComputable){
_12.loaded=evt.loaded;
_12.total=evt.total;
dfd.progress(_12);
}
};
_11.addEventListener("load",_13,false);
_11.addEventListener("error",_14,false);
_11.addEventListener("progress",_17,false);
return function(){
_11.removeEventListener("load",_13,false);
_11.removeEventListener("error",_14,false);
_11.removeEventListener("progress",_17,false);
_11=null;
};
};
}else{
_a=function(_18){
return _18.xhr.readyState;
};
_b=function(_19){
return 4===_19.xhr.readyState;
};
_d=function(dfd,_1a){
var xhr=_1a.xhr;
var _1b=typeof xhr.abort;
if(_1b==="function"||_1b==="object"||_1b==="unknown"){
xhr.abort();
}
};
}
function _1c(_1d){
return this.xhr.getResponseHeader(_1d);
};
var _1e,_1f={data:null,query:null,sync:false,method:"GET"};
function xhr(url,_20,_21){
var _22=_4.parseArgs(url,_4.deepCreate(_1f,_20),_5("native-formdata")&&_20&&_20.data&&_20.data instanceof FormData);
url=_22.url;
_20=_22.options;
var _23,_24=function(){
_23&&_23();
};
var dfd=_4.deferred(_22,_d,_a,_b,_6,_24);
var _25=_22.xhr=xhr._create();
if(!_25){
dfd.cancel(new _1("XHR was not created"));
return _21?dfd:dfd.promise;
}
_22.getHeader=_1c;
if(_c){
_23=_c(_25,dfd,_22);
}
var _26=_20.data,_27=!_20.sync,_28=_20.method;
try{
_25.open(_28,url,_27,_20.user||_1e,_20.password||_1e);
if(_20.withCredentials){
_25.withCredentials=_20.withCredentials;
}
var _29=_20.headers,_2a="application/x-www-form-urlencoded";
if(_29){
for(var hdr in _29){
if(hdr.toLowerCase()==="content-type"){
_2a=_29[hdr];
}else{
if(_29[hdr]){
_25.setRequestHeader(hdr,_29[hdr]);
}
}
}
}
if(_2a&&_2a!==false){
_25.setRequestHeader("Content-Type",_2a);
}
if(!_29||!("X-Requested-With" in _29)){
_25.setRequestHeader("X-Requested-With","XMLHttpRequest");
}
if(_4.notify){
_4.notify.emit("send",_22,dfd.promise.cancel);
}
_25.send(_26);
}
catch(e){
dfd.reject(e);
}
_2(dfd);
_25=null;
return _21?dfd:dfd.promise;
};
xhr._create=function(){
throw new Error("XMLHTTP not available");
};
if(_5("native-xhr")&&!_5("dojo-force-activex-xhr")){
xhr._create=function(){
return new XMLHttpRequest();
};
}else{
if(_5("activex")){
try{
new ActiveXObject("Msxml2.XMLHTTP");
xhr._create=function(){
return new ActiveXObject("Msxml2.XMLHTTP");
};
}
catch(e){
try{
new ActiveXObject("Microsoft.XMLHTTP");
xhr._create=function(){
return new ActiveXObject("Microsoft.XMLHTTP");
};
}
catch(e){
}
}
}
}
_4.addCommonMethods(xhr);
return xhr;
});
