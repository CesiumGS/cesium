/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.cometd.ack"]){
dojo._hasResource["dojox.cometd.ack"]=true;
dojo.provide("dojox.cometd.ack");
dojo.require("dojox.cometd._base");
dojox.cometd._ack=new function(){
var _1=false;
var _2=-1;
this._in=function(_3){
if(_3.channel=="/meta/handshake"){
_1=_3.ext&&_3.ext.ack;
}else{
if(_1&&_3.channel=="/meta/connect"&&_3.ext&&_3.ext.ack&&_3.successful){
var _4=parseInt(_3.ext.ack);
_2=_4;
}
}
return _3;
};
this._out=function(_5){
if(_5.channel=="/meta/handshake"){
if(!_5.ext){
_5.ext={};
}
_5.ext.ack=dojox.cometd.ackEnabled;
_2=-1;
}
if(_1&&_5.channel=="/meta/connect"){
if(!_5.ext){
_5.ext={};
}
_5.ext.ack=_2;
}
return _5;
};
};
dojox.cometd._extendInList.push(dojo.hitch(dojox.cometd._ack,"_in"));
dojox.cometd._extendOutList.push(dojo.hitch(dojox.cometd._ack,"_out"));
dojox.cometd.ackEnabled=true;
}
