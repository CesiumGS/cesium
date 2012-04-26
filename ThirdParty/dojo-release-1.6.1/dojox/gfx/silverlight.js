/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.silverlight"]){
dojo._hasResource["dojox.gfx.silverlight"]=true;
dojo.provide("dojox.gfx.silverlight");
dojo.require("dojox.gfx._base");
dojo.require("dojox.gfx.shape");
dojo.require("dojox.gfx.path");
dojo.experimental("dojox.gfx.silverlight");
(function(){
var d=dojo,g=dojox.gfx,gs=g.shape,sl=g.silverlight;
var _1={solid:"none",shortdash:[4,1],shortdot:[1,1],shortdashdot:[4,1,1,1],shortdashdotdot:[4,1,1,1,1,1],dot:[1,3],dash:[4,3],longdash:[8,3],dashdot:[4,3,1,3],longdashdot:[8,3,1,3],longdashdotdot:[8,3,1,3,1,3]},_2={normal:400,bold:700},_3={butt:"Flat",round:"Round",square:"Square"},_4={bevel:"Bevel",round:"Round"},_5={serif:"Times New Roman",times:"Times New Roman","sans-serif":"Arial",helvetica:"Arial",monotone:"Courier New",courier:"Courier New"};
function _6(_7){
var c=g.normalizeColor(_7),t=c.toHex(),a=Math.round(c.a*255);
a=(a<0?0:a>255?255:a).toString(16);
return "#"+(a.length<2?"0"+a:a)+t.slice(1);
};
d.declare("dojox.gfx.silverlight.Shape",gs.Shape,{setFill:function(_8){
var p=this.rawNode.getHost().content,r=this.rawNode,f;
if(!_8){
this.fillStyle=null;
this._setFillAttr(null);
return this;
}
if(typeof (_8)=="object"&&"type" in _8){
switch(_8.type){
case "linear":
this.fillStyle=f=g.makeParameters(g.defaultLinearGradient,_8);
var _9=p.createFromXaml("<LinearGradientBrush/>");
_9.mappingMode="Absolute";
_9.startPoint=f.x1+","+f.y1;
_9.endPoint=f.x2+","+f.y2;
d.forEach(f.colors,function(c){
var t=p.createFromXaml("<GradientStop/>");
t.offset=c.offset;
t.color=_6(c.color);
_9.gradientStops.add(t);
});
this._setFillAttr(_9);
break;
case "radial":
this.fillStyle=f=g.makeParameters(g.defaultRadialGradient,_8);
var _a=p.createFromXaml("<RadialGradientBrush/>"),c=g.matrix.multiplyPoint(g.matrix.invert(this._getAdjustedMatrix()),f.cx,f.cy),pt=c.x+","+c.y;
_a.mappingMode="Absolute";
_a.gradientOrigin=pt;
_a.center=pt;
_a.radiusX=_a.radiusY=f.r;
d.forEach(f.colors,function(c){
var t=p.createFromXaml("<GradientStop/>");
t.offset=c.offset;
t.color=_6(c.color);
_a.gradientStops.add(t);
});
this._setFillAttr(_a);
break;
case "pattern":
this.fillStyle=null;
this._setFillAttr(null);
break;
}
return this;
}
this.fillStyle=f=g.normalizeColor(_8);
var _b=p.createFromXaml("<SolidColorBrush/>");
_b.color=f.toHex();
_b.opacity=f.a;
this._setFillAttr(_b);
return this;
},_setFillAttr:function(f){
this.rawNode.fill=f;
},setStroke:function(_c){
var p=this.rawNode.getHost().content,r=this.rawNode;
if(!_c){
this.strokeStyle=null;
r.stroke=null;
return this;
}
if(typeof _c=="string"||d.isArray(_c)||_c instanceof d.Color){
_c={color:_c};
}
var s=this.strokeStyle=g.makeParameters(g.defaultStroke,_c);
s.color=g.normalizeColor(s.color);
if(s){
var _d=p.createFromXaml("<SolidColorBrush/>");
_d.color=s.color.toHex();
_d.opacity=s.color.a;
r.stroke=_d;
r.strokeThickness=s.width;
r.strokeStartLineCap=r.strokeEndLineCap=r.strokeDashCap=_3[s.cap];
if(typeof s.join=="number"){
r.strokeLineJoin="Miter";
r.strokeMiterLimit=s.join;
}else{
r.strokeLineJoin=_4[s.join];
}
var da=s.style.toLowerCase();
if(da in _1){
da=_1[da];
}
if(da instanceof Array){
da=d.clone(da);
var i;
if(s.cap!="butt"){
for(i=0;i<da.length;i+=2){
--da[i];
if(da[i]<1){
da[i]=1;
}
}
for(i=1;i<da.length;i+=2){
++da[i];
}
}
r.strokeDashArray=da.join(",");
}else{
r.strokeDashArray=null;
}
}
return this;
},_getParentSurface:function(){
var _e=this.parent;
for(;_e&&!(_e instanceof g.Surface);_e=_e.parent){
}
return _e;
},_applyTransform:function(){
var tm=this._getAdjustedMatrix(),r=this.rawNode;
if(tm){
var p=this.rawNode.getHost().content,mt=p.createFromXaml("<MatrixTransform/>"),mm=p.createFromXaml("<Matrix/>");
mm.m11=tm.xx;
mm.m21=tm.xy;
mm.m12=tm.yx;
mm.m22=tm.yy;
mm.offsetX=tm.dx;
mm.offsetY=tm.dy;
mt.matrix=mm;
r.renderTransform=mt;
}else{
r.renderTransform=null;
}
return this;
},setRawNode:function(_f){
_f.fill=null;
_f.stroke=null;
this.rawNode=_f;
},_moveToFront:function(){
var c=this.parent.rawNode.children,r=this.rawNode;
c.remove(r);
c.add(r);
return this;
},_moveToBack:function(){
var c=this.parent.rawNode.children,r=this.rawNode;
c.remove(r);
c.insert(0,r);
return this;
},_getAdjustedMatrix:function(){
return this.matrix;
}});
d.declare("dojox.gfx.silverlight.Group",sl.Shape,{constructor:function(){
gs.Container._init.call(this);
},setRawNode:function(_10){
this.rawNode=_10;
}});
sl.Group.nodeType="Canvas";
d.declare("dojox.gfx.silverlight.Rect",[sl.Shape,gs.Rect],{setShape:function(_11){
this.shape=g.makeParameters(this.shape,_11);
this.bbox=null;
var r=this.rawNode,n=this.shape;
r.width=n.width;
r.height=n.height;
r.radiusX=r.radiusY=n.r;
return this._applyTransform();
},_getAdjustedMatrix:function(){
var _12=this.matrix,s=this.shape,_13={dx:s.x,dy:s.y};
return new g.Matrix2D(_12?[_12,_13]:_13);
}});
sl.Rect.nodeType="Rectangle";
d.declare("dojox.gfx.silverlight.Ellipse",[sl.Shape,gs.Ellipse],{setShape:function(_14){
this.shape=g.makeParameters(this.shape,_14);
this.bbox=null;
var r=this.rawNode,n=this.shape;
r.width=2*n.rx;
r.height=2*n.ry;
return this._applyTransform();
},_getAdjustedMatrix:function(){
var _15=this.matrix,s=this.shape,_16={dx:s.cx-s.rx,dy:s.cy-s.ry};
return new g.Matrix2D(_15?[_15,_16]:_16);
}});
sl.Ellipse.nodeType="Ellipse";
d.declare("dojox.gfx.silverlight.Circle",[sl.Shape,gs.Circle],{setShape:function(_17){
this.shape=g.makeParameters(this.shape,_17);
this.bbox=null;
var r=this.rawNode,n=this.shape;
r.width=r.height=2*n.r;
return this._applyTransform();
},_getAdjustedMatrix:function(){
var _18=this.matrix,s=this.shape,_19={dx:s.cx-s.r,dy:s.cy-s.r};
return new g.Matrix2D(_18?[_18,_19]:_19);
}});
sl.Circle.nodeType="Ellipse";
d.declare("dojox.gfx.silverlight.Line",[sl.Shape,gs.Line],{setShape:function(_1a){
this.shape=g.makeParameters(this.shape,_1a);
this.bbox=null;
var r=this.rawNode,n=this.shape;
r.x1=n.x1;
r.y1=n.y1;
r.x2=n.x2;
r.y2=n.y2;
return this;
}});
sl.Line.nodeType="Line";
d.declare("dojox.gfx.silverlight.Polyline",[sl.Shape,gs.Polyline],{setShape:function(_1b,_1c){
if(_1b&&_1b instanceof Array){
this.shape=g.makeParameters(this.shape,{points:_1b});
if(_1c&&this.shape.points.length){
this.shape.points.push(this.shape.points[0]);
}
}else{
this.shape=g.makeParameters(this.shape,_1b);
}
this.bbox=null;
this._normalizePoints();
var p=this.shape.points,rp=[];
for(var i=0;i<p.length;++i){
rp.push(p[i].x,p[i].y);
}
this.rawNode.points=rp.join(",");
return this;
}});
sl.Polyline.nodeType="Polyline";
d.declare("dojox.gfx.silverlight.Image",[sl.Shape,gs.Image],{setShape:function(_1d){
this.shape=g.makeParameters(this.shape,_1d);
this.bbox=null;
var r=this.rawNode,n=this.shape;
r.width=n.width;
r.height=n.height;
r.source=n.src;
return this._applyTransform();
},_getAdjustedMatrix:function(){
var _1e=this.matrix,s=this.shape,_1f={dx:s.x,dy:s.y};
return new g.Matrix2D(_1e?[_1e,_1f]:_1f);
},setRawNode:function(_20){
this.rawNode=_20;
}});
sl.Image.nodeType="Image";
d.declare("dojox.gfx.silverlight.Text",[sl.Shape,gs.Text],{setShape:function(_21){
this.shape=g.makeParameters(this.shape,_21);
this.bbox=null;
var r=this.rawNode,s=this.shape;
r.text=s.text;
r.textDecorations=s.decoration==="underline"?"Underline":"None";
r["Canvas.Left"]=-10000;
r["Canvas.Top"]=-10000;
if(!this._delay){
this._delay=window.setTimeout(d.hitch(this,"_delayAlignment"),10);
}
return this;
},_delayAlignment:function(){
var r=this.rawNode,s=this.shape,w,h;
try{
w=r.actualWidth;
h=r.actualHeight;
}
catch(e){
return;
}
var x=s.x,y=s.y-h*0.75;
switch(s.align){
case "middle":
x-=w/2;
break;
case "end":
x-=w;
break;
}
this._delta={dx:x,dy:y};
r["Canvas.Left"]=0;
r["Canvas.Top"]=0;
this._applyTransform();
delete this._delay;
},_getAdjustedMatrix:function(){
var _22=this.matrix,_23=this._delta,x;
if(_22){
x=_23?[_22,_23]:_22;
}else{
x=_23?_23:{};
}
return new g.Matrix2D(x);
},setStroke:function(){
return this;
},_setFillAttr:function(f){
this.rawNode.foreground=f;
},setRawNode:function(_24){
this.rawNode=_24;
},getTextWidth:function(){
return this.rawNode.actualWidth;
}});
sl.Text.nodeType="TextBlock";
d.declare("dojox.gfx.silverlight.Path",[sl.Shape,g.path.Path],{_updateWithSegment:function(_25){
this.inherited(arguments);
var p=this.shape.path;
if(typeof (p)=="string"){
this.rawNode.data=p?p:null;
}
},setShape:function(_26){
this.inherited(arguments);
var p=this.shape.path;
this.rawNode.data=p?p:null;
return this;
}});
sl.Path.nodeType="Path";
d.declare("dojox.gfx.silverlight.TextPath",[sl.Shape,g.path.TextPath],{_updateWithSegment:function(_27){
},setShape:function(_28){
},_setText:function(){
}});
sl.TextPath.nodeType="text";
var _29={},_2a=new Function;
d.declare("dojox.gfx.silverlight.Surface",gs.Surface,{constructor:function(){
gs.Container._init.call(this);
},destroy:function(){
window[this._onLoadName]=_2a;
delete _29[this._nodeName];
this.inherited(arguments);
},setDimensions:function(_2b,_2c){
this.width=g.normalizedLength(_2b);
this.height=g.normalizedLength(_2c);
var p=this.rawNode&&this.rawNode.getHost();
if(p){
p.width=_2b;
p.height=_2c;
}
return this;
},getDimensions:function(){
var p=this.rawNode&&this.rawNode.getHost();
var t=p?{width:p.content.actualWidth,height:p.content.actualHeight}:null;
if(t.width<=0){
t.width=this.width;
}
if(t.height<=0){
t.height=this.height;
}
return t;
}});
sl.createSurface=function(_2d,_2e,_2f){
if(!_2e&&!_2f){
var pos=d.position(_2d);
_2e=_2e||pos.w;
_2f=_2f||pos.h;
}
if(typeof _2e=="number"){
_2e=_2e+"px";
}
if(typeof _2f=="number"){
_2f=_2f+"px";
}
var s=new sl.Surface();
_2d=d.byId(_2d);
s._parent=_2d;
s._nodeName=g._base._getUniqueId();
var t=_2d.ownerDocument.createElement("script");
t.type="text/xaml";
t.id=g._base._getUniqueId();
t.text="<?xml version='1.0'?><Canvas xmlns='http://schemas.microsoft.com/client/2007' Name='"+s._nodeName+"'/>";
_2d.parentNode.insertBefore(t,_2d);
s._nodes.push(t);
var obj,_30=g._base._getUniqueId(),_31="__"+g._base._getUniqueId()+"_onLoad";
s._onLoadName=_31;
window[_31]=function(_32){
if(!s.rawNode){
s.rawNode=d.byId(_30).content.root;
_29[s._nodeName]=_2d;
s.onLoad(s);
}
};
if(d.isSafari){
obj="<embed type='application/x-silverlight' id='"+_30+"' width='"+_2e+"' height='"+_2f+" background='transparent'"+" source='#"+t.id+"'"+" windowless='true'"+" maxFramerate='60'"+" onLoad='"+_31+"'"+" onError='__dojoSilverlightError'"+" /><iframe style='visibility:hidden;height:0;width:0'/>";
}else{
obj="<object type='application/x-silverlight' data='data:application/x-silverlight,' id='"+_30+"' width='"+_2e+"' height='"+_2f+"'>"+"<param name='background' value='transparent' />"+"<param name='source' value='#"+t.id+"' />"+"<param name='windowless' value='true' />"+"<param name='maxFramerate' value='60' />"+"<param name='onLoad' value='"+_31+"' />"+"<param name='onError' value='__dojoSilverlightError' />"+"</object>";
}
_2d.innerHTML=obj;
var _33=d.byId(_30);
if(_33.content&&_33.content.root){
s.rawNode=_33.content.root;
_29[s._nodeName]=_2d;
}else{
s.rawNode=null;
s.isLoaded=false;
}
s._nodes.push(_33);
s.width=g.normalizedLength(_2e);
s.height=g.normalizedLength(_2f);
return s;
};
__dojoSilverlightError=function(_34,err){
var t="Silverlight Error:\n"+"Code: "+err.ErrorCode+"\n"+"Type: "+err.ErrorType+"\n"+"Message: "+err.ErrorMessage+"\n";
switch(err.ErrorType){
case "ParserError":
t+="XamlFile: "+err.xamlFile+"\n"+"Line: "+err.lineNumber+"\n"+"Position: "+err.charPosition+"\n";
break;
case "RuntimeError":
t+="MethodName: "+err.methodName+"\n";
if(err.lineNumber!=0){
t+="Line: "+err.lineNumber+"\n"+"Position: "+err.charPosition+"\n";
}
break;
}
};
var _35={_setFont:function(){
var f=this.fontStyle,r=this.rawNode,t=f.family.toLowerCase();
r.fontStyle=f.style=="italic"?"Italic":"Normal";
r.fontWeight=f.weight in _2?_2[f.weight]:f.weight;
r.fontSize=g.normalizedLength(f.size);
r.fontFamily=t in _5?_5[t]:f.family;
if(!this._delay){
this._delay=window.setTimeout(d.hitch(this,"_delayAlignment"),10);
}
}};
var C=gs.Container,_36={add:function(_37){
if(this!=_37.getParent()){
C.add.apply(this,arguments);
this.rawNode.children.add(_37.rawNode);
}
return this;
},remove:function(_38,_39){
if(this==_38.getParent()){
var _3a=_38.rawNode.getParent();
if(_3a){
_3a.children.remove(_38.rawNode);
}
C.remove.apply(this,arguments);
}
return this;
},clear:function(){
this.rawNode.children.clear();
return C.clear.apply(this,arguments);
},_moveChildToFront:C._moveChildToFront,_moveChildToBack:C._moveChildToBack};
var _3b={createObject:function(_3c,_3d){
if(!this.rawNode){
return null;
}
var _3e=new _3c();
var _3f=this.rawNode.getHost().content.createFromXaml("<"+_3c.nodeType+"/>");
_3e.setRawNode(_3f);
_3e.setShape(_3d);
this.add(_3e);
return _3e;
}};
d.extend(sl.Text,_35);
d.extend(sl.Group,_36);
d.extend(sl.Group,gs.Creator);
d.extend(sl.Group,_3b);
d.extend(sl.Surface,_36);
d.extend(sl.Surface,gs.Creator);
d.extend(sl.Surface,_3b);
function _40(s,a){
var ev={target:s,currentTarget:s,preventDefault:function(){
},stopPropagation:function(){
}};
try{
if(a.source){
ev.target=a.source;
}
}
catch(e){
}
if(a){
try{
ev.ctrlKey=a.ctrl;
ev.shiftKey=a.shift;
var p=a.getPosition(null);
ev.x=ev.offsetX=ev.layerX=p.x;
ev.y=ev.offsetY=ev.layerY=p.y;
var _41=_29[s.getHost().content.root.name];
var t=d.position(_41);
ev.clientX=t.x+p.x;
ev.clientY=t.y+p.y;
}
catch(e){
}
}
return ev;
};
function _42(s,a){
var ev={keyCode:a.platformKeyCode,ctrlKey:a.ctrl,shiftKey:a.shift};
try{
if(a.source){
ev.target=a.source;
}
}
catch(e){
}
return ev;
};
var _43={onclick:{name:"MouseLeftButtonUp",fix:_40},onmouseenter:{name:"MouseEnter",fix:_40},onmouseleave:{name:"MouseLeave",fix:_40},onmouseover:{name:"MouseEnter",fix:_40},onmouseout:{name:"MouseLeave",fix:_40},onmousedown:{name:"MouseLeftButtonDown",fix:_40},onmouseup:{name:"MouseLeftButtonUp",fix:_40},onmousemove:{name:"MouseMove",fix:_40},onkeydown:{name:"KeyDown",fix:_42},onkeyup:{name:"KeyUp",fix:_42}};
var _44={connect:function(_45,_46,_47){
var _48,n=_45 in _43?_43[_45]:{name:_45,fix:function(){
return {};
}};
if(arguments.length>2){
_48=this.getEventSource().addEventListener(n.name,function(s,a){
d.hitch(_46,_47)(n.fix(s,a));
});
}else{
_48=this.getEventSource().addEventListener(n.name,function(s,a){
_46(n.fix(s,a));
});
}
return {name:n.name,token:_48};
},disconnect:function(_49){
try{
this.getEventSource().removeEventListener(_49.name,_49.token);
}
catch(e){
}
}};
d.extend(sl.Shape,_44);
d.extend(sl.Surface,_44);
g.equalSources=function(a,b){
return a&&b&&a.equals(b);
};
if(g.loadAndSwitch==="silverlight"){
g.switchTo("silverlight");
delete g.loadAndSwitch;
}
})();
}
