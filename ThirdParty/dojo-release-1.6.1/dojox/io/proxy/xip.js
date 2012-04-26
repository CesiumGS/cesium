/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.io.proxy.xip"]){
dojo._hasResource["dojox.io.proxy.xip"]=true;
dojo.provide("dojox.io.proxy.xip");
dojo.require("dojo.io.iframe");
dojo.require("dojox.data.dom");
dojox.io.proxy.xip={xipClientUrl:((dojo.config||djConfig)["xipClientUrl"])||dojo.moduleUrl("dojox.io.proxy","xip_client.html"),urlLimit:4000,_callbackName:(dojox._scopeName||"dojox")+".io.proxy.xip.fragmentReceived",_state:{},_stateIdCounter:0,_isWebKit:navigator.userAgent.indexOf("WebKit")!=-1,send:function(_1){
var _2=this.xipClientUrl;
if(_2.split(":")[0].match(/javascript/i)||_1._ifpServerUrl.split(":")[0].match(/javascript/i)){
return;
}
var _3=_2.indexOf(":");
var _4=_2.indexOf("/");
if(_3==-1||_4<_3){
var _5=window.location.href;
if(_4==0){
_2=_5.substring(0,_5.indexOf("/",9))+_2;
}else{
_2=_5.substring(0,(_5.lastIndexOf("/")+1))+_2;
}
}
this.fullXipClientUrl=_2;
if(typeof document.postMessage!="undefined"){
document.addEventListener("message",dojo.hitch(this,this.fragmentReceivedEvent),false);
}
this.send=this._realSend;
return this._realSend(_1);
},_realSend:function(_6){
var _7="XhrIframeProxy"+(this._stateIdCounter++);
_6._stateId=_7;
var _8=_6._ifpServerUrl+"#0:init:id="+_7+"&client="+encodeURIComponent(this.fullXipClientUrl)+"&callback="+encodeURIComponent(this._callbackName);
this._state[_7]={facade:_6,stateId:_7,clientFrame:dojo.io.iframe.create(_7,"",_8),isSending:false,serverUrl:_6._ifpServerUrl,requestData:null,responseMessage:"",requestParts:[],idCounter:1,partIndex:0,serverWindow:null};
return _7;
},receive:function(_9,_a){
var _b={};
var _c=_a.split("&");
for(var i=0;i<_c.length;i++){
if(_c[i]){
var _d=_c[i].split("=");
_b[decodeURIComponent(_d[0])]=decodeURIComponent(_d[1]);
}
}
var _e=this._state[_9];
var _f=_e.facade;
_f._setResponseHeaders(_b.responseHeaders);
if(_b.status==0||_b.status){
_f.status=parseInt(_b.status,10);
}
if(_b.statusText){
_f.statusText=_b.statusText;
}
if(_b.responseText){
_f.responseText=_b.responseText;
var _10=_f.getResponseHeader("Content-Type");
if(_10){
var _11=_10.split(";")[0];
if(_11.indexOf("application/xml")==0||_11.indexOf("text/xml")==0){
_f.responseXML=dojox.data.dom.createDocument(_b.responseText,_10);
}
}
}
_f.readyState=4;
this.destroyState(_9);
},frameLoaded:function(_12){
var _13=this._state[_12];
var _14=_13.facade;
var _15=[];
for(var _16 in _14._requestHeaders){
_15.push(_16+": "+_14._requestHeaders[_16]);
}
var _17={uri:_14._uri};
if(_15.length>0){
_17.requestHeaders=_15.join("\r\n");
}
if(_14._method){
_17.method=_14._method;
}
if(_14._bodyData){
_17.data=_14._bodyData;
}
this.sendRequest(_12,dojo.objectToQuery(_17));
},destroyState:function(_18){
var _19=this._state[_18];
if(_19){
delete this._state[_18];
var _1a=_19.clientFrame.parentNode;
_1a.removeChild(_19.clientFrame);
_19.clientFrame=null;
_19=null;
}
},createFacade:function(){
if(arguments&&arguments[0]&&arguments[0].iframeProxyUrl){
return new dojox.io.proxy.xip.XhrIframeFacade(arguments[0].iframeProxyUrl);
}else{
return dojox.io.proxy.xip._xhrObjOld.apply(dojo,arguments);
}
},sendRequest:function(_1b,_1c){
var _1d=this._state[_1b];
if(!_1d.isSending){
_1d.isSending=true;
_1d.requestData=_1c||"";
_1d.serverWindow=frames[_1d.stateId];
if(!_1d.serverWindow){
_1d.serverWindow=document.getElementById(_1d.stateId).contentWindow;
}
if(typeof document.postMessage=="undefined"){
if(_1d.serverWindow.contentWindow){
_1d.serverWindow=_1d.serverWindow.contentWindow;
}
}
this.sendRequestStart(_1b);
}
},sendRequestStart:function(_1e){
var _1f=this._state[_1e];
_1f.requestParts=[];
var _20=_1f.requestData;
var _21=_1f.serverUrl.length;
var _22=this.urlLimit-_21;
var _23=0;
while((_20.length-_23)+_21>this.urlLimit){
var _24=_20.substring(_23,_23+_22);
var _25=_24.lastIndexOf("%");
if(_25==_24.length-1||_25==_24.length-2){
_24=_24.substring(0,_25);
}
_1f.requestParts.push(_24);
_23+=_24.length;
}
_1f.requestParts.push(_20.substring(_23,_20.length));
_1f.partIndex=0;
this.sendRequestPart(_1e);
},sendRequestPart:function(_26){
var _27=this._state[_26];
if(_27.partIndex<_27.requestParts.length){
var _28=_27.requestParts[_27.partIndex];
var cmd="part";
if(_27.partIndex+1==_27.requestParts.length){
cmd="end";
}else{
if(_27.partIndex==0){
cmd="start";
}
}
this.setServerUrl(_26,cmd,_28);
_27.partIndex++;
}
},setServerUrl:function(_29,cmd,_2a){
var _2b=this.makeServerUrl(_29,cmd,_2a);
var _2c=this._state[_29];
if(this._isWebKit){
_2c.serverWindow.location=_2b;
}else{
_2c.serverWindow.location.replace(_2b);
}
},makeServerUrl:function(_2d,cmd,_2e){
var _2f=this._state[_2d];
var _30=_2f.serverUrl+"#"+(_2f.idCounter++)+":"+cmd;
if(_2e){
_30+=":"+_2e;
}
return _30;
},fragmentReceivedEvent:function(evt){
if(evt.uri.split("#")[0]==this.fullXipClientUrl){
this.fragmentReceived(evt.data);
}
},fragmentReceived:function(_31){
var _32=_31.indexOf("#");
var _33=_31.substring(0,_32);
var _34=_31.substring(_32+1,_31.length);
var msg=this.unpackMessage(_34);
var _35=this._state[_33];
switch(msg.command){
case "loaded":
this.frameLoaded(_33);
break;
case "ok":
this.sendRequestPart(_33);
break;
case "start":
_35.responseMessage=""+msg.message;
this.setServerUrl(_33,"ok");
break;
case "part":
_35.responseMessage+=msg.message;
this.setServerUrl(_33,"ok");
break;
case "end":
this.setServerUrl(_33,"ok");
_35.responseMessage+=msg.message;
this.receive(_33,_35.responseMessage);
break;
}
},unpackMessage:function(_36){
var _37=_36.split(":");
var _38=_37[1];
_36=_37[2]||"";
var _39=null;
if(_38=="init"){
var _3a=_36.split("&");
_39={};
for(var i=0;i<_3a.length;i++){
var _3b=_3a[i].split("=");
_39[decodeURIComponent(_3b[0])]=decodeURIComponent(_3b[1]);
}
}
return {command:_38,message:_36,config:_39};
}};
dojox.io.proxy.xip._xhrObjOld=dojo._xhrObj;
dojo._xhrObj=dojox.io.proxy.xip.createFacade;
dojox.io.proxy.xip.XhrIframeFacade=function(_3c){
this._requestHeaders={};
this._allResponseHeaders=null;
this._responseHeaders={};
this._method=null;
this._uri=null;
this._bodyData=null;
this.responseText=null;
this.responseXML=null;
this.status=null;
this.statusText=null;
this.readyState=0;
this._ifpServerUrl=_3c;
this._stateId=null;
};
dojo.extend(dojox.io.proxy.xip.XhrIframeFacade,{open:function(_3d,uri){
this._method=_3d;
this._uri=uri;
this.readyState=1;
},setRequestHeader:function(_3e,_3f){
this._requestHeaders[_3e]=_3f;
},send:function(_40){
this._bodyData=_40;
this._stateId=dojox.io.proxy.xip.send(this);
this.readyState=2;
},abort:function(){
dojox.io.proxy.xip.destroyState(this._stateId);
},getAllResponseHeaders:function(){
return this._allResponseHeaders;
},getResponseHeader:function(_41){
return this._responseHeaders[_41];
},_setResponseHeaders:function(_42){
if(_42){
this._allResponseHeaders=_42;
_42=_42.replace(/\r/g,"");
var _43=_42.split("\n");
for(var i=0;i<_43.length;i++){
if(_43[i]){
var _44=_43[i].split(": ");
this._responseHeaders[_44[0]]=_44[1];
}
}
}
}});
}
