/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.LazyManager"]){
dojo._hasResource["dojox.mdnd.LazyManager"]=true;
dojo.provide("dojox.mdnd.LazyManager");
dojo.require("dojo.dnd.Manager");
dojo.require("dojox.mdnd.PureSource");
dojo.declare("dojox.mdnd.LazyManager",null,{constructor:function(){
this._registry={};
this._fakeSource=new dojox.mdnd.PureSource(dojo.create("div"),{"copyOnly":false});
this._fakeSource.startup();
dojo.addOnUnload(dojo.hitch(this,"destroy"));
this.manager=dojo.dnd.manager();
},getItem:function(_1){
var _2=_1.getAttribute("dndType");
return {"data":_1.getAttribute("dndData")||_1.innerHTML,"type":_2?_2.split(/\s*,\s*/):["text"]};
},startDrag:function(e,_3){
_3=_3||e.target;
if(_3){
var m=this.manager,_4=this.getItem(_3);
if(_3.id==""){
dojo.attr(_3,"id",dojo.dnd.getUniqueId());
}
dojo.addClass(_3,"dojoDndItem");
this._fakeSource.setItem(_3.id,_4);
m.startDrag(this._fakeSource,[_3],false);
m.onMouseMove(e);
}
},cancelDrag:function(){
var m=this.manager;
m.target=null;
m.onMouseUp();
},destroy:function(){
this._fakeSource.destroy();
}});
}
