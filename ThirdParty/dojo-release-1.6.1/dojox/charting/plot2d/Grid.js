/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Grid"]){
dojo._hasResource["dojox.charting.plot2d.Grid"]=true;
dojo.provide("dojox.charting.plot2d.Grid");
dojo.require("dojox.charting.Element");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.utils");
(function(){
var du=dojox.lang.utils,dc=dojox.charting.plot2d.common;
dojo.declare("dojox.charting.plot2d.Grid",dojox.charting.Element,{defaultParams:{hAxis:"x",vAxis:"y",hMajorLines:true,hMinorLines:false,vMajorLines:true,vMinorLines:false,hStripes:"none",vStripes:"none",animate:null},optionalParams:{},constructor:function(_1,_2){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_2);
this.hAxis=this.opt.hAxis;
this.vAxis=this.opt.vAxis;
this.dirty=true;
this.animate=this.opt.animate;
this.zoom=null,this.zoomQueue=[];
this.lastWindow={vscale:1,hscale:1,xoffset:0,yoffset:0};
},clear:function(){
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
return this;
},getSeriesStats:function(){
return dojo.delegate(dc.defaultStats);
},initializeScalers:function(){
return this;
},isDirty:function(){
return this.dirty||this._hAxis&&this._hAxis.dirty||this._vAxis&&this._vAxis.dirty;
},performZoom:function(_5,_6){
var vs=this._vAxis.scale||1,hs=this._hAxis.scale||1,_7=_5.height-_6.b,_8=this._hAxis.getScaler().bounds,_9=(_8.from-_8.lower)*_8.scale,_a=this._vAxis.getScaler().bounds,_b=(_a.from-_a.lower)*_a.scale;
rVScale=vs/this.lastWindow.vscale,rHScale=hs/this.lastWindow.hscale,rXOffset=(this.lastWindow.xoffset-_9)/((this.lastWindow.hscale==1)?hs:this.lastWindow.hscale),rYOffset=(_b-this.lastWindow.yoffset)/((this.lastWindow.vscale==1)?vs:this.lastWindow.vscale),shape=this.group,anim=dojox.gfx.fx.animateTransform(dojo.delegate({shape:shape,duration:1200,transform:[{name:"translate",start:[0,0],end:[_6.l*(1-rHScale),_7*(1-rVScale)]},{name:"scale",start:[1,1],end:[rHScale,rVScale]},{name:"original"},{name:"translate",start:[0,0],end:[rXOffset,rYOffset]}]},this.zoom));
dojo.mixin(this.lastWindow,{vscale:vs,hscale:hs,xoffset:_9,yoffset:_b});
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
},getRequiredColors:function(){
return 0;
},render:function(_c,_d){
if(this.zoom){
return this.performZoom(_c,_d);
}
this.dirty=this.isDirty();
if(!this.dirty){
return this;
}
this.cleanGroup();
var s=this.group,ta=this.chart.theme.axis;
try{
var _e=this._vAxis.getScaler(),vt=_e.scaler.getTransformerFromModel(_e),_f=this._vAxis.getTicks();
if(this.opt.hMinorLines){
dojo.forEach(_f.minor,function(_10){
var y=_c.height-_d.b-vt(_10.value);
var _11=s.createLine({x1:_d.l,y1:y,x2:_c.width-_d.r,y2:y}).setStroke(ta.minorTick);
if(this.animate){
this._animateGrid(_11,"h",_d.l,_d.r+_d.l-_c.width);
}
},this);
}
if(this.opt.hMajorLines){
dojo.forEach(_f.major,function(_12){
var y=_c.height-_d.b-vt(_12.value);
var _13=s.createLine({x1:_d.l,y1:y,x2:_c.width-_d.r,y2:y}).setStroke(ta.majorTick);
if(this.animate){
this._animateGrid(_13,"h",_d.l,_d.r+_d.l-_c.width);
}
},this);
}
}
catch(e){
}
try{
var _14=this._hAxis.getScaler(),ht=_14.scaler.getTransformerFromModel(_14),_f=this._hAxis.getTicks();
if(_f&&this.opt.vMinorLines){
dojo.forEach(_f.minor,function(_15){
var x=_d.l+ht(_15.value);
var _16=s.createLine({x1:x,y1:_d.t,x2:x,y2:_c.height-_d.b}).setStroke(ta.minorTick);
if(this.animate){
this._animateGrid(_16,"v",_c.height-_d.b,_c.height-_d.b-_d.t);
}
},this);
}
if(_f&&this.opt.vMajorLines){
dojo.forEach(_f.major,function(_17){
var x=_d.l+ht(_17.value);
var _18=s.createLine({x1:x,y1:_d.t,x2:x,y2:_c.height-_d.b}).setStroke(ta.majorTick);
if(this.animate){
this._animateGrid(_18,"v",_c.height-_d.b,_c.height-_d.b-_d.t);
}
},this);
}
}
catch(e){
}
this.dirty=false;
return this;
},_animateGrid:function(_19,_1a,_1b,_1c){
var _1d=_1a=="h"?[_1b,0]:[0,_1b];
var _1e=_1a=="h"?[1/_1c,1]:[1,1/_1c];
dojox.gfx.fx.animateTransform(dojo.delegate({shape:_19,duration:1200,transform:[{name:"translate",start:_1d,end:[0,0]},{name:"scale",start:_1e,end:[1,1]},{name:"original"}]},this.animate)).play();
}});
})();
}
