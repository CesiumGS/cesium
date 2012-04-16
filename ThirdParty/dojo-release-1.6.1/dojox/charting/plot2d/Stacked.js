/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Stacked"]){
dojo._hasResource["dojox.charting.plot2d.Stacked"]=true;
dojo.provide("dojox.charting.plot2d.Stacked");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d.Default");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.sequence");
dojo.require("dojox.lang.functional.reversed");
(function(){
var df=dojox.lang.functional,dc=dojox.charting.plot2d.common,_1=df.lambda("item.purgeGroup()");
dojo.declare("dojox.charting.plot2d.Stacked",dojox.charting.plot2d.Default,{getSeriesStats:function(){
var _2=dc.collectStackedStats(this.series);
this._maxRunLength=_2.hmax;
return _2;
},render:function(_3,_4){
if(this._maxRunLength<=0){
return this;
}
var _5=df.repeat(this._maxRunLength,"-> 0",0);
for(var i=0;i<this.series.length;++i){
var _6=this.series[i];
for(var j=0;j<_6.data.length;++j){
var v=_6.data[j];
if(v!==null){
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
df.forEachRev(this.series,function(_7){
_7.cleanGroup(s);
});
}
var t=this.chart.theme,_8=this.events(),ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler);
for(var i=this.series.length-1;i>=0;--i){
var _6=this.series[i];
if(!this.dirty&&!_6.dirty){
t.skip();
this._reconnectEvents(_6.name);
continue;
}
_6.cleanGroup();
var _9=t.next(this.opt.areas?"area":"line",[this.opt,_6],true),s=_6.group,_a,_b=dojo.map(_5,function(v,i){
return {x:ht(i+1)+_4.l,y:_3.height-_4.b-vt(v)};
},this);
var _c=this.opt.tension?dc.curve(_b,this.opt.tension):"";
if(this.opt.areas){
var _d=dojo.clone(_b);
if(this.opt.tension){
var p=dc.curve(_d,this.opt.tension);
p+=" L"+_b[_b.length-1].x+","+(_3.height-_4.b)+" L"+_b[0].x+","+(_3.height-_4.b)+" L"+_b[0].x+","+_b[0].y;
_6.dyn.fill=s.createPath(p).setFill(_9.series.fill).getFill();
}else{
_d.push({x:_b[_b.length-1].x,y:_3.height-_4.b});
_d.push({x:_b[0].x,y:_3.height-_4.b});
_d.push(_b[0]);
_6.dyn.fill=s.createPolyline(_d).setFill(_9.series.fill).getFill();
}
}
if(this.opt.lines||this.opt.markers){
if(_9.series.outline){
_a=dc.makeStroke(_9.series.outline);
_a.width=2*_a.width+_9.series.stroke.width;
}
}
if(this.opt.markers){
_6.dyn.marker=_9.symbol;
}
var _e,_f,_10;
if(_9.series.shadow&&_9.series.stroke){
var _11=_9.series.shadow,_12=dojo.map(_b,function(c){
return {x:c.x+_11.dx,y:c.y+_11.dy};
});
if(this.opt.lines){
if(this.opt.tension){
_6.dyn.shadow=s.createPath(dc.curve(_12,this.opt.tension)).setStroke(_11).getStroke();
}else{
_6.dyn.shadow=s.createPolyline(_12).setStroke(_11).getStroke();
}
}
if(this.opt.markers){
_11=_9.marker.shadow;
_10=dojo.map(_12,function(c){
return s.createPath("M"+c.x+" "+c.y+" "+_9.symbol).setStroke(_11).setFill(_11.color);
},this);
}
}
if(this.opt.lines){
if(_a){
if(this.opt.tension){
_6.dyn.outline=s.createPath(_c).setStroke(_a).getStroke();
}else{
_6.dyn.outline=s.createPolyline(_b).setStroke(_a).getStroke();
}
}
if(this.opt.tension){
_6.dyn.stroke=s.createPath(_c).setStroke(_9.series.stroke).getStroke();
}else{
_6.dyn.stroke=s.createPolyline(_b).setStroke(_9.series.stroke).getStroke();
}
}
if(this.opt.markers){
_e=new Array(_b.length);
_f=new Array(_b.length);
_a=null;
if(_9.marker.outline){
_a=dc.makeStroke(_9.marker.outline);
_a.width=2*_a.width+(_9.marker.stroke?_9.marker.stroke.width:0);
}
dojo.forEach(_b,function(c,i){
var _13="M"+c.x+" "+c.y+" "+_9.symbol;
if(_a){
_f[i]=s.createPath(_13).setStroke(_a);
}
_e[i]=s.createPath(_13).setStroke(_9.marker.stroke).setFill(_9.marker.fill);
},this);
if(_8){
var _14=new Array(_e.length);
dojo.forEach(_e,function(s,i){
var o={element:"marker",index:i,run:_6,shape:s,outline:_f[i]||null,shadow:_10&&_10[i]||null,cx:_b[i].x,cy:_b[i].y,x:i+1,y:_6.data[i]};
this._connectEvents(o);
_14[i]=o;
},this);
this._eventSeries[_6.name]=_14;
}else{
delete this._eventSeries[_6.name];
}
}
_6.dirty=false;
for(var j=0;j<_6.data.length;++j){
var v=_6.data[j];
if(v!==null){
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
