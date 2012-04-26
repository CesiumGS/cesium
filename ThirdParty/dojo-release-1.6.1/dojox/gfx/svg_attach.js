/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.svg_attach"]){
dojo._hasResource["dojox.gfx.svg_attach"]=true;
dojo.provide("dojox.gfx.svg_attach");
dojo.require("dojox.gfx.svg");
dojo.experimental("dojox.gfx.svg_attach");
(function(){
var g=dojox.gfx,_1=g.svg;
_1.attachNode=function(_2){
if(!_2){
return null;
}
var s=null;
switch(_2.tagName.toLowerCase()){
case _1.Rect.nodeType:
s=new _1.Rect(_2);
_3(s);
break;
case _1.Ellipse.nodeType:
s=new _1.Ellipse(_2);
_4(s,g.defaultEllipse);
break;
case _1.Polyline.nodeType:
s=new _1.Polyline(_2);
_4(s,g.defaultPolyline);
break;
case _1.Path.nodeType:
s=new _1.Path(_2);
_4(s,g.defaultPath);
break;
case _1.Circle.nodeType:
s=new _1.Circle(_2);
_4(s,g.defaultCircle);
break;
case _1.Line.nodeType:
s=new _1.Line(_2);
_4(s,g.defaultLine);
break;
case _1.Image.nodeType:
s=new _1.Image(_2);
_4(s,g.defaultImage);
break;
case _1.Text.nodeType:
var t=_2.getElementsByTagName("textPath");
if(t&&t.length){
s=new _1.TextPath(_2);
_4(s,g.defaultPath);
_5(s);
}else{
s=new _1.Text(_2);
_6(s);
}
_7(s);
break;
default:
return null;
}
if(!(s instanceof _1.Image)){
_8(s);
_9(s);
}
_a(s);
return s;
};
_1.attachSurface=function(_b){
var s=new _1.Surface();
s.rawNode=_b;
var _c=_b.getElementsByTagName("defs");
if(_c.length==0){
return null;
}
s.defNode=_c[0];
return s;
};
function _8(_d){
var _e=_d.rawNode.getAttribute("fill");
if(_e=="none"){
_d.fillStyle=null;
return;
}
var _f=null,_10=_1.getRef(_e);
if(_10){
switch(_10.tagName.toLowerCase()){
case "lineargradient":
_f=_11(g.defaultLinearGradient,_10);
dojo.forEach(["x1","y1","x2","y2"],function(x){
_f[x]=_10.getAttribute(x);
});
break;
case "radialgradient":
_f=_11(g.defaultRadialGradient,_10);
dojo.forEach(["cx","cy","r"],function(x){
_f[x]=_10.getAttribute(x);
});
_f.cx=_10.getAttribute("cx");
_f.cy=_10.getAttribute("cy");
_f.r=_10.getAttribute("r");
break;
case "pattern":
_f=dojo.clone(g.defaultPattern);
dojo.forEach(["x","y","width","height"],function(x){
_f[x]=_10.getAttribute(x);
});
_f.src=_10.firstChild.getAttributeNS(_1.xmlns.xlink,"href");
break;
}
}else{
_f=new dojo.Color(_e);
var _12=_d.rawNode.getAttribute("fill-opacity");
if(_12!=null){
_f.a=_12;
}
}
_d.fillStyle=_f;
};
function _11(_13,_14){
var _15=dojo.clone(_13);
_15.colors=[];
for(var i=0;i<_14.childNodes.length;++i){
_15.colors.push({offset:_14.childNodes[i].getAttribute("offset"),color:new dojo.Color(_14.childNodes[i].getAttribute("stop-color"))});
}
return _15;
};
function _9(_16){
var _17=_16.rawNode,_18=_17.getAttribute("stroke");
if(_18==null||_18=="none"){
_16.strokeStyle=null;
return;
}
var _19=_16.strokeStyle=dojo.clone(g.defaultStroke);
var _1a=new dojo.Color(_18);
if(_1a){
_19.color=_1a;
_19.color.a=_17.getAttribute("stroke-opacity");
_19.width=_17.getAttribute("stroke-width");
_19.cap=_17.getAttribute("stroke-linecap");
_19.join=_17.getAttribute("stroke-linejoin");
if(_19.join=="miter"){
_19.join=_17.getAttribute("stroke-miterlimit");
}
_19.style=_17.getAttribute("dojoGfxStrokeStyle");
}
};
function _a(_1b){
var _1c=_1b.rawNode.getAttribute("transform");
if(_1c.match(/^matrix\(.+\)$/)){
var t=_1c.slice(7,-1).split(",");
_1b.matrix=g.matrix.normalize({xx:parseFloat(t[0]),xy:parseFloat(t[2]),yx:parseFloat(t[1]),yy:parseFloat(t[3]),dx:parseFloat(t[4]),dy:parseFloat(t[5])});
}else{
_1b.matrix=null;
}
};
function _7(_1d){
var _1e=_1d.fontStyle=dojo.clone(g.defaultFont),r=_1d.rawNode;
_1e.style=r.getAttribute("font-style");
_1e.variant=r.getAttribute("font-variant");
_1e.weight=r.getAttribute("font-weight");
_1e.size=r.getAttribute("font-size");
_1e.family=r.getAttribute("font-family");
};
function _4(_1f,def){
var _20=_1f.shape=dojo.clone(def),r=_1f.rawNode;
for(var i in _20){
_20[i]=r.getAttribute(i);
}
};
function _3(_21){
_4(_21,g.defaultRect);
_21.shape.r=Math.min(_21.rawNode.getAttribute("rx"),_21.rawNode.getAttribute("ry"));
};
function _6(_22){
var _23=_22.shape=dojo.clone(g.defaultText),r=_22.rawNode;
_23.x=r.getAttribute("x");
_23.y=r.getAttribute("y");
_23.align=r.getAttribute("text-anchor");
_23.decoration=r.getAttribute("text-decoration");
_23.rotated=parseFloat(r.getAttribute("rotate"))!=0;
_23.kerning=r.getAttribute("kerning")=="auto";
_23.text=r.firstChild.nodeValue;
};
function _5(_24){
var _25=_24.shape=dojo.clone(g.defaultTextPath),r=_24.rawNode;
_25.align=r.getAttribute("text-anchor");
_25.decoration=r.getAttribute("text-decoration");
_25.rotated=parseFloat(r.getAttribute("rotate"))!=0;
_25.kerning=r.getAttribute("kerning")=="auto";
_25.text=r.firstChild.nodeValue;
};
})();
}
