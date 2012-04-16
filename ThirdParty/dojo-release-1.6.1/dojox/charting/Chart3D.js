/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.Chart3D"]){
dojo._hasResource["dojox.charting.Chart3D"]=true;
dojo.provide("dojox.charting.Chart3D");
dojo.require("dojox.gfx3d");
(function(){
var _1={x:0,y:0,z:1},v=dojox.gfx3d.vector,n=dojox.gfx.normalizedLength;
dojo.declare("dojox.charting.Chart3D",null,{constructor:function(_2,_3,_4,_5){
this.node=dojo.byId(_2);
this.surface=dojox.gfx.createSurface(this.node,n(this.node.style.width),n(this.node.style.height));
this.view=this.surface.createViewport();
this.view.setLights(_3.lights,_3.ambient,_3.specular);
this.view.setCameraTransform(_4);
this.theme=_5;
this.walls=[];
this.plots=[];
},generate:function(){
return this._generateWalls()._generatePlots();
},invalidate:function(){
this.view.invalidate();
return this;
},render:function(){
this.view.render();
return this;
},addPlot:function(_6){
return this._add(this.plots,_6);
},removePlot:function(_7){
return this._remove(this.plots,_7);
},addWall:function(_8){
return this._add(this.walls,_8);
},removeWall:function(_9){
return this._remove(this.walls,_9);
},_add:function(_a,_b){
if(!dojo.some(_a,function(i){
return i==_b;
})){
_a.push(_b);
this.view.invalidate();
}
return this;
},_remove:function(_c,_d){
var a=dojo.filter(_c,function(i){
return i!=_d;
});
return a.length<_c.length?(_c=a,this.invalidate()):this;
},_generateWalls:function(){
for(var i=0;i<this.walls.length;++i){
if(v.dotProduct(_1,this.walls[i].normal)>0){
this.walls[i].generate(this);
}
}
return this;
},_generatePlots:function(){
var _e=0,m=dojox.gfx3d.matrix,i=0;
for(;i<this.plots.length;++i){
_e+=this.plots[i].getDepth();
}
for(--i;i>=0;--i){
var _f=this.view.createScene();
_f.setTransform(m.translate(0,0,-_e));
this.plots[i].generate(this,_f);
_e-=this.plots[i].getDepth();
}
return this;
}});
})();
}
