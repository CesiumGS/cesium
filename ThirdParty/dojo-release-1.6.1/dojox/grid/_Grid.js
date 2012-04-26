/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._Grid"]){
dojo._hasResource["dojox.grid._Grid"]=true;
dojo.provide("dojox.grid._Grid");
dojo.require("dijit.dijit");
dojo.require("dijit.Menu");
dojo.require("dojox.html.metrics");
dojo.require("dojox.grid.util");
dojo.require("dojox.grid._Scroller");
dojo.require("dojox.grid._Layout");
dojo.require("dojox.grid._View");
dojo.require("dojox.grid._ViewManager");
dojo.require("dojox.grid._RowManager");
dojo.require("dojox.grid._FocusManager");
dojo.require("dojox.grid._EditManager");
dojo.require("dojox.grid.Selection");
dojo.require("dojox.grid._RowSelector");
dojo.require("dojox.grid._Events");
dojo.requireLocalization("dijit","loading",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
(function(){
if(!dojo.isCopyKey){
dojo.isCopyKey=dojo.dnd.getCopyKeyState;
}
dojo.declare("dojox.grid._Grid",[dijit._Widget,dijit._Templated,dojox.grid._Events],{templateString:"<div hidefocus=\"hidefocus\" role=\"grid\" dojoAttachEvent=\"onmouseout:_mouseOut\">\n\t<div class=\"dojoxGridMasterHeader\" dojoAttachPoint=\"viewsHeaderNode\" role=\"presentation\"></div>\n\t<div class=\"dojoxGridMasterView\" dojoAttachPoint=\"viewsNode\" role=\"presentation\"></div>\n\t<div class=\"dojoxGridMasterMessages\" style=\"display: none;\" dojoAttachPoint=\"messagesNode\"></div>\n\t<span dojoAttachPoint=\"lastFocusNode\" tabindex=\"0\"></span>\n</div>\n",classTag:"dojoxGrid",rowCount:5,keepRows:75,rowsPerPage:25,autoWidth:false,initialWidth:"",autoHeight:"",rowHeight:0,autoRender:true,defaultHeight:"15em",height:"",structure:null,elasticView:-1,singleClickEdit:false,selectionMode:"extended",rowSelector:"",columnReordering:false,headerMenu:null,placeholderLabel:"GridColumns",selectable:false,_click:null,loadingMessage:"<span class='dojoxGridLoading'>${loadingState}</span>",errorMessage:"<span class='dojoxGridError'>${errorState}</span>",noDataMessage:"",escapeHTMLInData:true,formatterScope:null,editable:false,sortInfo:0,themeable:true,_placeholders:null,_layoutClass:dojox.grid._Layout,buildRendering:function(){
this.inherited(arguments);
if(!this.domNode.getAttribute("tabIndex")){
this.domNode.tabIndex="0";
}
this.createScroller();
this.createLayout();
this.createViews();
this.createManagers();
this.createSelection();
this.connect(this.selection,"onSelected","onSelected");
this.connect(this.selection,"onDeselected","onDeselected");
this.connect(this.selection,"onChanged","onSelectionChanged");
dojox.html.metrics.initOnFontResize();
this.connect(dojox.html.metrics,"onFontResize","textSizeChanged");
dojox.grid.util.funnelEvents(this.domNode,this,"doKeyEvent",dojox.grid.util.keyEvents);
if(this.selectionMode!="none"){
dojo.attr(this.domNode,"aria-multiselectable",this.selectionMode=="single"?"false":"true");
}
dojo.addClass(this.domNode,this.classTag);
if(!this.isLeftToRight()){
dojo.addClass(this.domNode,this.classTag+"Rtl");
}
},postMixInProperties:function(){
this.inherited(arguments);
var _1=dojo.i18n.getLocalization("dijit","loading",this.lang);
this.loadingMessage=dojo.string.substitute(this.loadingMessage,_1);
this.errorMessage=dojo.string.substitute(this.errorMessage,_1);
if(this.srcNodeRef&&this.srcNodeRef.style.height){
this.height=this.srcNodeRef.style.height;
}
this._setAutoHeightAttr(this.autoHeight,true);
this.lastScrollTop=this.scrollTop=0;
},postCreate:function(){
this._placeholders=[];
this._setHeaderMenuAttr(this.headerMenu);
this._setStructureAttr(this.structure);
this._click=[];
this.inherited(arguments);
if(this.domNode&&this.autoWidth&&this.initialWidth){
this.domNode.style.width=this.initialWidth;
}
if(this.domNode&&!this.editable){
dojo.attr(this.domNode,"aria-readonly","true");
}
},destroy:function(){
this.domNode.onReveal=null;
this.domNode.onSizeChange=null;
delete this._click;
this.edit.destroy();
delete this.edit;
this.views.destroyViews();
if(this.scroller){
this.scroller.destroy();
delete this.scroller;
}
if(this.focus){
this.focus.destroy();
delete this.focus;
}
if(this.headerMenu&&this._placeholders.length){
dojo.forEach(this._placeholders,function(p){
p.unReplace(true);
});
this.headerMenu.unBindDomNode(this.viewsHeaderNode);
}
this.inherited(arguments);
},_setAutoHeightAttr:function(ah,_2){
if(typeof ah=="string"){
if(!ah||ah=="false"){
ah=false;
}else{
if(ah=="true"){
ah=true;
}else{
ah=window.parseInt(ah,10);
}
}
}
if(typeof ah=="number"){
if(isNaN(ah)){
ah=false;
}
if(ah<0){
ah=true;
}else{
if(ah===0){
ah=false;
}
}
}
this.autoHeight=ah;
if(typeof ah=="boolean"){
this._autoHeight=ah;
}else{
if(typeof ah=="number"){
this._autoHeight=(ah>=this.get("rowCount"));
}else{
this._autoHeight=false;
}
}
if(this._started&&!_2){
this.render();
}
},_getRowCountAttr:function(){
return this.updating&&this.invalidated&&this.invalidated.rowCount!=undefined?this.invalidated.rowCount:this.rowCount;
},textSizeChanged:function(){
this.render();
},sizeChange:function(){
this.update();
},createManagers:function(){
this.rows=new dojox.grid._RowManager(this);
this.focus=new dojox.grid._FocusManager(this);
this.edit=new dojox.grid._EditManager(this);
},createSelection:function(){
this.selection=new dojox.grid.Selection(this);
},createScroller:function(){
this.scroller=new dojox.grid._Scroller();
this.scroller.grid=this;
this.scroller.renderRow=dojo.hitch(this,"renderRow");
this.scroller.removeRow=dojo.hitch(this,"rowRemoved");
},createLayout:function(){
this.layout=new this._layoutClass(this);
this.connect(this.layout,"moveColumn","onMoveColumn");
},onMoveColumn:function(){
this.render();
},onResizeColumn:function(_3){
},createViews:function(){
this.views=new dojox.grid._ViewManager(this);
this.views.createView=dojo.hitch(this,"createView");
},createView:function(_4,_5){
var c=dojo.getObject(_4);
var _6=new c({grid:this,index:_5});
this.viewsNode.appendChild(_6.domNode);
this.viewsHeaderNode.appendChild(_6.headerNode);
this.views.addView(_6);
dojo.attr(this.domNode,"align",dojo._isBodyLtr()?"left":"right");
return _6;
},buildViews:function(){
for(var i=0,vs;(vs=this.layout.structure[i]);i++){
this.createView(vs.type||dojox._scopeName+".grid._View",i).setStructure(vs);
}
this.scroller.setContentNodes(this.views.getContentNodes());
},_setStructureAttr:function(_7){
var s=_7;
if(s&&dojo.isString(s)){
dojo.deprecated("dojox.grid._Grid.set('structure', 'objVar')","use dojox.grid._Grid.set('structure', objVar) instead","2.0");
s=dojo.getObject(s);
}
this.structure=s;
if(!s){
if(this.layout.structure){
s=this.layout.structure;
}else{
return;
}
}
this.views.destroyViews();
this.focus.focusView=null;
if(s!==this.layout.structure){
this.layout.setStructure(s);
}
this._structureChanged();
},setStructure:function(_8){
dojo.deprecated("dojox.grid._Grid.setStructure(obj)","use dojox.grid._Grid.set('structure', obj) instead.","2.0");
this._setStructureAttr(_8);
},getColumnTogglingItems:function(){
return dojo.map(this.layout.cells,function(_9){
if(!_9.menuItems){
_9.menuItems=[];
}
var _a=this;
var _b=new dijit.CheckedMenuItem({label:_9.name,checked:!_9.hidden,_gridCell:_9,onChange:function(_c){
if(_a.layout.setColumnVisibility(this._gridCell.index,_c)){
var _d=this._gridCell.menuItems;
if(_d.length>1){
dojo.forEach(_d,function(_e){
if(_e!==this){
_e.setAttribute("checked",_c);
}
},this);
}
_c=dojo.filter(_a.layout.cells,function(c){
if(c.menuItems.length>1){
dojo.forEach(c.menuItems,"item.set('disabled', false);");
}else{
c.menuItems[0].set("disabled",false);
}
return !c.hidden;
});
if(_c.length==1){
dojo.forEach(_c[0].menuItems,"item.set('disabled', true);");
}
}
},destroy:function(){
var _f=dojo.indexOf(this._gridCell.menuItems,this);
this._gridCell.menuItems.splice(_f,1);
delete this._gridCell;
dijit.CheckedMenuItem.prototype.destroy.apply(this,arguments);
}});
_9.menuItems.push(_b);
return _b;
},this);
},_setHeaderMenuAttr:function(_10){
if(this._placeholders&&this._placeholders.length){
dojo.forEach(this._placeholders,function(p){
p.unReplace(true);
});
this._placeholders=[];
}
if(this.headerMenu){
this.headerMenu.unBindDomNode(this.viewsHeaderNode);
}
this.headerMenu=_10;
if(!_10){
return;
}
this.headerMenu.bindDomNode(this.viewsHeaderNode);
if(this.headerMenu.getPlaceholders){
this._placeholders=this.headerMenu.getPlaceholders(this.placeholderLabel);
}
},setHeaderMenu:function(_11){
dojo.deprecated("dojox.grid._Grid.setHeaderMenu(obj)","use dojox.grid._Grid.set('headerMenu', obj) instead.","2.0");
this._setHeaderMenuAttr(_11);
},setupHeaderMenu:function(){
if(this._placeholders&&this._placeholders.length){
dojo.forEach(this._placeholders,function(p){
if(p._replaced){
p.unReplace(true);
}
p.replace(this.getColumnTogglingItems());
},this);
}
},_fetch:function(_12){
this.setScrollTop(0);
},getItem:function(_13){
return null;
},showMessage:function(_14){
if(_14){
this.messagesNode.innerHTML=_14;
this.messagesNode.style.display="";
}else{
this.messagesNode.innerHTML="";
this.messagesNode.style.display="none";
}
},_structureChanged:function(){
this.buildViews();
if(this.autoRender&&this._started){
this.render();
}
},hasLayout:function(){
return this.layout.cells.length;
},resize:function(_15,_16){
this._pendingChangeSize=_15;
this._pendingResultSize=_16;
this.sizeChange();
},_getPadBorder:function(){
this._padBorder=this._padBorder||dojo._getPadBorderExtents(this.domNode);
return this._padBorder;
},_getHeaderHeight:function(){
var vns=this.viewsHeaderNode.style,t=vns.display=="none"?0:this.views.measureHeader();
vns.height=t+"px";
this.views.normalizeHeaderNodeHeight();
return t;
},_resize:function(_17,_18){
_17=_17||this._pendingChangeSize;
_18=_18||this._pendingResultSize;
delete this._pendingChangeSize;
delete this._pendingResultSize;
if(!this.domNode){
return;
}
var pn=this.domNode.parentNode;
if(!pn||pn.nodeType!=1||!this.hasLayout()||pn.style.visibility=="hidden"||pn.style.display=="none"){
return;
}
var _19=this._getPadBorder();
var hh=undefined;
var h;
if(this._autoHeight){
this.domNode.style.height="auto";
}else{
if(typeof this.autoHeight=="number"){
h=hh=this._getHeaderHeight();
h+=(this.scroller.averageRowHeight*this.autoHeight);
this.domNode.style.height=h+"px";
}else{
if(this.domNode.clientHeight<=_19.h){
if(pn==document.body){
this.domNode.style.height=this.defaultHeight;
}else{
if(this.height){
this.domNode.style.height=this.height;
}else{
this.fitTo="parent";
}
}
}
}
}
if(_18){
_17=_18;
}
if(_17){
dojo.marginBox(this.domNode,_17);
this.height=this.domNode.style.height;
delete this.fitTo;
}else{
if(this.fitTo=="parent"){
h=this._parentContentBoxHeight=this._parentContentBoxHeight||dojo._getContentBox(pn).h;
this.domNode.style.height=Math.max(0,h)+"px";
}
}
var _1a=dojo.some(this.views.views,function(v){
return v.flexCells;
});
if(!this._autoHeight&&(h||dojo._getContentBox(this.domNode).h)===0){
this.viewsHeaderNode.style.display="none";
}else{
this.viewsHeaderNode.style.display="block";
if(!_1a&&hh===undefined){
hh=this._getHeaderHeight();
}
}
if(_1a){
hh=undefined;
}
this.adaptWidth();
this.adaptHeight(hh);
this.postresize();
},adaptWidth:function(){
var _1b=(!this.initialWidth&&this.autoWidth);
var w=_1b?0:this.domNode.clientWidth||(this.domNode.offsetWidth-this._getPadBorder().w),vw=this.views.arrange(1,w);
this.views.onEach("adaptWidth");
if(_1b){
this.domNode.style.width=vw+"px";
}
},adaptHeight:function(_1c){
var t=_1c===undefined?this._getHeaderHeight():_1c;
var h=(this._autoHeight?-1:Math.max(this.domNode.clientHeight-t,0)||0);
this.views.onEach("setSize",[0,h]);
this.views.onEach("adaptHeight");
if(!this._autoHeight){
var _1d=0,_1e=0;
var _1f=dojo.filter(this.views.views,function(v){
var has=v.hasHScrollbar();
if(has){
_1d++;
}else{
_1e++;
}
return (!has);
});
if(_1d>0&&_1e>0){
dojo.forEach(_1f,function(v){
v.adaptHeight(true);
});
}
}
if(this.autoHeight===true||h!=-1||(typeof this.autoHeight=="number"&&this.autoHeight>=this.get("rowCount"))){
this.scroller.windowHeight=h;
}else{
this.scroller.windowHeight=Math.max(this.domNode.clientHeight-t,0);
}
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
if(this.autoRender){
this.render();
}
},render:function(){
if(!this.domNode){
return;
}
if(!this._started){
return;
}
if(!this.hasLayout()){
this.scroller.init(0,this.keepRows,this.rowsPerPage);
return;
}
this.update=this.defaultUpdate;
this._render();
},_render:function(){
this.scroller.init(this.get("rowCount"),this.keepRows,this.rowsPerPage);
this.prerender();
this.setScrollTop(0);
this.postrender();
},prerender:function(){
this.keepRows=this._autoHeight?0:this.keepRows;
this.scroller.setKeepInfo(this.keepRows);
this.views.render();
this._resize();
},postrender:function(){
this.postresize();
this.focus.initFocusView();
dojo.setSelectable(this.domNode,this.selectable);
},postresize:function(){
if(this._autoHeight){
var _20=Math.max(this.views.measureContent())+"px";
this.viewsNode.style.height=_20;
}
},renderRow:function(_21,_22){
this.views.renderRow(_21,_22,this._skipRowRenormalize);
},rowRemoved:function(_23){
this.views.rowRemoved(_23);
},invalidated:null,updating:false,beginUpdate:function(){
this.invalidated=[];
this.updating=true;
},endUpdate:function(){
this.updating=false;
var i=this.invalidated,r;
if(i.all){
this.update();
}else{
if(i.rowCount!=undefined){
this.updateRowCount(i.rowCount);
}else{
for(r in i){
this.updateRow(Number(r));
}
}
}
this.invalidated=[];
},defaultUpdate:function(){
if(!this.domNode){
return;
}
if(this.updating){
this.invalidated.all=true;
return;
}
this.lastScrollTop=this.scrollTop;
this.prerender();
this.scroller.invalidateNodes();
this.setScrollTop(this.lastScrollTop);
this.postrender();
},update:function(){
this.render();
},updateRow:function(_24){
_24=Number(_24);
if(this.updating){
this.invalidated[_24]=true;
}else{
this.views.updateRow(_24);
this.scroller.rowHeightChanged(_24);
}
},updateRows:function(_25,_26){
_25=Number(_25);
_26=Number(_26);
var i;
if(this.updating){
for(i=0;i<_26;i++){
this.invalidated[i+_25]=true;
}
}else{
for(i=0;i<_26;i++){
this.views.updateRow(i+_25,this._skipRowRenormalize);
}
this.scroller.rowHeightChanged(_25);
}
},updateRowCount:function(_27){
if(this.updating){
this.invalidated.rowCount=_27;
}else{
this.rowCount=_27;
this._setAutoHeightAttr(this.autoHeight,true);
if(this.layout.cells.length){
this.scroller.updateRowCount(_27);
}
this._resize();
if(this.layout.cells.length){
this.setScrollTop(this.scrollTop);
}
}
},updateRowStyles:function(_28){
this.views.updateRowStyles(_28);
},getRowNode:function(_29){
if(this.focus.focusView&&!(this.focus.focusView instanceof dojox.grid._RowSelector)){
return this.focus.focusView.rowNodes[_29];
}else{
for(var i=0,_2a;(_2a=this.views.views[i]);i++){
if(!(_2a instanceof dojox.grid._RowSelector)){
return _2a.rowNodes[_29];
}
}
}
return null;
},rowHeightChanged:function(_2b){
this.views.renormalizeRow(_2b);
this.scroller.rowHeightChanged(_2b);
},fastScroll:true,delayScroll:false,scrollRedrawThreshold:(dojo.isIE?100:50),scrollTo:function(_2c){
if(!this.fastScroll){
this.setScrollTop(_2c);
return;
}
var _2d=Math.abs(this.lastScrollTop-_2c);
this.lastScrollTop=_2c;
if(_2d>this.scrollRedrawThreshold||this.delayScroll){
this.delayScroll=true;
this.scrollTop=_2c;
this.views.setScrollTop(_2c);
if(this._pendingScroll){
window.clearTimeout(this._pendingScroll);
}
var _2e=this;
this._pendingScroll=window.setTimeout(function(){
delete _2e._pendingScroll;
_2e.finishScrollJob();
},200);
}else{
this.setScrollTop(_2c);
}
},finishScrollJob:function(){
this.delayScroll=false;
this.setScrollTop(this.scrollTop);
},setScrollTop:function(_2f){
this.scroller.scroll(this.views.setScrollTop(_2f));
},scrollToRow:function(_30){
this.setScrollTop(this.scroller.findScrollTop(_30)+1);
},styleRowNode:function(_31,_32){
if(_32){
this.rows.styleRowNode(_31,_32);
}
},_mouseOut:function(e){
this.rows.setOverRow(-2);
},getCell:function(_33){
return this.layout.cells[_33];
},setCellWidth:function(_34,_35){
this.getCell(_34).unitWidth=_35;
},getCellName:function(_36){
return "Cell "+_36.index;
},canSort:function(_37){
},sort:function(){
},getSortAsc:function(_38){
_38=_38==undefined?this.sortInfo:_38;
return Boolean(_38>0);
},getSortIndex:function(_39){
_39=_39==undefined?this.sortInfo:_39;
return Math.abs(_39)-1;
},setSortIndex:function(_3a,_3b){
var si=_3a+1;
if(_3b!=undefined){
si*=(_3b?1:-1);
}else{
if(this.getSortIndex()==_3a){
si=-this.sortInfo;
}
}
this.setSortInfo(si);
},setSortInfo:function(_3c){
if(this.canSort(_3c)){
this.sortInfo=_3c;
this.sort();
this.update();
}
},doKeyEvent:function(e){
e.dispatch="do"+e.type;
this.onKeyEvent(e);
},_dispatch:function(m,e){
if(m in this){
return this[m](e);
}
return false;
},dispatchKeyEvent:function(e){
this._dispatch(e.dispatch,e);
},dispatchContentEvent:function(e){
this.edit.dispatchEvent(e)||e.sourceView.dispatchContentEvent(e)||this._dispatch(e.dispatch,e);
},dispatchHeaderEvent:function(e){
e.sourceView.dispatchHeaderEvent(e)||this._dispatch("doheader"+e.type,e);
},dokeydown:function(e){
this.onKeyDown(e);
},doclick:function(e){
if(e.cellNode){
this.onCellClick(e);
}else{
this.onRowClick(e);
}
},dodblclick:function(e){
if(e.cellNode){
this.onCellDblClick(e);
}else{
this.onRowDblClick(e);
}
},docontextmenu:function(e){
if(e.cellNode){
this.onCellContextMenu(e);
}else{
this.onRowContextMenu(e);
}
},doheaderclick:function(e){
if(e.cellNode){
this.onHeaderCellClick(e);
}else{
this.onHeaderClick(e);
}
},doheaderdblclick:function(e){
if(e.cellNode){
this.onHeaderCellDblClick(e);
}else{
this.onHeaderDblClick(e);
}
},doheadercontextmenu:function(e){
if(e.cellNode){
this.onHeaderCellContextMenu(e);
}else{
this.onHeaderContextMenu(e);
}
},doStartEdit:function(_3d,_3e){
this.onStartEdit(_3d,_3e);
},doApplyCellEdit:function(_3f,_40,_41){
this.onApplyCellEdit(_3f,_40,_41);
},doCancelEdit:function(_42){
this.onCancelEdit(_42);
},doApplyEdit:function(_43){
this.onApplyEdit(_43);
},addRow:function(){
this.updateRowCount(this.get("rowCount")+1);
},removeSelectedRows:function(){
if(this.allItemsSelected){
this.updateRowCount(0);
}else{
this.updateRowCount(Math.max(0,this.get("rowCount")-this.selection.getSelected().length));
}
this.selection.clear();
}});
dojox.grid._Grid.markupFactory=function(_44,_45,_46,_47){
var d=dojo;
var _48=function(n){
var w=d.attr(n,"width")||"auto";
if((w!="auto")&&(w.slice(-2)!="em")&&(w.slice(-1)!="%")){
w=parseInt(w,10)+"px";
}
return w;
};
if(!_44.structure&&_45.nodeName.toLowerCase()=="table"){
_44.structure=d.query("> colgroup",_45).map(function(cg){
var sv=d.attr(cg,"span");
var v={noscroll:(d.attr(cg,"noscroll")=="true")?true:false,__span:(!!sv?parseInt(sv,10):1),cells:[]};
if(d.hasAttr(cg,"width")){
v.width=_48(cg);
}
return v;
});
if(!_44.structure.length){
_44.structure.push({__span:Infinity,cells:[]});
}
d.query("thead > tr",_45).forEach(function(tr,_49){
var _4a=0;
var _4b=0;
var _4c;
var _4d=null;
d.query("> th",tr).map(function(th){
if(!_4d){
_4c=0;
_4d=_44.structure[0];
}else{
if(_4a>=(_4c+_4d.__span)){
_4b++;
_4c+=_4d.__span;
var _4e=_4d;
_4d=_44.structure[_4b];
}
}
var _4f={name:d.trim(d.attr(th,"name")||th.innerHTML),colSpan:parseInt(d.attr(th,"colspan")||1,10),type:d.trim(d.attr(th,"cellType")||""),id:d.trim(d.attr(th,"id")||"")};
_4a+=_4f.colSpan;
var _50=d.attr(th,"rowspan");
if(_50){
_4f.rowSpan=_50;
}
if(d.hasAttr(th,"width")){
_4f.width=_48(th);
}
if(d.hasAttr(th,"relWidth")){
_4f.relWidth=window.parseInt(dojo.attr(th,"relWidth"),10);
}
if(d.hasAttr(th,"hidden")){
_4f.hidden=(d.attr(th,"hidden")=="true"||d.attr(th,"hidden")===true);
}
if(_47){
_47(th,_4f);
}
_4f.type=_4f.type?dojo.getObject(_4f.type):dojox.grid.cells.Cell;
if(_4f.type&&_4f.type.markupFactory){
_4f.type.markupFactory(th,_4f);
}
if(!_4d.cells[_49]){
_4d.cells[_49]=[];
}
_4d.cells[_49].push(_4f);
});
});
}
return new _46(_44,_45);
};
})();
}
