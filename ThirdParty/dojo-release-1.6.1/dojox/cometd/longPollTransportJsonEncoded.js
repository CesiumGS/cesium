/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.cometd.longPollTransportJsonEncoded"]){
dojo._hasResource["dojox.cometd.longPollTransportJsonEncoded"]=true;
dojo.provide("dojox.cometd.longPollTransportJsonEncoded");
dojo.require("dojox.cometd._base");
dojox.cometd.longPollTransportJsonEncoded=new function(){
this._connectionType="long-polling";
this._cometd=null;
this.check=function(_1,_2,_3){
return ((!_3)&&(dojo.indexOf(_1,"long-polling")>=0));
};
this.tunnelInit=function(){
var _4={channel:"/meta/connect",clientId:this._cometd.clientId,connectionType:this._connectionType,id:""+this._cometd.messageId++};
_4=this._cometd._extendOut(_4);
this.openTunnelWith([_4]);
};
this.tunnelCollapse=function(){
if(!this._cometd._initialized){
return;
}
if(this._cometd._advice&&this._cometd._advice["reconnect"]=="none"){
return;
}
if(this._cometd._status=="connected"){
setTimeout(dojo.hitch(this,function(){
this._connect();
}),this._cometd._interval());
}else{
setTimeout(dojo.hitch(this._cometd,function(){
this.init(this.url,this._props);
}),this._cometd._interval());
}
};
this._connect=function(){
if(!this._cometd._initialized){
return;
}
if(this._cometd._polling){
return;
}
if((this._cometd._advice)&&(this._cometd._advice["reconnect"]=="handshake")){
this._cometd._status="unconnected";
this._initialized=false;
this._cometd.init(this._cometd.url,this._cometd._props);
}else{
if(this._cometd._status=="connected"){
var _5={channel:"/meta/connect",connectionType:this._connectionType,clientId:this._cometd.clientId,id:""+this._cometd.messageId++};
if(this._cometd.connectTimeout>=this._cometd.expectedNetworkDelay){
_5.advice={timeout:(this._cometd.connectTimeout-this._cometd.expectedNetworkDelay)};
}
_5=this._cometd._extendOut(_5);
this.openTunnelWith([_5]);
}
}
};
this.deliver=function(_6){
};
this.openTunnelWith=function(_7,_8){
this._cometd._polling=true;
var _9={url:(_8||this._cometd.url),postData:dojo.toJson(_7),contentType:"text/json;charset=UTF-8",handleAs:this._cometd.handleAs,load:dojo.hitch(this,function(_a){
this._cometd._polling=false;
this._cometd.deliver(_a);
this._cometd._backon();
this.tunnelCollapse();
}),error:dojo.hitch(this,function(_b){
this._cometd._polling=false;
var _c={failure:true,error:_b,advice:this._cometd._advice};
this._cometd._publishMeta("connect",false,_c);
this._cometd._backoff();
this.tunnelCollapse();
})};
var _d=this._cometd._connectTimeout();
if(_d>0){
_9.timeout=_d;
}
this._poll=dojo.rawXhrPost(_9);
};
this.sendMessages=function(_e){
for(var i=0;i<_e.length;i++){
_e[i].clientId=this._cometd.clientId;
_e[i].id=""+this._cometd.messageId++;
_e[i]=this._cometd._extendOut(_e[i]);
}
return dojo.rawXhrPost({url:this._cometd.url||dojo.config["cometdRoot"],handleAs:this._cometd.handleAs,load:dojo.hitch(this._cometd,"deliver"),postData:dojo.toJson(_e),contentType:"text/json;charset=UTF-8",error:dojo.hitch(this,function(_f){
this._cometd._publishMeta("publish",false,{messages:_e});
}),timeout:this._cometd.expectedNetworkDelay});
};
this.startup=function(_10){
if(this._cometd._status=="connected"){
return;
}
this.tunnelInit();
};
this.disconnect=function(){
var _11={channel:"/meta/disconnect",clientId:this._cometd.clientId,id:""+this._cometd.messageId++};
_11=this._cometd._extendOut(_11);
dojo.rawXhrPost({url:this._cometd.url||dojo.config["cometdRoot"],handleAs:this._cometd.handleAs,postData:dojo.toJson([_11]),contentType:"text/json;charset=UTF-8"});
};
this.cancelConnect=function(){
if(this._poll){
this._poll.cancel();
this._cometd._polling=false;
this._cometd._publishMeta("connect",false,{cancel:true});
this._cometd._backoff();
this.disconnect();
this.tunnelCollapse();
}
};
};
dojox.cometd.longPollTransport=dojox.cometd.longPollTransportJsonEncoded;
dojox.cometd.connectionTypes.register("long-polling",dojox.cometd.longPollTransport.check,dojox.cometd.longPollTransportJsonEncoded);
dojox.cometd.connectionTypes.register("long-polling-json-encoded",dojox.cometd.longPollTransport.check,dojox.cometd.longPollTransportJsonEncoded);
}
