/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.BarGauge"]){
dojo._hasResource["dojox.widget.BarGauge"]=true;
dojo.provide("dojox.widget.BarGauge");
dojo.require("dojox.gfx");
dojo.require("dojox.widget.gauge._Gauge");
dojo.experimental("dojox.widget.BarGauge");
dojo.declare("dojox.widget.gauge.BarLineIndicator",[dojox.widget.gauge._Indicator],{width:1,_getShapes:function(){
if(!this._gauge){
return null;
}
var v=this.value;
if(v<this._gauge.min){
v=this._gauge.min;
}
if(v>this._gauge.max){
v=this._gauge.max;
}
var _1=this._gauge._getPosition(v);
var _2=[];
if(this.width>1){
_2[0]=this._gauge.surface.createRect({x:_1,y:this._gauge.dataY+this.offset,width:this.width,height:this.length});
_2[0].setStroke({color:this.color});
_2[0].setFill(this.color);
}else{
_2[0]=this._gauge.surface.createLine({x1:_1,y1:this._gauge.dataY+this.offset,x2:_1,y2:this._gauge.dataY+this.offset+this.length});
_2[0].setStroke({color:this.color});
}
return _2;
},draw:function(_3){
var i;
if(this.shapes){
this._move(_3);
}else{
if(this.shapes){
for(i=0;i<this.shapes.length;i++){
this._gauge.surface.remove(this.shapes[i]);
}
this.shapes=null;
}
if(this.text){
this._gauge.surface.rawNode.removeChild(this.text);
this.text=null;
}
this.color=this.color||"#000000";
this.length=this.length||this._gauge.dataHeight;
this.width=this.width||3;
this.offset=this.offset||0;
this.highlight=this.highlight||"#4D4D4D";
this.highlight2=this.highlight2||"#A3A3A3";
this.shapes=this._getShapes(this._gauge,this);
if(this.label){
var v=this.value;
if(v<this._gauge.min){
v=this._gauge.min;
}
if(v>this._gauge.max){
v=this._gauge.max;
}
var _4=this._gauge._getPosition(v);
this.text=this._gauge.drawText(""+this.label,_4,this._gauge.dataY+this.offset-5,"middle","top",this.color,this.font);
}
for(i=0;i<this.shapes.length;i++){
if(this.hover){
this.shapes[i].getEventSource().setAttribute("hover",this.hover);
}
if(this.onDragMove&&!this.noChange){
this._gauge.connect(this.shapes[i].getEventSource(),"onmousedown",this._gauge.handleMouseDown);
this.shapes[i].getEventSource().style.cursor="pointer";
}
}
this.currentValue=this.value;
}
},_move:function(_5){
var v=this.value;
if(v<this.min){
v=this.min;
}
if(v>this.max){
v=this.max;
}
var c=this._gauge._getPosition(this.currentValue);
this.currentValue=v;
v=this._gauge._getPosition(v)-this._gauge.dataX;
if(_5){
this.shapes[0].applyTransform(dojox.gfx.matrix.translate(v-(this.shapes[0].matrix?this.shapes[0].matrix.dx:0),0));
}else{
var _6=new dojo.Animation({curve:[c,v],duration:this.duration,easing:this.easing});
dojo.connect(_6,"onAnimate",dojo.hitch(this,function(_7){
this.shapes[0].applyTransform(dojox.gfx.matrix.translate(_7-(this.shapes[0].matrix?this.shapes[0].matrix.dx:0),0));
}));
_6.play();
}
}});
dojo.declare("dojox.widget.BarGauge",dojox.widget.gauge._Gauge,{dataX:5,dataY:5,dataWidth:0,dataHeight:0,_defaultIndicator:dojox.widget.gauge.BarLineIndicator,startup:function(){
if(this.getChildren){
dojo.forEach(this.getChildren(),function(_8){
_8.startup();
});
}
if(!this.dataWidth){
this.dataWidth=this.gaugeWidth-10;
}
if(!this.dataHeight){
this.dataHeight=this.gaugeHeight-10;
}
this.inherited(arguments);
},_getPosition:function(_9){
return this.dataX+Math.floor((_9-this.min)/(this.max-this.min)*this.dataWidth);
},_getValueForPosition:function(_a){
return (_a-this.dataX)*(this.max-this.min)/this.dataWidth+this.min;
},draw:function(){
if(!this.surface){
this.createSurface();
}
var i;
if(this._rangeData){
for(i=0;i<this._rangeData.length;i++){
this.drawRange(this._rangeData[i]);
}
if(this._img&&this.image.overlay){
this._img.moveToFront();
}
}
if(this._indicatorData){
for(i=0;i<this._indicatorData.length;i++){
this._indicatorData[i].draw();
}
}
},drawRange:function(_b){
if(_b.shape){
this.surface.remove(_b.shape);
_b.shape=null;
}
var x1=this._getPosition(_b.low);
var x2=this._getPosition(_b.high);
var _c=this.surface.createRect({x:x1,y:this.dataY,width:x2-x1,height:this.dataHeight});
if(dojo.isArray(_b.color)||dojo.isString(_b.color)){
_c.setStroke({color:_b.color});
_c.setFill(_b.color);
}else{
if(_b.color.type){
var y=this.dataY+this.dataHeight/2;
_b.color.x1=x1;
_b.color.x2=x2;
_b.color.y1=y;
_b.color.y2=y;
_c.setFill(_b.color);
_c.setStroke({color:_b.color.colors[0].color});
}else{
_c.setStroke({color:"green"});
_c.setFill("green");
_c.getEventSource().setAttribute("class",_b.color.style);
}
}
if(_b.hover){
_c.getEventSource().setAttribute("hover",_b.hover);
}
_b.shape=_c;
},getRangeUnderMouse:function(_d){
var _e=null;
var _f=dojo.coords(this.gaugeContent);
var x=_d.clientX-_f.x;
var _10=this._getValueForPosition(x);
if(this._rangeData){
for(var i=0;(i<this._rangeData.length)&&!_e;i++){
if((Number(this._rangeData[i].low)<=_10)&&(Number(this._rangeData[i].high)>=_10)){
_e=this._rangeData[i];
}
}
}
return _e;
},_dragIndicator:function(_11,_12){
var pos=dojo.coords(_11.gaugeContent);
var x=_12.clientX-pos.x;
var _13=_11._getValueForPosition(x);
if(_13<_11.min){
_13=_11.min;
}
if(_13>_11.max){
_13=_11.max;
}
_11._drag.value=_13;
_11._drag.onDragMove(_11._drag);
_11._drag.draw(true);
dojo.stopEvent(_12);
}});
}
