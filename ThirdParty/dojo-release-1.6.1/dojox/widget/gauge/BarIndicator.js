/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.gauge.BarIndicator"]){
dojo._hasResource["dojox.widget.gauge.BarIndicator"]=true;
dojo.provide("dojox.widget.gauge.BarIndicator");
dojo.require("dojox.widget.BarGauge");
dojo.experimental("dojox.widget.gauge.BarIndicator");
dojo.declare("dojox.widget.gauge.BarIndicator",[dojox.widget.gauge.BarLineIndicator],{_getShapes:function(){
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
if(_1==this.dataX){
_1=this.dataX+1;
}
var y=this._gauge.dataY+Math.floor((this._gauge.dataHeight-this.width)/2)+this.offset;
var _2=[];
_2[0]=this._gauge.surface.createRect({x:this._gauge.dataX,y:y,width:_1-this._gauge.dataX,height:this.width});
_2[0].setStroke({color:this.color});
_2[0].setFill(this.color);
_2[1]=this._gauge.surface.createLine({x1:this._gauge.dataX,y1:y,x2:_1,y2:y});
_2[1].setStroke({color:this.highlight});
if(this.highlight2){
y--;
_2[2]=this._gauge.surface.createLine({x1:this._gauge.dataX,y1:y,x2:_1,y2:y});
_2[2].setStroke({color:this.highlight2});
}
return _2;
},_createShapes:function(_3){
for(var i in this.shapes){
i=this.shapes[i];
var _4={};
for(var j in i){
_4[j]=i[j];
}
if(i.shape.type=="line"){
_4.shape.x2=_3+_4.shape.x1;
}else{
if(i.shape.type=="rect"){
_4.width=_3;
}
}
i.setShape(_4);
}
},_move:function(_5){
var _6=false;
var c;
var v=this.value;
if(v<this.min){
v=this.min;
}
if(v>this.max){
v=this.max;
}
c=this._gauge._getPosition(this.currentValue);
this.currentValue=v;
v=this._gauge._getPosition(v)-this._gauge.dataX;
if(_5){
this._createShapes(v);
}else{
if(c!=v){
var _7=new dojo.Animation({curve:[c,v],duration:this.duration,easing:this.easing});
dojo.connect(_7,"onAnimate",dojo.hitch(this,this._createShapes));
_7.play();
}
}
}});
}
