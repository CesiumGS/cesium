/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.StackedBars"]){
dojo._hasResource["dojox.charting.plot2d.StackedBars"]=true;
dojo.provide("dojox.charting.plot2d.StackedBars");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d.Bars");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.reversed");
dojo.require("dojox.lang.functional.sequence");
(function(){
var df=dojox.lang.functional,dc=dojox.charting.plot2d.common,_1=df.lambda("item.purgeGroup()");
dojo.declare("dojox.charting.plot2d.StackedBars",dojox.charting.plot2d.Bars,{getSeriesStats:function(){
var _2=dc.collectStackedStats(this.series),t;
this._maxRunLength=_2.hmax;
_2.hmin-=0.5;
_2.hmax+=0.5;
t=_2.hmin,_2.hmin=_2.vmin,_2.vmin=t;
t=_2.hmax,_2.hmax=_2.vmax,_2.vmax=t;
return _2;
},render:function(_3,_4){
if(this._maxRunLength<=0){
return this;
}
var _5=df.repeat(this._maxRunLength,"-> 0",0);
for(var i=0;i<this.series.length;++i){
var _6=this.series[i];
for(var j=0;j<_6.data.length;++j){
var _7=_6.data[j];
if(_7!==null){
var v=typeof _7=="number"?_7:_7.y;
if(isNaN(v)){
v=0;
}
_5[j]+=v;
}
}
}
if(this.zoom&&!this.isDataDirty()){
return this.performZoom(_3,_4);
}
this.resetEvents();
this.dirty=this.isDirty();
if(this.dirty){
dojo.forEach(this.series,_1);
this._eventSeries={};
this.cleanGroup();
var s=this.group;
df.forEachRev(this.series,function(_8){
_8.cleanGroup(s);
});
}
var t=this.chart.theme,f,_9,_a,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler),_b=this.events();
f=dc.calculateBarSize(this._vScaler.bounds.scale,this.opt);
_9=f.gap;
_a=f.size;
for(var i=this.series.length-1;i>=0;--i){
var _6=this.series[i];
if(!this.dirty&&!_6.dirty){
t.skip();
this._reconnectEvents(_6.name);
continue;
}
_6.cleanGroup();
var _c=t.next("bar",[this.opt,_6]),s=_6.group,_d=new Array(_5.length);
for(var j=0;j<_5.length;++j){
var _7=_6.data[j];
if(_7!==null){
var v=_5[j],_e=ht(v),_f=typeof _7!="number"?t.addMixin(_c,"bar",_7,true):t.post(_c,"bar");
if(_e>=1&&_a>=1){
var _10={x:_4.l,y:_3.height-_4.b-vt(j+1.5)+_9,width:_e,height:_a};
var _11=this._plotFill(_f.series.fill,_3,_4);
_11=this._shapeFill(_11,_10);
var _12=s.createRect(_10).setFill(_11).setStroke(_f.series.stroke);
_6.dyn.fill=_12.getFill();
_6.dyn.stroke=_12.getStroke();
if(_b){
var o={element:"bar",index:j,run:_6,shape:_12,x:v,y:j+1.5};
this._connectEvents(o);
_d[j]=o;
}
if(this.animate){
this._animateBar(_12,_4.l,-_e);
}
}
}
}
this._eventSeries[_6.name]=_d;
_6.dirty=false;
for(var j=0;j<_6.data.length;++j){
var _7=_6.data[j];
if(_7!==null){
var v=typeof _7=="number"?_7:_7.y;
if(isNaN(v)){
v=0;
}
_5[j]-=v;
}
}
}
this.dirty=false;
return this;
}});
})();
}
