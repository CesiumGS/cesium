/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.ui.dom.Pan"]){
dojo._hasResource["dojox.drawing.ui.dom.Pan"]=true;
dojo.provide("dojox.drawing.ui.dom.Pan");
dojo.require("dojox.drawing.plugins._Plugin");
dojo.deprecated("dojox.drawing.ui.dom.Pan","It may not even make it to the 1.4 release.",1.4);
dojox.drawing.ui.dom.Pan=dojox.drawing.util.oo.declare(dojox.drawing.plugins._Plugin,function(_1){
this.domNode=_1.node;
var _2;
dojo.connect(this.domNode,"click",this,"onSetPan");
dojo.connect(this.keys,"onKeyUp",this,"onKeyUp");
dojo.connect(this.keys,"onKeyDown",this,"onKeyDown");
dojo.connect(this.anchors,"onAnchorUp",this,"checkBounds");
dojo.connect(this.stencils,"register",this,"checkBounds");
dojo.connect(this.canvas,"resize",this,"checkBounds");
dojo.connect(this.canvas,"setZoom",this,"checkBounds");
dojo.connect(this.canvas,"onScroll",this,function(){
if(this._blockScroll){
this._blockScroll=false;
return;
}
_2&&clearTimeout(_2);
_2=setTimeout(dojo.hitch(this,"checkBounds"),200);
});
this._mouseHandle=this.mouse.register(this);
},{selected:false,type:"dojox.drawing.ui.dom.Pan",onKeyUp:function(_3){
if(_3.keyCode==32){
this.onSetPan(false);
}
},onKeyDown:function(_4){
if(_4.keyCode==32){
this.onSetPan(true);
}
},onSetPan:function(_5){
if(_5===true||_5===false){
this.selected=!_5;
}
if(this.selected){
this.selected=false;
dojo.removeClass(this.domNode,"selected");
}else{
this.selected=true;
dojo.addClass(this.domNode,"selected");
}
this.mouse.setEventMode(this.selected?"pan":"");
},onPanDrag:function(_6){
var x=_6.x-_6.last.x;
var y=_6.y-_6.last.y;
this.canvas.domNode.parentNode.scrollTop-=_6.move.y;
this.canvas.domNode.parentNode.scrollLeft-=_6.move.x;
this.canvas.onScroll();
},onStencilUp:function(_7){
this.checkBounds();
},onStencilDrag:function(_8){
},checkBounds:function(){
var _9=function(){
};
var _a=function(){
};
var t=Infinity,r=-Infinity,b=-Infinity,l=Infinity,sx=0,sy=0,dy=0,dx=0,mx=this.stencils.group?this.stencils.group.getTransform():{dx:0,dy:0},sc=this.mouse.scrollOffset(),_b=sc.left?10:0,_c=sc.top?10:0,ch=this.canvas.height,cw=this.canvas.width,z=this.canvas.zoom,_d=this.canvas.parentHeight,_e=this.canvas.parentWidth;
this.stencils.withSelected(function(m){
var o=m.getBounds();
_a("SEL BOUNDS:",o);
t=Math.min(o.y1+mx.dy,t);
r=Math.max(o.x2+mx.dx,r);
b=Math.max(o.y2+mx.dy,b);
l=Math.min(o.x1+mx.dx,l);
});
this.stencils.withUnselected(function(m){
var o=m.getBounds();
_a("UN BOUNDS:",o);
t=Math.min(o.y1,t);
r=Math.max(o.x2,r);
b=Math.max(o.y2,b);
l=Math.min(o.x1,l);
});
b*=z;
var _f=0,_10=0;
_9("Bottom test","b:",b,"z:",z,"ch:",ch,"pch:",_d,"top:",sc.top,"sy:",sy);
if(b>_d||sc.top){
_9("*bottom scroll*");
ch=Math.max(b,_d+sc.top);
sy=sc.top;
_f+=this.canvas.getScrollWidth();
}else{
if(!sy&&ch>_d){
_9("*bottom remove*");
ch=_d;
}
}
r*=z;
if(r>_e||sc.left){
cw=Math.max(r,_e+sc.left);
sx=sc.left;
_10+=this.canvas.getScrollWidth();
}else{
if(!sx&&cw>_e){
cw=_e;
}
}
cw+=_f*2;
ch+=_10*2;
this._blockScroll=true;
this.stencils.group&&this.stencils.group.applyTransform({dx:dx,dy:dy});
this.stencils.withUnselected(function(m){
m.transformPoints({dx:dx,dy:dy});
});
this.canvas.setDimensions(cw,ch,sx,sy);
}});
dojox.drawing.ui.dom.Pan.setup={name:"dojox.drawing.ui.dom.Pan",tooltip:"Pan Tool",iconClass:"iconPan"};
dojox.drawing.register(dojox.drawing.ui.dom.Pan.setup,"plugin");
}
