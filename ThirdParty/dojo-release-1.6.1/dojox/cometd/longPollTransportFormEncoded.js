/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.cometd.longPollTransportFormEncoded"]){
dojo._hasResource["dojox.cometd.longPollTransportFormEncoded"]=true;
dojo.provide("dojox.cometd.longPollTransportFormEncoded");
dojo.require("dojox.cometd._base");
dojox.cometd.longPollTransportFormEncoded=new function(){
this._connectionType="long-polling";
this._cometd=null;
this.check=function(_1,_2,_3){
return ((!_3)&&(dojo.indexOf(_1,"long-polling")>=0));
};
this.tunnelInit=function(){
var _4={channel:"/meta/connect",clientId:this._cometd.clientId,connectionType:this._connectionType,id:""+this._cometd.messageId++};
_4=this._cometd._extendOut(_4);
this.openTunnelWith({message:dojo.toJson([_4])});
};
this.tunnelCollapse=function(){
if(!this._cometd._initialized){
return;
}
if(this._cometd._advice&&this._cometd._advice["reconnect"]=="none"){
return;
}
var _5=this._cometd._interval();
if(this._cometd._status=="connected"){
setTimeout(dojo.hitch(this,"_connect"),_5);
}else{
setTimeout(dojo.hitch(this._cometd,function(){
this.init(this.url,this._props);
}),_5);
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
var _6={channel:"/meta/connect",connectionType:this._connectionType,clientId:this._cometd.clientId,id:""+this._cometd.messageId++};
if(this._cometd.connectTimeout>=this._cometd.expectedNetworkDelay){
_6.advice={timeout:this._cometd.connectTimeout-this._cometd.expectedNetworkDelay};
}
_6=this._cometd._extendOut(_6);
this.openTunnelWith({message:dojo.toJson([_6])});
}
}
};
this.deliver=function(_7){
};
this.openTunnelWith=function(_8,_9){
this._cometd._polling=true;
var _a={url:(_9||this._cometd.url),content:_8,handleAs:this._cometd.handleAs,load:dojo.hitch(this,function(_b){
this._cometd._polling=false;
this._cometd.deliver(_b);
this._cometd._backon();
this.tunnelCollapse();
}),error:dojo.hitch(this,function(_c){
var _d={failure:true,error:_c,advice:this._cometd._advice};
this._cometd._polling=false;
this._cometd._publishMeta("connect",false,_d);
this._cometd._backoff();
this.tunnelCollapse();
})};
var _e=this._cometd._connectTimeout();
if(_e>0){
_a.timeout=_e;
}
this._poll=dojo.xhrPost(_a);
};
this.sendMessages=function(_f){
for(var i=0;i<_f.length;i++){
_f[i].clientId=this._cometd.clientId;
_f[i].id=""+this._cometd.messageId++;
_f[i]=this._cometd._extendOut(_f[i]);
}
return dojo.xhrPost({url:this._cometd.url||dojo.config["cometdRoot"],handleAs:this._cometd.handleAs,load:dojo.hitch(this._cometd,"deliver"),content:{message:dojo.toJson(_f)},error:dojo.hitch(this,function(err){
this._cometd._publishMeta("publish",false,{messages:_f});
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
dojo.xhrPost({url:this._cometd.url||dojo.config["cometdRoot"],handleAs:this._cometd.handleAs,content:{message:dojo.toJson([_11])}});
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
dojox.cometd.longPollTransport=dojox.cometd.longPollTransportFormEncoded;
dojox.cometd.connectionTypes.register("long-polling",dojox.cometd.longPollTransport.check,dojox.cometd.longPollTransportFormEncoded);
dojox.cometd.connectionTypes.register("long-polling-form-encoded",dojox.cometd.longPollTransport.check,dojox.cometd.longPollTransportFormEncoded);
}
