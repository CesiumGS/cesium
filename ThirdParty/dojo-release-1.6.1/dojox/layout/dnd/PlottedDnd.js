/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.dnd.PlottedDnd"]){
dojo._hasResource["dojox.layout.dnd.PlottedDnd"]=true;
dojo.provide("dojox.layout.dnd.PlottedDnd");
dojo.require("dojo.dnd.Source");
dojo.require("dojo.dnd.Manager");
dojo.require("dojox.layout.dnd.Avatar");
dojo.declare("dojox.layout.dnd.PlottedDnd",[dojo.dnd.Source],{GC_OFFSET_X:dojo.dnd.manager().OFFSET_X,GC_OFFSET_Y:dojo.dnd.manager().OFFSET_Y,constructor:function(_1,_2){
this.childBoxes=null;
this.dropIndicator=new dojox.layout.dnd.DropIndicator("dndDropIndicator","div");
this.withHandles=_2.withHandles;
this.handleClasses=_2.handleClasses;
this.opacity=_2.opacity;
this.allowAutoScroll=_2.allowAutoScroll;
this.dom=_2.dom;
this.singular=true;
this.skipForm=true;
this._over=false;
this.defaultHandleClass="GcDndHandle";
this.isDropped=false;
this._timer=null;
this.isOffset=(_2.isOffset)?true:false;
this.offsetDrag=(_2.offsetDrag)?_2.offsetDrag:{x:0,y:0};
this.hideSource=_2.hideSource?_2.hideSource:true;
this._drop=this.dropIndicator.create();
},_calculateCoords:function(_3){
dojo.forEach(this.node.childNodes,function(_4){
var c=dojo.coords(_4,true);
_4.coords={xy:c,w:_4.offsetWidth/2,h:_4.offsetHeight/2,mw:c.w};
if(_3){
_4.coords.mh=c.h;
}
},this);
},_legalMouseDown:function(e){
if(!this.withHandles){
return true;
}
for(var _5=(e.target);_5&&_5!=this.node;_5=_5.parentNode){
if(dojo.hasClass(_5,this.defaultHandleClass)){
return true;
}
}
return false;
},setDndItemSelectable:function(_6,_7){
for(var _8=_6;_8&&_6!=this.node;_8=_8.parentNode){
if(dojo.hasClass(_8,"dojoDndItem")){
dojo.setSelectable(_8,_7);
return;
}
}
},getDraggedWidget:function(_9){
var _a=_9;
while(_a&&_a.nodeName.toLowerCase()!="body"&&!dojo.hasClass(_a,"dojoDndItem")){
_a=_a.parentNode;
}
return (_a)?dijit.byNode(_a):null;
},isAccepted:function(_b){
var _c=(_b)?_b.getAttribute("dndtype"):null;
return (_c&&_c in this.accept);
},onDndStart:function(_d,_e,_f){
this.firstIndicator=(_d==this);
this._calculateCoords(true);
var m=dojo.dnd.manager();
if(_e[0].coords){
this._drop.style.height=_e[0].coords.mh+"px";
dojo.style(m.avatar.node,"width",_e[0].coords.mw+"px");
}else{
this._drop.style.height=m.avatar.node.clientHeight+"px";
}
this.dndNodes=_e;
dojox.layout.dnd.PlottedDnd.superclass.onDndStart.call(this,_d,_e,_f);
if(_d==this&&this.hideSource){
dojo.forEach(_e,function(n){
dojo.style(n,"display","none");
});
}
},onDndCancel:function(){
var m=dojo.dnd.manager();
if(m.source==this&&this.hideSource){
var _10=this.getSelectedNodes();
dojo.forEach(_10,function(n){
dojo.style(n,"display","");
});
}
dojox.layout.dnd.PlottedDnd.superclass.onDndCancel.call(this);
this.deleteDashedZone();
},onDndDrop:function(_11,_12,_13,_14){
try{
if(!this.isAccepted(_12[0])){
this.onDndCancel();
}else{
if(_11==this&&this._over&&this.dropObject){
this.current=this.dropObject.c;
}
dojox.layout.dnd.PlottedDnd.superclass.onDndDrop.call(this,_11,_12,_13,_14);
this._calculateCoords(true);
}
}
catch(e){
console.warn(e);
}
},onMouseDown:function(e){
if(this.current==null){
this.selection={};
}else{
if(this.current==this.anchor){
this.anchor=null;
}
}
if(this.current!==null){
var c=dojo.coords(this.current,true);
this.current.coords={xy:c,w:this.current.offsetWidth/2,h:this.current.offsetHeight/2,mh:c.h,mw:c.w};
this._drop.style.height=this.current.coords.mh+"px";
if(this.isOffset){
if(this.offsetDrag.x==0&&this.offsetDrag.y==0){
var _15=true;
var _16=dojo.coords(this._getChildByEvent(e));
this.offsetDrag.x=_16.x-e.pageX;
this.offsetDrag.y=_16.y-e.clientY;
}
if(this.offsetDrag.y<16&&this.current!=null){
this.offsetDrag.y=this.GC_OFFSET_Y;
}
var m=dojo.dnd.manager();
m.OFFSET_X=this.offsetDrag.x;
m.OFFSET_Y=this.offsetDrag.y;
if(_15){
this.offsetDrag.x=0;
this.offsetDrag.y=0;
}
}
}
if(dojo.dnd.isFormElement(e)){
this.setDndItemSelectable(e.target,true);
}else{
this.containerSource=true;
var _17=this.getDraggedWidget(e.target);
if(_17&&_17.dragRestriction){
}else{
dojox.layout.dnd.PlottedDnd.superclass.onMouseDown.call(this,e);
}
}
},onMouseUp:function(e){
dojox.layout.dnd.PlottedDnd.superclass.onMouseUp.call(this,e);
this.containerSource=false;
if(!dojo.isIE&&this.mouseDown){
this.setDndItemSelectable(e.target,true);
}
var m=dojo.dnd.manager();
m.OFFSET_X=this.GC_OFFSET_X;
m.OFFSET_Y=this.GC_OFFSET_Y;
},onMouseMove:function(e){
var m=dojo.dnd.manager();
if(this.isDragging){
var _18=false;
if(this.current!=null||(this.current==null&&!this.dropObject)){
if(this.isAccepted(m.nodes[0])||this.containerSource){
_18=this.setIndicatorPosition(e);
}
}
if(this.current!=this.targetAnchor||_18!=this.before){
this._markTargetAnchor(_18);
m.canDrop(!this.current||m.source!=this||!(this.current.id in this.selection));
}
if(this.allowAutoScroll){
this._checkAutoScroll(e);
}
}else{
if(this.mouseDown&&this.isSource){
var _19=this.getSelectedNodes();
if(_19.length){
m.startDrag(this,_19,this.copyState(dojo.isCopyKey(e)));
}
}
if(this.allowAutoScroll){
this._stopAutoScroll();
}
}
},_markTargetAnchor:function(_1a){
if(this.current==this.targetAnchor&&this.before==_1a){
return;
}
this.targetAnchor=this.current;
this.targetBox=null;
this.before=_1a;
},_unmarkTargetAnchor:function(){
if(!this.targetAnchor){
return;
}
this.targetAnchor=null;
this.targetBox=null;
this.before=true;
},setIndicatorPosition:function(e){
var _1b=false;
if(this.current){
if(!this.current.coords||this.allowAutoScroll){
this.current.coords={xy:dojo.coords(this.current,true),w:this.current.offsetWidth/2,h:this.current.offsetHeight/2};
}
_1b=this.horizontal?(e.pageX-this.current.coords.xy.x)<this.current.coords.w:(e.pageY-this.current.coords.xy.y)<this.current.coords.h;
this.insertDashedZone(_1b);
}else{
if(!this.dropObject){
this.insertDashedZone(false);
}
}
return _1b;
},onOverEvent:function(){
this._over=true;
dojox.layout.dnd.PlottedDnd.superclass.onOverEvent.call(this);
if(this.isDragging){
var m=dojo.dnd.manager();
if(!this.current&&!this.dropObject&&this.getSelectedNodes()[0]&&this.isAccepted(m.nodes[0])){
this.insertDashedZone(false);
}
}
},onOutEvent:function(){
this._over=false;
this.containerSource=false;
dojox.layout.dnd.PlottedDnd.superclass.onOutEvent.call(this);
if(this.dropObject){
this.deleteDashedZone();
}
},deleteDashedZone:function(){
this._drop.style.display="none";
var _1c=this._drop.nextSibling;
while(_1c!=null){
_1c.coords.xy.y-=parseInt(this._drop.style.height);
_1c=_1c.nextSibling;
}
delete this.dropObject;
},insertDashedZone:function(_1d){
if(this.dropObject){
if(_1d==this.dropObject.b&&((this.current&&this.dropObject.c==this.current.id)||(!this.current&&!this.dropObject.c))){
return;
}else{
this.deleteDashedZone();
}
}
this.dropObject={n:this._drop,c:this.current?this.current.id:null,b:_1d};
if(this.current){
dojo.place(this._drop,this.current,_1d?"before":"after");
if(!this.firstIndicator){
var _1e=this._drop.nextSibling;
while(_1e!=null){
_1e.coords.xy.y+=parseInt(this._drop.style.height);
_1e=_1e.nextSibling;
}
}else{
this.firstIndicator=false;
}
}else{
this.node.appendChild(this._drop);
}
this._drop.style.display="";
},insertNodes:function(_1f,_20,_21,_22){
if(this.dropObject){
dojo.style(this.dropObject.n,"display","none");
dojox.layout.dnd.PlottedDnd.superclass.insertNodes.call(this,true,_20,true,this.dropObject.n);
this.deleteDashedZone();
}else{
return dojox.layout.dnd.PlottedDnd.superclass.insertNodes.call(this,_1f,_20,_21,_22);
}
var _23=dijit.byId(_20[0].getAttribute("widgetId"));
if(_23){
dojox.layout.dnd._setGcDndHandle(_23,this.withHandles,this.handleClasses);
if(this.hideSource){
dojo.style(_23.domNode,"display","");
}
}
},_checkAutoScroll:function(e){
if(this._timer){
clearTimeout(this._timer);
}
this._stopAutoScroll();
var _24=this.dom,y=this._sumAncestorProperties(_24,"offsetTop");
if((e.pageY-_24.offsetTop+30)>_24.clientHeight){
this.autoScrollActive=true;
this._autoScrollDown(_24);
}else{
if((_24.scrollTop>0)&&(e.pageY-y)<30){
this.autoScrollActive=true;
this._autoScrollUp(_24);
}
}
},_autoScrollUp:function(_25){
if(this.autoScrollActive&&_25.scrollTop>0){
_25.scrollTop-=30;
this._timer=setTimeout(dojo.hitch(this,"_autoScrollUp",_25),100);
}
},_autoScrollDown:function(_26){
if(this.autoScrollActive&&(_26.scrollTop<(_26.scrollHeight-_26.clientHeight))){
_26.scrollTop+=30;
this._timer=setTimeout(dojo.hitch(this,"_autoScrollDown",_26),100);
}
},_stopAutoScroll:function(){
this.autoScrollActive=false;
},_sumAncestorProperties:function(_27,_28){
_27=dojo.byId(_27);
if(!_27){
return 0;
}
var _29=0;
while(_27){
var val=_27[_28];
if(val){
_29+=val-0;
if(_27==dojo.body()){
break;
}
}
_27=_27.parentNode;
}
return _29;
}});
dojox.layout.dnd._setGcDndHandle=function(_2a,_2b,_2c,_2d){
var cls="GcDndHandle";
if(!_2d){
dojo.query(".GcDndHandle",_2a.domNode).removeClass(cls);
}
if(!_2b){
dojo.addClass(_2a.domNode,cls);
}else{
var _2e=false;
for(var i=_2c.length-1;i>=0;i--){
var _2f=dojo.query("."+_2c[i],_2a.domNode)[0];
if(_2f){
_2e=true;
if(_2c[i]!=cls){
var _30=dojo.query("."+cls,_2a.domNode);
if(_30.length==0){
dojo.removeClass(_2a.domNode,cls);
}else{
_30.removeClass(cls);
}
dojo.addClass(_2f,cls);
}
}
}
if(!_2e){
dojo.addClass(_2a.domNode,cls);
}
}
};
dojo.declare("dojox.layout.dnd.DropIndicator",null,{constructor:function(cn,tag){
this.tag=tag||"div";
this.style=cn||null;
},isInserted:function(){
return (this.node.parentNode&&this.node.parentNode.nodeType==1);
},create:function(){
if(this.node&&this.isInserted()){
return this.node;
}
var h="90px",el=dojo.doc.createElement(this.tag);
if(this.style){
el.className=this.style;
el.style.height=h;
}else{
dojo.style(el,{position:"relative",border:"1px dashed #F60",margin:"2px",height:h});
}
this.node=el;
return el;
},destroy:function(){
if(!this.node||!this.isInserted()){
return;
}
this.node.parentNode.removeChild(this.node);
this.node=null;
}});
dojo.extend(dojo.dnd.Manager,{canDrop:function(_31){
var _32=this.target&&_31;
if(this.canDropFlag!=_32){
this.canDropFlag=_32;
if(this.avatar){
this.avatar.update();
}
}
},makeAvatar:function(){
return (this.source.declaredClass=="dojox.layout.dnd.PlottedDnd")?new dojox.layout.dnd.Avatar(this,this.source.opacity):new dojo.dnd.Avatar(this);
}});
if(dojo.isIE){
dojox.layout.dnd.handdleIE=[dojo.subscribe("/dnd/start",null,function(){
IEonselectstart=document.body.onselectstart;
document.body.onselectstart=function(){
return false;
};
}),dojo.subscribe("/dnd/cancel",null,function(){
document.body.onselectstart=IEonselectstart;
}),dojo.subscribe("/dnd/drop",null,function(){
document.body.onselectstart=IEonselectstart;
})];
dojo.addOnWindowUnload(function(){
dojo.forEach(dojox.layout.dnd.handdleIE,dojo.unsubscribe);
});
}
}
