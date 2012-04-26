/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Exporter"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Exporter"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Exporter");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid._RowSelector");
dojo.declare("dojox.grid.enhanced.plugins.Exporter",dojox.grid.enhanced._Plugin,{name:"exporter",constructor:function(_1,_2){
this.grid=_1;
this.formatter=(_2&&dojo.isObject(_2))&&_2.exportFormatter;
this._mixinGrid();
},_mixinGrid:function(){
var g=this.grid;
g.exportTo=dojo.hitch(this,this.exportTo);
g.exportGrid=dojo.hitch(this,this.exportGrid);
g.exportSelected=dojo.hitch(this,this.exportSelected);
g.setExportFormatter=dojo.hitch(this,this.setExportFormatter);
},setExportFormatter:function(_3){
this.formatter=_3;
},exportGrid:function(_4,_5,_6){
if(dojo.isFunction(_5)){
_6=_5;
_5={};
}
if(!dojo.isString(_4)||!dojo.isFunction(_6)){
return;
}
_5=_5||{};
var g=this.grid,_7=this,_8=this._getExportWriter(_4,_5.writerArgs),_9=(_5.fetchArgs&&dojo.isObject(_5.fetchArgs))?_5.fetchArgs:{},_a=_9.onComplete;
if(g.store){
_9.onComplete=function(_b,_c){
if(_a){
_a(_b,_c);
}
_6(_7._goThroughGridData(_b,_8));
};
_9.sort=_9.sort||g.getSortProps();
g._storeLayerFetch(_9);
}else{
var _d=_9.start||0,_e=_9.count||-1,_f=[];
for(var i=_d;i!=_d+_e&&i<g.rowCount;++i){
_f.push(g.getItem(i));
}
_6(this._goThroughGridData(_f,_8));
}
},exportSelected:function(_10,_11){
if(!dojo.isString(_10)){
return "";
}
var _12=this._getExportWriter(_10,_11);
return this._goThroughGridData(this.grid.selection.getSelected(),_12);
},_buildRow:function(_13,_14){
var _15=this;
dojo.forEach(_13._views,function(_16,_17){
_13.view=_16;
_13.viewIdx=_17;
if(_14.beforeView(_13)){
dojo.forEach(_16.structure.cells,function(_18,_19){
_13.subrow=_18;
_13.subrowIdx=_19;
if(_14.beforeSubrow(_13)){
dojo.forEach(_18,function(_1a,_1b){
if(_13.isHeader&&_15._isSpecialCol(_1a)){
_13.spCols.push(_1a.index);
}
_13.cell=_1a;
_13.cellIdx=_1b;
_14.handleCell(_13);
});
_14.afterSubrow(_13);
}
});
_14.afterView(_13);
}
});
},_goThroughGridData:function(_1c,_1d){
var _1e=this.grid,_1f=dojo.filter(_1e.views.views,function(_20){
return !(_20 instanceof dojox.grid._RowSelector);
}),_21={"grid":_1e,"isHeader":true,"spCols":[],"_views":_1f,"colOffset":(_1f.length<_1e.views.views.length?-1:0)};
if(_1d.beforeHeader(_1e)){
this._buildRow(_21,_1d);
_1d.afterHeader();
}
_21.isHeader=false;
if(_1d.beforeContent(_1c)){
dojo.forEach(_1c,function(_22,_23){
_21.row=_22;
_21.rowIdx=_23;
if(_1d.beforeContentRow(_21)){
this._buildRow(_21,_1d);
_1d.afterContentRow(_21);
}
},this);
_1d.afterContent();
}
return _1d.toString();
},_isSpecialCol:function(_24){
return _24.isRowSelector||_24 instanceof dojox.grid.cells.RowIndex;
},_getExportWriter:function(_25,_26){
var _27,cls,_28=dojox.grid.enhanced.plugins.Exporter;
if(_28.writerNames){
_27=_28.writerNames[_25.toLowerCase()];
cls=dojo.getObject(_27);
if(cls){
var _29=new cls(_26);
_29.formatter=this.formatter;
return _29;
}else{
throw new Error("Please make sure class \""+_27+"\" is required.");
}
}
throw new Error("The writer for \""+_25+"\" has not been registered.");
}});
dojox.grid.enhanced.plugins.Exporter.registerWriter=function(_2a,_2b){
var _2c=dojox.grid.enhanced.plugins.Exporter;
_2c.writerNames=_2c.writerNames||{};
_2c.writerNames[_2a]=_2b;
};
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Exporter);
}
