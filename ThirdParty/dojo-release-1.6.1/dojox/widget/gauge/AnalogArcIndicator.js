/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.gauge.AnalogArcIndicator"]){
dojo._hasResource["dojox.widget.gauge.AnalogArcIndicator"]=true;
dojo.provide("dojox.widget.gauge.AnalogArcIndicator");
dojo.require("dojox.widget.AnalogGauge");
dojo.experimental("dojox.widget.gauge.AnalogArcIndicator");
dojo.declare("dojox.widget.gauge.AnalogArcIndicator",[dojox.widget.gauge.AnalogLineIndicator],{_createArc:function(_1){
if(this.shapes[0]){
var a=this._gauge._getRadians(this._gauge._getAngle(_1));
var _2=Math.cos(a);
var _3=Math.sin(a);
var sa=this._gauge._getRadians(this._gauge.startAngle);
var _4=Math.cos(sa);
var _5=Math.sin(sa);
var _6=this.offset+this.width;
var p=["M"];
p.push(this._gauge.cx+this.offset*_5);
p.push(this._gauge.cy-this.offset*_4);
p.push("A",this.offset,this.offset,0,((a-sa)>Math.PI)?1:0,1);
p.push(this._gauge.cx+this.offset*_3);
p.push(this._gauge.cy-this.offset*_2);
p.push("L");
p.push(this._gauge.cx+_6*_3);
p.push(this._gauge.cy-_6*_2);
p.push("A",_6,_6,0,((a-sa)>Math.PI)?1:0,0);
p.push(this._gauge.cx+_6*_5);
p.push(this._gauge.cy-_6*_4);
this.shapes[0].setShape(p.join(" "));
this.currentValue=_1;
}
},draw:function(_7){
var v=this.value;
if(v<this._gauge.min){
v=this._gauge.min;
}
if(v>this._gauge.max){
v=this._gauge.max;
}
if(this.shapes){
if(_7){
this._createArc(v);
}else{
var _8=new dojo.Animation({curve:[this.currentValue,v],duration:this.duration,easing:this.easing});
dojo.connect(_8,"onAnimate",dojo.hitch(this,this._createArc));
_8.play();
}
}else{
var _9={color:this.color,width:1};
if(this.color.type){
_9.color=this.color.colors[0].color;
}
this.shapes=[this._gauge.surface.createPath().setStroke(_9).setFill(this.color)];
this._createArc(v);
if(this.hover){
this.shapes[0].getEventSource().setAttribute("hover",this.hover);
}
if(this.onDragMove&&!this.noChange){
this._gauge.connect(this.shapes[0].getEventSource(),"onmousedown",this._gauge.handleMouseDown);
this.shapes[0].getEventSource().style.cursor="pointer";
}
}
}});
}
