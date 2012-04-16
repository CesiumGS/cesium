/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.Shadow"]){
dojo._hasResource["dojox.fx.Shadow"]=true;
dojo.provide("dojox.fx.Shadow");
dojo.experimental("dojox.fx.Shadow");
dojo.require("dijit._Widget");
dojo.require("dojo.NodeList-fx");
dojo.declare("dojox.fx.Shadow",dijit._Widget,{shadowPng:dojo.moduleUrl("dojox.fx","resources/shadow"),shadowThickness:7,shadowOffset:3,opacity:0.75,animate:false,node:null,startup:function(){
this.inherited(arguments);
this.node.style.position="relative";
this.pieces={};
var x1=-1*this.shadowThickness;
var y0=this.shadowOffset;
var y1=this.shadowOffset+this.shadowThickness;
this._makePiece("tl","top",y0,"left",x1);
this._makePiece("l","top",y1,"left",x1,"scale");
this._makePiece("tr","top",y0,"left",0);
this._makePiece("r","top",y1,"left",0,"scale");
this._makePiece("bl","top",0,"left",x1);
this._makePiece("b","top",0,"left",0,"crop");
this._makePiece("br","top",0,"left",0);
this.nodeList=dojo.query(".shadowPiece",this.node);
this.setOpacity(this.opacity);
this.resize();
},_makePiece:function(_1,_2,_3,_4,_5,_6){
var _7;
var _8=this.shadowPng+_1.toUpperCase()+".png";
if(dojo.isIE<7){
_7=dojo.create("div");
_7.style.filter="progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+_8+"'"+(_6?", sizingMethod='"+_6+"'":"")+")";
}else{
_7=dojo.create("img",{src:_8});
}
_7.style.position="absolute";
_7.style[_2]=_3+"px";
_7.style[_4]=_5+"px";
_7.style.width=this.shadowThickness+"px";
_7.style.height=this.shadowThickness+"px";
dojo.addClass(_7,"shadowPiece");
this.pieces[_1]=_7;
this.node.appendChild(_7);
},setOpacity:function(n,_9){
if(dojo.isIE){
return;
}
if(!_9){
_9={};
}
if(this.animate){
var _a=[];
this.nodeList.forEach(function(_b){
_a.push(dojo._fade(dojo.mixin(_9,{node:_b,end:n})));
});
dojo.fx.combine(_a).play();
}else{
this.nodeList.style("opacity",n);
}
},setDisabled:function(_c){
if(_c){
if(this.disabled){
return;
}
if(this.animate){
this.nodeList.fadeOut().play();
}else{
this.nodeList.style("visibility","hidden");
}
this.disabled=true;
}else{
if(!this.disabled){
return;
}
if(this.animate){
this.nodeList.fadeIn().play();
}else{
this.nodeList.style("visibility","visible");
}
this.disabled=false;
}
},resize:function(_d){
var x;
var y;
if(_d){
x=_d.x;
y=_d.y;
}else{
var co=dojo._getBorderBox(this.node);
x=co.w;
y=co.h;
}
var _e=y-(this.shadowOffset+this.shadowThickness);
if(_e<0){
_e=0;
}
if(y<1){
y=1;
}
if(x<1){
x=1;
}
with(this.pieces){
l.style.height=_e+"px";
r.style.height=_e+"px";
b.style.width=x+"px";
bl.style.top=y+"px";
b.style.top=y+"px";
br.style.top=y+"px";
tr.style.left=x+"px";
r.style.left=x+"px";
br.style.left=x+"px";
}
}});
}
