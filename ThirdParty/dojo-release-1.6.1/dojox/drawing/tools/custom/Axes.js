/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.tools.custom.Axes"]){
dojo._hasResource["dojox.drawing.tools.custom.Axes"]=true;
dojo.provide("dojox.drawing.tools.custom.Axes");
dojo.require("dojox.drawing.stencil.Path");
dojox.drawing.tools.custom.Axes=dojox.drawing.util.oo.declare(dojox.drawing.stencil.Path,function(_1){
this.closePath=false;
this.xArrow=new dojox.drawing.annotations.Arrow({stencil:this,idx1:0,idx2:1});
this.yArrow=new dojox.drawing.annotations.Arrow({stencil:this,idx1:2,idx2:1});
if(_1.data){
this.style.zAxisEnabled=_1.data.cosphi==1?true:false;
this.setData(_1.data);
}
if(this.style.zAxisEnabled){
this.data.cosphi=1;
var _2={};
dojo.mixin(_2,_1);
dojo.mixin(_2,{container:this.container.createGroup(),style:this.style,showAngle:false,label:null});
if(_1.data&&(!_2.data.radius||!_2.data.angle)){
_2.data.x2=_2.data.x4;
_2.data.y2=_2.data.y4;
}
_2.style.zAxis=true;
this.zAxis=new dojox.drawing.tools.custom.Vector(_2);
this.zAxis.minimumSize=5;
this.connectMult([[this,"onChangeStyle",this.zAxis,"onChangeStyle"],[this,"select",this.zAxis,"select"],[this,"deselect",this.zAxis,"deselect"],[this,"onDelete",this.zAxis,"destroy"],[this,"onDrag",this,"zSet"],[this,"onTransform",this,"zSet"],[this.zAxis,"onBeforeRender",this,"zSet"],[this,"_onPostRender",this.zAxis,"render"]]);
}
if(this.points&&this.points.length){
this.setPoints=this._postSetPoints;
this.render();
_1.label&&this.setLabel(_1.label);
_1.shadow&&this.addShadow(_1.shadow);
}
},{draws:true,type:"dojox.drawing.tools.custom.Axes",minimumSize:30,showAngle:true,closePath:false,baseRender:false,zScale:0.5,zPoint:function(_3){
_3.radius=this.util.length(_3);
var pt=this.util.pointOnCircle(_3.start.x,_3.start.y,_3.radius*this.zScale,this.style.zAngle);
return {x:pt.x,y:pt.y,skip:true,noAnchor:true};
},zSet:function(){
if(!this.zAxis){
return;
}
var c=this.points[1];
var z=this.points[3];
var p=[{x:c.x,y:c.y},{x:z.x,y:z.y}];
var _4=this.util.length({start:{x:c.x,y:c.y},x:z.x,y:z.y});
_4>this.zAxis.minimumSize?this.zAxis.setPoints(p):false;
this.zAxis.cosphi=1;
},createLabels:function(){
var _5={align:"middle",valign:"middle",util:this.util,annotation:true,container:this.container,mouse:this.mouse,stencil:this};
this.labelX=new dojox.drawing.annotations.Label(dojo.mixin(_5,{labelPosition:this.setLabelX}));
this.labelY=new dojox.drawing.annotations.Label(dojo.mixin(_5,{labelPosition:this.setLabelY}));
if(this.style.zAxisEnabled){
this.labelZ=new dojox.drawing.annotations.Label(dojo.mixin(_5,{labelPosition:this.setLabelZ}));
}
},setLabelX:function(){
var ax=this.points[0];
var c=this.points[1];
var _6=40;
var _7=20;
var pt,px,py,_8;
pt=this.util.lineSub(c.x,c.y,ax.x,ax.y,_6);
px=pt.x+(pt.y-ax.y);
py=pt.y+(ax.x-pt.x);
_8=this.util.lineSub(pt.x,pt.y,px,py,(_6-_7));
return {x:_8.x,y:_8.y,width:20};
},setLabelY:function(){
var c=this.points[1];
var ay=this.points[2];
var _9=40;
var _a=20;
var pt,px,py,_b;
pt=this.util.lineSub(c.x,c.y,ay.x,ay.y,_9);
px=pt.x+(ay.y-pt.y);
py=pt.y+(pt.x-ay.x);
_b=this.util.lineSub(pt.x,pt.y,px,py,(_9-_a));
return {x:_b.x,y:_b.y,width:20};
},setLabelZ:function(){
var c=this.points[1];
var z=this.points[3];
var _c=40;
var _d=20;
var pt,px,py,_e;
pt=this.util.lineSub(c.x,c.y,z.x,z.y,_c);
px=pt.x+(pt.y-z.y);
py=pt.y+(z.x-pt.x);
_e=this.util.lineSub(pt.x,pt.y,px,py,(_c-_d));
return {x:_e.x,y:_e.y,width:20};
},setLabel:function(_f){
if(this._labelsCreated){
return;
}
!this.labelX&&this.createLabels();
var x="x";
var y="y";
var z="z";
if(_f){
if(this.labelZ){
var _10=_f.match(/(.*?)(and|&)(.*?)(and|&)(.*)/i);
if(_10.length>4){
x=_10[1].replace(/^\s+/,"").replace(/\s+$/,"");
y=_10[3].replace(/^\s+/,"").replace(/\s+$/,"");
z=_10[5].replace(/^\s+/,"").replace(/\s+$/,"");
}
}else{
var _10=_f.match(/(.*?)(and|&)(.*)/i);
if(_10.length>2){
x=_10[1].replace(/^\s+/,"").replace(/\s+$/,"");
y=_10[3].replace(/^\s+/,"").replace(/\s+$/,"");
}
}
}
this.labelX.setLabel(x);
this.labelY.setLabel(y);
if(this.labelZ){
this.labelZ.setLabel(z);
}
this._labelsCreated=true;
},getLabel:function(){
if(!this.labelX){
return null;
}
return {x:this.labelX.getText(),y:this.labelY.getText(),z:this.labelZ?this.labelZ.getText():null};
},anchorPositionCheck:function(x,y,_11){
var pm=this.container.getParent().getTransform();
var am=_11.shape.getTransform();
var p=this.points;
var o={x:am.dx+_11.org.x+pm.dx,y:am.dy+_11.org.y+pm.dy};
var c={x:p[1].x+pm.dx,y:p[1].y+pm.dy};
var ox=c.x-(c.y-o.y);
var oy=c.y-(o.x-c.x);
return {x:ox,y:oy};
},onTransformBegin:function(_12){
this._isBeingModified=true;
},onTransformEnd:function(_13){
if(!_13){
return;
}
this._isBeingModified=false;
this._toggleSelected();
var o=this.points[0];
var c=this.points[1];
var obj={start:{x:c.x,y:c.y},x:o.x,y:o.y};
var pt=this.util.constrainAngle(obj,0,89);
var zpt=this.style.zAxisEnabled?this.zPoint(obj):null;
if(pt.x==o.x&&pt.y==o.y){
pt=this.util.snapAngle(obj,this.angleSnap/180);
obj.x=pt.x;
obj.y=pt.y;
var ox=obj.start.x-(obj.start.y-obj.y);
var oy=obj.start.y-(obj.x-obj.start.x);
if(ox<0||oy<0){
console.warn("AXES ERROR LESS THAN ZERO - ABORT");
return;
}
this.points=[{x:obj.x,y:obj.y},{x:obj.start.x,y:obj.start.y,noAnchor:true}];
this.points.push({x:ox,y:oy,noAnchor:true});
if(zpt){
this.points.push(zpt);
}
this.setPoints(this.points);
this.onModify(this);
return;
}
this.points[0].x=pt.x;
this.points[0].y=pt.y;
o=this.points[0];
var ox=c.x-(c.y-o.y);
var oy=c.y-(o.x-c.x);
this.points[2]={x:ox,y:oy,noAnchor:true};
if(zpt){
this.points.push(zpt);
}
this.setPoints(this.points);
this.labelX.setLabel();
this.labelY.setLabel();
if(this.labelZ){
this.labelZ.setLabel();
}
this.onModify(this);
},getBounds:function(_14){
var px=this.points[0],pc=this.points[1],py=this.points[2];
if(this.style.zAxisEnabled){
var pz=this.points[3];
}
if(_14){
var _15={x:pc.x,y:pc.y,x1:pc.x,y1:pc.y,x2:px.x,y2:px.y,x3:py.x,y3:py.y};
if(this.style.zAxisEnabled){
_15.x4=pz.x;
_15.y4=pz.y;
}
return _15;
}
var x1=this.style.zAxisEnabled?(py.x<pz.x?py.x:pz.x):py.x;
y1=py.y<px.y?py.y:px.y,x2=px.x,y2=this.style.zAxisEnabled?pz.y:pc.y;
return {x1:x1,y1:y1,x2:x2,y2:y2,x:x1,y:y1,w:x2-x1,h:y2-y1};
},_postSetPoints:function(pts){
this.points[0]=pts[0];
if(this.pointsToData){
this.data=this.pointsToData();
}
},onTransform:function(_16){
var o=this.points[0];
var c=this.points[1];
var ox=c.x-(c.y-o.y);
var oy=c.y-(o.x-c.x);
this.points[2]={x:ox,y:oy,noAnchor:true};
if(this.style.zAxisEnabled){
this.points[3]=this.zPoint({start:{x:c.x,y:c.y},x:o.x,y:o.y});
}
this.setPoints(this.points);
if(!this._isBeingModified){
this.onTransformBegin();
}
this.render();
},pointsToData:function(){
var p=this.points;
var d={x1:p[1].x,y1:p[1].y,x2:p[0].x,y2:p[0].y,x3:p[2].x,y3:p[2].y};
if(this.style.zAxisEnabled){
d.x4=p[3].x;
d.y4=p[3].y;
d.cosphi=1;
}
return d;
},getRadius:function(){
var p=this.points;
var _17={start:{x:p[1].x,y:p[1].y},x:p[0].x,y:p[0].y};
return this.util.length(_17);
},dataToPoints:function(o){
o=o||this.data;
if(o.radius||o.angle){
var pt=this.util.pointOnCircle(o.x,o.y,o.radius,o.angle),zpt;
var ox=o.x-(o.y-pt.y);
var oy=o.y-(pt.x-o.x);
if((o.cosphi&&o.cosphi==1)||this.style.zAxisEnabled){
this.style.zAxisEnabled=true;
zpt=this.util.pointOnCircle(o.x,o.y,o.radius*this.zScale,this.style.zAngle);
}
this.data=o={x1:o.x,y1:o.y,x2:pt.x,y2:pt.y,x3:ox,y3:oy};
if(this.style.zAxisEnabled){
this.data.x4=o.x4=zpt.x;
this.data.y4=o.y4=zpt.y;
this.data.cosphi=1;
}
}
this.points=[{x:o.x2,y:o.y2},{x:o.x1,y:o.y1,noAnchor:true},{x:o.x3,y:o.y3,noAnchor:true}];
if(this.style.zAxisEnabled){
this.points.push({x:o.x4,y:o.y4,skip:true,noAnchor:true});
}
return this.points;
},onDrag:function(obj){
var pt=this.util.constrainAngle(obj,0,89);
obj.x=pt.x;
obj.y=pt.y;
var ox=obj.start.x-(obj.start.y-obj.y);
var oy=obj.start.y-(obj.x-obj.start.x);
if(ox<0||oy<0){
return;
}
this.points=[{x:obj.x,y:obj.y},{x:obj.start.x,y:obj.start.y,noAnchor:true}];
this.points.push({x:ox,y:oy,noAnchor:true});
if(this.style.zAxisEnabled){
var zpt=this.zPoint(obj);
this.points.push(zpt);
}
this.render();
},onUp:function(obj){
if(!this._downOnCanvas){
return;
}
this._downOnCanvas=false;
var p=this.points;
if(!p.length){
var s=obj.start,d=100;
this.points=[{x:s.x+d,y:s.y+d},{x:s.x,y:s.y+d,noAnchor:true},{x:s.x,y:s.y,noAnchor:true}];
if(this.style.zAxisEnabled){
var zpt=this.zPoint({start:{x:s.x,y:s.y+d},x:s.x+d,y:s.y+d});
this.points.push(zpt);
}
this.setPoints=this._postSetPoints;
this.pointsToData();
this.render();
this.onRender(this);
return;
}
var len=this.util.distance(p[1].x,p[1].y,p[0].x,p[0].y);
if(!p||!p.length){
return;
}else{
if(len<this.minimumSize){
this.remove(this.shape,this.hit);
this.xArrow.remove(this.xArrow.shape,this.xArrow.hit);
this.yArrow.remove(this.yArrow.shape,this.yArrow.hit);
if(this.zArrow){
this.zArrow.remove(this.zArrow.shape,this.zArrow.hit);
}
return;
}
}
var o=p[0];
var c=p[1];
obj={start:{x:c.x,y:c.y},x:o.x,y:o.y};
var pt=this.util.snapAngle(obj,this.angleSnap/180);
obj.x=pt.x;
obj.y=pt.y;
var ox=obj.start.x-(obj.start.y-obj.y);
var oy=obj.start.y-(obj.x-obj.start.x);
if(ox<0||oy<0){
return;
}
this.points=[{x:obj.x,y:obj.y},{x:obj.start.x,y:obj.start.y,noAnchor:true}];
this.points.push({x:ox,y:oy,noAnchor:true});
if(this.style.zAxisEnabled){
this.points.push(this.zPoint(obj));
}
this.onRender(this);
this.setPoints=this._postSetPoints;
}});
dojox.drawing.tools.custom.Axes.setup={name:"dojox.drawing.tools.custom.Axes",tooltip:"Axes Tool",iconClass:"iconAxes"};
dojox.drawing.register(dojox.drawing.tools.custom.Axes.setup,"tool");
}
