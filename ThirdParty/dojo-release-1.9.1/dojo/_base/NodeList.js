/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/NodeList",["./kernel","../query","./array","./html","../NodeList-dom"],function(_1,_2,_3){
var _4=_2.NodeList,_5=_4.prototype;
_5.connect=_4._adaptAsForEach(function(){
return _1.connect.apply(this,arguments);
});
_5.coords=_4._adaptAsMap(_1.coords);
_4.events=["blur","focus","change","click","error","keydown","keypress","keyup","load","mousedown","mouseenter","mouseleave","mousemove","mouseout","mouseover","mouseup","submit"];
_3.forEach(_4.events,function(_6){
var _7="on"+_6;
_5[_7]=function(a,b){
return this.connect(_7,a,b);
};
});
_1.NodeList=_4;
return _4;
});
