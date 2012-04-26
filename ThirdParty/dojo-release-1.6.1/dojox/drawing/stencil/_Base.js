/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.stencil._Base"]){
dojo._hasResource["dojox.drawing.stencil._Base"]=true;
dojo.provide("dojox.drawing.stencil._Base");
dojo.require("dojo.fx.easing");
dojox.drawing.stencil._Base=dojox.drawing.util.oo.declare(function(_1){
dojo.mixin(this,_1);
this.style=_1.style||dojox.drawing.defaults.copy();
if(_1.stencil){
this.stencil=_1.stencil;
this.util=_1.stencil.util;
this.mouse=_1.stencil.mouse;
this.container=_1.stencil.container;
this.style=_1.stencil.style;
}
var _2=/Line|Vector|Axes|Arrow/;
var _3=/Text/;
this.shortType=this.util.abbr(this.type);
this.isText=_3.test(this.type);
this.isLine=_2.test(this.type);
this.renderHit=this.style.renderHitLayer;
if(!this.renderHit&&this.style.renderHitLines&&this.isLine){
this.renderHit=true;
}
if(!this.renderHit&&this.style.useSelectedStyle){
this.useSelectedStyle=true;
this.selCopy=dojo.clone(this.style.selected);
for(var nm in this.style.norm){
if(this.style.selected[nm]===undefined){
this.style.selected[nm]=this.style.norm[nm];
}
}
this.textSelected=dojo.clone(this.style.text);
this.textSelected.color=this.style.selected.fill;
}
this.angleSnap=this.style.angleSnap||1;
this.marginZero=_1.marginZero||this.style.anchors.marginZero;
this.id=_1.id||this.util.uid(this.type);
this._cons=[];
if(!this.annotation&&!this.subShape){
this.util.attr(this.container,"id",this.id);
}
this.connect(this,"onBeforeRender","preventNegativePos");
this._offX=this.mouse.origin.x;
this._offY=this.mouse.origin.y;
if(this.isText){
this.align=_1.align||this.align;
this.valign=_1.valign||this.valign;
if(_1.data&&_1.data.makeFit){
var _4=this.makeFit(_1.data.text,_1.data.width);
this.textSize=this.style.text.size=_4.size;
this._lineHeight=_4.box.h;
}else{
this.textSize=parseInt(this.style.text.size,10);
this._lineHeight=this.textSize*1.4;
}
this.deleteEmptyCreate=_1.deleteEmptyCreate!==undefined?_1.deleteEmptyCreate:this.style.text.deleteEmptyCreate;
this.deleteEmptyModify=_1.deleteEmptyModify!==undefined?_1.deleteEmptyModify:this.style.text.deleteEmptyModify;
}
this.attr(_1.data);
if(this.noBaseRender){
return;
}
if(_1.points){
if(_1.data&&_1.data.closePath===false){
this.closePath=false;
}
this.setPoints(_1.points);
this.connect(this,"render",this,"onRender",true);
this.baseRender&&this.enabled&&this.render();
_1.label&&this.setLabel(_1.label);
_1.shadow&&this.addShadow(_1.shadow);
}else{
if(_1.data){
_1.data.width=_1.data.width?_1.data.width:this.style.text.minWidth;
_1.data.height=_1.data.height?_1.data.height:this._lineHeight;
this.setData(_1.data);
this.connect(this,"render",this,"onRender",true);
this.baseRender&&this.enabled&&this.render(_1.data.text);
this.baseRender&&_1.label&&this.setLabel(_1.label);
this.baseRender&&_1.shadow&&this.addShadow(_1.shadow);
}else{
if(this.draws){
this.points=[];
this.data={};
this.connectMouse();
this._postRenderCon=dojo.connect(this,"render",this,"_onPostRender");
}
}
}
if(this.showAngle){
this.angleLabel=new dojox.drawing.annotations.Angle({stencil:this});
}
if(!this.enabled){
this.disable();
this.moveToBack();
this.render(_1.data.text);
}
},{type:"dojox.drawing.stencil",minimumSize:10,enabled:true,drawingType:"stencil",setData:function(_5){
this.data=_5;
this.points=this.dataToPoints();
},setPoints:function(_6){
this.points=_6;
if(this.pointsToData){
this.data=this.pointsToData();
}
},onDelete:function(_7){
},onBeforeRender:function(_8){
},onModify:function(_9){
},onChangeData:function(_a){
},onChangeText:function(_b){
},onRender:function(_c){
this._postRenderCon=dojo.connect(this,"render",this,"_onPostRender");
this.created=true;
this.disconnectMouse();
if(this.shape){
this.shape.superClass=this;
}else{
this.container.superClass=this;
}
this._setNodeAtts(this);
},onChangeStyle:function(_d){
this._isBeingModified=true;
if(!this.enabled){
this.style.current=this.style.disabled;
this.style.currentText=this.style.textDisabled;
this.style.currentHit=this.style.hitNorm;
}else{
this.style.current=this.style.norm;
this.style.currentHit=this.style.hitNorm;
this.style.currentText=this.style.text;
}
if(this.selected){
if(this.useSelectedStyle){
this.style.current=this.style.selected;
this.style.currentText=this.textSelected;
}
this.style.currentHit=this.style.hitSelected;
}else{
if(this.highlighted){
this.style.currentHit=this.style.hitHighlighted;
}
}
this.render();
},animate:function(_e,_f){
console.warn("ANIMATE..........................");
var d=_e.d||_e.duration||1000;
var ms=_e.ms||20;
var _10=_e.ease||dojo.fx.easing.linear;
var _11=_e.steps;
var ts=new Date().getTime();
var w=100;
var cnt=0;
var _12=true;
var sp,ep;
if(dojo.isArray(_e.start)){
sp=_e.start;
ep=_e.end;
}else{
if(dojo.isObject(_e.start)){
sp=_e.start;
ep=_e.end;
_12=false;
}else{
console.warn("No data provided to animate");
}
}
var v=setInterval(dojo.hitch(this,function(){
var t=new Date().getTime()-ts;
var p=_10(1-t/d);
if(t>d||cnt++>100){
clearInterval(v);
return;
}
if(_12){
var _13=[];
dojo.forEach(sp,function(pt,i){
var o={x:(ep[i].x-sp[i].x)*p+sp[i].x,y:(ep[i].y-sp[i].y)*p+sp[i].y};
_13.push(o);
});
this.setPoints(_13);
this.render();
}else{
var o={};
for(var nm in sp){
o[nm]=(ep[nm]-sp[nm])*p+sp[nm];
}
this.attr(o);
}
}),ms);
},attr:function(key,_14){
var n=this.enabled?this.style.norm:this.style.disabled;
var t=this.enabled?this.style.text:this.style.textDisabled;
var ts=this.textSelected||{},o,nm,_15,_16=dojo.toJson(n),_17=dojo.toJson(t);
var _18={x:true,y:true,r:true,height:true,width:true,radius:true,angle:true};
var _19=false;
if(typeof (key)!="object"){
o={};
o[key]=_14;
}else{
o=dojo.clone(key);
}
if(o.width){
_15=o.width;
delete o.width;
}
for(nm in o){
if(nm in n){
n[nm]=o[nm];
}
if(nm in t){
t[nm]=o[nm];
}
if(nm in ts){
ts[nm]=o[nm];
}
if(nm in _18){
_18[nm]=o[nm];
_19=true;
if(nm=="radius"&&o.angle===undefined){
o.angle=_18.angle=this.getAngle();
}else{
if(nm=="angle"&&o.radius===undefined){
o.radius=_18.radius=this.getRadius();
}
}
}
if(nm=="text"){
this.setText(o.text);
}
if(nm=="label"){
this.setLabel(o.label);
}
}
if(o.borderWidth!==undefined){
n.width=o.borderWidth;
}
if(this.useSelectedStyle){
for(nm in this.style.norm){
if(this.selCopy[nm]===undefined){
this.style.selected[nm]=this.style.norm[nm];
}
}
this.textSelected.color=this.style.selected.color;
}
if(!this.created){
return;
}
if(o.x!==undefined||o.y!==undefined){
var box=this.getBounds(true);
var mx={dx:0,dy:0};
for(nm in o){
if(nm=="x"||nm=="y"||nm=="r"){
mx["d"+nm]=o[nm]-box[nm];
}
}
this.transformPoints(mx);
}
var p=this.points;
if(o.angle!==undefined){
this.dataToPoints({x:this.data.x1,y:this.data.y1,angle:o.angle,radius:o.radius});
}else{
if(_15!==undefined){
p[1].x=p[2].x=p[0].x+_15;
this.pointsToData(p);
}
}
if(o.height!==undefined&&o.angle===undefined){
p[2].y=p[3].y=p[0].y+o.height;
this.pointsToData(p);
}
if(o.r!==undefined){
this.data.r=Math.max(0,o.r);
}
if(_19||_17!=dojo.toJson(t)||_16!=dojo.toJson(n)){
this.onChangeStyle(this);
}
o.width=_15;
if(o.cosphi!=undefined){
!this.data?this.data={cosphi:o.cosphi}:this.data.cosphi=o.cosphi;
this.style.zAxis=o.cosphi!=0?true:false;
}
},exporter:function(){
var _1a=this.type.substring(this.type.lastIndexOf(".")+1).charAt(0).toLowerCase()+this.type.substring(this.type.lastIndexOf(".")+2);
var o=dojo.clone(this.style.norm);
o.borderWidth=o.width;
delete o.width;
if(_1a=="path"){
o.points=this.points;
}else{
o=dojo.mixin(o,this.data);
}
o.type=_1a;
if(this.isText){
o.text=this.getText();
o=dojo.mixin(o,this.style.text);
delete o.minWidth;
delete o.deleteEmptyCreate;
delete o.deleteEmptyModify;
}
var lbl=this.getLabel();
if(lbl){
o.label=lbl;
}
return o;
},disable:function(){
this.enabled=false;
this.renderHit=false;
this.onChangeStyle(this);
},enable:function(){
this.enabled=true;
this.renderHit=true;
this.onChangeStyle(this);
},select:function(){
this.selected=true;
this.onChangeStyle(this);
},deselect:function(_1b){
if(_1b){
setTimeout(dojo.hitch(this,function(){
this.selected=false;
this.onChangeStyle(this);
}),200);
}else{
this.selected=false;
this.onChangeStyle(this);
}
},_toggleSelected:function(){
if(!this.selected){
return;
}
this.deselect();
setTimeout(dojo.hitch(this,"select"),0);
},highlight:function(){
this.highlighted=true;
this.onChangeStyle(this);
},unhighlight:function(){
this.highlighted=false;
this.onChangeStyle(this);
},moveToFront:function(){
this.container&&this.container.moveToFront();
},moveToBack:function(){
this.container&&this.container.moveToBack();
},onTransformBegin:function(_1c){
this._isBeingModified=true;
},onTransformEnd:function(_1d){
this._isBeingModified=false;
this.onModify(this);
},onTransform:function(_1e){
if(!this._isBeingModified){
this.onTransformBegin();
}
this.setPoints(this.points);
this.render();
},transformPoints:function(mx){
if(!mx.dx&&!mx.dy){
return;
}
var _1f=dojo.clone(this.points),_20=false;
dojo.forEach(this.points,function(o){
o.x+=mx.dx;
o.y+=mx.dy;
if(o.x<this.marginZero||o.y<this.marginZero){
_20=true;
}
});
if(_20){
this.points=_1f;
console.error("Attempt to set object '"+this.id+"' to less than zero.");
return;
}
this.onTransform();
this.onTransformEnd();
},applyTransform:function(mx){
this.transformPoints(mx);
},setTransform:function(mx){
this.attr({x:mx.dx,y:mx.dy});
},getTransform:function(){
return this.selected?this.container.getParent().getTransform():{dx:0,dy:0};
},addShadow:function(_21){
_21=_21===true?{}:_21;
_21.stencil=this;
this.shadow=new dojox.drawing.annotations.BoxShadow(_21);
},removeShadow:function(){
this.shadow.destroy();
},setLabel:function(_22){
if(!this._label){
this._label=new dojox.drawing.annotations.Label({text:_22,util:this.util,mouse:this.mouse,stencil:this,annotation:true,container:this.container,labelPosition:this.labelPosition});
}else{
if(_22!=undefined){
this._label.setLabel(_22);
}
}
},getLabel:function(){
if(this._label){
return this._label.getText();
}
return null;
},getAngle:function(){
var d=this.pointsToData();
var obj={start:{x:d.x1,y:d.y1},x:d.x2,y:d.y2};
var _23=this.util.angle(obj,this.angleSnap);
_23<0?_23=360+_23:_23;
return _23;
},getRadius:function(){
var box=this.getBounds(true);
var _24={start:{x:box.x1,y:box.y1},x:box.x2,y:box.y2};
return this.util.length(_24);
},getBounds:function(_25){
var p=this.points,x1,y1,x2,y2;
if(p.length==2){
if(_25){
x1=p[0].x;
y1=p[0].y;
x2=p[1].x;
y2=p[1].y;
}else{
x1=p[0].x<p[1].x?p[0].x:p[1].x;
y1=p[0].y<p[1].y?p[0].y:p[1].y;
x2=p[0].x<p[1].x?p[1].x:p[0].x;
y2=p[0].y<p[1].y?p[1].y:p[0].y;
}
return {x1:x1,y1:y1,x2:x2,y2:y2,x:x1,y:y1,w:x2-x1,h:y2-y1};
}else{
return {x1:p[0].x,y1:p[0].y,x2:p[2].x,y2:p[2].y,x:p[0].x,y:p[0].y,w:p[2].x-p[0].x,h:p[2].y-p[0].y};
}
},preventNegativePos:function(){
if(this._isBeingModified){
return;
}
if(!this.points||!this.points.length){
return;
}
if(this.type=="dojox.drawing.tools.custom.Axes"){
var _26=this.marginZero,_27=this.marginZero;
dojo.forEach(this.points,function(p){
_26=Math.min(p.y,_26);
});
dojo.forEach(this.points,function(p){
_27=Math.min(p.x,_27);
});
if(_26<this.marginZero){
dojo.forEach(this.points,function(p,i){
p.y=p.y+(this.marginZero-_26);
},this);
}
if(_27<this.marginZero){
dojo.forEach(this.points,function(p){
p.x+=(this.marginZero-_27);
},this);
}
}else{
dojo.forEach(this.points,function(p){
p.x=p.x<0?this.marginZero:p.x;
p.y=p.y<0?this.marginZero:p.y;
});
}
this.setPoints(this.points);
},_onPostRender:function(_28){
if(this._isBeingModified){
this.onModify(this);
this._isBeingModified=false;
}else{
if(!this.created){
}
}
if(!this.editMode&&!this.selected&&this._prevData&&dojo.toJson(this._prevData)!=dojo.toJson(this.data)){
this.onChangeData(this);
this._prevData=dojo.clone(this.data);
}else{
if(!this._prevData&&(!this.isText||this.getText())){
this._prevData=dojo.clone(this.data);
}
}
},_setNodeAtts:function(_29){
var att=this.enabled&&(!this.annotation||this.drawingType=="label")?this.drawingType:"";
this.util.attr(_29,"drawingType",att);
},destroy:function(){
if(this.destroyed){
return;
}
if(this.data||this.points&&this.points.length){
this.onDelete(this);
}
this.disconnectMouse();
this.disconnect(this._cons);
dojo.disconnect(this._postRenderCon);
this.remove(this.shape,this.hit);
this.destroyed=true;
},remove:function(){
var a=arguments;
if(!a.length){
if(!this.shape){
return;
}
a=[this.shape];
}
for(var i=0;i<a.length;i++){
if(a[i]){
a[i].removeShape();
}
}
},connectMult:function(){
if(arguments.length>1){
this._cons.push(this.connect.apply(this,arguments));
}else{
if(dojo.isArray(arguments[0][0])){
dojo.forEach(arguments[0],function(ar){
this._cons.push(this.connect.apply(this,ar));
},this);
}else{
this._cons.push(this.connect.apply(this,arguments[0]));
}
}
},connect:function(o,e,s,m,_2a){
var c;
if(typeof (o)!="object"){
if(s){
m=s;
s=e;
e=o;
o=this;
}else{
m=e;
e=o;
o=s=this;
}
}else{
if(!m){
m=s;
s=this;
}else{
if(_2a){
c=dojo.connect(o,e,function(evt){
dojo.hitch(s,m)(evt);
dojo.disconnect(c);
});
this._cons.push(c);
return c;
}else{
}
}
}
c=dojo.connect(o,e,s,m);
this._cons.push(c);
return c;
},disconnect:function(_2b){
if(!_2b){
return;
}
if(!dojo.isArray(_2b)){
_2b=[_2b];
}
dojo.forEach(_2b,dojo.disconnect,dojo);
},connectMouse:function(){
this._mouseHandle=this.mouse.register(this);
},disconnectMouse:function(){
this.mouse.unregister(this._mouseHandle);
},render:function(){
},dataToPoints:function(_2c){
},pointsToData:function(_2d){
},onDown:function(obj){
this._downOnCanvas=true;
dojo.disconnect(this._postRenderCon);
this._postRenderCon=null;
},onMove:function(obj){
},onDrag:function(obj){
},onUp:function(obj){
}});
}
