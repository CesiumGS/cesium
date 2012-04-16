/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.cometd.callbackPollTransport"]){
dojo._hasResource["dojox.cometd.callbackPollTransport"]=true;
dojo.provide("dojox.cometd.callbackPollTransport");
dojo.require("dojox.cometd._base");
dojo.require("dojox.cometd.longPollTransport");
dojo.require("dojo.io.script");
dojox.cometd.callbackPollTransport=new function(){
this._connectionType="callback-polling";
this._cometd=null;
this.check=function(_1,_2,_3){
return (dojo.indexOf(_1,"callback-polling")>=0);
};
this.tunnelInit=function(){
var _4={channel:"/meta/connect",clientId:this._cometd.clientId,connectionType:this._connectionType,id:""+this._cometd.messageId++};
_4=this._cometd._extendOut(_4);
this.openTunnelWith([_4]);
};
this.tunnelCollapse=dojox.cometd.longPollTransport.tunnelCollapse;
this._connect=dojox.cometd.longPollTransport._connect;
this.deliver=dojox.cometd.longPollTransport.deliver;
this.openTunnelWith=function(_5,_6){
this._cometd._polling=true;
var _7={load:dojo.hitch(this,function(_8){
this._cometd._polling=false;
this._cometd.deliver(_8);
this._cometd._backon();
this.tunnelCollapse();
}),error:dojo.hitch(this,function(_9){
this._cometd._polling=false;
this._cometd._publishMeta("connect",false);
this._cometd._backoff();
this.tunnelCollapse();
}),url:(_6||this._cometd.url),content:{message:dojo.toJson(_5)},callbackParamName:"jsonp"};
var _a=this._cometd._connectTimeout();
if(_a>0){
_7.timeout=_a;
}
dojo.io.script.get(_7);
};
this.sendMessages=function(_b){
for(var i=0;i<_b.length;i++){
_b[i].clientId=this._cometd.clientId;
_b[i].id=""+this._cometd.messageId++;
_b[i]=this._cometd._extendOut(_b[i]);
}
var _c={url:this._cometd.url||dojo.config["cometdRoot"],load:dojo.hitch(this._cometd,"deliver"),callbackParamName:"jsonp",content:{message:dojo.toJson(_b)},error:dojo.hitch(this,function(_d){
this._cometd._publishMeta("publish",false,{messages:_b});
}),timeout:this._cometd.expectedNetworkDelay};
return dojo.io.script.get(_c);
};
this.startup=function(_e){
if(this._cometd._connected){
return;
}
this.tunnelInit();
};
this.disconnect=dojox.cometd.longPollTransport.disconnect;
this.disconnect=function(){
var _f={channel:"/meta/disconnect",clientId:this._cometd.clientId,id:""+this._cometd.messageId++};
_f=this._cometd._extendOut(_f);
dojo.io.script.get({url:this._cometd.url||dojo.config["cometdRoot"],callbackParamName:"jsonp",content:{message:dojo.toJson([_f])}});
};
this.cancelConnect=function(){
};
};
dojox.cometd.connectionTypes.register("callback-polling",dojox.cometd.callbackPollTransport.check,dojox.cometd.callbackPollTransport);
}
