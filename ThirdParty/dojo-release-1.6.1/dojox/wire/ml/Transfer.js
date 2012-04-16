/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.ml.Transfer"]){
dojo._hasResource["dojox.wire.ml.Transfer"]=true;
dojo.provide("dojox.wire.ml.Transfer");
dojo.provide("dojox.wire.ml.ChildWire");
dojo.provide("dojox.wire.ml.ColumnWire");
dojo.provide("dojox.wire.ml.NodeWire");
dojo.provide("dojox.wire.ml.SegmentWire");
dojo.require("dijit._Widget");
dojo.require("dijit._Container");
dojo.require("dojox.wire._base");
dojo.require("dojox.wire.ml.Action");
dojo.declare("dojox.wire.ml.Transfer",dojox.wire.ml.Action,{source:"",sourceStore:"",sourceAttribute:"",sourcePath:"",type:"",converter:"",delimiter:"",target:"",targetStore:"",targetAttribute:"",targetPath:"",_run:function(){
var _1=this._getWire("source");
var _2=this._getWire("target");
dojox.wire.transfer(_1,_2,arguments);
},_getWire:function(_3){
var _4=undefined;
if(_3=="source"){
_4={object:this.source,dataStore:this.sourceStore,attribute:this.sourceAttribute,path:this.sourcePath,type:this.type,converter:this.converter};
}else{
_4={object:this.target,dataStore:this.targetStore,attribute:this.targetAttribute,path:this.targetPath};
}
if(_4.object){
if(_4.object.length>=9&&_4.object.substring(0,9)=="arguments"){
_4.property=_4.object.substring(9);
_4.object=null;
}else{
var i=_4.object.indexOf(".");
if(i<0){
_4.object=dojox.wire.ml._getValue(_4.object);
}else{
_4.property=_4.object.substring(i+1);
_4.object=dojox.wire.ml._getValue(_4.object.substring(0,i));
}
}
}
if(_4.dataStore){
_4.dataStore=dojox.wire.ml._getValue(_4.dataStore);
}
var _5=undefined;
var _6=this.getChildren();
for(var i in _6){
var _7=_6[i];
if(_7 instanceof dojox.wire.ml.ChildWire&&_7.which==_3){
if(!_5){
_5={};
}
_7._addWire(this,_5);
}
}
if(_5){
_5.object=dojox.wire.create(_4);
_5.dataStore=_4.dataStore;
_4=_5;
}
return _4;
}});
dojo.declare("dojox.wire.ml.ChildWire",dijit._Widget,{which:"source",object:"",property:"",type:"",converter:"",attribute:"",path:"",name:"",_addWire:function(_8,_9){
if(this.name){
if(!_9.children){
_9.children={};
}
_9.children[this.name]=this._getWire(_8);
}else{
if(!_9.children){
_9.children=[];
}
_9.children.push(this._getWire(_8));
}
},_getWire:function(_a){
return {object:(this.object?dojox.wire.ml._getValue(this.object):undefined),property:this.property,type:this.type,converter:this.converter,attribute:this.attribute,path:this.path};
}});
dojo.declare("dojox.wire.ml.ColumnWire",dojox.wire.ml.ChildWire,{column:"",_addWire:function(_b,_c){
if(this.column){
if(!_c.columns){
_c.columns={};
}
_c.columns[this.column]=this._getWire(_b);
}else{
if(!_c.columns){
_c.columns=[];
}
_c.columns.push(this._getWire(_b));
}
}});
dojo.declare("dojox.wire.ml.NodeWire",[dojox.wire.ml.ChildWire,dijit._Container],{titleProperty:"",titleAttribute:"",titlePath:"",_addWire:function(_d,_e){
if(!_e.nodes){
_e.nodes=[];
}
_e.nodes.push(this._getWires(_d));
},_getWires:function(_f){
var _10={node:this._getWire(_f),title:{type:"string",property:this.titleProperty,attribute:this.titleAttribute,path:this.titlePath}};
var _11=[];
var _12=this.getChildren();
for(var i in _12){
var _13=_12[i];
if(_13 instanceof dojox.wire.ml.NodeWire){
_11.push(_13._getWires(_f));
}
}
if(_11.length>0){
_10.children=_11;
}
return _10;
}});
dojo.declare("dojox.wire.ml.SegmentWire",dojox.wire.ml.ChildWire,{_addWire:function(_14,_15){
if(!_15.segments){
_15.segments=[];
}
_15.segments.push(this._getWire(_14));
if(_14.delimiter&&!_15.delimiter){
_15.delimiter=_14.delimiter;
}
}});
}
