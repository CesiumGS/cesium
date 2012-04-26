/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.tools.Path"]){
dojo._hasResource["dojox.drawing.tools.Path"]=true;
dojo.provide("dojox.drawing.tools.Path");
dojox.drawing.tools.Path=dojox.drawing.util.oo.declare(dojox.drawing.stencil.Path,function(){
this.pathMode="";
this.currentPathMode="";
this._started=false;
this.oddEvenClicks=0;
},{draws:true,onDown:function(_1){
if(!this._started){
this.onStartPath(_1);
}
},makeSubPath:function(_2){
if(_2){
if(this.currentPathMode=="Q"){
this.points.push({x:this.points[0].x,y:this.points[0].y});
}
this.points.push({t:"Z"});
this.render();
}
this.currentPathMode="";
this.pathMode="M";
},onStartPath:function(_3){
this._started=true;
this.revertRenderHit=this.renderHit;
this.renderHit=false;
this.closePath=false;
this.mouse.setEventMode("PathEdit");
this.closePoint={x:_3.x,y:_3.y};
this._kc1=this.connect(this.keys,"onEsc",this,function(){
this.onCompletePath(false);
});
this._kc2=this.connect(this.keys,"onKeyUp",this,function(_4){
switch(_4.letter){
case "c":
this.onCompletePath(true);
break;
case "l":
this.pathMode="L";
break;
case "m":
this.makeSubPath(false);
break;
case "q":
this.pathMode="Q";
break;
case "s":
this.pathMode="S";
break;
case "z":
this.makeSubPath(true);
break;
}
});
},onCompletePath:function(_5){
this.remove(this.closeGuide,this.guide);
var _6=this.getBounds();
if(_6.w<this.minimumSize&&_6.h<this.minimumSize){
this.remove(this.hit,this.shape,this.closeGuide);
this._started=false;
this.mouse.setEventMode("");
this.setPoints([]);
return;
}
if(_5){
if(this.currentPathMode=="Q"){
this.points.push({x:this.points[0].x,y:this.points[0].y});
}
this.closePath=true;
}
this.renderHit=this.revertRenderHit;
this.renderedOnce=true;
this.onRender(this);
this.disconnect([this._kc1,this._kc2]);
this.mouse.setEventMode("");
this.render();
},onUp:function(_7){
if(!this._started||!_7.withinCanvas){
return;
}
if(this.points.length>2&&this.closeRadius>this.util.distance(_7.x,_7.y,this.closePoint.x,this.closePoint.y)){
this.onCompletePath(true);
}else{
var p={x:_7.x,y:_7.y};
this.oddEvenClicks++;
if(this.currentPathMode!=this.pathMode){
if(this.pathMode=="Q"){
p.t="Q";
this.oddEvenClicks=0;
}else{
if(this.pathMode=="L"){
p.t="L";
}else{
if(this.pathMode=="M"){
p.t="M";
this.closePoint={x:_7.x,y:_7.y};
}
}
}
this.currentPathMode=this.pathMode;
}
this.points.push(p);
if(this.points.length>1){
this.remove(this.guide);
this.render();
}
}
},createGuide:function(_8){
if(!this.points.length){
return;
}
var _9=[].concat(this.points);
var pt={x:_8.x,y:_8.y};
if(this.currentPathMode=="Q"&&this.oddEvenClicks%2){
pt.t="L";
}
this.points.push(pt);
this.render();
this.points=_9;
var _a=this.util.distance(_8.x,_8.y,this.closePoint.x,this.closePoint.y);
if(this.points.length>1){
if(_a<this.closeRadius&&!this.closeGuide){
var c={cx:this.closePoint.x,cy:this.closePoint.y,rx:this.closeRadius,ry:this.closeRadius};
this.closeGuide=this.container.createEllipse(c).setFill(this.closeColor);
}else{
if(_a>this.closeRadius&&this.closeGuide){
this.remove(this.closeGuide);
this.closeGuide=null;
}
}
}
},onMove:function(_b){
if(!this._started){
return;
}
this.createGuide(_b);
},onDrag:function(_c){
if(!this._started){
return;
}
this.createGuide(_c);
}});
dojox.drawing.tools.Path.setup={name:"dojox.drawing.tools.Path",tooltip:"Path Tool",iconClass:"iconLine"};
dojox.drawing.register(dojox.drawing.tools.Path.setup,"tool");
}
