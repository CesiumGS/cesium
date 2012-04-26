/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.CellMerge"]){
dojo._hasResource["dojox.grid.enhanced.plugins.CellMerge"]=true;
dojo.provide("dojox.grid.enhanced.plugins.CellMerge");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.declare("dojox.grid.enhanced.plugins.CellMerge",dojox.grid.enhanced._Plugin,{name:"cellMerge",constructor:function(_1,_2){
this.grid=_1;
this._records=[];
this._merged={};
if(_2&&dojo.isObject(_2)){
this._setupConfig(_2.mergedCells);
}
this._initEvents();
this._mixinGrid();
},mergeCells:function(_3,_4,_5,_6){
var _7=this._createRecord({"row":_3,"start":_4,"end":_5,"major":_6});
if(_7){
this._updateRows(_7);
}
return _7;
},unmergeCells:function(_8){
var _9;
if(_8&&(_9=dojo.indexOf(this._records,_8))>=0){
this._records.splice(_9,1);
this._updateRows(_8);
}
},getMergedCells:function(){
var _a=[];
for(var i in this._merged){
_a=_a.concat(this._merged[i]);
}
return _a;
},getMergedCellsByRow:function(_b){
return this._merged[_b]||[];
},_setupConfig:function(_c){
dojo.forEach(_c,this._createRecord,this);
},_initEvents:function(){
dojo.forEach(this.grid.views.views,function(_d){
this.connect(_d,"onAfterRow",dojo.hitch(this,"_onAfterRow",_d.index));
},this);
},_mixinGrid:function(){
var g=this.grid;
g.mergeCells=dojo.hitch(this,"mergeCells");
g.unmergeCells=dojo.hitch(this,"unmergeCells");
g.getMergedCells=dojo.hitch(this,"getMergedCells");
g.getMergedCellsByRow=dojo.hitch(this,"getMergedCellsByRow");
},_getWidth:function(_e){
var _f=this.grid.layout.cells[_e].getHeaderNode();
return dojo.position(_f).w;
},_onAfterRow:function(_10,_11,_12){
try{
if(_11<0){
return;
}
var _13=[],i,j,len=this._records.length,_14=this.grid.layout.cells;
for(i=0;i<len;++i){
var _15=this._records[i];
var _16=this.grid._by_idx[_11];
if(_15.view==_10&&_15.row(_11,_16&&_16.item,this.grid.store)){
var res={record:_15,hiddenCells:[],totalWidth:0,majorNode:_14[_15.major].getNode(_11),majorHeaderNode:_14[_15.major].getHeaderNode()};
for(j=_15.start;j<=_15.end;++j){
var w=this._getWidth(j,_11);
res.totalWidth+=w;
if(j!=_15.major){
res.hiddenCells.push(_14[j].getNode(_11));
}
}
if(_12.length!=1||res.totalWidth>0){
for(j=_13.length-1;j>=0;--j){
var r=_13[j].record;
if((r.start>=_15.start&&r.start<=_15.end)||(r.end>=_15.start&&r.end<=_15.end)){
_13.splice(j,1);
}
}
_13.push(res);
}
}
}
this._merged[_11]=[];
dojo.forEach(_13,function(res){
dojo.forEach(res.hiddenCells,function(_17){
dojo.style(_17,"display","none");
});
var pbm=dojo.marginBox(res.majorHeaderNode).w-dojo.contentBox(res.majorHeaderNode).w;
var tw=res.totalWidth;
if(!dojo.isWebKit){
tw-=pbm;
}
dojo.style(res.majorNode,"width",tw+"px");
dojo.attr(res.majorNode,"colspan",res.hiddenCells.length+1);
this._merged[_11].push({"row":_11,"start":res.record.start,"end":res.record.end,"major":res.record.major,"handle":res.record});
},this);
}
catch(e){
console.warn("CellMerge._onAfterRow() error: ",_11,e);
}
},_createRecord:function(_18){
if(this._isValid(_18)){
_18={"row":_18.row,"start":_18.start,"end":_18.end,"major":_18.major};
var _19=this.grid.layout.cells;
_18.view=_19[_18.start].view.index;
_18.major=typeof _18.major=="number"&&!isNaN(_18.major)?_18.major:_18.start;
if(typeof _18.row=="number"){
var r=_18.row;
_18.row=function(_1a){
return _1a===r;
};
}else{
if(typeof _18.row=="string"){
var id=_18.row;
_18.row=function(_1b,_1c,_1d){
try{
if(_1d&&_1c&&_1d.getFeatures()["dojo.data.api.Identity"]){
return _1d.getIdentity(_1c)==id;
}
}
catch(e){
console.error(e);
}
return false;
};
}
}
if(dojo.isFunction(_18.row)){
this._records.push(_18);
return _18;
}
}
return null;
},_isValid:function(_1e){
var _1f=this.grid.layout.cells,_20=_1f.length;
return (dojo.isObject(_1e)&&("row" in _1e)&&("start" in _1e)&&("end" in _1e)&&_1e.start>=0&&_1e.start<_20&&_1e.end>_1e.start&&_1e.end<_20&&_1f[_1e.start].view.index==_1f[_1e.end].view.index&&_1f[_1e.start].subrow==_1f[_1e.end].subrow&&!(typeof _1e.major=="number"&&(_1e.major<_1e.start||_1e.major>_1e.end)));
},_updateRows:function(_21){
var min=null;
for(var i=0,_22=this.grid.rowCount;i<_22;++i){
var _23=this.grid._by_idx[i];
if(_23&&_21.row(i,_23&&_23.item,this.grid.store)){
this.grid.views.updateRow(i);
if(min===null){
min=i;
}
}
}
if(min>=0){
this.grid.scroller.rowHeightChanged(min);
}
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.CellMerge);
}
