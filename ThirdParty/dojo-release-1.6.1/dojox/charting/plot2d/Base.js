/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Base"]){
dojo._hasResource["dojox.charting.plot2d.Base"]=true;
dojo.provide("dojox.charting.plot2d.Base");
dojo.require("dojox.charting.scaler.primitive");
dojo.require("dojox.charting.Element");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d._PlotEvents");
dojo.declare("dojox.charting.plot2d.Base",[dojox.charting.Element,dojox.charting.plot2d._PlotEvents],{constructor:function(_1,_2){
this.zoom=null,this.zoomQueue=[];
this.lastWindow={vscale:1,hscale:1,xoffset:0,yoffset:0};
},clear:function(){
this.series=[];
this._hAxis=null;
this._vAxis=null;
this.dirty=true;
return this;
},setAxis:function(_3){
if(_3){
this[_3.vertical?"_vAxis":"_hAxis"]=_3;
}
return this;
},addSeries:function(_4){
this.series.push(_4);
return this;
},getSeriesStats:function(){
return dojox.charting.plot2d.common.collectSimpleStats(this.series);
},calculateAxes:function(_5){
this.initializeScalers(_5,this.getSeriesStats());
return this;
},isDirty:function(){
return this.dirty||this._hAxis&&this._hAxis.dirty||this._vAxis&&this._vAxis.dirty;
},isDataDirty:function(){
return dojo.some(this.series,function(_6){
return _6.dirty;
});
},performZoom:function(_7,_8){
var vs=this._vAxis.scale||1,hs=this._hAxis.scale||1,_9=_7.height-_8.b,_a=this._hScaler.bounds,_b=(_a.from-_a.lower)*_a.scale,_c=this._vScaler.bounds,_d=(_c.from-_c.lower)*_c.scale;
rVScale=vs/this.lastWindow.vscale,rHScale=hs/this.lastWindow.hscale,rXOffset=(this.lastWindow.xoffset-_b)/((this.lastWindow.hscale==1)?hs:this.lastWindow.hscale),rYOffset=(_d-this.lastWindow.yoffset)/((this.lastWindow.vscale==1)?vs:this.lastWindow.vscale),shape=this.group,anim=dojox.gfx.fx.animateTransform(dojo.delegate({shape:shape,duration:1200,transform:[{name:"translate",start:[0,0],end:[_8.l*(1-rHScale),_9*(1-rVScale)]},{name:"scale",start:[1,1],end:[rHScale,rVScale]},{name:"original"},{name:"translate",start:[0,0],end:[rXOffset,rYOffset]}]},this.zoom));
dojo.mixin(this.lastWindow,{vscale:vs,hscale:hs,xoffset:_b,yoffset:_d});
this.zoomQueue.push(anim);
dojo.connect(anim,"onEnd",this,function(){
this.zoom=null;
this.zoomQueue.shift();
if(this.zoomQueue.length>0){
this.zoomQueue[0].play();
}
});
if(this.zoomQueue.length==1){
this.zoomQueue[0].play();
}
return this;
},render:function(_e,_f){
return this;
},getRequiredColors:function(){
return this.series.length;
},initializeScalers:function(dim,_10){
if(this._hAxis){
if(!this._hAxis.initialized()){
this._hAxis.calculate(_10.hmin,_10.hmax,dim.width);
}
this._hScaler=this._hAxis.getScaler();
}else{
this._hScaler=dojox.charting.scaler.primitive.buildScaler(_10.hmin,_10.hmax,dim.width);
}
if(this._vAxis){
if(!this._vAxis.initialized()){
this._vAxis.calculate(_10.vmin,_10.vmax,dim.height);
}
this._vScaler=this._vAxis.getScaler();
}else{
this._vScaler=dojox.charting.scaler.primitive.buildScaler(_10.vmin,_10.vmax,dim.height);
}
return this;
}});
}
