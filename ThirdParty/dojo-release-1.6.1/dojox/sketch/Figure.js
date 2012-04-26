/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.sketch.Figure"]){
dojo._hasResource["dojox.sketch.Figure"]=true;
dojo.provide("dojox.sketch.Figure");
dojo.experimental("dojox.sketch");
dojo.require("dojox.gfx");
dojo.require("dojox.sketch.UndoStack");
(function(){
var ta=dojox.sketch;
ta.tools={};
ta.registerTool=function(_1,fn){
ta.tools[_1]=fn;
};
ta.Figure=function(_2){
var _3=this;
this.annCounter=1;
this.shapes=[];
this.image=null;
this.imageSrc=null;
this.size={w:0,h:0};
this.surface=null;
this.group=null;
this.node=null;
this.zoomFactor=1;
this.tools=null;
this.obj={};
dojo.mixin(this,_2);
this.selected=[];
this.hasSelections=function(){
return this.selected.length>0;
};
this.isSelected=function(_4){
for(var i=0;i<_3.selected.length;i++){
if(_3.selected[i]==_4){
return true;
}
}
return false;
};
this.select=function(_5){
if(!_3.isSelected(_5)){
_3.clearSelections();
_3.selected=[_5];
}
_5.setMode(ta.Annotation.Modes.View);
_5.setMode(ta.Annotation.Modes.Edit);
};
this.deselect=function(_6){
var _7=-1;
for(var i=0;i<_3.selected.length;i++){
if(_3.selected[i]==_6){
_7=i;
break;
}
}
if(_7>-1){
_6.setMode(ta.Annotation.Modes.View);
_3.selected.splice(_7,1);
}
return _6;
};
this.clearSelections=function(){
for(var i=0;i<_3.selected.length;i++){
_3.selected[i].setMode(ta.Annotation.Modes.View);
}
_3.selected=[];
};
this.replaceSelection=function(n,o){
if(!_3.isSelected(o)){
_3.select(n);
return;
}
var _8=-1;
for(var i=0;i<_3.selected.length;i++){
if(_3.selected[i]==o){
_8=i;
break;
}
}
if(_8>-1){
_3.selected.splice(_8,1,n);
}
};
this._c=null;
this._ctr=null;
this._lp=null;
this._action=null;
this._prevState=null;
this._startPoint=null;
this._ctool=null;
this._start=null;
this._end=null;
this._absEnd=null;
this._cshape=null;
this._dblclick=function(e){
var o=_3._fromEvt(e);
if(o){
_3.onDblClickShape(o,e);
}
};
this._keydown=function(e){
var _9=false;
if(e.ctrlKey){
if(e.keyCode===90||e.keyCode===122){
_3.undo();
_9=true;
}else{
if(e.keyCode===89||e.keyCode===121){
_3.redo();
_9=true;
}
}
}
if(e.keyCode===46||e.keyCode===8){
_3._delete(_3.selected);
_9=true;
}
if(_9){
dojo.stopEvent(e);
}
};
this._md=function(e){
if(dojox.gfx.renderer=="vml"){
_3.node.focus();
}
var o=_3._fromEvt(e);
_3._startPoint={x:e.pageX,y:e.pageY};
_3._ctr=dojo.position(_3.node);
var _a={x:_3.node.scrollLeft,y:_3.node.scrollTop};
_3._ctr={x:_3._ctr.x-_a.x,y:_3._ctr.y-_a.y};
var X=e.clientX-_3._ctr.x,Y=e.clientY-_3._ctr.y;
_3._lp={x:X,y:Y};
_3._start={x:X,y:Y};
_3._end={x:X,y:Y};
_3._absEnd={x:X,y:Y};
if(!o){
_3.clearSelections();
_3._ctool.onMouseDown(e);
}else{
if(o.type&&o.type()!="Anchor"){
if(!_3.isSelected(o)){
_3.select(o);
_3._sameShapeSelected=false;
}else{
_3._sameShapeSelected=true;
}
}
o.beginEdit();
_3._c=o;
}
};
this._mm=function(e){
if(!_3._ctr){
return;
}
var x=e.clientX-_3._ctr.x;
var y=e.clientY-_3._ctr.y;
var dx=x-_3._lp.x;
var dy=y-_3._lp.y;
_3._absEnd={x:x,y:y};
if(_3._c){
_3._c.setBinding({dx:dx/_3.zoomFactor,dy:dy/_3.zoomFactor});
_3._lp={x:x,y:y};
}else{
_3._end={x:dx,y:dy};
var _b={x:Math.min(_3._start.x,_3._absEnd.x),y:Math.min(_3._start.y,_3._absEnd.y),width:Math.abs(_3._start.x-_3._absEnd.x),height:Math.abs(_3._start.y-_3._absEnd.y)};
if(_b.width&&_b.height){
_3._ctool.onMouseMove(e,_b);
}
}
};
this._mu=function(e){
if(_3._c){
_3._c.endEdit();
}else{
_3._ctool.onMouseUp(e);
}
_3._c=_3._ctr=_3._lp=_3._action=_3._prevState=_3._startPoint=null;
_3._cshape=_3._start=_3._end=_3._absEnd=null;
};
this.initUndoStack();
};
var p=ta.Figure.prototype;
p.initUndoStack=function(){
this.history=new ta.UndoStack(this);
};
p.setTool=function(t){
this._ctool=t;
};
p.gridSize=0;
p._calCol=function(v){
return this.gridSize?(Math.round(v/this.gridSize)*this.gridSize):v;
};
p._delete=function(_c,_d){
for(var i=0;i<_c.length;i++){
_c[i].setMode(ta.Annotation.Modes.View);
_c[i].destroy(_d);
this.remove(_c[i]);
this._remove(_c[i]);
if(!_d){
_c[i].onRemove();
}
}
_c.splice(0,_c.length);
};
p.onDblClickShape=function(_e,e){
if(_e["onDblClick"]){
_e.onDblClick(e);
}
};
p.onCreateShape=function(_f){
};
p.onBeforeCreateShape=function(_10){
};
p.initialize=function(_11){
this.node=_11;
this.surface=dojox.gfx.createSurface(_11,this.size.w,this.size.h);
this.group=this.surface.createGroup();
this._cons=[];
var es=this.surface.getEventSource();
this._cons.push(dojo.connect(es,"ondraggesture",dojo.stopEvent),dojo.connect(es,"ondragenter",dojo.stopEvent),dojo.connect(es,"ondragover",dojo.stopEvent),dojo.connect(es,"ondragexit",dojo.stopEvent),dojo.connect(es,"ondragstart",dojo.stopEvent),dojo.connect(es,"onselectstart",dojo.stopEvent),dojo.connect(es,"onmousedown",this._md),dojo.connect(es,"onmousemove",this._mm),dojo.connect(es,"onmouseup",this._mu),dojo.connect(es,"onclick",this,"onClick"),dojo.connect(es,"ondblclick",this._dblclick),dojo.connect(_11,"onkeydown",this._keydown));
this.image=this.group.createImage({width:this.imageSize.w,height:this.imageSize.h,src:this.imageSrc});
};
p.destroy=function(_12){
if(!this.node){
return;
}
if(!_12){
if(this.history){
this.history.destroy();
}
if(this._subscribed){
dojo.unsubscribe(this._subscribed);
delete this._subscribed;
}
}
dojo.forEach(this._cons,dojo.disconnect);
this._cons=[];
dojo.empty(this.node);
this.group=this.surface=null;
this.obj={};
this.shapes=[];
};
p.nextKey=function(){
return "annotation-"+this.annCounter++;
};
p.draw=function(){
};
p.zoom=function(pct){
this.zoomFactor=pct/100;
var w=this.size.w*this.zoomFactor;
var h=this.size.h*this.zoomFactor;
this.surface.setDimensions(w,h);
this.group.setTransform(dojox.gfx.matrix.scale(this.zoomFactor,this.zoomFactor));
for(var i=0;i<this.shapes.length;i++){
this.shapes[i].zoom(this.zoomFactor);
}
};
p.getFit=function(){
var wF=(this.node.parentNode.offsetWidth-5)/this.size.w;
var hF=(this.node.parentNode.offsetHeight-5)/this.size.h;
return Math.min(wF,hF)*100;
};
p.unzoom=function(){
this.zoomFactor=1;
this.surface.setDimensions(this.size.w,this.size.h);
this.group.setTransform();
};
p._add=function(obj){
this.obj[obj._key]=obj;
};
p._remove=function(obj){
if(this.obj[obj._key]){
delete this.obj[obj._key];
}
};
p._get=function(key){
if(key&&key.indexOf("bounding")>-1){
key=key.replace("-boundingBox","");
}else{
if(key&&key.indexOf("-labelShape")>-1){
key=key.replace("-labelShape","");
}
}
return this.obj[key];
};
p._keyFromEvt=function(e){
var key=e.target.id+"";
if(key.length==0){
var p=e.target.parentNode;
var _13=this.surface.getEventSource();
while(p&&p.id.length==0&&p!=_13){
p=p.parentNode;
}
key=p.id;
}
return key;
};
p._fromEvt=function(e){
return this._get(this._keyFromEvt(e));
};
p.add=function(_14){
for(var i=0;i<this.shapes.length;i++){
if(this.shapes[i]==_14){
return true;
}
}
this.shapes.push(_14);
return true;
};
p.remove=function(_15){
var idx=-1;
for(var i=0;i<this.shapes.length;i++){
if(this.shapes[i]==_15){
idx=i;
break;
}
}
if(idx>-1){
this.shapes.splice(idx,1);
}
return _15;
};
p.getAnnotator=function(id){
for(var i=0;i<this.shapes.length;i++){
if(this.shapes[i].id==id){
return this.shapes[i];
}
}
return null;
};
p.convert=function(ann,t){
var _16=t+"Annotation";
if(!ta[_16]){
return;
}
var _17=ann.type(),id=ann.id,_18=ann.label,_19=ann.mode,_1a=ann.tokenId;
var _1b,end,_1c,_1d;
switch(_17){
case "Preexisting":
case "Lead":
_1d={dx:ann.transform.dx,dy:ann.transform.dy};
_1b={x:ann.start.x,y:ann.start.y};
end={x:ann.end.x,y:ann.end.y};
var cx=end.x-((end.x-_1b.x)/2);
var cy=end.y-((end.y-_1b.y)/2);
_1c={x:cx,y:cy};
break;
case "SingleArrow":
case "DoubleArrow":
_1d={dx:ann.transform.dx,dy:ann.transform.dy};
_1b={x:ann.start.x,y:ann.start.y};
end={x:ann.end.x,y:ann.end.y};
_1c={x:ann.control.x,y:ann.control.y};
break;
case "Underline":
_1d={dx:ann.transform.dx,dy:ann.transform.dy};
_1b={x:ann.start.x,y:ann.start.y};
_1c={x:_1b.x+50,y:_1b.y+50};
end={x:_1b.x+100,y:_1b.y+100};
break;
case "Brace":
}
var n=new ta[_16](this,id);
if(n.type()=="Underline"){
n.transform={dx:_1d.dx+_1b.x,dy:_1d.dy+_1b.y};
}else{
if(n.transform){
n.transform=_1d;
}
if(n.start){
n.start=_1b;
}
}
if(n.end){
n.end=end;
}
if(n.control){
n.control=_1c;
}
n.label=_18;
n.token=dojo.lang.shallowCopy(ann.token);
n.initialize();
this.replaceSelection(n,ann);
this._remove(ann);
this.remove(ann);
ann.destroy();
n.setMode(_19);
};
p.setValue=function(_1e){
var obj=dojox.xml.DomParser.parse(_1e);
var _1f=this.node;
this.load(obj,_1f);
};
p.load=function(obj,n){
if(this.surface){
this.destroy(true);
}
var _20=obj.documentElement;
this.size={w:parseFloat(_20.getAttribute("width"),10),h:parseFloat(_20.getAttribute("height"),10)};
var g=_20.childrenByName("g")[0];
var img=g.childrenByName("image")[0];
this.imageSize={w:parseFloat(img.getAttribute("width"),10),h:parseFloat(img.getAttribute("height"),10)};
this.imageSrc=img.getAttribute("xlink:href");
this.initialize(n);
var ann=g.childrenByName("g");
for(var i=0;i<ann.length;i++){
this._loadAnnotation(ann[i]);
}
if(this._loadDeferred){
this._loadDeferred.callback(this);
this._loadDeferred=null;
}
this.onLoad();
};
p.onLoad=function(){
};
p.onClick=function(){
};
p._loadAnnotation=function(obj){
var _21=obj.getAttribute("dojoxsketch:type")+"Annotation";
if(ta[_21]){
var a=new ta[_21](this,obj.id);
a.initialize(obj);
this.nextKey();
a.setMode(ta.Annotation.Modes.View);
this._add(a);
return a;
}
return null;
};
p.onUndo=function(){
};
p.onBeforeUndo=function(){
};
p.onRedo=function(){
};
p.onBeforeRedo=function(){
};
p.undo=function(){
if(this.history){
this.onBeforeUndo();
this.history.undo();
this.onUndo();
}
};
p.redo=function(){
if(this.history){
this.onBeforeRedo();
this.history.redo();
this.onRedo();
}
};
p.serialize=function(){
var s="<svg xmlns=\"http://www.w3.org/2000/svg\" "+"xmlns:xlink=\"http://www.w3.org/1999/xlink\" "+"xmlns:dojoxsketch=\"http://dojotoolkit.org/dojox/sketch\" "+"width=\""+this.size.w+"\" height=\""+this.size.h+"\">"+"<g>"+"<image xlink:href=\""+this.imageSrc+"\" x=\"0\" y=\"0\" width=\""+this.size.w+"\" height=\""+this.size.h+"\" />";
for(var i=0;i<this.shapes.length;i++){
s+=this.shapes[i].serialize();
}
s+="</g></svg>";
return s;
};
p.getValue=p.serialize;
})();
}
