/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.ml.DataStore"]){
dojo._hasResource["dojox.wire.ml.DataStore"]=true;
dojo.provide("dojox.wire.ml.DataStore");
dojo.require("dijit._Widget");
dojo.require("dojox.wire._base");
dojo.declare("dojox.wire.ml.DataStore",dijit._Widget,{storeClass:"",postCreate:function(){
this.store=this._createStore();
},_createStore:function(){
if(!this.storeClass){
return null;
}
var _1=dojox.wire._getClass(this.storeClass);
if(!_1){
return null;
}
var _2={};
var _3=this.domNode.attributes;
for(var i=0;i<_3.length;i++){
var a=_3.item(i);
if(a.specified&&!this[a.nodeName]){
_2[a.nodeName]=a.nodeValue;
}
}
return new _1(_2);
},getFeatures:function(){
return this.store.getFeatures();
},fetch:function(_4){
return this.store.fetch(_4);
},save:function(_5){
this.store.save(_5);
},newItem:function(_6){
return this.store.newItem(_6);
},deleteItem:function(_7){
return this.store.deleteItem(_7);
},revert:function(){
return this.store.revert();
}});
}
