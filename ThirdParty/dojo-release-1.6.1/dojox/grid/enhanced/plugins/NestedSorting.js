/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.NestedSorting"]){
dojo._hasResource["dojox.grid.enhanced.plugins.NestedSorting"]=true;
dojo.provide("dojox.grid.enhanced.plugins.NestedSorting");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.declare("dojox.grid.enhanced.plugins.NestedSorting",dojox.grid.enhanced._Plugin,{name:"nestedSorting",_currMainSort:"none",_currRegionIdx:-1,_a11yText:{"dojoxGridDescending":"&#9662;","dojoxGridAscending":"&#9652;","dojoxGridAscendingTip":"&#1784;","dojoxGridDescendingTip":"&#1783;","dojoxGridUnsortedTip":"x"},constructor:function(){
this._sortDef=[];
this._sortData={};
this._headerNodes={};
this._excludedColIdx=[];
this.nls=this.grid._nls;
this.grid.setSortInfo=function(){
};
this.grid.setSortIndex=dojo.hitch(this,"_setGridSortIndex");
this.grid.getSortProps=dojo.hitch(this,"getSortProps");
if(this.grid.sortFields){
this._setGridSortIndex(this.grid.sortFields,null,true);
}
this.connect(this.grid.views,"render","_initSort");
this.initCookieHandler();
dojo.subscribe("dojox/grid/rearrange/move/"+this.grid.id,dojo.hitch(this,"_onColumnDnD"));
},onStartUp:function(){
this.inherited(arguments);
this.connect(this.grid,"onHeaderCellClick","_onHeaderCellClick");
this.connect(this.grid,"onHeaderCellMouseOver","_onHeaderCellMouseOver");
this.connect(this.grid,"onHeaderCellMouseOut","_onHeaderCellMouseOut");
},_onColumnDnD:function(_1,_2){
if(_1!=="col"){
return;
}
var m=_2,_3={},d=this._sortData,p;
var cr=this._getCurrentRegion();
this._blurRegion(cr);
var _4=dojo.attr(this._getRegionHeader(cr),"idx");
for(p in m){
if(d[p]){
_3[m[p]]=d[p];
delete d[p];
}
if(p===_4){
_4=m[p];
}
}
for(p in _3){
d[p]=_3[p];
}
var c=this._headerNodes[_4];
this._currRegionIdx=dojo.indexOf(this._getRegions(),c.firstChild);
this._initSort(false);
},_setGridSortIndex:function(_5,_6,_7){
if(dojo.isArray(_5)){
var i,d,_8;
for(i=0;i<_5.length;i++){
d=_5[i];
_8=this.grid.getCellByField(d.attribute);
if(!_8){
console.warn("Invalid sorting option, column ",d.attribute," not found.");
return;
}
if(_8["nosort"]||!this.grid.canSort(_8.index,_8.field)){
console.warn("Invalid sorting option, column ",d.attribute," is unsortable.");
return;
}
}
this.clearSort();
dojo.forEach(_5,function(d,i){
_8=this.grid.getCellByField(d.attribute);
this.setSortData(_8.index,"index",i);
this.setSortData(_8.index,"order",d.descending?"desc":"asc");
},this);
}else{
if(!isNaN(_5)){
if(_6===undefined){
return;
}
this.setSortData(_5,"order",_6?"asc":"desc");
}else{
return;
}
}
this._updateSortDef();
if(!_7){
this.grid.sort();
}
},getSortProps:function(){
return this._sortDef.length?this._sortDef:null;
},_initSort:function(_9){
var g=this.grid,n=g.domNode,_a=this._sortDef.length;
dojo.toggleClass(n,"dojoxGridSorted",!!_a);
dojo.toggleClass(n,"dojoxGridSingleSorted",_a===1);
dojo.toggleClass(n,"dojoxGridNestSorted",_a>1);
if(_a>0){
this._currMainSort=this._sortDef[0].descending?"desc":"asc";
}
var _b,_c=this._excludedCoIdx=[];
this._headerNodes=dojo.query("th",g.viewsHeaderNode).forEach(function(n){
_b=parseInt(dojo.attr(n,"idx"),10);
if(dojo.style(n,"display")==="none"||g.layout.cells[_b]["nosort"]||(g.canSort&&!g.canSort(_b,g.layout.cells[_b]["field"]))){
_c.push(_b);
}
});
this._headerNodes.forEach(this._initHeaderNode,this);
this._initFocus();
if(_9){
this._focusHeader();
}
},_initHeaderNode:function(_d){
var _e=dojo.query(".dojoxGridSortNode",_d)[0];
if(_e){
dojo.toggleClass(_e,"dojoxGridSortNoWrap",true);
}
if(dojo.indexOf(this._excludedCoIdx,dojo.attr(_d,"idx"))>=0){
dojo.addClass(_d,"dojoxGridNoSort");
return;
}
if(!dojo.query(".dojoxGridSortBtn",_d).length){
this._connects=dojo.filter(this._connects,function(_f){
if(_f._sort){
dojo.disconnect(_f);
return false;
}
return true;
});
var n=dojo.create("a",{className:"dojoxGridSortBtn dojoxGridSortBtnNested",title:this.nls.nestedSort+" - "+this.nls.ascending,innerHTML:"1"},_d.firstChild,"last");
n.onmousedown=dojo.stopEvent;
n=dojo.create("a",{className:"dojoxGridSortBtn dojoxGridSortBtnSingle",title:this.nls.singleSort+" - "+this.nls.ascending},_d.firstChild,"last");
n.onmousedown=dojo.stopEvent;
}else{
var a1=dojo.query(".dojoxGridSortBtnSingle",_d)[0];
var a2=dojo.query(".dojoxGridSortBtnNested",_d)[0];
a1.className="dojoxGridSortBtn dojoxGridSortBtnSingle";
a2.className="dojoxGridSortBtn dojoxGridSortBtnNested";
a2.innerHTML="1";
dojo.removeClass(_d,"dojoxGridCellShowIndex");
dojo.removeClass(_d.firstChild,"dojoxGridSortNodeSorted");
dojo.removeClass(_d.firstChild,"dojoxGridSortNodeAsc");
dojo.removeClass(_d.firstChild,"dojoxGridSortNodeDesc");
dojo.removeClass(_d.firstChild,"dojoxGridSortNodeMain");
dojo.removeClass(_d.firstChild,"dojoxGridSortNodeSub");
}
this._updateHeaderNodeUI(_d);
},_onHeaderCellClick:function(e){
this._focusRegion(e.target);
if(dojo.hasClass(e.target,"dojoxGridSortBtn")){
this._onSortBtnClick(e);
dojo.stopEvent(e);
this._focusRegion(this._getCurrentRegion());
}
},_onHeaderCellMouseOver:function(e){
if(!e.cell){
return;
}
if(this._sortDef.length>1){
return;
}
if(this._sortData[e.cellIndex]&&this._sortData[e.cellIndex].index===0){
return;
}
var p;
for(p in this._sortData){
if(this._sortData[p]&&this._sortData[p].index===0){
dojo.addClass(this._headerNodes[p],"dojoxGridCellShowIndex");
break;
}
}
if(!dojo.hasClass(dojo.body(),"dijit_a11y")){
return;
}
var i=e.cell.index,_10=e.cellNode;
var _11=dojo.query(".dojoxGridSortBtnSingle",_10)[0];
var _12=dojo.query(".dojoxGridSortBtnNested",_10)[0];
var _13="none";
if(dojo.hasClass(this.grid.domNode,"dojoxGridSingleSorted")){
_13="single";
}else{
if(dojo.hasClass(this.grid.domNode,"dojoxGridNestSorted")){
_13="nested";
}
}
var _14=dojo.attr(_12,"orderIndex");
if(_14===null||_14===undefined){
dojo.attr(_12,"orderIndex",_12.innerHTML);
_14=_12.innerHTML;
}
if(this.isAsc(i)){
_12.innerHTML=_14+this._a11yText.dojoxGridDescending;
}else{
if(this.isDesc(i)){
_12.innerHTML=_14+this._a11yText.dojoxGridUnsortedTip;
}else{
_12.innerHTML=_14+this._a11yText.dojoxGridAscending;
}
}
if(this._currMainSort==="none"){
_11.innerHTML=this._a11yText.dojoxGridAscending;
}else{
if(this._currMainSort==="asc"){
_11.innerHTML=this._a11yText.dojoxGridDescending;
}else{
if(this._currMainSort==="desc"){
_11.innerHTML=this._a11yText.dojoxGridUnsortedTip;
}
}
}
},_onHeaderCellMouseOut:function(e){
var p;
for(p in this._sortData){
if(this._sortData[p]&&this._sortData[p].index===0){
dojo.removeClass(this._headerNodes[p],"dojoxGridCellShowIndex");
break;
}
}
},_onSortBtnClick:function(e){
var _15=e.cell.index;
if(dojo.hasClass(e.target,"dojoxGridSortBtnSingle")){
this._prepareSingleSort(_15);
}else{
if(dojo.hasClass(e.target,"dojoxGridSortBtnNested")){
this._prepareNestedSort(_15);
}else{
return;
}
}
dojo.stopEvent(e);
this._doSort(_15);
},_doSort:function(_16){
if(!this._sortData[_16]||!this._sortData[_16].order){
this.setSortData(_16,"order","asc");
}else{
if(this.isAsc(_16)){
this.setSortData(_16,"order","desc");
}else{
if(this.isDesc(_16)){
this.removeSortData(_16);
}
}
}
this._updateSortDef();
this.grid.sort();
this._initSort(true);
},setSortData:function(_17,_18,_19){
var sd=this._sortData[_17];
if(!sd){
sd=this._sortData[_17]={};
}
sd[_18]=_19;
},removeSortData:function(_1a){
var d=this._sortData,i=d[_1a].index,p;
delete d[_1a];
for(p in d){
if(d[p].index>i){
d[p].index--;
}
}
},_prepareSingleSort:function(_1b){
var d=this._sortData,p;
for(p in d){
delete d[p];
}
this.setSortData(_1b,"index",0);
this.setSortData(_1b,"order",this._currMainSort==="none"?null:this._currMainSort);
if(!this._sortData[_1b]||!this._sortData[_1b].order){
this._currMainSort="asc";
}else{
if(this.isAsc(_1b)){
this._currMainSort="desc";
}else{
if(this.isDesc(_1b)){
this._currMainSort="none";
}
}
}
},_prepareNestedSort:function(_1c){
var i=this._sortData[_1c]?this._sortData[_1c].index:null;
if(i===0||!!i){
return;
}
this.setSortData(_1c,"index",this._sortDef.length);
},_updateSortDef:function(){
this._sortDef.length=0;
var d=this._sortData,p;
for(p in d){
this._sortDef[d[p].index]={attribute:this.grid.layout.cells[p].field,descending:d[p].order==="desc"};
}
},_updateHeaderNodeUI:function(_1d){
var _1e=this._getCellByNode(_1d);
var _1f=_1e.index;
var _20=this._sortData[_1f];
var _21=dojo.query(".dojoxGridSortNode",_1d)[0];
var _22=dojo.query(".dojoxGridSortBtnSingle",_1d)[0];
var _23=dojo.query(".dojoxGridSortBtnNested",_1d)[0];
dojo.toggleClass(_22,"dojoxGridSortBtnAsc",this._currMainSort==="asc");
dojo.toggleClass(_22,"dojoxGridSortBtnDesc",this._currMainSort==="desc");
if(this._currMainSort==="asc"){
_22.title=this.nls.singleSort+" - "+this.nls.descending;
}else{
if(this._currMainSort==="desc"){
_22.title=this.nls.singleSort+" - "+this.nls.unsorted;
}else{
_22.title=this.nls.singleSort+" - "+this.nls.ascending;
}
}
var _24=this;
function _25(){
var _26="Column "+(_1e.index+1)+" "+_1e.field;
var _27="none";
var _28="ascending";
if(_20){
_27=_20.order==="asc"?"ascending":"descending";
_28=_20.order==="asc"?"descending":"none";
}
var _29=_26+" - is sorted by "+_27;
var _2a=_26+" - is nested sorted by "+_27;
var _2b=_26+" - choose to sort by "+_28;
var _2c=_26+" - choose to nested sort by "+_28;
dijit.setWaiState(_22,"label",_29);
dijit.setWaiState(_23,"label",_2a);
var _2d=[_24.connect(_22,"onmouseover",function(){
dijit.setWaiState(_22,"label",_2b);
}),_24.connect(_22,"onmouseout",function(){
dijit.setWaiState(_22,"label",_29);
}),_24.connect(_23,"onmouseover",function(){
dijit.setWaiState(_23,"label",_2c);
}),_24.connect(_23,"onmouseout",function(){
dijit.setWaiState(_23,"label",_2a);
})];
dojo.forEach(_2d,function(_2e){
_2e._sort=true;
});
};
_25();
var _2f=dojo.hasClass(dojo.body(),"dijit_a11y");
if(!_20){
_23.innerHTML=this._sortDef.length+1;
return;
}
if(_20.index||(_20.index===0&&this._sortDef.length>1)){
_23.innerHTML=_20.index+1;
}
dojo.addClass(_21,"dojoxGridSortNodeSorted");
if(this.isAsc(_1f)){
dojo.addClass(_21,"dojoxGridSortNodeAsc");
_23.title=this.nls.nestedSort+" - "+this.nls.descending;
if(_2f){
_21.innerHTML=this._a11yText.dojoxGridAscendingTip;
}
}else{
if(this.isDesc(_1f)){
dojo.addClass(_21,"dojoxGridSortNodeDesc");
_23.title=this.nls.nestedSort+" - "+this.nls.unsorted;
if(_2f){
_21.innerHTML=this._a11yText.dojoxGridDescendingTip;
}
}
}
dojo.addClass(_21,(_20.index===0?"dojoxGridSortNodeMain":"dojoxGridSortNodeSub"));
},isAsc:function(_30){
return this._sortData[_30].order==="asc";
},isDesc:function(_31){
return this._sortData[_31].order==="desc";
},_getCellByNode:function(_32){
var i;
for(i=0;i<this._headerNodes.length;i++){
if(this._headerNodes[i]===_32){
return this.grid.layout.cells[i];
}
}
return null;
},clearSort:function(){
this._sortData={};
this._sortDef.length=0;
},initCookieHandler:function(){
if(this.grid.addCookieHandler){
this.grid.addCookieHandler({name:"sortOrder",onLoad:dojo.hitch(this,"_loadNestedSortingProps"),onSave:dojo.hitch(this,"_saveNestedSortingProps")});
}
},_loadNestedSortingProps:function(_33,_34){
this._setGridSortIndex(_33);
},_saveNestedSortingProps:function(_35){
return this.getSortProps();
},_initFocus:function(){
var f=this.focus=this.grid.focus;
this._focusRegions=this._getRegions();
if(!this._headerArea){
var _36=this._headerArea=f.getArea("header");
_36.onFocus=f.focusHeader=dojo.hitch(this,"_focusHeader");
_36.onBlur=f.blurHeader=f._blurHeader=dojo.hitch(this,"_blurHeader");
_36.onMove=dojo.hitch(this,"_onMove");
_36.onKeyDown=dojo.hitch(this,"_onKeyDown");
_36._regions=[];
_36.getRegions=null;
this.connect(this.grid,"onBlur","_blurHeader");
}
},_focusHeader:function(evt){
if(this._currRegionIdx===-1){
this._onMove(0,1,null);
}else{
this._focusRegion(this._getCurrentRegion());
}
try{
dojo.stopEvent(evt);
}
catch(e){
}
return true;
},_blurHeader:function(evt){
this._blurRegion(this._getCurrentRegion());
return true;
},_onMove:function(_37,_38,evt){
var _39=this._currRegionIdx||0,_3a=this._focusRegions;
var _3b=_3a[_39+_38];
if(!_3b){
return;
}else{
if(dojo.style(_3b,"display")==="none"||dojo.style(_3b,"visibility")==="hidden"){
this._onMove(_37,_38+(_38>0?1:-1),evt);
return;
}
}
this._focusRegion(_3b);
var _3c=this._getRegionView(_3b);
_3c.scrollboxNode.scrollLeft=_3c.headerNode.scrollLeft;
},_onKeyDown:function(e,_3d){
if(_3d){
switch(e.keyCode){
case dojo.keys.ENTER:
case dojo.keys.SPACE:
if(dojo.hasClass(e.target,"dojoxGridSortBtnSingle")||dojo.hasClass(e.target,"dojoxGridSortBtnNested")){
this._onSortBtnClick(e);
}
}
}
},_getRegionView:function(_3e){
var _3f=_3e;
while(_3f&&!dojo.hasClass(_3f,"dojoxGridHeader")){
_3f=_3f.parentNode;
}
if(_3f){
return dojo.filter(this.grid.views.views,function(_40){
return _40.headerNode===_3f;
})[0]||null;
}
return null;
},_getRegions:function(){
var _41=[],_42=this.grid.layout.cells;
this._headerNodes.forEach(function(n,i){
if(dojo.style(n,"display")==="none"){
return;
}
if(_42[i]["isRowSelector"]){
_41.push(n);
return;
}
dojo.query(".dojoxGridSortNode,.dojoxGridSortBtnNested,.dojoxGridSortBtnSingle",n).forEach(function(_43){
dojo.attr(_43,"tabindex",0);
_41.push(_43);
});
},this);
return _41;
},_focusRegion:function(_44){
if(!_44){
return;
}
var _45=this._getCurrentRegion();
if(_45&&_44!==_45){
this._blurRegion(_45);
}
var _46=this._getRegionHeader(_44);
dojo.addClass(_46,"dojoxGridCellSortFocus");
if(dojo.hasClass(_44,"dojoxGridSortNode")){
dojo.addClass(_44,"dojoxGridSortNodeFocus");
}else{
if(dojo.hasClass(_44,"dojoxGridSortBtn")){
dojo.addClass(_44,"dojoxGridSortBtnFocus");
}
}
_44.focus();
this.focus.currentArea("header");
this._currRegionIdx=dojo.indexOf(this._focusRegions,_44);
},_blurRegion:function(_47){
if(!_47){
return;
}
var _48=this._getRegionHeader(_47);
dojo.removeClass(_48,"dojoxGridCellSortFocus");
if(dojo.hasClass(_47,"dojoxGridSortNode")){
dojo.removeClass(_47,"dojoxGridSortNodeFocus");
}else{
if(dojo.hasClass(_47,"dojoxGridSortBtn")){
dojo.removeClass(_47,"dojoxGridSortBtnFocus");
}
}
_47.blur();
},_getCurrentRegion:function(){
return this._focusRegions[this._currRegionIdx];
},_getRegionHeader:function(_49){
while(_49&&!dojo.hasClass(_49,"dojoxGridCell")){
_49=_49.parentNode;
}
return _49;
},destroy:function(){
this._sortDef=this._sortData=null;
this._headerNodes=this._focusRegions=null;
this.inherited(arguments);
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.NestedSorting);
}
