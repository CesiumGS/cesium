/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.io.OAuth"]){
dojo._hasResource["dojox.io.OAuth"]=true;
dojo.provide("dojox.io.OAuth");
dojo.require("dojox.encoding.digests.SHA1");
dojox.io.OAuth=new (function(){
var _1=this.encode=function(s){
if(!s){
return "";
}
return encodeURIComponent(s).replace(/\!/g,"%21").replace(/\*/g,"%2A").replace(/\'/g,"%27").replace(/\(/g,"%28").replace(/\)/g,"%29");
};
var _2=this.decode=function(_3){
var a=[],_4=_3.split("&");
for(var i=0,l=_4.length;i<l;i++){
var _5=_4[i];
if(_4[i]==""){
continue;
}
if(_4[i].indexOf("=")>-1){
var _6=_4[i].split("=");
a.push([decodeURIComponent(_6[0]),decodeURIComponent(_6[1])]);
}else{
a.push([decodeURIComponent(_4[i]),null]);
}
}
return a;
};
function _7(_8){
var _9=["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],_a=/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,_b=_a.exec(_8),_c={},i=_9.length;
while(i--){
_c[_9[i]]=_b[i]||"";
}
var p=_c.protocol.toLowerCase(),a=_c.authority.toLowerCase(),b=(p=="http"&&_c.port==80)||(p=="https"&&_c.port==443);
if(b){
if(a.lastIndexOf(":")>-1){
a=a.substring(0,a.lastIndexOf(":"));
}
}
var _d=_c.path||"/";
_c.url=p+"://"+a+_d;
return _c;
};
var _e="0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
function _f(_10){
var s="",tl=_e.length;
for(var i=0;i<_10;i++){
s+=_e.charAt(Math.floor(Math.random()*tl));
}
return s;
};
function _11(){
return Math.floor(new Date().valueOf()/1000)-2;
};
function _12(_13,key,_14){
if(_14&&_14!="PLAINTEXT"&&_14!="HMAC-SHA1"){
throw new Error("dojox.io.OAuth: the only supported signature encodings are PLAINTEXT and HMAC-SHA1.");
}
if(_14=="PLAINTEXT"){
return key;
}else{
return dojox.encoding.digests.SHA1._hmac(_13,key);
}
};
function key(_15){
return _1(_15.consumer.secret)+"&"+(_15.token&&_15.token.secret?_1(_15.token.secret):"");
};
function _16(_17,oaa){
var o={oauth_consumer_key:oaa.consumer.key,oauth_nonce:_f(16),oauth_signature_method:oaa.sig_method||"HMAC-SHA1",oauth_timestamp:_11(),oauth_version:"1.0"};
if(oaa.token){
o.oauth_token=oaa.token.key;
}
_17.content=dojo.mixin(_17.content||{},o);
};
function _18(_19){
var _1a=[{}],_1b;
if(_19.form){
if(!_19.content){
_19.content={};
}
var _1c=dojo.byId(_19.form);
var _1d=_1c.getAttributeNode("action");
_19.url=_19.url||(_1d?_1d.value:null);
_1b=dojo.formToObject(_1c);
delete _19.form;
}
if(_1b){
_1a.push(_1b);
}
if(_19.content){
_1a.push(_19.content);
}
var map=_7(_19.url);
if(map.query){
var tmp=dojo.queryToObject(map.query);
for(var p in tmp){
tmp[p]=encodeURIComponent(tmp[p]);
}
_1a.push(tmp);
}
_19._url=map.url;
var a=[];
for(var i=0,l=_1a.length;i<l;i++){
var _1e=_1a[i];
for(var p in _1e){
if(dojo.isArray(_1e[p])){
for(var j=0,jl=_1e.length;j<jl;j++){
a.push([p,_1e[j]]);
}
}else{
a.push([p,_1e[p]]);
}
}
}
_19._parameters=a;
return _19;
};
function _1f(_20,_21,oaa){
_16(_21,oaa);
_18(_21);
var a=_21._parameters;
a.sort(function(a,b){
if(a[0]>b[0]){
return 1;
}
if(a[0]<b[0]){
return -1;
}
if(a[1]>b[1]){
return 1;
}
if(a[1]<b[1]){
return -1;
}
return 0;
});
var s=dojo.map(a,function(_22){
return _1(_22[0])+"="+_1(_22[1]||"");
}).join("&");
var _23=_20.toUpperCase()+"&"+_1(_21._url)+"&"+_1(s);
return _23;
};
function _24(_25,_26,oaa){
var k=key(oaa),_27=_1f(_25,_26,oaa),s=_12(_27,k,oaa.sig_method||"HMAC-SHA1");
_26.content["oauth_signature"]=s;
return _26;
};
this.sign=function(_28,_29,oaa){
return _24(_28,_29,oaa);
};
this.xhr=function(_2a,_2b,oaa,_2c){
_24(_2a,_2b,oaa);
return dojo.xhr(_2a,_2b,_2c);
};
this.xhrGet=function(_2d,oaa){
return this.xhr("GET",_2d,oaa);
};
this.xhrPost=this.xhrRawPost=function(_2e,oaa){
return this.xhr("POST",_2e,oaa,true);
};
this.xhrPut=this.xhrRawPut=function(_2f,oaa){
return this.xhr("PUT",_2f,oaa,true);
};
this.xhrDelete=function(_30,oaa){
return this.xhr("DELETE",_30,oaa);
};
})();
}
