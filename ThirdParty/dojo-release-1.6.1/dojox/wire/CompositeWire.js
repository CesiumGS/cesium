/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.CompositeWire"]){
dojo._hasResource["dojox.wire.CompositeWire"]=true;
dojo.provide("dojox.wire.CompositeWire");
dojo.require("dojox.wire._base");
dojo.require("dojox.wire.Wire");
dojo.declare("dojox.wire.CompositeWire",dojox.wire.Wire,{_wireClass:"dojox.wire.CompositeWire",constructor:function(_1){
this._initializeChildren(this.children);
},_getValue:function(_2){
if(!_2||!this.children){
return _2;
}
var _3=(dojo.isArray(this.children)?[]:{});
for(var c in this.children){
_3[c]=this.children[c].getValue(_2);
}
return _3;
},_setValue:function(_4,_5){
if(!_4||!this.children){
return _4;
}
for(var c in this.children){
this.children[c].setValue(_5[c],_4);
}
return _4;
},_initializeChildren:function(_6){
if(!_6){
return;
}
for(var c in _6){
var _7=_6[c];
_7.parent=this;
if(!dojox.wire.isWire(_7)){
_6[c]=dojox.wire.create(_7);
}
}
}});
}
