/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.cometd.RestChannels"]){
dojo._hasResource["dojox.cometd.RestChannels"]=true;
dojo.provide("dojox.cometd.RestChannels");
dojo.require("dojox.rpc.Client");
dojo.requireIf(dojox.data&&!!dojox.data.JsonRestStore,"dojox.data.restListener");
(function(){
dojo.declare("dojox.cometd.RestChannels",null,{constructor:function(_1){
dojo.mixin(this,_1);
if(dojox.rpc.Rest&&this.autoSubscribeRoot){
var _2=dojox.rpc.Rest._get;
var _3=this;
dojox.rpc.Rest._get=function(_4,id){
var _5=dojo.xhrGet;
dojo.xhrGet=function(r){
var _6=_3.autoSubscribeRoot;
return (_6&&r.url.substring(0,_6.length)==_6)?_3.get(r.url,r):_5(r);
};
var _7=_2.apply(this,arguments);
dojo.xhrGet=_5;
return _7;
};
}
},absoluteUrl:function(_8,_9){
return new dojo._Url(_8,_9)+"";
},acceptType:"application/rest+json,application/http;q=0.9,*/*;q=0.7",subscriptions:{},subCallbacks:{},autoReconnectTime:3000,reloadDataOnReconnect:true,sendAsJson:false,url:"/channels",autoSubscribeRoot:"/",open:function(){
this.started=true;
if(!this.connected){
this.connectionId=dojox.rpc.Client.clientId;
var _a=this.createdClientId?"Client-Id":"Create-Client-Id";
this.createdClientId=true;
var _b={Accept:this.acceptType};
_b[_a]=this.connectionId;
var _c=dojo.xhrPost({headers:_b,url:this.url,noStatus:true});
var _d=this;
this.lastIndex=0;
var _e,_f=function(_10){
if(typeof dojo=="undefined"){
return null;
}
if(xhr&&xhr.status>400){
return _e(true);
}
if(typeof _10=="string"){
_10=_10.substring(_d.lastIndex);
}
var _11=xhr&&(xhr.contentType||xhr.getResponseHeader("Content-Type"))||(typeof _10!="string"&&"already json");
var _12=_d.onprogress(xhr,_10,_11);
if(_12){
if(_e()){
return new Error(_12);
}
}
if(!xhr||xhr.readyState==4){
xhr=null;
if(_d.connected){
_d.connected=false;
_d.open();
}
}
return _10;
};
_e=function(_13){
if(xhr&&xhr.status==409){
_d.disconnected();
return null;
}
_d.createdClientId=false;
_d.disconnected();
return _13;
};
_c.addCallbacks(_f,_e);
var xhr=_c.ioArgs.xhr;
if(xhr){
xhr.onreadystatechange=function(){
var _14;
try{
if(xhr.readyState==3){
_d.readyState=3;
_14=xhr.responseText;
}
}
catch(e){
}
if(typeof _14=="string"){
_f(_14);
}
};
}
if(window.attachEvent){
window.attachEvent("onunload",function(){
_d.connected=false;
if(xhr){
xhr.abort();
}
});
}
this.connected=true;
}
},_send:function(_15,_16,_17){
if(this.sendAsJson){
_16.postData=dojo.toJson({target:_16.url,method:_15,content:_17,params:_16.content,subscribe:_16.headers["Subscribe"]});
_16.url=this.url;
_15="POST";
}else{
_16.postData=dojo.toJson(_17);
}
return dojo.xhr(_15,_16,_16.postData);
},subscribe:function(_18,_19){
_19=_19||{};
_19.url=this.absoluteUrl(this.url,_18);
if(_19.headers){
delete _19.headers.Range;
}
var _1a=this.subscriptions[_18];
var _1b=_19.method||"HEAD";
var _1c=_19.since;
var _1d=_19.callback;
var _1e=_19.headers||(_19.headers={});
this.subscriptions[_18]=_1c||_1a||0;
var _1f=this.subCallbacks[_18];
if(_1d){
this.subCallbacks[_18]=_1f?function(m){
_1f(m);
_1d(m);
}:_1d;
}
if(!this.connected){
this.open();
}
if(_1a===undefined||_1a!=_1c){
_1e["Cache-Control"]="max-age=0";
_1c=typeof _1c=="number"?new Date(_1c).toUTCString():_1c;
if(_1c){
_1e["Subscribe-Since"]=_1c;
}
_1e["Subscribe"]=_19.unsubscribe?"none":"*";
var dfd=this._send(_1b,_19);
var _20=this;
dfd.addBoth(function(_21){
var xhr=dfd.ioArgs.xhr;
if(!(_21 instanceof Error)){
if(_19.confirmation){
_19.confirmation();
}
}
if(xhr&&xhr.getResponseHeader("Subscribed")=="OK"){
var _22=xhr.getResponseHeader("Last-Modified");
if(xhr.responseText){
_20.subscriptions[_18]=_22||new Date().toUTCString();
}else{
return null;
}
}else{
if(xhr&&!(_21 instanceof Error)){
delete _20.subscriptions[_18];
}
}
if(!(_21 instanceof Error)){
var _23={responseText:xhr&&xhr.responseText,channel:_18,getResponseHeader:function(_24){
return xhr.getResponseHeader(_24);
},getAllResponseHeaders:function(){
return xhr.getAllResponseHeaders();
},result:_21};
if(_20.subCallbacks[_18]){
_20.subCallbacks[_18](_23);
}
}else{
if(_20.subCallbacks[_18]){
_20.subCallbacks[_18](xhr);
}
}
return _21;
});
return dfd;
}
return null;
},publish:function(_25,_26){
return this._send("POST",{url:_25,contentType:"application/json"},_26);
},_processMessage:function(_27){
_27.event=_27.event||_27.getResponseHeader("Event");
if(_27.event=="connection-conflict"){
return "conflict";
}
try{
_27.result=_27.result||dojo.fromJson(_27.responseText);
}
catch(e){
}
var _28=this;
var loc=_27.channel=new dojo._Url(this.url,_27.source||_27.getResponseHeader("Content-Location"))+"";
if(loc in this.subscriptions&&_27.getResponseHeader){
this.subscriptions[loc]=_27.getResponseHeader("Last-Modified");
}
if(this.subCallbacks[loc]){
setTimeout(function(){
_28.subCallbacks[loc](_27);
},0);
}
this.receive(_27);
return null;
},onprogress:function(xhr,_29,_2a){
if(!_2a||_2a.match(/application\/rest\+json/)){
var _2b=_29.length;
_29=_29.replace(/^\s*[,\[]?/,"[").replace(/[,\]]?\s*$/,"]");
try{
var _2c=dojo.fromJson(_29);
this.lastIndex+=_2b;
}
catch(e){
}
}else{
if(dojox.io&&dojox.io.httpParse&&_2a.match(/application\/http/)){
var _2d="";
if(xhr&&xhr.getAllResponseHeaders){
_2d=xhr.getAllResponseHeaders();
}
_2c=dojox.io.httpParse(_29,_2d,xhr.readyState!=4);
}else{
if(typeof _29=="object"){
_2c=_29;
}
}
}
if(_2c){
for(var i=0;i<_2c.length;i++){
if(this._processMessage(_2c[i])){
return "conflict";
}
}
return null;
}
if(!xhr){
return "error";
}
if(xhr.readyState!=4){
return null;
}
if(xhr.__proto__){
xhr={channel:"channel",__proto__:xhr};
}
return this._processMessage(xhr);
},get:function(_2e,_2f){
(_2f=_2f||{}).method="GET";
return this.subscribe(_2e,_2f);
},receive:function(_30){
if(dojox.data&&dojox.data.restListener){
dojox.data.restListener(_30);
}
},disconnected:function(){
var _31=this;
if(this.connected){
this.connected=false;
if(this.started){
setTimeout(function(){
var _32=_31.subscriptions;
_31.subscriptions={};
for(var i in _32){
if(_31.reloadDataOnReconnect&&dojox.rpc.JsonRest){
delete dojox.rpc.Rest._index[i];
dojox.rpc.JsonRest.fetch(i);
}else{
_31.subscribe(i,{since:_32[i]});
}
}
_31.open();
},this.autoReconnectTime);
}
}
},unsubscribe:function(_33,_34){
_34=_34||{};
_34.unsubscribe=true;
this.subscribe(_33,_34);
},disconnect:function(){
this.started=false;
this.xhr.abort();
}});
var _35=dojox.cometd.RestChannels.defaultInstance=new dojox.cometd.RestChannels();
if(dojox.cometd.connectionTypes){
_35.startup=function(_36){
_35.open();
this._cometd._deliver({channel:"/meta/connect",successful:true});
};
_35.check=function(_37,_38,_39){
for(var i=0;i<_37.length;i++){
if(_37[i]=="rest-channels"){
return !_39;
}
}
return false;
};
_35.deliver=function(_3a){
};
dojo.connect(this,"receive",null,function(_3b){
_3b.data=_3b.result;
this._cometd._deliver(_3b);
});
_35.sendMessages=function(_3c){
for(var i=0;i<_3c.length;i++){
var _3d=_3c[i];
var _3e=_3d.channel;
var _3f=this._cometd;
var _40={confirmation:function(){
_3f._deliver({channel:_3e,successful:true});
}};
if(_3e=="/meta/subscribe"){
this.subscribe(_3d.subscription,_40);
}else{
if(_3e=="/meta/unsubscribe"){
this.unsubscribe(_3d.subscription,_40);
}else{
if(_3e=="/meta/connect"){
_40.confirmation();
}else{
if(_3e=="/meta/disconnect"){
_35.disconnect();
_40.confirmation();
}else{
if(_3e.substring(0,6)!="/meta/"){
this.publish(_3e,_3d.data);
}
}
}
}
}
}
};
dojox.cometd.connectionTypes.register("rest-channels",_35.check,_35,false,true);
}
})();
}
