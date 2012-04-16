/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.annotations.Arrow"]){
dojo._hasResource["dojox.drawing.annotations.Arrow"]=true;
dojo.provide("dojox.drawing.annotations.Arrow");
dojo.require("dojox.drawing.stencil.Path");
dojox.drawing.annotations.Arrow=dojox.drawing.util.oo.declare(dojox.drawing.stencil.Path,function(_1){
this.stencil.connectMult([[this.stencil,"select",this,"select"],[this.stencil,"deselect",this,"deselect"],[this.stencil,"render",this,"render"],[this.stencil,"onDelete",this,"destroy"]]);
this.connect("onBeforeRender",this,function(){
var o=this.stencil.points[this.idx1];
var c=this.stencil.points[this.idx2];
if(this.stencil.getRadius()>=this.minimumSize){
this.points=this.arrowHead(c.x,c.y,o.x,o.y,this.style);
}else{
this.points=[];
}
});
},{idx1:0,idx2:1,subShape:true,minimumSize:30,arrowHead:function(x1,y1,x2,y2,_2){
var _3={start:{x:x1,y:y1},x:x2,y:y2};
var _4=this.util.angle(_3);
var _5=this.util.length(_3);
var al=_2.arrows.length;
var aw=_2.arrows.width/2;
if(_5<al){
al=_5/2;
}
var p1=this.util.pointOnCircle(x2,y2,-al,_4-aw);
var p2=this.util.pointOnCircle(x2,y2,-al,_4+aw);
return [{x:x2,y:y2},p1,p2];
}});
}
