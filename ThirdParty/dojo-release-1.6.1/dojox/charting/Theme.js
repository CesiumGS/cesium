/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.Theme"]){
dojo._hasResource["dojox.charting.Theme"]=true;
dojo.provide("dojox.charting.Theme");
dojo.require("dojox.color");
dojo.require("dojox.color.Palette");
dojo.require("dojox.lang.utils");
dojo.require("dojox.gfx.gradutils");
dojo.declare("dojox.charting.Theme",null,{shapeSpaces:{shape:1,shapeX:1,shapeY:1},constructor:function(_1){
_1=_1||{};
var _2=dojox.charting.Theme.defaultTheme;
dojo.forEach(["chart","plotarea","axis","series","marker"],function(_3){
this[_3]=dojo.delegate(_2[_3],_1[_3]);
},this);
if(_1.seriesThemes&&_1.seriesThemes.length){
this.colors=null;
this.seriesThemes=_1.seriesThemes.slice(0);
}else{
this.seriesThemes=null;
this.colors=(_1.colors||dojox.charting.Theme.defaultColors).slice(0);
}
this.markerThemes=null;
if(_1.markerThemes&&_1.markerThemes.length){
this.markerThemes=_1.markerThemes.slice(0);
}
this.markers=_1.markers?dojo.clone(_1.markers):dojo.delegate(dojox.charting.Theme.defaultMarkers);
this.noGradConv=_1.noGradConv;
this.noRadialConv=_1.noRadialConv;
if(_1.reverseFills){
this.reverseFills();
}
this._current=0;
this._buildMarkerArray();
},clone:function(){
var _4=new dojox.charting.Theme({chart:this.chart,plotarea:this.plotarea,axis:this.axis,series:this.series,marker:this.marker,colors:this.colors,markers:this.markers,seriesThemes:this.seriesThemes,markerThemes:this.markerThemes,noGradConv:this.noGradConv,noRadialConv:this.noRadialConv});
dojo.forEach(["clone","clear","next","skip","addMixin","post","getTick"],function(_5){
if(this.hasOwnProperty(_5)){
_4[_5]=this[_5];
}
},this);
return _4;
},clear:function(){
this._current=0;
},next:function(_6,_7,_8){
var _9=dojox.lang.utils.merge,_a,_b;
if(this.colors){
_a=dojo.delegate(this.series);
_b=dojo.delegate(this.marker);
var _c=new dojo.Color(this.colors[this._current%this.colors.length]),_d;
if(_a.stroke&&_a.stroke.color){
_a.stroke=dojo.delegate(_a.stroke);
_d=new dojo.Color(_a.stroke.color);
_a.stroke.color=new dojo.Color(_c);
_a.stroke.color.a=_d.a;
}else{
_a.stroke={color:_c};
}
if(_b.stroke&&_b.stroke.color){
_b.stroke=dojo.delegate(_b.stroke);
_d=new dojo.Color(_b.stroke.color);
_b.stroke.color=new dojo.Color(_c);
_b.stroke.color.a=_d.a;
}else{
_b.stroke={color:_c};
}
if(!_a.fill||_a.fill.type){
_a.fill=_c;
}else{
_d=new dojo.Color(_a.fill);
_a.fill=new dojo.Color(_c);
_a.fill.a=_d.a;
}
if(!_b.fill||_b.fill.type){
_b.fill=_c;
}else{
_d=new dojo.Color(_b.fill);
_b.fill=new dojo.Color(_c);
_b.fill.a=_d.a;
}
}else{
_a=this.seriesThemes?_9(this.series,this.seriesThemes[this._current%this.seriesThemes.length]):this.series;
_b=this.markerThemes?_9(this.marker,this.markerThemes[this._current%this.markerThemes.length]):_a;
}
var _e=_b&&_b.symbol||this._markers[this._current%this._markers.length];
var _f={series:_a,marker:_b,symbol:_e};
++this._current;
if(_7){
_f=this.addMixin(_f,_6,_7);
}
if(_8){
_f=this.post(_f,_6);
}
return _f;
},skip:function(){
++this._current;
},addMixin:function(_10,_11,_12,_13){
if(dojo.isArray(_12)){
dojo.forEach(_12,function(m){
_10=this.addMixin(_10,_11,m);
},this);
}else{
var t={};
if("color" in _12){
if(_11=="line"||_11=="area"){
dojo.setObject("series.stroke.color",_12.color,t);
dojo.setObject("marker.stroke.color",_12.color,t);
}else{
dojo.setObject("series.fill",_12.color,t);
}
}
dojo.forEach(["stroke","outline","shadow","fill","font","fontColor","labelWiring"],function(_14){
var _15="marker"+_14.charAt(0).toUpperCase()+_14.substr(1),b=_15 in _12;
if(_14 in _12){
dojo.setObject("series."+_14,_12[_14],t);
if(!b){
dojo.setObject("marker."+_14,_12[_14],t);
}
}
if(b){
dojo.setObject("marker."+_14,_12[_15],t);
}
});
if("marker" in _12){
t.symbol=_12.marker;
}
_10=dojox.lang.utils.merge(_10,t);
}
if(_13){
_10=this.post(_10,_11);
}
return _10;
},post:function(_16,_17){
var _18=_16.series.fill,t;
if(!this.noGradConv&&this.shapeSpaces[_18.space]&&_18.type=="linear"){
if(_17=="bar"){
t={x1:_18.y1,y1:_18.x1,x2:_18.y2,y2:_18.x2};
}else{
if(!this.noRadialConv&&_18.space=="shape"&&(_17=="slice"||_17=="circle")){
t={type:"radial",cx:0,cy:0,r:100};
}
}
if(t){
return dojox.lang.utils.merge(_16,{series:{fill:t}});
}
}
return _16;
},getTick:function(_19,_1a){
var _1b=this.axis.tick,_1c=_19+"Tick";
merge=dojox.lang.utils.merge;
if(_1b){
if(this.axis[_1c]){
_1b=merge(_1b,this.axis[_1c]);
}
}else{
_1b=this.axis[_1c];
}
if(_1a){
if(_1b){
if(_1a[_1c]){
_1b=merge(_1b,_1a[_1c]);
}
}else{
_1b=_1a[_1c];
}
}
return _1b;
},inspectObjects:function(f){
dojo.forEach(["chart","plotarea","axis","series","marker"],function(_1d){
f(this[_1d]);
},this);
if(this.seriesThemes){
dojo.forEach(this.seriesThemes,f);
}
if(this.markerThemes){
dojo.forEach(this.markerThemes,f);
}
},reverseFills:function(){
this.inspectObjects(function(o){
if(o&&o.fill){
o.fill=dojox.gfx.gradutils.reverse(o.fill);
}
});
},addMarker:function(_1e,_1f){
this.markers[_1e]=_1f;
this._buildMarkerArray();
},setMarkers:function(obj){
this.markers=obj;
this._buildMarkerArray();
},_buildMarkerArray:function(){
this._markers=[];
for(var p in this.markers){
this._markers.push(this.markers[p]);
}
}});
dojo.mixin(dojox.charting.Theme,{defaultMarkers:{CIRCLE:"m-3,0 c0,-4 6,-4 6,0 m-6,0 c0,4 6,4 6,0",SQUARE:"m-3,-3 l0,6 6,0 0,-6 z",DIAMOND:"m0,-3 l3,3 -3,3 -3,-3 z",CROSS:"m0,-3 l0,6 m-3,-3 l6,0",X:"m-3,-3 l6,6 m0,-6 l-6,6",TRIANGLE:"m-3,3 l3,-6 3,6 z",TRIANGLE_INVERTED:"m-3,-3 l3,6 3,-6 z"},defaultColors:["#54544c","#858e94","#6e767a","#948585","#474747"],defaultTheme:{chart:{stroke:null,fill:"white",pageStyle:null,titleGap:20,titlePos:"top",titleFont:"normal normal bold 14pt Tahoma",titleFontColor:"#333"},plotarea:{stroke:null,fill:"white"},axis:{stroke:{color:"#333",width:1},tick:{color:"#666",position:"center",font:"normal normal normal 7pt Tahoma",fontColor:"#333",titleGap:15,titleFont:"normal normal normal 11pt Tahoma",titleFontColor:"#333",titleOrientation:"axis"},majorTick:{width:1,length:6},minorTick:{width:0.8,length:3},microTick:{width:0.5,length:1}},series:{stroke:{width:1.5,color:"#333"},outline:{width:0.1,color:"#ccc"},shadow:null,fill:"#ccc",font:"normal normal normal 8pt Tahoma",fontColor:"#000",labelWiring:{width:1,color:"#ccc"}},marker:{stroke:{width:1.5,color:"#333"},outline:{width:0.1,color:"#ccc"},shadow:null,fill:"#ccc",font:"normal normal normal 8pt Tahoma",fontColor:"#000"}},defineColors:function(_20){
_20=_20||{};
var c=[],n=_20.num||5;
if(_20.colors){
var l=_20.colors.length;
for(var i=0;i<n;i++){
c.push(_20.colors[i%l]);
}
return c;
}
if(_20.hue){
var s=_20.saturation||100;
var st=_20.low||30;
var end=_20.high||90;
var l=(end+st)/2;
return dojox.color.Palette.generate(dojox.color.fromHsv(_20.hue,s,l),"monochromatic").colors;
}
if(_20.generator){
return dojox.color.Palette.generate(_20.base,_20.generator).colors;
}
return c;
},generateGradient:function(_21,_22,_23){
var _24=dojo.delegate(_21);
_24.colors=[{offset:0,color:_22},{offset:1,color:_23}];
return _24;
},generateHslColor:function(_25,_26){
_25=new dojox.color.Color(_25);
var hsl=_25.toHsl(),_27=dojox.color.fromHsl(hsl.h,hsl.s,_26);
_27.a=_25.a;
return _27;
},generateHslGradient:function(_28,_29,_2a,_2b){
_28=new dojox.color.Color(_28);
var hsl=_28.toHsl(),_2c=dojox.color.fromHsl(hsl.h,hsl.s,_2a),_2d=dojox.color.fromHsl(hsl.h,hsl.s,_2b);
_2c.a=_2d.a=_28.a;
return dojox.charting.Theme.generateGradient(_29,_2c,_2d);
}});
}
