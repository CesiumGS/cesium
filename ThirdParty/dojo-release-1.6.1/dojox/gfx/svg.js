/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.svg"]){
dojo._hasResource["dojox.gfx.svg"]=true;
dojo.provide("dojox.gfx.svg");
dojo.require("dojox.gfx._base");
dojo.require("dojox.gfx.shape");
dojo.require("dojox.gfx.path");
(function(){
var d=dojo,g=dojox.gfx,gs=g.shape,_1=g.svg;
_1.useSvgWeb=(typeof window.svgweb!="undefined");
function _2(ns,_3){
if(dojo.doc.createElementNS){
return dojo.doc.createElementNS(ns,_3);
}else{
return dojo.doc.createElement(_3);
}
};
function _4(_5){
if(_1.useSvgWeb){
return dojo.doc.createTextNode(_5,true);
}else{
return dojo.doc.createTextNode(_5);
}
};
function _6(){
if(_1.useSvgWeb){
return dojo.doc.createDocumentFragment(true);
}else{
return dojo.doc.createDocumentFragment();
}
};
_1.xmlns={xlink:"http://www.w3.org/1999/xlink",svg:"http://www.w3.org/2000/svg"};
_1.getRef=function(_7){
if(!_7||_7=="none"){
return null;
}
if(_7.match(/^url\(#.+\)$/)){
return d.byId(_7.slice(5,-1));
}
if(_7.match(/^#dojoUnique\d+$/)){
return d.byId(_7.slice(1));
}
return null;
};
_1.dasharray={solid:"none",shortdash:[4,1],shortdot:[1,1],shortdashdot:[4,1,1,1],shortdashdotdot:[4,1,1,1,1,1],dot:[1,3],dash:[4,3],longdash:[8,3],dashdot:[4,3,1,3],longdashdot:[8,3,1,3],longdashdotdot:[8,3,1,3,1,3]};
d.declare("dojox.gfx.svg.Shape",gs.Shape,{setFill:function(_8){
if(!_8){
this.fillStyle=null;
this.rawNode.setAttribute("fill","none");
this.rawNode.setAttribute("fill-opacity",0);
return this;
}
var f;
var _9=function(x){
this.setAttribute(x,f[x].toFixed(8));
};
if(typeof (_8)=="object"&&"type" in _8){
switch(_8.type){
case "linear":
f=g.makeParameters(g.defaultLinearGradient,_8);
var _a=this._setFillObject(f,"linearGradient");
d.forEach(["x1","y1","x2","y2"],_9,_a);
break;
case "radial":
f=g.makeParameters(g.defaultRadialGradient,_8);
var _a=this._setFillObject(f,"radialGradient");
d.forEach(["cx","cy","r"],_9,_a);
break;
case "pattern":
f=g.makeParameters(g.defaultPattern,_8);
var _b=this._setFillObject(f,"pattern");
d.forEach(["x","y","width","height"],_9,_b);
break;
}
this.fillStyle=f;
return this;
}
var f=g.normalizeColor(_8);
this.fillStyle=f;
this.rawNode.setAttribute("fill",f.toCss());
this.rawNode.setAttribute("fill-opacity",f.a);
this.rawNode.setAttribute("fill-rule","evenodd");
return this;
},setStroke:function(_c){
var rn=this.rawNode;
if(!_c){
this.strokeStyle=null;
rn.setAttribute("stroke","none");
rn.setAttribute("stroke-opacity",0);
return this;
}
if(typeof _c=="string"||d.isArray(_c)||_c instanceof d.Color){
_c={color:_c};
}
var s=this.strokeStyle=g.makeParameters(g.defaultStroke,_c);
s.color=g.normalizeColor(s.color);
if(s){
rn.setAttribute("stroke",s.color.toCss());
rn.setAttribute("stroke-opacity",s.color.a);
rn.setAttribute("stroke-width",s.width);
rn.setAttribute("stroke-linecap",s.cap);
if(typeof s.join=="number"){
rn.setAttribute("stroke-linejoin","miter");
rn.setAttribute("stroke-miterlimit",s.join);
}else{
rn.setAttribute("stroke-linejoin",s.join);
}
var da=s.style.toLowerCase();
if(da in _1.dasharray){
da=_1.dasharray[da];
}
if(da instanceof Array){
da=d._toArray(da);
for(var i=0;i<da.length;++i){
da[i]*=s.width;
}
if(s.cap!="butt"){
for(var i=0;i<da.length;i+=2){
da[i]-=s.width;
if(da[i]<1){
da[i]=1;
}
}
for(var i=1;i<da.length;i+=2){
da[i]+=s.width;
}
}
da=da.join(",");
}
rn.setAttribute("stroke-dasharray",da);
rn.setAttribute("dojoGfxStrokeStyle",s.style);
}
return this;
},_getParentSurface:function(){
var _d=this.parent;
for(;_d&&!(_d instanceof g.Surface);_d=_d.parent){
}
return _d;
},_setFillObject:function(f,_e){
var _f=_1.xmlns.svg;
this.fillStyle=f;
var _10=this._getParentSurface(),_11=_10.defNode,_12=this.rawNode.getAttribute("fill"),ref=_1.getRef(_12);
if(ref){
_12=ref;
if(_12.tagName.toLowerCase()!=_e.toLowerCase()){
var id=_12.id;
_12.parentNode.removeChild(_12);
_12=_2(_f,_e);
_12.setAttribute("id",id);
_11.appendChild(_12);
}else{
while(_12.childNodes.length){
_12.removeChild(_12.lastChild);
}
}
}else{
_12=_2(_f,_e);
_12.setAttribute("id",g._base._getUniqueId());
_11.appendChild(_12);
}
if(_e=="pattern"){
_12.setAttribute("patternUnits","userSpaceOnUse");
var img=_2(_f,"image");
img.setAttribute("x",0);
img.setAttribute("y",0);
img.setAttribute("width",f.width.toFixed(8));
img.setAttribute("height",f.height.toFixed(8));
img.setAttributeNS(_1.xmlns.xlink,"xlink:href",f.src);
_12.appendChild(img);
}else{
_12.setAttribute("gradientUnits","userSpaceOnUse");
for(var i=0;i<f.colors.length;++i){
var c=f.colors[i],t=_2(_f,"stop"),cc=c.color=g.normalizeColor(c.color);
t.setAttribute("offset",c.offset.toFixed(8));
t.setAttribute("stop-color",cc.toCss());
t.setAttribute("stop-opacity",cc.a);
_12.appendChild(t);
}
}
this.rawNode.setAttribute("fill","url(#"+_12.getAttribute("id")+")");
this.rawNode.removeAttribute("fill-opacity");
this.rawNode.setAttribute("fill-rule","evenodd");
return _12;
},_applyTransform:function(){
var _13=this.matrix;
if(_13){
var tm=this.matrix;
this.rawNode.setAttribute("transform","matrix("+tm.xx.toFixed(8)+","+tm.yx.toFixed(8)+","+tm.xy.toFixed(8)+","+tm.yy.toFixed(8)+","+tm.dx.toFixed(8)+","+tm.dy.toFixed(8)+")");
}else{
this.rawNode.removeAttribute("transform");
}
return this;
},setRawNode:function(_14){
var r=this.rawNode=_14;
if(this.shape.type!="image"){
r.setAttribute("fill","none");
}
r.setAttribute("fill-opacity",0);
r.setAttribute("stroke","none");
r.setAttribute("stroke-opacity",0);
r.setAttribute("stroke-width",1);
r.setAttribute("stroke-linecap","butt");
r.setAttribute("stroke-linejoin","miter");
r.setAttribute("stroke-miterlimit",4);
},setShape:function(_15){
this.shape=g.makeParameters(this.shape,_15);
for(var i in this.shape){
if(i!="type"){
this.rawNode.setAttribute(i,this.shape[i]);
}
}
this.bbox=null;
return this;
},_moveToFront:function(){
this.rawNode.parentNode.appendChild(this.rawNode);
return this;
},_moveToBack:function(){
this.rawNode.parentNode.insertBefore(this.rawNode,this.rawNode.parentNode.firstChild);
return this;
}});
dojo.declare("dojox.gfx.svg.Group",_1.Shape,{constructor:function(){
gs.Container._init.call(this);
},setRawNode:function(_16){
this.rawNode=_16;
}});
_1.Group.nodeType="g";
dojo.declare("dojox.gfx.svg.Rect",[_1.Shape,gs.Rect],{setShape:function(_17){
this.shape=g.makeParameters(this.shape,_17);
this.bbox=null;
for(var i in this.shape){
if(i!="type"&&i!="r"){
this.rawNode.setAttribute(i,this.shape[i]);
}
}
if(this.shape.r){
this.rawNode.setAttribute("ry",this.shape.r);
this.rawNode.setAttribute("rx",this.shape.r);
}
return this;
}});
_1.Rect.nodeType="rect";
dojo.declare("dojox.gfx.svg.Ellipse",[_1.Shape,gs.Ellipse],{});
_1.Ellipse.nodeType="ellipse";
dojo.declare("dojox.gfx.svg.Circle",[_1.Shape,gs.Circle],{});
_1.Circle.nodeType="circle";
dojo.declare("dojox.gfx.svg.Line",[_1.Shape,gs.Line],{});
_1.Line.nodeType="line";
dojo.declare("dojox.gfx.svg.Polyline",[_1.Shape,gs.Polyline],{setShape:function(_18,_19){
if(_18&&_18 instanceof Array){
this.shape=g.makeParameters(this.shape,{points:_18});
if(_19&&this.shape.points.length){
this.shape.points.push(this.shape.points[0]);
}
}else{
this.shape=g.makeParameters(this.shape,_18);
}
this.bbox=null;
this._normalizePoints();
var _1a=[],p=this.shape.points;
for(var i=0;i<p.length;++i){
_1a.push(p[i].x.toFixed(8),p[i].y.toFixed(8));
}
this.rawNode.setAttribute("points",_1a.join(" "));
return this;
}});
_1.Polyline.nodeType="polyline";
dojo.declare("dojox.gfx.svg.Image",[_1.Shape,gs.Image],{setShape:function(_1b){
this.shape=g.makeParameters(this.shape,_1b);
this.bbox=null;
var _1c=this.rawNode;
for(var i in this.shape){
if(i!="type"&&i!="src"){
_1c.setAttribute(i,this.shape[i]);
}
}
_1c.setAttribute("preserveAspectRatio","none");
_1c.setAttributeNS(_1.xmlns.xlink,"xlink:href",this.shape.src);
return this;
}});
_1.Image.nodeType="image";
dojo.declare("dojox.gfx.svg.Text",[_1.Shape,gs.Text],{setShape:function(_1d){
this.shape=g.makeParameters(this.shape,_1d);
this.bbox=null;
var r=this.rawNode,s=this.shape;
r.setAttribute("x",s.x);
r.setAttribute("y",s.y);
r.setAttribute("text-anchor",s.align);
r.setAttribute("text-decoration",s.decoration);
r.setAttribute("rotate",s.rotated?90:0);
r.setAttribute("kerning",s.kerning?"auto":0);
r.setAttribute("text-rendering","optimizeLegibility");
if(r.firstChild){
r.firstChild.nodeValue=s.text;
}else{
r.appendChild(_4(s.text));
}
return this;
},getTextWidth:function(){
var _1e=this.rawNode,_1f=_1e.parentNode,_20=_1e.cloneNode(true);
_20.style.visibility="hidden";
var _21=0,_22=_20.firstChild.nodeValue;
_1f.appendChild(_20);
if(_22!=""){
while(!_21){
if(_20.getBBox){
_21=parseInt(_20.getBBox().width);
}else{
_21=68;
}
}
}
_1f.removeChild(_20);
return _21;
}});
_1.Text.nodeType="text";
dojo.declare("dojox.gfx.svg.Path",[_1.Shape,g.path.Path],{_updateWithSegment:function(_23){
this.inherited(arguments);
if(typeof (this.shape.path)=="string"){
this.rawNode.setAttribute("d",this.shape.path);
}
},setShape:function(_24){
this.inherited(arguments);
if(this.shape.path){
this.rawNode.setAttribute("d",this.shape.path);
}else{
this.rawNode.removeAttribute("d");
}
return this;
}});
_1.Path.nodeType="path";
dojo.declare("dojox.gfx.svg.TextPath",[_1.Shape,g.path.TextPath],{_updateWithSegment:function(_25){
this.inherited(arguments);
this._setTextPath();
},setShape:function(_26){
this.inherited(arguments);
this._setTextPath();
return this;
},_setTextPath:function(){
if(typeof this.shape.path!="string"){
return;
}
var r=this.rawNode;
if(!r.firstChild){
var tp=_2(_1.xmlns.svg,"textPath"),tx=_4("");
tp.appendChild(tx);
r.appendChild(tp);
}
var ref=r.firstChild.getAttributeNS(_1.xmlns.xlink,"href"),_27=ref&&_1.getRef(ref);
if(!_27){
var _28=this._getParentSurface();
if(_28){
var _29=_28.defNode;
_27=_2(_1.xmlns.svg,"path");
var id=g._base._getUniqueId();
_27.setAttribute("id",id);
_29.appendChild(_27);
r.firstChild.setAttributeNS(_1.xmlns.xlink,"xlink:href","#"+id);
}
}
if(_27){
_27.setAttribute("d",this.shape.path);
}
},_setText:function(){
var r=this.rawNode;
if(!r.firstChild){
var tp=_2(_1.xmlns.svg,"textPath"),tx=_4("");
tp.appendChild(tx);
r.appendChild(tp);
}
r=r.firstChild;
var t=this.text;
r.setAttribute("alignment-baseline","middle");
switch(t.align){
case "middle":
r.setAttribute("text-anchor","middle");
r.setAttribute("startOffset","50%");
break;
case "end":
r.setAttribute("text-anchor","end");
r.setAttribute("startOffset","100%");
break;
default:
r.setAttribute("text-anchor","start");
r.setAttribute("startOffset","0%");
break;
}
r.setAttribute("baseline-shift","0.5ex");
r.setAttribute("text-decoration",t.decoration);
r.setAttribute("rotate",t.rotated?90:0);
r.setAttribute("kerning",t.kerning?"auto":0);
r.firstChild.data=t.text;
}});
_1.TextPath.nodeType="text";
dojo.declare("dojox.gfx.svg.Surface",gs.Surface,{constructor:function(){
gs.Container._init.call(this);
},destroy:function(){
this.defNode=null;
this.inherited(arguments);
},setDimensions:function(_2a,_2b){
if(!this.rawNode){
return this;
}
this.rawNode.setAttribute("width",_2a);
this.rawNode.setAttribute("height",_2b);
return this;
},getDimensions:function(){
var t=this.rawNode?{width:g.normalizedLength(this.rawNode.getAttribute("width")),height:g.normalizedLength(this.rawNode.getAttribute("height"))}:null;
return t;
}});
_1.createSurface=function(_2c,_2d,_2e){
var s=new _1.Surface();
s.rawNode=_2(_1.xmlns.svg,"svg");
if(_2d){
s.rawNode.setAttribute("width",_2d);
}
if(_2e){
s.rawNode.setAttribute("height",_2e);
}
var _2f=_2(_1.xmlns.svg,"defs");
s.rawNode.appendChild(_2f);
s.defNode=_2f;
s._parent=d.byId(_2c);
s._parent.appendChild(s.rawNode);
return s;
};
var _30={_setFont:function(){
var f=this.fontStyle;
this.rawNode.setAttribute("font-style",f.style);
this.rawNode.setAttribute("font-variant",f.variant);
this.rawNode.setAttribute("font-weight",f.weight);
this.rawNode.setAttribute("font-size",f.size);
this.rawNode.setAttribute("font-family",f.family);
}};
var C=gs.Container,_31={openBatch:function(){
this.fragment=_6();
},closeBatch:function(){
if(this.fragment){
this.rawNode.appendChild(this.fragment);
delete this.fragment;
}
},add:function(_32){
if(this!=_32.getParent()){
if(this.fragment){
this.fragment.appendChild(_32.rawNode);
}else{
this.rawNode.appendChild(_32.rawNode);
}
C.add.apply(this,arguments);
}
return this;
},remove:function(_33,_34){
if(this==_33.getParent()){
if(this.rawNode==_33.rawNode.parentNode){
this.rawNode.removeChild(_33.rawNode);
}
if(this.fragment&&this.fragment==_33.rawNode.parentNode){
this.fragment.removeChild(_33.rawNode);
}
C.remove.apply(this,arguments);
}
return this;
},clear:function(){
var r=this.rawNode;
while(r.lastChild){
r.removeChild(r.lastChild);
}
var _35=this.defNode;
if(_35){
while(_35.lastChild){
_35.removeChild(_35.lastChild);
}
r.appendChild(_35);
}
return C.clear.apply(this,arguments);
},_moveChildToFront:C._moveChildToFront,_moveChildToBack:C._moveChildToBack};
var _36={createObject:function(_37,_38){
if(!this.rawNode){
return null;
}
var _39=new _37(),_3a=_2(_1.xmlns.svg,_37.nodeType);
_39.setRawNode(_3a);
_39.setShape(_38);
this.add(_39);
return _39;
}};
d.extend(_1.Text,_30);
d.extend(_1.TextPath,_30);
d.extend(_1.Group,_31);
d.extend(_1.Group,gs.Creator);
d.extend(_1.Group,_36);
d.extend(_1.Surface,_31);
d.extend(_1.Surface,gs.Creator);
d.extend(_1.Surface,_36);
if(_1.useSvgWeb){
_1.createSurface=function(_3b,_3c,_3d){
var s=new _1.Surface();
if(!_3c||!_3d){
var pos=d.position(_3b);
_3c=_3c||pos.w;
_3d=_3d||pos.h;
}
_3b=d.byId(_3b);
var id=_3b.id?_3b.id+"_svgweb":g._base._getUniqueId();
var _3e=_2(_1.xmlns.svg,"svg");
_3e.id=id;
_3e.setAttribute("width",_3c);
_3e.setAttribute("height",_3d);
svgweb.appendChild(_3e,_3b);
_3e.addEventListener("SVGLoad",function(){
s.rawNode=this;
s.isLoaded=true;
var _3f=_2(_1.xmlns.svg,"defs");
s.rawNode.appendChild(_3f);
s.defNode=_3f;
if(s.onLoad){
s.onLoad(s);
}
},false);
s.isLoaded=false;
return s;
};
_1.Surface.extend({destroy:function(){
var _40=this.rawNode;
svgweb.removeChild(_40,_40.parentNode);
}});
var _41={connect:function(_42,_43,_44){
if(_42.substring(0,2)==="on"){
_42=_42.substring(2);
}
if(arguments.length==2){
_44=_43;
}else{
_44=d.hitch(_43,_44);
}
this.getEventSource().addEventListener(_42,_44,false);
return [this,_42,_44];
},disconnect:function(_45){
this.getEventSource().removeEventListener(_45[1],_45[2],false);
delete _45[0];
}};
dojo.extend(_1.Shape,_41);
dojo.extend(_1.Surface,_41);
}
if(g.loadAndSwitch==="svg"){
g.switchTo("svg");
delete g.loadAndSwitch;
}
})();
}
