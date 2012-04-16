/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx3d.object"]){
dojo._hasResource["dojox.gfx3d.object"]=true;
dojo.provide("dojox.gfx3d.object");
dojo.require("dojox.gfx");
dojo.require("dojox.gfx3d.lighting");
dojo.require("dojox.gfx3d.scheduler");
dojo.require("dojox.gfx3d.vector");
dojo.require("dojox.gfx3d.gradient");
var out=function(o,x){
if(arguments.length>1){
o=x;
}
var e={};
for(var i in o){
if(i in e){
continue;
}
}
};
dojo.declare("dojox.gfx3d.Object",null,{constructor:function(){
this.object=null;
this.matrix=null;
this.cache=null;
this.renderer=null;
this.parent=null;
this.strokeStyle=null;
this.fillStyle=null;
this.shape=null;
},setObject:function(_1){
this.object=dojox.gfx.makeParameters(this.object,_1);
return this;
},setTransform:function(_2){
this.matrix=dojox.gfx3d.matrix.clone(_2?dojox.gfx3d.matrix.normalize(_2):dojox.gfx3d.identity,true);
return this;
},applyRightTransform:function(_3){
return _3?this.setTransform([this.matrix,_3]):this;
},applyLeftTransform:function(_4){
return _4?this.setTransform([_4,this.matrix]):this;
},applyTransform:function(_5){
return _5?this.setTransform([this.matrix,_5]):this;
},setFill:function(_6){
this.fillStyle=_6;
return this;
},setStroke:function(_7){
this.strokeStyle=_7;
return this;
},toStdFill:function(_8,_9){
return (this.fillStyle&&typeof this.fillStyle["type"]!="undefined")?_8[this.fillStyle.type](_9,this.fillStyle.finish,this.fillStyle.color):this.fillStyle;
},invalidate:function(){
this.renderer.addTodo(this);
},destroy:function(){
if(this.shape){
var p=this.shape.getParent();
if(p){
p.remove(this.shape);
}
this.shape=null;
}
},render:function(_a){
throw "Pure virtual function, not implemented";
},draw:function(_b){
throw "Pure virtual function, not implemented";
},getZOrder:function(){
return 0;
},getOutline:function(){
return null;
}});
dojo.declare("dojox.gfx3d.Scene",dojox.gfx3d.Object,{constructor:function(){
this.objects=[];
this.todos=[];
this.schedule=dojox.gfx3d.scheduler.zOrder;
this._draw=dojox.gfx3d.drawer.conservative;
},setFill:function(_c){
this.fillStyle=_c;
dojo.forEach(this.objects,function(_d){
_d.setFill(_c);
});
return this;
},setStroke:function(_e){
this.strokeStyle=_e;
dojo.forEach(this.objects,function(_f){
_f.setStroke(_e);
});
return this;
},render:function(_10,_11){
var m=dojox.gfx3d.matrix.multiply(_10,this.matrix);
if(_11){
this.todos=this.objects;
}
dojo.forEach(this.todos,function(_12){
_12.render(m,_11);
});
},draw:function(_13){
this.objects=this.schedule(this.objects);
this._draw(this.todos,this.objects,this.renderer);
},addTodo:function(_14){
if(dojo.every(this.todos,function(_15){
return _15!=_14;
})){
this.todos.push(_14);
this.invalidate();
}
},invalidate:function(){
this.parent.addTodo(this);
},getZOrder:function(){
var _16=0;
dojo.forEach(this.objects,function(_17){
_16+=_17.getZOrder();
});
return (this.objects.length>1)?_16/this.objects.length:0;
}});
dojo.declare("dojox.gfx3d.Edges",dojox.gfx3d.Object,{constructor:function(){
this.object=dojo.clone(dojox.gfx3d.defaultEdges);
},setObject:function(_18,_19){
this.object=dojox.gfx.makeParameters(this.object,(_18 instanceof Array)?{points:_18,style:_19}:_18);
return this;
},getZOrder:function(){
var _1a=0;
dojo.forEach(this.cache,function(_1b){
_1a+=_1b.z;
});
return (this.cache.length>1)?_1a/this.cache.length:0;
},render:function(_1c){
var m=dojox.gfx3d.matrix.multiply(_1c,this.matrix);
this.cache=dojo.map(this.object.points,function(_1d){
return dojox.gfx3d.matrix.multiplyPoint(m,_1d);
});
},draw:function(){
var c=this.cache;
if(this.shape){
this.shape.setShape("");
}else{
this.shape=this.renderer.createPath();
}
var p=this.shape.setAbsoluteMode("absolute");
if(this.object.style=="strip"||this.object.style=="loop"){
p.moveTo(c[0].x,c[0].y);
dojo.forEach(c.slice(1),function(_1e){
p.lineTo(_1e.x,_1e.y);
});
if(this.object.style=="loop"){
p.closePath();
}
}else{
for(var i=0;i<this.cache.length;){
p.moveTo(c[i].x,c[i].y);
i++;
p.lineTo(c[i].x,c[i].y);
i++;
}
}
p.setStroke(this.strokeStyle);
}});
dojo.declare("dojox.gfx3d.Orbit",dojox.gfx3d.Object,{constructor:function(){
this.object=dojo.clone(dojox.gfx3d.defaultOrbit);
},render:function(_1f){
var m=dojox.gfx3d.matrix.multiply(_1f,this.matrix);
var _20=[0,Math.PI/4,Math.PI/3];
var _21=dojox.gfx3d.matrix.multiplyPoint(m,this.object.center);
var _22=dojo.map(_20,function(_23){
return {x:this.center.x+this.radius*Math.cos(_23),y:this.center.y+this.radius*Math.sin(_23),z:this.center.z};
},this.object);
_22=dojo.map(_22,function(_24){
return dojox.gfx3d.matrix.multiplyPoint(m,_24);
});
var _25=dojox.gfx3d.vector.normalize(_22);
_22=dojo.map(_22,function(_26){
return dojox.gfx3d.vector.substract(_26,_21);
});
var A={xx:_22[0].x*_22[0].y,xy:_22[0].y*_22[0].y,xz:1,yx:_22[1].x*_22[1].y,yy:_22[1].y*_22[1].y,yz:1,zx:_22[2].x*_22[2].y,zy:_22[2].y*_22[2].y,zz:1,dx:0,dy:0,dz:0};
var B=dojo.map(_22,function(_27){
return -Math.pow(_27.x,2);
});
var X=dojox.gfx3d.matrix.multiplyPoint(dojox.gfx3d.matrix.invert(A),B[0],B[1],B[2]);
var _28=Math.atan2(X.x,1-X.y)/2;
var _29=dojo.map(_22,function(_2a){
return dojox.gfx.matrix.multiplyPoint(dojox.gfx.matrix.rotate(-_28),_2a.x,_2a.y);
});
var a=Math.pow(_29[0].x,2);
var b=Math.pow(_29[0].y,2);
var c=Math.pow(_29[1].x,2);
var d=Math.pow(_29[1].y,2);
var rx=Math.sqrt((a*d-b*c)/(d-b));
var ry=Math.sqrt((a*d-b*c)/(a-c));
this.cache={cx:_21.x,cy:_21.y,rx:rx,ry:ry,theta:_28,normal:_25};
},draw:function(_2b){
if(this.shape){
this.shape.setShape(this.cache);
}else{
this.shape=this.renderer.createEllipse(this.cache);
}
this.shape.applyTransform(dojox.gfx.matrix.rotateAt(this.cache.theta,this.cache.cx,this.cache.cy)).setStroke(this.strokeStyle).setFill(this.toStdFill(_2b,this.cache.normal));
}});
dojo.declare("dojox.gfx3d.Path3d",dojox.gfx3d.Object,{constructor:function(){
this.object=dojo.clone(dojox.gfx3d.defaultPath3d);
this.segments=[];
this.absolute=true;
this.last={};
this.path="";
},_collectArgs:function(_2c,_2d){
for(var i=0;i<_2d.length;++i){
var t=_2d[i];
if(typeof (t)=="boolean"){
_2c.push(t?1:0);
}else{
if(typeof (t)=="number"){
_2c.push(t);
}else{
if(t instanceof Array){
this._collectArgs(_2c,t);
}else{
if("x" in t&&"y" in t){
_2c.push(t.x);
_2c.push(t.y);
}
}
}
}
}
},_validSegments:{m:3,l:3,z:0},_pushSegment:function(_2e,_2f){
var _30=this._validSegments[_2e.toLowerCase()],_31;
if(typeof (_30)=="number"){
if(_30){
if(_2f.length>=_30){
_31={action:_2e,args:_2f.slice(0,_2f.length-_2f.length%_30)};
this.segments.push(_31);
}
}else{
_31={action:_2e,args:[]};
this.segments.push(_31);
}
}
},moveTo:function(){
var _32=[];
this._collectArgs(_32,arguments);
this._pushSegment(this.absolute?"M":"m",_32);
return this;
},lineTo:function(){
var _33=[];
this._collectArgs(_33,arguments);
this._pushSegment(this.absolute?"L":"l",_33);
return this;
},closePath:function(){
this._pushSegment("Z",[]);
return this;
},render:function(_34){
var m=dojox.gfx3d.matrix.multiply(_34,this.matrix);
var _35="";
var _36=this._validSegments;
dojo.forEach(this.segments,function(_37){
_35+=_37.action;
for(var i=0;i<_37.args.length;i+=_36[_37.action.toLowerCase()]){
var pt=dojox.gfx3d.matrix.multiplyPoint(m,_37.args[i],_37.args[i+1],_37.args[i+2]);
_35+=" "+pt.x+" "+pt.y;
}
});
this.cache=_35;
},_draw:function(){
return this.parent.createPath(this.cache);
}});
dojo.declare("dojox.gfx3d.Triangles",dojox.gfx3d.Object,{constructor:function(){
this.object=dojo.clone(dojox.gfx3d.defaultTriangles);
},setObject:function(_38,_39){
if(_38 instanceof Array){
this.object=dojox.gfx.makeParameters(this.object,{points:_38,style:_39});
}else{
this.object=dojox.gfx.makeParameters(this.object,_38);
}
return this;
},render:function(_3a){
var m=dojox.gfx3d.matrix.multiply(_3a,this.matrix);
var c=dojo.map(this.object.points,function(_3b){
return dojox.gfx3d.matrix.multiplyPoint(m,_3b);
});
this.cache=[];
var _3c=c.slice(0,2);
var _3d=c[0];
if(this.object.style=="strip"){
dojo.forEach(c.slice(2),function(_3e){
_3c.push(_3e);
_3c.push(_3c[0]);
this.cache.push(_3c);
_3c=_3c.slice(1,3);
},this);
}else{
if(this.object.style=="fan"){
dojo.forEach(c.slice(2),function(_3f){
_3c.push(_3f);
_3c.push(_3d);
this.cache.push(_3c);
_3c=[_3d,_3f];
},this);
}else{
for(var i=0;i<c.length;){
this.cache.push([c[i],c[i+1],c[i+2],c[i]]);
i+=3;
}
}
}
},draw:function(_40){
this.cache=dojox.gfx3d.scheduler.bsp(this.cache,function(it){
return it;
});
if(this.shape){
this.shape.clear();
}else{
this.shape=this.renderer.createGroup();
}
dojo.forEach(this.cache,function(_41){
this.shape.createPolyline(_41).setStroke(this.strokeStyle).setFill(this.toStdFill(_40,dojox.gfx3d.vector.normalize(_41)));
},this);
},getZOrder:function(){
var _42=0;
dojo.forEach(this.cache,function(_43){
_42+=(_43[0].z+_43[1].z+_43[2].z)/3;
});
return (this.cache.length>1)?_42/this.cache.length:0;
}});
dojo.declare("dojox.gfx3d.Quads",dojox.gfx3d.Object,{constructor:function(){
this.object=dojo.clone(dojox.gfx3d.defaultQuads);
},setObject:function(_44,_45){
this.object=dojox.gfx.makeParameters(this.object,(_44 instanceof Array)?{points:_44,style:_45}:_44);
return this;
},render:function(_46){
var m=dojox.gfx3d.matrix.multiply(_46,this.matrix),i;
var c=dojo.map(this.object.points,function(_47){
return dojox.gfx3d.matrix.multiplyPoint(m,_47);
});
this.cache=[];
if(this.object.style=="strip"){
var _48=c.slice(0,2);
for(i=2;i<c.length;){
_48=_48.concat([c[i],c[i+1],_48[0]]);
this.cache.push(_48);
_48=_48.slice(2,4);
i+=2;
}
}else{
for(i=0;i<c.length;){
this.cache.push([c[i],c[i+1],c[i+2],c[i+3],c[i]]);
i+=4;
}
}
},draw:function(_49){
this.cache=dojox.gfx3d.scheduler.bsp(this.cache,function(it){
return it;
});
if(this.shape){
this.shape.clear();
}else{
this.shape=this.renderer.createGroup();
}
for(var x=0;x<this.cache.length;x++){
this.shape.createPolyline(this.cache[x]).setStroke(this.strokeStyle).setFill(this.toStdFill(_49,dojox.gfx3d.vector.normalize(this.cache[x])));
}
},getZOrder:function(){
var _4a=0;
for(var x=0;x<this.cache.length;x++){
var i=this.cache[x];
_4a+=(i[0].z+i[1].z+i[2].z+i[3].z)/4;
}
return (this.cache.length>1)?_4a/this.cache.length:0;
}});
dojo.declare("dojox.gfx3d.Polygon",dojox.gfx3d.Object,{constructor:function(){
this.object=dojo.clone(dojox.gfx3d.defaultPolygon);
},setObject:function(_4b){
this.object=dojox.gfx.makeParameters(this.object,(_4b instanceof Array)?{path:_4b}:_4b);
return this;
},render:function(_4c){
var m=dojox.gfx3d.matrix.multiply(_4c,this.matrix);
this.cache=dojo.map(this.object.path,function(_4d){
return dojox.gfx3d.matrix.multiplyPoint(m,_4d);
});
this.cache.push(this.cache[0]);
},draw:function(_4e){
if(this.shape){
this.shape.setShape({points:this.cache});
}else{
this.shape=this.renderer.createPolyline({points:this.cache});
}
this.shape.setStroke(this.strokeStyle).setFill(this.toStdFill(_4e,dojox.gfx3d.matrix.normalize(this.cache)));
},getZOrder:function(){
var _4f=0;
for(var x=0;x<this.cache.length;x++){
_4f+=this.cache[x].z;
}
return (this.cache.length>1)?_4f/this.cache.length:0;
},getOutline:function(){
return this.cache.slice(0,3);
}});
dojo.declare("dojox.gfx3d.Cube",dojox.gfx3d.Object,{constructor:function(){
this.object=dojo.clone(dojox.gfx3d.defaultCube);
this.polygons=[];
},setObject:function(_50){
this.object=dojox.gfx.makeParameters(this.object,_50);
},render:function(_51){
var a=this.object.top;
var g=this.object.bottom;
var b={x:g.x,y:a.y,z:a.z};
var c={x:g.x,y:g.y,z:a.z};
var d={x:a.x,y:g.y,z:a.z};
var e={x:a.x,y:a.y,z:g.z};
var f={x:g.x,y:a.y,z:g.z};
var h={x:a.x,y:g.y,z:g.z};
var _52=[a,b,c,d,e,f,g,h];
var m=dojox.gfx3d.matrix.multiply(_51,this.matrix);
var p=dojo.map(_52,function(_53){
return dojox.gfx3d.matrix.multiplyPoint(m,_53);
});
a=p[0];
b=p[1];
c=p[2];
d=p[3];
e=p[4];
f=p[5];
g=p[6];
h=p[7];
this.cache=[[a,b,c,d,a],[e,f,g,h,e],[a,d,h,e,a],[d,c,g,h,d],[c,b,f,g,c],[b,a,e,f,b]];
},draw:function(_54){
this.cache=dojox.gfx3d.scheduler.bsp(this.cache,function(it){
return it;
});
var _55=this.cache.slice(3);
if(this.shape){
this.shape.clear();
}else{
this.shape=this.renderer.createGroup();
}
for(var x=0;x<_55.length;x++){
this.shape.createPolyline(_55[x]).setStroke(this.strokeStyle).setFill(this.toStdFill(_54,dojox.gfx3d.vector.normalize(_55[x])));
}
},getZOrder:function(){
var top=this.cache[0][0];
var _56=this.cache[1][2];
return (top.z+_56.z)/2;
}});
dojo.declare("dojox.gfx3d.Cylinder",dojox.gfx3d.Object,{constructor:function(){
this.object=dojo.clone(dojox.gfx3d.defaultCylinder);
},render:function(_57){
var m=dojox.gfx3d.matrix.multiply(_57,this.matrix);
var _58=[0,Math.PI/4,Math.PI/3];
var _59=dojox.gfx3d.matrix.multiplyPoint(m,this.object.center);
var _5a=dojo.map(_58,function(_5b){
return {x:this.center.x+this.radius*Math.cos(_5b),y:this.center.y+this.radius*Math.sin(_5b),z:this.center.z};
},this.object);
_5a=dojo.map(_5a,function(_5c){
return dojox.gfx3d.vector.substract(dojox.gfx3d.matrix.multiplyPoint(m,_5c),_59);
});
var A={xx:_5a[0].x*_5a[0].y,xy:_5a[0].y*_5a[0].y,xz:1,yx:_5a[1].x*_5a[1].y,yy:_5a[1].y*_5a[1].y,yz:1,zx:_5a[2].x*_5a[2].y,zy:_5a[2].y*_5a[2].y,zz:1,dx:0,dy:0,dz:0};
var B=dojo.map(_5a,function(_5d){
return -Math.pow(_5d.x,2);
});
var X=dojox.gfx3d.matrix.multiplyPoint(dojox.gfx3d.matrix.invert(A),B[0],B[1],B[2]);
var _5e=Math.atan2(X.x,1-X.y)/2;
var _5f=dojo.map(_5a,function(_60){
return dojox.gfx.matrix.multiplyPoint(dojox.gfx.matrix.rotate(-_5e),_60.x,_60.y);
});
var a=Math.pow(_5f[0].x,2);
var b=Math.pow(_5f[0].y,2);
var c=Math.pow(_5f[1].x,2);
var d=Math.pow(_5f[1].y,2);
var rx=Math.sqrt((a*d-b*c)/(d-b));
var ry=Math.sqrt((a*d-b*c)/(a-c));
if(rx<ry){
var t=rx;
rx=ry;
ry=t;
_5e-=Math.PI/2;
}
var top=dojox.gfx3d.matrix.multiplyPoint(m,dojox.gfx3d.vector.sum(this.object.center,{x:0,y:0,z:this.object.height}));
var _61=this.fillStyle.type=="constant"?this.fillStyle.color:dojox.gfx3d.gradient(this.renderer.lighting,this.fillStyle,this.object.center,this.object.radius,Math.PI,2*Math.PI,m);
if(isNaN(rx)||isNaN(ry)||isNaN(_5e)){
rx=this.object.radius,ry=0,_5e=0;
}
this.cache={center:_59,top:top,rx:rx,ry:ry,theta:_5e,gradient:_61};
},draw:function(){
var c=this.cache,v=dojox.gfx3d.vector,m=dojox.gfx.matrix,_62=[c.center,c.top],_63=v.substract(c.top,c.center);
if(v.dotProduct(_63,this.renderer.lighting.incident)>0){
_62=[c.top,c.center];
_63=v.substract(c.center,c.top);
}
var _64=this.renderer.lighting[this.fillStyle.type](_63,this.fillStyle.finish,this.fillStyle.color),d=Math.sqrt(Math.pow(c.center.x-c.top.x,2)+Math.pow(c.center.y-c.top.y,2));
if(this.shape){
this.shape.clear();
}else{
this.shape=this.renderer.createGroup();
}
this.shape.createPath("").moveTo(0,-c.rx).lineTo(d,-c.rx).lineTo(d,c.rx).lineTo(0,c.rx).arcTo(c.ry,c.rx,0,true,true,0,-c.rx).setFill(c.gradient).setStroke(this.strokeStyle).setTransform([m.translate(_62[0]),m.rotate(Math.atan2(_62[1].y-_62[0].y,_62[1].x-_62[0].x))]);
if(c.rx>0&&c.ry>0){
this.shape.createEllipse({cx:_62[1].x,cy:_62[1].y,rx:c.rx,ry:c.ry}).setFill(_64).setStroke(this.strokeStyle).applyTransform(m.rotateAt(c.theta,_62[1]));
}
}});
dojo.declare("dojox.gfx3d.Viewport",dojox.gfx.Group,{constructor:function(){
this.dimension=null;
this.objects=[];
this.todos=[];
this.renderer=this;
this.schedule=dojox.gfx3d.scheduler.zOrder;
this.draw=dojox.gfx3d.drawer.conservative;
this.deep=false;
this.lights=[];
this.lighting=null;
},setCameraTransform:function(_65){
this.camera=dojox.gfx3d.matrix.clone(_65?dojox.gfx3d.matrix.normalize(_65):dojox.gfx3d.identity,true);
this.invalidate();
return this;
},applyCameraRightTransform:function(_66){
return _66?this.setCameraTransform([this.camera,_66]):this;
},applyCameraLeftTransform:function(_67){
return _67?this.setCameraTransform([_67,this.camera]):this;
},applyCameraTransform:function(_68){
return this.applyCameraRightTransform(_68);
},setLights:function(_69,_6a,_6b){
this.lights=(_69 instanceof Array)?{sources:_69,ambient:_6a,specular:_6b}:_69;
var _6c={x:0,y:0,z:1};
this.lighting=new dojox.gfx3d.lighting.Model(_6c,this.lights.sources,this.lights.ambient,this.lights.specular);
this.invalidate();
return this;
},addLights:function(_6d){
return this.setLights(this.lights.sources.concat(_6d));
},addTodo:function(_6e){
if(dojo.every(this.todos,function(_6f){
return _6f!=_6e;
})){
this.todos.push(_6e);
}
},invalidate:function(){
this.deep=true;
this.todos=this.objects;
},setDimensions:function(dim){
if(dim){
var w=dojo.isString(dim.width)?parseInt(dim.width):dim.width;
var h=dojo.isString(dim.height)?parseInt(dim.height):dim.height;
if(this.rawNode){
var trs=this.rawNode.style;
trs.height=h;
trs.width=w;
}
this.dimension={width:w,height:h};
}else{
this.dimension=null;
}
},render:function(){
if(!this.todos.length){
return;
}
var m=dojox.gfx3d.matrix;
for(var x=0;x<this.todos.length;x++){
this.todos[x].render(dojox.gfx3d.matrix.normalize([m.cameraRotateXg(180),m.cameraTranslate(0,this.dimension.height,0),this.camera]),this.deep);
}
this.objects=this.schedule(this.objects);
this.draw(this.todos,this.objects,this);
this.todos=[];
this.deep=false;
}});
dojox.gfx3d.Viewport.nodeType=dojox.gfx.Group.nodeType;
dojox.gfx3d._creators={createEdges:function(_70,_71){
return this.create3DObject(dojox.gfx3d.Edges,_70,_71);
},createTriangles:function(_72,_73){
return this.create3DObject(dojox.gfx3d.Triangles,_72,_73);
},createQuads:function(_74,_75){
return this.create3DObject(dojox.gfx3d.Quads,_74,_75);
},createPolygon:function(_76){
return this.create3DObject(dojox.gfx3d.Polygon,_76);
},createOrbit:function(_77){
return this.create3DObject(dojox.gfx3d.Orbit,_77);
},createCube:function(_78){
return this.create3DObject(dojox.gfx3d.Cube,_78);
},createCylinder:function(_79){
return this.create3DObject(dojox.gfx3d.Cylinder,_79);
},createPath3d:function(_7a){
return this.create3DObject(dojox.gfx3d.Path3d,_7a);
},createScene:function(){
return this.create3DObject(dojox.gfx3d.Scene);
},create3DObject:function(_7b,_7c,_7d){
var obj=new _7b();
this.adopt(obj);
if(_7c){
obj.setObject(_7c,_7d);
}
return obj;
},adopt:function(obj){
obj.renderer=this.renderer;
obj.parent=this;
this.objects.push(obj);
this.addTodo(obj);
return this;
},abandon:function(obj,_7e){
for(var i=0;i<this.objects.length;++i){
if(this.objects[i]==obj){
this.objects.splice(i,1);
}
}
obj.parent=null;
return this;
},setScheduler:function(_7f){
this.schedule=_7f;
},setDrawer:function(_80){
this.draw=_80;
}};
dojo.extend(dojox.gfx3d.Viewport,dojox.gfx3d._creators);
dojo.extend(dojox.gfx3d.Scene,dojox.gfx3d._creators);
delete dojox.gfx3d._creators;
dojo.extend(dojox.gfx.Surface,{createViewport:function(){
var _81=this.createObject(dojox.gfx3d.Viewport,null,true);
_81.setDimensions(this.getDimensions());
return _81;
}});
}
