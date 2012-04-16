/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.robotx"]){
dojo._hasResource["dijit.robotx"]=true;
dojo.provide("dijit.robotx");
dojo.require("dijit.robot");
dojo.require("dojo.robotx");
dojo.experimental("dijit.robotx");
(function(){
var _1=doh.robot._updateDocument;
dojo.mixin(doh.robot,{_updateDocument:function(){
_1();
var _2=dojo.global;
if(_2["dijit"]){
window.dijit=_2.dijit;
}
}});
})();
}
