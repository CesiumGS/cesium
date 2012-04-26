/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Bubble"]){
dojo._hasResource["dojox.charting.plot2d.Bubble"]=true;
dojo.provide("dojox.charting.plot2d.Bubble");
dojo.require("dojox.charting.plot2d.Base");
dojo.require("dojox.lang.functional");
(function(){
var df=dojox.lang.functional,du=dojox.lang.utils,dc=dojox.charting.plot2d.common,_1=df.lambda("item.purgeGroup()");
dojo.declare("dojox.charting.plot2d.Bubble",dojox.charting.plot2d.Base,{defaultParams:{hAxis:"x",vAxis:"y",animate:null},optionalParams:{stroke:{},outline:{},shadow:{},fill:{},font:"",fontColor:""},constructor:function(_2,_3){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_3);
du.updateWithPattern(this.opt,_3,this.optionalParams);
this.series=[];
this.hAxis=this.opt.hAxis;
this.vAxis=this.opt.vAxis;
this.animate=this.opt.animate;
},render:function(_4,_5){
if(this.zoom&&!this.isDataDirty()){
return this.performZoom(_4,_5);
}
this.resetEvents();
this.dirty=this.isDirty();
if(this.dirty){
dojo.forEach(this.series,_1);
this._eventSeries={};
this.cleanGroup();
var s=this.group;
df.forEachRev(this.series,function(_6){
_6.cleanGroup(s);
});
}
var t=this.chart.theme,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler),_7=this.events();
for(var i=this.series.length-1;i>=0;--i){
var _8=this.series[i];
if(!this.dirty&&!_8.dirty){
t.skip();
this._reconnectEvents(_8.name);
continue;
}
_8.cleanGroup();
if(!_8.data.length){
_8.dirty=false;
t.skip();
continue;
}
if(typeof _8.data[0]=="number"){
console.warn("dojox.charting.plot2d.Bubble: the data in the following series cannot be rendered as a bubble chart; ",_8);
continue;
}
var _9=t.next("circle",[this.opt,_8]),s=_8.group,_a=dojo.map(_8.data,function(v,i){
return v?{x:ht(v.x)+_5.l,y:_4.height-_5.b-vt(v.y),radius:this._vScaler.bounds.scale*(v.size/2)}:null;
},this);
var _b=null,_c=null,_d=null;
if(_9.series.shadow){
_d=dojo.map(_a,function(_e){
if(_e!==null){
var _f=t.addMixin(_9,"circle",_e,true),_10=_f.series.shadow;
var _11=s.createCircle({cx:_e.x+_10.dx,cy:_e.y+_10.dy,r:_e.radius}).setStroke(_10).setFill(_10.color);
if(this.animate){
this._animateBubble(_11,_4.height-_5.b,_e.radius);
}
return _11;
}
return null;
},this);
if(_d.length){
_8.dyn.shadow=_d[_d.length-1].getStroke();
}
}
if(_9.series.outline){
_c=dojo.map(_a,function(_12){
if(_12!==null){
var _13=t.addMixin(_9,"circle",_12,true),_14=dc.makeStroke(_13.series.outline);
_14.width=2*_14.width+_9.series.stroke.width;
var _15=s.createCircle({cx:_12.x,cy:_12.y,r:_12.radius}).setStroke(_14);
if(this.animate){
this._animateBubble(_15,_4.height-_5.b,_12.radius);
}
return _15;
}
return null;
},this);
if(_c.length){
_8.dyn.outline=_c[_c.length-1].getStroke();
}
}
_b=dojo.map(_a,function(_16){
if(_16!==null){
var _17=t.addMixin(_9,"circle",_16,true),_18={x:_16.x-_16.radius,y:_16.y-_16.radius,width:2*_16.radius,height:2*_16.radius};
var _19=this._plotFill(_17.series.fill,_4,_5);
_19=this._shapeFill(_19,_18);
var _1a=s.createCircle({cx:_16.x,cy:_16.y,r:_16.radius}).setFill(_19).setStroke(_17.series.stroke);
if(this.animate){
this._animateBubble(_1a,_4.height-_5.b,_16.radius);
}
return _1a;
}
return null;
},this);
if(_b.length){
_8.dyn.fill=_b[_b.length-1].getFill();
_8.dyn.stroke=_b[_b.length-1].getStroke();
}
if(_7){
var _1b=new Array(_b.length);
dojo.forEach(_b,function(s,i){
if(s!==null){
var o={element:"circle",index:i,run:_8,shape:s,outline:_c&&_c[i]||null,shadow:_d&&_d[i]||null,x:_8.data[i].x,y:_8.data[i].y,r:_8.data[i].size/2,cx:_a[i].x,cy:_a[i].y,cr:_a[i].radius};
this._connectEvents(o);
_1b[i]=o;
}
},this);
this._eventSeries[_8.name]=_1b;
}else{
delete this._eventSeries[_8.name];
}
_8.dirty=false;
}
this.dirty=false;
return this;
},_animateBubble:function(_1c,_1d,_1e){
dojox.gfx.fx.animateTransform(dojo.delegate({shape:_1c,duration:1200,transform:[{name:"translate",start:[0,_1d],end:[0,0]},{name:"scale",start:[0,1/_1e],end:[1,1]},{name:"original"}]},this.animate)).play();
}});
})();
}
