/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xmpp.RosterService"]){
dojo._hasResource["dojox.xmpp.RosterService"]=true;
dojo.provide("dojox.xmpp.RosterService");
dojox.xmpp.roster={ADDED:101,CHANGED:102,REMOVED:103};
dojo.declare("dojox.xmpp.RosterService",null,{constructor:function(_1){
this.session=_1;
},addRosterItem:function(_2,_3,_4){
if(!_2){
throw new Error("Roster::addRosterItem() - User ID is null");
}
var _5=this.session.getNextIqId();
var _6={id:_5,from:this.session.jid+"/"+this.session.resource,type:"set"};
var _7=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_6,false));
_7.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:roster"},false));
_2=dojox.xmpp.util.encodeJid(_2);
if(_2.indexOf("@")==-1){
_2=_2+"@"+this.session.domain;
}
_7.append(dojox.xmpp.util.createElement("item",{jid:_2,name:dojox.xmpp.util.xmlEncode(_3)},false));
if(_4){
for(var i=0;i<_4.length;i++){
_7.append("<group>");
_7.append(_4[i]);
_7.append("</group>");
}
}
_7.append("</item></query></iq>");
var _8=this.session.dispatchPacket(_7.toString(),"iq",_6.id);
_8.addCallback(this,"verifyRoster");
return _8;
},updateRosterItem:function(_9,_a,_b){
if(_9.indexOf("@")==-1){
_9+=_9+"@"+this.session.domain;
}
var _c={id:this.session.getNextIqId(),from:this.session.jid+"/"+this.session.resource,type:"set"};
var _d=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",_c,false));
_d.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:roster"},false));
var i=this.session.getRosterIndex(_9);
if(i==-1){
return;
}
var _e={jid:_9};
if(_a){
_e.name=_a;
}else{
if(this.session.roster[i].name){
_e.name=this.session.roster[i].name;
}
}
if(_e.name){
_e.name=dojox.xmpp.util.xmlEncode(_e.name);
}
_d.append(dojox.xmpp.util.createElement("item",_e,false));
var _f=_b?_b:this.session.roster[i].groups;
if(_f){
for(var x=0;x<_f.length;x++){
_d.append("<group>");
_d.append(_f[x]);
_d.append("</group>");
}
}
_d.append("</item></query></iq>");
var def=this.session.dispatchPacket(_d.toString(),"iq",_c.id);
def.addCallback(this,"verifyRoster");
return def;
},verifyRoster:function(res){
if(res.getAttribute("type")=="result"){
}else{
var err=this.session.processXmppError(res);
this.onAddRosterItemFailed(err);
}
return res;
},addRosterItemToGroup:function(jid,_10){
if(!jid){
throw new Error("Roster::addRosterItemToGroup() JID is null or undefined");
}
if(!_10){
throw new Error("Roster::addRosterItemToGroup() group is null or undefined");
}
var _11=this.session.getRosterIndex(jid);
if(_11==-1){
return;
}
var _12=this.session.roster[_11];
var _13=[];
var _14=false;
for(var i=0;((_12<_12.groups.length)&&(!_14));i++){
if(_12.groups[i]!=_10){
continue;
}
_14=true;
}
if(!_14){
return this.updateRosterItem(jid,_12.name,_12.groups.concat(_10),_11);
}
return dojox.xmpp.xmpp.INVALID_ID;
},removeRosterGroup:function(_15){
var _16=this.session.roster;
for(var i=0;i<_16.length;i++){
var _17=_16[i];
if(_17.groups.length>0){
for(var j=0;j<_17.groups.length;j++){
if(_17.groups[j]==_15){
_17.groups.splice(j,1);
this.updateRosterItem(_17.jid,_17.name,_17.groups);
}
}
}
}
},renameRosterGroup:function(_18,_19){
var _1a=this.session.roster;
for(var i=0;i<_1a.length;i++){
var _1b=_1a[i];
if(_1b.groups.length>0){
for(var j=0;j<_1b.groups.length;j++){
if(_1b.groups[j]==_18){
_1b.groups[j]=_19;
this.updateRosterItem(_1b.jid,_1b.name,_1b.groups);
}
}
}
}
},removeRosterItemFromGroup:function(jid,_1c){
if(!jid){
throw new Error("Roster::addRosterItemToGroup() JID is null or undefined");
}
if(!_1c){
throw new Error("Roster::addRosterItemToGroup() group is null or undefined");
}
var _1d=this.session.getRosterIndex(jid);
if(_1d==-1){
return;
}
var _1e=this.session.roster[_1d];
var _1f=false;
for(var i=0;((i<_1e.groups.length)&&(!_1f));i++){
if(_1e.groups[i]!=_1c){
continue;
}
_1f=true;
_1d=i;
}
if(_1f==true){
_1e.groups.splice(_1d,1);
return this.updateRosterItem(jid,_1e.name,_1e.groups);
}
return dojox.xmpp.xmpp.INVALID_ID;
},rosterItemRenameGroup:function(jid,_20,_21){
if(!jid){
throw new Error("Roster::rosterItemRenameGroup() JID is null or undefined");
}
if(!_21){
throw new Error("Roster::rosterItemRenameGroup() group is null or undefined");
}
var _22=this.session.getRosterIndex(jid);
if(_22==-1){
return;
}
var _23=this.session.roster[_22];
var _24=false;
for(var i=0;((i<_23.groups.length)&&(!_24));i++){
if(_23.groups[i]==_20){
_23.groups[i]=_21;
_24=true;
}
}
if(_24==true){
return this.updateRosterItem(jid,_23.name,_23.groups);
}
return dojox.xmpp.xmpp.INVALID_ID;
},renameRosterItem:function(jid,_25){
if(!jid){
throw new Error("Roster::addRosterItemToGroup() JID is null or undefined");
}
if(!_25){
throw new Error("Roster::addRosterItemToGroup() New Name is null or undefined");
}
var _26=this.session.getRosterIndex(jid);
if(_26==-1){
return;
}
return this.updateRosterItem(jid,_25,this.session.roster.groups,_26);
},removeRosterItem:function(jid){
if(!jid){
throw new Error("Roster::addRosterItemToGroup() JID is null or undefined");
}
var req={id:this.session.getNextIqId(),from:this.session.jid+"/"+this.session.resource,type:"set"};
var _27=new dojox.string.Builder(dojox.xmpp.util.createElement("iq",req,false));
_27.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:roster"},false));
if(jid.indexOf("@")==-1){
jid+=jid+"@"+this.session.domain;
}
_27.append(dojox.xmpp.util.createElement("item",{jid:jid,subscription:"remove"},true));
_27.append("</query></iq>");
var def=this.session.dispatchPacket(_27.toString(),"iq",req.id);
def.addCallback(this,"verifyRoster");
return def;
},getAvatar:function(jid){
},publishAvatar:function(_28,_29){
},onVerifyRoster:function(id){
},onVerifyRosterFailed:function(err){
}});
}
