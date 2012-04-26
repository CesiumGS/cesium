/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced._Events"]){
dojo._hasResource["dojox.grid.enhanced._Events"]=true;
dojo.provide("dojox.grid.enhanced._Events");
dojo.declare("dojox.grid.enhanced._Events",null,{_events:null,headerCellActiveClass:"dojoxGridHeaderActive",cellActiveClass:"dojoxGridCellActive",rowActiveClass:"dojoxGridRowActive",constructor:function(_1){
this._events=new dojox.grid._Events();
for(var p in this._events){
if(!this[p]){
this.p=this._events.p;
}
}
_1.mixin(_1,this);
},dokeyup:function(e){
this.focus.currentArea().keyup(e);
},onKeyDown:function(e){
if(e.altKey||e.metaKey){
return;
}
var dk=dojo.keys;
var _2=this.focus;
switch(e.keyCode){
case dk.TAB:
if(e.ctrlKey){
return;
}
_2.tab(e.shiftKey?-1:1,e);
break;
case dk.UP_ARROW:
case dk.DOWN_ARROW:
_2.currentArea().move(e.keyCode==dk.UP_ARROW?-1:1,0,e);
break;
case dk.LEFT_ARROW:
case dk.RIGHT_ARROW:
var _3=(e.keyCode==dk.LEFT_ARROW)?1:-1;
if(dojo._isBodyLtr()){
_3*=-1;
}
_2.currentArea().move(0,_3,e);
break;
case dk.F10:
if(this.menus&&e.shiftKey){
this.onRowContextMenu(e);
}
break;
default:
_2.currentArea().keydown(e);
break;
}
},domouseup:function(e){
if(e.cellNode){
this.onMouseUp(e);
}else{
this.onRowSelectorMouseUp(e);
}
},domousedown:function(e){
if(!e.cellNode){
this.onRowSelectorMouseDown(e);
}
},onMouseUp:function(e){
this[e.rowIndex==-1?"onHeaderCellMouseUp":"onCellMouseUp"](e);
},onCellMouseDown:function(e){
dojo.addClass(e.cellNode,this.cellActiveClass);
dojo.addClass(e.rowNode,this.rowActiveClass);
},onCellMouseUp:function(e){
dojo.removeClass(e.cellNode,this.cellActiveClass);
dojo.removeClass(e.rowNode,this.rowActiveClass);
},onCellClick:function(e){
this._events.onCellClick.call(this,e);
this.focus.contentMouseEvent(e);
},onCellDblClick:function(e){
if(this.pluginMgr.isFixedCell(e.cell)){
return;
}
if(this._click.length>1&&(!this._click[0]||!this._click[1])){
this._click[0]=this._click[1]=e;
}
this._events.onCellDblClick.call(this,e);
},onRowClick:function(e){
this.edit.rowClick(e);
if(!e.cell||(!e.cell.isRowSelector&&(!this.rowSelectCell||!this.rowSelectCell.disabled(e.rowIndex)))){
this.selection.clickSelectEvent(e);
}
},onRowContextMenu:function(e){
if(!this.edit.isEditing()&&this.menus){
this.showMenu(e);
}
},onSelectedRegionContextMenu:function(e){
if(this.selectedRegionMenu){
this.selectedRegionMenu._openMyself({target:e.target,coords:e.keyCode!==dojo.keys.F10&&"pageX" in e?{x:e.pageX,y:e.pageY}:null});
dojo.stopEvent(e);
}
},onHeaderCellMouseOut:function(e){
if(e.cellNode){
dojo.removeClass(e.cellNode,this.cellOverClass);
dojo.removeClass(e.cellNode,this.headerCellActiveClass);
}
},onHeaderCellMouseDown:function(e){
if(e.cellNode){
dojo.addClass(e.cellNode,this.headerCellActiveClass);
}
},onHeaderCellMouseUp:function(e){
if(e.cellNode){
dojo.removeClass(e.cellNode,this.headerCellActiveClass);
}
},onHeaderCellClick:function(e){
this.focus.currentArea("header");
if(!e.cell.isRowSelector){
this._events.onHeaderCellClick.call(this,e);
}
this.focus.headerMouseEvent(e);
},onRowSelectorMouseDown:function(e){
this.focus.focusArea("rowHeader",e);
},onRowSelectorMouseUp:function(e){
},onMouseUpRow:function(e){
if(e.rowIndex!=-1){
this.onRowMouseUp(e);
}
},onRowMouseUp:function(e){
}});
}
