/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._Builder"]){
dojo._hasResource["dojox.grid._Builder"]=true;
dojo.provide("dojox.grid._Builder");
dojo.require("dojox.grid.util");
dojo.require("dojo.dnd.Moveable");
(function(){
var dg=dojox.grid;
var _1=function(td){
return td.cellIndex>=0?td.cellIndex:dojo.indexOf(td.parentNode.cells,td);
};
var _2=function(tr){
return tr.rowIndex>=0?tr.rowIndex:dojo.indexOf(tr.parentNode.childNodes,tr);
};
var _3=function(_4,_5){
return _4&&((_4.rows||0)[_5]||_4.childNodes[_5]);
};
var _6=function(_7){
for(var n=_7;n&&n.tagName!="TABLE";n=n.parentNode){
}
return n;
};
var _8=function(_9,_a){
for(var n=_9;n&&_a(n);n=n.parentNode){
}
return n;
};
var _b=function(_c){
var _d=_c.toUpperCase();
return function(_e){
return _e.tagName!=_d;
};
};
var _f=dojox.grid.util.rowIndexTag;
var _10=dojox.grid.util.gridViewTag;
dg._Builder=dojo.extend(function(_11){
if(_11){
this.view=_11;
this.grid=_11.grid;
}
},{view:null,_table:"<table class=\"dojoxGridRowTable\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" role=\"presentation\"",getTableArray:function(){
var _12=[this._table];
if(this.view.viewWidth){
_12.push([" style=\"width:",this.view.viewWidth,";\""].join(""));
}
_12.push(">");
return _12;
},generateCellMarkup:function(_13,_14,_15,_16){
var _17=[],_18;
if(_16){
var _19=_13.index!=_13.grid.getSortIndex()?"":_13.grid.sortInfo>0?"aria-sort=\"ascending\"":"aria-sort=\"descending\"";
if(!_13.id){
_13.id=this.grid.id+"Hdr"+_13.index;
}
_18=["<th tabIndex=\"-1\" aria-readonly=\"true\" role=\"columnheader\"",_19,"id=\"",_13.id,"\""];
}else{
var _1a=this.grid.editable&&!_13.editable?"aria-readonly=\"true\"":"";
_18=["<td tabIndex=\"-1\" role=\"gridcell\"",_1a];
}
if(_13.colSpan){
_18.push(" colspan=\"",_13.colSpan,"\"");
}
if(_13.rowSpan){
_18.push(" rowspan=\"",_13.rowSpan,"\"");
}
_18.push(" class=\"dojoxGridCell ");
if(_13.classes){
_18.push(_13.classes," ");
}
if(_15){
_18.push(_15," ");
}
_17.push(_18.join(""));
_17.push("");
_18=["\" idx=\"",_13.index,"\" style=\""];
if(_14&&_14[_14.length-1]!=";"){
_14+=";";
}
_18.push(_13.styles,_14||"",_13.hidden?"display:none;":"");
if(_13.unitWidth){
_18.push("width:",_13.unitWidth,";");
}
_17.push(_18.join(""));
_17.push("");
_18=["\""];
if(_13.attrs){
_18.push(" ",_13.attrs);
}
_18.push(">");
_17.push(_18.join(""));
_17.push("");
_17.push(_16?"</th>":"</td>");
return _17;
},isCellNode:function(_1b){
return Boolean(_1b&&_1b!=dojo.doc&&dojo.attr(_1b,"idx"));
},getCellNodeIndex:function(_1c){
return _1c?Number(dojo.attr(_1c,"idx")):-1;
},getCellNode:function(_1d,_1e){
for(var i=0,row;((row=_3(_1d.firstChild,i))&&row.cells);i++){
for(var j=0,_1f;(_1f=row.cells[j]);j++){
if(this.getCellNodeIndex(_1f)==_1e){
return _1f;
}
}
}
return null;
},findCellTarget:function(_20,_21){
var n=_20;
while(n&&(!this.isCellNode(n)||(n.offsetParent&&_10 in n.offsetParent.parentNode&&n.offsetParent.parentNode[_10]!=this.view.id))&&(n!=_21)){
n=n.parentNode;
}
return n!=_21?n:null;
},baseDecorateEvent:function(e){
e.dispatch="do"+e.type;
e.grid=this.grid;
e.sourceView=this.view;
e.cellNode=this.findCellTarget(e.target,e.rowNode);
e.cellIndex=this.getCellNodeIndex(e.cellNode);
e.cell=(e.cellIndex>=0?this.grid.getCell(e.cellIndex):null);
},findTarget:function(_22,_23){
var n=_22;
while(n&&(n!=this.domNode)&&(!(_23 in n)||(_10 in n&&n[_10]!=this.view.id))){
n=n.parentNode;
}
return (n!=this.domNode)?n:null;
},findRowTarget:function(_24){
return this.findTarget(_24,_f);
},isIntraNodeEvent:function(e){
try{
return (e.cellNode&&e.relatedTarget&&dojo.isDescendant(e.relatedTarget,e.cellNode));
}
catch(x){
return false;
}
},isIntraRowEvent:function(e){
try{
var row=e.relatedTarget&&this.findRowTarget(e.relatedTarget);
return !row&&(e.rowIndex==-1)||row&&(e.rowIndex==row.gridRowIndex);
}
catch(x){
return false;
}
},dispatchEvent:function(e){
if(e.dispatch in this){
return this[e.dispatch](e);
}
return false;
},domouseover:function(e){
if(e.cellNode&&(e.cellNode!=this.lastOverCellNode)){
this.lastOverCellNode=e.cellNode;
this.grid.onMouseOver(e);
}
this.grid.onMouseOverRow(e);
},domouseout:function(e){
if(e.cellNode&&(e.cellNode==this.lastOverCellNode)&&!this.isIntraNodeEvent(e,this.lastOverCellNode)){
this.lastOverCellNode=null;
this.grid.onMouseOut(e);
if(!this.isIntraRowEvent(e)){
this.grid.onMouseOutRow(e);
}
}
},domousedown:function(e){
if(e.cellNode){
this.grid.onMouseDown(e);
}
this.grid.onMouseDownRow(e);
}});
dg._ContentBuilder=dojo.extend(function(_25){
dg._Builder.call(this,_25);
},dg._Builder.prototype,{update:function(){
this.prepareHtml();
},prepareHtml:function(){
var _26=this.grid.get,_27=this.view.structure.cells;
for(var j=0,row;(row=_27[j]);j++){
for(var i=0,_28;(_28=row[i]);i++){
_28.get=_28.get||(_28.value==undefined)&&_26;
_28.markup=this.generateCellMarkup(_28,_28.cellStyles,_28.cellClasses,false);
if(!this.grid.editable&&_28.editable){
this.grid.editable=true;
}
}
}
},generateHtml:function(_29,_2a){
var _2b=this.getTableArray(),v=this.view,_2c=v.structure.cells,_2d=this.grid.getItem(_2a);
dojox.grid.util.fire(this.view,"onBeforeRow",[_2a,_2c]);
for(var j=0,row;(row=_2c[j]);j++){
if(row.hidden||row.header){
continue;
}
_2b.push(!row.invisible?"<tr>":"<tr class=\"dojoxGridInvisible\">");
for(var i=0,_2e,m,cc,cs;(_2e=row[i]);i++){
m=_2e.markup;
cc=_2e.customClasses=[];
cs=_2e.customStyles=[];
m[5]=_2e.format(_2a,_2d);
m[1]=cc.join(" ");
m[3]=cs.join(";");
_2b.push.apply(_2b,m);
}
_2b.push("</tr>");
}
_2b.push("</table>");
return _2b.join("");
},decorateEvent:function(e){
e.rowNode=this.findRowTarget(e.target);
if(!e.rowNode){
return false;
}
e.rowIndex=e.rowNode[_f];
this.baseDecorateEvent(e);
e.cell=this.grid.getCell(e.cellIndex);
return true;
}});
dg._HeaderBuilder=dojo.extend(function(_2f){
this.moveable=null;
dg._Builder.call(this,_2f);
},dg._Builder.prototype,{_skipBogusClicks:false,overResizeWidth:4,minColWidth:1,update:function(){
if(this.tableMap){
this.tableMap.mapRows(this.view.structure.cells);
}else{
this.tableMap=new dg._TableMap(this.view.structure.cells);
}
},generateHtml:function(_30,_31){
var _32=this.getTableArray(),_33=this.view.structure.cells;
dojox.grid.util.fire(this.view,"onBeforeRow",[-1,_33]);
for(var j=0,row;(row=_33[j]);j++){
if(row.hidden){
continue;
}
_32.push(!row.invisible?"<tr>":"<tr class=\"dojoxGridInvisible\">");
for(var i=0,_34,_35;(_34=row[i]);i++){
_34.customClasses=[];
_34.customStyles=[];
if(this.view.simpleStructure){
if(_34.draggable){
if(_34.headerClasses){
if(_34.headerClasses.indexOf("dojoDndItem")==-1){
_34.headerClasses+=" dojoDndItem";
}
}else{
_34.headerClasses="dojoDndItem";
}
}
if(_34.attrs){
if(_34.attrs.indexOf("dndType='gridColumn_")==-1){
_34.attrs+=" dndType='gridColumn_"+this.grid.id+"'";
}
}else{
_34.attrs="dndType='gridColumn_"+this.grid.id+"'";
}
}
_35=this.generateCellMarkup(_34,_34.headerStyles,_34.headerClasses,true);
_35[5]=(_31!=undefined?_31:_30(_34));
_35[3]=_34.customStyles.join(";");
_35[1]=_34.customClasses.join(" ");
_32.push(_35.join(""));
}
_32.push("</tr>");
}
_32.push("</table>");
return _32.join("");
},getCellX:function(e){
var n,x=e.layerX;
if(dojo.isMoz||dojo.isIE>=9){
n=_8(e.target,_b("th"));
x-=(n&&n.offsetLeft)||0;
var t=e.sourceView.getScrollbarWidth();
if(!dojo._isBodyLtr()){
table=_8(n,_b("table"));
x-=(table&&table.offsetLeft)||0;
}
}
n=_8(e.target,function(){
if(!n||n==e.cellNode){
return false;
}
x+=(n.offsetLeft<0?0:n.offsetLeft);
return true;
});
return x;
},decorateEvent:function(e){
this.baseDecorateEvent(e);
e.rowIndex=-1;
e.cellX=this.getCellX(e);
return true;
},prepareResize:function(e,mod){
do{
var i=_1(e.cellNode);
e.cellNode=(i?e.cellNode.parentNode.cells[i+mod]:null);
e.cellIndex=(e.cellNode?this.getCellNodeIndex(e.cellNode):-1);
}while(e.cellNode&&e.cellNode.style.display=="none");
return Boolean(e.cellNode);
},canResize:function(e){
if(!e.cellNode||e.cellNode.colSpan>1){
return false;
}
var _36=this.grid.getCell(e.cellIndex);
return !_36.noresize&&_36.canResize();
},overLeftResizeArea:function(e){
if(dojo.hasClass(dojo.body(),"dojoDndMove")){
return false;
}
if(dojo.isIE){
var tN=e.target;
if(dojo.hasClass(tN,"dojoxGridArrowButtonNode")||dojo.hasClass(tN,"dojoxGridArrowButtonChar")){
return false;
}
}
if(dojo._isBodyLtr()){
return (e.cellIndex>0)&&(e.cellX>0&&e.cellX<this.overResizeWidth)&&this.prepareResize(e,-1);
}
var t=e.cellNode&&(e.cellX>0&&e.cellX<this.overResizeWidth);
return t;
},overRightResizeArea:function(e){
if(dojo.hasClass(dojo.body(),"dojoDndMove")){
return false;
}
if(dojo.isIE){
var tN=e.target;
if(dojo.hasClass(tN,"dojoxGridArrowButtonNode")||dojo.hasClass(tN,"dojoxGridArrowButtonChar")){
return false;
}
}
if(dojo._isBodyLtr()){
return e.cellNode&&(e.cellX>=e.cellNode.offsetWidth-this.overResizeWidth);
}
return (e.cellIndex>0)&&(e.cellX>=e.cellNode.offsetWidth-this.overResizeWidth)&&this.prepareResize(e,-1);
},domousemove:function(e){
if(!this.moveable){
var c=(this.overRightResizeArea(e)?"dojoxGridColResize":(this.overLeftResizeArea(e)?"dojoxGridColResize":""));
if(c&&!this.canResize(e)){
c="dojoxGridColNoResize";
}
dojo.toggleClass(e.sourceView.headerNode,"dojoxGridColNoResize",(c=="dojoxGridColNoResize"));
dojo.toggleClass(e.sourceView.headerNode,"dojoxGridColResize",(c=="dojoxGridColResize"));
if(dojo.isIE){
var t=e.sourceView.headerNode.scrollLeft;
e.sourceView.headerNode.scrollLeft=t;
}
if(c){
dojo.stopEvent(e);
}
}
},domousedown:function(e){
if(!this.moveable){
if((this.overRightResizeArea(e)||this.overLeftResizeArea(e))&&this.canResize(e)){
this.beginColumnResize(e);
}else{
this.grid.onMouseDown(e);
this.grid.onMouseOverRow(e);
}
}
},doclick:function(e){
if(this._skipBogusClicks){
dojo.stopEvent(e);
return true;
}
return false;
},colResizeSetup:function(e,_37){
var _38=dojo.contentBox(e.sourceView.headerNode);
if(_37){
this.lineDiv=document.createElement("div");
var vw=(dojo.position||dojo._abs)(e.sourceView.headerNode,true);
var _39=dojo.contentBox(e.sourceView.domNode);
var l=e.pageX;
if(!dojo._isBodyLtr()&&dojo.isIE<8){
l-=dojox.html.metrics.getScrollbar().w;
}
dojo.style(this.lineDiv,{top:vw.y+"px",left:l+"px",height:(_39.h+_38.h)+"px"});
dojo.addClass(this.lineDiv,"dojoxGridResizeColLine");
this.lineDiv._origLeft=l;
dojo.body().appendChild(this.lineDiv);
}
var _3a=[],_3b=this.tableMap.findOverlappingNodes(e.cellNode);
for(var i=0,_3c;(_3c=_3b[i]);i++){
_3a.push({node:_3c,index:this.getCellNodeIndex(_3c),width:_3c.offsetWidth});
}
var _3d=e.sourceView;
var adj=dojo._isBodyLtr()?1:-1;
var _3e=e.grid.views.views;
var _3f=[];
for(var j=_3d.idx+adj,_40;(_40=_3e[j]);j=j+adj){
_3f.push({node:_40.headerNode,left:window.parseInt(_40.headerNode.style.left)});
}
var _41=_3d.headerContentNode.firstChild;
var _42={scrollLeft:e.sourceView.headerNode.scrollLeft,view:_3d,node:e.cellNode,index:e.cellIndex,w:dojo.contentBox(e.cellNode).w,vw:_38.w,table:_41,tw:dojo.contentBox(_41).w,spanners:_3a,followers:_3f};
return _42;
},beginColumnResize:function(e){
this.moverDiv=document.createElement("div");
dojo.style(this.moverDiv,{position:"absolute",left:0});
dojo.body().appendChild(this.moverDiv);
dojo.addClass(this.grid.domNode,"dojoxGridColumnResizing");
var m=(this.moveable=new dojo.dnd.Moveable(this.moverDiv));
var _43=this.colResizeSetup(e,true);
m.onMove=dojo.hitch(this,"doResizeColumn",_43);
dojo.connect(m,"onMoveStop",dojo.hitch(this,function(){
this.endResizeColumn(_43);
if(_43.node.releaseCapture){
_43.node.releaseCapture();
}
this.moveable.destroy();
delete this.moveable;
this.moveable=null;
dojo.removeClass(this.grid.domNode,"dojoxGridColumnResizing");
}));
if(e.cellNode.setCapture){
e.cellNode.setCapture();
}
m.onMouseDown(e);
},doResizeColumn:function(_44,_45,_46){
var _47=_46.l;
var _48={deltaX:_47,w:_44.w+(dojo._isBodyLtr()?_47:-_47),vw:_44.vw+_47,tw:_44.tw+_47};
this.dragRecord={inDrag:_44,mover:_45,leftTop:_46};
if(_48.w>=this.minColWidth){
if(!_45){
this.doResizeNow(_44,_48);
}else{
dojo.style(this.lineDiv,"left",(this.lineDiv._origLeft+_48.deltaX)+"px");
}
}
},endResizeColumn:function(_49){
if(this.dragRecord){
var _4a=this.dragRecord.leftTop;
var _4b=dojo._isBodyLtr()?_4a.l:-_4a.l;
_4b+=Math.max(_49.w+_4b,this.minColWidth)-(_49.w+_4b);
if(dojo.isWebKit&&_49.spanners.length){
_4b+=dojo._getPadBorderExtents(_49.spanners[0].node).w;
}
var _4c={deltaX:_4b,w:_49.w+_4b,vw:_49.vw+_4b,tw:_49.tw+_4b};
this.doResizeNow(_49,_4c);
delete this.dragRecord;
}
dojo.destroy(this.lineDiv);
dojo.destroy(this.moverDiv);
dojo.destroy(this.moverDiv);
delete this.moverDiv;
this._skipBogusClicks=true;
_49.view.update();
this._skipBogusClicks=false;
this.grid.onResizeColumn(_49.index);
},doResizeNow:function(_4d,_4e){
_4d.view.convertColPctToFixed();
if(_4d.view.flexCells&&!_4d.view.testFlexCells()){
var t=_6(_4d.node);
if(t){
(t.style.width="");
}
}
var i,s,sw,f,fl;
for(i=0;(s=_4d.spanners[i]);i++){
sw=s.width+_4e.deltaX;
if(sw>0){
s.node.style.width=sw+"px";
_4d.view.setColWidth(s.index,sw);
}
}
if(dojo._isBodyLtr()||!dojo.isIE){
for(i=0;(f=_4d.followers[i]);i++){
fl=f.left+_4e.deltaX;
f.node.style.left=fl+"px";
}
}
_4d.node.style.width=_4e.w+"px";
_4d.view.setColWidth(_4d.index,_4e.w);
_4d.view.headerNode.style.width=_4e.vw+"px";
_4d.view.setColumnsWidth(_4e.tw);
if(!dojo._isBodyLtr()){
_4d.view.headerNode.scrollLeft=_4d.scrollLeft+_4e.deltaX;
}
}});
dg._TableMap=dojo.extend(function(_4f){
this.mapRows(_4f);
},{map:null,mapRows:function(_50){
var _51=_50.length;
if(!_51){
return;
}
this.map=[];
var row;
for(var k=0;(row=_50[k]);k++){
this.map[k]=[];
}
for(var j=0;(row=_50[j]);j++){
for(var i=0,x=0,_52,_53,_54;(_52=row[i]);i++){
while(this.map[j][x]){
x++;
}
this.map[j][x]={c:i,r:j};
_54=_52.rowSpan||1;
_53=_52.colSpan||1;
for(var y=0;y<_54;y++){
for(var s=0;s<_53;s++){
this.map[j+y][x+s]=this.map[j][x];
}
}
x+=_53;
}
}
},dumpMap:function(){
for(var j=0,row,h="";(row=this.map[j]);j++,h=""){
for(var i=0,_55;(_55=row[i]);i++){
h+=_55.r+","+_55.c+"   ";
}
}
},getMapCoords:function(_56,_57){
for(var j=0,row;(row=this.map[j]);j++){
for(var i=0,_58;(_58=row[i]);i++){
if(_58.c==_57&&_58.r==_56){
return {j:j,i:i};
}
}
}
return {j:-1,i:-1};
},getNode:function(_59,_5a,_5b){
var row=_59&&_59.rows[_5a];
return row&&row.cells[_5b];
},_findOverlappingNodes:function(_5c,_5d,_5e){
var _5f=[];
var m=this.getMapCoords(_5d,_5e);
for(var j=0,row;(row=this.map[j]);j++){
if(j==m.j){
continue;
}
var rw=row[m.i];
var n=(rw?this.getNode(_5c,rw.r,rw.c):null);
if(n){
_5f.push(n);
}
}
return _5f;
},findOverlappingNodes:function(_60){
return this._findOverlappingNodes(_6(_60),_2(_60.parentNode),_1(_60));
}});
})();
}
