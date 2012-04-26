/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.stencil.Path"]){
dojo._hasResource["dojox.drawing.stencil.Path"]=true;
dojo.provide("dojox.drawing.stencil.Path");
dojox.drawing.stencil.Path=dojox.drawing.util.oo.declare(dojox.drawing.stencil._Base,function(_1){
dojo.disconnect(this._postRenderCon);
},{type:"dojox.drawing.stencil.Path",closePath:true,baseRender:true,closeRadius:10,closeColor:{r:255,g:255,b:0,a:0.5},_create:function(_2,_3){
this.remove(this[_2]);
if(!this.points.length){
return;
}
if(dojox.gfx.renderer=="svg"){
var _4=[];
dojo.forEach(this.points,function(o,i){
if(!o.skip){
if(i==0){
_4.push("M "+o.x+" "+o.y);
}else{
var _5=(o.t||"")+" ";
if(o.x===undefined){
_4.push(_5);
}else{
_4.push(_5+o.x+" "+o.y);
}
}
}
},this);
if(this.closePath){
_4.push("Z");
}
this.stringPath=_4.join(" ");
this[_2]=this.container.createPath(_4.join(" ")).setStroke(_3);
this.closePath&&this[_2].setFill(_3.fill);
}else{
this[_2]=this.container.createPath({}).setStroke(_3);
this.closePath&&this[_2].setFill(_3.fill);
dojo.forEach(this.points,function(o,i){
if(!o.skip){
if(i==0||o.t=="M"){
this[_2].moveTo(o.x,o.y);
}else{
if(o.t=="Z"){
this.closePath&&this[_2].closePath();
}else{
this[_2].lineTo(o.x,o.y);
}
}
}
},this);
this.closePath&&this[_2].closePath();
}
this._setNodeAtts(this[_2]);
},render:function(){
this.onBeforeRender(this);
this.renderHit&&this._create("hit",this.style.currentHit);
this._create("shape",this.style.current);
},getBounds:function(_6){
var _7=10000,_8=10000,_9=0,_a=0;
dojo.forEach(this.points,function(p){
if(p.x!==undefined&&!isNaN(p.x)){
_7=Math.min(_7,p.x);
_8=Math.min(_8,p.y);
_9=Math.max(_9,p.x);
_a=Math.max(_a,p.y);
}
});
return {x1:_7,y1:_8,x2:_9,y2:_a,x:_7,y:_8,w:_9-_7,h:_a-_8};
},checkClosePoint:function(_b,_c,_d){
var _e=this.util.distance(_b.x,_b.y,_c.x,_c.y);
if(this.points.length>1){
if(_e<this.closeRadius&&!this.closeGuide&&!_d){
var c={cx:_b.x,cy:_b.y,rx:this.closeRadius,ry:this.closeRadius};
this.closeGuide=this.container.createEllipse(c).setFill(this.closeColor);
}else{
if(_d||_e>this.closeRadius&&this.closeGuide){
this.remove(this.closeGuide);
this.closeGuide=null;
}
}
}
return _e<this.closeRadius;
}});
dojox.drawing.register({name:"dojox.drawing.stencil.Path"},"stencil");
}
