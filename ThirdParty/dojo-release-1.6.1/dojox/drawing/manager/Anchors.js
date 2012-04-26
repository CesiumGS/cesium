/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.manager.Anchors"]){
dojo._hasResource["dojox.drawing.manager.Anchors"]=true;
dojo.provide("dojox.drawing.manager.Anchors");
dojox.drawing.manager.Anchors=dojox.drawing.util.oo.declare(function(_1){
this.mouse=_1.mouse;
this.undo=_1.undo;
this.util=_1.util;
this.drawing=_1.drawing;
this.items={};
},{onAddAnchor:function(_2){
},onReset:function(_3){
var st=this.util.byId("drawing").stencils;
st.onDeselect(_3);
st.onSelect(_3);
},onRenderStencil:function(){
for(var nm in this.items){
dojo.forEach(this.items[nm].anchors,function(a){
a.shape.moveToFront();
});
}
},onTransformPoint:function(_4){
var _5=this.items[_4.stencil.id].anchors;
var _6=this.items[_4.stencil.id].item;
var _7=[];
dojo.forEach(_5,function(a,i){
if(_4.id==a.id||_4.stencil.anchorType!="group"){
}else{
if(_4.org.y==a.org.y){
a.setPoint({dx:0,dy:_4.shape.getTransform().dy-a.shape.getTransform().dy});
}else{
if(_4.org.x==a.org.x){
a.setPoint({dx:_4.shape.getTransform().dx-a.shape.getTransform().dx,dy:0});
}
}
a.shape.moveToFront();
}
var mx=a.shape.getTransform();
_7.push({x:mx.dx+a.org.x,y:mx.dy+a.org.y});
if(a.point.t){
_7[_7.length-1].t=a.point.t;
}
},this);
_6.setPoints(_7);
_6.onTransform(_4);
this.onRenderStencil();
},onAnchorUp:function(_8){
},onAnchorDown:function(_9){
},onAnchorDrag:function(_a){
},onChangeStyle:function(_b){
for(var nm in this.items){
dojo.forEach(this.items[nm].anchors,function(a){
a.shape.moveToFront();
});
}
},add:function(_c){
this.items[_c.id]={item:_c,anchors:[]};
if(_c.anchorType=="none"){
return;
}
var _d=_c.points;
dojo.forEach(_d,function(p,i){
if(p.noAnchor){
return;
}
if(i==0||i==_c.points.length-1){
}
var a=new dojox.drawing.manager.Anchor({stencil:_c,point:p,pointIdx:i,mouse:this.mouse,util:this.util});
this.items[_c.id]._cons=[dojo.connect(a,"onRenderStencil",this,"onRenderStencil"),dojo.connect(a,"reset",this,"onReset"),dojo.connect(a,"onAnchorUp",this,"onAnchorUp"),dojo.connect(a,"onAnchorDown",this,"onAnchorDown"),dojo.connect(a,"onAnchorDrag",this,"onAnchorDrag"),dojo.connect(a,"onTransformPoint",this,"onTransformPoint"),dojo.connect(_c,"onChangeStyle",this,"onChangeStyle")];
this.items[_c.id].anchors.push(a);
this.onAddAnchor(a);
},this);
if(_c.shortType=="path"){
var f=_d[0],l=_d[_d.length-1],a=this.items[_c.id].anchors;
if(f.x==l.x&&f.y==l.y){
console.warn("LINK ANVHROS",a[0],a[a.length-1]);
a[0].linkedAnchor=a[a.length-1];
a[a.length-1].linkedAnchor=a[0];
}
}
if(_c.anchorType=="group"){
dojo.forEach(this.items[_c.id].anchors,function(_e){
dojo.forEach(this.items[_c.id].anchors,function(a){
if(_e.id!=a.id){
if(_e.org.y==a.org.y){
_e.x_anchor=a;
}else{
if(_e.org.x==a.org.x){
_e.y_anchor=a;
}
}
}
},this);
},this);
}
},remove:function(_f){
if(!this.items[_f.id]){
return;
}
dojo.forEach(this.items[_f.id].anchors,function(a){
a.destroy();
});
dojo.forEach(this.items[_f.id]._cons,dojo.disconnect,dojo);
this.items[_f.id].anchors=null;
delete this.items[_f.id];
}});
dojox.drawing.manager.Anchor=dojox.drawing.util.oo.declare(function(_10){
this.defaults=dojox.drawing.defaults.copy();
this.mouse=_10.mouse;
this.point=_10.point;
this.pointIdx=_10.pointIdx;
this.util=_10.util;
this.id=_10.id||this.util.uid("anchor");
this.org=dojo.mixin({},this.point);
this.stencil=_10.stencil;
if(this.stencil.anchorPositionCheck){
this.anchorPositionCheck=dojo.hitch(this.stencil,this.stencil.anchorPositionCheck);
}
if(this.stencil.anchorConstrain){
this.anchorConstrain=dojo.hitch(this.stencil,this.stencil.anchorConstrain);
}
this._zCon=dojo.connect(this.mouse,"setZoom",this,"render");
this.render();
this.connectMouse();
},{y_anchor:null,x_anchor:null,render:function(){
this.shape&&this.shape.removeShape();
var d=this.defaults.anchors,z=this.mouse.zoom,b=d.width*z,s=d.size*z,p=s/2,_11={width:b,style:d.style,color:d.color,cap:d.cap};
var _12={x:this.point.x-p,y:this.point.y-p,width:s,height:s};
this.shape=this.stencil.container.createRect(_12).setStroke(_11).setFill(d.fill);
this.shape.setTransform({dx:0,dy:0});
this.util.attr(this,"drawingType","anchor");
this.util.attr(this,"id",this.id);
},onRenderStencil:function(_13){
},onTransformPoint:function(_14){
},onAnchorDown:function(obj){
this.selected=obj.id==this.id;
},onAnchorUp:function(obj){
this.selected=false;
this.stencil.onTransformEnd(this);
},onAnchorDrag:function(obj){
if(this.selected){
var mx=this.shape.getTransform();
var pmx=this.shape.getParent().getParent().getTransform();
var _15=this.defaults.anchors.marginZero;
var _16=pmx.dx+this.org.x,_17=pmx.dy+this.org.y,x=obj.x-_16,y=obj.y-_17,s=this.defaults.anchors.minSize;
var _18,_19,_1a,_1b;
var chk=this.anchorPositionCheck(x,y,this);
if(chk.x<0){
console.warn("X<0 Shift");
while(this.anchorPositionCheck(x,y,this).x<0){
this.shape.getParent().getParent().applyTransform({dx:2,dy:0});
}
}
if(chk.y<0){
console.warn("Y<0 Shift");
while(this.anchorPositionCheck(x,y,this).y<0){
this.shape.getParent().getParent().applyTransform({dx:0,dy:2});
}
}
if(this.y_anchor){
if(this.org.y>this.y_anchor.org.y){
_1a=this.y_anchor.point.y+s-this.org.y;
_1b=Infinity;
if(y<_1a){
y=_1a;
}
}else{
_1a=-_17+_15;
_1b=this.y_anchor.point.y-s-this.org.y;
if(y<_1a){
y=_1a;
}else{
if(y>_1b){
y=_1b;
}
}
}
}else{
_1a=-_17+_15;
if(y<_1a){
y=_1a;
}
}
if(this.x_anchor){
if(this.org.x>this.x_anchor.org.x){
_18=this.x_anchor.point.x+s-this.org.x;
_19=Infinity;
if(x<_18){
x=_18;
}
}else{
_18=-_16+_15;
_19=this.x_anchor.point.x-s-this.org.x;
if(x<_18){
x=_18;
}else{
if(x>_19){
x=_19;
}
}
}
}else{
_18=-_16+_15;
if(x<_18){
x=_18;
}
}
var _1c=this.anchorConstrain(x,y);
if(_1c!=null){
x=_1c.x;
y=_1c.y;
}
this.shape.setTransform({dx:x,dy:y});
if(this.linkedAnchor){
this.linkedAnchor.shape.setTransform({dx:x,dy:y});
}
this.onTransformPoint(this);
}
},anchorConstrain:function(x,y){
return null;
},anchorPositionCheck:function(x,y,_1d){
return {x:1,y:1};
},setPoint:function(mx){
this.shape.applyTransform(mx);
},connectMouse:function(){
this._mouseHandle=this.mouse.register(this);
},disconnectMouse:function(){
this.mouse.unregister(this._mouseHandle);
},reset:function(_1e){
},destroy:function(){
dojo.disconnect(this._zCon);
this.disconnectMouse();
this.shape.removeShape();
}});
}
