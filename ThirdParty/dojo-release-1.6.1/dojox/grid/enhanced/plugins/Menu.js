/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Menu"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Menu"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Menu");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.declare("dojox.grid.enhanced.plugins.Menu",dojox.grid.enhanced._Plugin,{name:"menus",types:["headerMenu","rowMenu","cellMenu","selectedRegionMenu"],constructor:function(){
var g=this.grid;
g.showMenu=dojo.hitch(g,this.showMenu);
g._setRowMenuAttr=dojo.hitch(this,"_setRowMenuAttr");
g._setCellMenuAttr=dojo.hitch(this,"_setCellMenuAttr");
g._setSelectedRegionMenuAttr=dojo.hitch(this,"_setSelectedRegionMenuAttr");
},onStartUp:function(){
var _1,_2=this.option;
for(_1 in _2){
if(dojo.indexOf(this.types,_1)>=0&&_2[_1]){
this._initMenu(_1,_2[_1]);
}
}
},_initMenu:function(_3,_4){
var g=this.grid;
if(!g[_3]){
var m=this._getMenuWidget(_4);
if(!m){
return;
}
g.set(_3,m);
if(_3!="headerMenu"){
m._scheduleOpen=function(){
return;
};
}
}
},_getMenuWidget:function(_5){
return (_5 instanceof dijit.Menu)?_5:dijit.byId(_5);
},_setRowMenuAttr:function(_6){
this._setMenuAttr(_6,"rowMenu");
},_setCellMenuAttr:function(_7){
this._setMenuAttr(_7,"cellMenu");
},_setSelectedRegionMenuAttr:function(_8){
this._setMenuAttr(_8,"selectedRegionMenu");
},_setMenuAttr:function(_9,_a){
var g=this.grid,n=g.domNode;
if(!_9||!(_9 instanceof dijit.Menu)){
console.warn(_a," of Grid ",g.id," is not existed!");
return;
}
if(g[_a]){
g[_a].unBindDomNode(n);
}
g[_a]=_9;
g[_a].bindDomNode(n);
},showMenu:function(e){
var _b=(e.cellNode&&dojo.hasClass(e.cellNode,"dojoxGridRowSelected")||e.rowNode&&(dojo.hasClass(e.rowNode,"dojoxGridRowSelected")||dojo.hasClass(e.rowNode,"dojoxGridRowbarSelected")));
if(_b&&this.selectedRegionMenu){
this.onSelectedRegionContextMenu(e);
return;
}
var _c={target:e.target,coords:e.keyCode!==dojo.keys.F10&&"pageX" in e?{x:e.pageX,y:e.pageY}:null};
if(this.rowMenu&&(!this.cellMenu||this.selection.isSelected(e.rowIndex)||e.rowNode&&dojo.hasClass(e.rowNode,"dojoxGridRowbar"))){
this.rowMenu._openMyself(_c);
dojo.stopEvent(e);
return;
}
if(this.cellMenu){
this.cellMenu._openMyself(_c);
}
dojo.stopEvent(e);
},destroy:function(){
var g=this.grid;
if(g.headerMenu){
g.headerMenu.unBindDomNode(g.viewsHeaderNode);
}
if(g.rowMenu){
g.rowMenu.unBindDomNode(g.domNode);
}
if(g.cellMenu){
g.cellMenu.unBindDomNode(g.domNode);
}
if(g.selectedRegionMenu){
g.selectedRegionMenu.destroy();
}
this.inherited(arguments);
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Menu);
}
