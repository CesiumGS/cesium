/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Candlesticks"]){
dojo._hasResource["dojox.charting.plot2d.Candlesticks"]=true;
dojo.provide("dojox.charting.plot2d.Candlesticks");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d.Base");
dojo.require("dojox.lang.utils");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.reversed");
(function(){
var df=dojox.lang.functional,du=dojox.lang.utils,dc=dojox.charting.plot2d.common,_1=df.lambda("item.purgeGroup()");
dojo.declare("dojox.charting.plot2d.Candlesticks",dojox.charting.plot2d.Base,{defaultParams:{hAxis:"x",vAxis:"y",gap:2,animate:null},optionalParams:{minBarSize:1,maxBarSize:1,stroke:{},outline:{},shadow:{},fill:{},font:"",fontColor:""},constructor:function(_2,_3){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_3);
du.updateWithPattern(this.opt,_3,this.optionalParams);
this.series=[];
this.hAxis=this.opt.hAxis;
this.vAxis=this.opt.vAxis;
this.animate=this.opt.animate;
},collectStats:function(_4){
var _5=dojo.delegate(dc.defaultStats);
for(var i=0;i<_4.length;i++){
var _6=_4[i];
if(!_6.data.length){
continue;
}
var _7=_5.vmin,_8=_5.vmax;
if(!("ymin" in _6)||!("ymax" in _6)){
dojo.forEach(_6.data,function(_9,_a){
if(_9!==null){
var x=_9.x||_a+1;
_5.hmin=Math.min(_5.hmin,x);
_5.hmax=Math.max(_5.hmax,x);
_5.vmin=Math.min(_5.vmin,_9.open,_9.close,_9.high,_9.low);
_5.vmax=Math.max(_5.vmax,_9.open,_9.close,_9.high,_9.low);
}
});
}
if("ymin" in _6){
_5.vmin=Math.min(_7,_6.ymin);
}
if("ymax" in _6){
_5.vmax=Math.max(_8,_6.ymax);
}
}
return _5;
},getSeriesStats:function(){
var _b=this.collectStats(this.series);
_b.hmin-=0.5;
_b.hmax+=0.5;
return _b;
},render:function(_c,_d){
if(this.zoom&&!this.isDataDirty()){
return this.performZoom(_c,_d);
}
this.resetEvents();
this.dirty=this.isDirty();
if(this.dirty){
dojo.forEach(this.series,_1);
this._eventSeries={};
this.cleanGroup();
var s=this.group;
df.forEachRev(this.series,function(_e){
_e.cleanGroup(s);
});
}
var t=this.chart.theme,f,_f,_10,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler),_11=Math.max(0,this._vScaler.bounds.lower),_12=vt(_11),_13=this.events();
f=dc.calculateBarSize(this._hScaler.bounds.scale,this.opt);
_f=f.gap;
_10=f.size;
for(var i=this.series.length-1;i>=0;--i){
var run=this.series[i];
if(!this.dirty&&!run.dirty){
t.skip();
this._reconnectEvents(run.name);
continue;
}
run.cleanGroup();
var _14=t.next("candlestick",[this.opt,run]),s=run.group,_15=new Array(run.data.length);
for(var j=0;j<run.data.length;++j){
var v=run.data[j];
if(v!==null){
var _16=t.addMixin(_14,"candlestick",v,true);
var x=ht(v.x||(j+0.5))+_d.l+_f,y=_c.height-_d.b,_17=vt(v.open),_18=vt(v.close),_19=vt(v.high),low=vt(v.low);
if("mid" in v){
var mid=vt(v.mid);
}
if(low>_19){
var tmp=_19;
_19=low;
low=tmp;
}
if(_10>=1){
var _1a=_17>_18;
var _1b={x1:_10/2,x2:_10/2,y1:y-_19,y2:y-low},_1c={x:0,y:y-Math.max(_17,_18),width:_10,height:Math.max(_1a?_17-_18:_18-_17,1)};
shape=s.createGroup();
shape.setTransform({dx:x,dy:0});
var _1d=shape.createGroup();
_1d.createLine(_1b).setStroke(_16.series.stroke);
_1d.createRect(_1c).setStroke(_16.series.stroke).setFill(_1a?_16.series.fill:"white");
if("mid" in v){
_1d.createLine({x1:(_16.series.stroke.width||1),x2:_10-(_16.series.stroke.width||1),y1:y-mid,y2:y-mid}).setStroke(_1a?"white":_16.series.stroke);
}
run.dyn.fill=_16.series.fill;
run.dyn.stroke=_16.series.stroke;
if(_13){
var o={element:"candlestick",index:j,run:run,shape:_1d,x:x,y:y-Math.max(_17,_18),cx:_10/2,cy:(y-Math.max(_17,_18))+(Math.max(_1a?_17-_18:_18-_17,1)/2),width:_10,height:Math.max(_1a?_17-_18:_18-_17,1),data:v};
this._connectEvents(o);
_15[j]=o;
}
}
if(this.animate){
this._animateCandlesticks(shape,y-low,_19-low);
}
}
}
this._eventSeries[run.name]=_15;
run.dirty=false;
}
this.dirty=false;
return this;
},_animateCandlesticks:function(_1e,_1f,_20){
dojox.gfx.fx.animateTransform(dojo.delegate({shape:_1e,duration:1200,transform:[{name:"translate",start:[0,_1f-(_1f/_20)],end:[0,0]},{name:"scale",start:[1,1/_20],end:[1,1]},{name:"original"}]},this.animate)).play();
}});
})();
}
