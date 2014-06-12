/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/NodeList-html",["./query","./_base/lang","./html"],function(_1,_2,_3){
var _4=_1.NodeList;
_2.extend(_4,{html:function(_5,_6){
var _7=new _3._ContentSetter(_6||{});
this.forEach(function(_8){
_7.node=_8;
_7.set(_5);
_7.tearDown();
});
return this;
}});
return _4;
});
