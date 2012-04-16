/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.stencil.Rect"]){
dojo._hasResource["dojox.drawing.stencil.Rect"]=true;
dojo.provide("dojox.drawing.stencil.Rect");
dojox.drawing.stencil.Rect=dojox.drawing.util.oo.declare(dojox.drawing.stencil._Base,function(_1){
if(this.points.length){
}
},{type:"dojox.drawing.stencil.Rect",anchorType:"group",baseRender:true,dataToPoints:function(d){
d=d||this.data;
this.points=[{x:d.x,y:d.y},{x:d.x+d.width,y:d.y},{x:d.x+d.width,y:d.y+d.height},{x:d.x,y:d.y+d.height}];
return this.points;
},pointsToData:function(p){
p=p||this.points;
var s=p[0];
var e=p[2];
this.data={x:s.x,y:s.y,width:e.x-s.x,height:e.y-s.y,r:this.data.r||0};
return this.data;
},_create:function(_2,d,_3){
this.remove(this[_2]);
this[_2]=this.container.createRect(d).setStroke(_3).setFill(_3.fill);
this._setNodeAtts(this[_2]);
},render:function(){
this.onBeforeRender(this);
this.renderHit&&this._create("hit",this.data,this.style.currentHit);
this._create("shape",this.data,this.style.current);
}});
dojox.drawing.register({name:"dojox.drawing.stencil.Rect"},"stencil");
}
