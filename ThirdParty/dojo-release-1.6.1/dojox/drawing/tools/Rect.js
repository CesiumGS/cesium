/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.tools.Rect"]){
dojo._hasResource["dojox.drawing.tools.Rect"]=true;
dojo.provide("dojox.drawing.tools.Rect");
dojox.drawing.tools.Rect=dojox.drawing.util.oo.declare(dojox.drawing.stencil.Rect,function(){
},{draws:true,onDrag:function(_1){
var s=_1.start,e=_1;
var x=s.x<e.x?s.x:e.x,y=s.y<e.y?s.y:e.y,w=s.x<e.x?e.x-s.x:s.x-e.x,h=s.y<e.y?e.y-s.y:s.y-e.y;
if(this.keys.shift){
w=h=Math.max(w,h);
}
if(this.keys.alt){
x-=w;
y-=h;
w*=2;
h*=2;
x=Math.max(x,0);
y=Math.max(y,0);
}
this.setPoints([{x:x,y:y},{x:x+w,y:y},{x:x+w,y:y+h},{x:x,y:y+h}]);
this.render();
},onUp:function(_2){
if(this.created||!this._downOnCanvas){
return;
}
this._downOnCanvas=false;
if(!this.shape){
var s=_2.start;
var e=this.minimumSize*4;
this.setPoints([{x:s.x,y:s.y},{x:s.x+e,y:s.y},{x:s.x+e,y:s.y+e},{x:s.x,y:s.y+e}]);
this.render();
}else{
var o=this.data;
if(o.width<this.minimumSize&&o.height<this.minimumSize){
this.remove(this.shape,this.hit);
return;
}
}
this.onRender(this);
}});
dojox.drawing.tools.Rect.setup={name:"dojox.drawing.tools.Rect",tooltip:"<span class=\"drawingTipTitle\">Rectangle Tool</span><br/>"+"<span class=\"drawingTipDesc\">SHIFT - constrain to square</span>",iconClass:"iconRect"};
dojox.drawing.register(dojox.drawing.tools.Rect.setup,"tool");
}
