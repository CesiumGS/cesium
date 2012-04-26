/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.cometd.timestamp"]){
dojo._hasResource["dojox.cometd.timestamp"]=true;
dojo.provide("dojox.cometd.timestamp");
dojo.require("dojox.cometd._base");
dojox.cometd._extendOutList.push(function(_1){
_1.timestamp=new Date().toUTCString();
return _1;
});
}
