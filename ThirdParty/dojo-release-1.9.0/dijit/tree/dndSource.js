//>>built
define("dijit/tree/dndSource",["dojo/_base/array","dojo/_base/connect","dojo/_base/declare","dojo/dom-class","dojo/dom-geometry","dojo/_base/lang","dojo/on","dojo/touch","dojo/topic","dojo/dnd/Manager","./_dndSelector"],function(_1,_2,_3,_4,_5,_6,on,_7,_8,_9,_a){
var _b=_3("dijit.tree.dndSource",_a,{isSource:true,accept:["text","treeNode"],copyOnly:false,dragThreshold:5,betweenThreshold:0,generateText:true,constructor:function(_c,_d){
if(!_d){
_d={};
}
_6.mixin(this,_d);
var _e=_d.accept instanceof Array?_d.accept:["text","treeNode"];
this.accept=null;
if(_e.length){
this.accept={};
for(var i=0;i<_e.length;++i){
this.accept[_e[i]]=1;
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
_4.add(this.node,"dojoDndSource");
}
this.targetState="";
if(this.accept){
_4.add(this.node,"dojoDndTarget");
}
this.topics=[_8.subscribe("/dnd/source/over",_6.hitch(this,"onDndSourceOver")),_8.subscribe("/dnd/start",_6.hitch(this,"onDndStart")),_8.subscribe("/dnd/drop",_6.hitch(this,"onDndDrop")),_8.subscribe("/dnd/cancel",_6.hitch(this,"onDndCancel"))];
},checkAcceptance:function(){
return true;
},copyState:function(_f){
return this.copyOnly||_f;
},destroy:function(){
this.inherited(arguments);
var h;
while(h=this.topics.pop()){
h.remove();
}
this.targetAnchor=null;
},_onDragMouse:function(e,_10){
var m=_9.manager(),_11=this.targetAnchor,_12=this.current,_13=this.dropPosition;
var _14="Over";
if(_12&&this.betweenThreshold>0){
if(!this.targetBox||_11!=_12){
this.targetBox=_5.position(_12.rowNode,true);
}
if((e.pageY-this.targetBox.y)<=this.betweenThreshold){
_14="Before";
}else{
if((e.pageY-this.targetBox.y)>=(this.targetBox.h-this.betweenThreshold)){
_14="After";
}
}
}
if(_10||_12!=_11||_14!=_13){
if(_11){
this._removeItemClass(_11.rowNode,_13);
}
if(_12){
this._addItemClass(_12.rowNode,_14);
}
if(!_12){
m.canDrop(false);
}else{
if(_12==this.tree.rootNode&&_14!="Over"){
m.canDrop(false);
}else{
var _15=false;
if(m.source==this){
for(var _16 in this.selection){
var _17=this.selection[_16];
if(_17.item===_12.item){
_15=true;
break;
}
}
}
if(_15){
m.canDrop(false);
}else{
if(this.checkItemAcceptance(_12.rowNode,m.source,_14.toLowerCase())&&!this._isParentChildDrop(m.source,_12.rowNode)){
m.canDrop(true);
}else{
m.canDrop(false);
}
}
}
}
this.targetAnchor=_12;
this.dropPosition=_14;
}
},onMouseMove:function(e){
if(this.isDragging&&this.targetState=="Disabled"){
return;
}
this.inherited(arguments);
var m=_9.manager();
if(this.isDragging){
this._onDragMouse(e);
}else{
if(this.mouseDown&&this.isSource&&(Math.abs(e.pageX-this._lastX)>=this.dragThreshold||Math.abs(e.pageY-this._lastY)>=this.dragThreshold)){
var _18=this.getSelectedTreeNodes();
if(_18.length){
if(_18.length>1){
var _19=this.selection,i=0,r=[],n,p;
nextitem:
while((n=_18[i++])){
for(p=n.getParent();p&&p!==this.tree;p=p.getParent()){
if(_19[p.id]){
continue nextitem;
}
}
r.push(n);
}
_18=r;
}
_18=_1.map(_18,function(n){
return n.domNode;
});
m.startDrag(this,_18,this.copyState(_2.isCopyKey(e)));
this._onDragMouse(e,true);
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
},checkItemAcceptance:function(){
return true;
},onDndSourceOver:function(_1a){
if(this!=_1a){
this.mouseDown=false;
this._unmarkTargetAnchor();
}else{
if(this.isDragging){
var m=_9.manager();
m.canDrop(false);
}
}
},onDndStart:function(_1b,_1c,_1d){
if(this.isSource){
this._changeState("Source",this==_1b?(_1d?"Copied":"Moved"):"");
}
var _1e=this.checkAcceptance(_1b,_1c);
this._changeState("Target",_1e?"":"Disabled");
if(this==_1b){
_9.manager().overSource(this);
}
this.isDragging=true;
},itemCreator:function(_1f){
return _1.map(_1f,function(_20){
return {"id":_20.id,"name":_20.textContent||_20.innerText||""};
});
},onDndDrop:function(_21,_22,_23){
if(this.containerState=="Over"){
var _24=this.tree,_25=_24.model,_26=this.targetAnchor;
this.isDragging=false;
var _27;
var _28;
var _29;
_27=(_26&&_26.item)||_24.item;
if(this.dropPosition=="Before"||this.dropPosition=="After"){
_27=(_26.getParent()&&_26.getParent().item)||_24.item;
_28=_26.getIndexInParent();
if(this.dropPosition=="After"){
_28=_26.getIndexInParent()+1;
_29=_26.getNextSibling()&&_26.getNextSibling().item;
}else{
_29=_26.item;
}
}else{
_27=(_26&&_26.item)||_24.item;
}
var _2a;
_1.forEach(_22,function(_2b,idx){
var _2c=_21.getItem(_2b.id);
if(_1.indexOf(_2c.type,"treeNode")!=-1){
var _2d=_2c.data,_2e=_2d.item,_2f=_2d.getParent().item;
}
if(_21==this){
if(typeof _28=="number"){
if(_27==_2f&&_2d.getIndexInParent()<_28){
_28-=1;
}
}
_25.pasteItem(_2e,_2f,_27,_23,_28,_29);
}else{
if(_25.isItem(_2e)){
_25.pasteItem(_2e,_2f,_27,_23,_28,_29);
}else{
if(!_2a){
_2a=this.itemCreator(_22,_26.rowNode,_21);
}
_25.newItem(_2a[idx],_27,_28,_29);
}
}
},this);
this.tree._expandNode(_26);
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
_9.manager().overSource(this);
},onOutEvent:function(){
this._unmarkTargetAnchor();
var m=_9.manager();
if(this.isDragging){
m.canDrop(false);
}
m.outSource(this);
this.inherited(arguments);
},_isParentChildDrop:function(_30,_31){
if(!_30.tree||_30.tree!=this.tree){
return false;
}
var _32=_30.tree.domNode;
var ids=_30.selection;
var _33=_31.parentNode;
while(_33!=_32&&!ids[_33.id]){
_33=_33.parentNode;
}
return _33.id&&ids[_33.id];
},_unmarkTargetAnchor:function(){
if(!this.targetAnchor){
return;
}
this._removeItemClass(this.targetAnchor.rowNode,this.dropPosition);
this.targetAnchor=null;
this.targetBox=null;
this.dropPosition=null;
},_markDndStatus:function(_34){
this._changeState("Source",_34?"Copied":"Moved");
}});
return _b;
});
