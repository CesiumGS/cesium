/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.AnalogGauge"]){
dojo._hasResource["dojox.widget.AnalogGauge"]=true;
dojo.provide("dojox.widget.AnalogGauge");
dojo.require("dojox.gfx");
dojo.require("dojox.widget.gauge._Gauge");
dojo.experimental("dojox.widget.AnalogGauge");
dojo.declare("dojox.widget.gauge.AnalogLineIndicator",[dojox.widget.gauge._Indicator],{_getShapes:function(){
return [this._gauge.surface.createLine({x1:0,y1:-this.offset,x2:0,y2:-this.length-this.offset}).setStroke({color:this.color,width:this.width})];
},draw:function(_1){
if(this.shapes){
this._move(_1);
}else{
if(this.text){
this._gauge.surface.rawNode.removeChild(this.text);
this.text=null;
}
var a=this._gauge._getAngle(Math.min(Math.max(this.value,this._gauge.min),this._gauge.max));
this.color=this.color||"#000000";
this.length=this.length||this._gauge.radius;
this.width=this.width||1;
this.offset=this.offset||0;
this.highlight=this.highlight||"#D0D0D0";
this.shapes=this._getShapes(this._gauge,this);
if(this.shapes){
for(var s=0;s<this.shapes.length;s++){
this.shapes[s].setTransform([{dx:this._gauge.cx,dy:this._gauge.cy},dojox.gfx.matrix.rotateg(a)]);
if(this.hover){
this.shapes[s].getEventSource().setAttribute("hover",this.hover);
}
if(this.onDragMove&&!this.noChange){
this._gauge.connect(this.shapes[s].getEventSource(),"onmousedown",this._gauge.handleMouseDown);
this.shapes[s].getEventSource().style.cursor="pointer";
}
}
}
if(this.label){
var _2=this.length+this.offset,_3=this._gauge._getRadians(a),x=this._gauge.cx+(_2+5)*Math.sin(_3),y=this._gauge.cy-(_2+5)*Math.cos(_3),_4="start",aa=Math.abs(a);
if(a<=-10){
_4="end";
}
if(aa<10){
_4="middle";
}
var _5="bottom";
if(aa>90){
_5="top";
}
this.text=this._gauge.drawText(""+this.label,x,y,_4,_5,this.color,this.font);
}
this.currentValue=this.value;
}
},_move:function(_6){
var v=Math.min(Math.max(this.value,this._gauge.min),this._gauge.max),c=this.currentValue;
if(_6){
var _7=this._gauge._getAngle(v);
for(var i in this.shapes){
this.shapes[i].setTransform([{dx:this._gauge.cx,dy:this._gauge.cy},dojox.gfx.matrix.rotateg(_7)]);
if(this.hover){
this.shapes[i].getEventSource().setAttribute("hover",this.hover);
}
}
}else{
if(c!=v){
var _8=new dojo.Animation({curve:[c,v],duration:this.duration,easing:this.easing});
dojo.connect(_8,"onAnimate",dojo.hitch(this,function(_9){
for(var i in this.shapes){
this.shapes[i].setTransform([{dx:this._gauge.cx,dy:this._gauge.cy},dojox.gfx.matrix.rotateg(this._gauge._getAngle(_9))]);
if(this.hover){
this.shapes[i].getEventSource().setAttribute("hover",this.hover);
}
}
this.currentValue=_9;
}));
_8.play();
}
}
}});
dojo.declare("dojox.widget.AnalogGauge",dojox.widget.gauge._Gauge,{startAngle:-90,endAngle:90,cx:0,cy:0,radius:0,_defaultIndicator:dojox.widget.gauge.AnalogLineIndicator,startup:function(){
if(this.getChildren){
dojo.forEach(this.getChildren(),function(_a){
_a.startup();
});
}
this.startAngle=Number(this.startAngle);
this.endAngle=Number(this.endAngle);
this.cx=Number(this.cx);
if(!this.cx){
this.cx=this.width/2;
}
this.cy=Number(this.cy);
if(!this.cy){
this.cy=this.height/2;
}
this.radius=Number(this.radius);
if(!this.radius){
this.radius=Math.min(this.cx,this.cy)-25;
}
this._oppositeMiddle=(this.startAngle+this.endAngle)/2+180;
this.inherited(arguments);
},_getAngle:function(_b){
return (_b-this.min)/(this.max-this.min)*(this.endAngle-this.startAngle)+this.startAngle;
},_getValueForAngle:function(_c){
if(_c>this._oppositeMiddle){
_c-=360;
}
return (_c-this.startAngle)*(this.max-this.min)/(this.endAngle-this.startAngle)+this.min;
},_getRadians:function(_d){
return _d*Math.PI/180;
},_getDegrees:function(_e){
return _e*180/Math.PI;
},draw:function(){
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
},drawRange:function(_f){
var _10;
if(_f.shape){
this.surface.remove(_f.shape);
_f.shape=null;
}
var a1,a2;
if((_f.low==this.min)&&(_f.high==this.max)&&((this.endAngle-this.startAngle)==360)){
_10=this.surface.createCircle({cx:this.cx,cy:this.cy,r:this.radius});
}else{
a1=this._getRadians(this._getAngle(_f.low));
a2=this._getRadians(this._getAngle(_f.high));
var x1=this.cx+this.radius*Math.sin(a1),y1=this.cy-this.radius*Math.cos(a1),x2=this.cx+this.radius*Math.sin(a2),y2=this.cy-this.radius*Math.cos(a2),big=0;
if((a2-a1)>Math.PI){
big=1;
}
_10=this.surface.createPath();
if(_f.size){
_10.moveTo(this.cx+(this.radius-_f.size)*Math.sin(a1),this.cy-(this.radius-_f.size)*Math.cos(a1));
}else{
_10.moveTo(this.cx,this.cy);
}
_10.lineTo(x1,y1);
_10.arcTo(this.radius,this.radius,0,big,1,x2,y2);
if(_f.size){
_10.lineTo(this.cx+(this.radius-_f.size)*Math.sin(a2),this.cy-(this.radius-_f.size)*Math.cos(a2));
_10.arcTo((this.radius-_f.size),(this.radius-_f.size),0,big,0,this.cx+(this.radius-_f.size)*Math.sin(a1),this.cy-(this.radius-_f.size)*Math.cos(a1));
}
_10.closePath();
}
if(dojo.isArray(_f.color)||dojo.isString(_f.color)){
_10.setStroke({color:_f.color});
_10.setFill(_f.color);
}else{
if(_f.color.type){
a1=this._getRadians(this._getAngle(_f.low));
a2=this._getRadians(this._getAngle(_f.high));
_f.color.x1=this.cx+(this.radius*Math.sin(a1))/2;
_f.color.x2=this.cx+(this.radius*Math.sin(a2))/2;
_f.color.y1=this.cy-(this.radius*Math.cos(a1))/2;
_f.color.y2=this.cy-(this.radius*Math.cos(a2))/2;
_10.setFill(_f.color);
_10.setStroke({color:_f.color.colors[0].color});
}else{
_10.setStroke({color:"green"});
_10.setFill("green");
_10.getEventSource().setAttribute("class",_f.color.style);
}
}
if(_f.hover){
_10.getEventSource().setAttribute("hover",_f.hover);
}
_f.shape=_10;
},getRangeUnderMouse:function(_11){
var _12=null,pos=dojo.coords(this.gaugeContent),x=_11.clientX-pos.x,y=_11.clientY-pos.y,r=Math.sqrt((y-this.cy)*(y-this.cy)+(x-this.cx)*(x-this.cx));
if(r<this.radius){
var _13=this._getDegrees(Math.atan2(y-this.cy,x-this.cx)+Math.PI/2),_14=this._getValueForAngle(_13);
if(this._rangeData){
for(var i=0;(i<this._rangeData.length)&&!_12;i++){
if((Number(this._rangeData[i].low)<=_14)&&(Number(this._rangeData[i].high)>=_14)){
_12=this._rangeData[i];
}
}
}
}
return _12;
},_dragIndicator:function(_15,_16){
var pos=dojo.coords(_15.gaugeContent),x=_16.clientX-pos.x,y=_16.clientY-pos.y,_17=_15._getDegrees(Math.atan2(y-_15.cy,x-_15.cx)+Math.PI/2),_18=_15._getValueForAngle(_17);
_18=Math.min(Math.max(_18,_15.min),_15.max);
_15._drag.value=_15._drag.currentValue=_18;
_15._drag.onDragMove(_15._drag);
_15._drag.draw(true);
dojo.stopEvent(_16);
}});
}
