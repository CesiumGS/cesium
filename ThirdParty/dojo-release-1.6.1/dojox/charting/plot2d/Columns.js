/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Columns"]){
dojo._hasResource["dojox.charting.plot2d.Columns"]=true;
dojo.provide("dojox.charting.plot2d.Columns");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d.Base");
dojo.require("dojox.gfx.fx");
dojo.require("dojox.lang.utils");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.reversed");
(function(){
var df=dojox.lang.functional,du=dojox.lang.utils,dc=dojox.charting.plot2d.common,_1=df.lambda("item.purgeGroup()");
dojo.declare("dojox.charting.plot2d.Columns",dojox.charting.plot2d.Base,{defaultParams:{hAxis:"x",vAxis:"y",gap:0,animate:null},optionalParams:{minBarSize:1,maxBarSize:1,stroke:{},outline:{},shadow:{},fill:{},font:"",fontColor:""},constructor:function(_2,_3){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_3);
du.updateWithPattern(this.opt,_3,this.optionalParams);
this.series=[];
this.hAxis=this.opt.hAxis;
this.vAxis=this.opt.vAxis;
this.animate=this.opt.animate;
},getSeriesStats:function(){
var _4=dc.collectSimpleStats(this.series);
_4.hmin-=0.5;
_4.hmax+=0.5;
return _4;
},render:function(_5,_6){
if(this.zoom&&!this.isDataDirty()){
return this.performZoom(_5,_6);
}
this.resetEvents();
this.dirty=this.isDirty();
if(this.dirty){
dojo.forEach(this.series,_1);
this._eventSeries={};
this.cleanGroup();
var s=this.group;
df.forEachRev(this.series,function(_7){
_7.cleanGroup(s);
});
}
var t=this.chart.theme,f,_8,_9,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler),_a=Math.max(0,this._vScaler.bounds.lower),_b=vt(_a),_c=this.events();
f=dc.calculateBarSize(this._hScaler.bounds.scale,this.opt);
_8=f.gap;
_9=f.size;
for(var i=this.series.length-1;i>=0;--i){
var _d=this.series[i];
if(!this.dirty&&!_d.dirty){
t.skip();
this._reconnectEvents(_d.name);
continue;
}
_d.cleanGroup();
var _e=t.next("column",[this.opt,_d]),s=_d.group,_f=new Array(_d.data.length);
for(var j=0;j<_d.data.length;++j){
var _10=_d.data[j];
if(_10!==null){
var v=typeof _10=="number"?_10:_10.y,vv=vt(v),_11=vv-_b,h=Math.abs(_11),_12=typeof _10!="number"?t.addMixin(_e,"column",_10,true):t.post(_e,"column");
if(_9>=1&&h>=1){
var _13={x:_6.l+ht(j+0.5)+_8,y:_5.height-_6.b-(v>_a?vv:_b),width:_9,height:h};
var _14=this._plotFill(_12.series.fill,_5,_6);
_14=this._shapeFill(_14,_13);
var _15=s.createRect(_13).setFill(_14).setStroke(_12.series.stroke);
_d.dyn.fill=_15.getFill();
_d.dyn.stroke=_15.getStroke();
if(_c){
var o={element:"column",index:j,run:_d,shape:_15,x:j+0.5,y:v};
this._connectEvents(o);
_f[j]=o;
}
if(this.animate){
this._animateColumn(_15,_5.height-_6.b-_b,h);
}
}
}
}
this._eventSeries[_d.name]=_f;
_d.dirty=false;
}
this.dirty=false;
return this;
},_animateColumn:function(_16,_17,_18){
dojox.gfx.fx.animateTransform(dojo.delegate({shape:_16,duration:1200,transform:[{name:"translate",start:[0,_17-(_17/_18)],end:[0,0]},{name:"scale",start:[1,1/_18],end:[1,1]},{name:"original"}]},this.animate)).play();
}});
})();
}
