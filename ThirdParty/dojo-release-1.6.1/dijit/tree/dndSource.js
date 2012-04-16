/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.tree.dndSource"]){
dojo._hasResource["dijit.tree.dndSource"]=true;
dojo.provide("dijit.tree.dndSource");
dojo.require("dijit.tree._dndSelector");
dojo.require("dojo.dnd.Manager");
dojo.declare("dijit.tree.dndSource",dijit.tree._dndSelector,{isSource:true,accept:["text","treeNode"],copyOnly:false,dragThreshold:5,betweenThreshold:0,constructor:function(_1,_2){
if(!_2){
_2={};
}
dojo.mixin(this,_2);
this.isSource=typeof _2.isSource=="undefined"?true:_2.isSource;
var _3=_2.accept instanceof Array?_2.accept:["text","treeNode"];
this.accept=null;
if(_3.length){
this.accept={};
for(var i=0;i<_3.length;++i){
this.accept[_3[i]]=1;
}
}
this.isDragging=false;
this.mouseDown=false;
this.targetAnchor=null;
this.targetBox=null;
this.dropPosition="";
this._lastX=0;
this._lastY=0;
this.sourceState="";
if(this.isSource){
dojo.addClass(this.node,"dojoDndSource");
}
this.targetState="";
if(this.accept){
dojo.addClass(this.node,"dojoDndTarget");
}
this.topics=[dojo.subscribe("/dnd/source/over",this,"onDndSourceOver"),dojo.subscribe("/dnd/start",this,"onDndStart"),dojo.subscribe("/dnd/drop",this,"onDndDrop"),dojo.subscribe("/dnd/cancel",this,"onDndCancel")];
},checkAcceptance:function(_4,_5){
return true;
},copyState:function(_6){
return this.copyOnly||_6;
},destroy:function(){
this.inherited("destroy",arguments);
dojo.forEach(this.topics,dojo.unsubscribe);
this.targetAnchor=null;
},_onDragMouse:function(e){
var m=dojo.dnd.manager(),_7=this.targetAnchor,_8=this.current,_9=this.dropPosition;
var _a="Over";
if(_8&&this.betweenThreshold>0){
if(!this.targetBox||_7!=_8){
this.targetBox=dojo.position(_8.rowNode,true);
}
if((e.pageY-this.targetBox.y)<=this.betweenThreshold){
_a="Before";
}else{
if((e.pageY-this.targetBox.y)>=(this.targetBox.h-this.betweenThreshold)){
_a="After";
}
}
}
if(_8!=_7||_a!=_9){
if(_7){
this._removeItemClass(_7.rowNode,_9);
}
if(_8){
this._addItemClass(_8.rowNode,_a);
}
if(!_8){
m.canDrop(false);
}else{
if(_8==this.tree.rootNode&&_a!="Over"){
m.canDrop(false);
}else{
if(m.source==this&&(_8.id in this.selection)){
m.canDrop(false);
}else{
if(this.checkItemAcceptance(_8.rowNode,m.source,_a.toLowerCase())&&!this._isParentChildDrop(m.source,_8.rowNode)){
m.canDrop(true);
}else{
m.canDrop(false);
}
}
}
}
this.targetAnchor=_8;
this.dropPosition=_a;
}
},onMouseMove:function(e){
if(this.isDragging&&this.targetState=="Disabled"){
return;
}
this.inherited(arguments);
var m=dojo.dnd.manager();
if(this.isDragging){
this._onDragMouse(e);
}else{
if(this.mouseDown&&this.isSource&&(Math.abs(e.pageX-this._lastX)>=this.dragThreshold||Math.abs(e.pageY-this._lastY)>=this.dragThreshold)){
var _b=this.getSelectedTreeNodes();
if(_b.length){
if(_b.length>1){
var _c=this.selection,i=0,r=[],n,p;
nextitem:
while((n=_b[i++])){
for(p=n.getParent();p&&p!==this.tree;p=p.getParent()){
if(_c[p.id]){
continue nextitem;
}
}
r.push(n);
}
_b=r;
}
_b=dojo.map(_b,function(n){
return n.domNode;
});
m.startDrag(this,_b,this.copyState(dojo.isCopyKey(e)));
}
}
}
},onMouseDown:function(e){
this.mouseDown=true;
this.mouseButton=e.button;
this._lastX=e.pageX;
this._lastY=e.pageY;
this.inherited(arguments);
},onMouseUp:function(e){
if(this.mouseDown){
this.mouseDown=false;
this.inherited(arguments);
}
},onMouseOut:function(){
this.inherited(arguments);
this._unmarkTargetAnchor();
},checkItemAcceptance:function(_d,_e,_f){
return true;
},onDndSourceOver:function(_10){
if(this!=_10){
this.mouseDown=false;
this._unmarkTargetAnchor();
}else{
if(this.isDragging){
var m=dojo.dnd.manager();
m.canDrop(false);
}
}
},onDndStart:function(_11,_12,_13){
if(this.isSource){
this._changeState("Source",this==_11?(_13?"Copied":"Moved"):"");
}
var _14=this.checkAcceptance(_11,_12);
this._changeState("Target",_14?"":"Disabled");
if(this==_11){
dojo.dnd.manager().overSource(this);
}
this.isDragging=true;
},itemCreator:function(_15,_16,_17){
return dojo.map(_15,function(_18){
return {"id":_18.id,"name":_18.textContent||_18.innerText||""};
});
},onDndDrop:function(_19,_1a,_1b){
if(this.containerState=="Over"){
var _1c=this.tree,_1d=_1c.model,_1e=this.targetAnchor,_1f=false;
this.isDragging=false;
var _20=_1e;
var _21;
var _22;
_21=(_20&&_20.item)||_1c.item;
if(this.dropPosition=="Before"||this.dropPosition=="After"){
_21=(_20.getParent()&&_20.getParent().item)||_1c.item;
_22=_20.getIndexInParent();
if(this.dropPosition=="After"){
_22=_20.getIndexInParent()+1;
}
}else{
_21=(_20&&_20.item)||_1c.item;
}
var _23;
dojo.forEach(_1a,function(_24,idx){
var _25=_19.getItem(_24.id);
if(dojo.indexOf(_25.type,"treeNode")!=-1){
var _26=_25.data,_27=_26.item,_28=_26.getParent().item;
}
if(_19==this){
if(typeof _22=="number"){
if(_21==_28&&_26.getIndexInParent()<_22){
_22-=1;
}
}
_1d.pasteItem(_27,_28,_21,_1b,_22);
}else{
if(_1d.isItem(_27)){
_1d.pasteItem(_27,_28,_21,_1b,_22);
}else{
if(!_23){
_23=this.itemCreator(_1a,_1e.rowNode,_19);
}
_1d.newItem(_23[idx],_21,_22);
}
}
},this);
this.tree._expandNode(_20);
}
this.onDndCancel();
},onDndCancel:function(){
this._unmarkTargetAnchor();
this.isDragging=false;
this.mouseDown=false;
delete this.mouseButton;
this._changeState("Source","");
this._changeState("Target","");
},onOverEvent:function(){
this.inherited(arguments);
dojo.dnd.manager().overSource(this);
},onOutEvent:function(){
this._unmarkTargetAnchor();
var m=dojo.dnd.manager();
if(this.isDragging){
m.canDrop(false);
}
m.outSource(this);
this.inherited(arguments);
},_isParentChildDrop:function(_29,_2a){
if(!_29.tree||_29.tree!=this.tree){
return false;
}
var _2b=_29.tree.domNode;
var ids=_29.selection;
var _2c=_2a.parentNode;
while(_2c!=_2b&&!ids[_2c.id]){
_2c=_2c.parentNode;
}
return _2c.id&&ids[_2c.id];
},_unmarkTargetAnchor:function(){
if(!this.targetAnchor){
return;
}
this._removeItemClass(this.targetAnchor.rowNode,this.dropPosition);
this.targetAnchor=null;
this.targetBox=null;
this.dropPosition=null;
},_markDndStatus:function(_2d){
this._changeState("Source",_2d?"Copied":"Moved");
}});
}
