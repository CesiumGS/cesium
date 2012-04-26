/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.restListener"]){
dojo._hasResource["dojox.data.restListener"]=true;
dojo.provide("dojox.data.restListener");
dojox.data.restListener=function(_1){
var _2=_1.channel;
var jr=dojox.rpc.JsonRest;
var _3=jr.getServiceAndId(_2).service;
var _4=dojox.json.ref.resolveJson(_1.result,{defaultId:_1.event=="put"&&_2,index:dojox.rpc.Rest._index,idPrefix:_3.servicePath.replace(/[^\/]*$/,""),idAttribute:jr.getIdAttribute(_3),schemas:jr.schemas,loader:jr._loader,assignAbsoluteIds:true});
var _5=dojox.rpc.Rest._index&&dojox.rpc.Rest._index[_2];
var _6="on"+_1.event.toLowerCase();
var _7=_3&&_3._store;
if(_5){
if(_5[_6]){
_5[_6](_4);
return;
}
}
if(_7){
switch(_6){
case "onpost":
_7.onNew(_4);
break;
case "ondelete":
_7.onDelete(_5);
break;
}
}
};
}
