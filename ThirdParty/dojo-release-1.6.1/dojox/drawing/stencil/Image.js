/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.stencil.Image"]){
dojo._hasResource["dojox.drawing.stencil.Image"]=true;
dojo.provide("dojox.drawing.stencil.Image");
dojox.drawing.stencil.Image=dojox.drawing.util.oo.declare(dojox.drawing.stencil._Base,function(_1){
},{type:"dojox.drawing.stencil.Image",anchorType:"group",baseRender:true,dataToPoints:function(o){
o=o||this.data;
this.points=[{x:o.x,y:o.y},{x:o.x+o.width,y:o.y},{x:o.x+o.width,y:o.y+o.height},{x:o.x,y:o.y+o.height}];
return this.points;
},pointsToData:function(p){
p=p||this.points;
var s=p[0];
var e=p[2];
this.data={x:s.x,y:s.y,width:e.x-s.x,height:e.y-s.y,src:this.src||this.data.src};
return this.data;
},_createHilite:function(){
this.remove(this.hit);
this.hit=this.container.createRect(this.data).setStroke(this.style.current).setFill(this.style.current.fill);
this._setNodeAtts(this.hit);
},_create:function(_2,d,_3){
this.remove(this[_2]);
var s=this.container.getParent();
this[_2]=s.createImage(d);
this.container.add(this[_2]);
this._setNodeAtts(this[_2]);
},render:function(_4){
if(this.data.width=="auto"||isNaN(this.data.width)){
this.getImageSize(true);
console.warn("Image size not provided. Acquiring...");
return;
}
this.onBeforeRender(this);
this.renderHit&&this._createHilite();
this._create("shape",this.data,this.style.current);
},getImageSize:function(_5){
if(this._gettingSize){
return;
}
this._gettingSize=true;
var _6=dojo.create("img",{src:this.data.src},dojo.body());
var _7=dojo.connect(_6,"error",this,function(){
dojo.disconnect(c);
dojo.disconnect(_7);
console.error("Error loading image:",this.data.src);
console.warn("Error image:",this.data);
});
var c=dojo.connect(_6,"load",this,function(){
var _8=dojo.marginBox(_6);
this.setData({x:this.data.x,y:this.data.y,src:this.data.src,width:_8.w,height:_8.h});
dojo.disconnect(c);
dojo.destroy(_6);
_5&&this.render(true);
});
}});
dojox.drawing.register({name:"dojox.drawing.stencil.Image"},"stencil");
}
