/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.JsonQueryRestStore"]){
dojo._hasResource["dojox.data.JsonQueryRestStore"]=true;
dojo.provide("dojox.data.JsonQueryRestStore");
dojo.require("dojox.data.JsonRestStore");
dojo.require("dojox.data.util.JsonQuery");
dojo.requireIf(!!dojox.data.ClientFilter,"dojox.json.query");
dojo.declare("dojox.data.JsonQueryRestStore",[dojox.data.JsonRestStore,dojox.data.util.JsonQuery],{matchesQuery:function(_1,_2){
return _1.__id&&(_1.__id.indexOf("#")==-1)&&this.inherited(arguments);
}});
}
