/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.rpc.Client"]){
dojo._hasResource["dojox.rpc.Client"]=true;
dojo.provide("dojox.rpc.Client");
(function(){
dojo._defaultXhr=dojo.xhr;
dojo.xhr=function(_1,_2){
var _3=_2.headers=_2.headers||{};
_3["Client-Id"]=dojox.rpc.Client.clientId;
_3["Seq-Id"]=dojox._reqSeqId=(dojox._reqSeqId||0)+1;
return dojo._defaultXhr.apply(dojo,arguments);
};
})();
dojox.rpc.Client.clientId=(Math.random()+"").substring(2,14)+(new Date().getTime()+"").substring(8,13);
}
