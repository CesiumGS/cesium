/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.NodeList.delegate"]){
dojo._hasResource["dojox.NodeList.delegate"]=true;
dojo.provide("dojox.NodeList.delegate");
dojo.require("dojo.NodeList-traverse");
dojo.extend(dojo.NodeList,{delegate:function(_1,_2,fn){
return this.connect(_2,function(_3){
var _4=dojo.query(_3.target).closest(_1,this);
if(_4.length){
fn.call(_4[0],_3);
}
});
}});
}
