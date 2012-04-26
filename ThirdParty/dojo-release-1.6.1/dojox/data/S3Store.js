/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.S3Store"]){
dojo._hasResource["dojox.data.S3Store"]=true;
dojo.provide("dojox.data.S3Store");
dojo.require("dojox.data.JsonRestStore");
dojo.require("dojox.rpc.ProxiedPath");
dojo.declare("dojox.data.S3Store",dojox.data.JsonRestStore,{_processResults:function(_1){
var _2=_1.getElementsByTagName("Key");
var _3=[];
var _4=this;
for(var i=0;i<_2.length;i++){
var _5=_2[i];
var _6={_loadObject:(function(_7,_8){
return function(_9){
delete this._loadObject;
_4.service(_7).addCallback(_9);
};
})(_5.firstChild.nodeValue,_6)};
_3.push(_6);
}
return {totalCount:_3.length,items:_3};
}});
}
