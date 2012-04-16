/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.tools.custom.Vector"]){
dojo._hasResource["dojox.drawing.tools.custom.Vector"]=true;
dojo.provide("dojox.drawing.tools.custom.Vector");
dojo.require("dojox.drawing.tools.Arrow");
dojo.require("dojox.drawing.util.positioning");
dojox.drawing.tools.custom.Vector=dojox.drawing.util.oo.declare(dojox.drawing.tools.Arrow,function(_1){
this.minimumSize=this.style.arrows.length;
this.addShadow({size:3,mult:2});
},{draws:true,type:"dojox.drawing.tools.custom.Vector",minimumSize:30,showAngle:true,changeAxis:function(_2){
_2=_2!==undefined?_2:this.style.zAxis?0:1;
if(_2==0){
this.style.zAxis=false;
this.data.cosphi=0;
}else{
this.style.zAxis=true;
var p=this.points;
var pt=this.zPoint();
this.setPoints([{x:p[0].x,y:p[0].y},{x:pt.x,y:pt.y}]);
}
this.render();
},_createZeroVector:function(_3,d,_4){
var s=_3=="hit"?this.minimumSize:this.minimumSize/6;
var f=_3=="hit"?_4.fill:null;
d={cx:this.data.x1,cy:this.data.y1,rx:s,ry:s};
this.remove(this[_3]);
this[_3]=this.container.createEllipse(d).setStroke(_4).setFill(f);
this.util.attr(this[_3],"drawingType","stencil");
},_create:function(_5,d,_6){
this.remove(this[_5]);
this[_5]=this.container.createLine(d).setStroke(_6);
this._setNodeAtts(this[_5]);
},onDrag:function(_7){
if(this.created){
return;
}
var x1=_7.start.x,y1=_7.start.y,x2=_7.x,y2=_7.y;
if(this.keys.shift&&!this.style.zAxis){
var pt=this.util.snapAngle(_7,45/180);
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
if(this.style.zAxis){
var _8=this.zPoint(_7);
x2=_8.x;
y2=_8.y;
}
this.setPoints([{x:x1,y:y1},{x:x2,y:y2}]);
this.render();
},onTransform:function(_9){
if(!this._isBeingModified){
this.onTransformBegin();
}
this.setPoints(this.points);
this.render();
},anchorConstrain:function(x,y){
if(!this.style.zAxis){
return null;
}
var _a=this.style.zAngle*Math.PI/180;
var _b=x<0?x>-y:x<-y;
var dx=_b?x:-y/Math.tan(_a);
var dy=!_b?y:-Math.tan(_a)*x;
return {x:dx,y:dy};
},zPoint:function(_c){
if(_c===undefined){
if(!this.points[0]){
return null;
}
var d=this.pointsToData();
_c={start:{x:d.x1,y:d.y1},x:d.x2,y:d.y2};
}
var _d=this.util.length(_c);
var _e=this.util.angle(_c);
_e<0?_e=360+_e:_e;
_e=_e>135&&_e<315?this.style.zAngle:this.util.oppAngle(this.style.zAngle);
return this.util.pointOnCircle(_c.start.x,_c.start.y,_d,_e);
},pointsToData:function(p){
p=p||this.points;
var _f=0;
var obj={start:{x:p[0].x,y:p[0].y},x:p[1].x,y:p[1].y};
if(this.style.zAxis&&(this.util.length(obj)>this.minimumSize)){
var _10=this.util.angle(obj);
_10<0?_10=360+_10:_10;
_f=_10>135&&_10<315?1:-1;
}
this.data={x1:p[0].x,y1:p[0].y,x2:p[1].x,y2:p[1].y,cosphi:_f};
return this.data;
},dataToPoints:function(o){
o=o||this.data;
if(o.radius||o.angle){
var _11=0;
var pt=this.util.pointOnCircle(o.x,o.y,o.radius,o.angle);
if(this.style.zAxis||(o.cosphi&&o.cosphi!=0)){
this.style.zAxis=true;
_11=o.angle>135&&o.angle<315?1:-1;
}
this.data=o={x1:o.x,y1:o.y,x2:pt.x,y2:pt.y,cosphi:_11};
}
this.points=[{x:o.x1,y:o.y1},{x:o.x2,y:o.y2}];
return this.points;
},render:function(){
this.onBeforeRender(this);
if(this.getRadius()>=this.minimumSize){
this._create("hit",this.data,this.style.currentHit);
this._create("shape",this.data,this.style.current);
}else{
this.data.cosphi=0;
this._createZeroVector("hit",this.data,this.style.currentHit);
this._createZeroVector("shape",this.data,this.style.current);
}
},onUp:function(obj){
if(this.created||!this._downOnCanvas){
return;
}
this._downOnCanvas=false;
if(!this.shape){
var d=100;
obj.start.x=this.style.zAxis?obj.start.x+d:obj.start.x;
obj.y=obj.y+d;
this.setPoints([{x:obj.start.x,y:obj.start.y},{x:obj.x,y:obj.y}]);
this.render();
}
if(this.getRadius()<this.minimumSize){
var p=this.points;
this.setPoints([{x:p[0].x,y:p[0].y},{x:p[0].x,y:p[0].y}]);
}else{
var p=this.points;
var pt=this.style.zAxis?this.zPoint(obj):this.util.snapAngle(obj,this.angleSnap/180);
this.setPoints([{x:p[0].x,y:p[0].y},{x:pt.x,y:pt.y}]);
}
this.renderedOnce=true;
this.onRender(this);
}});
dojox.drawing.tools.custom.Vector.setup={name:"dojox.drawing.tools.custom.Vector",tooltip:"Vector Tool",iconClass:"iconVector"};
if(dojox.drawing.defaults.zAxisEnabled){
dojox.drawing.tools.custom.Vector.setup.secondary={name:"vectorSecondary",label:"z-axis",funct:function(_12){
_12.selected?this.zDeselect(_12):this.zSelect(_12);
var _13=this.drawing.stencils.selectedStencils;
for(var nm in _13){
if(_13[nm].shortType=="vector"&&(_13[nm].style.zAxis!=dojox.drawing.defaults.zAxis)){
var s=_13[nm];
s.changeAxis();
if(s.style.zAxis){
s.deselect();
s.select();
}
}
}
},setup:function(){
var _14=dojox.drawing.defaults.zAxis;
this.zSelect=function(_15){
if(!_15.enabled){
return;
}
_14=true;
dojox.drawing.defaults.zAxis=true;
_15.select();
this.vectorTest();
this.zSelected=_15;
};
this.zDeselect=function(_16){
if(!_16.enabled){
return;
}
_14=false;
dojox.drawing.defaults.zAxis=false;
_16.deselect();
this.vectorTest();
this.zSelected=null;
};
this.vectorTest=function(){
dojo.forEach(this.buttons,function(b){
if(b.toolType=="vector"&&b.selected){
this.drawing.currentStencil.style.zAxis=_14;
}
},this);
};
dojo.connect(this,"onRenderStencil",this,function(){
if(this.zSelected){
this.zDeselect(this.zSelected);
}
});
var c=dojo.connect(this.drawing,"onSurfaceReady",this,function(){
dojo.disconnect(c);
dojo.connect(this.drawing.stencils,"onSelect",this,function(_17){
if(_17.shortType=="vector"){
if(_17.style.zAxis){
dojo.forEach(this.buttons,function(b){
if(b.toolType=="vectorSecondary"){
this.zSelect(b);
}
},this);
}else{
dojo.forEach(this.buttons,function(b){
if(b.toolType=="vectorSecondary"){
this.zDeselect(b);
}
},this);
}
}
});
});
},postSetup:function(btn){
dojo.connect(btn,"enable",function(){
dojox.drawing.defaults.zAxisEnabled=true;
});
dojo.connect(btn,"disable",function(){
dojox.drawing.defaults.zAxisEnabled=false;
});
}};
}
dojox.drawing.register(dojox.drawing.tools.custom.Vector.setup,"tool");
}
