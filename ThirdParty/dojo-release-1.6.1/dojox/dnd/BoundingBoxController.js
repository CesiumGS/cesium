/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dnd.BoundingBoxController"]){
dojo._hasResource["dojox.dnd.BoundingBoxController"]=true;
dojo.provide("dojox.dnd.BoundingBoxController");
dojo.declare("dojox.dnd.BoundingBoxController",null,{_startX:null,_startY:null,_endX:null,_endY:null,constructor:function(_1,_2){
this.events=[dojo.connect(dojo.doc,"onmousedown",this,"_onMouseDown"),dojo.connect(dojo.doc,"onmouseup",this,"_onMouseUp"),dojo.connect(dojo.doc,"onscroll",this,"_finishSelecting")];
this.subscriptions=[dojo.subscribe("/dojox/bounding/cancel",this,"_finishSelecting")];
dojo.forEach(_1,function(_3){
if(_3.selectByBBox){
this.subscriptions.push(dojo.subscribe("/dojox/dnd/bounding",_3,"selectByBBox"));
}
},this);
this.domNode=dojo.byId(_2);
dojo.style(this.domNode,{position:"absolute",display:"none"});
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
dojo.forEach(this.subscriptions,dojo.unsubscribe);
this.domNode=null;
},boundingBoxIsViable:function(){
return true;
},_onMouseDown:function(_4){
if(dojo.mouseButtons.isLeft(_4)){
if(this._startX===null){
this._startX=_4.clientX;
this._startY=_4.clientY;
}
this.events.push(dojo.connect(dojo.doc,"onmousemove",this,"_onMouseMove"));
}
},_onMouseMove:function(_5){
this._endX=_5.clientX;
this._endY=_5.clientY;
this._drawBoundingBox();
},_onMouseUp:function(_6){
if(this._endX!==null&&this.boundingBoxIsViable()){
dojo.publish("/dojox/dnd/bounding",[this._startX,this._startY,this._endX,this._endY]);
}
this._finishSelecting();
},_finishSelecting:function(){
if(this._startX!==null){
dojo.disconnect(this.events.pop());
dojo.style(this.domNode,"display","none");
this._startX=this._endX=null;
}
},_drawBoundingBox:function(){
dojo.style(this.domNode,{left:Math.min(this._startX,this._endX)+"px",top:Math.min(this._startY,this._endY)+"px",width:Math.abs(this._startX-this._endX)+"px",height:Math.abs(this._startY-this._endY)+"px",display:""});
}});
}
