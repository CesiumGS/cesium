/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.exporter.CSVWriter"]){
dojo._hasResource["dojox.grid.enhanced.plugins.exporter.CSVWriter"]=true;
dojo.provide("dojox.grid.enhanced.plugins.exporter.CSVWriter");
dojo.require("dojox.grid.enhanced.plugins.exporter._ExportWriter");
dojox.grid.enhanced.plugins.Exporter.registerWriter("csv","dojox.grid.enhanced.plugins.exporter.CSVWriter");
dojo.declare("dojox.grid.enhanced.plugins.exporter.CSVWriter",dojox.grid.enhanced.plugins.exporter._ExportWriter,{_separator:",",_newline:"\r\n",constructor:function(_1){
if(_1){
this._separator=_1.separator?_1.separator:this._separator;
this._newline=_1.newline?_1.newline:this._newline;
}
this._headers=[];
this._dataRows=[];
},_formatCSVCell:function(_2){
if(_2===null||_2===undefined){
return "";
}
var _3=String(_2).replace(/"/g,"\"\"");
if(_3.indexOf(this._separator)>=0||_3.search(/[" \t\r\n]/)>=0){
_3="\""+_3+"\"";
}
return _3;
},beforeContentRow:function(_4){
var _5=[],_6=this._formatCSVCell;
dojo.forEach(_4.grid.layout.cells,function(_7){
if(!_7.hidden&&dojo.indexOf(_4.spCols,_7.index)<0){
_5.push(_6(this._getExportDataForCell(_4.rowIndex,_4.row,_7,_4.grid)));
}
},this);
this._dataRows.push(_5);
return false;
},handleCell:function(_8){
var _9=_8.cell;
if(_8.isHeader&&!_9.hidden&&dojo.indexOf(_8.spCols,_9.index)<0){
this._headers.push(_9.name||_9.field);
}
},toString:function(){
var _a=this._headers.join(this._separator);
for(var i=this._dataRows.length-1;i>=0;--i){
this._dataRows[i]=this._dataRows[i].join(this._separator);
}
return _a+this._newline+this._dataRows.join(this._newline);
}});
}
