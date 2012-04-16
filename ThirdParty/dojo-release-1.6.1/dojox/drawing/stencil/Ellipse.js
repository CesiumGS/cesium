/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.stencil.Ellipse"]){
dojo._hasResource["dojox.drawing.stencil.Ellipse"]=true;
dojo.provide("dojox.drawing.stencil.Ellipse");
dojox.drawing.stencil.Ellipse=dojox.drawing.util.oo.declare(dojox.drawing.stencil._Base,function(_1){
},{type:"dojox.drawing.stencil.Ellipse",anchorType:"group",baseRender:true,dataToPoints:function(o){
o=o||this.data;
var x=o.cx-o.rx,y=o.cy-o.ry,w=o.rx*2,h=o.ry*2;
this.points=[{x:x,y:y},{x:x+w,y:y},{x:x+w,y:y+h},{x:x,y:y+h}];
return this.points;
},pointsToData:function(p){
p=p||this.points;
var s=p[0];
var e=p[2];
this.data={cx:s.x+(e.x-s.x)/2,cy:s.y+(e.y-s.y)/2,rx:(e.x-s.x)*0.5,ry:(e.y-s.y)*0.5};
return this.data;
},_create:function(_2,d,_3){
this.remove(this[_2]);
this[_2]=this.container.createEllipse(d).setStroke(_3).setFill(_3.fill);
this._setNodeAtts(this[_2]);
},render:function(){
this.onBeforeRender(this);
this.renderHit&&this._create("hit",this.data,this.style.currentHit);
this._create("shape",this.data,this.style.current);
}});
dojox.drawing.register({name:"dojox.drawing.stencil.Ellipse"},"stencil");
}
