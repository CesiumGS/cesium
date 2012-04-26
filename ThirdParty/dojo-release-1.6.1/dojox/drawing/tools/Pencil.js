/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.tools.Pencil"]){
dojo._hasResource["dojox.drawing.tools.Pencil"]=true;
dojo.provide("dojox.drawing.tools.Pencil");
dojox.drawing.tools.Pencil=dojox.drawing.util.oo.declare(dojox.drawing.stencil.Path,function(){
this._started=false;
},{draws:true,minDist:15,onDown:function(_1){
this._started=true;
var p={x:_1.x,y:_1.y};
this.points=[p];
this.lastPoint=p;
this.revertRenderHit=this.renderHit;
this.renderHit=false;
this.closePath=false;
},onDrag:function(_2){
if(!this._started||this.minDist>this.util.distance(_2.x,_2.y,this.lastPoint.x,this.lastPoint.y)){
return;
}
var p={x:_2.x,y:_2.y};
this.points.push(p);
this.render();
this.checkClosePoint(this.points[0],_2);
this.lastPoint=p;
},onUp:function(_3){
if(!this._started){
return;
}
if(!this.points||this.points.length<2){
this._started=false;
this.points=[];
return;
}
var _4=this.getBounds();
if(_4.w<this.minimumSize&&_4.h<this.minimumSize){
this.remove(this.hit,this.shape,this.closeGuide);
this._started=false;
this.setPoints([]);
return;
}
if(this.checkClosePoint(this.points[0],_3,true)){
this.closePath=true;
}
this.renderHit=this.revertRenderHit;
this.renderedOnce=true;
this.render();
this.onRender(this);
}});
dojox.drawing.tools.Pencil.setup={name:"dojox.drawing.tools.Pencil",tooltip:"Pencil Tool",iconClass:"iconLine"};
dojox.drawing.register(dojox.drawing.tools.Pencil.setup,"tool");
}
