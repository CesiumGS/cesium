/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xmpp.sasl"]){
dojo._hasResource["dojox.xmpp.sasl"]=true;
dojo.provide("dojox.xmpp.sasl");
dojo.require("dojox.xmpp.util");
dojo.require("dojo.AdapterRegistry");
dojo.require("dojox.encoding.digests.MD5");
dojox.xmpp.sasl.saslNS="urn:ietf:params:xml:ns:xmpp-sasl";
dojo.declare("dojox.xmpp.sasl._Base",null,{mechanism:null,closeAuthTag:true,constructor:function(_1){
this.session=_1;
this.startAuth();
},startAuth:function(){
var _2=new dojox.string.Builder(dojox.xmpp.util.createElement("auth",{xmlns:dojox.xmpp.sasl.saslNS,mechanism:this.mechanism},this.closeAuthTag));
this.appendToAuth(_2);
this.session.dispatchPacket(_2.toString());
},appendToAuth:function(_3){
},onChallenge:function(_4){
if(!this.first_challenge){
this.first_challenge=true;
this.onFirstChallenge(_4);
}else{
this.onSecondChallenge(_4);
}
},onFirstChallenge:function(){
},onSecondChallenge:function(){
},onSuccess:function(){
this.session.sendRestart();
}});
dojo.declare("dojox.xmpp.sasl.SunWebClientAuth",dojox.xmpp.sasl._Base,{mechanism:"SUN-COMMS-CLIENT-PROXY-AUTH"});
dojo.declare("dojox.xmpp.sasl.Plain",dojox.xmpp.sasl._Base,{mechanism:"PLAIN",closeAuthTag:false,appendToAuth:function(_5){
var id=this.session.jid;
var _6=this.session.jid.indexOf("@");
if(_6!=-1){
id=this.session.jid.substring(0,_6);
}
var _7=this.session.jid+"\x00"+id+"\x00"+this.session.password;
_7=dojox.xmpp.util.Base64.encode(_7);
_5.append(_7);
_5.append("</auth>");
delete this.session.password;
}});
dojo.declare("dojox.xmpp.sasl.DigestMD5",dojox.xmpp.sasl._Base,{mechanism:"DIGEST-MD5",onFirstChallenge:function(_8){
var _9=dojox.encoding.digests;
var _a=dojox.encoding.digests.outputTypes;
var _b=function(n){
return _9.MD5(n,_a.Hex);
};
var H=function(s){
return _9.MD5(s,_a.String);
};
var _c=dojox.xmpp.util.Base64.decode(_8.firstChild.nodeValue);
var ch={realm:"",nonce:"",qop:"auth",maxbuf:65536};
_c.replace(/([a-z]+)=([^,]+)/g,function(t,k,v){
v=v.replace(/^"(.+)"$/,"$1");
ch[k]=v;
});
var _d="";
switch(ch.qop){
case "auth-int":
case "auth-conf":
_d=":00000000000000000000000000000000";
case "auth":
break;
default:
return false;
}
var _e=_9.MD5(Math.random()*1234567890,_a.Hex);
var _f="xmpp/"+this.session.domain;
var _10=this.session.jid;
var _11=this.session.jid.indexOf("@");
if(_11!=-1){
_10=this.session.jid.substring(0,_11);
}
_10=dojox.xmpp.util.encodeJid(_10);
var A1=new dojox.string.Builder();
A1.append(H(_10+":"+ch.realm+":"+this.session.password),":",ch.nonce+":"+_e);
delete this.session.password;
var _12=":"+_f+_d;
var A2="AUTHENTICATE"+_12;
var _13=new dojox.string.Builder();
_13.append(_b(A1.toString()),":",ch.nonce,":00000001:",_e,":",ch.qop,":");
var ret=new dojox.string.Builder();
ret.append("username=\"",_10,"\",","realm=\"",ch.realm,"\",","nonce=",ch.nonce,",","cnonce=\"",_e,"\",","nc=\"00000001\",qop=\"",ch.qop,"\",digest-uri=\"",_f,"\",","response=\"",_b(_13.toString()+_b(A2)),"\",charset=\"utf-8\"");
var _14=new dojox.string.Builder(dojox.xmpp.util.createElement("response",{xmlns:dojox.xmpp.xmpp.SASL_NS},false));
_14.append(dojox.xmpp.util.Base64.encode(ret.toString()));
_14.append("</response>");
this.rspauth=_b(_13.toString()+_b(_12));
this.session.dispatchPacket(_14.toString());
},onSecondChallenge:function(msg){
var _15=dojox.xmpp.util.Base64.decode(msg.firstChild.nodeValue);
if(this.rspauth==_15.substring(8)){
var _16=new dojox.string.Builder(dojox.xmpp.util.createElement("response",{xmlns:dojox.xmpp.xmpp.SASL_NS},true));
this.session.dispatchPacket(_16.toString());
}else{
}
}});
dojox.xmpp.sasl.registry=new dojo.AdapterRegistry();
dojox.xmpp.sasl.registry.register("SUN-COMMS-CLIENT-PROXY-AUTH",function(_17){
return _17=="SUN-COMMS-CLIENT-PROXY-AUTH";
},function(_18,_19){
return new dojox.xmpp.sasl.SunWebClientAuth(_19);
});
dojox.xmpp.sasl.registry.register("DIGEST-MD5",function(_1a){
return _1a=="DIGEST-MD5";
},function(_1b,_1c){
return new dojox.xmpp.sasl.DigestMD5(_1c);
});
dojox.xmpp.sasl.registry.register("PLAIN",function(_1d){
return _1d=="PLAIN";
},function(_1e,_1f){
return new dojox.xmpp.sasl.Plain(_1f);
});
}
