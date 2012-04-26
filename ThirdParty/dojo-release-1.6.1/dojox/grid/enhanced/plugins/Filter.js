/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Filter"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Filter"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Filter");
dojo.requireLocalization("dojox.grid.enhanced","Filter",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hr,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid.enhanced.plugins.Dialog");
dojo.require("dojox.grid.enhanced.plugins.filter.FilterLayer");
dojo.require("dojox.grid.enhanced.plugins.filter.FilterBar");
dojo.require("dojox.grid.enhanced.plugins.filter.FilterDefDialog");
dojo.require("dojox.grid.enhanced.plugins.filter.FilterStatusTip");
dojo.require("dojox.grid.enhanced.plugins.filter.ClearFilterConfirm");
(function(){
var ns=dojox.grid.enhanced.plugins,_1=ns.filter;
dojo.declare("dojox.grid.enhanced.plugins.Filter",dojox.grid.enhanced._Plugin,{name:"filter",constructor:function(_2,_3){
this.grid=_2;
this.nls=dojo.i18n.getLocalization("dojox.grid.enhanced","Filter");
_3=this.args=dojo.isObject(_3)?_3:{};
if(typeof _3.ruleCount!="number"||_3.ruleCount<0){
_3.ruleCount=3;
}
this._wrapStore();
var _4={"plugin":this};
this.clearFilterDialog=new dojox.grid.enhanced.plugins.Dialog({refNode:this.grid.domNode,title:this.nls["clearFilterDialogTitle"],content:new _1.ClearFilterConfirm(_4)});
this.filterDefDialog=new _1.FilterDefDialog(_4);
this.filterBar=new _1.FilterBar(_4);
this.filterStatusTip=new _1.FilterStatusTip(_4);
_2.onFilterDefined=function(){
};
this.connect(_2.layer("filter"),"onFilterDefined",function(_5){
_2.onFilterDefined(_2.getFilter(),_2.getFilterRelation());
});
},destroy:function(){
this.inherited(arguments);
try{
this.grid.unwrap("filter");
this.filterBar.destroyRecursive();
this.filterBar=null;
this.clearFilterDialog.destroyRecursive();
this.clearFilterDialog=null;
this.filterStatusTip.destroy();
this.filterStatusTip=null;
this.filterDefDialog.destroy();
this.filterDefDialog=null;
this.grid=null;
this.nls=null;
this.args=null;
}
catch(e){
console.warn("Filter.destroy() error:",e);
}
},_wrapStore:function(){
var g=this.grid;
var _6=this.args;
var _7=_6.isServerSide?new _1.ServerSideFilterLayer(_6):new _1.ClientSideFilterLayer({cacheSize:_6.filterCacheSize,fetchAll:_6.fetchAllOnFirstFilter,getter:this._clientFilterGetter});
ns.wrap(g,"_storeLayerFetch",_7);
this.connect(g,"_onDelete",dojo.hitch(_7,"invalidate"));
},onSetStore:function(_8){
this.filterDefDialog.clearFilter(true);
},_clientFilterGetter:function(_9,_a,_b){
return _a.get(_b,_9);
}});
})();
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Filter);
}
