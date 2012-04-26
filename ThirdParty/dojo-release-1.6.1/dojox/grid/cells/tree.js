/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.cells.tree"]){
dojo._hasResource["dojox.grid.cells.tree"]=true;
dojo.provide("dojox.grid.cells.tree");
dojo.require("dojox.grid.cells");
dojox.grid.cells.TreeCell={formatAggregate:function(_1,_2,_3){
var f,g=this.grid,i=g.edit.info,d=g.aggregator?g.aggregator.getForCell(this,_2,_1,_2===this.level?"cnt":this.parentCell.aggregate):(this.value||this.defaultValue);
return this._defaultFormat(d,[d,_2-this.level,_3,this]);
},formatIndexes:function(_4,_5){
var f,g=this.grid,i=g.edit.info,d=this.get?this.get(_4[0],_5,_4):(this.value||this.defaultValue);
if(this.editable&&(this.alwaysEditing||(i.rowIndex==_4[0]&&i.cell==this))){
return this.formatEditing(d,_4[0],_4);
}else{
return this._defaultFormat(d,[d,_4[0],_4,this]);
}
},getOpenState:function(_6){
var _7=this.grid,_8=_7.store,_9=null;
if(_8.isItem(_6)){
_9=_6;
_6=_8.getIdentity(_6);
}
if(!this.openStates){
this.openStates={};
}
if(typeof _6!="string"||!(_6 in this.openStates)){
this.openStates[_6]=_7.getDefaultOpenState(this,_9);
}
return this.openStates[_6];
},formatAtLevel:function(_a,_b,_c,_d,_e,_f){
if(!dojo.isArray(_a)){
_a=[_a];
}
var _10="";
if(_c>this.level||(_c===this.level&&_d)){
_f.push("dojoxGridSpacerCell");
if(_c===this.level){
_f.push("dojoxGridTotalCell");
}
_10="<span></span>";
}else{
if(_c<this.level){
_f.push("dojoxGridSummaryCell");
_10="<span class=\"dojoxGridSummarySpan\">"+this.formatAggregate(_b,_c,_a)+"</span>";
}else{
var ret="";
if(this.isCollapsable){
var _11=this.grid.store,id="";
if(_11.isItem(_b)){
id=_11.getIdentity(_b);
}
_f.push("dojoxGridExpandoCell");
ret="<span dojoType=\"dojox.grid._Expando\" level=\""+_c+"\" class=\"dojoxGridExpando\""+"\" toggleClass=\""+_e+"\" itemId=\""+id+"\" cellIdx=\""+this.index+"\"></span>";
}
_10=ret+this.formatIndexes(_a,_b);
}
}
if(this.grid.focus.cell&&this.index==this.grid.focus.cell.index&&_a.join("/")==this.grid.focus.rowIndex){
_f.push(this.grid.focus.focusClass);
}
return _10;
}};
}
