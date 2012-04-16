/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.vml"]){
dojo._hasResource["dojox.gfx.vml"]=true;
dojo.provide("dojox.gfx.vml");
dojo.require("dojox.gfx._base");
dojo.require("dojox.gfx.shape");
dojo.require("dojox.gfx.path");
dojo.require("dojox.gfx.arc");
dojo.require("dojox.gfx.gradient");
(function(){
var d=dojo,g=dojox.gfx,m=g.matrix,gs=g.shape,_1=g.vml;
_1.xmlns="urn:schemas-microsoft-com:vml";
_1.text_alignment={start:"left",middle:"center",end:"right"};
_1._parseFloat=function(_2){
return _2.match(/^\d+f$/i)?parseInt(_2)/65536:parseFloat(_2);
};
_1._bool={"t":1,"true":1};
d.declare("dojox.gfx.vml.Shape",gs.Shape,{setFill:function(_3){
if(!_3){
this.fillStyle=null;
this.rawNode.filled="f";
return this;
}
var i,f,fo,a,s;
if(typeof _3=="object"&&"type" in _3){
switch(_3.type){
case "linear":
var _4=this._getRealMatrix(),_5=this.getBoundingBox(),_6=this._getRealBBox?this._getRealBBox():this.getTransformedBoundingBox();
s=[];
if(this.fillStyle!==_3){
this.fillStyle=g.makeParameters(g.defaultLinearGradient,_3);
}
f=g.gradient.project(_4,this.fillStyle,{x:_5.x,y:_5.y},{x:_5.x+_5.width,y:_5.y+_5.height},_6[0],_6[2]);
a=f.colors;
if(a[0].offset.toFixed(5)!="0.00000"){
s.push("0 "+g.normalizeColor(a[0].color).toHex());
}
for(i=0;i<a.length;++i){
s.push(a[i].offset.toFixed(5)+" "+g.normalizeColor(a[i].color).toHex());
}
i=a.length-1;
if(a[i].offset.toFixed(5)!="1.00000"){
s.push("1 "+g.normalizeColor(a[i].color).toHex());
}
fo=this.rawNode.fill;
fo.colors.value=s.join(";");
fo.method="sigma";
fo.type="gradient";
fo.angle=(270-m._radToDeg(f.angle))%360;
fo.on=true;
break;
case "radial":
f=g.makeParameters(g.defaultRadialGradient,_3);
this.fillStyle=f;
var l=parseFloat(this.rawNode.style.left),t=parseFloat(this.rawNode.style.top),w=parseFloat(this.rawNode.style.width),h=parseFloat(this.rawNode.style.height),c=isNaN(w)?1:2*f.r/w;
a=[];
if(f.colors[0].offset>0){
a.push({offset:1,color:g.normalizeColor(f.colors[0].color)});
}
d.forEach(f.colors,function(v,i){
a.push({offset:1-v.offset*c,color:g.normalizeColor(v.color)});
});
i=a.length-1;
while(i>=0&&a[i].offset<0){
--i;
}
if(i<a.length-1){
var q=a[i],p=a[i+1];
p.color=d.blendColors(q.color,p.color,q.offset/(q.offset-p.offset));
p.offset=0;
while(a.length-i>2){
a.pop();
}
}
i=a.length-1,s=[];
if(a[i].offset>0){
s.push("0 "+a[i].color.toHex());
}
for(;i>=0;--i){
s.push(a[i].offset.toFixed(5)+" "+a[i].color.toHex());
}
fo=this.rawNode.fill;
fo.colors.value=s.join(";");
fo.method="sigma";
fo.type="gradientradial";
if(isNaN(w)||isNaN(h)||isNaN(l)||isNaN(t)){
fo.focusposition="0.5 0.5";
}else{
fo.focusposition=((f.cx-l)/w).toFixed(5)+" "+((f.cy-t)/h).toFixed(5);
}
fo.focussize="0 0";
fo.on=true;
break;
case "pattern":
f=g.makeParameters(g.defaultPattern,_3);
this.fillStyle=f;
fo=this.rawNode.fill;
fo.type="tile";
fo.src=f.src;
if(f.width&&f.height){
fo.size.x=g.px2pt(f.width);
fo.size.y=g.px2pt(f.height);
}
fo.alignShape="f";
fo.position.x=0;
fo.position.y=0;
fo.origin.x=f.width?f.x/f.width:0;
fo.origin.y=f.height?f.y/f.height:0;
fo.on=true;
break;
}
this.rawNode.fill.opacity=1;
return this;
}
this.fillStyle=g.normalizeColor(_3);
fo=this.rawNode.fill;
if(!fo){
fo=this.rawNode.ownerDocument.createElement("v:fill");
}
fo.method="any";
fo.type="solid";
fo.opacity=this.fillStyle.a;
var _7=this.rawNode.filters["DXImageTransform.Microsoft.Alpha"];
if(_7){
_7.opacity=Math.round(this.fillStyle.a*100);
}
this.rawNode.fillcolor=this.fillStyle.toHex();
this.rawNode.filled=true;
return this;
},setStroke:function(_8){
if(!_8){
this.strokeStyle=null;
this.rawNode.stroked="f";
return this;
}
if(typeof _8=="string"||d.isArray(_8)||_8 instanceof d.Color){
_8={color:_8};
}
var s=this.strokeStyle=g.makeParameters(g.defaultStroke,_8);
s.color=g.normalizeColor(s.color);
var rn=this.rawNode;
rn.stroked=true;
rn.strokecolor=s.color.toCss();
rn.strokeweight=s.width+"px";
if(rn.stroke){
rn.stroke.opacity=s.color.a;
rn.stroke.endcap=this._translate(this._capMap,s.cap);
if(typeof s.join=="number"){
rn.stroke.joinstyle="miter";
rn.stroke.miterlimit=s.join;
}else{
rn.stroke.joinstyle=s.join;
}
rn.stroke.dashstyle=s.style=="none"?"Solid":s.style;
}
return this;
},_capMap:{butt:"flat"},_capMapReversed:{flat:"butt"},_translate:function(_9,_a){
return (_a in _9)?_9[_a]:_a;
},_applyTransform:function(){
var _b=this._getRealMatrix();
if(_b){
var _c=this.rawNode.skew;
if(typeof _c=="undefined"){
for(var i=0;i<this.rawNode.childNodes.length;++i){
if(this.rawNode.childNodes[i].tagName=="skew"){
_c=this.rawNode.childNodes[i];
break;
}
}
}
if(_c){
_c.on="f";
var mt=_b.xx.toFixed(8)+" "+_b.xy.toFixed(8)+" "+_b.yx.toFixed(8)+" "+_b.yy.toFixed(8)+" 0 0",_d=Math.floor(_b.dx).toFixed()+"px "+Math.floor(_b.dy).toFixed()+"px",s=this.rawNode.style,l=parseFloat(s.left),t=parseFloat(s.top),w=parseFloat(s.width),h=parseFloat(s.height);
if(isNaN(l)){
l=0;
}
if(isNaN(t)){
t=0;
}
if(isNaN(w)||!w){
w=1;
}
if(isNaN(h)||!h){
h=1;
}
var _e=(-l/w-0.5).toFixed(8)+" "+(-t/h-0.5).toFixed(8);
_c.matrix=mt;
_c.origin=_e;
_c.offset=_d;
_c.on=true;
}
}
if(this.fillStyle&&this.fillStyle.type=="linear"){
this.setFill(this.fillStyle);
}
return this;
},_setDimensions:function(_f,_10){
return this;
},setRawNode:function(_11){
_11.stroked="f";
_11.filled="f";
this.rawNode=_11;
},_moveToFront:function(){
this.rawNode.parentNode.appendChild(this.rawNode);
return this;
},_moveToBack:function(){
var r=this.rawNode,p=r.parentNode,n=p.firstChild;
p.insertBefore(r,n);
if(n.tagName=="rect"){
n.swapNode(r);
}
return this;
},_getRealMatrix:function(){
return this.parentMatrix?new g.Matrix2D([this.parentMatrix,this.matrix]):this.matrix;
}});
dojo.declare("dojox.gfx.vml.Group",_1.Shape,{constructor:function(){
gs.Container._init.call(this);
},_applyTransform:function(){
var _12=this._getRealMatrix();
for(var i=0;i<this.children.length;++i){
this.children[i]._updateParentMatrix(_12);
}
return this;
},_setDimensions:function(_13,_14){
var r=this.rawNode,rs=r.style,bs=this.bgNode.style;
rs.width=_13;
rs.height=_14;
r.coordsize=_13+" "+_14;
bs.width=_13;
bs.height=_14;
for(var i=0;i<this.children.length;++i){
this.children[i]._setDimensions(_13,_14);
}
return this;
}});
_1.Group.nodeType="group";
dojo.declare("dojox.gfx.vml.Rect",[_1.Shape,gs.Rect],{setShape:function(_15){
var _16=this.shape=g.makeParameters(this.shape,_15);
this.bbox=null;
var r=Math.min(1,(_16.r/Math.min(parseFloat(_16.width),parseFloat(_16.height)))).toFixed(8);
var _17=this.rawNode.parentNode,_18=null;
if(_17){
if(_17.lastChild!==this.rawNode){
for(var i=0;i<_17.childNodes.length;++i){
if(_17.childNodes[i]===this.rawNode){
_18=_17.childNodes[i+1];
break;
}
}
}
_17.removeChild(this.rawNode);
}
if(d.isIE>7){
var _19=this.rawNode.ownerDocument.createElement("v:roundrect");
_19.arcsize=r;
_19.style.display="inline-block";
this.rawNode=_19;
}else{
this.rawNode.arcsize=r;
}
if(_17){
if(_18){
_17.insertBefore(this.rawNode,_18);
}else{
_17.appendChild(this.rawNode);
}
}
var _1a=this.rawNode.style;
_1a.left=_16.x.toFixed();
_1a.top=_16.y.toFixed();
_1a.width=(typeof _16.width=="string"&&_16.width.indexOf("%")>=0)?_16.width:_16.width.toFixed();
_1a.height=(typeof _16.width=="string"&&_16.height.indexOf("%")>=0)?_16.height:_16.height.toFixed();
return this.setTransform(this.matrix).setFill(this.fillStyle).setStroke(this.strokeStyle);
}});
_1.Rect.nodeType="roundrect";
dojo.declare("dojox.gfx.vml.Ellipse",[_1.Shape,gs.Ellipse],{setShape:function(_1b){
var _1c=this.shape=g.makeParameters(this.shape,_1b);
this.bbox=null;
var _1d=this.rawNode.style;
_1d.left=(_1c.cx-_1c.rx).toFixed();
_1d.top=(_1c.cy-_1c.ry).toFixed();
_1d.width=(_1c.rx*2).toFixed();
_1d.height=(_1c.ry*2).toFixed();
return this.setTransform(this.matrix);
}});
_1.Ellipse.nodeType="oval";
dojo.declare("dojox.gfx.vml.Circle",[_1.Shape,gs.Circle],{setShape:function(_1e){
var _1f=this.shape=g.makeParameters(this.shape,_1e);
this.bbox=null;
var _20=this.rawNode.style;
_20.left=(_1f.cx-_1f.r).toFixed();
_20.top=(_1f.cy-_1f.r).toFixed();
_20.width=(_1f.r*2).toFixed();
_20.height=(_1f.r*2).toFixed();
return this;
}});
_1.Circle.nodeType="oval";
dojo.declare("dojox.gfx.vml.Line",[_1.Shape,gs.Line],{constructor:function(_21){
if(_21){
_21.setAttribute("dojoGfxType","line");
}
},setShape:function(_22){
var _23=this.shape=g.makeParameters(this.shape,_22);
this.bbox=null;
this.rawNode.path.v="m"+_23.x1.toFixed()+" "+_23.y1.toFixed()+"l"+_23.x2.toFixed()+" "+_23.y2.toFixed()+"e";
return this.setTransform(this.matrix);
}});
_1.Line.nodeType="shape";
dojo.declare("dojox.gfx.vml.Polyline",[_1.Shape,gs.Polyline],{constructor:function(_24){
if(_24){
_24.setAttribute("dojoGfxType","polyline");
}
},setShape:function(_25,_26){
if(_25&&_25 instanceof Array){
this.shape=g.makeParameters(this.shape,{points:_25});
if(_26&&this.shape.points.length){
this.shape.points.push(this.shape.points[0]);
}
}else{
this.shape=g.makeParameters(this.shape,_25);
}
this.bbox=null;
this._normalizePoints();
var _27=[],p=this.shape.points;
if(p.length>0){
_27.push("m");
_27.push(p[0].x.toFixed(),p[0].y.toFixed());
if(p.length>1){
_27.push("l");
for(var i=1;i<p.length;++i){
_27.push(p[i].x.toFixed(),p[i].y.toFixed());
}
}
}
_27.push("e");
this.rawNode.path.v=_27.join(" ");
return this.setTransform(this.matrix);
}});
_1.Polyline.nodeType="shape";
dojo.declare("dojox.gfx.vml.Image",[_1.Shape,gs.Image],{setShape:function(_28){
var _29=this.shape=g.makeParameters(this.shape,_28);
this.bbox=null;
this.rawNode.firstChild.src=_29.src;
return this.setTransform(this.matrix);
},_applyTransform:function(){
var _2a=this._getRealMatrix(),_2b=this.rawNode,s=_2b.style,_2c=this.shape;
if(_2a){
_2a=m.multiply(_2a,{dx:_2c.x,dy:_2c.y});
}else{
_2a=m.normalize({dx:_2c.x,dy:_2c.y});
}
if(_2a.xy==0&&_2a.yx==0&&_2a.xx>0&&_2a.yy>0){
s.filter="";
s.width=Math.floor(_2a.xx*_2c.width);
s.height=Math.floor(_2a.yy*_2c.height);
s.left=Math.floor(_2a.dx);
s.top=Math.floor(_2a.dy);
}else{
var ps=_2b.parentNode.style;
s.left="0px";
s.top="0px";
s.width=ps.width;
s.height=ps.height;
_2a=m.multiply(_2a,{xx:_2c.width/parseInt(s.width),yy:_2c.height/parseInt(s.height)});
var f=_2b.filters["DXImageTransform.Microsoft.Matrix"];
if(f){
f.M11=_2a.xx;
f.M12=_2a.xy;
f.M21=_2a.yx;
f.M22=_2a.yy;
f.Dx=_2a.dx;
f.Dy=_2a.dy;
}else{
s.filter="progid:DXImageTransform.Microsoft.Matrix(M11="+_2a.xx+", M12="+_2a.xy+", M21="+_2a.yx+", M22="+_2a.yy+", Dx="+_2a.dx+", Dy="+_2a.dy+")";
}
}
return this;
},_setDimensions:function(_2d,_2e){
var r=this.rawNode,f=r.filters["DXImageTransform.Microsoft.Matrix"];
if(f){
var s=r.style;
s.width=_2d;
s.height=_2e;
return this._applyTransform();
}
return this;
}});
_1.Image.nodeType="rect";
dojo.declare("dojox.gfx.vml.Text",[_1.Shape,gs.Text],{constructor:function(_2f){
if(_2f){
_2f.setAttribute("dojoGfxType","text");
}
this.fontStyle=null;
},_alignment:{start:"left",middle:"center",end:"right"},setShape:function(_30){
this.shape=g.makeParameters(this.shape,_30);
this.bbox=null;
var r=this.rawNode,s=this.shape,x=s.x,y=s.y.toFixed(),_31;
switch(s.align){
case "middle":
x-=5;
break;
case "end":
x-=10;
break;
}
_31="m"+x.toFixed()+","+y+"l"+(x+10).toFixed()+","+y+"e";
var p=null,t=null,c=r.childNodes;
for(var i=0;i<c.length;++i){
var tag=c[i].tagName;
if(tag=="path"){
p=c[i];
if(t){
break;
}
}else{
if(tag=="textpath"){
t=c[i];
if(p){
break;
}
}
}
}
if(!p){
p=r.ownerDocument.createElement("v:path");
r.appendChild(p);
}
if(!t){
t=r.ownerDocument.createElement("v:textpath");
r.appendChild(t);
}
p.v=_31;
p.textPathOk=true;
t.on=true;
var a=_1.text_alignment[s.align];
t.style["v-text-align"]=a?a:"left";
t.style["text-decoration"]=s.decoration;
t.style["v-rotate-letters"]=s.rotated;
t.style["v-text-kern"]=s.kerning;
t.string=s.text;
return this.setTransform(this.matrix);
},_setFont:function(){
var f=this.fontStyle,c=this.rawNode.childNodes;
for(var i=0;i<c.length;++i){
if(c[i].tagName=="textpath"){
c[i].style.font=g.makeFontString(f);
break;
}
}
this.setTransform(this.matrix);
},_getRealMatrix:function(){
var _32=this.inherited(arguments);
if(_32){
_32=m.multiply(_32,{dy:-g.normalizedLength(this.fontStyle?this.fontStyle.size:"10pt")*0.35});
}
return _32;
},getTextWidth:function(){
var _33=this.rawNode,_34=_33.style.display;
_33.style.display="inline";
var _35=g.pt2px(parseFloat(_33.currentStyle.width));
_33.style.display=_34;
return _35;
}});
_1.Text.nodeType="shape";
dojo.declare("dojox.gfx.vml.Path",[_1.Shape,g.path.Path],{constructor:function(_36){
if(_36&&!_36.getAttribute("dojoGfxType")){
_36.setAttribute("dojoGfxType","path");
}
this.vmlPath="";
this.lastControl={};
},_updateWithSegment:function(_37){
var _38=d.clone(this.last);
this.inherited(arguments);
if(arguments.length>1){
return;
}
var _39=this[this.renderers[_37.action]](_37,_38);
if(typeof this.vmlPath=="string"){
this.vmlPath+=_39.join("");
this.rawNode.path.v=this.vmlPath+" r0,0 e";
}else{
Array.prototype.push.apply(this.vmlPath,_39);
}
},setShape:function(_3a){
this.vmlPath=[];
this.lastControl.type="";
this.inherited(arguments);
this.vmlPath=this.vmlPath.join("");
this.rawNode.path.v=this.vmlPath+" r0,0 e";
return this;
},_pathVmlToSvgMap:{m:"M",l:"L",t:"m",r:"l",c:"C",v:"c",qb:"Q",x:"z",e:""},renderers:{M:"_moveToA",m:"_moveToR",L:"_lineToA",l:"_lineToR",H:"_hLineToA",h:"_hLineToR",V:"_vLineToA",v:"_vLineToR",C:"_curveToA",c:"_curveToR",S:"_smoothCurveToA",s:"_smoothCurveToR",Q:"_qCurveToA",q:"_qCurveToR",T:"_qSmoothCurveToA",t:"_qSmoothCurveToR",A:"_arcTo",a:"_arcTo",Z:"_closePath",z:"_closePath"},_addArgs:function(_3b,_3c,_3d,_3e){
var n=_3c instanceof Array?_3c:_3c.args;
for(var i=_3d;i<_3e;++i){
_3b.push(" ",n[i].toFixed());
}
},_adjustRelCrd:function(_3f,_40,_41){
var n=_40 instanceof Array?_40:_40.args,l=n.length,_42=new Array(l),i=0,x=_3f.x,y=_3f.y;
if(typeof x!="number"){
_42[0]=x=n[0];
_42[1]=y=n[1];
i=2;
}
if(typeof _41=="number"&&_41!=2){
var j=_41;
while(j<=l){
for(;i<j;i+=2){
_42[i]=x+n[i];
_42[i+1]=y+n[i+1];
}
x=_42[j-2];
y=_42[j-1];
j+=_41;
}
}else{
for(;i<l;i+=2){
_42[i]=(x+=n[i]);
_42[i+1]=(y+=n[i+1]);
}
}
return _42;
},_adjustRelPos:function(_43,_44){
var n=_44 instanceof Array?_44:_44.args,l=n.length,_45=new Array(l);
for(var i=0;i<l;++i){
_45[i]=(_43+=n[i]);
}
return _45;
},_moveToA:function(_46){
var p=[" m"],n=_46 instanceof Array?_46:_46.args,l=n.length;
this._addArgs(p,n,0,2);
if(l>2){
p.push(" l");
this._addArgs(p,n,2,l);
}
this.lastControl.type="";
return p;
},_moveToR:function(_47,_48){
return this._moveToA(this._adjustRelCrd(_48,_47));
},_lineToA:function(_49){
var p=[" l"],n=_49 instanceof Array?_49:_49.args;
this._addArgs(p,n,0,n.length);
this.lastControl.type="";
return p;
},_lineToR:function(_4a,_4b){
return this._lineToA(this._adjustRelCrd(_4b,_4a));
},_hLineToA:function(_4c,_4d){
var p=[" l"],y=" "+_4d.y.toFixed(),n=_4c instanceof Array?_4c:_4c.args,l=n.length;
for(var i=0;i<l;++i){
p.push(" ",n[i].toFixed(),y);
}
this.lastControl.type="";
return p;
},_hLineToR:function(_4e,_4f){
return this._hLineToA(this._adjustRelPos(_4f.x,_4e),_4f);
},_vLineToA:function(_50,_51){
var p=[" l"],x=" "+_51.x.toFixed(),n=_50 instanceof Array?_50:_50.args,l=n.length;
for(var i=0;i<l;++i){
p.push(x," ",n[i].toFixed());
}
this.lastControl.type="";
return p;
},_vLineToR:function(_52,_53){
return this._vLineToA(this._adjustRelPos(_53.y,_52),_53);
},_curveToA:function(_54){
var p=[],n=_54 instanceof Array?_54:_54.args,l=n.length,lc=this.lastControl;
for(var i=0;i<l;i+=6){
p.push(" c");
this._addArgs(p,n,i,i+6);
}
lc.x=n[l-4];
lc.y=n[l-3];
lc.type="C";
return p;
},_curveToR:function(_55,_56){
return this._curveToA(this._adjustRelCrd(_56,_55,6));
},_smoothCurveToA:function(_57,_58){
var p=[],n=_57 instanceof Array?_57:_57.args,l=n.length,lc=this.lastControl,i=0;
if(lc.type!="C"){
p.push(" c");
this._addArgs(p,[_58.x,_58.y],0,2);
this._addArgs(p,n,0,4);
lc.x=n[0];
lc.y=n[1];
lc.type="C";
i=4;
}
for(;i<l;i+=4){
p.push(" c");
this._addArgs(p,[2*_58.x-lc.x,2*_58.y-lc.y],0,2);
this._addArgs(p,n,i,i+4);
lc.x=n[i];
lc.y=n[i+1];
}
return p;
},_smoothCurveToR:function(_59,_5a){
return this._smoothCurveToA(this._adjustRelCrd(_5a,_59,4),_5a);
},_qCurveToA:function(_5b){
var p=[],n=_5b instanceof Array?_5b:_5b.args,l=n.length,lc=this.lastControl;
for(var i=0;i<l;i+=4){
p.push(" qb");
this._addArgs(p,n,i,i+4);
}
lc.x=n[l-4];
lc.y=n[l-3];
lc.type="Q";
return p;
},_qCurveToR:function(_5c,_5d){
return this._qCurveToA(this._adjustRelCrd(_5d,_5c,4));
},_qSmoothCurveToA:function(_5e,_5f){
var p=[],n=_5e instanceof Array?_5e:_5e.args,l=n.length,lc=this.lastControl,i=0;
if(lc.type!="Q"){
p.push(" qb");
this._addArgs(p,[lc.x=_5f.x,lc.y=_5f.y],0,2);
lc.type="Q";
this._addArgs(p,n,0,2);
i=2;
}
for(;i<l;i+=2){
p.push(" qb");
this._addArgs(p,[lc.x=2*_5f.x-lc.x,lc.y=2*_5f.y-lc.y],0,2);
this._addArgs(p,n,i,i+2);
}
return p;
},_qSmoothCurveToR:function(_60,_61){
return this._qSmoothCurveToA(this._adjustRelCrd(_61,_60,2),_61);
},_arcTo:function(_62,_63){
var p=[],n=_62.args,l=n.length,_64=_62.action=="a";
for(var i=0;i<l;i+=7){
var x1=n[i+5],y1=n[i+6];
if(_64){
x1+=_63.x;
y1+=_63.y;
}
var _65=g.arc.arcAsBezier(_63,n[i],n[i+1],n[i+2],n[i+3]?1:0,n[i+4]?1:0,x1,y1);
for(var j=0;j<_65.length;++j){
p.push(" c");
var t=_65[j];
this._addArgs(p,t,0,t.length);
this._updateBBox(t[0],t[1]);
this._updateBBox(t[2],t[3]);
this._updateBBox(t[4],t[5]);
}
_63.x=x1;
_63.y=y1;
}
this.lastControl.type="";
return p;
},_closePath:function(){
this.lastControl.type="";
return ["x"];
}});
_1.Path.nodeType="shape";
dojo.declare("dojox.gfx.vml.TextPath",[_1.Path,g.path.TextPath],{constructor:function(_66){
if(_66){
_66.setAttribute("dojoGfxType","textpath");
}
this.fontStyle=null;
if(!("text" in this)){
this.text=d.clone(g.defaultTextPath);
}
if(!("fontStyle" in this)){
this.fontStyle=d.clone(g.defaultFont);
}
},setText:function(_67){
this.text=g.makeParameters(this.text,typeof _67=="string"?{text:_67}:_67);
this._setText();
return this;
},setFont:function(_68){
this.fontStyle=typeof _68=="string"?g.splitFontString(_68):g.makeParameters(g.defaultFont,_68);
this._setFont();
return this;
},_setText:function(){
this.bbox=null;
var r=this.rawNode,s=this.text,p=null,t=null,c=r.childNodes;
for(var i=0;i<c.length;++i){
var tag=c[i].tagName;
if(tag=="path"){
p=c[i];
if(t){
break;
}
}else{
if(tag=="textpath"){
t=c[i];
if(p){
break;
}
}
}
}
if(!p){
p=this.rawNode.ownerDocument.createElement("v:path");
r.appendChild(p);
}
if(!t){
t=this.rawNode.ownerDocument.createElement("v:textpath");
r.appendChild(t);
}
p.textPathOk=true;
t.on=true;
var a=_1.text_alignment[s.align];
t.style["v-text-align"]=a?a:"left";
t.style["text-decoration"]=s.decoration;
t.style["v-rotate-letters"]=s.rotated;
t.style["v-text-kern"]=s.kerning;
t.string=s.text;
},_setFont:function(){
var f=this.fontStyle,c=this.rawNode.childNodes;
for(var i=0;i<c.length;++i){
if(c[i].tagName=="textpath"){
c[i].style.font=g.makeFontString(f);
break;
}
}
}});
_1.TextPath.nodeType="shape";
dojo.declare("dojox.gfx.vml.Surface",gs.Surface,{constructor:function(){
gs.Container._init.call(this);
},setDimensions:function(_69,_6a){
this.width=g.normalizedLength(_69);
this.height=g.normalizedLength(_6a);
if(!this.rawNode){
return this;
}
var cs=this.clipNode.style,r=this.rawNode,rs=r.style,bs=this.bgNode.style,ps=this._parent.style,i;
ps.width=_69;
ps.height=_6a;
cs.width=_69;
cs.height=_6a;
cs.clip="rect(0px "+_69+"px "+_6a+"px 0px)";
rs.width=_69;
rs.height=_6a;
r.coordsize=_69+" "+_6a;
bs.width=_69;
bs.height=_6a;
for(i=0;i<this.children.length;++i){
this.children[i]._setDimensions(_69,_6a);
}
return this;
},getDimensions:function(){
var t=this.rawNode?{width:g.normalizedLength(this.rawNode.style.width),height:g.normalizedLength(this.rawNode.style.height)}:null;
if(t.width<=0){
t.width=this.width;
}
if(t.height<=0){
t.height=this.height;
}
return t;
}});
_1.createSurface=function(_6b,_6c,_6d){
if(!_6c&&!_6d){
var pos=d.position(_6b);
_6c=_6c||pos.w;
_6d=_6d||pos.h;
}
if(typeof _6c=="number"){
_6c=_6c+"px";
}
if(typeof _6d=="number"){
_6d=_6d+"px";
}
var s=new _1.Surface(),p=d.byId(_6b),c=s.clipNode=p.ownerDocument.createElement("div"),r=s.rawNode=p.ownerDocument.createElement("v:group"),cs=c.style,rs=r.style;
if(d.isIE>7){
rs.display="inline-block";
}
s._parent=p;
s._nodes.push(c);
p.style.width=_6c;
p.style.height=_6d;
cs.position="absolute";
cs.width=_6c;
cs.height=_6d;
cs.clip="rect(0px "+_6c+" "+_6d+" 0px)";
rs.position="absolute";
rs.width=_6c;
rs.height=_6d;
r.coordsize=(_6c==="100%"?_6c:parseFloat(_6c))+" "+(_6d==="100%"?_6d:parseFloat(_6d));
r.coordorigin="0 0";
var b=s.bgNode=r.ownerDocument.createElement("v:rect"),bs=b.style;
bs.left=bs.top=0;
bs.width=rs.width;
bs.height=rs.height;
b.filled=b.stroked="f";
r.appendChild(b);
c.appendChild(r);
p.appendChild(c);
s.width=g.normalizedLength(_6c);
s.height=g.normalizedLength(_6d);
return s;
};
function _6e(_6f,f,o){
o=o||d.global;
f.call(o,_6f);
if(_6f instanceof g.Surface||_6f instanceof g.Group){
d.forEach(_6f.children,function(_70){
_6e(_70,f,o);
});
}
};
var C=gs.Container,_71={add:function(_72){
if(this!=_72.getParent()){
var _73=_72.getParent();
if(_73){
_73.remove(_72);
}
this.rawNode.appendChild(_72.rawNode);
C.add.apply(this,arguments);
_6e(this,function(s){
if(typeof (s.getFont)=="function"){
s.setShape(s.getShape());
s.setFont(s.getFont());
}
if(typeof (s.setFill)=="function"){
s.setFill(s.getFill());
s.setStroke(s.getStroke());
}
});
}
return this;
},remove:function(_74,_75){
if(this==_74.getParent()){
if(this.rawNode==_74.rawNode.parentNode){
this.rawNode.removeChild(_74.rawNode);
}
C.remove.apply(this,arguments);
}
return this;
},clear:function(){
var r=this.rawNode;
while(r.firstChild!=r.lastChild){
if(r.firstChild!=this.bgNode){
r.removeChild(r.firstChild);
}
if(r.lastChild!=this.bgNode){
r.removeChild(r.lastChild);
}
}
return C.clear.apply(this,arguments);
},_moveChildToFront:C._moveChildToFront,_moveChildToBack:C._moveChildToBack};
var _76={createGroup:function(){
var _77=this.createObject(_1.Group,null);
var r=_77.rawNode.ownerDocument.createElement("v:rect");
r.style.left=r.style.top=0;
r.style.width=_77.rawNode.style.width;
r.style.height=_77.rawNode.style.height;
r.filled=r.stroked="f";
_77.rawNode.appendChild(r);
_77.bgNode=r;
return _77;
},createImage:function(_78){
if(!this.rawNode){
return null;
}
var _79=new _1.Image(),doc=this.rawNode.ownerDocument,_7a=doc.createElement("v:rect");
_7a.stroked="f";
_7a.style.width=this.rawNode.style.width;
_7a.style.height=this.rawNode.style.height;
var img=doc.createElement("v:imagedata");
_7a.appendChild(img);
_79.setRawNode(_7a);
this.rawNode.appendChild(_7a);
_79.setShape(_78);
this.add(_79);
return _79;
},createRect:function(_7b){
if(!this.rawNode){
return null;
}
var _7c=new _1.Rect,_7d=this.rawNode.ownerDocument.createElement("v:roundrect");
if(d.isIE>7){
_7d.style.display="inline-block";
}
_7c.setRawNode(_7d);
this.rawNode.appendChild(_7d);
_7c.setShape(_7b);
this.add(_7c);
return _7c;
},createObject:function(_7e,_7f){
if(!this.rawNode){
return null;
}
var _80=new _7e(),_81=this.rawNode.ownerDocument.createElement("v:"+_7e.nodeType);
_80.setRawNode(_81);
this.rawNode.appendChild(_81);
switch(_7e){
case _1.Group:
case _1.Line:
case _1.Polyline:
case _1.Image:
case _1.Text:
case _1.Path:
case _1.TextPath:
this._overrideSize(_81);
}
_80.setShape(_7f);
this.add(_80);
return _80;
},_overrideSize:function(_82){
var s=this.rawNode.style,w=s.width,h=s.height;
_82.style.width=w;
_82.style.height=h;
_82.coordsize=parseInt(w)+" "+parseInt(h);
}};
d.extend(_1.Group,_71);
d.extend(_1.Group,gs.Creator);
d.extend(_1.Group,_76);
d.extend(_1.Surface,_71);
d.extend(_1.Surface,gs.Creator);
d.extend(_1.Surface,_76);
if(g.loadAndSwitch==="vml"){
g.switchTo("vml");
delete g.loadAndSwitch;
}
})();
}
