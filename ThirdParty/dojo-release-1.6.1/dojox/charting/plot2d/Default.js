/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Default"]){
dojo._hasResource["dojox.charting.plot2d.Default"]=true;
dojo.provide("dojox.charting.plot2d.Default");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d.Base");
dojo.require("dojox.lang.utils");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.reversed");
dojo.require("dojox.gfx.fx");
(function(){
var df=dojox.lang.functional,du=dojox.lang.utils,dc=dojox.charting.plot2d.common,_1=df.lambda("item.purgeGroup()");
var _2=1200;
dojo.declare("dojox.charting.plot2d.Default",dojox.charting.plot2d.Base,{defaultParams:{hAxis:"x",vAxis:"y",lines:true,areas:false,markers:false,tension:"",animate:false},optionalParams:{stroke:{},outline:{},shadow:{},fill:{},font:"",fontColor:"",markerStroke:{},markerOutline:{},markerShadow:{},markerFill:{},markerFont:"",markerFontColor:""},constructor:function(_3,_4){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_4);
du.updateWithPattern(this.opt,_4,this.optionalParams);
this.series=[];
this.hAxis=this.opt.hAxis;
this.vAxis=this.opt.vAxis;
this.animate=this.opt.animate;
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
this.group.setTransform(null);
var s=this.group;
df.forEachRev(this.series,function(_7){
_7.cleanGroup(s);
});
}
var t=this.chart.theme,_8,_9,_a,_b=this.events();
for(var i=this.series.length-1;i>=0;--i){
var _c=this.series[i];
if(!this.dirty&&!_c.dirty){
t.skip();
this._reconnectEvents(_c.name);
continue;
}
_c.cleanGroup();
if(!_c.data.length){
_c.dirty=false;
t.skip();
continue;
}
var _d=t.next(this.opt.areas?"area":"line",[this.opt,_c],true),s=_c.group,_e=[],_f=[],_10=null,_11,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler),_12=this._eventSeries[_c.name]=new Array(_c.data.length);
for(var j=0;j<_c.data.length;j++){
if(_c.data[j]!=null){
if(!_10){
_10=[];
_f.push(j);
_e.push(_10);
}
_10.push(_c.data[j]);
}else{
_10=null;
}
}
for(var seg=0;seg<_e.length;seg++){
if(typeof _e[seg][0]=="number"){
_11=dojo.map(_e[seg],function(v,i){
return {x:ht(i+_f[seg]+1)+_6.l,y:_5.height-_6.b-vt(v)};
},this);
}else{
_11=dojo.map(_e[seg],function(v,i){
return {x:ht(v.x)+_6.l,y:_5.height-_6.b-vt(v.y)};
},this);
}
var _13=this.opt.tension?dc.curve(_11,this.opt.tension):"";
if(this.opt.areas&&_11.length>1){
var _14=_d.series.fill;
var _15=dojo.clone(_11);
if(this.opt.tension){
var _16="L"+_15[_15.length-1].x+","+(_5.height-_6.b)+" L"+_15[0].x+","+(_5.height-_6.b)+" L"+_15[0].x+","+_15[0].y;
_c.dyn.fill=s.createPath(_13+" "+_16).setFill(_14).getFill();
}else{
_15.push({x:_11[_11.length-1].x,y:_5.height-_6.b});
_15.push({x:_11[0].x,y:_5.height-_6.b});
_15.push(_11[0]);
_c.dyn.fill=s.createPolyline(_15).setFill(_14).getFill();
}
}
if(this.opt.lines||this.opt.markers){
_8=_d.series.stroke;
if(_d.series.outline){
_9=_c.dyn.outline=dc.makeStroke(_d.series.outline);
_9.width=2*_9.width+_8.width;
}
}
if(this.opt.markers){
_c.dyn.marker=_d.symbol;
}
var _17=null,_18=null,_19=null;
if(_8&&_d.series.shadow&&_11.length>1){
var _1a=_d.series.shadow,_1b=dojo.map(_11,function(c){
return {x:c.x+_1a.dx,y:c.y+_1a.dy};
});
if(this.opt.lines){
if(this.opt.tension){
_c.dyn.shadow=s.createPath(dc.curve(_1b,this.opt.tension)).setStroke(_1a).getStroke();
}else{
_c.dyn.shadow=s.createPolyline(_1b).setStroke(_1a).getStroke();
}
}
if(this.opt.markers&&_d.marker.shadow){
_1a=_d.marker.shadow;
_19=dojo.map(_1b,function(c){
return s.createPath("M"+c.x+" "+c.y+" "+_d.symbol).setStroke(_1a).setFill(_1a.color);
},this);
}
}
if(this.opt.lines&&_11.length>1){
if(_9){
if(this.opt.tension){
_c.dyn.outline=s.createPath(_13).setStroke(_9).getStroke();
}else{
_c.dyn.outline=s.createPolyline(_11).setStroke(_9).getStroke();
}
}
if(this.opt.tension){
_c.dyn.stroke=s.createPath(_13).setStroke(_8).getStroke();
}else{
_c.dyn.stroke=s.createPolyline(_11).setStroke(_8).getStroke();
}
}
if(this.opt.markers){
_17=new Array(_11.length);
_18=new Array(_11.length);
_9=null;
if(_d.marker.outline){
_9=dc.makeStroke(_d.marker.outline);
_9.width=2*_9.width+(_d.marker.stroke?_d.marker.stroke.width:0);
}
dojo.forEach(_11,function(c,i){
var _1c="M"+c.x+" "+c.y+" "+_d.symbol;
if(_9){
_18[i]=s.createPath(_1c).setStroke(_9);
}
_17[i]=s.createPath(_1c).setStroke(_d.marker.stroke).setFill(_d.marker.fill);
},this);
_c.dyn.markerFill=_d.marker.fill;
_c.dyn.markerStroke=_d.marker.stroke;
if(_b){
dojo.forEach(_17,function(s,i){
var o={element:"marker",index:i+_f[seg],run:_c,shape:s,outline:_18[i]||null,shadow:_19&&_19[i]||null,cx:_11[i].x,cy:_11[i].y};
if(typeof _e[seg][0]=="number"){
o.x=i+_f[seg]+1;
o.y=_e[seg][i];
}else{
o.x=_e[seg][i].x;
o.y=_e[seg][i].y;
}
this._connectEvents(o);
_12[i+_f[seg]]=o;
},this);
}else{
delete this._eventSeries[_c.name];
}
}
}
_c.dirty=false;
}
if(this.animate){
var _1d=this.group;
dojox.gfx.fx.animateTransform(dojo.delegate({shape:_1d,duration:_2,transform:[{name:"translate",start:[0,_5.height-_6.b],end:[0,0]},{name:"scale",start:[1,0],end:[1,1]},{name:"original"}]},this.animate)).play();
}
this.dirty=false;
return this;
}});
})();
}
