/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.ext-dojo.NodeList"]){
dojo._hasResource["dojox.dtl.ext-dojo.NodeList"]=true;
dojo.provide("dojox.dtl.ext-dojo.NodeList");
dojo.require("dojox.dtl._base");
dojo.extend(dojo.NodeList,{dtl:function(_1,_2){
var d=dojox.dtl;
var _3=this;
var _4=function(_5,_6){
var _7=_5.render(new d._Context(_6));
_3.forEach(function(_8){
_8.innerHTML=_7;
});
};
d.text._resolveTemplateArg(_1).addCallback(function(_9){
_1=new d.Template(_9);
d.text._resolveContextArg(_2).addCallback(function(_a){
_4(_1,_a);
});
});
return this;
}});
}
