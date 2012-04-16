/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.DnD"]){
dojo._hasResource["dojox.grid.enhanced.plugins.DnD"]=true;
dojo.provide("dojox.grid.enhanced.plugins.DnD");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid.enhanced.plugins.Selector");
dojo.require("dojox.grid.enhanced.plugins.Rearrange");
dojo.require("dojo.dnd.move");
dojo.require("dojo.dnd.Source");
(function(){
var _1=function(a){
a.sort(function(v1,v2){
return v1-v2;
});
var _2=[[a[0]]];
for(var i=1,j=0;i<a.length;++i){
if(a[i]==a[i-1]+1){
_2[j].push(a[i]);
}else{
_2[++j]=[a[i]];
}
}
return _2;
},_3=function(_4){
var a=_4[0];
for(var i=1;i<_4.length;++i){
a=a.concat(_4[i]);
}
return a;
};
dojo.declare("dojox.grid.enhanced.plugins.DnD",dojox.grid.enhanced._Plugin,{name:"dnd",_targetAnchorBorderWidth:2,_copyOnly:false,_config:{"row":{"within":true,"in":true,"out":true},"col":{"within":true,"in":true,"out":true},"cell":{"within":true,"in":true,"out":true}},constructor:function(_5,_6){
this.grid=_5;
this._config=dojo.clone(this._config);
_6=dojo.isObject(_6)?_6:{};
this.setupConfig(_6.dndConfig);
this._copyOnly=!!_6.copyOnly;
this._mixinGrid();
this.selector=_5.pluginMgr.getPlugin("selector");
this.rearranger=_5.pluginMgr.getPlugin("rearrange");
this.rearranger.setArgs(_6);
this._clear();
this._elem=new dojox.grid.enhanced.plugins.GridDnDElement(this);
this._source=new dojox.grid.enhanced.plugins.GridDnDSource(this._elem.node,{"grid":_5,"dndElem":this._elem,"dnd":this});
this._container=dojo.query(".dojoxGridMasterView",this.grid.domNode)[0];
this._initEvents();
},destroy:function(){
this.inherited(arguments);
this._clear();
this._source.destroy();
this._elem.destroy();
this._container=null;
this.grid=null;
this.selector=null;
this.rearranger=null;
this._config=null;
},_mixinGrid:function(){
this.grid.setupDnDConfig=dojo.hitch(this,"setupConfig");
this.grid.dndCopyOnly=dojo.hitch(this,"copyOnly");
},setupConfig:function(_7){
if(_7&&dojo.isObject(_7)){
var _8=["row","col","cell"],_9=["within","in","out"],_a=this._config;
dojo.forEach(_8,function(_b){
if(_b in _7){
var t=_7[_b];
if(t&&dojo.isObject(t)){
dojo.forEach(_9,function(_c){
if(_c in t){
_a[_b][_c]=!!t[_c];
}
});
}else{
dojo.forEach(_9,function(_d){
_a[_b][_d]=!!t;
});
}
}
});
dojo.forEach(_9,function(_e){
if(_e in _7){
var m=_7[_e];
if(m&&dojo.isObject(m)){
dojo.forEach(_8,function(_f){
if(_f in m){
_a[_f][_e]=!!m[_f];
}
});
}else{
dojo.forEach(_8,function(_10){
_a[_10][_e]=!!m;
});
}
}
});
}
},copyOnly:function(_11){
if(typeof _11!="undefined"){
this._copyOnly=!!_11;
}
return this._copyOnly;
},_isOutOfGrid:function(evt){
var _12=dojo.position(this.grid.domNode),x=evt.clientX,y=evt.clientY;
return y<_12.y||y>_12.y+_12.h||x<_12.x||x>_12.x+_12.w;
},_onMouseMove:function(evt){
if(this._dndRegion&&!this._dnding&&!this._externalDnd){
this._dnding=true;
this._startDnd(evt);
}else{
if(this._isMouseDown&&!this._dndRegion){
delete this._isMouseDown;
this._oldCursor=dojo.style(dojo.body(),"cursor");
dojo.style(dojo.body(),"cursor","not-allowed");
}
var _13=this._isOutOfGrid(evt);
if(!this._alreadyOut&&_13){
this._alreadyOut=true;
if(this._dnding){
this._destroyDnDUI(true,false);
}
this._moveEvent=evt;
this._source.onOutEvent();
}else{
if(this._alreadyOut&&!_13){
this._alreadyOut=false;
if(this._dnding){
this._createDnDUI(evt,true);
}
this._moveEvent=evt;
this._source.onOverEvent();
}
}
}
},_onMouseUp:function(){
if(!this._extDnding&&!this._isSource){
var _14=this._dnding&&!this._alreadyOut;
if(_14&&this._config[this._dndRegion.type]["within"]){
this._rearrange();
}
this._endDnd(_14);
}
dojo.style(dojo.body(),"cursor",this._oldCursor||"");
delete this._isMouseDown;
},_initEvents:function(){
var g=this.grid,s=this.selector;
this.connect(dojo.doc,"onmousemove","_onMouseMove");
this.connect(dojo.doc,"onmouseup","_onMouseUp");
this.connect(g,"onCellMouseOver",function(evt){
if(!this._dnding&&!s.isSelecting()&&!evt.ctrlKey){
this._dndReady=s.isSelected("cell",evt.rowIndex,evt.cell.index);
s.selectEnabled(!this._dndReady);
}
});
this.connect(g,"onHeaderCellMouseOver",function(evt){
if(this._dndReady){
s.selectEnabled(true);
}
});
this.connect(g,"onRowMouseOver",function(evt){
if(this._dndReady&&!evt.cell){
s.selectEnabled(true);
}
});
this.connect(g,"onCellMouseDown",function(evt){
if(!evt.ctrlKey&&this._dndReady){
this._dndRegion=this._getDnDRegion(evt.rowIndex,evt.cell.index);
this._isMouseDown=true;
}
});
this.connect(g,"onCellMouseUp",function(evt){
if(!this._dndReady&&!s.isSelecting()&&evt.cell){
this._dndReady=s.isSelected("cell",evt.rowIndex,evt.cell.index);
s.selectEnabled(!this._dndReady);
}
});
this.connect(g,"onCellClick",function(evt){
if(this._dndReady&&!evt.ctrlKey&&!evt.shiftKey){
s.select("cell",evt.rowIndex,evt.cell.index);
}
});
this.connect(g,"onEndAutoScroll",function(_15,_16,_17,_18,evt){
if(this._dnding){
this._markTargetAnchor(evt);
}
});
this.connect(dojo.doc,"onkeydown",function(evt){
if(evt.keyCode==dojo.keys.ESCAPE){
this._endDnd(false);
}else{
if(evt.keyCode==dojo.keys.CTRL){
s.selectEnabled(true);
this._isCopy=true;
}
}
});
this.connect(dojo.doc,"onkeyup",function(evt){
if(evt.keyCode==dojo.keys.CTRL){
s.selectEnabled(!this._dndReady);
this._isCopy=false;
}
});
},_clear:function(){
this._dndRegion=null;
this._target=null;
this._moveEvent=null;
this._targetAnchor={};
this._dnding=false;
this._externalDnd=false;
this._isSource=false;
this._alreadyOut=false;
this._extDnding=false;
},_getDnDRegion:function(_19,_1a){
var s=this.selector,_1b=s._selected,_1c=(!!_1b.cell.length)|(!!_1b.row.length<<1)|(!!_1b.col.length<<2),_1d;
switch(_1c){
case 1:
_1d="cell";
if(!this._config[_1d]["within"]&&!this._config[_1d]["out"]){
return null;
}
var _1e=this.grid.layout.cells,_1f=function(_20){
var _21=0;
for(var i=_20.min.col;i<=_20.max.col;++i){
if(_1e[i].hidden){
++_21;
}
}
return (_20.max.row-_20.min.row+1)*(_20.max.col-_20.min.col+1-_21);
},_22=function(_23,_24){
return _23.row>=_24.min.row&&_23.row<=_24.max.row&&_23.col>=_24.min.col&&_23.col<=_24.max.col;
},_25={max:{row:-1,col:-1},min:{row:Infinity,col:Infinity}};
dojo.forEach(_1b[_1d],function(_26){
if(_26.row<_25.min.row){
_25.min.row=_26.row;
}
if(_26.row>_25.max.row){
_25.max.row=_26.row;
}
if(_26.col<_25.min.col){
_25.min.col=_26.col;
}
if(_26.col>_25.max.col){
_25.max.col=_26.col;
}
});
if(dojo.some(_1b[_1d],function(_27){
return _27.row==_19&&_27.col==_1a;
})){
if(_1f(_25)==_1b[_1d].length&&dojo.every(_1b[_1d],function(_28){
return _22(_28,_25);
})){
return {"type":_1d,"selected":[_25],"handle":{"row":_19,"col":_1a}};
}
}
return null;
case 2:
case 4:
_1d=_1c==2?"row":"col";
if(!this._config[_1d]["within"]&&!this._config[_1d]["out"]){
return null;
}
var res=s.getSelected(_1d);
if(res.length){
return {"type":_1d,"selected":_1(res),"handle":_1c==2?_19:_1a};
}
return null;
}
return null;
},_startDnd:function(evt){
this._createDnDUI(evt);
},_endDnd:function(_29){
this._destroyDnDUI(false,_29);
this._clear();
},_createDnDUI:function(evt,_2a){
var _2b=dojo.position(this.grid.views.views[0].domNode);
dojo.style(this._container,"height",_2b.h+"px");
try{
if(!_2a){
this._createSource(evt);
}
this._createMoveable(evt);
this._oldCursor=dojo.style(dojo.body(),"cursor");
dojo.style(dojo.body(),"cursor","default");
}
catch(e){
console.warn("DnD._createDnDUI() error:",e);
}
},_destroyDnDUI:function(_2c,_2d){
try{
if(_2d){
this._destroySource();
}
this._unmarkTargetAnchor();
if(!_2c){
this._destroyMoveable();
}
dojo.style(dojo.body(),"cursor",this._oldCursor);
}
catch(e){
console.warn("DnD._destroyDnDUI() error:",this.grid.id,e);
}
},_createSource:function(evt){
this._elem.createDnDNodes(this._dndRegion);
var m=dojo.dnd.manager();
var _2e=m.makeAvatar;
m._dndPlugin=this;
m.makeAvatar=function(){
var _2f=new dojox.grid.enhanced.plugins.GridDnDAvatar(m);
delete m._dndPlugin;
return _2f;
};
m.startDrag(this._source,this._elem.getDnDNodes(),evt.ctrlKey);
m.makeAvatar=_2e;
m.onMouseMove(evt);
},_destroySource:function(){
dojo.publish("/dnd/cancel");
this._elem.destroyDnDNodes();
},_createMoveable:function(evt){
if(!this._markTagetAnchorHandler){
this._markTagetAnchorHandler=this.connect(dojo.doc,"onmousemove","_markTargetAnchor");
}
},_destroyMoveable:function(){
this.disconnect(this._markTagetAnchorHandler);
delete this._markTagetAnchorHandler;
},_calcColTargetAnchorPos:function(evt,_30){
var i,_31,_32,_33,ex=evt.clientX,_34=this.grid.layout.cells,ltr=dojo._isBodyLtr(),_35=this._getVisibleHeaders();
for(i=0;i<_35.length;++i){
_31=dojo.position(_35[i].node);
if(ltr?((i===0||ex>=_31.x)&&ex<_31.x+_31.w):((i===0||ex<_31.x+_31.w)&&ex>=_31.x)){
_32=_31.x+(ltr?0:_31.w);
break;
}else{
if(ltr?(i===_35.length-1&&ex>=_31.x+_31.w):(i===_35.length-1&&ex<_31.x)){
++i;
_32=_31.x+(ltr?_31.w:0);
break;
}
}
}
if(i<_35.length){
_33=_35[i].cell.index;
if(this.selector.isSelected("col",_33)&&this.selector.isSelected("col",_33-1)){
var _36=this._dndRegion.selected;
for(i=0;i<_36.length;++i){
if(dojo.indexOf(_36[i],_33)>=0){
_33=_36[i][0];
_31=dojo.position(_34[_33].getHeaderNode());
_32=_31.x+(ltr?0:_31.w);
break;
}
}
}
}else{
_33=_34.length;
}
this._target=_33;
return _32-_30.x;
},_calcRowTargetAnchorPos:function(evt,_37){
var g=this.grid,top,i=0,_38=g.layout.cells;
while(_38[i].hidden){
++i;
}
var _39=g.layout.cells[i],_3a=g.scroller.firstVisibleRow,_3b=dojo.position(_39.getNode(_3a));
while(_3b.y+_3b.h<evt.clientY){
if(++_3a>=g.rowCount){
break;
}
_3b=dojo.position(_39.getNode(_3a));
}
if(_3a<g.rowCount){
if(this.selector.isSelected("row",_3a)&&this.selector.isSelected("row",_3a-1)){
var _3c=this._dndRegion.selected;
for(i=0;i<_3c.length;++i){
if(dojo.indexOf(_3c[i],_3a)>=0){
_3a=_3c[i][0];
_3b=dojo.position(_39.getNode(_3a));
break;
}
}
}
top=_3b.y;
}else{
top=_3b.y+_3b.h;
}
this._target=_3a;
return top-_37.y;
},_calcCellTargetAnchorPos:function(evt,_3d,_3e){
var s=this._dndRegion.selected[0],_3f=this._dndRegion.handle,g=this.grid,ltr=dojo._isBodyLtr(),_40=g.layout.cells,_41,_42,_43,_44,_45,_46,_47,top,_48,_49,i,_4a=_3f.col-s.min.col,_4b=s.max.col-_3f.col,_4c,_4d;
if(!_3e.childNodes.length){
_4c=dojo.create("div",{"class":"dojoxGridCellBorderLeftTopDIV"},_3e);
_4d=dojo.create("div",{"class":"dojoxGridCellBorderRightBottomDIV"},_3e);
}else{
_4c=dojo.query(".dojoxGridCellBorderLeftTopDIV",_3e)[0];
_4d=dojo.query(".dojoxGridCellBorderRightBottomDIV",_3e)[0];
}
for(i=s.min.col+1;i<_3f.col;++i){
if(_40[i].hidden){
--_4a;
}
}
for(i=_3f.col+1;i<s.max.col;++i){
if(_40[i].hidden){
--_4b;
}
}
_44=this._getVisibleHeaders();
for(i=_4a;i<_44.length-_4b;++i){
_41=dojo.position(_44[i].node);
if((evt.clientX>=_41.x&&evt.clientX<_41.x+_41.w)||(i==_4a&&(ltr?evt.clientX<_41.x:evt.clientX>=_41.x+_41.w))||(i==_44.length-_4b-1&&(ltr?evt.clientX>=_41.x+_41.w:evt<_41.x))){
_48=_44[i-_4a];
_49=_44[i+_4b];
_42=dojo.position(_48.node);
_43=dojo.position(_49.node);
_48=_48.cell.index;
_49=_49.cell.index;
_47=ltr?_42.x:_43.x;
_46=ltr?(_43.x+_43.w-_42.x):(_42.x+_42.w-_43.x);
break;
}
}
i=0;
while(_40[i].hidden){
++i;
}
var _4e=_40[i],_4f=g.scroller.firstVisibleRow,_50=dojo.position(_4e.getNode(_4f));
while(_50.y+_50.h<evt.clientY){
if(++_4f<g.rowCount){
_50=dojo.position(_4e.getNode(_4f));
}else{
break;
}
}
var _51=_4f>=_3f.row-s.min.row?_4f-_3f.row+s.min.row:0;
var _52=_51+s.max.row-s.min.row;
if(_52>=g.rowCount){
_52=g.rowCount-1;
_51=_52-s.max.row+s.min.row;
}
_42=dojo.position(_4e.getNode(_51));
_43=dojo.position(_4e.getNode(_52));
top=_42.y;
_45=_43.y+_43.h-_42.y;
this._target={"min":{"row":_51,"col":_48},"max":{"row":_52,"col":_49}};
var _53=(dojo.marginBox(_4c).w-dojo.contentBox(_4c).w)/2;
var _54=dojo.position(_40[_48].getNode(_51));
dojo.style(_4c,{"width":(_54.w-_53)+"px","height":(_54.h-_53)+"px"});
var _55=dojo.position(_40[_49].getNode(_52));
dojo.style(_4d,{"width":(_55.w-_53)+"px","height":(_55.h-_53)+"px"});
return {h:_45,w:_46,l:_47-_3d.x,t:top-_3d.y};
},_markTargetAnchor:function(evt){
try{
var t=this._dndRegion.type;
if(this._alreadyOut||(this._dnding&&!this._config[t]["within"])||(this._extDnding&&!this._config[t]["in"])){
return;
}
var _56,_57,_58,top,_59=this._targetAnchor[t],pos=dojo.position(this._container);
if(!_59){
_59=this._targetAnchor[t]=dojo.create("div",{"class":(t=="cell")?"dojoxGridCellBorderDIV":"dojoxGridBorderDIV"});
dojo.style(_59,"display","none");
this._container.appendChild(_59);
}
switch(t){
case "col":
_56=pos.h;
_57=this._targetAnchorBorderWidth;
_58=this._calcColTargetAnchorPos(evt,pos);
top=0;
break;
case "row":
_56=this._targetAnchorBorderWidth;
_57=pos.w;
_58=0;
top=this._calcRowTargetAnchorPos(evt,pos);
break;
case "cell":
var _5a=this._calcCellTargetAnchorPos(evt,pos,_59);
_56=_5a.h;
_57=_5a.w;
_58=_5a.l;
top=_5a.t;
}
if(typeof _56=="number"&&typeof _57=="number"&&typeof _58=="number"&&typeof top=="number"){
dojo.style(_59,{"height":_56+"px","width":_57+"px","left":_58+"px","top":top+"px"});
dojo.style(_59,"display","");
}else{
this._target=null;
}
}
catch(e){
console.warn("DnD._markTargetAnchor() error:",e);
}
},_unmarkTargetAnchor:function(){
if(this._dndRegion){
var _5b=this._targetAnchor[this._dndRegion.type];
if(_5b){
dojo.style(this._targetAnchor[this._dndRegion.type],"display","none");
}
}
},_getVisibleHeaders:function(){
return dojo.map(dojo.filter(this.grid.layout.cells,function(_5c){
return !_5c.hidden;
}),function(_5d){
return {"node":_5d.getHeaderNode(),"cell":_5d};
});
},_rearrange:function(){
if(this._target===null){
return;
}
var t=this._dndRegion.type;
var _5e=this._dndRegion.selected;
if(t==="cell"){
this.rearranger[(this._isCopy||this._copyOnly)?"copyCells":"moveCells"](_5e[0],this._target);
}else{
this.rearranger[t=="col"?"moveColumns":"moveRows"](_3(_5e),this._target);
}
this._target=null;
},onDraggingOver:function(_5f){
if(!this._dnding&&_5f){
_5f._isSource=true;
this._extDnding=true;
if(!this._externalDnd){
this._externalDnd=true;
this._dndRegion=this._mapRegion(_5f.grid,_5f._dndRegion);
}
this._createDnDUI(this._moveEvent,true);
this.grid.pluginMgr.getPlugin("autoScroll").readyForAutoScroll=true;
}
},_mapRegion:function(_60,_61){
if(_61.type==="cell"){
var _62=_61.selected[0];
var _63=this.grid.layout.cells;
var _64=_60.layout.cells;
var c,cnt=0;
for(c=_62.min.col;c<=_62.max.col;++c){
if(!_64[c].hidden){
++cnt;
}
}
for(c=0;cnt>0;++c){
if(!_63[c].hidden){
--cnt;
}
}
var _65=dojo.clone(_61);
_65.selected[0].min.col=0;
_65.selected[0].max.col=c-1;
for(c=_62.min.col;c<=_61.handle.col;++c){
if(!_64[c].hidden){
++cnt;
}
}
for(c=0;cnt>0;++c){
if(!_63[c].hidden){
--cnt;
}
}
_65.handle.col=c;
}
return _61;
},onDraggingOut:function(_66){
if(this._externalDnd){
this._extDnding=false;
this._destroyDnDUI(true,false);
if(_66){
_66._isSource=false;
}
}
},onDragIn:function(_67,_68){
var _69=false;
if(this._target!==null){
var _6a=_67._dndRegion.type;
var _6b=_67._dndRegion.selected;
switch(_6a){
case "cell":
this.rearranger.changeCells(_67.grid,_6b[0],this._target);
break;
case "row":
var _6c=_3(_6b);
this.rearranger.insertRows(_67.grid,_6c,this._target);
break;
}
_69=true;
}
this._endDnd(true);
if(_67.onDragOut){
_67.onDragOut(_69&&!_68);
}
},onDragOut:function(_6d){
if(_6d&&!this._copyOnly){
var _6e=this._dndRegion.type;
var _6f=this._dndRegion.selected;
switch(_6e){
case "cell":
this.rearranger.clearCells(_6f[0]);
break;
case "row":
this.rearranger.removeRows(_3(_6f));
break;
}
}
this._endDnd(true);
},_canAccept:function(_70){
if(!_70){
return false;
}
var _71=_70._dndRegion;
var _72=_71.type;
if(!this._config[_72]["in"]||!_70._config[_72]["out"]){
return false;
}
var g=this.grid;
var _73=_71.selected;
var _74=dojo.filter(g.layout.cells,function(_75){
return !_75.hidden;
}).length;
var _76=g.rowCount;
var res=true;
switch(_72){
case "cell":
_73=_73[0];
res=g.store.getFeatures()["dojo.data.api.Write"]&&(_73.max.row-_73.min.row)<=_76&&dojo.filter(_70.grid.layout.cells,function(_77){
return _77.index>=_73.min.col&&_77.index<=_73.max.col&&!_77.hidden;
}).length<=_74;
case "row":
if(_70._allDnDItemsLoaded()){
return res;
}
}
return false;
},_allDnDItemsLoaded:function(){
if(this._dndRegion){
var _78=this._dndRegion.type,_79=this._dndRegion.selected,_7a=[];
switch(_78){
case "cell":
for(var i=_79[0].min.row,max=_79[0].max.row;i<=max;++i){
_7a.push(i);
}
break;
case "row":
_7a=_3(_79);
break;
default:
return false;
}
var _7b=this.grid._by_idx;
return dojo.every(_7a,function(_7c){
return !!_7b[_7c];
});
}
return false;
}});
dojo.declare("dojox.grid.enhanced.plugins.GridDnDElement",null,{constructor:function(_7d){
this.plugin=_7d;
this.node=dojo.create("div");
this._items={};
},destroy:function(){
this.plugin=null;
dojo.destroy(this.node);
this.node=null;
this._items=null;
},createDnDNodes:function(_7e){
this.destroyDnDNodes();
var _7f=["grid/"+_7e.type+"s"];
var _80=this.plugin.grid.id+"_dndItem";
dojo.forEach(_7e.selected,function(_81,i){
var id=_80+i;
this._items[id]={"type":_7f,"data":_81,"dndPlugin":this.plugin};
this.node.appendChild(dojo.create("div",{"id":id}));
},this);
},getDnDNodes:function(){
return dojo.map(this.node.childNodes,function(_82){
return _82;
});
},destroyDnDNodes:function(){
dojo.empty(this.node);
this._items={};
},getItem:function(_83){
return this._items[_83];
}});
dojo.declare("dojox.grid.enhanced.plugins.GridDnDSource",dojo.dnd.Source,{accept:["grid/cells","grid/rows","grid/cols"],constructor:function(_84,_85){
this.grid=_85.grid;
this.dndElem=_85.dndElem;
this.dndPlugin=_85.dnd;
this.sourcePlugin=null;
},destroy:function(){
this.inherited(arguments);
this.grid=null;
this.dndElem=null;
this.dndPlugin=null;
this.sourcePlugin=null;
},getItem:function(_86){
return this.dndElem.getItem(_86);
},checkAcceptance:function(_87,_88){
if(this!=_87&&_88[0]){
var _89=_87.getItem(_88[0].id);
if(_89.dndPlugin){
var _8a=_89.type;
for(var j=0;j<_8a.length;++j){
if(_8a[j] in this.accept){
if(this.dndPlugin._canAccept(_89.dndPlugin)){
this.sourcePlugin=_89.dndPlugin;
}else{
return false;
}
break;
}
}
}else{
if("grid/rows" in this.accept){
var _8b=[];
dojo.forEach(_88,function(_8c){
var _8d=_87.getItem(_8c.id);
if(_8d.data&&dojo.indexOf(_8d.type,"grid/rows")>=0){
var _8e=_8d.data;
if(typeof _8d.data=="string"){
_8e=dojo.fromJson(_8d.data);
}
if(_8e){
_8b.push(_8e);
}
}
});
if(_8b.length){
this.sourcePlugin={_dndRegion:{type:"row",selected:[_8b]}};
}else{
return false;
}
}
}
}
return this.inherited(arguments);
},onDraggingOver:function(){
this.dndPlugin.onDraggingOver(this.sourcePlugin);
},onDraggingOut:function(){
this.dndPlugin.onDraggingOut(this.sourcePlugin);
},onDndDrop:function(_8f,_90,_91,_92){
this.onDndCancel();
if(this!=_8f&&this==_92){
this.dndPlugin.onDragIn(this.sourcePlugin,_91);
}
}});
dojo.declare("dojox.grid.enhanced.plugins.GridDnDAvatar",dojo.dnd.Avatar,{construct:function(){
this._itemType=this.manager._dndPlugin._dndRegion.type;
this._itemCount=this._getItemCount();
this.isA11y=dojo.hasClass(dojo.body(),"dijit_a11y");
var a=dojo.create("table",{"border":"0","cellspacing":"0","class":"dojoxGridDndAvatar","style":{position:"absolute",zIndex:"1999",margin:"0px"}}),_93=this.manager.source,b=dojo.create("tbody",null,a),tr=dojo.create("tr",null,b),td=dojo.create("td",{"class":"dojoxGridDnDIcon"},tr);
if(this.isA11y){
dojo.create("span",{"id":"a11yIcon","innerHTML":this.manager.copy?"+":"<"},td);
}
td=dojo.create("td",{"class":"dojoxGridDnDItemIcon "+this._getGridDnDIconClass()},tr);
td=dojo.create("td",null,tr);
dojo.create("span",{"class":"dojoxGridDnDItemCount","innerHTML":_93.generateText?this._generateText():""},td);
dojo.style(tr,{"opacity":0.9});
this.node=a;
},_getItemCount:function(){
var _94=this.manager._dndPlugin._dndRegion.selected,_95=0;
switch(this._itemType){
case "cell":
_94=_94[0];
var _96=this.manager._dndPlugin.grid.layout.cells,_97=_94.max.col-_94.min.col+1,_98=_94.max.row-_94.min.row+1;
if(_97>1){
for(var i=_94.min.col;i<=_94.max.col;++i){
if(_96[i].hidden){
--_97;
}
}
}
_95=_97*_98;
break;
case "row":
case "col":
_95=_3(_94).length;
}
return _95;
},_getGridDnDIconClass:function(){
return {"row":["dojoxGridDnDIconRowSingle","dojoxGridDnDIconRowMulti"],"col":["dojoxGridDnDIconColSingle","dojoxGridDnDIconColMulti"],"cell":["dojoxGridDnDIconCellSingle","dojoxGridDnDIconCellMulti"]}[this._itemType][this._itemCount==1?0:1];
},_generateText:function(){
return "("+this._itemCount+")";
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.DnD,{"dependency":["selector","rearrange"]});
})();
}
