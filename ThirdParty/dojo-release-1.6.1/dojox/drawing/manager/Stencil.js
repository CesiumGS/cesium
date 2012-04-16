/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.manager.Stencil"]){
dojo._hasResource["dojox.drawing.manager.Stencil"]=true;
dojo.provide("dojox.drawing.manager.Stencil");
(function(){
var _1,_2;
dojox.drawing.manager.Stencil=dojox.drawing.util.oo.declare(function(_3){
_1=_3.surface;
this.canvas=_3.canvas;
this.defaults=dojox.drawing.defaults.copy();
this.undo=_3.undo;
this.mouse=_3.mouse;
this.keys=_3.keys;
this.anchors=_3.anchors;
this.stencils={};
this.selectedStencils={};
this._mouseHandle=this.mouse.register(this);
dojo.connect(this.keys,"onArrow",this,"onArrow");
dojo.connect(this.keys,"onEsc",this,"deselect");
dojo.connect(this.keys,"onDelete",this,"onDelete");
},{_dragBegun:false,_wasDragged:false,_secondClick:false,_isBusy:false,setRecentStencil:function(_4){
this.recent=_4;
},getRecentStencil:function(){
return this.recent;
},register:function(_5){
if(_5.isText&&!_5.editMode&&_5.deleteEmptyCreate&&!_5.getText()){
console.warn("EMPTY CREATE DELETE",_5);
_5.destroy();
return false;
}
this.stencils[_5.id]=_5;
this.setRecentStencil(_5);
if(_5.execText){
if(_5._text&&!_5.editMode){
this.selectItem(_5);
}
_5.connect("execText",this,function(){
if(_5.isText&&_5.deleteEmptyModify&&!_5.getText()){
console.warn("EMPTY MOD DELETE",_5);
this.deleteItem(_5);
}else{
if(_5.selectOnExec){
this.selectItem(_5);
}
}
});
}
_5.connect("deselect",this,function(){
if(!this._isBusy&&this.isSelected(_5)){
this.deselectItem(_5);
}
});
_5.connect("select",this,function(){
if(!this._isBusy&&!this.isSelected(_5)){
this.selectItem(_5);
}
});
return _5;
},unregister:function(_6){
if(_6){
_6.selected&&this.onDeselect(_6);
delete this.stencils[_6.id];
}
},onArrow:function(_7){
if(this.hasSelected()){
this.saveThrottledState();
this.group.applyTransform({dx:_7.x,dy:_7.y});
}
},_throttleVrl:null,_throttle:false,throttleTime:400,_lastmxx:-1,_lastmxy:-1,saveMoveState:function(){
var mx=this.group.getTransform();
if(mx.dx==this._lastmxx&&mx.dy==this._lastmxy){
return;
}
this._lastmxx=mx.dx;
this._lastmxy=mx.dy;
this.undo.add({before:dojo.hitch(this.group,"setTransform",mx)});
},saveThrottledState:function(){
clearTimeout(this._throttleVrl);
clearInterval(this._throttleVrl);
this._throttleVrl=setTimeout(dojo.hitch(this,function(){
this._throttle=false;
this.saveMoveState();
}),this.throttleTime);
if(this._throttle){
return;
}
this._throttle=true;
this.saveMoveState();
},unDelete:function(_8){
for(var s in _8){
_8[s].render();
this.onSelect(_8[s]);
}
},onDelete:function(_9){
if(_9!==true){
this.undo.add({before:dojo.hitch(this,"unDelete",this.selectedStencils),after:dojo.hitch(this,"onDelete",true)});
}
this.withSelected(function(m){
this.anchors.remove(m);
var id=m.id;
m.destroy();
delete this.stencils[id];
});
this.selectedStencils={};
},deleteItem:function(_a){
if(this.hasSelected()){
var _b=[];
for(var m in this.selectedStencils){
if(this.selectedStencils.id==_a.id){
if(this.hasSelected()==1){
this.onDelete();
return;
}
}else{
_b.push(this.selectedStencils.id);
}
}
this.deselect();
this.selectItem(_a);
this.onDelete();
dojo.forEach(_b,function(id){
this.selectItem(id);
},this);
}else{
this.selectItem(_a);
this.onDelete();
}
},removeAll:function(){
this.selectAll();
this._isBusy=true;
this.onDelete();
this.stencils={};
this._isBusy=false;
},setSelectionGroup:function(){
this.withSelected(function(m){
this.onDeselect(m,true);
});
if(this.group){
_1.remove(this.group);
this.group.removeShape();
}
this.group=_1.createGroup();
this.group.setTransform({dx:0,dy:0});
this.withSelected(function(m){
this.group.add(m.container);
m.select();
});
},setConstraint:function(){
var t=Infinity,l=Infinity;
this.withSelected(function(m){
var o=m.getBounds();
t=Math.min(o.y1,t);
l=Math.min(o.x1,l);
});
this.constrain={l:-l,t:-t};
},onDeselect:function(_c,_d){
if(!_d){
delete this.selectedStencils[_c.id];
}
this.anchors.remove(_c);
_1.add(_c.container);
_c.selected&&_c.deselect();
_c.applyTransform(this.group.getTransform());
},deselectItem:function(_e){
this.onDeselect(_e);
},deselect:function(){
this.withSelected(function(m){
this.onDeselect(m);
});
this._dragBegun=false;
this._wasDragged=false;
},onSelect:function(_f){
if(!_f){
console.error("null stencil is not selected:",this.stencils);
}
if(this.selectedStencils[_f.id]){
return;
}
this.selectedStencils[_f.id]=_f;
this.group.add(_f.container);
_f.select();
if(this.hasSelected()==1){
this.anchors.add(_f,this.group);
}
},selectAll:function(){
this._isBusy=true;
for(var m in this.stencils){
this.selectItem(m);
}
this._isBusy=false;
},selectItem:function(_10){
var id=typeof (_10)=="string"?_10:_10.id;
var _11=this.stencils[id];
this.setSelectionGroup();
this.onSelect(_11);
this.group.moveToFront();
this.setConstraint();
},onLabelDoubleClick:function(obj){
if(this.selectedStencils[obj.id]){
this.deselect();
}
},onStencilDoubleClick:function(obj){
if(this.selectedStencils[obj.id]){
if(this.selectedStencils[obj.id].edit){
var m=this.selectedStencils[obj.id];
m.editMode=true;
this.deselect();
m.edit();
}
}
},onAnchorUp:function(){
this.setConstraint();
},onStencilDown:function(obj,evt){
if(!this.stencils[obj.id]){
return;
}
this.setRecentStencil(this.stencils[obj.id]);
this._isBusy=true;
if(this.selectedStencils[obj.id]&&this.keys.meta){
if(dojo.isMac&&this.keys.cmmd){
}
this.onDeselect(this.selectedStencils[obj.id]);
if(this.hasSelected()==1){
this.withSelected(function(m){
this.anchors.add(m,this.group);
});
}
this.group.moveToFront();
this.setConstraint();
return;
}else{
if(this.selectedStencils[obj.id]){
var mx=this.group.getTransform();
this._offx=obj.x-mx.dx;
this._offy=obj.y-mx.dy;
return;
}else{
if(!this.keys.meta){
this.deselect();
}else{
}
}
}
this.selectItem(obj.id);
mx=this.group.getTransform();
this._offx=obj.x-mx.dx;
this._offy=obj.y-mx.dx;
this.orgx=obj.x;
this.orgy=obj.y;
this._isBusy=false;
this.undo.add({before:function(){
},after:function(){
}});
},onLabelDown:function(obj,evt){
this.onStencilDown(obj,evt);
},onStencilUp:function(obj){
},onLabelUp:function(obj){
this.onStencilUp(obj);
},onStencilDrag:function(obj){
if(!this._dragBegun){
this.onBeginDrag(obj);
this._dragBegun=true;
}else{
this.saveThrottledState();
var x=obj.x-obj.last.x,y=obj.y-obj.last.y,c=this.constrain,mz=this.defaults.anchors.marginZero;
x=obj.x-this._offx;
y=obj.y-this._offy;
if(x<c.l+mz){
x=c.l+mz;
}
if(y<c.t+mz){
y=c.t+mz;
}
this.group.setTransform({dx:x,dy:y});
}
},onLabelDrag:function(obj){
this.onStencilDrag(obj);
},onDragEnd:function(obj){
this._dragBegun=false;
},onBeginDrag:function(obj){
this._wasDragged=true;
},onDown:function(obj){
this.deselect();
},onStencilOver:function(obj){
dojo.style(obj.id,"cursor","move");
},onStencilOut:function(obj){
dojo.style(obj.id,"cursor","crosshair");
},exporter:function(){
var _12=[];
for(var m in this.stencils){
this.stencils[m].enabled&&_12.push(this.stencils[m].exporter());
}
return _12;
},listStencils:function(){
return this.stencils;
},toSelected:function(_13){
var _14=Array.prototype.slice.call(arguments).splice(1);
for(var m in this.selectedStencils){
var _15=this.selectedStencils[m];
_15[_13].apply(_15,_14);
}
},withSelected:function(_16){
var f=dojo.hitch(this,_16);
for(var m in this.selectedStencils){
f(this.selectedStencils[m]);
}
},withUnselected:function(_17){
var f=dojo.hitch(this,_17);
for(var m in this.stencils){
!this.stencils[m].selected&&f(this.stencils[m]);
}
},withStencils:function(_18){
var f=dojo.hitch(this,_18);
for(var m in this.stencils){
f(this.stencils[m]);
}
},hasSelected:function(){
var ln=0;
for(var m in this.selectedStencils){
ln++;
}
return ln;
},isSelected:function(_19){
return !!this.selectedStencils[_19.id];
}});
})();
}
