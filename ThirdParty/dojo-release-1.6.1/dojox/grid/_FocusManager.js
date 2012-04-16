/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._FocusManager"]){
dojo._hasResource["dojox.grid._FocusManager"]=true;
dojo.provide("dojox.grid._FocusManager");
dojo.require("dojox.grid.util");
dojo.declare("dojox.grid._FocusManager",null,{constructor:function(_1){
this.grid=_1;
this.cell=null;
this.rowIndex=-1;
this._connects=[];
this._headerConnects=[];
this.headerMenu=this.grid.headerMenu;
this._connects.push(dojo.connect(this.grid.domNode,"onfocus",this,"doFocus"));
this._connects.push(dojo.connect(this.grid.domNode,"onblur",this,"doBlur"));
this._connects.push(dojo.connect(this.grid.domNode,"oncontextmenu",this,"doContextMenu"));
this._connects.push(dojo.connect(this.grid.lastFocusNode,"onfocus",this,"doLastNodeFocus"));
this._connects.push(dojo.connect(this.grid.lastFocusNode,"onblur",this,"doLastNodeBlur"));
this._connects.push(dojo.connect(this.grid,"_onFetchComplete",this,"_delayedCellFocus"));
this._connects.push(dojo.connect(this.grid,"postrender",this,"_delayedHeaderFocus"));
},destroy:function(){
dojo.forEach(this._connects,dojo.disconnect);
dojo.forEach(this._headerConnects,dojo.disconnect);
delete this.grid;
delete this.cell;
},_colHeadNode:null,_colHeadFocusIdx:null,_contextMenuBindNode:null,tabbingOut:false,focusClass:"dojoxGridCellFocus",focusView:null,initFocusView:function(){
this.focusView=this.grid.views.getFirstScrollingView()||this.focusView||this.grid.views.views[0];
this._initColumnHeaders();
},isFocusCell:function(_2,_3){
return (this.cell==_2)&&(this.rowIndex==_3);
},isLastFocusCell:function(){
if(this.cell){
return (this.rowIndex==this.grid.rowCount-1)&&(this.cell.index==this.grid.layout.cellCount-1);
}
return false;
},isFirstFocusCell:function(){
if(this.cell){
return (this.rowIndex===0)&&(this.cell.index===0);
}
return false;
},isNoFocusCell:function(){
return (this.rowIndex<0)||!this.cell;
},isNavHeader:function(){
return (!!this._colHeadNode);
},getHeaderIndex:function(){
if(this._colHeadNode){
return dojo.indexOf(this._findHeaderCells(),this._colHeadNode);
}else{
return -1;
}
},_focusifyCellNode:function(_4){
var n=this.cell&&this.cell.getNode(this.rowIndex);
if(n){
dojo.toggleClass(n,this.focusClass,_4);
if(_4){
var sl=this.scrollIntoView();
try{
if(!this.grid.edit.isEditing()){
dojox.grid.util.fire(n,"focus");
if(sl){
this.cell.view.scrollboxNode.scrollLeft=sl;
}
}
}
catch(e){
}
}
}
},_delayedCellFocus:function(){
if(this.isNavHeader()||!this.grid._focused){
return;
}
var n=this.cell&&this.cell.getNode(this.rowIndex);
if(n){
try{
if(!this.grid.edit.isEditing()){
dojo.toggleClass(n,this.focusClass,true);
this.blurHeader();
dojox.grid.util.fire(n,"focus");
}
}
catch(e){
}
}
},_delayedHeaderFocus:function(){
if(this.isNavHeader()){
this.focusHeader();
this.grid.domNode.focus();
}
},_initColumnHeaders:function(){
dojo.forEach(this._headerConnects,dojo.disconnect);
this._headerConnects=[];
var _5=this._findHeaderCells();
for(var i=0;i<_5.length;i++){
this._headerConnects.push(dojo.connect(_5[i],"onfocus",this,"doColHeaderFocus"));
this._headerConnects.push(dojo.connect(_5[i],"onblur",this,"doColHeaderBlur"));
}
},_findHeaderCells:function(){
var _6=dojo.query("th",this.grid.viewsHeaderNode);
var _7=[];
for(var i=0;i<_6.length;i++){
var _8=_6[i];
var _9=dojo.hasAttr(_8,"tabIndex");
var _a=dojo.attr(_8,"tabIndex");
if(_9&&_a<0){
_7.push(_8);
}
}
return _7;
},_setActiveColHeader:function(_b,_c,_d){
dojo.attr(this.grid.domNode,"aria-activedescendant",_b.id);
if(_d!=null&&_d>=0&&_d!=_c){
dojo.toggleClass(this._findHeaderCells()[_d],this.focusClass,false);
}
dojo.toggleClass(_b,this.focusClass,true);
this._colHeadNode=_b;
this._colHeadFocusIdx=_c;
this._scrollHeader(this._colHeadFocusIdx);
},scrollIntoView:function(){
var _e=(this.cell?this._scrollInfo(this.cell):null);
if(!_e||!_e.s){
return null;
}
var rt=this.grid.scroller.findScrollTop(this.rowIndex);
if(_e.n&&_e.sr){
if(_e.n.offsetLeft+_e.n.offsetWidth>_e.sr.l+_e.sr.w){
_e.s.scrollLeft=_e.n.offsetLeft+_e.n.offsetWidth-_e.sr.w;
}else{
if(_e.n.offsetLeft<_e.sr.l){
_e.s.scrollLeft=_e.n.offsetLeft;
}
}
}
if(_e.r&&_e.sr){
if(rt+_e.r.offsetHeight>_e.sr.t+_e.sr.h){
this.grid.setScrollTop(rt+_e.r.offsetHeight-_e.sr.h);
}else{
if(rt<_e.sr.t){
this.grid.setScrollTop(rt);
}
}
}
return _e.s.scrollLeft;
},_scrollInfo:function(_f,_10){
if(_f){
var cl=_f,sbn=cl.view.scrollboxNode,_11={w:sbn.clientWidth,l:sbn.scrollLeft,t:sbn.scrollTop,h:sbn.clientHeight},rn=cl.view.getRowNode(this.rowIndex);
return {c:cl,s:sbn,sr:_11,n:(_10?_10:_f.getNode(this.rowIndex)),r:rn};
}
return null;
},_scrollHeader:function(_12){
var _13=null;
if(this._colHeadNode){
var _14=this.grid.getCell(_12);
_13=this._scrollInfo(_14,_14.getNode(0));
}
if(_13&&_13.s&&_13.sr&&_13.n){
var _15=_13.sr.l+_13.sr.w;
if(_13.n.offsetLeft+_13.n.offsetWidth>_15){
_13.s.scrollLeft=_13.n.offsetLeft+_13.n.offsetWidth-_13.sr.w;
}else{
if(_13.n.offsetLeft<_13.sr.l){
_13.s.scrollLeft=_13.n.offsetLeft;
}else{
if(dojo.isIE<=7&&_14&&_14.view.headerNode){
_14.view.headerNode.scrollLeft=_13.s.scrollLeft;
}
}
}
}
},_isHeaderHidden:function(){
var _16=this.focusView;
if(!_16){
for(var i=0,_17;(_17=this.grid.views.views[i]);i++){
if(_17.headerNode){
_16=_17;
break;
}
}
}
return (_16&&dojo.getComputedStyle(_16.headerNode).display=="none");
},colSizeAdjust:function(e,_18,_19){
var _1a=this._findHeaderCells();
var _1b=this.focusView;
if(!_1b){
for(var i=0,_1c;(_1c=this.grid.views.views[i]);i++){
if(_1c.header.tableMap.map){
_1b=_1c;
break;
}
}
}
var _1d=_1a[_18];
if(!_1b||(_18==_1a.length-1&&_18===0)){
return;
}
_1b.content.baseDecorateEvent(e);
e.cellNode=_1d;
e.cellIndex=_1b.content.getCellNodeIndex(e.cellNode);
e.cell=(e.cellIndex>=0?this.grid.getCell(e.cellIndex):null);
if(_1b.header.canResize(e)){
var _1e={l:_19};
var _1f=_1b.header.colResizeSetup(e,false);
_1b.header.doResizeColumn(_1f,null,_1e);
_1b.update();
}
},styleRow:function(_20){
return;
},setFocusIndex:function(_21,_22){
this.setFocusCell(this.grid.getCell(_22),_21);
},setFocusCell:function(_23,_24){
if(_23&&!this.isFocusCell(_23,_24)){
this.tabbingOut=false;
if(this._colHeadNode){
this.blurHeader();
}
this._colHeadNode=this._colHeadFocusIdx=null;
this.focusGridView();
this._focusifyCellNode(false);
this.cell=_23;
this.rowIndex=_24;
this._focusifyCellNode(true);
}
if(dojo.isOpera){
setTimeout(dojo.hitch(this.grid,"onCellFocus",this.cell,this.rowIndex),1);
}else{
this.grid.onCellFocus(this.cell,this.rowIndex);
}
},next:function(){
if(this.cell){
var row=this.rowIndex,col=this.cell.index+1,cc=this.grid.layout.cellCount-1,rc=this.grid.rowCount-1;
if(col>cc){
col=0;
row++;
}
if(row>rc){
col=cc;
row=rc;
}
if(this.grid.edit.isEditing()){
var _25=this.grid.getCell(col);
if(!this.isLastFocusCell()&&(!_25.editable||this.grid.canEdit&&!this.grid.canEdit(_25,row))){
this.cell=_25;
this.rowIndex=row;
this.next();
return;
}
}
this.setFocusIndex(row,col);
}
},previous:function(){
if(this.cell){
var row=(this.rowIndex||0),col=(this.cell.index||0)-1;
if(col<0){
col=this.grid.layout.cellCount-1;
row--;
}
if(row<0){
row=0;
col=0;
}
if(this.grid.edit.isEditing()){
var _26=this.grid.getCell(col);
if(!this.isFirstFocusCell()&&!_26.editable){
this.cell=_26;
this.rowIndex=row;
this.previous();
return;
}
}
this.setFocusIndex(row,col);
}
},move:function(_27,_28){
var _29=_28<0?-1:1;
if(this.isNavHeader()){
var _2a=this._findHeaderCells();
var _2b=currentIdx=dojo.indexOf(_2a,this._colHeadNode);
currentIdx+=_28;
while(currentIdx>=0&&currentIdx<_2a.length&&_2a[currentIdx].style.display=="none"){
currentIdx+=_29;
}
if((currentIdx>=0)&&(currentIdx<_2a.length)){
this._setActiveColHeader(_2a[currentIdx],currentIdx,_2b);
}
}else{
if(this.cell){
var sc=this.grid.scroller,r=this.rowIndex,rc=this.grid.rowCount-1,row=Math.min(rc,Math.max(0,r+_27));
if(_27){
if(_27>0){
if(row>sc.getLastPageRow(sc.page)){
this.grid.setScrollTop(this.grid.scrollTop+sc.findScrollTop(row)-sc.findScrollTop(r));
}
}else{
if(_27<0){
if(row<=sc.getPageRow(sc.page)){
this.grid.setScrollTop(this.grid.scrollTop-sc.findScrollTop(r)-sc.findScrollTop(row));
}
}
}
}
var cc=this.grid.layout.cellCount-1,i=this.cell.index,col=Math.min(cc,Math.max(0,i+_28));
var _2c=this.grid.getCell(col);
while(col>=0&&col<cc&&_2c&&_2c.hidden===true){
col+=_29;
_2c=this.grid.getCell(col);
}
if(!_2c||_2c.hidden===true){
col=i;
}
var n=_2c.getNode(row);
if(!n&&_27){
if((row+_27)>=0&&(row+_27)<=rc){
this.move(_27>0?++_27:--_27,_28);
}
return;
}else{
if((!n||dojo.style(n,"display")==="none")&&_28){
if((col+_27)>=0&&(col+_27)<=cc){
this.move(_27,_28>0?++_28:--_28);
}
return;
}
}
this.setFocusIndex(row,col);
if(_27){
this.grid.updateRow(r);
}
}
}
},previousKey:function(e){
if(this.grid.edit.isEditing()){
dojo.stopEvent(e);
this.previous();
}else{
if(!this.isNavHeader()&&!this._isHeaderHidden()){
this.grid.domNode.focus();
dojo.stopEvent(e);
}else{
this.tabOut(this.grid.domNode);
if(this._colHeadFocusIdx!=null){
dojo.toggleClass(this._findHeaderCells()[this._colHeadFocusIdx],this.focusClass,false);
this._colHeadFocusIdx=null;
}
this._focusifyCellNode(false);
}
}
},nextKey:function(e){
var _2d=(this.grid.rowCount===0);
if(e.target===this.grid.domNode&&this._colHeadFocusIdx==null){
this.focusHeader();
dojo.stopEvent(e);
}else{
if(this.isNavHeader()){
this.blurHeader();
if(!this.findAndFocusGridCell()){
this.tabOut(this.grid.lastFocusNode);
}
this._colHeadNode=this._colHeadFocusIdx=null;
}else{
if(this.grid.edit.isEditing()){
dojo.stopEvent(e);
this.next();
}else{
this.tabOut(this.grid.lastFocusNode);
}
}
}
},tabOut:function(_2e){
this.tabbingOut=true;
_2e.focus();
},focusGridView:function(){
dojox.grid.util.fire(this.focusView,"focus");
},focusGrid:function(_2f){
this.focusGridView();
this._focusifyCellNode(true);
},findAndFocusGridCell:function(){
var _30=true;
var _31=(this.grid.rowCount===0);
if(this.isNoFocusCell()&&!_31){
var _32=0;
var _33=this.grid.getCell(_32);
if(_33.hidden){
_32=this.isNavHeader()?this._colHeadFocusIdx:0;
}
this.setFocusIndex(0,_32);
}else{
if(this.cell&&!_31){
if(this.focusView&&!this.focusView.rowNodes[this.rowIndex]){
this.grid.scrollToRow(this.rowIndex);
}
this.focusGrid();
}else{
_30=false;
}
}
this._colHeadNode=this._colHeadFocusIdx=null;
return _30;
},focusHeader:function(){
var _34=this._findHeaderCells();
var _35=this._colHeadFocusIdx;
if(this._isHeaderHidden()){
this.findAndFocusGridCell();
}else{
if(!this._colHeadFocusIdx){
if(this.isNoFocusCell()){
this._colHeadFocusIdx=0;
}else{
this._colHeadFocusIdx=this.cell.index;
}
}
}
this._colHeadNode=_34[this._colHeadFocusIdx];
while(this._colHeadNode&&this._colHeadFocusIdx>=0&&this._colHeadFocusIdx<_34.length&&this._colHeadNode.style.display=="none"){
this._colHeadFocusIdx++;
this._colHeadNode=_34[this._colHeadFocusIdx];
}
if(this._colHeadNode&&this._colHeadNode.style.display!="none"){
if(this.headerMenu&&this._contextMenuBindNode!=this.grid.domNode){
this.headerMenu.unBindDomNode(this.grid.viewsHeaderNode);
this.headerMenu.bindDomNode(this.grid.domNode);
this._contextMenuBindNode=this.grid.domNode;
}
this._setActiveColHeader(this._colHeadNode,this._colHeadFocusIdx,_35);
this._scrollHeader(this._colHeadFocusIdx);
this._focusifyCellNode(false);
}else{
this.findAndFocusGridCell();
}
},blurHeader:function(){
dojo.removeClass(this._colHeadNode,this.focusClass);
dojo.removeAttr(this.grid.domNode,"aria-activedescendant");
if(this.headerMenu&&this._contextMenuBindNode==this.grid.domNode){
var _36=this.grid.viewsHeaderNode;
this.headerMenu.unBindDomNode(this.grid.domNode);
this.headerMenu.bindDomNode(_36);
this._contextMenuBindNode=_36;
}
},doFocus:function(e){
if(e&&e.target!=e.currentTarget){
dojo.stopEvent(e);
return;
}
if(!this.tabbingOut){
this.focusHeader();
}
this.tabbingOut=false;
dojo.stopEvent(e);
},doBlur:function(e){
dojo.stopEvent(e);
},doContextMenu:function(e){
if(!this.headerMenu){
dojo.stopEvent(e);
}
},doLastNodeFocus:function(e){
if(this.tabbingOut){
this._focusifyCellNode(false);
}else{
if(this.grid.rowCount>0){
if(this.isNoFocusCell()){
this.setFocusIndex(0,0);
}
this._focusifyCellNode(true);
}else{
this.focusHeader();
}
}
this.tabbingOut=false;
dojo.stopEvent(e);
},doLastNodeBlur:function(e){
dojo.stopEvent(e);
},doColHeaderFocus:function(e){
this._setActiveColHeader(e.target,dojo.attr(e.target,"idx"),this._colHeadFocusIdx);
this._scrollHeader(this.getHeaderIndex());
dojo.stopEvent(e);
},doColHeaderBlur:function(e){
dojo.toggleClass(e.target,this.focusClass,false);
}});
}
