/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._View"]){
dojo._hasResource["dojox.grid._View"]=true;
dojo.provide("dojox.grid._View");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.grid._Builder");
dojo.require("dojox.html.metrics");
dojo.require("dojox.grid.util");
dojo.require("dojo.dnd.Source");
dojo.require("dojo.dnd.Manager");
(function(){
var _1=function(_2,_3){
return _2.style.cssText==undefined?_2.getAttribute("style"):_2.style.cssText;
};
dojo.declare("dojox.grid._View",[dijit._Widget,dijit._Templated],{defaultWidth:"18em",viewWidth:"",templateString:"<div class=\"dojoxGridView\" role=\"presentation\">\n\t<div class=\"dojoxGridHeader\" dojoAttachPoint=\"headerNode\" role=\"presentation\">\n\t\t<div dojoAttachPoint=\"headerNodeContainer\" style=\"width:9000em\" role=\"presentation\">\n\t\t\t<div dojoAttachPoint=\"headerContentNode\" role=\"row\"></div>\n\t\t</div>\n\t</div>\n\t<input type=\"checkbox\" class=\"dojoxGridHiddenFocus\" dojoAttachPoint=\"hiddenFocusNode\" role=\"presentation\" />\n\t<input type=\"checkbox\" class=\"dojoxGridHiddenFocus\" role=\"presentation\" />\n\t<div class=\"dojoxGridScrollbox\" dojoAttachPoint=\"scrollboxNode\" role=\"presentation\">\n\t\t<div class=\"dojoxGridContent\" dojoAttachPoint=\"contentNode\" hidefocus=\"hidefocus\" role=\"presentation\"></div>\n\t</div>\n</div>\n",themeable:false,classTag:"dojoxGrid",marginBottom:0,rowPad:2,_togglingColumn:-1,_headerBuilderClass:dojox.grid._HeaderBuilder,_contentBuilderClass:dojox.grid._ContentBuilder,postMixInProperties:function(){
this.rowNodes={};
},postCreate:function(){
this.connect(this.scrollboxNode,"onscroll","doscroll");
dojox.grid.util.funnelEvents(this.contentNode,this,"doContentEvent",["mouseover","mouseout","click","dblclick","contextmenu","mousedown"]);
dojox.grid.util.funnelEvents(this.headerNode,this,"doHeaderEvent",["dblclick","mouseover","mouseout","mousemove","mousedown","click","contextmenu"]);
this.content=new this._contentBuilderClass(this);
this.header=new this._headerBuilderClass(this);
if(!dojo._isBodyLtr()){
this.headerNodeContainer.style.width="";
}
},destroy:function(){
dojo.destroy(this.headerNode);
delete this.headerNode;
for(var i in this.rowNodes){
dojo.destroy(this.rowNodes[i]);
}
this.rowNodes={};
if(this.source){
this.source.destroy();
}
this.inherited(arguments);
},focus:function(){
if(dojo.isIE||dojo.isWebKit||dojo.isOpera){
this.hiddenFocusNode.focus();
}else{
this.scrollboxNode.focus();
}
},setStructure:function(_4){
var vs=(this.structure=_4);
if(vs.width&&!isNaN(vs.width)){
this.viewWidth=vs.width+"em";
}else{
this.viewWidth=vs.width||(vs.noscroll?"auto":this.viewWidth);
}
this._onBeforeRow=vs.onBeforeRow||function(){
};
this._onAfterRow=vs.onAfterRow||function(){
};
this.noscroll=vs.noscroll;
if(this.noscroll){
this.scrollboxNode.style.overflow="hidden";
}
this.simpleStructure=Boolean(vs.cells.length==1);
this.testFlexCells();
this.updateStructure();
},_cleanupRowWidgets:function(_5){
if(_5){
dojo.forEach(dojo.query("[widgetId]",_5).map(dijit.byNode),function(w){
if(w._destroyOnRemove){
w.destroy();
delete w;
}else{
if(w.domNode&&w.domNode.parentNode){
w.domNode.parentNode.removeChild(w.domNode);
}
}
});
}
},onBeforeRow:function(_6,_7){
this._onBeforeRow(_6,_7);
if(_6>=0){
this._cleanupRowWidgets(this.getRowNode(_6));
}
},onAfterRow:function(_8,_9,_a){
this._onAfterRow(_8,_9,_a);
var g=this.grid;
dojo.forEach(dojo.query(".dojoxGridStubNode",_a),function(n){
if(n&&n.parentNode){
var lw=n.getAttribute("linkWidget");
var _b=window.parseInt(dojo.attr(n,"cellIdx"),10);
var _c=g.getCell(_b);
var w=dijit.byId(lw);
if(w){
n.parentNode.replaceChild(w.domNode,n);
if(!w._started){
w.startup();
}
}else{
n.innerHTML="";
}
}
},this);
},testFlexCells:function(){
this.flexCells=false;
for(var j=0,_d;(_d=this.structure.cells[j]);j++){
for(var i=0,_e;(_e=_d[i]);i++){
_e.view=this;
this.flexCells=this.flexCells||_e.isFlex();
}
}
return this.flexCells;
},updateStructure:function(){
this.header.update();
this.content.update();
},getScrollbarWidth:function(){
var _f=this.hasVScrollbar();
var _10=dojo.style(this.scrollboxNode,"overflow");
if(this.noscroll||!_10||_10=="hidden"){
_f=false;
}else{
if(_10=="scroll"){
_f=true;
}
}
return (_f?dojox.html.metrics.getScrollbar().w:0);
},getColumnsWidth:function(){
var h=this.headerContentNode;
return h&&h.firstChild?h.firstChild.offsetWidth:0;
},setColumnsWidth:function(_11){
this.headerContentNode.firstChild.style.width=_11+"px";
if(this.viewWidth){
this.viewWidth=_11+"px";
}
},getWidth:function(){
return this.viewWidth||(this.getColumnsWidth()+this.getScrollbarWidth())+"px";
},getContentWidth:function(){
return Math.max(0,dojo._getContentBox(this.domNode).w-this.getScrollbarWidth())+"px";
},render:function(){
this.scrollboxNode.style.height="";
this.renderHeader();
if(this._togglingColumn>=0){
this.setColumnsWidth(this.getColumnsWidth()-this._togglingColumn);
this._togglingColumn=-1;
}
var _12=this.grid.layout.cells;
var _13=dojo.hitch(this,function(_14,_15){
!dojo._isBodyLtr()&&(_15=!_15);
var inc=_15?-1:1;
var idx=this.header.getCellNodeIndex(_14)+inc;
var _16=_12[idx];
while(_16&&_16.getHeaderNode()&&_16.getHeaderNode().style.display=="none"){
idx+=inc;
_16=_12[idx];
}
if(_16){
return _16.getHeaderNode();
}
return null;
});
if(this.grid.columnReordering&&this.simpleStructure){
if(this.source){
this.source.destroy();
}
var _17="dojoxGrid_bottomMarker";
var _18="dojoxGrid_topMarker";
if(this.bottomMarker){
dojo.destroy(this.bottomMarker);
}
this.bottomMarker=dojo.byId(_17);
if(this.topMarker){
dojo.destroy(this.topMarker);
}
this.topMarker=dojo.byId(_18);
if(!this.bottomMarker){
this.bottomMarker=dojo.create("div",{"id":_17,"class":"dojoxGridColPlaceBottom"},dojo.body());
this._hide(this.bottomMarker);
this.topMarker=dojo.create("div",{"id":_18,"class":"dojoxGridColPlaceTop"},dojo.body());
this._hide(this.topMarker);
}
this.arrowDim=dojo.contentBox(this.bottomMarker);
var _19=dojo.contentBox(this.headerContentNode.firstChild.rows[0]).h;
this.source=new dojo.dnd.Source(this.headerContentNode.firstChild.rows[0],{horizontal:true,accept:["gridColumn_"+this.grid.id],viewIndex:this.index,generateText:false,onMouseDown:dojo.hitch(this,function(e){
this.header.decorateEvent(e);
if((this.header.overRightResizeArea(e)||this.header.overLeftResizeArea(e))&&this.header.canResize(e)&&!this.header.moveable){
this.header.beginColumnResize(e);
}else{
if(this.grid.headerMenu){
this.grid.headerMenu.onCancel(true);
}
if(e.button===(dojo.isIE?1:0)){
dojo.dnd.Source.prototype.onMouseDown.call(this.source,e);
}
}
}),onMouseOver:dojo.hitch(this,function(e){
var src=this.source;
if(src._getChildByEvent(e)){
dojo.dnd.Source.prototype.onMouseOver.apply(src,arguments);
}
}),_markTargetAnchor:dojo.hitch(this,function(_1a){
var src=this.source;
if(src.current==src.targetAnchor&&src.before==_1a){
return;
}
if(src.targetAnchor&&_13(src.targetAnchor,src.before)){
src._removeItemClass(_13(src.targetAnchor,src.before),src.before?"After":"Before");
}
dojo.dnd.Source.prototype._markTargetAnchor.call(src,_1a);
var _1b=_1a?src.targetAnchor:_13(src.targetAnchor,src.before);
var _1c=0;
if(!_1b){
_1b=src.targetAnchor;
_1c=dojo.contentBox(_1b).w+this.arrowDim.w/2+2;
}
var pos=(dojo.position||dojo._abs)(_1b,true);
var _1d=Math.floor(pos.x-this.arrowDim.w/2+_1c);
dojo.style(this.bottomMarker,"visibility","visible");
dojo.style(this.topMarker,"visibility","visible");
dojo.style(this.bottomMarker,{"left":_1d+"px","top":(_19+pos.y)+"px"});
dojo.style(this.topMarker,{"left":_1d+"px","top":(pos.y-this.arrowDim.h)+"px"});
if(src.targetAnchor&&_13(src.targetAnchor,src.before)){
src._addItemClass(_13(src.targetAnchor,src.before),src.before?"After":"Before");
}
}),_unmarkTargetAnchor:dojo.hitch(this,function(){
var src=this.source;
if(!src.targetAnchor){
return;
}
if(src.targetAnchor&&_13(src.targetAnchor,src.before)){
src._removeItemClass(_13(src.targetAnchor,src.before),src.before?"After":"Before");
}
this._hide(this.bottomMarker);
this._hide(this.topMarker);
dojo.dnd.Source.prototype._unmarkTargetAnchor.call(src);
}),destroy:dojo.hitch(this,function(){
dojo.disconnect(this._source_conn);
dojo.unsubscribe(this._source_sub);
dojo.dnd.Source.prototype.destroy.call(this.source);
if(this.bottomMarker){
dojo.destroy(this.bottomMarker);
delete this.bottomMarker;
}
if(this.topMarker){
dojo.destroy(this.topMarker);
delete this.topMarker;
}
}),onDndCancel:dojo.hitch(this,function(){
dojo.dnd.Source.prototype.onDndCancel.call(this.source);
this._hide(this.bottomMarker);
this._hide(this.topMarker);
})});
this._source_conn=dojo.connect(this.source,"onDndDrop",this,"_onDndDrop");
this._source_sub=dojo.subscribe("/dnd/drop/before",this,"_onDndDropBefore");
this.source.startup();
}
},_hide:function(_1e){
dojo.style(_1e,{left:"-10000px",top:"-10000px","visibility":"hidden"});
},_onDndDropBefore:function(_1f,_20,_21){
if(dojo.dnd.manager().target!==this.source){
return;
}
this.source._targetNode=this.source.targetAnchor;
this.source._beforeTarget=this.source.before;
var _22=this.grid.views.views;
var _23=_22[_1f.viewIndex];
var _24=_22[this.index];
if(_24!=_23){
_23.convertColPctToFixed();
_24.convertColPctToFixed();
}
},_onDndDrop:function(_25,_26,_27){
if(dojo.dnd.manager().target!==this.source){
if(dojo.dnd.manager().source===this.source){
this._removingColumn=true;
}
return;
}
this._hide(this.bottomMarker);
this._hide(this.topMarker);
var _28=function(n){
return n?dojo.attr(n,"idx"):null;
};
var w=dojo.marginBox(_26[0]).w;
if(_25.viewIndex!==this.index){
var _29=this.grid.views.views;
var _2a=_29[_25.viewIndex];
var _2b=_29[this.index];
if(_2a.viewWidth&&_2a.viewWidth!="auto"){
_2a.setColumnsWidth(_2a.getColumnsWidth()-w);
}
if(_2b.viewWidth&&_2b.viewWidth!="auto"){
_2b.setColumnsWidth(_2b.getColumnsWidth());
}
}
var stn=this.source._targetNode;
var stb=this.source._beforeTarget;
!dojo._isBodyLtr()&&(stb=!stb);
var _2c=this.grid.layout;
var idx=this.index;
delete this.source._targetNode;
delete this.source._beforeTarget;
_2c.moveColumn(_25.viewIndex,idx,_28(_26[0]),_28(stn),stb);
},renderHeader:function(){
this.headerContentNode.innerHTML=this.header.generateHtml(this._getHeaderContent);
if(this.flexCells){
this.contentWidth=this.getContentWidth();
this.headerContentNode.firstChild.style.width=this.contentWidth;
}
dojox.grid.util.fire(this,"onAfterRow",[-1,this.structure.cells,this.headerContentNode]);
},_getHeaderContent:function(_2d){
var n=_2d.name||_2d.grid.getCellName(_2d);
var ret=["<div class=\"dojoxGridSortNode"];
if(_2d.index!=_2d.grid.getSortIndex()){
ret.push("\">");
}else{
ret=ret.concat([" ",_2d.grid.sortInfo>0?"dojoxGridSortUp":"dojoxGridSortDown","\"><div class=\"dojoxGridArrowButtonChar\">",_2d.grid.sortInfo>0?"&#9650;":"&#9660;","</div><div class=\"dojoxGridArrowButtonNode\" role=\"presentation\"></div>","<div class=\"dojoxGridColCaption\">"]);
}
ret=ret.concat([n,"</div></div>"]);
return ret.join("");
},resize:function(){
this.adaptHeight();
this.adaptWidth();
},hasHScrollbar:function(_2e){
var _2f=this._hasHScroll||false;
if(this._hasHScroll==undefined||_2e){
if(this.noscroll){
this._hasHScroll=false;
}else{
var _30=dojo.style(this.scrollboxNode,"overflow");
if(_30=="hidden"){
this._hasHScroll=false;
}else{
if(_30=="scroll"){
this._hasHScroll=true;
}else{
this._hasHScroll=(this.scrollboxNode.offsetWidth-this.getScrollbarWidth()<this.contentNode.offsetWidth);
}
}
}
}
if(_2f!==this._hasHScroll){
this.grid.update();
}
return this._hasHScroll;
},hasVScrollbar:function(_31){
var _32=this._hasVScroll||false;
if(this._hasVScroll==undefined||_31){
if(this.noscroll){
this._hasVScroll=false;
}else{
var _33=dojo.style(this.scrollboxNode,"overflow");
if(_33=="hidden"){
this._hasVScroll=false;
}else{
if(_33=="scroll"){
this._hasVScroll=true;
}else{
this._hasVScroll=(this.scrollboxNode.scrollHeight>this.scrollboxNode.clientHeight);
}
}
}
}
if(_32!==this._hasVScroll){
this.grid.update();
}
return this._hasVScroll;
},convertColPctToFixed:function(){
var _34=false;
this.grid.initialWidth="";
var _35=dojo.query("th",this.headerContentNode);
var _36=dojo.map(_35,function(c,_37){
var w=c.style.width;
dojo.attr(c,"vIdx",_37);
if(w&&w.slice(-1)=="%"){
_34=true;
}else{
if(w&&w.slice(-2)=="px"){
return window.parseInt(w,10);
}
}
return dojo.contentBox(c).w;
});
if(_34){
dojo.forEach(this.grid.layout.cells,function(_38,idx){
if(_38.view==this){
var _39=_38.view.getHeaderCellNode(_38.index);
if(_39&&dojo.hasAttr(_39,"vIdx")){
var _3a=window.parseInt(dojo.attr(_39,"vIdx"));
this.setColWidth(idx,_36[_3a]);
dojo.removeAttr(_39,"vIdx");
}
}
},this);
return true;
}
return false;
},adaptHeight:function(_3b){
if(!this.grid._autoHeight){
var h=(this.domNode.style.height&&parseInt(this.domNode.style.height.replace(/px/,""),10))||this.domNode.clientHeight;
var _3c=this;
var _3d=function(){
var v;
for(var i in _3c.grid.views.views){
v=_3c.grid.views.views[i];
if(v!==_3c&&v.hasHScrollbar()){
return true;
}
}
return false;
};
if(_3b||(this.noscroll&&_3d())){
h-=dojox.html.metrics.getScrollbar().h;
}
dojox.grid.util.setStyleHeightPx(this.scrollboxNode,h);
}
this.hasVScrollbar(true);
},adaptWidth:function(){
if(this.flexCells){
this.contentWidth=this.getContentWidth();
this.headerContentNode.firstChild.style.width=this.contentWidth;
}
var w=this.scrollboxNode.offsetWidth-this.getScrollbarWidth();
if(!this._removingColumn){
w=Math.max(w,this.getColumnsWidth())+"px";
}else{
w=Math.min(w,this.getColumnsWidth())+"px";
this._removingColumn=false;
}
var cn=this.contentNode;
cn.style.width=w;
this.hasHScrollbar(true);
},setSize:function(w,h){
var ds=this.domNode.style;
var hs=this.headerNode.style;
if(w){
ds.width=w;
hs.width=w;
}
ds.height=(h>=0?h+"px":"");
},renderRow:function(_3e){
var _3f=this.createRowNode(_3e);
this.buildRow(_3e,_3f);
this.grid.edit.restore(this,_3e);
return _3f;
},createRowNode:function(_40){
var _41=document.createElement("div");
_41.className=this.classTag+"Row";
if(this instanceof dojox.grid._RowSelector){
dojo.attr(_41,"role","presentation");
}else{
dojo.attr(_41,"role","row");
if(this.grid.selectionMode!="none"){
dojo.attr(_41,"aria-selected","false");
}
}
_41[dojox.grid.util.gridViewTag]=this.id;
_41[dojox.grid.util.rowIndexTag]=_40;
this.rowNodes[_40]=_41;
return _41;
},buildRow:function(_42,_43){
this.buildRowContent(_42,_43);
this.styleRow(_42,_43);
},buildRowContent:function(_44,_45){
_45.innerHTML=this.content.generateHtml(_44,_44);
if(this.flexCells&&this.contentWidth){
_45.firstChild.style.width=this.contentWidth;
}
dojox.grid.util.fire(this,"onAfterRow",[_44,this.structure.cells,_45]);
},rowRemoved:function(_46){
if(_46>=0){
this._cleanupRowWidgets(this.getRowNode(_46));
}
this.grid.edit.save(this,_46);
delete this.rowNodes[_46];
},getRowNode:function(_47){
return this.rowNodes[_47];
},getCellNode:function(_48,_49){
var row=this.getRowNode(_48);
if(row){
return this.content.getCellNode(row,_49);
}
},getHeaderCellNode:function(_4a){
if(this.headerContentNode){
return this.header.getCellNode(this.headerContentNode,_4a);
}
},styleRow:function(_4b,_4c){
_4c._style=_1(_4c);
this.styleRowNode(_4b,_4c);
},styleRowNode:function(_4d,_4e){
if(_4e){
this.doStyleRowNode(_4d,_4e);
}
},doStyleRowNode:function(_4f,_50){
this.grid.styleRowNode(_4f,_50);
},updateRow:function(_51){
var _52=this.getRowNode(_51);
if(_52){
_52.style.height="";
this.buildRow(_51,_52);
}
return _52;
},updateRowStyles:function(_53){
this.styleRowNode(_53,this.getRowNode(_53));
},lastTop:0,firstScroll:0,doscroll:function(_54){
var _55=dojo._isBodyLtr();
if(this.firstScroll<2){
if((!_55&&this.firstScroll==1)||(_55&&this.firstScroll===0)){
var s=dojo.marginBox(this.headerNodeContainer);
if(dojo.isIE){
this.headerNodeContainer.style.width=s.w+this.getScrollbarWidth()+"px";
}else{
if(dojo.isMoz){
this.headerNodeContainer.style.width=s.w-this.getScrollbarWidth()+"px";
this.scrollboxNode.scrollLeft=_55?this.scrollboxNode.clientWidth-this.scrollboxNode.scrollWidth:this.scrollboxNode.scrollWidth-this.scrollboxNode.clientWidth;
}
}
}
this.firstScroll++;
}
this.headerNode.scrollLeft=this.scrollboxNode.scrollLeft;
var top=this.scrollboxNode.scrollTop;
if(top!==this.lastTop){
this.grid.scrollTo(top);
}
},setScrollTop:function(_56){
this.lastTop=_56;
this.scrollboxNode.scrollTop=_56;
return this.scrollboxNode.scrollTop;
},doContentEvent:function(e){
if(this.content.decorateEvent(e)){
this.grid.onContentEvent(e);
}
},doHeaderEvent:function(e){
if(this.header.decorateEvent(e)){
this.grid.onHeaderEvent(e);
}
},dispatchContentEvent:function(e){
return this.content.dispatchEvent(e);
},dispatchHeaderEvent:function(e){
return this.header.dispatchEvent(e);
},setColWidth:function(_57,_58){
this.grid.setCellWidth(_57,_58+"px");
},update:function(){
if(!this.domNode){
return;
}
this.content.update();
this.grid.update();
var _59=this.scrollboxNode.scrollLeft;
this.scrollboxNode.scrollLeft=_59;
this.headerNode.scrollLeft=_59;
}});
dojo.declare("dojox.grid._GridAvatar",dojo.dnd.Avatar,{construct:function(){
var dd=dojo.doc;
var a=dd.createElement("table");
a.cellPadding=a.cellSpacing="0";
a.className="dojoxGridDndAvatar";
a.style.position="absolute";
a.style.zIndex=1999;
a.style.margin="0px";
var b=dd.createElement("tbody");
var tr=dd.createElement("tr");
var td=dd.createElement("td");
var img=dd.createElement("td");
tr.className="dojoxGridDndAvatarItem";
img.className="dojoxGridDndAvatarItemImage";
img.style.width="16px";
var _5a=this.manager.source,_5b;
if(_5a.creator){
_5b=_5a._normalizedCreator(_5a.getItem(this.manager.nodes[0].id).data,"avatar").node;
}else{
_5b=this.manager.nodes[0].cloneNode(true);
var _5c,_5d;
if(_5b.tagName.toLowerCase()=="tr"){
_5c=dd.createElement("table");
_5d=dd.createElement("tbody");
_5d.appendChild(_5b);
_5c.appendChild(_5d);
_5b=_5c;
}else{
if(_5b.tagName.toLowerCase()=="th"){
_5c=dd.createElement("table");
_5d=dd.createElement("tbody");
var r=dd.createElement("tr");
_5c.cellPadding=_5c.cellSpacing="0";
r.appendChild(_5b);
_5d.appendChild(r);
_5c.appendChild(_5d);
_5b=_5c;
}
}
}
_5b.id="";
td.appendChild(_5b);
tr.appendChild(img);
tr.appendChild(td);
dojo.style(tr,"opacity",0.9);
b.appendChild(tr);
a.appendChild(b);
this.node=a;
var m=dojo.dnd.manager();
this.oldOffsetY=m.OFFSET_Y;
m.OFFSET_Y=1;
},destroy:function(){
dojo.dnd.manager().OFFSET_Y=this.oldOffsetY;
this.inherited(arguments);
}});
var _5e=dojo.dnd.manager().makeAvatar;
dojo.dnd.manager().makeAvatar=function(){
var src=this.source;
if(src.viewIndex!==undefined&&!dojo.hasClass(dojo.body(),"dijit_a11y")){
return new dojox.grid._GridAvatar(this);
}
return _5e.call(dojo.dnd.manager());
};
})();
}
