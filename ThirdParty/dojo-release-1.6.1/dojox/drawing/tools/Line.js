/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.tools.Line"]){
dojo._hasResource["dojox.drawing.tools.Line"]=true;
dojo.provide("dojox.drawing.tools.Line");
dojox.drawing.tools.Line=dojox.drawing.util.oo.declare(dojox.drawing.stencil.Line,function(){
},{draws:true,showAngle:true,onTransformEnd:function(_1){
this._toggleSelected();
if(this.getRadius()<this.minimumSize){
var p=this.points;
this.setPoints([{x:p[0].x,y:p[0].y},{x:p[0].x,y:p[0].y}]);
}else{
var d=this.data;
var _2={start:{x:d.x1,y:d.y1},x:d.x2,y:d.y2};
var pt=this.util.snapAngle(_2,this.angleSnap/180);
this.setPoints([{x:d.x1,y:d.y1},{x:pt.x,y:pt.y}]);
this._isBeingModified=false;
this.onModify(this);
}
},onDrag:function(_3){
if(this.created){
return;
}
var x1=_3.start.x,y1=_3.start.y,x2=_3.x,y2=_3.y;
if(this.keys.shift){
var pt=this.util.snapAngle(_3,45/180);
x2=pt.x;
y2=pt.y;
}
if(this.keys.alt){
var dx=x2>x1?((x2-x1)/2):((x1-x2)/-2);
var dy=y2>y1?((y2-y1)/2):((y1-y2)/-2);
x1-=dx;
x2-=dx;
y1-=dy;
y2-=dy;
}
this.setPoints([{x:x1,y:y1},{x:x2,y:y2}]);
this.render();
},onUp:function(_4){
if(this.created||!this._downOnCanvas){
return;
}
this._downOnCanvas=false;
if(!this.shape){
var s=_4.start,e=this.minimumSize*4;
this.setPoints([{x:s.x,y:s.y+e},{x:s.x,y:s.y}]);
this.render();
}else{
if(this.getRadius()<this.minimumSize){
this.remove(this.shape,this.hit);
return;
}
}
var pt=this.util.snapAngle(_4,this.angleSnap/180);
var p=this.points;
this.setPoints([{x:p[0].x,y:p[0].y},{x:pt.x,y:pt.y}]);
this.renderedOnce=true;
this.onRender(this);
}});
dojox.drawing.tools.Line.setup={name:"dojox.drawing.tools.Line",tooltip:"Line Tool",iconClass:"iconLine"};
dojox.drawing.register(dojox.drawing.tools.Line.setup,"tool");
}
