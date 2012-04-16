/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.NodeList-html"]){
dojo._hasResource["dojo.NodeList-html"]=true;
dojo.provide("dojo.NodeList-html");
dojo.require("dojo.html");
dojo.extend(dojo.NodeList,{html:function(_1,_2){
var _3=new dojo.html._ContentSetter(_2||{});
this.forEach(function(_4){
_3.node=_4;
_3.set(_1);
_3.tearDown();
});
return this;
}});
}
