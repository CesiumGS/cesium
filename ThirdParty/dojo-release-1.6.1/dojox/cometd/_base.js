/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.cometd._base"]){
dojo._hasResource["dojox.cometd._base"]=true;
dojo.provide("dojox.cometd._base");
dojo.require("dojo.AdapterRegistry");
dojox.cometd={Connection:function(_1){
dojo.mixin(this,{prefix:_1,_status:"unconnected",_handshook:false,_initialized:false,_polling:false,expectedNetworkDelay:10000,connectTimeout:0,version:"1.0",minimumVersion:"0.9",clientId:null,messageId:0,batch:0,_isXD:false,handshakeReturn:null,currentTransport:null,url:null,lastMessage:null,_messageQ:[],handleAs:"json",_advice:{},_backoffInterval:0,_backoffIncrement:1000,_backoffMax:60000,_deferredSubscribes:{},_deferredUnsubscribes:{},_subscriptions:[],_extendInList:[],_extendOutList:[]});
this.state=function(){
return this._status;
};
this.init=function(_2,_3,_4){
_3=_3||{};
_3.version=this.version;
_3.minimumVersion=this.minimumVersion;
_3.channel="/meta/handshake";
_3.id=""+this.messageId++;
this.url=_2||dojo.config["cometdRoot"];
if(!this.url){
throw "no cometd root";
return null;
}
var _5="^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$";
var _6=(""+window.location).match(new RegExp(_5));
if(_6[4]){
var _7=_6[4].split(":");
var _8=_7[0];
var _9=_7[1]||"80";
_6=this.url.match(new RegExp(_5));
if(_6[4]){
_7=_6[4].split(":");
var _a=_7[0];
var _b=_7[1]||"80";
this._isXD=((_a!=_8)||(_b!=_9));
}
}
if(!this._isXD){
_3.supportedConnectionTypes=dojo.map(dojox.cometd.connectionTypes.pairs,"return item[0]");
}
_3=this._extendOut(_3);
var _c={url:this.url,handleAs:this.handleAs,content:{"message":dojo.toJson([_3])},load:dojo.hitch(this,function(_d){
this._backon();
this._finishInit(_d);
}),error:dojo.hitch(this,function(e){
this._backoff();
this._finishInit(e);
}),timeout:this.expectedNetworkDelay};
if(_4){
dojo.mixin(_c,_4);
}
this._props=_3;
for(var _e in this._subscriptions){
for(var _f in this._subscriptions[_e]){
if(this._subscriptions[_e][_f].topic){
dojo.unsubscribe(this._subscriptions[_e][_f].topic);
}
}
}
this._messageQ=[];
this._subscriptions=[];
this._initialized=true;
this._status="handshaking";
this.batch=0;
this.startBatch();
var r;
if(this._isXD){
_c.callbackParamName="jsonp";
r=dojo.io.script.get(_c);
}else{
r=dojo.xhrPost(_c);
}
return r;
};
this.publish=function(_10,_11,_12){
var _13={data:_11,channel:_10};
if(_12){
dojo.mixin(_13,_12);
}
this._sendMessage(_13);
};
this.subscribe=function(_14,_15,_16,_17){
_17=_17||{};
if(_15){
var _18=_1+_14;
var _19=this._subscriptions[_18];
if(!_19||_19.length==0){
_19=[];
_17.channel="/meta/subscribe";
_17.subscription=_14;
this._sendMessage(_17);
var _1a=this._deferredSubscribes;
if(_1a[_14]){
_1a[_14].cancel();
delete _1a[_14];
}
_1a[_14]=new dojo.Deferred();
}
for(var i in _19){
if(_19[i].objOrFunc===_15&&(!_19[i].funcName&&!_16||_19[i].funcName==_16)){
return null;
}
}
var _1b=dojo.subscribe(_18,_15,_16);
_19.push({topic:_1b,objOrFunc:_15,funcName:_16});
this._subscriptions[_18]=_19;
}
var ret=this._deferredSubscribes[_14]||{};
ret.args=dojo._toArray(arguments);
return ret;
};
this.unsubscribe=function(_1c,_1d,_1e,_1f){
if((arguments.length==1)&&(!dojo.isString(_1c))&&(_1c.args)){
return this.unsubscribe.apply(this,_1c.args);
}
var _20=_1+_1c;
var _21=this._subscriptions[_20];
if(!_21||_21.length==0){
return null;
}
var s=0;
for(var i in _21){
var sb=_21[i];
if((!_1d)||(sb.objOrFunc===_1d&&(!sb.funcName&&!_1e||sb.funcName==_1e))){
dojo.unsubscribe(_21[i].topic);
delete _21[i];
}else{
s++;
}
}
if(s==0){
_1f=_1f||{};
_1f.channel="/meta/unsubscribe";
_1f.subscription=_1c;
delete this._subscriptions[_20];
this._sendMessage(_1f);
this._deferredUnsubscribes[_1c]=new dojo.Deferred();
if(this._deferredSubscribes[_1c]){
this._deferredSubscribes[_1c].cancel();
delete this._deferredSubscribes[_1c];
}
}
return this._deferredUnsubscribes[_1c];
};
this.disconnect=function(){
for(var _22 in this._subscriptions){
for(var sub in this._subscriptions[_22]){
if(this._subscriptions[_22][sub].topic){
dojo.unsubscribe(this._subscriptions[_22][sub].topic);
}
}
}
this._subscriptions=[];
this._messageQ=[];
if(this._initialized&&this.currentTransport){
this._initialized=false;
this.currentTransport.disconnect();
}
if(!this._polling){
this._publishMeta("connect",false);
}
this._initialized=false;
this._handshook=false;
this._status="disconnected";
this._publishMeta("disconnect",true);
};
this.subscribed=function(_23,_24){
};
this.unsubscribed=function(_25,_26){
};
this.tunnelInit=function(_27,_28){
};
this.tunnelCollapse=function(){
};
this._backoff=function(){
if(!this._advice){
this._advice={reconnect:"retry",interval:0};
}else{
if(!this._advice.interval){
this._advice.interval=0;
}
}
if(this._backoffInterval<this._backoffMax){
this._backoffInterval+=this._backoffIncrement;
}
};
this._backon=function(){
this._backoffInterval=0;
};
this._interval=function(){
var i=this._backoffInterval+(this._advice?(this._advice.interval?this._advice.interval:0):0);
if(i>0){
}
return i;
};
this._publishMeta=function(_29,_2a,_2b){
try{
var _2c={cometd:this,action:_29,successful:_2a,state:this.state()};
if(_2b){
dojo.mixin(_2c,_2b);
}
dojo.publish(this.prefix+"/meta",[_2c]);
}
catch(e){
}
};
this._finishInit=function(_2d){
if(this._status!="handshaking"){
return;
}
var _2e=this._handshook;
var _2f=false;
var _30={};
if(_2d instanceof Error){
dojo.mixin(_30,{reestablish:false,failure:true,error:_2d,advice:this._advice});
}else{
_2d=_2d[0];
_2d=this._extendIn(_2d);
this.handshakeReturn=_2d;
if(_2d["advice"]){
this._advice=_2d.advice;
}
_2f=_2d.successful?_2d.successful:false;
if(_2d.version<this.minimumVersion){
if(console.log){
}
_2f=false;
this._advice.reconnect="none";
}
dojo.mixin(_30,{reestablish:_2f&&_2e,response:_2d});
}
this._publishMeta("handshake",_2f,_30);
if(this._status!="handshaking"){
return;
}
if(_2f){
this._status="connecting";
this._handshook=true;
this.currentTransport=dojox.cometd.connectionTypes.match(_2d.supportedConnectionTypes,_2d.version,this._isXD);
var _31=this.currentTransport;
_31._cometd=this;
_31.version=_2d.version;
this.clientId=_2d.clientId;
this.tunnelInit=_31.tunnelInit&&dojo.hitch(_31,"tunnelInit");
this.tunnelCollapse=_31.tunnelCollapse&&dojo.hitch(_31,"tunnelCollapse");
_31.startup(_2d);
}else{
if(!this._advice||this._advice["reconnect"]!="none"){
setTimeout(dojo.hitch(this,"init",this.url,this._props),this._interval());
}
}
};
this._extendIn=function(_32){
dojo.forEach(dojox.cometd._extendInList,function(f){
_32=f(_32)||_32;
});
return _32;
};
this._extendOut=function(_33){
dojo.forEach(dojox.cometd._extendOutList,function(f){
_33=f(_33)||_33;
});
return _33;
};
this.deliver=function(_34){
dojo.forEach(_34,this._deliver,this);
return _34;
};
this._deliver=function(_35){
_35=this._extendIn(_35);
if(!_35["channel"]){
if(_35["success"]!==true){
return;
}
}
this.lastMessage=_35;
if(_35.advice){
this._advice=_35.advice;
}
var _36=null;
if((_35["channel"])&&(_35.channel.length>5)&&(_35.channel.substr(0,5)=="/meta")){
switch(_35.channel){
case "/meta/connect":
var _37={response:_35};
if(_35.successful){
if(this._status!="connected"){
this._status="connected";
this.endBatch();
}
}
if(this._initialized){
this._publishMeta("connect",_35.successful,_37);
}
break;
case "/meta/subscribe":
_36=this._deferredSubscribes[_35.subscription];
try{
if(!_35.successful){
if(_36){
_36.errback(new Error(_35.error));
}
this.currentTransport.cancelConnect();
return;
}
if(_36){
_36.callback(true);
}
this.subscribed(_35.subscription,_35);
}
catch(e){
log.warn(e);
}
break;
case "/meta/unsubscribe":
_36=this._deferredUnsubscribes[_35.subscription];
try{
if(!_35.successful){
if(_36){
_36.errback(new Error(_35.error));
}
this.currentTransport.cancelConnect();
return;
}
if(_36){
_36.callback(true);
}
this.unsubscribed(_35.subscription,_35);
}
catch(e){
log.warn(e);
}
break;
default:
if(_35.successful&&!_35.successful){
this.currentTransport.cancelConnect();
return;
}
}
}
this.currentTransport.deliver(_35);
if(_35.data){
try{
var _38=[_35];
var _39=_1+_35.channel;
var _3a=_35.channel.split("/");
var _3b=_1;
for(var i=1;i<_3a.length-1;i++){
dojo.publish(_3b+"/**",_38);
_3b+="/"+_3a[i];
}
dojo.publish(_3b+"/**",_38);
dojo.publish(_3b+"/*",_38);
dojo.publish(_39,_38);
}
catch(e){
}
}
};
this._sendMessage=function(_3c){
if(this.currentTransport&&!this.batch){
return this.currentTransport.sendMessages([_3c]);
}else{
this._messageQ.push(_3c);
return null;
}
};
this.startBatch=function(){
this.batch++;
};
this.endBatch=function(){
if(--this.batch<=0&&this.currentTransport&&this._status=="connected"){
this.batch=0;
var _3d=this._messageQ;
this._messageQ=[];
if(_3d.length>0){
this.currentTransport.sendMessages(_3d);
}
}
};
this._onUnload=function(){
dojo.addOnUnload(dojox.cometd,"disconnect");
};
this._connectTimeout=function(){
var _3e=0;
if(this._advice&&this._advice.timeout&&this.expectedNetworkDelay>0){
_3e=this._advice.timeout+this.expectedNetworkDelay;
}
if(this.connectTimeout>0&&this.connectTimeout<_3e){
return this.connectTimeout;
}
return _3e;
};
},connectionTypes:new dojo.AdapterRegistry(true)};
dojox.cometd.Connection.call(dojox.cometd,"/cometd");
dojo.addOnUnload(dojox.cometd,"_onUnload");
}
