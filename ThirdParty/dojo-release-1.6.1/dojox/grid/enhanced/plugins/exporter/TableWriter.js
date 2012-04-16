/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.exporter.TableWriter"]){
dojo._hasResource["dojox.grid.enhanced.plugins.exporter.TableWriter"]=true;
dojo.provide("dojox.grid.enhanced.plugins.exporter.TableWriter");
dojo.require("dojox.grid.enhanced.plugins.exporter._ExportWriter");
dojox.grid.enhanced.plugins.Exporter.registerWriter("table","dojox.grid.enhanced.plugins.exporter.TableWriter");
dojo.declare("dojox.grid.enhanced.plugins.exporter.TableWriter",dojox.grid.enhanced.plugins.exporter._ExportWriter,{constructor:function(_1){
this._viewTables=[];
this._tableAttrs=_1||{};
},_getTableAttrs:function(_2){
var _3=this._tableAttrs[_2]||"";
if(_3&&_3[0]!=" "){
_3=" "+_3;
}
return _3;
},_getRowClass:function(_4){
return _4.isHeader?" grid_header":[" grid_row grid_row_",_4.rowIdx+1,_4.rowIdx%2?" grid_even_row":" grid_odd_row"].join("");
},_getColumnClass:function(_5){
var _6=_5.cell.index+_5.colOffset+1;
return [" grid_column_",_6,_6%2?" grid_odd_column":" grid_even_column"].join("");
},beforeView:function(_7){
var _8=_7.viewIdx,_9=this._viewTables[_8],_a,_b,_c=dojo.marginBox(_7.view.contentNode).w;
if(!_9){
var _d=0;
for(var i=0;i<_8;++i){
_d+=this._viewTables[i]._width;
}
_9=this._viewTables[_8]=["<table class=\"grid_view\" style=\"position: absolute; top: 0; left:",_d,"px;\"",this._getTableAttrs("table"),">"];
}
_9._width=_c;
if(_7.isHeader){
_a="thead";
_b=dojo.contentBox(_7.view.headerContentNode).h;
}else{
_a="tbody";
var _e=_7.grid.getRowNode(_7.rowIdx);
if(_e){
_b=dojo.contentBox(_e).h;
}else{
_b=_7.grid.scroller.averageRowHeight;
}
}
_9.push("<",_a," style=\"height:",_b,"px; width:",_c,"px;\""," class=\"",this._getRowClass(_7),"\"",this._getTableAttrs(_a),">");
return true;
},afterView:function(_f){
this._viewTables[_f.viewIdx].push(_f.isHeader?"</thead>":"</tbody>");
},beforeSubrow:function(_10){
this._viewTables[_10.viewIdx].push("<tr",this._getTableAttrs("tr"),">");
return true;
},afterSubrow:function(_11){
this._viewTables[_11.viewIdx].push("</tr>");
},handleCell:function(_12){
var _13=_12.cell;
if(_13.hidden||dojo.indexOf(_12.spCols,_13.index)>=0){
return;
}
var _14=_12.isHeader?"th":"td",_15=[_13.colSpan?" colspan=\""+_13.colSpan+"\"":"",_13.rowSpan?" rowspan=\""+_13.rowSpan+"\"":""," style=\"width: ",dojo.contentBox(_13.getHeaderNode()).w,"px;\"",this._getTableAttrs(_14)," class=\"",this._getColumnClass(_12),"\""].join(""),_16=this._viewTables[_12.viewIdx];
_16.push("<",_14,_15,">");
if(_12.isHeader){
_16.push(_13.name||_13.field);
}else{
_16.push(this._getExportDataForCell(_12.rowIdx,_12.row,_13,_12.grid));
}
_16.push("</",_14,">");
},afterContent:function(){
dojo.forEach(this._viewTables,function(_17){
_17.push("</table>");
});
},toString:function(){
var _18=dojo.map(this._viewTables,function(_19){
return _19.join("");
}).join("");
return ["<div style=\"position: relative;\">",_18,"</div>"].join("");
}});
}
