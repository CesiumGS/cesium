/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xmpp.TransportSession"]){
dojo._hasResource["dojox.xmpp.TransportSession"]=true;
dojo.provide("dojox.xmpp.TransportSession");
dojo.require("dojox.xmpp.bosh");
dojo.require("dojox.xmpp.util");
dojo.require("dojox.data.dom");
dojox.xmpp.TransportSession=function(_1){
this.sendTimeout=(this.wait+20)*1000;
if(_1&&dojo.isObject(_1)){
dojo.mixin(this,_1);
if(this.useScriptSrcTransport){
this.transportIframes=[];
}
}
};
dojo.extend(dojox.xmpp.TransportSession,{rid:0,hold:1,polling:1000,secure:false,wait:60,lang:"en",submitContentType:"text/xml; charset=utf=8",serviceUrl:"/httpbind",defaultResource:"dojoIm",domain:"imserver.com",sendTimeout:0,useScriptSrcTransport:false,keepAliveTimer:null,state:"NotReady",transmitState:"Idle",protocolPacketQueue:[],outboundQueue:[],outboundRequests:{},inboundQueue:[],deferredRequests:{},matchTypeIdAttribute:{},open:function(){
this.status="notReady";
this.rid=Math.round(Math.random()*1000000000);
this.protocolPacketQueue=[];
this.outboundQueue=[];
this.outboundRequests={};
this.inboundQueue=[];
this.deferredRequests={};
this.matchTypeIdAttribute={};
this.keepAliveTimer=setTimeout(dojo.hitch(this,"_keepAlive"),10000);
if(this.useScriptSrcTransport){
dojox.xmpp.bosh.initialize({iframes:this.hold+1,load:dojo.hitch(this,function(){
this._sendLogin();
})});
}else{
this._sendLogin();
}
},_sendLogin:function(){
var _2=this.rid++;
var _3={content:this.submitContentType,hold:this.hold,rid:_2,to:this.domain,secure:this.secure,wait:this.wait,"xml:lang":this.lang,"xmpp:version":"1.0",xmlns:dojox.xmpp.xmpp.BODY_NS,"xmlns:xmpp":"urn:xmpp:xbosh"};
var _4=dojox.xmpp.util.createElement("body",_3,true);
this.addToOutboundQueue(_4,_2);
},_sendRestart:function(){
var _5=this.rid++;
var _6={rid:_5,sid:this.sid,to:this.domain,"xmpp:restart":"true","xml:lang":this.lang,xmlns:dojox.xmpp.xmpp.BODY_NS,"xmlns:xmpp":"urn:xmpp:xbosh"};
var _7=dojox.xmpp.util.createElement("body",_6,true);
this.addToOutboundQueue(_7,_5);
},processScriptSrc:function(_8,_9){
var _a=dojox.xml.parser.parse(_8,"text/xml");
if(_a){
this.processDocument(_a,_9);
}else{
}
},_keepAlive:function(){
if(this.state=="wait"||this.isTerminated()){
return;
}
this._dispatchPacket();
this.keepAliveTimer=setTimeout(dojo.hitch(this,"_keepAlive"),10000);
},close:function(_b){
var _c=this.rid++;
var _d={sid:this.sid,rid:_c,type:"terminate"};
var _e=null;
if(_b){
_e=new dojox.string.Builder(dojox.xmpp.util.createElement("body",_d,false));
_e.append(_b);
_e.append("</body>");
}else{
_e=new dojox.string.Builder(dojox.xmpp.util.createElement("body",_d,false));
}
this.addToOutboundQueue(_e.toString(),_c);
this.state=="Terminate";
},dispatchPacket:function(_f,_10,_11,_12){
if(_f){
this.protocolPacketQueue.push(_f);
}
var def=new dojo.Deferred();
if(_10&&_11){
def.protocolMatchType=_10;
def.matchId=_11;
def.matchProperty=_12||"id";
if(def.matchProperty!="id"){
this.matchTypeIdAttribute[_10]=def.matchProperty;
}
}
this.deferredRequests[def.protocolMatchType+"-"+def.matchId]=def;
if(!this.dispatchTimer){
this.dispatchTimer=setTimeout(dojo.hitch(this,"_dispatchPacket"),600);
}
return def;
},_dispatchPacket:function(){
clearTimeout(this.dispatchTimer);
delete this.dispatchTimer;
if(!this.sid){
return;
}
if(!this.authId){
return;
}
if(this.transmitState!="error"&&(this.protocolPacketQueue.length==0)&&(this.outboundQueue.length>0)){
return;
}
if(this.state=="wait"||this.isTerminated()){
return;
}
var req={sid:this.sid,xmlns:dojox.xmpp.xmpp.BODY_NS};
var _13;
if(this.protocolPacketQueue.length>0){
req.rid=this.rid++;
_13=new dojox.string.Builder(dojox.xmpp.util.createElement("body",req,false));
_13.append(this.processProtocolPacketQueue());
_13.append("</body>");
delete this.lastPollTime;
}else{
if(this.lastPollTime){
var now=new Date().getTime();
if(now-this.lastPollTime<this.polling){
this.dispatchTimer=setTimeout(dojo.hitch(this,"_dispatchPacket"),this.polling-(now-this.lastPollTime)+10);
return;
}
}
req.rid=this.rid++;
this.lastPollTime=new Date().getTime();
_13=new dojox.string.Builder(dojox.xmpp.util.createElement("body",req,true));
}
this.addToOutboundQueue(_13.toString(),req.rid);
},redispatchPacket:function(rid){
var env=this.outboundRequests[rid];
this.sendXml(env,rid);
},addToOutboundQueue:function(msg,rid){
this.outboundQueue.push({msg:msg,rid:rid});
this.outboundRequests[rid]=msg;
this.sendXml(msg,rid);
},removeFromOutboundQueue:function(rid){
for(var i=0;i<this.outboundQueue.length;i++){
if(rid==this.outboundQueue[i]["rid"]){
this.outboundQueue.splice(i,1);
break;
}
}
delete this.outboundRequests[rid];
},processProtocolPacketQueue:function(){
var _14=new dojox.string.Builder();
for(var i=0;i<this.protocolPacketQueue.length;i++){
_14.append(this.protocolPacketQueue[i]);
}
this.protocolPacketQueue=[];
return _14.toString();
},sendXml:function(_15,rid){
if(this.isTerminated()){
return false;
}
this.transmitState="transmitting";
var def=null;
if(this.useScriptSrcTransport){
def=dojox.xmpp.bosh.get({rid:rid,url:this.serviceUrl+"?"+encodeURIComponent(_15),error:dojo.hitch(this,function(res,io){
this.setState("Terminate","error");
return false;
}),timeout:this.sendTimeout});
}else{
def=dojo.rawXhrPost({contentType:"text/xml",url:this.serviceUrl,postData:_15,handleAs:"xml",error:dojo.hitch(this,function(res,io){
return this.processError(io.xhr.responseXML,io.xhr.status,rid);
}),timeout:this.sendTimeout});
}
def.addCallback(this,function(res){
return this.processDocument(res,rid);
});
return def;
},processDocument:function(doc,rid){
if(this.isTerminated()||!doc.firstChild){
return false;
}
this.transmitState="idle";
var _16=doc.firstChild;
if(_16.nodeName!="body"){
}
if(this.outboundQueue.length<1){
return false;
}
var _17=this.outboundQueue[0]["rid"];
if(rid==_17){
this.removeFromOutboundQueue(rid);
this.processResponse(_16,rid);
this.processInboundQueue();
}else{
var gap=rid-_17;
if(gap<this.hold+2){
this.addToInboundQueue(doc,rid);
}else{
}
}
return doc;
},processInboundQueue:function(){
while(this.inboundQueue.length>0){
var _18=this.inboundQueue.shift();
this.processDocument(_18["doc"],_18["rid"]);
}
},addToInboundQueue:function(doc,rid){
for(var i=0;i<this.inboundQueue.length;i++){
if(rid<this.inboundQueue[i]["rid"]){
continue;
}
this.inboundQueue.splice(i,0,{doc:doc,rid:rid});
}
},processResponse:function(_19,rid){
if(_19.getAttribute("type")=="terminate"){
var _1a=_19.firstChild.firstChild;
var _1b="";
if(_1a.nodeName=="conflict"){
_1b="conflict";
}
this.setState("Terminate",_1b);
return;
}
if((this.state!="Ready")&&(this.state!="Terminate")){
var sid=_19.getAttribute("sid");
if(sid){
this.sid=sid;
}else{
throw new Error("No sid returned during xmpp session startup");
}
this.authId=_19.getAttribute("authid");
if(this.authId==""){
if(this.authRetries--<1){
console.error("Unable to obtain Authorization ID");
this.terminateSession();
}
}
this.wait=_19.getAttribute("wait");
if(_19.getAttribute("polling")){
this.polling=parseInt(_19.getAttribute("polling"))*1000;
}
this.inactivity=_19.getAttribute("inactivity");
this.setState("Ready");
}
dojo.forEach(_19.childNodes,function(_1c){
this.processProtocolResponse(_1c,rid);
},this);
if(this.transmitState=="idle"){
this.dispatchPacket();
}
},processProtocolResponse:function(msg,rid){
this.onProcessProtocolResponse(msg);
var key=msg.nodeName+"-"+msg.getAttribute("id");
var def=this.deferredRequests[key];
if(def){
def.callback(msg);
delete this.deferredRequests[key];
}
},setState:function(_1d,_1e){
if(this.state!=_1d){
if(this["on"+_1d]){
this["on"+_1d](_1d,this.state,_1e);
}
this.state=_1d;
}
},isTerminated:function(){
return this.state=="Terminate";
},processError:function(err,_1f,rid){
if(this.isTerminated()){
return false;
}
if(_1f!=200){
if(_1f>=400&&_1f<500){
this.setState("Terminate",_20);
return false;
}else{
this.removeFromOutboundQueue(rid);
setTimeout(dojo.hitch(this,function(){
this.dispatchPacket();
}),200);
return true;
}
return false;
}
if(err&&err.dojoType&&err.dojoType=="timeout"){
}
this.removeFromOutboundQueue(rid);
if(err&&err.firstChild){
if(err.firstChild.getAttribute("type")=="terminate"){
var _21=err.firstChild.firstChild;
var _20="";
if(_21&&_21.nodeName=="conflict"){
_20="conflict";
}
this.setState("Terminate",_20);
return false;
}
}
this.transmitState="error";
setTimeout(dojo.hitch(this,function(){
this.dispatchPacket();
}),200);
return true;
},onTerminate:function(_22,_23,_24){
},onProcessProtocolResponse:function(msg){
},onReady:function(_25,_26){
}});
}
