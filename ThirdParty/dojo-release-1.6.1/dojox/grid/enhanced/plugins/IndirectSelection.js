/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.IndirectSelection"]){
dojo._hasResource["dojox.grid.enhanced.plugins.IndirectSelection"]=true;
dojo.provide("dojox.grid.enhanced.plugins.IndirectSelection");
dojo.require("dojo.string");
dojo.require("dojox.grid.cells.dijit");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.declare("dojox.grid.enhanced.plugins.IndirectSelection",dojox.grid.enhanced._Plugin,{name:"indirectSelection",constructor:function(){
var _1=this.grid.layout;
this.connect(_1,"setStructure",dojo.hitch(_1,this.addRowSelectCell,this.option));
},addRowSelectCell:function(_2){
if(!this.grid.indirectSelection||this.grid.selectionMode=="none"){
return;
}
var _3=false,_4=["get","formatter","field","fields"],_5={type:dojox.grid.cells.MultipleRowSelector,name:"",width:"30px",styles:"text-align: center;"};
if(_2.headerSelector){
_2.name="";
}
if(this.grid.rowSelectCell){
this.grid.rowSelectCell.destroy();
}
dojo.forEach(this.structure,function(_6){
var _7=_6.cells;
if(_7&&_7.length>0&&!_3){
var _8=_7[0];
if(_8[0]&&_8[0].isRowSelector){
_3=true;
return;
}
var _9,_a=this.grid.selectionMode=="single"?dojox.grid.cells.SingleRowSelector:dojox.grid.cells.MultipleRowSelector;
_9=dojo.mixin(_5,_2,{type:_a,editable:false,notselectable:true,filterable:false,navigatable:true,nosort:true});
dojo.forEach(_4,function(_b){
if(_b in _9){
delete _9[_b];
}
});
if(_7.length>1){
_9.rowSpan=_7.length;
}
dojo.forEach(this.cells,function(_c,i){
if(_c.index>=0){
_c.index+=1;
}else{
console.warn("Error:IndirectSelection.addRowSelectCell()-  cell "+i+" has no index!");
}
});
var _d=this.addCellDef(0,0,_9);
_d.index=0;
_8.unshift(_d);
this.cells.unshift(_d);
this.grid.rowSelectCell=_d;
_3=true;
}
},this);
this.cellCount=this.cells.length;
},destroy:function(){
this.grid.rowSelectCell.destroy();
delete this.grid.rowSelectCell;
this.inherited(arguments);
}});
dojo.declare("dojox.grid.cells.RowSelector",dojox.grid.cells._Widget,{inputType:"",map:null,disabledMap:null,isRowSelector:true,_connects:null,_subscribes:null,checkedText:"&#8730;",unCheckedText:"O",constructor:function(){
this.map={};
this.disabledMap={},this.disabledCount=0;
this._connects=[];
this._subscribes=[];
this.inA11YMode=dojo.hasClass(dojo.body(),"dijit_a11y");
this.baseClass="dojoxGridRowSelector dijitReset dijitInline dijit"+this.inputType;
this.checkedClass=" dijit"+this.inputType+"Checked";
this.disabledClass=" dijit"+this.inputType+"Disabled";
this.checkedDisabledClass=" dijit"+this.inputType+"CheckedDisabled";
this.statusTextClass=" dojoxGridRowSelectorStatusText";
this._connects.push(dojo.connect(this.grid,"dokeyup",this,"_dokeyup"));
this._connects.push(dojo.connect(this.grid.selection,"onSelected",this,"_onSelected"));
this._connects.push(dojo.connect(this.grid.selection,"onDeselected",this,"_onDeselected"));
this._connects.push(dojo.connect(this.grid.scroller,"invalidatePageNode",this,"_pageDestroyed"));
this._connects.push(dojo.connect(this.grid,"onCellClick",this,"_onClick"));
this._connects.push(dojo.connect(this.grid,"updateRow",this,"_onUpdateRow"));
},formatter:function(_e,_f){
var _10=this.baseClass;
var _11=this.getValue(_f);
var _12=!!this.disabledMap[_f];
if(_11){
_10+=this.checkedClass;
if(_12){
_10+=this.checkedDisabledClass;
}
}else{
if(_12){
_10+=this.disabledClass;
}
}
return ["<div tabindex = -1 ","id = '"+this.grid.id+"_rowSelector_"+_f+"' ","name = '"+this.grid.id+"_rowSelector' class = '"+_10+"' ","role = 'presentation' aria-pressed = '"+_11+"' aria-disabled = '"+_12+"' aria-label = '"+dojo.string.substitute(this.grid._nls["indirectSelection"+this.inputType],[_f+1])+"'>","<span class = '"+this.statusTextClass+"'>"+(_11?this.checkedText:this.unCheckedText)+"</span>","</div>"].join("");
},setValue:function(_13,_14){
},getValue:function(_15){
return this.grid.selection.isSelected(_15);
},toggleRow:function(_16,_17){
this._nativeSelect(_16,_17);
},setDisabled:function(_18,_19){
if(_18<0){
return;
}
this._toggleDisabledStyle(_18,_19);
},disabled:function(_1a){
return !!this.disabledMap[_1a];
},_onClick:function(e){
if(e.cell===this){
this._selectRow(e);
}
},_dokeyup:function(e){
if(e.cellIndex==this.index&&e.rowIndex>=0&&e.keyCode==dojo.keys.SPACE){
this._selectRow(e);
}
},focus:function(_1b){
var _1c=this.map[_1b];
if(_1c){
_1c.focus();
}
},_focusEndingCell:function(_1d,_1e){
var _1f=this.grid.getCell(_1e);
this.grid.focus.setFocusCell(_1f,_1d);
},_nativeSelect:function(_20,_21){
this.grid.selection[_21?"select":"deselect"](_20);
},_onSelected:function(_22){
this._toggleCheckedStyle(_22,true);
},_onDeselected:function(_23){
this._toggleCheckedStyle(_23,false);
},_onUpdateRow:function(_24){
delete this.map[_24];
},_toggleCheckedStyle:function(_25,_26){
var _27=this._getSelector(_25);
if(_27){
dojo.toggleClass(_27,this.checkedClass,_26);
if(this.disabledMap[_25]){
dojo.toggleClass(_27,this.checkedDisabledClass,_26);
}
dijit.setWaiState(_27,"pressed",_26);
if(this.inA11YMode){
dojo.attr(_27.firstChild,"innerHTML",_26?this.checkedText:this.unCheckedText);
}
}
},_toggleDisabledStyle:function(_28,_29){
var _2a=this._getSelector(_28);
if(_2a){
dojo.toggleClass(_2a,this.disabledClass,_29);
if(this.getValue(_28)){
dojo.toggleClass(_2a,this.checkedDisabledClass,_29);
}
dijit.setWaiState(_2a,"disabled",_29);
}
this.disabledMap[_28]=_29;
if(_28>=0){
this.disabledCount+=_29?1:-1;
}
},_getSelector:function(_2b){
var _2c=this.map[_2b];
if(!_2c){
var _2d=this.view.rowNodes[_2b];
if(_2d){
_2c=dojo.query(".dojoxGridRowSelector",_2d)[0];
if(_2c){
this.map[_2b]=_2c;
}
}
}
return _2c;
},_pageDestroyed:function(_2e){
var _2f=this.grid.scroller.rowsPerPage;
var _30=_2e*_2f,end=_30+_2f-1;
for(var i=_30;i<=end;i++){
if(!this.map[i]){
continue;
}
dojo.destroy(this.map[i]);
delete this.map[i];
}
},destroy:function(){
for(var i in this.map){
dojo.destroy(this.map[i]);
delete this.map[i];
}
for(i in this.disabledMap){
delete this.disabledMap[i];
}
dojo.forEach(this._connects,dojo.disconnect);
dojo.forEach(this._subscribes,dojo.unsubscribe);
delete this._connects;
delete this._subscribes;
}});
dojo.declare("dojox.grid.cells.SingleRowSelector",dojox.grid.cells.RowSelector,{inputType:"Radio",_selectRow:function(e){
var _31=e.rowIndex;
if(this.disabledMap[_31]){
return;
}
this._focusEndingCell(_31,0);
this._nativeSelect(_31,!this.grid.selection.selected[_31]);
}});
dojo.declare("dojox.grid.cells.MultipleRowSelector",dojox.grid.cells.RowSelector,{inputType:"CheckBox",swipeStartRowIndex:-1,swipeMinRowIndex:-1,swipeMaxRowIndex:-1,toSelect:false,lastClickRowIdx:-1,toggleAllTrigerred:false,unCheckedText:"&#9633;",constructor:function(){
this._connects.push(dojo.connect(dojo.doc,"onmouseup",this,"_domouseup"));
this._connects.push(dojo.connect(this.grid,"onRowMouseOver",this,"_onRowMouseOver"));
this._connects.push(dojo.connect(this.grid.focus,"move",this,"_swipeByKey"));
this._connects.push(dojo.connect(this.grid,"onCellMouseDown",this,"_onMouseDown"));
if(this.headerSelector){
this._connects.push(dojo.connect(this.grid.views,"render",this,"_addHeaderSelector"));
this._connects.push(dojo.connect(this.grid,"onSelectionChanged",this,"_onSelectionChanged"));
this._connects.push(dojo.connect(this.grid,"onKeyDown",this,function(e){
if(e.rowIndex==-1&&e.cellIndex==this.index&&e.keyCode==dojo.keys.SPACE){
this._toggletHeader();
}
}));
}
},toggleAllSelection:function(_32){
var _33=this.grid,_34=_33.selection;
if(_32){
_34.selectRange(0,_33.rowCount-1);
}else{
_34.deselectAll();
}
this.toggleAllTrigerred=true;
},_onMouseDown:function(e){
if(e.cell==this){
this._startSelection(e.rowIndex);
dojo.stopEvent(e);
}
},_onRowMouseOver:function(e){
this._updateSelection(e,0);
},_domouseup:function(e){
if(dojo.isIE){
this.view.content.decorateEvent(e);
}
var _35=e.cellIndex>=0&&this.inSwipeSelection()&&!this.grid.edit.isEditRow(e.rowIndex);
if(_35){
this._focusEndingCell(e.rowIndex,e.cellIndex);
}
this._finishSelect();
},_dokeyup:function(e){
this.inherited(arguments);
if(!e.shiftKey){
this._finishSelect();
}
},_startSelection:function(_36){
this.swipeStartRowIndex=this.swipeMinRowIndex=this.swipeMaxRowIndex=_36;
this.toSelect=!this.getValue(_36);
},_updateSelection:function(e,_37){
if(!this.inSwipeSelection()){
return;
}
var _38=_37!==0;
var _39=e.rowIndex,_3a=_39-this.swipeStartRowIndex+_37;
if(_3a>0&&this.swipeMaxRowIndex<_39+_37){
this.swipeMaxRowIndex=_39+_37;
}
if(_3a<0&&this.swipeMinRowIndex>_39+_37){
this.swipeMinRowIndex=_39+_37;
}
var min=_3a>0?this.swipeStartRowIndex:_39+_37;
var max=_3a>0?_39+_37:this.swipeStartRowIndex;
for(var i=this.swipeMinRowIndex;i<=this.swipeMaxRowIndex;i++){
if(this.disabledMap[i]||i<0){
continue;
}
if(i>=min&&i<=max){
this._nativeSelect(i,this.toSelect);
}else{
if(!_38){
this._nativeSelect(i,!this.toSelect);
}
}
}
},_swipeByKey:function(_3b,_3c,e){
if(!e||_3b===0||!e.shiftKey||e.cellIndex!=this.index||this.grid.focus.rowIndex<0){
return;
}
var _3d=e.rowIndex;
if(this.swipeStartRowIndex<0){
this.swipeStartRowIndex=_3d;
if(_3b>0){
this.swipeMaxRowIndex=_3d+_3b;
this.swipeMinRowIndex=_3d;
}else{
this.swipeMinRowIndex=_3d+_3b;
this.swipeMaxRowIndex=_3d;
}
this.toSelect=this.getValue(_3d);
}
this._updateSelection(e,_3b);
},_finishSelect:function(){
this.swipeStartRowIndex=-1;
this.swipeMinRowIndex=-1;
this.swipeMaxRowIndex=-1;
this.toSelect=false;
},inSwipeSelection:function(){
return this.swipeStartRowIndex>=0;
},_nativeSelect:function(_3e,_3f){
this.grid.selection[_3f?"addToSelection":"deselect"](_3e);
},_selectRow:function(e){
var _40=e.rowIndex;
if(this.disabledMap[_40]){
return;
}
dojo.stopEvent(e);
this._focusEndingCell(_40,0);
var _41=_40-this.lastClickRowIdx;
var _42=!this.grid.selection.selected[_40];
if(this.lastClickRowIdx>=0&&!e.ctrlKey&&!e.altKey&&e.shiftKey){
var min=_41>0?this.lastClickRowIdx:_40;
var max=_41>0?_40:this.lastClickRowIdx;
for(var i=min;i>=0&&i<=max;i++){
this._nativeSelect(i,_42);
}
}else{
this._nativeSelect(_40,_42);
}
this.lastClickRowIdx=_40;
},getValue:function(_43){
if(_43==-1){
var g=this.grid;
return g.rowCount>0&&g.rowCount<=g.selection.getSelectedCount();
}
return this.inherited(arguments);
},_addHeaderSelector:function(){
var _44=this.view.getHeaderCellNode(this.index);
if(!_44){
return;
}
dojo.empty(_44);
var g=this.grid;
var _45=_44.appendChild(dojo.create("div",{"tabindex":-1,"id":g.id+"_rowSelector_-1","class":this.baseClass,"role":"presentation","innerHTML":"<span class = '"+this.statusTextClass+"'></span><span style='height: 0; width: 0; overflow: hidden; display: block;'>"+g._nls["selectAll"]+"</span>"}));
this.map[-1]=_45;
var idx=this._headerSelectorConnectIdx;
if(idx!==undefined){
dojo.disconnect(this._connects[idx]);
this._connects.splice(idx,1);
}
this._headerSelectorConnectIdx=this._connects.length;
this._connects.push(dojo.connect(_45,"onclick",this,"_toggletHeader"));
this._onSelectionChanged();
},_toggletHeader:function(){
if(!!this.disabledMap[-1]){
return;
}
this.grid._selectingRange=true;
this.toggleAllSelection(!this.getValue(-1));
this._onSelectionChanged();
this.grid._selectingRange=false;
},_onSelectionChanged:function(){
var g=this.grid;
if(!this.map[-1]||g._selectingRange){
return;
}
this._toggleCheckedStyle(-1,this.getValue(-1));
},_toggleDisabledStyle:function(_46,_47){
this.inherited(arguments);
if(this.headerSelector){
var _48=(this.grid.rowCount==this.disabledCount);
if(_48!=!!this.disabledMap[-1]){
arguments[0]=-1;
arguments[1]=_48;
this.inherited(arguments);
}
}
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.IndirectSelection,{"preInit":true});
}
