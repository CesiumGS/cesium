/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.ClusteredColumns"]){
dojo._hasResource["dojox.charting.plot2d.ClusteredColumns"]=true;
dojo.provide("dojox.charting.plot2d.ClusteredColumns");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d.Columns");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.reversed");
(function(){
var df=dojox.lang.functional,dc=dojox.charting.plot2d.common,_1=df.lambda("item.purgeGroup()");
dojo.declare("dojox.charting.plot2d.ClusteredColumns",dojox.charting.plot2d.Columns,{render:function(_2,_3){
if(this.zoom&&!this.isDataDirty()){
return this.performZoom(_2,_3);
}
this.resetEvents();
this.dirty=this.isDirty();
if(this.dirty){
dojo.forEach(this.series,_1);
this._eventSeries={};
this.cleanGroup();
var s=this.group;
df.forEachRev(this.series,function(_4){
_4.cleanGroup(s);
});
}
var t=this.chart.theme,f,_5,_6,_7,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler),_8=Math.max(0,this._vScaler.bounds.lower),_9=vt(_8),_a=this.events();
f=dc.calculateBarSize(this._hScaler.bounds.scale,this.opt,this.series.length);
_5=f.gap;
_6=_7=f.size;
for(var i=0;i<this.series.length;++i){
var _b=this.series[i],_c=_7*i;
if(!this.dirty&&!_b.dirty){
t.skip();
this._reconnectEvents(_b.name);
continue;
}
_b.cleanGroup();
var _d=t.next("column",[this.opt,_b]),s=_b.group,_e=new Array(_b.data.length);
for(var j=0;j<_b.data.length;++j){
var _f=_b.data[j];
if(_f!==null){
var v=typeof _f=="number"?_f:_f.y,vv=vt(v),_10=vv-_9,h=Math.abs(_10),_11=typeof _f!="number"?t.addMixin(_d,"column",_f,true):t.post(_d,"column");
if(_6>=1&&h>=1){
var _12={x:_3.l+ht(j+0.5)+_5+_c,y:_2.height-_3.b-(v>_8?vv:_9),width:_6,height:h};
var _13=this._plotFill(_11.series.fill,_2,_3);
_13=this._shapeFill(_13,_12);
var _14=s.createRect(_12).setFill(_13).setStroke(_11.series.stroke);
_b.dyn.fill=_14.getFill();
_b.dyn.stroke=_14.getStroke();
if(_a){
var o={element:"column",index:j,run:_b,shape:_14,x:j+0.5,y:v};
this._connectEvents(o);
_e[j]=o;
}
if(this.animate){
this._animateColumn(_14,_2.height-_3.b-_9,h);
}
}
}
}
this._eventSeries[_b.name]=_e;
_b.dirty=false;
}
this.dirty=false;
return this;
}});
})();
}
