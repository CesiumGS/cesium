/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.TreeAdapter"]){
dojo._hasResource["dojox.wire.TreeAdapter"]=true;
dojo.provide("dojox.wire.TreeAdapter");
dojo.require("dojox.wire.CompositeWire");
dojo.declare("dojox.wire.TreeAdapter",dojox.wire.CompositeWire,{_wireClass:"dojox.wire.TreeAdapter",constructor:function(_1){
this._initializeChildren(this.nodes);
},_getValue:function(_2){
if(!_2||!this.nodes){
return _2;
}
var _3=_2;
if(!dojo.isArray(_3)){
_3=[_3];
}
var _4=[];
for(var i in _3){
for(var i2 in this.nodes){
_4=_4.concat(this._getNodes(_3[i],this.nodes[i2]));
}
}
return _4;
},_setValue:function(_5,_6){
throw new Error("Unsupported API: "+this._wireClass+"._setValue");
},_initializeChildren:function(_7){
if(!_7){
return;
}
for(var i in _7){
var _8=_7[i];
if(_8.node){
_8.node.parent=this;
if(!dojox.wire.isWire(_8.node)){
_8.node=dojox.wire.create(_8.node);
}
}
if(_8.title){
_8.title.parent=this;
if(!dojox.wire.isWire(_8.title)){
_8.title=dojox.wire.create(_8.title);
}
}
if(_8.children){
this._initializeChildren(_8.children);
}
}
},_getNodes:function(_9,_a){
var _b=null;
if(_a.node){
_b=_a.node.getValue(_9);
if(!_b){
return [];
}
if(!dojo.isArray(_b)){
_b=[_b];
}
}else{
_b=[_9];
}
var _c=[];
for(var i in _b){
_9=_b[i];
var _d={};
if(_a.title){
_d.title=_a.title.getValue(_9);
}else{
_d.title=_9;
}
if(_a.children){
var _e=[];
for(var i2 in _a.children){
_e=_e.concat(this._getNodes(_9,_a.children[i2]));
}
if(_e.length>0){
_d.children=_e;
}
}
_c.push(_d);
}
return _c;
}});
}
