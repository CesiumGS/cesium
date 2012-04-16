/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.socket"]){
dojo._hasResource["dojox.socket"]=true;
dojo.provide("dojox.socket");
dojo.require("dojo.cookie");
var WebSocket=window.WebSocket;
function Socket(_1){
if(typeof _1=="string"){
_1={url:_1};
}
return WebSocket?dojox.socket.WebSocket(_1,true):dojox.socket.LongPoll(_1);
};
dojox.socket=Socket;
Socket.WebSocket=function(_2,_3){
var ws=new WebSocket(new dojo._Url(document.baseURI.replace(/^http/i,"ws"),_2.url));
ws.on=function(_4,_5){
ws.addEventListener(_4,_5,true);
};
var _6;
dojo.connect(ws,"onopen",function(_7){
_6=true;
});
dojo.connect(ws,"onclose",function(_8){
if(_6){
return;
}
if(_3){
Socket.replace(ws,dojox.socket.LongPoll(_2),true);
}
});
return ws;
};
Socket.replace=function(_9,_a,_b){
_9.send=dojo.hitch(_a,"send");
_9.close=dojo.hitch(_a,"close");
if(_b){
_c("open");
}
dojo.forEach(["message","close","error"],_c);
function _c(_d){
(_a.addEventListener||_a.on).call(_a,_d,function(_e){
var _f=document.createEvent("MessageEvent");
_f.initMessageEvent(_e.type,false,false,_e.data,_e.origin,_e.lastEventId,_e.source);
_9.dispatchEvent(_f);
},true);
};
};
Socket.LongPoll=function(_10){
var _11=false,_12=true,_13,_14=[];
var _15={send:function(_16){
var _17=dojo.delegate(_10);
_17.rawBody=_16;
clearTimeout(_13);
var _18=_12?(_12=false)||_15.firstRequest(_17):_15.transport(_17);
_14.push(_18);
_18.then(function(_19){
_15.readyState=1;
_14.splice(dojo.indexOf(_14,_18),1);
if(!_14.length){
_13=setTimeout(_21,_10.interval);
}
if(_19){
_1b("message",{data:_19},_18);
}
},function(_1a){
_14.splice(dojo.indexOf(_14,_18),1);
if(!_11){
_1b("error",{error:_1a},_18);
if(!_14.length){
_15.readyState=3;
_1b("close",{wasClean:false},_18);
}
}
});
return _18;
},close:function(){
_15.readyState=2;
_11=true;
for(var i=0;i<_14.length;i++){
_14[i].cancel();
}
_15.readyState=3;
_1b("close",{wasClean:true});
},transport:_10.transport||dojo.xhrPost,args:_10,url:_10.url,readyState:0,CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3,dispatchEvent:function(_1c){
_1b(_1c.type,_1c);
},on:function(_1d,_1e){
return dojo.connect(this,"on"+_1d,_1e);
},firstRequest:function(_1f){
var _20=(_1f.headers||(_1f.headers={}));
_20.Pragma="start-long-poll";
try{
return this.transport(_1f);
}
finally{
delete _20.Pragma;
}
}};
function _21(){
if(_15.readyState==0){
_1b("open",{});
}
if(!_14.length){
_15.send();
}
};
function _1b(_22,_23,_24){
if(_15["on"+_22]){
var _25=document.createEvent("HTMLEvents");
_25.initEvent(_22,false,false);
dojo.mixin(_25,_23);
_25.ioArgs=_24&&_24.ioArgs;
_15["on"+_22](_25);
}
};
_15.connect=_15.on;
setTimeout(_21);
return _15;
};
}
