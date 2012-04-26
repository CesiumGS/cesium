/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.plugins.tools.Pan"]){
dojo._hasResource["dojox.drawing.plugins.tools.Pan"]=true;
dojo.provide("dojox.drawing.plugins.tools.Pan");
dojo.require("dojox.drawing.plugins._Plugin");
dojox.drawing.plugins.tools.Pan=dojox.drawing.util.oo.declare(dojox.drawing.plugins._Plugin,function(_1){
this.domNode=_1.node;
var _2;
this.toolbar=_1.scope;
this.connect(this.toolbar,"onToolClick",this,function(){
this.onSetPan(false);
});
this.connect(this.keys,"onKeyUp",this,"onKeyUp");
this.connect(this.keys,"onKeyDown",this,"onKeyDown");
this.connect(this.keys,"onArrow",this,"onArrow");
this.connect(this.anchors,"onAnchorUp",this,"checkBounds");
this.connect(this.stencils,"register",this,"checkBounds");
this.connect(this.canvas,"resize",this,"checkBounds");
this.connect(this.canvas,"setZoom",this,"checkBounds");
this.connect(this.canvas,"onScroll",this,function(){
if(this._blockScroll){
this._blockScroll=false;
return;
}
_2&&clearTimeout(_2);
_2=setTimeout(dojo.hitch(this,"checkBounds"),200);
});
this._mouseHandle=this.mouse.register(this);
},{selected:false,keyScroll:false,type:"dojox.drawing.plugins.tools.Pan",onPanUp:function(_3){
if(_3.id==this.button.id){
this.onSetPan(false);
}
},onKeyUp:function(_4){
switch(_4.keyCode){
case 32:
this.onSetPan(false);
break;
case 39:
case 37:
case 38:
case 40:
clearInterval(this._timer);
break;
}
},onKeyDown:function(_5){
if(_5.keyCode==32){
this.onSetPan(true);
}
},interval:20,onArrow:function(_6){
if(this._timer){
clearInterval(this._timer);
}
this._timer=setInterval(dojo.hitch(this,function(_7){
this.canvas.domNode.parentNode.scrollLeft+=_7.x*10;
this.canvas.domNode.parentNode.scrollTop+=_7.y*10;
},_6),this.interval);
},onSetPan:function(_8){
if(_8===true||_8===false){
this.selected=!_8;
}
if(this.selected){
this.selected=false;
this.button.deselect();
}else{
this.selected=true;
this.button.select();
}
this.mouse.setEventMode(this.selected?"pan":"");
},onPanDrag:function(_9){
var x=_9.x-_9.last.x;
var y=_9.y-_9.last.y;
this.canvas.domNode.parentNode.scrollTop-=_9.move.y;
this.canvas.domNode.parentNode.scrollLeft-=_9.move.x;
this.canvas.onScroll();
},onUp:function(_a){
if(_a.withinCanvas){
this.keyScroll=true;
}else{
this.keyScroll=false;
}
},onStencilUp:function(_b){
this.checkBounds();
},onStencilDrag:function(_c){
},checkBounds:function(){
var _d=function(){
};
var _e=function(){
};
var t=Infinity,r=-Infinity,b=-10000,l=10000,sx=0,sy=0,dy=0,dx=0,mx=this.stencils.group?this.stencils.group.getTransform():{dx:0,dy:0},sc=this.mouse.scrollOffset(),_f=sc.left?10:0,scX=sc.top?10:0,ch=this.canvas.height,cw=this.canvas.width,z=this.canvas.zoom,pch=this.canvas.parentHeight,pcw=this.canvas.parentWidth;
this.stencils.withSelected(function(m){
var o=m.getBounds();
_e("SEL BOUNDS:",o);
t=Math.min(o.y1+mx.dy,t);
r=Math.max(o.x2+mx.dx,r);
b=Math.max(o.y2+mx.dy,b);
l=Math.min(o.x1+mx.dx,l);
});
this.stencils.withUnselected(function(m){
var o=m.getBounds();
_e("UN BOUNDS:",o);
t=Math.min(o.y1,t);
r=Math.max(o.x2,r);
b=Math.max(o.y2,b);
l=Math.min(o.x1,l);
_d("----------- B:",b,o.y2);
});
b*=z;
var _10=0,_11=0;
_d("Bottom test","b:",b,"z:",z,"ch:",ch,"pch:",pch,"top:",sc.top,"sy:",sy,"mx.dy:",mx.dy);
if(b>pch||sc.top){
_d("*bottom scroll*");
ch=Math.max(b,pch+sc.top);
sy=sc.top;
_10+=this.canvas.getScrollWidth();
}else{
if(!sy&&ch>pch){
_d("*bottom remove*");
ch=pch;
}
}
r*=z;
if(r>pcw||sc.left){
cw=Math.max(r,pcw+sc.left);
sx=sc.left;
_11+=this.canvas.getScrollWidth();
}else{
if(!sx&&cw>pcw){
cw=pcw;
}
}
cw+=_10*2;
ch+=_11*2;
this._blockScroll=true;
this.stencils.group&&this.stencils.group.applyTransform({dx:dx,dy:dy});
this.stencils.withUnselected(function(m){
m.transformPoints({dx:dx,dy:dy});
});
this.canvas.setDimensions(cw,ch,sx,sy);
}});
dojox.drawing.plugins.tools.Pan.setup={name:"dojox.drawing.plugins.tools.Pan",tooltip:"Pan Tool",iconClass:"iconPan",button:false};
dojox.drawing.register(dojox.drawing.plugins.tools.Pan.setup,"plugin");
}
