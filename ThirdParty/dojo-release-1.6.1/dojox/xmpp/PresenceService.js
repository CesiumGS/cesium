/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xmpp.PresenceService"]){
dojo._hasResource["dojox.xmpp.PresenceService"]=true;
dojo.provide("dojox.xmpp.PresenceService");
dojox.xmpp.presence={UPDATE:201,SUBSCRIPTION_REQUEST:202,SUBSCRIPTION_SUBSTATUS_NONE:204,SUBSCRIPTION_NONE:"none",SUBSCRIPTION_FROM:"from",SUBSCRIPTION_TO:"to",SUBSCRIPTION_BOTH:"both",SUBSCRIPTION_REQUEST_PENDING:"pending",STATUS_ONLINE:"online",STATUS_AWAY:"away",STATUS_CHAT:"chat",STATUS_DND:"dnd",STATUS_EXTENDED_AWAY:"xa",STATUS_OFFLINE:"offline",STATUS_INVISIBLE:"invisible"};
dojo.declare("dojox.xmpp.PresenceService",null,{constructor:function(_1){
this.session=_1;
this.isInvisible=false;
this.avatarHash=null;
this.presence=null;
this.restrictedContactjids={};
},publish:function(_2){
this.presence=_2;
this._setPresence();
},sendAvatarHash:function(_3){
this.avatarHash=_3;
this._setPresence();
},_setPresence:function(){
var _4=this.presence;
var p={xmlns:"jabber:client"};
if(_4&&_4.to){
p.to=_4.to;
}
if(_4.show&&_4.show==dojox.xmpp.presence.STATUS_OFFLINE){
p.type="unavailable";
}
if(_4.show&&_4.show==dojox.xmpp.presence.STATUS_INVISIBLE){
this._setInvisible();
this.isInvisible=true;
return;
}
if(this.isInvisible){
this._setVisible();
}
var _5=new dojox.string.Builder(dojox.xmpp.util.createElement("presence",p,false));
if(_4.show&&_4.show!=dojox.xmpp.presence.STATUS_OFFLINE){
_5.append(dojox.xmpp.util.createElement("show",{},false));
_5.append(_4.show);
_5.append("</show>");
}
if(_4.status){
_5.append(dojox.xmpp.util.createElement("status",{},false));
_5.append(_4.status);
_5.append("</status>");
}
if(this.avatarHash){
_5.append(dojox.xmpp.util.createElement("x",{xmlns:"vcard-temp:x:update"},false));
_5.append(dojox.xmpp.util.createElement("photo",{},false));
_5.append(this.avatarHash);
_5.append("</photo>");
_5.append("</x>");
}
if(_4.priority&&_4.show!=dojox.xmpp.presence.STATUS_OFFLINE){
if(_4.priority>127||_4.priority<-128){
_4.priority=5;
}
_5.append(dojox.xmpp.util.createElement("priority",{},false));
_5.append(_4.priority);
_5.append("</priority>");
}
_5.append("</presence>");
this.session.dispatchPacket(_5.toString());
},toggleBlockContact:function(_6){
if(!this.restrictedContactjids[_6]){
this.restrictedContactjids[_6]=this._createRestrictedJid();
}
this.restrictedContactjids[_6].blocked=!this.restrictedContactjids[_6].blocked;
this._updateRestricted();
return this.restrictedContactjids;
},toggleContactInvisiblity:function(_7){
if(!this.restrictedContactjids[_7]){
this.restrictedContactjids[_7]=this._createRestrictedJid();
}
this.restrictedContactjids[_7].invisible=!this.restrictedContactjids[_7].invisible;
this._updateRestricted();
return this.restrictedContactjids;
},_createRestrictedJid:function(){
return {invisible:false,blocked:false};
},_updateRestricted:function(){
var _8={id:this.session.getNextIqId(),from:this.session.jid+"/"+this.session.resource,type:"set"};
var _9=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_8,false));
_9.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:privacy"},false));
_9.append(dojox.xmpp.util.createElement("list",{name:"iwcRestrictedContacts"},false));
var _a=1;
for(var _b in this.restrictedContactjids){
var _c=this.restrictedContactjids[_b];
if(_c.blocked||_c.invisible){
_9.append(dojox.xmpp.util.createElement("item",{value:dojox.xmpp.util.encodeJid(_b),action:"deny",order:_a++},false));
if(_c.blocked){
_9.append(dojox.xmpp.util.createElement("message",{},true));
}
if(_c.invisible){
_9.append(dojox.xmpp.util.createElement("presence-out",{},true));
}
_9.append("</item>");
}else{
delete this.restrictedContactjids[_b];
}
}
_9.append("</list>");
_9.append("</query>");
_9.append("</iq>");
var _d=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_8,false));
_d.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:privacy"},false));
_d.append(dojox.xmpp.util.createElement("active",{name:"iwcRestrictedContacts"},true));
_d.append("</query>");
_d.append("</iq>");
this.session.dispatchPacket(_9.toString());
this.session.dispatchPacket(_d.toString());
},_setVisible:function(){
var _e={id:this.session.getNextIqId(),from:this.session.jid+"/"+this.session.resource,type:"set"};
var _f=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_e,false));
_f.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:privacy"},false));
_f.append(dojox.xmpp.util.createElement("active",{},true));
_f.append("</query>");
_f.append("</iq>");
this.session.dispatchPacket(_f.toString());
},_setInvisible:function(){
var _10={id:this.session.getNextIqId(),from:this.session.jid+"/"+this.session.resource,type:"set"};
var req=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_10,false));
req.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:privacy"},false));
req.append(dojox.xmpp.util.createElement("list",{name:"invisible"},false));
req.append(dojox.xmpp.util.createElement("item",{action:"deny",order:"1"},false));
req.append(dojox.xmpp.util.createElement("presence-out",{},true));
req.append("</item>");
req.append("</list>");
req.append("</query>");
req.append("</iq>");
_10={id:this.session.getNextIqId(),from:this.session.jid+"/"+this.session.resource,type:"set"};
var _11=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_10,false));
_11.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:privacy"},false));
_11.append(dojox.xmpp.util.createElement("active",{name:"invisible"},true));
_11.append("</query>");
_11.append("</iq>");
this.session.dispatchPacket(req.toString());
this.session.dispatchPacket(_11.toString());
},_manageSubscriptions:function(_12,_13){
if(!_12){
return;
}
if(_12.indexOf("@")==-1){
_12+="@"+this.session.domain;
}
var req=dojox.xmpp.util.createElement("presence",{to:_12,type:_13},true);
this.session.dispatchPacket(req);
},subscribe:function(_14){
this._manageSubscriptions(_14,"subscribe");
},approveSubscription:function(_15){
this._manageSubscriptions(_15,"subscribed");
},unsubscribe:function(_16){
this._manageSubscriptions(_16,"unsubscribe");
},declineSubscription:function(_17){
this._manageSubscriptions(_17,"unsubscribed");
},cancelSubscription:function(_18){
this._manageSubscriptions(_18,"unsubscribed");
}});
}
