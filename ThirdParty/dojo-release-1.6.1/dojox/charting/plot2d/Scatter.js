/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Scatter"]){
dojo._hasResource["dojox.charting.plot2d.Scatter"]=true;
dojo.provide("dojox.charting.plot2d.Scatter");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d.Base");
dojo.require("dojox.lang.utils");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.reversed");
dojo.require("dojox.gfx.gradutils");
(function(){
var df=dojox.lang.functional,du=dojox.lang.utils,dc=dojox.charting.plot2d.common,_1=df.lambda("item.purgeGroup()");
dojo.declare("dojox.charting.plot2d.Scatter",dojox.charting.plot2d.Base,{defaultParams:{hAxis:"x",vAxis:"y",shadows:null,animate:null},optionalParams:{markerStroke:{},markerOutline:{},markerShadow:{},markerFill:{},markerFont:"",markerFontColor:""},constructor:function(_2,_3){
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
var t=this.chart.theme,_7=this.events();
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
var _9=t.next("marker",[this.opt,_8]),s=_8.group,_a,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler);
if(typeof _8.data[0]=="number"){
_a=dojo.map(_8.data,function(v,i){
return {x:ht(i+1)+_5.l,y:_4.height-_5.b-vt(v)};
},this);
}else{
_a=dojo.map(_8.data,function(v,i){
return {x:ht(v.x)+_5.l,y:_4.height-_5.b-vt(v.y)};
},this);
}
var _b=new Array(_a.length),_c=new Array(_a.length),_d=new Array(_a.length);
dojo.forEach(_a,function(c,i){
var _e=typeof _8.data[i]=="number"?t.post(_9,"marker"):t.addMixin(_9,"marker",_8.data[i],true),_f="M"+c.x+" "+c.y+" "+_e.symbol;
if(_e.marker.shadow){
_b[i]=s.createPath("M"+(c.x+_e.marker.shadow.dx)+" "+(c.y+_e.marker.shadow.dy)+" "+_e.symbol).setStroke(_e.marker.shadow).setFill(_e.marker.shadow.color);
if(this.animate){
this._animateScatter(_b[i],_4.height-_5.b);
}
}
if(_e.marker.outline){
var _10=dc.makeStroke(_e.marker.outline);
_10.width=2*_10.width+_e.marker.stroke.width;
_d[i]=s.createPath(_f).setStroke(_10);
if(this.animate){
this._animateScatter(_d[i],_4.height-_5.b);
}
}
var _11=dc.makeStroke(_e.marker.stroke),_12=this._plotFill(_e.marker.fill,_4,_5);
if(_12&&(_12.type==="linear"||_12.type=="radial")){
var _13=dojox.gfx.gradutils.getColor(_12,{x:c.x,y:c.y});
if(_11){
_11.color=_13;
}
_c[i]=s.createPath(_f).setStroke(_11).setFill(_13);
}else{
_c[i]=s.createPath(_f).setStroke(_11).setFill(_12);
}
if(this.animate){
this._animateScatter(_c[i],_4.height-_5.b);
}
},this);
if(_c.length){
_8.dyn.stroke=_c[_c.length-1].getStroke();
_8.dyn.fill=_c[_c.length-1].getFill();
}
if(_7){
var _14=new Array(_c.length);
dojo.forEach(_c,function(s,i){
var o={element:"marker",index:i,run:_8,shape:s,outline:_d&&_d[i]||null,shadow:_b&&_b[i]||null,cx:_a[i].x,cy:_a[i].y};
if(typeof _8.data[0]=="number"){
o.x=i+1;
o.y=_8.data[i];
}else{
o.x=_8.data[i].x;
o.y=_8.data[i].y;
}
this._connectEvents(o);
_14[i]=o;
},this);
this._eventSeries[_8.name]=_14;
}else{
delete this._eventSeries[_8.name];
}
_8.dirty=false;
}
this.dirty=false;
return this;
},_animateScatter:function(_15,_16){
dojox.gfx.fx.animateTransform(dojo.delegate({shape:_15,duration:1200,transform:[{name:"translate",start:[0,_16],end:[0,0]},{name:"scale",start:[0,0],end:[1,1]},{name:"original"}]},this.animate)).play();
}});
})();
}
