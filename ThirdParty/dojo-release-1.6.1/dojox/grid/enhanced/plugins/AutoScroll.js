/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.AutoScroll"]){
dojo._hasResource["dojox.grid.enhanced.plugins.AutoScroll"]=true;
dojo.provide("dojox.grid.enhanced.plugins.AutoScroll");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid._RowSelector");
dojo.declare("dojox.grid.enhanced.plugins.AutoScroll",dojox.grid.enhanced._Plugin,{name:"autoScroll",autoScrollInterval:1000,autoScrollMargin:30,constructor:function(_1,_2){
this.grid=_1;
this.readyForAutoScroll=false;
this._scrolling=false;
_2=dojo.isObject(_2)?_2:{};
if("interval" in _2){
this.autoScrollInterval=_2.interval;
}
if("margin" in _2){
this.autoScrollMargin=_2.margin;
}
this._initEvents();
this._mixinGrid();
},_initEvents:function(){
var g=this.grid;
this.connect(g,"onCellMouseDown",function(){
this.readyForAutoScroll=true;
});
this.connect(g,"onHeaderCellMouseDown",function(){
this.readyForAutoScroll=true;
});
this.connect(g,"onRowSelectorMouseDown",function(){
this.readyForAutoScroll=true;
});
this.connect(dojo.doc,"onmouseup",function(_3){
this._manageAutoScroll(true);
this.readyForAutoScroll=false;
});
this.connect(dojo.doc,"onmousemove",function(_4){
if(this.readyForAutoScroll){
this._event=_4;
var _5=dojo.position(g.domNode),hh=g._getHeaderHeight(),_6=this.autoScrollMargin,ey=_4.clientY,ex=_4.clientX,gy=_5.y,gx=_5.x,gh=_5.h,gw=_5.w;
if(ex>=gx&&ex<=gx+gw){
if(ey>=gy+hh&&ey<gy+hh+_6){
this._manageAutoScroll(false,true,false);
return;
}else{
if(ey>gy+gh-_6&&ey<=gy+gh){
this._manageAutoScroll(false,true,true);
return;
}else{
if(ey>=gy&&ey<=gy+gh){
var _7=dojo.some(g.views.views,function(_8,i){
if(_8 instanceof dojox.grid._RowSelector){
return false;
}
var _9=dojo.position(_8.domNode);
if(ex<_9.x+_6&&ex>=_9.x){
this._manageAutoScroll(false,false,false,_8);
return true;
}else{
if(ex>_9.x+_9.w-_6&&ex<_9.x+_9.w){
this._manageAutoScroll(false,false,true,_8);
return true;
}
}
return false;
},this);
if(_7){
return;
}
}
}
}
}
this._manageAutoScroll(true);
}
});
},_mixinGrid:function(){
var g=this.grid;
g.onStartAutoScroll=function(){
};
g.onEndAutoScroll=function(){
};
},_fireEvent:function(_a,_b){
var g=this.grid;
switch(_a){
case "start":
g.onStartAutoScroll.apply(g,_b);
break;
case "end":
g.onEndAutoScroll.apply(g,_b);
break;
}
},_manageAutoScroll:function(_c,_d,_e,_f){
if(_c){
this._scrolling=false;
clearInterval(this._handler);
}else{
if(!this._scrolling){
this._scrolling=true;
this._fireEvent("start",[_d,_e,_f]);
this._autoScroll(_d,_e,_f);
this._handler=setInterval(dojo.hitch(this,"_autoScroll",_d,_e,_f),this.autoScrollInterval);
}
}
},_autoScroll:function(_10,_11,_12){
var g=this.grid,_13=null;
if(_10){
var _14=g.scroller.firstVisibleRow+(_11?1:-1);
if(_14>=0&&_14<g.rowCount){
g.scrollToRow(_14);
_13=_14;
}
}else{
_13=this._scrollColumn(_11,_12);
}
if(_13!==null){
this._fireEvent("end",[_10,_11,_12,_13,this._event]);
}
},_scrollColumn:function(_15,_16){
var _17=_16.scrollboxNode,_18=null;
if(_17.clientWidth<_17.scrollWidth){
var _19=dojo.filter(this.grid.layout.cells,function(_1a){
return !_1a.hidden;
});
var _1b=dojo.position(_16.domNode);
var _1c,_1d,_1e,i;
if(_15){
_1c=_17.clientWidth;
for(i=0;i<_19.length;++i){
_1e=dojo.position(_19[i].getHeaderNode());
_1d=_1e.x-_1b.x+_1e.w;
if(_1d>_1c){
_18=_19[i].index;
_17.scrollLeft+=_1d-_1c+10;
break;
}
}
}else{
_1c=0;
for(i=_19.length-1;i>=0;--i){
_1e=dojo.position(_19[i].getHeaderNode());
_1d=_1e.x-_1b.x;
if(_1d<_1c){
_18=_19[i].index;
_17.scrollLeft+=_1d-_1c-10;
break;
}
}
}
}
return _18;
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.AutoScroll);
}
