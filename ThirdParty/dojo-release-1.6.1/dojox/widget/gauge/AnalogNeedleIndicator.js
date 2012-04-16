/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.gauge.AnalogNeedleIndicator"]){
dojo._hasResource["dojox.widget.gauge.AnalogNeedleIndicator"]=true;
dojo.provide("dojox.widget.gauge.AnalogNeedleIndicator");
dojo.require("dojox.widget.AnalogGauge");
dojo.experimental("dojox.widget.gauge.AnalogNeedleIndicator");
dojo.declare("dojox.widget.gauge.AnalogNeedleIndicator",[dojox.widget.gauge.AnalogLineIndicator],{_getShapes:function(){
if(!this._gauge){
return null;
}
var x=Math.floor(this.width/2);
var _1=this.width*5;
var _2=(this.width&1);
var _3=[];
var _4={color:this.color,width:1};
if(this.color.type){
_4.color=this.color.colors[0].color;
}
var xy=(Math.sqrt(2)*(x));
_3[0]=this._gauge.surface.createPath().setStroke(_4).setFill(this.color).moveTo(xy,-xy).arcTo((2*x),(2*x),0,0,0,-xy,-xy).lineTo(0,-this.length).closePath();
_3[1]=this._gauge.surface.createCircle({cx:0,cy:0,r:this.width}).setStroke({color:this.color}).setFill(this.color);
return _3;
}});
}
