/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


dojo.require("dojox.gfx.vml");
dojo.experimental("dojox.gfx.vml_attach");
(function(){
var g=dojox.gfx,m=g.matrix,_1=g.vml;
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
if(_2.style.width==_2.style.height){
s=new _1.Circle(_2);
_4(s);
}else{
s=new _1.Ellipse(_2);
_5(s);
}
break;
case _1.Path.nodeType:
switch(_2.getAttribute("dojoGfxType")){
case "line":
s=new _1.Line(_2);
_6(s);
break;
case "polyline":
s=new _1.Polyline(_2);
_7(s);
break;
case "path":
s=new _1.Path(_2);
_8(s);
break;
case "text":
s=new _1.Text(_2);
_9(s);
_a(s);
_b(s);
break;
case "textpath":
s=new _1.TextPath(_2);
_8(s);
_9(s);
_a(s);
break;
}
break;
case _1.Image.nodeType:
switch(_2.getAttribute("dojoGfxType")){
case "image":
s=new _1.Image(_2);
_c(s);
_d(s);
break;
}
break;
default:
return null;
}
if(!(s instanceof _1.Image)){
_e(s);
_f(s);
if(!(s instanceof _1.Text)){
_10(s);
}
}
return s;
};
_1.attachSurface=function(_11){
var s=new _1.Surface();
s.clipNode=_11;
var r=s.rawNode=_11.firstChild;
var b=r.firstChild;
if(!b||b.tagName!="rect"){
return null;
}
s.bgNode=r;
return s;
};
var _e=function(_12){
var _13=null,r=_12.rawNode,fo=r.fill;
if(fo.on&&fo.type=="gradient"){
var _13=dojo.clone(g.defaultLinearGradient),rad=m._degToRad(fo.angle);
_13.x2=Math.cos(rad);
_13.y2=Math.sin(rad);
_13.colors=[];
var _14=fo.colors.value.split(";");
for(var i=0;i<_14.length;++i){
var t=_14[i].match(/\S+/g);
if(!t||t.length!=2){
continue;
}
_13.colors.push({offset:_1._parseFloat(t[0]),color:new dojo.Color(t[1])});
}
}else{
if(fo.on&&fo.type=="gradientradial"){
var _13=dojo.clone(g.defaultRadialGradient),w=parseFloat(r.style.width),h=parseFloat(r.style.height);
_13.cx=isNaN(w)?0:fo.focusposition.x*w;
_13.cy=isNaN(h)?0:fo.focusposition.y*h;
_13.r=isNaN(w)?1:w/2;
_13.colors=[];
var _14=fo.colors.value.split(";");
for(var i=_14.length-1;i>=0;--i){
var t=_14[i].match(/\S+/g);
if(!t||t.length!=2){
continue;
}
_13.colors.push({offset:_1._parseFloat(t[0]),color:new dojo.Color(t[1])});
}
}else{
if(fo.on&&fo.type=="tile"){
var _13=dojo.clone(g.defaultPattern);
_13.width=g.pt2px(fo.size.x);
_13.height=g.pt2px(fo.size.y);
_13.x=fo.origin.x*_13.width;
_13.y=fo.origin.y*_13.height;
_13.src=fo.src;
}else{
if(fo.on&&r.fillcolor){
_13=new dojo.Color(r.fillcolor+"");
_13.a=fo.opacity;
}
}
}
}
_12.fillStyle=_13;
};
var _f=function(_15){
var r=_15.rawNode;
if(!r.stroked){
_15.strokeStyle=null;
return;
}
var _16=_15.strokeStyle=dojo.clone(g.defaultStroke),rs=r.stroke;
_16.color=new dojo.Color(r.strokecolor.value);
_16.width=g.normalizedLength(r.strokeweight+"");
_16.color.a=rs.opacity;
_16.cap=this._translate(this._capMapReversed,rs.endcap);
_16.join=rs.joinstyle=="miter"?rs.miterlimit:rs.joinstyle;
_16.style=rs.dashstyle;
};
var _10=function(_17){
var s=_17.rawNode.skew,sm=s.matrix,so=s.offset;
_17.matrix=m.normalize({xx:sm.xtox,xy:sm.ytox,yx:sm.xtoy,yy:sm.ytoy,dx:g.pt2px(so.x),dy:g.pt2px(so.y)});
};
var _18=function(_19){
_19.bgNode=_19.rawNode.firstChild;
};
var _3=function(_1a){
var r=_1a.rawNode,_1b=r.outerHTML.match(/arcsize = \"(\d*\.?\d+[%f]?)\"/)[1],_1c=r.style,_1d=parseFloat(_1c.width),_1e=parseFloat(_1c.height);
_1b=(_1b.indexOf("%")>=0)?parseFloat(_1b)/100:_1._parseFloat(_1b);
_1a.shape=g.makeParameters(g.defaultRect,{x:parseInt(_1c.left),y:parseInt(_1c.top),width:_1d,height:_1e,r:Math.min(_1d,_1e)*_1b});
};
var _5=function(_1f){
var _20=_1f.rawNode.style,rx=parseInt(_20.width)/2,ry=parseInt(_20.height)/2;
_1f.shape=g.makeParameters(g.defaultEllipse,{cx:parseInt(_20.left)+rx,cy:parseInt(_20.top)+ry,rx:rx,ry:ry});
};
var _4=function(_21){
var _22=_21.rawNode.style,r=parseInt(_22.width)/2;
_21.shape=g.makeParameters(g.defaultCircle,{cx:parseInt(_22.left)+r,cy:parseInt(_22.top)+r,r:r});
};
var _6=function(_23){
var _24=_23.shape=dojo.clone(g.defaultLine),p=_23.rawNode.path.v.match(g.pathVmlRegExp);
do{
if(p.length<7||p[0]!="m"||p[3]!="l"||p[6]!="e"){
break;
}
_24.x1=parseInt(p[1]);
_24.y1=parseInt(p[2]);
_24.x2=parseInt(p[4]);
_24.y2=parseInt(p[5]);
}while(false);
};
var _7=function(_25){
var _26=_25.shape=dojo.clone(g.defaultPolyline),p=_25.rawNode.path.v.match(g.pathVmlRegExp);
do{
if(p.length<3||p[0]!="m"){
break;
}
var x=parseInt(p[0]),y=parseInt(p[1]);
if(isNaN(x)||isNaN(y)){
break;
}
_26.points.push({x:x,y:y});
if(p.length<6||p[3]!="l"){
break;
}
for(var i=4;i<p.length;i+=2){
x=parseInt(p[i]);
y=parseInt(p[i+1]);
if(isNaN(x)||isNaN(y)){
break;
}
_26.points.push({x:x,y:y});
}
}while(false);
};
var _c=function(_27){
_27.shape=dojo.clone(g.defaultImage);
_27.shape.src=_27.rawNode.firstChild.src;
};
var _d=function(_28){
var mm=_28.rawNode.filters["DXImageTransform.Microsoft.Matrix"];
_28.matrix=m.normalize({xx:mm.M11,xy:mm.M12,yx:mm.M21,yy:mm.M22,dx:mm.Dx,dy:mm.Dy});
};
var _9=function(_29){
var _2a=_29.shape=dojo.clone(g.defaultText),r=_29.rawNode,p=r.path.v.match(g.pathVmlRegExp);
do{
if(!p||p.length!=7){
break;
}
var c=r.childNodes,i=0;
for(;i<c.length&&c[i].tagName!="textpath";++i){
}
if(i>=c.length){
break;
}
var s=c[i].style;
_2a.text=c[i].string;
switch(s["v-text-align"]){
case "left":
_2a.x=parseInt(p[1]);
_2a.align="start";
break;
case "center":
_2a.x=(parseInt(p[1])+parseInt(p[4]))/2;
_2a.align="middle";
break;
case "right":
_2a.x=parseInt(p[4]);
_2a.align="end";
break;
}
_2a.y=parseInt(p[2]);
_2a.decoration=s["text-decoration"];
_2a.rotated=s["v-rotate-letters"].toLowerCase() in _1._bool;
_2a.kerning=s["v-text-kern"].toLowerCase() in _1._bool;
return;
}while(false);
_29.shape=null;
};
var _a=function(_2b){
var _2c=_2b.fontStyle=dojo.clone(g.defaultFont),c=_2b.rawNode.childNodes,i=0;
for(;i<c.length&&c[i].tagName=="textpath";++i){
}
if(i>=c.length){
_2b.fontStyle=null;
return;
}
var s=c[i].style;
_2c.style=s.fontstyle;
_2c.variant=s.fontvariant;
_2c.weight=s.fontweight;
_2c.size=s.fontsize;
_2c.family=s.fontfamily;
};
var _b=function(_2d){
_10(_2d);
var _2e=_2d.matrix,fs=_2d.fontStyle;
if(_2e&&fs){
_2d.matrix=m.multiply(_2e,{dy:g.normalizedLength(fs.size)*0.35});
}
};
var _8=function(_2f){
var _30=_2f.shape=dojo.clone(g.defaultPath),p=_2f.rawNode.path.v.match(g.pathVmlRegExp),t=[],_31=false,map=g.Path._pathVmlToSvgMap;
for(var i=0;i<p.length;++p){
var s=p[i];
if(s in map){
_31=false;
t.push(map[s]);
}else{
if(!_31){
var n=parseInt(s);
if(isNaN(n)){
_31=true;
}else{
t.push(n);
}
}
}
}
var l=t.length;
if(l>=4&&t[l-1]==""&&t[l-2]==0&&t[l-3]==0&&t[l-4]=="l"){
t.splice(l-4,4);
}
if(l){
_30.path=t.join(" ");
}
};
})();
