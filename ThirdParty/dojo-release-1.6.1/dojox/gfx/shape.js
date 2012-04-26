/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.shape"]){
dojo._hasResource["dojox.gfx.shape"]=true;
dojo.provide("dojox.gfx.shape");
dojo.require("dojox.gfx._base");
dojo.declare("dojox.gfx.shape.Shape",null,{constructor:function(){
this.rawNode=null;
this.shape=null;
this.matrix=null;
this.fillStyle=null;
this.strokeStyle=null;
this.bbox=null;
this.parent=null;
this.parentMatrix=null;
},getNode:function(){
return this.rawNode;
},getShape:function(){
return this.shape;
},getTransform:function(){
return this.matrix;
},getFill:function(){
return this.fillStyle;
},getStroke:function(){
return this.strokeStyle;
},getParent:function(){
return this.parent;
},getBoundingBox:function(){
return this.bbox;
},getTransformedBoundingBox:function(){
var b=this.getBoundingBox();
if(!b){
return null;
}
var m=this._getRealMatrix();
gm=dojox.gfx.matrix;
return [gm.multiplyPoint(m,b.x,b.y),gm.multiplyPoint(m,b.x+b.width,b.y),gm.multiplyPoint(m,b.x+b.width,b.y+b.height),gm.multiplyPoint(m,b.x,b.y+b.height)];
},getEventSource:function(){
return this.rawNode;
},setShape:function(_1){
this.shape=dojox.gfx.makeParameters(this.shape,_1);
this.bbox=null;
return this;
},setFill:function(_2){
if(!_2){
this.fillStyle=null;
return this;
}
var f=null;
if(typeof (_2)=="object"&&"type" in _2){
switch(_2.type){
case "linear":
f=dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient,_2);
break;
case "radial":
f=dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient,_2);
break;
case "pattern":
f=dojox.gfx.makeParameters(dojox.gfx.defaultPattern,_2);
break;
}
}else{
f=dojox.gfx.normalizeColor(_2);
}
this.fillStyle=f;
return this;
},setStroke:function(_3){
if(!_3){
this.strokeStyle=null;
return this;
}
if(typeof _3=="string"||dojo.isArray(_3)||_3 instanceof dojo.Color){
_3={color:_3};
}
var s=this.strokeStyle=dojox.gfx.makeParameters(dojox.gfx.defaultStroke,_3);
s.color=dojox.gfx.normalizeColor(s.color);
return this;
},setTransform:function(_4){
this.matrix=dojox.gfx.matrix.clone(_4?dojox.gfx.matrix.normalize(_4):dojox.gfx.matrix.identity);
return this._applyTransform();
},_applyTransform:function(){
return this;
},moveToFront:function(){
var p=this.getParent();
if(p){
p._moveChildToFront(this);
this._moveToFront();
}
return this;
},moveToBack:function(){
var p=this.getParent();
if(p){
p._moveChildToBack(this);
this._moveToBack();
}
return this;
},_moveToFront:function(){
},_moveToBack:function(){
},applyRightTransform:function(_5){
return _5?this.setTransform([this.matrix,_5]):this;
},applyLeftTransform:function(_6){
return _6?this.setTransform([_6,this.matrix]):this;
},applyTransform:function(_7){
return _7?this.setTransform([this.matrix,_7]):this;
},removeShape:function(_8){
if(this.parent){
this.parent.remove(this,_8);
}
return this;
},_setParent:function(_9,_a){
this.parent=_9;
return this._updateParentMatrix(_a);
},_updateParentMatrix:function(_b){
this.parentMatrix=_b?dojox.gfx.matrix.clone(_b):null;
return this._applyTransform();
},_getRealMatrix:function(){
var m=this.matrix;
var p=this.parent;
while(p){
if(p.matrix){
m=dojox.gfx.matrix.multiply(p.matrix,m);
}
p=p.parent;
}
return m;
}});
dojox.gfx.shape._eventsProcessing={connect:function(_c,_d,_e){
return arguments.length>2?dojo.connect(this.getEventSource(),_c,_d,_e):dojo.connect(this.getEventSource(),_c,_d);
},disconnect:function(_f){
dojo.disconnect(_f);
}};
dojo.extend(dojox.gfx.shape.Shape,dojox.gfx.shape._eventsProcessing);
dojox.gfx.shape.Container={_init:function(){
this.children=[];
},openBatch:function(){
},closeBatch:function(){
},add:function(_10){
var _11=_10.getParent();
if(_11){
_11.remove(_10,true);
}
this.children.push(_10);
return _10._setParent(this,this._getRealMatrix());
},remove:function(_12,_13){
for(var i=0;i<this.children.length;++i){
if(this.children[i]==_12){
if(_13){
}else{
_12.parent=null;
_12.parentMatrix=null;
}
this.children.splice(i,1);
break;
}
}
return this;
},clear:function(){
this.children=[];
return this;
},_moveChildToFront:function(_14){
for(var i=0;i<this.children.length;++i){
if(this.children[i]==_14){
this.children.splice(i,1);
this.children.push(_14);
break;
}
}
return this;
},_moveChildToBack:function(_15){
for(var i=0;i<this.children.length;++i){
if(this.children[i]==_15){
this.children.splice(i,1);
this.children.unshift(_15);
break;
}
}
return this;
}};
dojo.declare("dojox.gfx.shape.Surface",null,{constructor:function(){
this.rawNode=null;
this._parent=null;
this._nodes=[];
this._events=[];
},destroy:function(){
dojo.forEach(this._nodes,dojo.destroy);
this._nodes=[];
dojo.forEach(this._events,dojo.disconnect);
this._events=[];
this.rawNode=null;
if(dojo.isIE){
while(this._parent.lastChild){
dojo.destroy(this._parent.lastChild);
}
}else{
this._parent.innerHTML="";
}
this._parent=null;
},getEventSource:function(){
return this.rawNode;
},_getRealMatrix:function(){
return null;
},isLoaded:true,onLoad:function(_16){
},whenLoaded:function(_17,_18){
var f=dojo.hitch(_17,_18);
if(this.isLoaded){
f(this);
}else{
var h=dojo.connect(this,"onLoad",function(_19){
dojo.disconnect(h);
f(_19);
});
}
}});
dojo.extend(dojox.gfx.shape.Surface,dojox.gfx.shape._eventsProcessing);
dojo.declare("dojox.gfx.Point",null,{});
dojo.declare("dojox.gfx.Rectangle",null,{});
dojo.declare("dojox.gfx.shape.Rect",dojox.gfx.shape.Shape,{constructor:function(_1a){
this.shape=dojox.gfx.getDefault("Rect");
this.rawNode=_1a;
},getBoundingBox:function(){
return this.shape;
}});
dojo.declare("dojox.gfx.shape.Ellipse",dojox.gfx.shape.Shape,{constructor:function(_1b){
this.shape=dojox.gfx.getDefault("Ellipse");
this.rawNode=_1b;
},getBoundingBox:function(){
if(!this.bbox){
var _1c=this.shape;
this.bbox={x:_1c.cx-_1c.rx,y:_1c.cy-_1c.ry,width:2*_1c.rx,height:2*_1c.ry};
}
return this.bbox;
}});
dojo.declare("dojox.gfx.shape.Circle",dojox.gfx.shape.Shape,{constructor:function(_1d){
this.shape=dojox.gfx.getDefault("Circle");
this.rawNode=_1d;
},getBoundingBox:function(){
if(!this.bbox){
var _1e=this.shape;
this.bbox={x:_1e.cx-_1e.r,y:_1e.cy-_1e.r,width:2*_1e.r,height:2*_1e.r};
}
return this.bbox;
}});
dojo.declare("dojox.gfx.shape.Line",dojox.gfx.shape.Shape,{constructor:function(_1f){
this.shape=dojox.gfx.getDefault("Line");
this.rawNode=_1f;
},getBoundingBox:function(){
if(!this.bbox){
var _20=this.shape;
this.bbox={x:Math.min(_20.x1,_20.x2),y:Math.min(_20.y1,_20.y2),width:Math.abs(_20.x2-_20.x1),height:Math.abs(_20.y2-_20.y1)};
}
return this.bbox;
}});
dojo.declare("dojox.gfx.shape.Polyline",dojox.gfx.shape.Shape,{constructor:function(_21){
this.shape=dojox.gfx.getDefault("Polyline");
this.rawNode=_21;
},setShape:function(_22,_23){
if(_22&&_22 instanceof Array){
this.inherited(arguments,[{points:_22}]);
if(_23&&this.shape.points.length){
this.shape.points.push(this.shape.points[0]);
}
}else{
this.inherited(arguments,[_22]);
}
return this;
},_normalizePoints:function(){
var p=this.shape.points,l=p&&p.length;
if(l&&typeof p[0]=="number"){
var _24=[];
for(var i=0;i<l;i+=2){
_24.push({x:p[i],y:p[i+1]});
}
this.shape.points=_24;
}
},getBoundingBox:function(){
if(!this.bbox&&this.shape.points.length){
var p=this.shape.points;
var l=p.length;
var t=p[0];
var _25={l:t.x,t:t.y,r:t.x,b:t.y};
for(var i=1;i<l;++i){
t=p[i];
if(_25.l>t.x){
_25.l=t.x;
}
if(_25.r<t.x){
_25.r=t.x;
}
if(_25.t>t.y){
_25.t=t.y;
}
if(_25.b<t.y){
_25.b=t.y;
}
}
this.bbox={x:_25.l,y:_25.t,width:_25.r-_25.l,height:_25.b-_25.t};
}
return this.bbox;
}});
dojo.declare("dojox.gfx.shape.Image",dojox.gfx.shape.Shape,{constructor:function(_26){
this.shape=dojox.gfx.getDefault("Image");
this.rawNode=_26;
},getBoundingBox:function(){
return this.shape;
},setStroke:function(){
return this;
},setFill:function(){
return this;
}});
dojo.declare("dojox.gfx.shape.Text",dojox.gfx.shape.Shape,{constructor:function(_27){
this.fontStyle=null;
this.shape=dojox.gfx.getDefault("Text");
this.rawNode=_27;
},getFont:function(){
return this.fontStyle;
},setFont:function(_28){
this.fontStyle=typeof _28=="string"?dojox.gfx.splitFontString(_28):dojox.gfx.makeParameters(dojox.gfx.defaultFont,_28);
this._setFont();
return this;
}});
dojox.gfx.shape.Creator={createShape:function(_29){
var gfx=dojox.gfx;
switch(_29.type){
case gfx.defaultPath.type:
return this.createPath(_29);
case gfx.defaultRect.type:
return this.createRect(_29);
case gfx.defaultCircle.type:
return this.createCircle(_29);
case gfx.defaultEllipse.type:
return this.createEllipse(_29);
case gfx.defaultLine.type:
return this.createLine(_29);
case gfx.defaultPolyline.type:
return this.createPolyline(_29);
case gfx.defaultImage.type:
return this.createImage(_29);
case gfx.defaultText.type:
return this.createText(_29);
case gfx.defaultTextPath.type:
return this.createTextPath(_29);
}
return null;
},createGroup:function(){
return this.createObject(dojox.gfx.Group);
},createRect:function(_2a){
return this.createObject(dojox.gfx.Rect,_2a);
},createEllipse:function(_2b){
return this.createObject(dojox.gfx.Ellipse,_2b);
},createCircle:function(_2c){
return this.createObject(dojox.gfx.Circle,_2c);
},createLine:function(_2d){
return this.createObject(dojox.gfx.Line,_2d);
},createPolyline:function(_2e){
return this.createObject(dojox.gfx.Polyline,_2e);
},createImage:function(_2f){
return this.createObject(dojox.gfx.Image,_2f);
},createText:function(_30){
return this.createObject(dojox.gfx.Text,_30);
},createPath:function(_31){
return this.createObject(dojox.gfx.Path,_31);
},createTextPath:function(_32){
return this.createObject(dojox.gfx.TextPath,{}).setText(_32);
},createObject:function(_33,_34){
return null;
}};
}
