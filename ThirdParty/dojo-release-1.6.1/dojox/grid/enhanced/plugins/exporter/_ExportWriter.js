/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.exporter._ExportWriter"]){
dojo._hasResource["dojox.grid.enhanced.plugins.exporter._ExportWriter"]=true;
dojo.provide("dojox.grid.enhanced.plugins.exporter._ExportWriter");
dojo.require("dojox.grid.enhanced.plugins.Exporter");
dojo.declare("dojox.grid.enhanced.plugins.exporter._ExportWriter",null,{constructor:function(_1){
},_getExportDataForCell:function(_2,_3,_4,_5){
var _6=(_4.get||_5.get).call(_4,_2,_3);
if(this.formatter){
return this.formatter(_6,_4,_2,_3);
}else{
return _6;
}
},beforeHeader:function(_7){
return true;
},afterHeader:function(){
},beforeContent:function(_8){
return true;
},afterContent:function(){
},beforeContentRow:function(_9){
return true;
},afterContentRow:function(_a){
},beforeView:function(_b){
return true;
},afterView:function(_c){
},beforeSubrow:function(_d){
return true;
},afterSubrow:function(_e){
},handleCell:function(_f){
},toString:function(){
return "";
}});
}
