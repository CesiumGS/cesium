/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xmpp.xmppSession"]){
dojo._hasResource["dojox.xmpp.xmppSession"]=true;
dojo.provide("dojox.xmpp.xmppSession");
dojo.require("dojox.xmpp.TransportSession");
dojo.require("dojox.xmpp.RosterService");
dojo.require("dojox.xmpp.PresenceService");
dojo.require("dojox.xmpp.UserService");
dojo.require("dojox.xmpp.ChatService");
dojo.require("dojox.xmpp.sasl");
dojox.xmpp.xmpp={STREAM_NS:"http://etherx.jabber.org/streams",CLIENT_NS:"jabber:client",STANZA_NS:"urn:ietf:params:xml:ns:xmpp-stanzas",SASL_NS:"urn:ietf:params:xml:ns:xmpp-sasl",BIND_NS:"urn:ietf:params:xml:ns:xmpp-bind",SESSION_NS:"urn:ietf:params:xml:ns:xmpp-session",BODY_NS:"http://jabber.org/protocol/httpbind",XHTML_BODY_NS:"http://www.w3.org/1999/xhtml",XHTML_IM_NS:"http://jabber.org/protocol/xhtml-im",INACTIVE:"Inactive",CONNECTED:"Connected",ACTIVE:"Active",TERMINATE:"Terminate",LOGIN_FAILURE:"LoginFailure",INVALID_ID:-1,NO_ID:0,error:{BAD_REQUEST:"bad-request",CONFLICT:"conflict",FEATURE_NOT_IMPLEMENTED:"feature-not-implemented",FORBIDDEN:"forbidden",GONE:"gone",INTERNAL_SERVER_ERROR:"internal-server-error",ITEM_NOT_FOUND:"item-not-found",ID_MALFORMED:"jid-malformed",NOT_ACCEPTABLE:"not-acceptable",NOT_ALLOWED:"not-allowed",NOT_AUTHORIZED:"not-authorized",SERVICE_UNAVAILABLE:"service-unavailable",SUBSCRIPTION_REQUIRED:"subscription-required",UNEXPECTED_REQUEST:"unexpected-request"}};
dojox.xmpp.xmppSession=function(_1){
this.roster=[];
this.chatRegister=[];
this._iqId=Math.round(Math.random()*1000000000);
if(_1&&dojo.isObject(_1)){
dojo.mixin(this,_1);
}
this.session=new dojox.xmpp.TransportSession(_1);
dojo.connect(this.session,"onReady",this,"onTransportReady");
dojo.connect(this.session,"onTerminate",this,"onTransportTerminate");
dojo.connect(this.session,"onProcessProtocolResponse",this,"processProtocolResponse");
};
dojo.extend(dojox.xmpp.xmppSession,{roster:[],chatRegister:[],_iqId:0,open:function(_2,_3,_4){
if(!_2){
throw new Error("User id cannot be null");
}else{
this.jid=_2;
if(_2.indexOf("@")==-1){
this.jid=this.jid+"@"+this.domain;
}
}
if(_3){
this.password=_3;
}
if(_4){
this.resource=_4;
}
this.session.open();
},close:function(){
this.state=dojox.xmpp.xmpp.TERMINATE;
this.session.close(dojox.xmpp.util.createElement("presence",{type:"unavailable",xmlns:dojox.xmpp.xmpp.CLIENT_NS},true));
},processProtocolResponse:function(_5){
var _6=_5.nodeName;
var _7=_6.indexOf(":");
if(_7>0){
_6=_6.substring(_7+1);
}
switch(_6){
case "iq":
case "presence":
case "message":
case "features":
this[_6+"Handler"](_5);
break;
default:
if(_5.getAttribute("xmlns")==dojox.xmpp.xmpp.SASL_NS){
this.saslHandler(_5);
}
}
},messageHandler:function(_8){
switch(_8.getAttribute("type")){
case "chat":
this.chatHandler(_8);
break;
case "normal":
default:
this.simpleMessageHandler(_8);
}
},iqHandler:function(_9){
if(_9.getAttribute("type")=="set"){
this.iqSetHandler(_9);
return;
}else{
if(_9.getAttribute("type")=="get"){
return;
}
}
},presenceHandler:function(_a){
switch(_a.getAttribute("type")){
case "subscribe":
this.presenceSubscriptionRequest(_a.getAttribute("from"));
break;
case "subscribed":
case "unsubscribed":
break;
case "error":
this.processXmppError(_a);
break;
default:
this.presenceUpdate(_a);
break;
}
},featuresHandler:function(_b){
var _c=[];
var _d=false;
var _e=false;
if(_b.hasChildNodes()){
for(var i=0;i<_b.childNodes.length;i++){
var n=_b.childNodes[i];
switch(n.nodeName){
case "mechanisms":
for(var x=0;x<n.childNodes.length;x++){
_c.push(n.childNodes[x].firstChild.nodeValue);
}
break;
case "bind":
_d=true;
break;
case "session":
_e=true;
}
}
}
if(this.state==dojox.xmpp.xmpp.CONNECTED){
if(!this.auth){
for(var i=0;i<_c.length;i++){
try{
this.auth=dojox.xmpp.sasl.registry.match(_c[i],this);
break;
}
catch(e){
console.warn("No suitable auth mechanism found for: ",_c[i]);
}
}
}else{
if(_d){
this.bindResource(_e);
}
}
}
},saslHandler:function(_f){
if(_f.nodeName=="success"){
this.auth.onSuccess();
return;
}
if(_f.nodeName=="challenge"){
this.auth.onChallenge(_f);
return;
}
if(_f.hasChildNodes()){
this.onLoginFailure(_f.firstChild.nodeName);
this.session.setState("Terminate",_f.firstChild.nodeName);
}
},sendRestart:function(){
this.session._sendRestart();
},chatHandler:function(msg){
var _10={from:msg.getAttribute("from"),to:msg.getAttribute("to")};
var _11=null;
for(var i=0;i<msg.childNodes.length;i++){
var n=msg.childNodes[i];
if(n.hasChildNodes()){
switch(n.nodeName){
case "thread":
_10.chatid=n.firstChild.nodeValue;
break;
case "body":
if(!n.getAttribute("xmlns")||(n.getAttribute("xmlns")=="")){
_10.body=n.firstChild.nodeValue;
}
break;
case "subject":
_10.subject=n.firstChild.nodeValue;
case "html":
if(n.getAttribute("xmlns")==dojox.xmpp.xmpp.XHTML_IM_NS){
_10.xhtml=n.getElementsByTagName("body")[0];
}
break;
case "x":
break;
default:
}
}
}
var _12=-1;
if(_10.chatid){
for(var i=0;i<this.chatRegister.length;i++){
var ci=this.chatRegister[i];
if(ci&&ci.chatid==_10.chatid){
_12=i;
break;
}
}
}else{
for(var i=0;i<this.chatRegister.length;i++){
var ci=this.chatRegister[i];
if(ci){
if(ci.uid==this.getBareJid(_10.from)){
_12=i;
}
}
}
}
if(_12>-1&&_11){
var _13=this.chatRegister[_12];
_13.setState(_11);
if(_13.firstMessage){
if(_11==dojox.xmpp.chat.ACTIVE_STATE){
_13.useChatState=(_11!=null)?true:false;
_13.firstMessage=false;
}
}
}
if((!_10.body||_10.body=="")&&!_10.xhtml){
return;
}
if(_12>-1){
var _13=this.chatRegister[_12];
_13.recieveMessage(_10);
}else{
var _14=new dojox.xmpp.ChatService();
_14.uid=this.getBareJid(_10.from);
_14.chatid=_10.chatid;
_14.firstMessage=true;
if(!_11||_11!=dojox.xmpp.chat.ACTIVE_STATE){
this.useChatState=false;
}
this.registerChatInstance(_14,_10);
}
},simpleMessageHandler:function(msg){
},registerChatInstance:function(_15,_16){
_15.setSession(this);
this.chatRegister.push(_15);
this.onRegisterChatInstance(_15,_16);
_15.recieveMessage(_16,true);
},iqSetHandler:function(msg){
if(msg.hasChildNodes()){
var fn=msg.firstChild;
switch(fn.nodeName){
case "query":
if(fn.getAttribute("xmlns")=="jabber:iq:roster"){
this.rosterSetHandler(fn);
this.sendIqResult(msg.getAttribute("id"),msg.getAttribute("from"));
}
break;
default:
break;
}
}
},sendIqResult:function(_17,to){
var req={id:_17,to:to||this.domain,type:"result",from:this.jid+"/"+this.resource};
this.dispatchPacket(dojox.xmpp.util.createElement("iq",req,true));
},rosterSetHandler:function(_18){
for(var i=0;i<_18.childNodes.length;i++){
var n=_18.childNodes[i];
if(n.nodeName=="item"){
var _19=false;
var _1a=-1;
var _1b=null;
var _1c=null;
for(var x=0;x<this.roster.length;x++){
var r=this.roster[x];
if(n.getAttribute("jid")==r.jid){
_19=true;
if(n.getAttribute("subscription")=="remove"){
_1b={id:r.jid,name:r.name,groups:[]};
for(var y=0;y<r.groups.length;y++){
_1b.groups.push(r.groups[y]);
}
this.roster.splice(x,1);
_1a=dojox.xmpp.roster.REMOVED;
}else{
_1c=dojo.clone(r);
var _1d=n.getAttribute("name");
if(_1d){
this.roster[x].name=_1d;
}
r.groups=[];
if(n.getAttribute("subscription")){
r.status=n.getAttribute("subscription");
}
r.substatus=dojox.xmpp.presence.SUBSCRIPTION_SUBSTATUS_NONE;
if(n.getAttribute("ask")=="subscribe"){
r.substatus=dojox.xmpp.presence.SUBSCRIPTION_REQUEST_PENDING;
}
for(var y=0;y<n.childNodes.length;y++){
var _1e=n.childNodes[y];
if((_1e.nodeName=="group")&&(_1e.hasChildNodes())){
var _1f=_1e.firstChild.nodeValue;
r.groups.push(_1f);
}
}
_1b=r;
_1a=dojox.xmpp.roster.CHANGED;
}
break;
}
}
if(!_19&&(n.getAttribute("subscription")!="remove")){
r=this.createRosterEntry(n);
_1b=r;
_1a=dojox.xmpp.roster.ADDED;
}
switch(_1a){
case dojox.xmpp.roster.ADDED:
this.onRosterAdded(_1b);
break;
case dojox.xmpp.roster.REMOVED:
this.onRosterRemoved(_1b);
break;
case dojox.xmpp.roster.CHANGED:
this.onRosterChanged(_1b,_1c);
break;
}
}
}
},presenceUpdate:function(msg){
if(msg.getAttribute("to")){
var jid=this.getBareJid(msg.getAttribute("to"));
if(jid!=this.jid){
return;
}
}
var _20=this.getResourceFromJid(msg.getAttribute("from"));
var p={from:this.getBareJid(msg.getAttribute("from")),resource:_20,show:dojox.xmpp.presence.STATUS_ONLINE,priority:5,hasAvatar:false};
if(msg.getAttribute("type")=="unavailable"){
p.show=dojox.xmpp.presence.STATUS_OFFLINE;
}
for(var i=0;i<msg.childNodes.length;i++){
var n=msg.childNodes[i];
if(n.hasChildNodes()){
switch(n.nodeName){
case "status":
case "show":
p[n.nodeName]=n.firstChild.nodeValue;
break;
case "status":
p.priority=parseInt(n.firstChild.nodeValue);
break;
case "x":
if(n.firstChild&&n.firstChild.firstChild&&n.firstChild.firstChild.nodeValue!=""){
p.avatarHash=n.firstChild.firstChild.nodeValue;
p.hasAvatar=true;
}
break;
}
}
}
this.onPresenceUpdate(p);
},retrieveRoster:function(){
var _21={id:this.getNextIqId(),from:this.jid+"/"+this.resource,type:"get"};
var req=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_21,false));
req.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:roster"},true));
req.append("</iq>");
var def=this.dispatchPacket(req,"iq",_21.id);
def.addCallback(this,"onRetrieveRoster");
},getRosterIndex:function(jid){
if(jid.indexOf("@")==-1){
jid+="@"+this.domain;
}
for(var i=0;i<this.roster.length;i++){
if(jid==this.roster[i].jid){
return i;
}
}
return -1;
},createRosterEntry:function(_22){
var re={name:_22.getAttribute("name"),jid:_22.getAttribute("jid"),groups:[],status:dojox.xmpp.presence.SUBSCRIPTION_NONE,substatus:dojox.xmpp.presence.SUBSCRIPTION_SUBSTATUS_NONE};
if(!re.name){
re.name=re.id;
}
for(var i=0;i<_22.childNodes.length;i++){
var n=_22.childNodes[i];
if(n.nodeName=="group"&&n.hasChildNodes()){
re.groups.push(n.firstChild.nodeValue);
}
}
if(_22.getAttribute("subscription")){
re.status=_22.getAttribute("subscription");
}
if(_22.getAttribute("ask")=="subscribe"){
re.substatus=dojox.xmpp.presence.SUBSCRIPTION_REQUEST_PENDING;
}
return re;
},bindResource:function(_23){
var _24={id:this.getNextIqId(),type:"set"};
var _25=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_24,false));
_25.append(dojox.xmpp.util.createElement("bind",{xmlns:dojox.xmpp.xmpp.BIND_NS},false));
if(this.resource){
_25.append(dojox.xmpp.util.createElement("resource"));
_25.append(this.resource);
_25.append("</resource>");
}
_25.append("</bind></iq>");
var def=this.dispatchPacket(_25,"iq",_24.id);
def.addCallback(this,function(msg){
this.onBindResource(msg,_23);
return msg;
});
},getNextIqId:function(){
return "im_"+this._iqId++;
},presenceSubscriptionRequest:function(msg){
this.onSubscriptionRequest(msg);
},dispatchPacket:function(msg,_26,_27){
if(this.state!="Terminate"){
return this.session.dispatchPacket(msg,_26,_27);
}else{
}
},setState:function(_28,_29){
if(this.state!=_28){
if(this["on"+_28]){
this["on"+_28](_28,this.state,_29);
}
this.state=_28;
}
},search:function(_2a,_2b,_2c){
var req={id:this.getNextIqId(),"xml:lang":this.lang,type:"set",from:this.jid+"/"+this.resource,to:_2b};
var _2d=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",req,false));
_2d.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:search"},false));
_2d.append(dojox.xmpp.util.createElement(_2c,{},false));
_2d.append(_2a);
_2d.append("</").append(_2c).append(">");
_2d.append("</query></iq>");
var def=this.dispatchPacket(_2d.toString,"iq",req.id);
def.addCallback(this,"_onSearchResults");
},_onSearchResults:function(msg){
if((msg.getAttribute("type")=="result")&&(msg.hasChildNodes())){
this.onSearchResults([]);
}
},onLogin:function(){
this.retrieveRoster();
},onLoginFailure:function(msg){
},onBindResource:function(msg,_2e){
if(msg.getAttribute("type")=="result"){
if((msg.hasChildNodes())&&(msg.firstChild.nodeName=="bind")){
var _2f=msg.firstChild;
if((_2f.hasChildNodes())&&(_2f.firstChild.nodeName=="jid")){
if(_2f.firstChild.hasChildNodes()){
var _30=_2f.firstChild.firstChild.nodeValue;
this.jid=this.getBareJid(_30);
this.resource=this.getResourceFromJid(_30);
}
}
if(_2e){
var _31={id:this.getNextIqId(),type:"set"};
var _32=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_31,false));
_32.append(dojox.xmpp.util.createElement("session",{xmlns:dojox.xmpp.xmpp.SESSION_NS},true));
_32.append("</iq>");
var def=this.dispatchPacket(_32,"iq",_31.id);
def.addCallback(this,"onBindSession");
return;
}
}else{
}
this.onLogin();
}else{
if(msg.getAttribute("type")=="error"){
var err=this.processXmppError(msg);
this.onLoginFailure(err);
}
}
},onBindSession:function(msg){
if(msg.getAttribute("type")=="error"){
var err=this.processXmppError(msg);
this.onLoginFailure(err);
}else{
this.onLogin();
}
},onSearchResults:function(_33){
},onRetrieveRoster:function(msg){
if((msg.getAttribute("type")=="result")&&msg.hasChildNodes()){
var _34=msg.getElementsByTagName("query")[0];
if(_34.getAttribute("xmlns")=="jabber:iq:roster"){
for(var i=0;i<_34.childNodes.length;i++){
if(_34.childNodes[i].nodeName=="item"){
this.roster[i]=this.createRosterEntry(_34.childNodes[i]);
}
}
}
}else{
if(msg.getAttribute("type")=="error"){
}
}
this.setState(dojox.xmpp.xmpp.ACTIVE);
this.onRosterUpdated();
return msg;
},onRosterUpdated:function(){
},onSubscriptionRequest:function(req){
},onPresenceUpdate:function(p){
},onTransportReady:function(){
this.setState(dojox.xmpp.xmpp.CONNECTED);
this.rosterService=new dojox.xmpp.RosterService(this);
this.presenceService=new dojox.xmpp.PresenceService(this);
this.userService=new dojox.xmpp.UserService(this);
},onTransportTerminate:function(_35,_36,_37){
this.setState(dojox.xmpp.xmpp.TERMINATE,_37);
},onConnected:function(){
},onTerminate:function(_38,_39,_3a){
},onActive:function(){
},onRegisterChatInstance:function(_3b,_3c){
},onRosterAdded:function(ri){
},onRosterRemoved:function(ri){
},onRosterChanged:function(ri,_3d){
},processXmppError:function(msg){
var err={stanzaType:msg.nodeName,id:msg.getAttribute("id")};
for(var i=0;i<msg.childNodes.length;i++){
var n=msg.childNodes[i];
switch(n.nodeName){
case "error":
err.errorType=n.getAttribute("type");
for(var x=0;x<n.childNodes.length;x++){
var cn=n.childNodes[x];
if((cn.nodeName=="text")&&(cn.getAttribute("xmlns")==dojox.xmpp.xmpp.STANZA_NS)&&cn.hasChildNodes()){
err.message=cn.firstChild.nodeValue;
}else{
if((cn.getAttribute("xmlns")==dojox.xmpp.xmpp.STANZA_NS)&&(!cn.hasChildNodes())){
err.condition=cn.nodeName;
}
}
}
break;
default:
break;
}
}
return err;
},sendStanzaError:function(_3e,to,id,_3f,_40,_41){
var req={type:"error"};
if(to){
req.to=to;
}
if(id){
req.id=id;
}
var _42=new dojox.string.Builder(dojox.xmpp.util.createElement(_3e,req,false));
_42.append(dojox.xmpp.util.createElement("error",{type:_3f},false));
_42.append(dojox.xmpp.util.createElement("condition",{xmlns:dojox.xmpp.xmpp.STANZA_NS},true));
if(_41){
var _43={xmlns:dojox.xmpp.xmpp.STANZA_NS,"xml:lang":this.lang};
_42.append(dojox.xmpp.util.createElement("text",_43,false));
_42.append(_41).append("</text>");
}
_42.append("</error></").append(_3e).append(">");
this.dispatchPacket(_42.toString());
},getBareJid:function(jid){
var i=jid.indexOf("/");
if(i!=-1){
return jid.substring(0,i);
}
return jid;
},getResourceFromJid:function(jid){
var i=jid.indexOf("/");
if(i!=-1){
return jid.substring((i+1),jid.length);
}
return "";
}});
}
