/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.TreeGrid"]){
dojo._hasResource["dojox.grid.TreeGrid"]=true;
dojo.experimental("dojox.grid.TreeGrid");
dojo.provide("dojox.grid.TreeGrid");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.grid._TreeView");
dojo.require("dojox.grid.cells.tree");
dojo.require("dojox.grid.TreeSelection");
dojo.declare("dojox.grid._TreeAggregator",null,{cells:[],grid:null,childFields:[],constructor:function(_1){
this.cells=_1.cells||[];
this.childFields=_1.childFields||[];
this.grid=_1.grid;
this.store=this.grid.store;
},_cacheValue:function(_2,id,_3){
_2[id]=_3;
return _3;
},clearSubtotalCache:function(){
if(this.store){
delete this.store._cachedAggregates;
}
},cnt:function(_4,_5,_6){
var _7=0;
var _8=this.store;
var _9=this.childFields;
if(_9[_5]){
var _a=_8.getValues(_6,_9[_5]);
if(_4.index<=_5+1){
_7=_a.length;
}else{
dojo.forEach(_a,function(c){
_7+=this.getForCell(_4,_5+1,c,"cnt");
},this);
}
}else{
_7=1;
}
return _7;
},sum:function(_b,_c,_d){
var _e=0;
var _f=this.store;
var _10=this.childFields;
if(_10[_c]){
dojo.forEach(_f.getValues(_d,_10[_c]),function(c){
_e+=this.getForCell(_b,_c+1,c,"sum");
},this);
}else{
_e+=_f.getValue(_d,_b.field);
}
return _e;
},value:function(_11,_12,_13){
},getForCell:function(_14,_15,_16,_17){
var _18=this.store;
if(!_18||!_16||!_18.isItem(_16)){
return "";
}
var _19=_18._cachedAggregates=_18._cachedAggregates||{};
var id=_18.getIdentity(_16);
var _1a=_19[id]=_19[id]||[];
if(!_14.getOpenState){
_14=this.grid.getCell(_14.layoutIndex+_15+1);
}
var idx=_14.index;
var _1b=_1a[idx]=_1a[idx]||{};
_17=(_17||(_14.parentCell?_14.parentCell.aggregate:"sum"))||"sum";
var _1c=_14.field;
if(_1c==_18.getLabelAttributes()[0]){
_17="cnt";
}
var _1d=_1b[_17]=_1b[_17]||[];
if(_1d[_15]!=undefined){
return _1d[_15];
}
var _1e=((_14.parentCell&&_14.parentCell.itemAggregates)?_14.parentCell.itemAggregates[_14.idxInParent]:"")||"";
if(_1e&&_18.hasAttribute(_16,_1e)){
return this._cacheValue(_1d,_15,_18.getValue(_16,_1e));
}else{
if(_1e){
return this._cacheValue(_1d,_15,0);
}
}
return this._cacheValue(_1d,_15,this[_17](_14,_15,_16));
}});
dojo.declare("dojox.grid._TreeLayout",dojox.grid._Layout,{_isCollapsable:false,_getInternalStructure:function(_1f){
var g=this.grid;
var s=_1f;
var _20=s[0].cells[0];
var _21={type:"dojox.grid._TreeView",cells:[[]]};
var _22=[];
var _23=0;
var _24=function(_25,_26){
var _27=_25.children;
var _28=function(_29,idx){
var k,n={};
for(k in _29){
n[k]=_29[k];
}
n=dojo.mixin(n,{level:_26,idxInParent:_26>0?idx:-1,parentCell:_26>0?_25:null});
return n;
};
var ret=[];
dojo.forEach(_27,function(c,idx){
if("children" in c){
_22.push(c.field);
var _2a=ret[ret.length-1];
_2a.isCollapsable=true;
c.level=_26;
ret=ret.concat(_24(c,_26+1));
}else{
ret.push(_28(c,idx));
}
});
_23=Math.max(_23,_26);
return ret;
};
var _2b={children:_20,itemAggregates:[]};
_21.cells[0]=_24(_2b,0);
g.aggregator=new dojox.grid._TreeAggregator({cells:_21.cells[0],grid:g,childFields:_22});
if(g.scroller&&g.defaultOpen){
g.scroller.defaultRowHeight=g.scroller._origDefaultRowHeight*(2*_23+1);
}
return [_21];
},setStructure:function(_2c){
var s=_2c;
var g=this.grid;
if(g&&g.treeModel&&!dojo.every(s,function(i){
return ("cells" in i);
})){
s=arguments[0]=[{cells:[s]}];
}
if(s.length==1&&s[0].cells.length==1){
if(g&&g.treeModel){
s[0].type="dojox.grid._TreeView";
this._isCollapsable=true;
s[0].cells[0][(this.grid.treeModel?this.grid.expandoCell:0)].isCollapsable=true;
}else{
var _2d=dojo.filter(s[0].cells[0],function(c){
return ("children" in c);
});
if(_2d.length===1){
this._isCollapsable=true;
}
}
}
if(this._isCollapsable&&(!g||!g.treeModel)){
arguments[0]=this._getInternalStructure(s);
}
this.inherited(arguments);
},addCellDef:function(_2e,_2f,_30){
var obj=this.inherited(arguments);
return dojo.mixin(obj,dojox.grid.cells.TreeCell);
}});
dojo.declare("dojox.grid.TreePath",null,{level:0,_str:"",_arr:null,grid:null,store:null,cell:null,item:null,constructor:function(_31,_32){
if(dojo.isString(_31)){
this._str=_31;
this._arr=dojo.map(_31.split("/"),function(_33){
return parseInt(_33,10);
});
}else{
if(dojo.isArray(_31)){
this._str=_31.join("/");
this._arr=_31.slice(0);
}else{
if(typeof _31=="number"){
this._str=String(_31);
this._arr=[_31];
}else{
this._str=_31._str;
this._arr=_31._arr.slice(0);
}
}
}
this.level=this._arr.length-1;
this.grid=_32;
this.store=this.grid.store;
if(_32.treeModel){
this.cell=_32.layout.cells[_32.expandoCell];
}else{
this.cell=_32.layout.cells[this.level];
}
},item:function(){
if(!this._item){
this._item=this.grid.getItem(this._arr);
}
return this._item;
},compare:function(_34){
if(dojo.isString(_34)||dojo.isArray(_34)){
if(this._str==_34){
return 0;
}
if(_34.join&&this._str==_34.join("/")){
return 0;
}
_34=new dojox.grid.TreePath(_34,this.grid);
}else{
if(_34 instanceof dojox.grid.TreePath){
if(this._str==_34._str){
return 0;
}
}
}
for(var i=0,l=(this._arr.length<_34._arr.length?this._arr.length:_34._arr.length);i<l;i++){
if(this._arr[i]<_34._arr[i]){
return -1;
}
if(this._arr[i]>_34._arr[i]){
return 1;
}
}
if(this._arr.length<_34._arr.length){
return -1;
}
if(this._arr.length>_34._arr.length){
return 1;
}
return 0;
},isOpen:function(){
return this.cell.openStates&&this.cell.getOpenState(this.item());
},previous:function(){
var _35=this._arr.slice(0);
if(this._str=="0"){
return null;
}
var _36=_35.length-1;
if(_35[_36]===0){
_35.pop();
return new dojox.grid.TreePath(_35,this.grid);
}
_35[_36]--;
var _37=new dojox.grid.TreePath(_35,this.grid);
return _37.lastChild(true);
},next:function(){
var _38=this._arr.slice(0);
if(this.isOpen()){
_38.push(0);
}else{
_38[_38.length-1]++;
for(var i=this.level;i>=0;i--){
var _39=this.grid.getItem(_38.slice(0,i+1));
if(i>0){
if(!_39){
_38.pop();
_38[i-1]++;
}
}else{
if(!_39){
return null;
}
}
}
}
return new dojox.grid.TreePath(_38,this.grid);
},children:function(_3a){
if(!this.isOpen()&&!_3a){
return null;
}
var _3b=[];
var _3c=this.grid.treeModel;
if(_3c){
var _3d=this.item();
var _3e=_3c.store;
if(!_3c.mayHaveChildren(_3d)){
return null;
}
dojo.forEach(_3c.childrenAttrs,function(_3f){
_3b=_3b.concat(_3e.getValues(_3d,_3f));
});
}else{
_3b=this.store.getValues(this.item(),this.grid.layout.cells[this.cell.level+1].parentCell.field);
if(_3b.length>1&&this.grid.sortChildItems){
var _40=this.grid.getSortProps();
if(_40&&_40.length){
var _41=_40[0].attribute,_42=this.grid;
if(_41&&_3b[0][_41]){
var _43=!!_40[0].descending;
_3b=_3b.slice(0);
_3b.sort(function(a,b){
return _42._childItemSorter(a,b,_41,_43);
});
}
}
}
}
return _3b;
},childPaths:function(){
var _44=this.children();
if(!_44){
return [];
}
return dojo.map(_44,function(_45,_46){
return new dojox.grid.TreePath(this._str+"/"+_46,this.grid);
},this);
},parent:function(){
if(this.level===0){
return null;
}
return new dojox.grid.TreePath(this._arr.slice(0,this.level),this.grid);
},lastChild:function(_47){
var _48=this.children();
if(!_48||!_48.length){
return this;
}
var _49=new dojox.grid.TreePath(this._str+"/"+String(_48.length-1),this.grid);
if(!_47){
return _49;
}
return _49.lastChild(true);
},toString:function(){
return this._str;
}});
dojo.declare("dojox.grid._TreeFocusManager",dojox.grid._FocusManager,{setFocusCell:function(_4a,_4b){
if(_4a&&_4a.getNode(_4b)){
this.inherited(arguments);
}
},isLastFocusCell:function(){
if(this.cell&&this.cell.index==this.grid.layout.cellCount-1){
var _4c=new dojox.grid.TreePath(this.grid.rowCount-1,this.grid);
_4c=_4c.lastChild(true);
return this.rowIndex==_4c._str;
}
return false;
},next:function(){
if(this.cell){
var row=this.rowIndex,col=this.cell.index+1,cc=this.grid.layout.cellCount-1;
var _4d=new dojox.grid.TreePath(this.rowIndex,this.grid);
if(col>cc){
var _4e=_4d.next();
if(!_4e){
col--;
}else{
col=0;
_4d=_4e;
}
}
if(this.grid.edit.isEditing()){
var _4f=this.grid.getCell(col);
if(!this.isLastFocusCell()&&!_4f.editable){
this._focusifyCellNode(false);
this.cell=_4f;
this.rowIndex=_4d._str;
this.next();
return;
}
}
this.setFocusIndex(_4d._str,col);
}
},previous:function(){
if(this.cell){
var row=(this.rowIndex||0),col=(this.cell.index||0)-1;
var _50=new dojox.grid.TreePath(row,this.grid);
if(col<0){
var _51=_50.previous();
if(!_51){
col=0;
}else{
col=this.grid.layout.cellCount-1;
_50=_51;
}
}
if(this.grid.edit.isEditing()){
var _52=this.grid.getCell(col);
if(!this.isFirstFocusCell()&&!_52.editable){
this._focusifyCellNode(false);
this.cell=_52;
this.rowIndex=_50._str;
this.previous();
return;
}
}
this.setFocusIndex(_50._str,col);
}
},move:function(_53,_54){
if(this.isNavHeader()){
this.inherited(arguments);
return;
}
if(!this.cell){
return;
}
var sc=this.grid.scroller,r=this.rowIndex,rc=this.grid.rowCount-1,_55=new dojox.grid.TreePath(this.rowIndex,this.grid);
if(_53){
var row;
if(_53>0){
_55=_55.next();
row=_55._arr[0];
if(row>sc.getLastPageRow(sc.page)){
this.grid.setScrollTop(this.grid.scrollTop+sc.findScrollTop(row)-sc.findScrollTop(r));
}
}else{
if(_53<0){
_55=_55.previous();
row=_55._arr[0];
if(row<=sc.getPageRow(sc.page)){
this.grid.setScrollTop(this.grid.scrollTop-sc.findScrollTop(r)-sc.findScrollTop(row));
}
}
}
}
var cc=this.grid.layout.cellCount-1,i=this.cell.index,col=Math.min(cc,Math.max(0,i+_54));
var _56=this.grid.getCell(col);
var _57=_54<0?-1:1;
while(col>=0&&col<cc&&_56&&_56.hidden===true){
col+=_57;
_56=this.grid.getCell(col);
}
if(!_56||_56.hidden===true){
col=i;
}
if(_53){
this.grid.updateRow(r);
}
this.setFocusIndex(_55._str,col);
}});
dojo.declare("dojox.grid.TreeGrid",dojox.grid.DataGrid,{defaultOpen:true,sortChildItems:false,openAtLevels:[],treeModel:null,expandoCell:0,aggregator:null,_layoutClass:dojox.grid._TreeLayout,createSelection:function(){
this.selection=new dojox.grid.TreeSelection(this);
},_childItemSorter:function(a,b,_58,_59){
var av=this.store.getValue(a,_58);
var bv=this.store.getValue(b,_58);
if(av!=bv){
return av<bv==_59?1:-1;
}
return 0;
},_onNew:function(_5a,_5b){
if(!_5b||!_5b.item){
this.inherited(arguments);
}else{
var idx=this.getItemIndex(_5b.item);
if(typeof idx=="string"){
this.updateRow(idx.split("/")[0]);
}else{
if(idx>-1){
this.updateRow(idx);
}
}
}
},_onSet:function(_5c,_5d,_5e,_5f){
this._checkUpdateStatus();
if(this.aggregator){
this.aggregator.clearSubtotalCache();
}
var idx=this.getItemIndex(_5c);
if(typeof idx=="string"){
this.updateRow(idx.split("/")[0]);
}else{
if(idx>-1){
this.updateRow(idx);
}
}
},_onDelete:function(_60){
this._cleanupExpandoCache(this._getItemIndex(_60,true),this.store.getIdentity(_60),_60);
this.inherited(arguments);
},_cleanupExpandoCache:function(_61,_62,_63){
},_addItem:function(_64,_65,_66,_67){
if(!_67&&this.model&&dojo.indexOf(this.model.root.children,_64)==-1){
this.model.root.children[_65]=_64;
}
this.inherited(arguments);
},getItem:function(idx){
var _68=dojo.isArray(idx);
if(dojo.isString(idx)&&idx.indexOf("/")){
idx=idx.split("/");
_68=true;
}
if(_68&&idx.length==1){
idx=idx[0];
_68=false;
}
if(!_68){
return dojox.grid.DataGrid.prototype.getItem.call(this,idx);
}
var s=this.store;
var itm=dojox.grid.DataGrid.prototype.getItem.call(this,idx[0]);
var cf,i,j;
if(this.aggregator){
cf=this.aggregator.childFields||[];
if(cf){
for(i=0;i<idx.length-1&&itm;i++){
if(cf[i]){
itm=(s.getValues(itm,cf[i])||[])[idx[i+1]];
}else{
itm=null;
}
}
}
}else{
if(this.treeModel){
cf=this.treeModel.childrenAttrs||[];
if(cf&&itm){
for(i=1,il=idx.length;(i<il)&&itm;i++){
for(j=0,jl=cf.length;j<jl;j++){
if(cf[j]){
itm=(s.getValues(itm,cf[j])||[])[idx[i]];
}else{
itm=null;
}
if(itm){
break;
}
}
}
}
}
}
return itm||null;
},_getItemIndex:function(_69,_6a){
if(!_6a&&!this.store.isItem(_69)){
return -1;
}
var idx=this.inherited(arguments);
if(idx==-1){
var _6b=this.store.getIdentity(_69);
return this._by_idty_paths[_6b]||-1;
}
return idx;
},postMixInProperties:function(){
if(this.treeModel&&!("defaultOpen" in this.params)){
this.defaultOpen=false;
}
var def=this.defaultOpen;
this.openAtLevels=dojo.map(this.openAtLevels,function(l){
if(typeof l=="string"){
switch(l.toLowerCase()){
case "true":
return true;
break;
case "false":
return false;
break;
default:
var r=parseInt(l,10);
if(isNaN(r)){
return def;
}
return r;
break;
}
}
return l;
});
this._by_idty_paths={};
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
if(this.treeModel){
this._setModel(this.treeModel);
}
},setModel:function(_6c){
this._setModel(_6c);
this._refresh(true);
},_setModel:function(_6d){
if(_6d&&(!dijit.tree.ForestStoreModel||!(_6d instanceof dijit.tree.ForestStoreModel))){
throw new Error("dojox.grid.TreeGrid: treeModel must be an instance of dijit.tree.ForestStoreModel");
}
this.treeModel=_6d;
dojo.toggleClass(this.domNode,"dojoxGridTreeModel",this.treeModel?true:false);
this._setQuery(_6d?_6d.query:null);
this._setStore(_6d?_6d.store:null);
},createScroller:function(){
this.inherited(arguments);
this.scroller._origDefaultRowHeight=this.scroller.defaultRowHeight;
},createManagers:function(){
this.rows=new dojox.grid._RowManager(this);
this.focus=new dojox.grid._TreeFocusManager(this);
this.edit=new dojox.grid._EditManager(this);
},_setStore:function(_6e){
this.inherited(arguments);
if(this.treeModel&&!this.treeModel.root.children){
this.treeModel.root.children=[];
}
if(this.aggregator){
this.aggregator.store=_6e;
}
},getDefaultOpenState:function(_6f,_70){
var cf;
var _71=this.store;
if(this.treeModel){
return this.defaultOpen;
}
if(!_6f||!_71||!_71.isItem(_70)||!(cf=this.aggregator.childFields[_6f.level])){
return this.defaultOpen;
}
if(this.openAtLevels.length>_6f.level){
var _72=this.openAtLevels[_6f.level];
if(typeof _72=="boolean"){
return _72;
}else{
if(typeof _72=="number"){
return (_71.getValues(_70,cf).length<=_72);
}
}
}
return this.defaultOpen;
},onStyleRow:function(row){
if(!this.layout._isCollapsable){
this.inherited(arguments);
return;
}
var _73=dojo.attr(row.node,"dojoxTreeGridBaseClasses");
if(_73){
row.customClasses=_73;
}
var i=row;
var _74=i.node.tagName.toLowerCase();
i.customClasses+=(i.odd?" dojoxGridRowOdd":"")+(i.selected&&_74=="tr"?" dojoxGridRowSelected":"")+(i.over&&_74=="tr"?" dojoxGridRowOver":"");
this.focus.styleRow(i);
this.edit.styleRow(i);
},styleRowNode:function(_75,_76){
if(_76){
if(_76.tagName.toLowerCase()=="div"&&this.aggregator){
dojo.query("tr[dojoxTreeGridPath]",_76).forEach(function(_77){
this.rows.styleRowNode(dojo.attr(_77,"dojoxTreeGridPath"),_77);
},this);
}
this.rows.styleRowNode(_75,_76);
}
},onCanSelect:function(_78){
var _79=dojo.query("tr[dojoxTreeGridPath='"+_78+"']",this.domNode);
if(_79.length){
if(dojo.hasClass(_79[0],"dojoxGridSummaryRow")){
return false;
}
}
return this.inherited(arguments);
},onKeyDown:function(e){
if(e.altKey||e.metaKey){
return;
}
var dk=dojo.keys;
switch(e.keyCode){
case dk.UP_ARROW:
if(!this.edit.isEditing()&&this.focus.rowIndex!="0"){
dojo.stopEvent(e);
this.focus.move(-1,0);
}
break;
case dk.DOWN_ARROW:
var _7a=new dojox.grid.TreePath(this.focus.rowIndex,this);
var _7b=new dojox.grid.TreePath(this.rowCount-1,this);
_7b=_7b.lastChild(true);
if(!this.edit.isEditing()&&_7a.toString()!=_7b.toString()){
dojo.stopEvent(e);
this.focus.move(1,0);
}
break;
default:
this.inherited(arguments);
break;
}
},canEdit:function(_7c,_7d){
var _7e=_7c.getNode(_7d);
return _7e&&this._canEdit;
},doApplyCellEdit:function(_7f,_80,_81){
var _82=this.getItem(_80);
var _83=this.store.getValue(_82,_81);
if(typeof _83=="number"){
_7f=isNaN(_7f)?_7f:parseFloat(_7f);
}else{
if(typeof _83=="boolean"){
_7f=_7f=="true"?true:_7f=="false"?false:_7f;
}else{
if(_83 instanceof Date){
var _84=new Date(_7f);
_7f=isNaN(_84.getTime())?_7f:_84;
}
}
}
this.store.setValue(_82,_81,_7f);
this.onApplyCellEdit(_7f,_80,_81);
}});
dojox.grid.TreeGrid.markupFactory=function(_85,_86,_87,_88){
var d=dojo;
var _89=function(n){
var w=d.attr(n,"width")||"auto";
if((w!="auto")&&(w.slice(-2)!="em")&&(w.slice(-1)!="%")){
w=parseInt(w,10)+"px";
}
return w;
};
var _8a=function(_8b){
var _8c;
if(_8b.nodeName.toLowerCase()=="table"&&d.query("> colgroup",_8b).length===0&&(_8c=d.query("> thead > tr",_8b)).length==1){
var tr=_8c[0];
return d.query("> th",_8c[0]).map(function(th){
var _8d={type:d.trim(d.attr(th,"cellType")||""),field:d.trim(d.attr(th,"field")||"")};
if(_8d.type){
_8d.type=d.getObject(_8d.type);
}
var _8e=d.query("> table",th)[0];
if(_8e){
_8d.name="";
_8d.children=_8a(_8e);
if(d.hasAttr(th,"itemAggregates")){
_8d.itemAggregates=d.map(d.attr(th,"itemAggregates").split(","),function(v){
return d.trim(v);
});
}else{
_8d.itemAggregates=[];
}
if(d.hasAttr(th,"aggregate")){
_8d.aggregate=d.attr(th,"aggregate");
}
_8d.type=_8d.type||dojox.grid.cells.SubtableCell;
}else{
_8d.name=d.trim(d.attr(th,"name")||th.innerHTML);
if(d.hasAttr(th,"width")){
_8d.width=_89(th);
}
if(d.hasAttr(th,"relWidth")){
_8d.relWidth=window.parseInt(d.attr(th,"relWidth"),10);
}
if(d.hasAttr(th,"hidden")){
_8d.hidden=d.attr(th,"hidden")=="true";
}
_8d.field=_8d.field||_8d.name;
dojox.grid.DataGrid.cell_markupFactory(_88,th,_8d);
_8d.type=_8d.type||dojox.grid.cells.Cell;
}
if(_8d.type&&_8d.type.markupFactory){
_8d.type.markupFactory(th,_8d);
}
return _8d;
});
}
return [];
};
var _8f;
if(!_85.structure){
var row=_8a(_86);
if(row.length){
_85.structure=[{__span:Infinity,cells:[row]}];
}
}
return dojox.grid.DataGrid.markupFactory(_85,_86,_87,_88);
};
}
