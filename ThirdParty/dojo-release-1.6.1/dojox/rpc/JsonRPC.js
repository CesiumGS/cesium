/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.rpc.JsonRPC"]){
dojo._hasResource["dojox.rpc.JsonRPC"]=true;
dojo.provide("dojox.rpc.JsonRPC");
dojo.require("dojox.rpc.Service");
function jsonRpcEnvelope(_1){
return {serialize:function(_2,_3,_4,_5){
var d={id:this._requestId++,method:_3.name,params:_4};
if(_1){
d.jsonrpc=_1;
}
return {data:dojo.toJson(d),handleAs:"json",contentType:"application/json",transport:"POST"};
},deserialize:function(_6){
if("Error"==_6.name){
_6=dojo.fromJson(_6.responseText);
}
if(_6.error){
var e=new Error(_6.error.message||_6.error);
e._rpcErrorObject=_6.error;
return e;
}
return _6.result;
}};
};
dojox.rpc.envelopeRegistry.register("JSON-RPC-1.0",function(_7){
return _7=="JSON-RPC-1.0";
},dojo.mixin({namedParams:false},jsonRpcEnvelope()));
dojox.rpc.envelopeRegistry.register("JSON-RPC-2.0",function(_8){
return _8=="JSON-RPC-2.0";
},jsonRpcEnvelope("2.0"));
}
