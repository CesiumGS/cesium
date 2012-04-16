/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._Selector"]){
dojo._hasResource["dojox.grid._Selector"]=true;
dojo.provide("dojox.grid._Selector");
dojo.require("dojox.grid.Selection");
dojo.require("dojox.grid._View");
dojo.require("dojox.grid._Builder");
(function(){
dojox.grid._InputSelectorHeaderBuilder=dojo.extend(function(_1){
dojox.grid._HeaderBuilder.call(this,_1);
},dojox.grid._HeaderBuilder.prototype,{generateHtml:function(){
var w=this.view.contentWidth||0;
var _2=this.view.grid.selection.getSelectedCount();
var _3=(_2&&_2==this.view.grid.rowCount)?" dijitCheckBoxChecked dijitChecked":"";
return "<table style=\"width:"+w+"px;\" "+"border=\"0\" cellspacing=\"0\" cellpadding=\"0\" "+"role=\"presentation\"><tr><th style=\"text-align: center;\">"+"<div class=\"dojoxGridCheckSelector dijitReset dijitInline dijitCheckBox"+_3+"\"></div></th></tr></table>";
},doclick:function(e){
var _4=this.view.grid.selection.getSelectedCount();
this.view._selectionChanging=true;
if(_4==this.view.grid.rowCount){
this.view.grid.selection.deselectAll();
}else{
this.view.grid.selection.selectRange(0,this.view.grid.rowCount-1);
}
this.view._selectionChanging=false;
this.view.onSelectionChanged();
return true;
}});
dojox.grid._SelectorContentBuilder=dojo.extend(function(_5){
dojox.grid._ContentBuilder.call(this,_5);
},dojox.grid._ContentBuilder.prototype,{generateHtml:function(_6,_7){
var w=this.view.contentWidth||0;
return "<table class=\"dojoxGridRowbarTable\" style=\"width:"+w+"px;\" border=\"0\" "+"cellspacing=\"0\" cellpadding=\"0\" role=\"presentation\"><tr>"+"<td  style=\"text-align: center;\" class=\"dojoxGridRowbarInner\">"+this.getCellContent(_7)+"</td></tr></table>";
},getCellContent:function(_8){
return "&nbsp;";
},findTarget:function(){
var t=dojox.grid._ContentBuilder.prototype.findTarget.apply(this,arguments);
return t;
},domouseover:function(e){
this.view.grid.onMouseOverRow(e);
},domouseout:function(e){
if(!this.isIntraRowEvent(e)){
this.view.grid.onMouseOutRow(e);
}
},doclick:function(e){
var _9=e.rowIndex;
var _a=this.view.grid.selection.isSelected(_9);
var _b=this.view.grid.selection.mode;
if(!_a){
if(_b=="single"){
this.view.grid.selection.select(_9);
}else{
if(_b!="none"){
this.view.grid.selection.addToSelection(_9);
}
}
}else{
this.view.grid.selection.deselect(_9);
}
return true;
}});
dojox.grid._InputSelectorContentBuilder=dojo.extend(function(_c){
dojox.grid._SelectorContentBuilder.call(this,_c);
},dojox.grid._SelectorContentBuilder.prototype,{getCellContent:function(_d){
var v=this.view;
var _e=v.inputType=="checkbox"?"CheckBox":"Radio";
var _f=!!v.grid.selection.isSelected(_d)?" dijit"+_e+"Checked dijitChecked":"";
return "<div class=\"dojoxGridCheckSelector dijitReset dijitInline dijit"+_e+_f+"\"></div>";
}});
dojo.declare("dojox.grid._Selector",dojox.grid._View,{inputType:"",selectionMode:"",defaultWidth:"2em",noscroll:true,padBorderWidth:2,_contentBuilderClass:dojox.grid._SelectorContentBuilder,postCreate:function(){
this.inherited(arguments);
if(this.selectionMode){
this.grid.selection.mode=this.selectionMode;
}
this.connect(this.grid.selection,"onSelected","onSelected");
this.connect(this.grid.selection,"onDeselected","onDeselected");
},buildRendering:function(){
this.inherited(arguments);
this.scrollboxNode.style.overflow="hidden";
},getWidth:function(){
return this.viewWidth||this.defaultWidth;
},resize:function(){
this.adaptHeight();
},setStructure:function(s){
this.inherited(arguments);
if(s.defaultWidth){
this.defaultWidth=s.defaultWidth;
}
},adaptWidth:function(){
if(!("contentWidth" in this)&&this.contentNode){
this.contentWidth=this.contentNode.offsetWidth-this.padBorderWidth;
}
},doStyleRowNode:function(_10,_11){
var n=["dojoxGridRowbar dojoxGridNonNormalizedCell"];
if(this.grid.rows.isOver(_10)){
n.push("dojoxGridRowbarOver");
}
if(this.grid.selection.isSelected(_10)){
n.push("dojoxGridRowbarSelected");
}
_11.className=n.join(" ");
},onSelected:function(_12){
this.grid.updateRow(_12);
},onDeselected:function(_13){
this.grid.updateRow(_13);
}});
if(!dojox.grid._View.prototype._headerBuilderClass&&!dojox.grid._View.prototype._contentBuilderClass){
dojox.grid._Selector.prototype.postCreate=function(){
this.connect(this.scrollboxNode,"onscroll","doscroll");
dojox.grid.util.funnelEvents(this.contentNode,this,"doContentEvent",["mouseover","mouseout","click","dblclick","contextmenu","mousedown"]);
dojox.grid.util.funnelEvents(this.headerNode,this,"doHeaderEvent",["dblclick","mouseover","mouseout","mousemove","mousedown","click","contextmenu"]);
if(this._contentBuilderClass){
this.content=new this._contentBuilderClass(this);
}else{
this.content=new dojox.grid._ContentBuilder(this);
}
if(this._headerBuilderClass){
this.header=new this._headerBuilderClass(this);
}else{
this.header=new dojox.grid._HeaderBuilder(this);
}
if(!dojo._isBodyLtr()){
this.headerNodeContainer.style.width="";
}
this.connect(this.grid.selection,"onSelected","onSelected");
this.connect(this.grid.selection,"onDeselected","onDeselected");
};
}
dojo.declare("dojox.grid._RadioSelector",dojox.grid._Selector,{inputType:"radio",selectionMode:"single",_contentBuilderClass:dojox.grid._InputSelectorContentBuilder,buildRendering:function(){
this.inherited(arguments);
this.headerNode.style.visibility="hidden";
},renderHeader:function(){
}});
dojo.declare("dojox.grid._CheckBoxSelector",dojox.grid._Selector,{inputType:"checkbox",_headerBuilderClass:dojox.grid._InputSelectorHeaderBuilder,_contentBuilderClass:dojox.grid._InputSelectorContentBuilder,postCreate:function(){
this.inherited(arguments);
this.connect(this.grid,"onSelectionChanged","onSelectionChanged");
this.connect(this.grid,"updateRowCount","_updateVisibility");
},renderHeader:function(){
this.inherited(arguments);
this._updateVisibility(this.grid.rowCount);
},_updateVisibility:function(_14){
this.headerNode.style.visibility=_14?"":"hidden";
},onSelectionChanged:function(){
if(this._selectionChanging){
return;
}
var _15=dojo.query(".dojoxGridCheckSelector",this.headerNode)[0];
var g=this.grid;
var s=(g.rowCount&&g.rowCount==g.selection.getSelectedCount());
g.allItemsSelected=s||false;
dojo.toggleClass(_15,"dijitChecked",g.allItemsSelected);
dojo.toggleClass(_15,"dijitCheckBoxChecked",g.allItemsSelected);
}});
})();
}
