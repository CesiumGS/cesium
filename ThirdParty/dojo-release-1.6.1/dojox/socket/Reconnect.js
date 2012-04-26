/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.socket.Reconnect"]){
dojo._hasResource["dojox.socket.Reconnect"]=true;
dojo.provide("dojox.socket.Reconnect");
dojox.socket.Reconnect=function(_1,_2){
_2=_2||{};
var _3=_2.reconnectTime||10000;
var _4=dojo.connect(_1,"onclose",function(_5){
clearTimeout(_6);
if(!_5.wasClean){
_1.disconnected(function(){
dojox.socket.replace(_1,_7=_1.reconnect());
});
}
});
var _6,_7;
if(!_1.disconnected){
_1.disconnected=function(_8){
setTimeout(function(){
_8();
_6=setTimeout(function(){
if(_7.readyState<2){
_3=_2.reconnectTime||10000;
}
},10000);
},_3);
_3*=_2.backoffRate||2;
};
}
if(!_1.reconnect){
_1.reconnect=function(){
return _1.args?dojox.socket.LongPoll(_1.args):dojox.socket.WebSocket({url:_1.URL||_1.url});
};
}
return _1;
};
}
