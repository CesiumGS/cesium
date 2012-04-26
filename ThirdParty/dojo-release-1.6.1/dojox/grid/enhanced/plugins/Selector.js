/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Selector"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Selector"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Selector");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid.enhanced.plugins.AutoScroll");
dojo.require("dojox.grid.cells._base");
(function(){
var _1=0,_2=1,_3=2,_4={col:"row",row:"col"},_5=function(_6,_7,_8,_9,_a){
if(_6!=="cell"){
_7=_7[_6];
_8=_8[_6];
_9=_9[_6];
if(typeof _7!=="number"||typeof _8!=="number"||typeof _9!=="number"){
return false;
}
return _a?((_7>=_8&&_7<_9)||(_7>_9&&_7<=_8)):((_7>=_8&&_7<=_9)||(_7>=_9&&_7<=_8));
}else{
return _5("col",_7,_8,_9,_a)&&_5("row",_7,_8,_9,_a);
}
},_b=function(_c,v1,v2){
try{
if(v1&&v2){
switch(_c){
case "col":
case "row":
return v1[_c]==v2[_c]&&typeof v1[_c]=="number"&&!(_4[_c] in v1)&&!(_4[_c] in v2);
case "cell":
return v1.col==v2.col&&v1.row==v2.row&&typeof v1.col=="number"&&typeof v1.row=="number";
}
}
}
catch(e){
}
return false;
},_d=function(_e){
try{
if(_e&&_e.preventDefault){
dojo.stopEvent(_e);
}
}
catch(e){
}
},_f=function(_10,_11,_12){
switch(_10){
case "col":
return {"col":typeof _12=="undefined"?_11:_12,"except":[]};
case "row":
return {"row":_11,"except":[]};
case "cell":
return {"row":_11,"col":_12};
}
return null;
};
dojo.declare("dojox.grid.enhanced.plugins.Selector",dojox.grid.enhanced._Plugin,{name:"selector",constructor:function(_13,_14){
this.grid=_13;
this._config={row:_3,col:_3,cell:_3};
this.setupConfig(_14);
if(_13.selectionMode==="single"){
this._config.row=_2;
}
this._enabled=true;
this._selecting={};
this._selected={"col":[],"row":[],"cell":[]};
this._startPoint={};
this._currentPoint={};
this._lastAnchorPoint={};
this._lastEndPoint={};
this._lastSelectedAnchorPoint={};
this._lastSelectedEndPoint={};
this._keyboardSelect={};
this._lastType=null;
this._selectedRowModified={};
this._hacks();
this._initEvents();
this._initAreas();
this._mixinGrid();
},destroy:function(){
this.inherited(arguments);
},setupConfig:function(_15){
if(!_15||!dojo.isObject(_15)){
return;
}
var _16=["row","col","cell"];
for(var _17 in _15){
if(dojo.indexOf(_16,_17)>=0){
if(!_15[_17]||_15[_17]=="disabled"){
this._config[_17]=_1;
}else{
if(_15[_17]=="single"){
this._config[_17]=_2;
}else{
this._config[_17]=_3;
}
}
}
}
var _18=["none","single","extended"][this._config.row];
this.grid.selection.setMode(_18);
},isSelected:function(_19,_1a,_1b){
return this._isSelected(_19,_f(_19,_1a,_1b));
},toggleSelect:function(_1c,_1d,_1e){
this._startSelect(_1c,_f(_1c,_1d,_1e),this._config[_1c]===_3,false,false,!this.isSelected(_1c,_1d,_1e));
this._endSelect(_1c);
},select:function(_1f,_20,_21){
if(!this.isSelected(_1f,_20,_21)){
this.toggleSelect(_1f,_20,_21);
}
},deselect:function(_22,_23,_24){
if(this.isSelected(_22,_23,_24)){
this.toggleSelect(_22,_23,_24);
}
},selectRange:function(_25,_26,end,_27){
this.grid._selectingRange=true;
var _28=_25=="cell"?_f(_25,_26.row,_26.col):_f(_25,_26),_29=_25=="cell"?_f(_25,end.row,end.col):_f(_25,end);
this._startSelect(_25,_28,false,false,false,_27);
this._highlight(_25,_29,_27===undefined?true:_27);
this._endSelect(_25);
this.grid._selectingRange=false;
},clear:function(_2a){
this._clearSelection(_2a||"all");
},isSelecting:function(_2b){
if(typeof _2b=="undefined"){
return this._selecting.col||this._selecting.row||this._selecting.cell;
}
return this._selecting[_2b];
},selectEnabled:function(_2c){
if(typeof _2c!="undefined"&&!this.isSelecting()){
this._enabled=!!_2c;
}
return this._enabled;
},getSelected:function(_2d,_2e){
switch(_2d){
case "cell":
return dojo.map(this._selected[_2d],function(_2f){
return _2f;
});
case "col":
case "row":
return dojo.map(_2e?this._selected[_2d]:dojo.filter(this._selected[_2d],function(_30){
return _30.except.length===0;
}),function(_31){
return _2e?_31:_31[_2d];
});
}
return [];
},getSelectedCount:function(_32,_33){
switch(_32){
case "cell":
return this._selected[_32].length;
case "col":
case "row":
return (_33?this._selected[_32]:dojo.filter(this._selected[_32],function(_34){
return _34.except.length===0;
})).length;
}
return 0;
},getSelectedType:function(){
var s=this._selected;
return ["","cell","row","row|cell","col","col|cell","col|row","col|row|cell"][(!!s.cell.length)|(!!s.row.length<<1)|(!!s.col.length<<2)];
},getLastSelectedRange:function(_35){
return this._lastAnchorPoint[_35]?{"start":this._lastAnchorPoint[_35],"end":this._lastEndPoint[_35]}:null;
},_hacks:function(){
var g=this.grid;
var _36=function(e){
if(e.cellNode){
g.onMouseUp(e);
}
g.onMouseUpRow(e);
};
var _37=dojo.hitch(g,"onMouseUp");
var _38=dojo.hitch(g,"onMouseDown");
var _39=function(e){
e.cellNode.style.border="solid 1px";
};
dojo.forEach(g.views.views,function(_3a){
_3a.content.domouseup=_36;
_3a.header.domouseup=_37;
if(_3a.declaredClass=="dojox.grid._RowSelector"){
_3a.domousedown=_38;
_3a.domouseup=_37;
_3a.dofocus=_39;
}
});
g.selection.clickSelect=function(){
};
this._oldDeselectAll=g.selection.deselectAll;
var _3b=this;
g.selection.selectRange=function(_3c,to){
_3b.selectRange("row",_3c,to,true);
if(g.selection.preserver){
g.selection.preserver._updateMapping(true,true,false,_3c,to);
}
g.selection.onChanged();
};
g.selection.deselectRange=function(_3d,to){
_3b.selectRange("row",_3d,to,false);
if(g.selection.preserver){
g.selection.preserver._updateMapping(true,false,false,_3d,to);
}
g.selection.onChanged();
};
g.selection.deselectAll=function(){
g._selectingRange=true;
_3b._oldDeselectAll.apply(g.selection,arguments);
_3b._clearSelection("row");
g._selectingRange=false;
if(g.selection.preserver){
g.selection.preserver._updateMapping(true,false,true);
}
g.selection.onChanged();
};
var _3e=g.views.views[0];
if(_3e instanceof dojox.grid._RowSelector){
_3e.doStyleRowNode=function(_3f,_40){
dojo.removeClass(_40,"dojoxGridRow");
dojo.addClass(_40,"dojoxGridRowbar");
dojo.addClass(_40,"dojoxGridNonNormalizedCell");
dojo.toggleClass(_40,"dojoxGridRowbarOver",g.rows.isOver(_3f));
dojo.toggleClass(_40,"dojoxGridRowbarSelected",!!g.selection.isSelected(_3f));
};
}
this.connect(g,"updateRow",function(_41){
dojo.forEach(g.layout.cells,function(_42){
if(this.isSelected("cell",_41,_42.index)){
this._highlightNode(_42.getNode(_41),true);
}
},this);
});
},_mixinGrid:function(){
var g=this.grid;
g.setupSelectorConfig=dojo.hitch(this,this.setupConfig);
g.onStartSelect=function(){
};
g.onEndSelect=function(){
};
g.onStartDeselect=function(){
};
g.onEndDeselect=function(){
};
g.onSelectCleared=function(){
};
},_initEvents:function(){
var g=this.grid,_43=this,dp=dojo.partial,_44=function(_45,e){
if(_45==="row"){
_43._isUsingRowSelector=true;
}
if(_43.selectEnabled()&&_43._config[_45]&&e.button!=2){
if(_43._keyboardSelect.col||_43._keyboardSelect.row||_43._keyboardSelect.cell){
_43._endSelect("all");
_43._keyboardSelect.col=_43._keyboardSelect.row=_43._keyboardSelect.cell=0;
}
if(_43._usingKeyboard){
_43._usingKeyboard=false;
}
var _46=_f(_45,e.rowIndex,e.cell&&e.cell.index);
_43._startSelect(_45,_46,e.ctrlKey,e.shiftKey);
}
},_47=dojo.hitch(this,"_endSelect");
this.connect(g,"onHeaderCellMouseDown",dp(_44,"col"));
this.connect(g,"onHeaderCellMouseUp",dp(_47,"col"));
this.connect(g,"onRowSelectorMouseDown",dp(_44,"row"));
this.connect(g,"onRowSelectorMouseUp",dp(_47,"row"));
this.connect(g,"onCellMouseDown",function(e){
if(e.cell&&e.cell.isRowSelector){
return;
}
if(g.singleClickEdit){
_43._singleClickEdit=true;
g.singleClickEdit=false;
}
_44(_43._config["cell"]==_1?"row":"cell",e);
});
this.connect(g,"onCellMouseUp",function(e){
if(_43._singleClickEdit){
delete _43._singleClickEdit;
g.singleClickEdit=true;
}
_47("all",e);
});
this.connect(g,"onCellMouseOver",function(e){
if(_43._curType!="row"&&_43._selecting[_43._curType]&&_43._config[_43._curType]==_3){
_43._highlight("col",_f("col",e.cell.index),_43._toSelect);
if(!_43._keyboardSelect.cell){
_43._highlight("cell",_f("cell",e.rowIndex,e.cell.index),_43._toSelect);
}
}
});
this.connect(g,"onHeaderCellMouseOver",function(e){
if(_43._selecting.col&&_43._config.col==_3){
_43._highlight("col",_f("col",e.cell.index),_43._toSelect);
}
});
this.connect(g,"onRowMouseOver",function(e){
if(_43._selecting.row&&_43._config.row==_3){
_43._highlight("row",_f("row",e.rowIndex),_43._toSelect);
}
});
this.connect(g,"onSelectedById","_onSelectedById");
this.connect(g,"_onFetchComplete",function(){
if(!g._notRefreshSelection){
this._refreshSelected(true);
}
});
this.connect(g.scroller,"buildPage",function(){
if(!g._notRefreshSelection){
this._refreshSelected(true);
}
});
this.connect(dojo.doc,"onmouseup",dp(_47,"all"));
this.connect(g,"onEndAutoScroll",function(_48,_49,_4a,_4b){
var _4c=_43._selecting.cell,_4d,_4e,dir=_49?1:-1;
if(_48&&(_4c||_43._selecting.row)){
_4d=_4c?"cell":"row";
_4e=_43._currentPoint[_4d];
_43._highlight(_4d,_f(_4d,_4e.row+dir,_4e.col),_43._toSelect);
}else{
if(!_48&&(_4c||_43._selecting.col)){
_4d=_4c?"cell":"col";
_4e=_43._currentPoint[_4d];
_43._highlight(_4d,_f(_4d,_4e.row,_4b),_43._toSelect);
}
}
});
this.subscribe("dojox/grid/rearrange/move/"+g.id,"_onInternalRearrange");
this.subscribe("dojox/grid/rearrange/copy/"+g.id,"_onInternalRearrange");
this.subscribe("dojox/grid/rearrange/change/"+g.id,"_onExternalChange");
this.subscribe("dojox/grid/rearrange/insert/"+g.id,"_onExternalChange");
this.subscribe("dojox/grid/rearrange/remove/"+g.id,"clear");
this.connect(g,"onSelected",function(_4f){
if(this._selectedRowModified&&this._isUsingRowSelector){
delete this._selectedRowModified;
}else{
if(!this.grid._selectingRange){
this.select("row",_4f);
}
}
});
this.connect(g,"onDeselected",function(_50){
if(this._selectedRowModified&&this._isUsingRowSelector){
delete this._selectedRowModified;
}else{
if(!this.grid._selectingRange){
this.deselect("row",_50);
}
}
});
},_onSelectedById:function(id,_51,_52){
if(this.grid._noInternalMapping){
return;
}
var _53=[this._lastAnchorPoint.row,this._lastEndPoint.row,this._lastSelectedAnchorPoint.row,this._lastSelectedEndPoint.row];
_53=_53.concat(this._selected.row);
var _54=false;
dojo.forEach(_53,function(_55){
if(_55){
if(_55.id===id){
_54=true;
_55.row=_51;
}else{
if(_55.row===_51&&_55.id){
_55.row=-1;
}
}
}
});
if(!_54&&_52){
dojo.some(this._selected.row,function(_56){
if(_56&&!_56.id&&!_56.except.length){
_56.id=id;
_56.row=_51;
return true;
}
return false;
});
}
_54=false;
_53=[this._lastAnchorPoint.cell,this._lastEndPoint.cell,this._lastSelectedAnchorPoint.cell,this._lastSelectedEndPoint.cell];
_53=_53.concat(this._selected.cell);
dojo.forEach(_53,function(_57){
if(_57){
if(_57.id===id){
_54=true;
_57.row=_51;
}else{
if(_57.row===_51&&_57.id){
_57.row=-1;
}
}
}
});
},onSetStore:function(){
this._clearSelection("all");
},_onInternalRearrange:function(_58,_59){
try{
this._refresh("col",false);
dojo.forEach(this._selected.row,function(_5a){
dojo.forEach(this.grid.layout.cells,function(_5b){
this._highlightNode(_5b.getNode(_5a.row),false);
},this);
},this);
dojo.query(".dojoxGridRowSelectorSelected").forEach(function(_5c){
dojo.removeClass(_5c,"dojoxGridRowSelectorSelected");
dojo.removeClass(_5c,"dojoxGridRowSelectorSelectedUp");
dojo.removeClass(_5c,"dojoxGridRowSelectorSelectedDown");
});
var _5d=function(_5e){
if(_5e){
delete _5e.converted;
}
},_5f=[this._lastAnchorPoint[_58],this._lastEndPoint[_58],this._lastSelectedAnchorPoint[_58],this._lastSelectedEndPoint[_58]];
if(_58==="cell"){
this.selectRange("cell",_59.to.min,_59.to.max);
var _60=this.grid.layout.cells;
dojo.forEach(_5f,function(_61){
if(_61.converted){
return;
}
for(var r=_59.from.min.row,tr=_59.to.min.row;r<=_59.from.max.row;++r,++tr){
for(var c=_59.from.min.col,tc=_59.to.min.col;c<=_59.from.max.col;++c,++tc){
while(_60[c].hidden){
++c;
}
while(_60[tc].hidden){
++tc;
}
if(_61.row==r&&_61.col==c){
_61.row=tr;
_61.col=tc;
_61.converted=true;
return;
}
}
}
});
}else{
_5f=this._selected.cell.concat(this._selected[_58]).concat(_5f).concat([this._lastAnchorPoint.cell,this._lastEndPoint.cell,this._lastSelectedAnchorPoint.cell,this._lastSelectedEndPoint.cell]);
dojo.forEach(_5f,function(_62){
if(_62&&!_62.converted){
var _63=_62[_58];
if(_63 in _59){
_62[_58]=_59[_63];
}
_62.converted=true;
}
});
dojo.forEach(this._selected[_4[_58]],function(_64){
for(var i=0,len=_64.except.length;i<len;++i){
var _65=_64.except[i];
if(_65 in _59){
_64.except[i]=_59[_65];
}
}
});
}
dojo.forEach(_5f,_5d);
this._refreshSelected(true);
this._focusPoint(_58,this._lastEndPoint);
}
catch(e){
console.warn("Selector._onInternalRearrange() error",e);
}
},_onExternalChange:function(_66,_67){
var _68=_66=="cell"?_67.min:_67[0],end=_66=="cell"?_67.max:_67[_67.length-1];
this.selectRange(_66,_68,end);
},_refresh:function(_69,_6a){
if(!this._keyboardSelect[_69]){
dojo.forEach(this._selected[_69],function(_6b){
this._highlightSingle(_69,_6a,_6b,undefined,true);
},this);
}
},_refreshSelected:function(){
this._refresh("col",true);
this._refresh("row",true);
this._refresh("cell",true);
},_initAreas:function(){
var g=this.grid,f=g.focus,_6c=this,dk=dojo.keys,_6d=1,_6e=2,_6f=function(_70,_71,_72,_73,evt){
var ks=_6c._keyboardSelect;
if(evt.shiftKey&&ks[_70]){
if(ks[_70]===_6d){
if(_70==="cell"){
var _74=_6c._lastEndPoint[_70];
if(f.cell!=g.layout.cells[_74.col+_73]||f.rowIndex!=_74.row+_72){
ks[_70]=0;
return;
}
}
_6c._startSelect(_70,_6c._lastAnchorPoint[_70],true,false,true);
_6c._highlight(_70,_6c._lastEndPoint[_70],_6c._toSelect);
ks[_70]=_6e;
}
var _75=_71(_70,_72,_73,evt);
if(_6c._isValid(_70,_75,g)){
_6c._highlight(_70,_75,_6c._toSelect);
}
_d(evt);
}
},_76=function(_77,_78,evt,_79){
if(_79&&_6c.selectEnabled()&&_6c._config[_77]!=_1){
switch(evt.keyCode){
case dk.SPACE:
_6c._startSelect(_77,_78(),evt.ctrlKey,evt.shiftKey);
_6c._endSelect(_77);
break;
case dk.SHIFT:
if(_6c._config[_77]==_3&&_6c._isValid(_77,_6c._lastAnchorPoint[_77],g)){
_6c._endSelect(_77);
_6c._keyboardSelect[_77]=_6d;
_6c._usingKeyboard=true;
}
}
}
},_7a=function(_7b,evt,_7c){
if(_7c&&evt.keyCode==dojo.keys.SHIFT&&_6c._keyboardSelect[_7b]){
_6c._endSelect(_7b);
_6c._keyboardSelect[_7b]=0;
}
};
if(g.views.views[0] instanceof dojox.grid._RowSelector){
this._lastFocusedRowBarIdx=0;
f.addArea({name:"rowHeader",onFocus:function(evt,_7d){
var _7e=g.views.views[0];
if(_7e instanceof dojox.grid._RowSelector){
var _7f=_7e.getCellNode(_6c._lastFocusedRowBarIdx,0);
if(_7f){
dojo.toggleClass(_7f,f.focusClass,false);
}
if(evt&&"rowIndex" in evt){
if(evt.rowIndex>=0){
_6c._lastFocusedRowBarIdx=evt.rowIndex;
}else{
if(!_6c._lastFocusedRowBarIdx){
_6c._lastFocusedRowBarIdx=0;
}
}
}
_7f=_7e.getCellNode(_6c._lastFocusedRowBarIdx,0);
if(_7f){
dijit.focus(_7f);
dojo.toggleClass(_7f,f.focusClass,true);
}
f.rowIndex=_6c._lastFocusedRowBarIdx;
_d(evt);
return true;
}
return false;
},onBlur:function(evt,_80){
var _81=g.views.views[0];
if(_81 instanceof dojox.grid._RowSelector){
var _82=_81.getCellNode(_6c._lastFocusedRowBarIdx,0);
if(_82){
dojo.toggleClass(_82,f.focusClass,false);
}
_d(evt);
}
return true;
},onMove:function(_83,_84,evt){
var _85=g.views.views[0];
if(_83&&_85 instanceof dojox.grid._RowSelector){
var _86=_6c._lastFocusedRowBarIdx+_83;
if(_86>=0&&_86<g.rowCount){
_d(evt);
var _87=_85.getCellNode(_6c._lastFocusedRowBarIdx,0);
dojo.toggleClass(_87,f.focusClass,false);
var sc=g.scroller;
var _88=sc.getLastPageRow(sc.page);
var rc=g.rowCount-1,row=Math.min(rc,_86);
if(_86>_88){
g.setScrollTop(g.scrollTop+sc.findScrollTop(row)-sc.findScrollTop(_6c._lastFocusedRowBarIdx));
}
_87=_85.getCellNode(_86,0);
dijit.focus(_87);
dojo.toggleClass(_87,f.focusClass,true);
_6c._lastFocusedRowBarIdx=_86;
f.cell=_87;
f.cell.view=_85;
f.cell.getNode=function(_89){
return f.cell;
};
f.rowIndex=_6c._lastFocusedRowBarIdx;
f.scrollIntoView();
f.cell=null;
}
}
}});
f.placeArea("rowHeader","before","content");
}
f.addArea({name:"cellselect",onMove:dojo.partial(_6f,"cell",function(_8a,_8b,_8c,evt){
var _8d=_6c._currentPoint[_8a];
return _f("cell",_8d.row+_8b,_8d.col+_8c);
}),onKeyDown:dojo.partial(_76,"cell",function(){
return _f("cell",f.rowIndex,f.cell.index);
}),onKeyUp:dojo.partial(_7a,"cell")});
f.placeArea("cellselect","below","content");
f.addArea({name:"colselect",onMove:dojo.partial(_6f,"col",function(_8e,_8f,_90,evt){
var _91=_6c._currentPoint[_8e];
return _f("col",_91.col+_90);
}),onKeyDown:dojo.partial(_76,"col",function(){
return _f("col",f.getHeaderIndex());
}),onKeyUp:dojo.partial(_7a,"col")});
f.placeArea("colselect","below","header");
f.addArea({name:"rowselect",onMove:dojo.partial(_6f,"row",function(_92,_93,_94,evt){
return _f("row",f.rowIndex);
}),onKeyDown:dojo.partial(_76,"row",function(){
return _f("row",f.rowIndex);
}),onKeyUp:dojo.partial(_7a,"row")});
f.placeArea("rowselect","below","rowHeader");
},_clearSelection:function(_95,_96){
if(_95=="all"){
this._clearSelection("cell",_96);
this._clearSelection("col",_96);
this._clearSelection("row",_96);
return;
}
this._isUsingRowSelector=true;
dojo.forEach(this._selected[_95],function(_97){
if(!_b(_95,_96,_97)){
this._highlightSingle(_95,false,_97);
}
},this);
this._blurPoint(_95,this._currentPoint);
this._selecting[_95]=false;
this._startPoint[_95]=this._currentPoint[_95]=null;
this._selected[_95]=[];
if(_95=="row"&&!this.grid._selectingRange){
this._oldDeselectAll.call(this.grid.selection);
this.grid.selection._selectedById={};
}
this.grid.onEndDeselect(_95,null,null,this._selected);
this.grid.onSelectCleared(_95);
},_startSelect:function(_98,_99,_9a,_9b,_9c,_9d){
if(!this._isValid(_98,_99)){
return;
}
var _9e=this._isSelected(_98,this._lastEndPoint[_98]),_9f=this._isSelected(_98,_99);
this._toSelect=_9c?_9f:!_9f;
if(!_9a||(!_9f&&this._config[_98]==_2)){
this._clearSelection("all",_99);
this._toSelect=_9d===undefined?true:_9d;
}
this._selecting[_98]=true;
this._currentPoint[_98]=null;
if(_9b&&this._lastType==_98&&_9e==this._toSelect){
if(_98==="row"){
this._isUsingRowSelector=true;
}
this._startPoint[_98]=this._lastEndPoint[_98];
this._highlight(_98,this._startPoint[_98]);
this._isUsingRowSelector=false;
}else{
this._startPoint[_98]=_99;
}
this._curType=_98;
this._fireEvent("start",_98);
this._isStartFocus=true;
this._isUsingRowSelector=true;
this._highlight(_98,_99,this._toSelect);
this._isStartFocus=false;
},_endSelect:function(_a0){
if(_a0==="row"){
delete this._isUsingRowSelector;
}
if(_a0=="all"){
this._endSelect("col");
this._endSelect("row");
this._endSelect("cell");
}else{
if(this._selecting[_a0]){
this._addToSelected(_a0);
this._lastAnchorPoint[_a0]=this._startPoint[_a0];
this._lastEndPoint[_a0]=this._currentPoint[_a0];
if(this._toSelect){
this._lastSelectedAnchorPoint[_a0]=this._lastAnchorPoint[_a0];
this._lastSelectedEndPoint[_a0]=this._lastEndPoint[_a0];
}
this._startPoint[_a0]=this._currentPoint[_a0]=null;
this._selecting[_a0]=false;
this._lastType=_a0;
this._fireEvent("end",_a0);
}
}
},_fireEvent:function(_a1,_a2){
switch(_a1){
case "start":
this.grid[this._toSelect?"onStartSelect":"onStartDeselect"](_a2,this._startPoint[_a2],this._selected);
break;
case "end":
this.grid[this._toSelect?"onEndSelect":"onEndDeselect"](_a2,this._lastAnchorPoint[_a2],this._lastEndPoint[_a2],this._selected);
break;
}
},_calcToHighlight:function(_a3,_a4,_a5,_a6){
if(_a6!==undefined){
var _a7;
if(this._usingKeyboard&&!_a5){
var _a8=this._isInLastRange(this._lastType,_a4);
if(_a8){
_a7=this._isSelected(_a3,_a4);
if(_a6&&_a7){
return false;
}
if(!_a6&&!_a7&&this._isInLastRange(this._lastType,_a4,true)){
return true;
}
}
}
return _a5?_a6:(_a7||this._isSelected(_a3,_a4));
}
return _a5;
},_highlightNode:function(_a9,_aa){
if(_a9){
var _ab="dojoxGridRowSelected";
var _ac="dojoxGridCellSelected";
dojo.toggleClass(_a9,_ab,_aa);
dojo.toggleClass(_a9,_ac,_aa);
}
},_highlightHeader:function(_ad,_ae){
var _af=this.grid.layout.cells;
var _b0=_af[_ad].getHeaderNode();
var _b1="dojoxGridHeaderSelected";
dojo.toggleClass(_b0,_b1,_ae);
},_highlightRowSelector:function(_b2,_b3){
var _b4=this.grid.views.views[0];
if(_b4 instanceof dojox.grid._RowSelector){
var _b5=_b4.getRowNode(_b2);
if(_b5){
var _b6="dojoxGridRowSelectorSelected";
dojo.toggleClass(_b5,_b6,_b3);
}
}
},_highlightSingle:function(_b7,_b8,_b9,_ba,_bb){
var _bc=this,_bd,g=_bc.grid,_be=g.layout.cells;
switch(_b7){
case "cell":
_bd=this._calcToHighlight(_b7,_b9,_b8,_ba);
var c=_be[_b9.col];
if(!c.hidden&&!c.notselectable){
this._highlightNode(_b9.node||c.getNode(_b9.row),_bd);
}
break;
case "col":
_bd=this._calcToHighlight(_b7,_b9,_b8,_ba);
this._highlightHeader(_b9.col,_bd);
dojo.query("td[idx='"+_b9.col+"']",g.domNode).forEach(function(_bf){
var _c0=_be[_b9.col].view.content.findRowTarget(_bf);
if(_c0){
var _c1=_c0[dojox.grid.util.rowIndexTag];
_bc._highlightSingle("cell",_bd,{"row":_c1,"col":_b9.col,"node":_bf});
}
});
break;
case "row":
_bd=this._calcToHighlight(_b7,_b9,_b8,_ba);
this._highlightRowSelector(_b9.row,_bd);
dojo.forEach(_be,function(_c2){
_bc._highlightSingle("cell",_bd,{"row":_b9.row,"col":_c2.index,"node":_c2.getNode(_b9.row)});
});
this._selectedRowModified=true;
if(!_bb){
g.selection.setSelected(_b9.row,_bd);
}
}
},_highlight:function(_c3,_c4,_c5){
if(this._selecting[_c3]&&_c4!==null){
var _c6=this._startPoint[_c3],_c7=this._currentPoint[_c3],_c8=this,_c9=function(_ca,to,_cb){
_c8._forEach(_c3,_ca,to,function(_cc){
_c8._highlightSingle(_c3,_cb,_cc,_c5);
},true);
};
switch(_c3){
case "col":
case "row":
if(_c7!==null){
if(_5(_c3,_c4,_c6,_c7,true)){
_c9(_c7,_c4,false);
}else{
if(_5(_c3,_c6,_c4,_c7,true)){
_c9(_c7,_c6,false);
_c7=_c6;
}
_c9(_c4,_c7,true);
}
}else{
this._highlightSingle(_c3,true,_c4,_c5);
}
break;
case "cell":
if(_c7!==null){
if(_5("row",_c4,_c6,_c7,true)||_5("col",_c4,_c6,_c7,true)||_5("row",_c6,_c4,_c7,true)||_5("col",_c6,_c4,_c7,true)){
_c9(_c6,_c7,false);
}
}
_c9(_c6,_c4,true);
}
this._currentPoint[_c3]=_c4;
this._focusPoint(_c3,this._currentPoint);
}
},_focusPoint:function(_cd,_ce){
if(!this._isStartFocus){
var _cf=_ce[_cd],f=this.grid.focus;
if(_cd=="col"){
f._colHeadFocusIdx=_cf.col;
f.focusArea("header");
}else{
if(_cd=="row"){
f.focusArea("rowHeader",{"rowIndex":_cf.row});
}else{
if(_cd=="cell"){
f.setFocusIndex(_cf.row,_cf.col);
}
}
}
}
},_blurPoint:function(_d0,_d1){
var f=this.grid.focus;
if(_d0=="col"){
f._blurHeader();
}else{
if(_d0=="cell"){
f._blurContent();
}
}
},_addToSelected:function(_d2){
var _d3=this._toSelect,_d4=this,_d5=[],_d6=[],_d7=this._startPoint[_d2],end=this._currentPoint[_d2];
if(this._usingKeyboard){
this._forEach(_d2,this._lastAnchorPoint[_d2],this._lastEndPoint[_d2],function(_d8){
if(!_5(_d2,_d8,_d7,end)){
(_d3?_d6:_d5).push(_d8);
}
});
}
this._forEach(_d2,_d7,end,function(_d9){
var _da=_d4._isSelected(_d2,_d9);
if(_d3&&!_da){
_d5.push(_d9);
}else{
if(!_d3){
_d6.push(_d9);
}
}
});
this._add(_d2,_d5);
this._remove(_d2,_d6);
dojo.forEach(this._selected.row,function(_db){
if(_db.except.length>0){
this._selectedRowModified=true;
this.grid.selection.setSelected(_db.row,false);
}
},this);
},_forEach:function(_dc,_dd,end,_de,_df){
if(!this._isValid(_dc,_dd,true)||!this._isValid(_dc,end,true)){
return;
}
switch(_dc){
case "col":
case "row":
_dd=_dd[_dc];
end=end[_dc];
var dir=end>_dd?1:-1;
if(!_df){
end+=dir;
}
for(;_dd!=end;_dd+=dir){
_de(_f(_dc,_dd));
}
break;
case "cell":
var _e0=end.col>_dd.col?1:-1,_e1=end.row>_dd.row?1:-1;
for(var i=_dd.row,p=end.row+_e1;i!=p;i+=_e1){
for(var j=_dd.col,q=end.col+_e0;j!=q;j+=_e0){
_de(_f(_dc,i,j));
}
}
}
},_makeupForExceptions:function(_e2,_e3){
var _e4=[];
dojo.forEach(this._selected[_e2],function(v1){
dojo.forEach(_e3,function(v2){
if(v1[_e2]==v2[_e2]){
var pos=dojo.indexOf(v1.except,v2[_4[_e2]]);
if(pos>=0){
v1.except.splice(pos,1);
}
_e4.push(v2);
}
});
});
return _e4;
},_makeupForCells:function(_e5,_e6){
var _e7=[];
dojo.forEach(this._selected.cell,function(v1){
dojo.some(_e6,function(v2){
if(v1[_e5]==v2[_e5]){
_e7.push(v1);
return true;
}
return false;
});
});
this._remove("cell",_e7);
dojo.forEach(this._selected[_4[_e5]],function(v1){
dojo.forEach(_e6,function(v2){
var pos=dojo.indexOf(v1.except,v2[_e5]);
if(pos>=0){
v1.except.splice(pos,1);
}
});
});
},_addException:function(_e8,_e9){
dojo.forEach(this._selected[_e8],function(v1){
dojo.forEach(_e9,function(v2){
v1.except.push(v2[_4[_e8]]);
});
});
},_addCellException:function(_ea,_eb){
dojo.forEach(this._selected[_ea],function(v1){
dojo.forEach(_eb,function(v2){
if(v1[_ea]==v2[_ea]){
v1.except.push(v2[_4[_ea]]);
}
});
});
},_add:function(_ec,_ed){
var _ee=this.grid.layout.cells;
if(_ec=="cell"){
var _ef=this._makeupForExceptions("col",_ed);
var _f0=this._makeupForExceptions("row",_ed);
_ed=dojo.filter(_ed,function(_f1){
return dojo.indexOf(_ef,_f1)<0&&dojo.indexOf(_f0,_f1)<0&&!_ee[_f1.col].hidden&&!_ee[_f1.col].notselectable;
});
}else{
if(_ec=="col"){
_ed=dojo.filter(_ed,function(_f2){
return !_ee[_f2.col].hidden&&!_ee[_f2.col].notselectable;
});
}
this._makeupForCells(_ec,_ed);
this._selected[_ec]=dojo.filter(this._selected[_ec],function(v){
return dojo.every(_ed,function(_f3){
return v[_ec]!==_f3[_ec];
});
});
}
if(_ec!="col"&&this.grid._hasIdentity){
dojo.forEach(_ed,function(_f4){
var _f5=this.grid._by_idx[_f4.row];
if(_f5){
_f4.id=_f5.idty;
}
},this);
}
this._selected[_ec]=this._selected[_ec].concat(_ed);
},_remove:function(_f6,_f7){
var _f8=dojo.partial(_b,_f6);
this._selected[_f6]=dojo.filter(this._selected[_f6],function(v1){
return !dojo.some(_f7,function(v2){
return _f8(v1,v2);
});
});
if(_f6=="cell"){
this._addCellException("col",_f7);
this._addCellException("row",_f7);
}else{
this._addException(_4[_f6],_f7);
}
},_isCellNotInExcept:function(_f9,_fa){
var _fb=_fa[_f9],_fc=_fa[_4[_f9]];
return dojo.some(this._selected[_f9],function(v){
return v[_f9]==_fb&&dojo.indexOf(v.except,_fc)<0;
});
},_isSelected:function(_fd,_fe){
if(!_fe){
return false;
}
var res=dojo.some(this._selected[_fd],function(v){
var ret=_b(_fd,_fe,v);
if(ret&&_fd!=="cell"){
return v.except.length===0;
}
return ret;
});
if(!res&&_fd==="cell"){
res=(this._isCellNotInExcept("col",_fe)||this._isCellNotInExcept("row",_fe));
if(_fd==="cell"){
res=res&&!this.grid.layout.cells[_fe.col].notselectable;
}
}
return res;
},_isInLastRange:function(_ff,item,_100){
var _101=this[_100?"_lastSelectedAnchorPoint":"_lastAnchorPoint"][_ff],end=this[_100?"_lastSelectedEndPoint":"_lastEndPoint"][_ff];
if(!item||!_101||!end){
return false;
}
return _5(_ff,item,_101,end);
},_isValid:function(type,item,_102){
if(!item){
return false;
}
try{
var g=this.grid,_103=item[type];
switch(type){
case "col":
return _103>=0&&_103<g.layout.cells.length&&dojo.isArray(item.except)&&(_102||!g.layout.cells[_103].notselectable);
case "row":
return _103>=0&&_103<g.rowCount&&dojo.isArray(item.except);
case "cell":
return item.col>=0&&item.col<g.layout.cells.length&&item.row>=0&&item.row<g.rowCount&&(_102||!g.layout.cells[item.col].notselectable);
}
}
catch(e){
}
return false;
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Selector,{"dependency":["autoScroll"]});
})();
}
