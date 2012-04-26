/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.FlippableView"]){
dojo._hasResource["dojox.mobile.FlippableView"]=true;
dojo.provide("dojox.mobile.FlippableView");
dojo.require("dijit._WidgetBase");
dojo.require("dojox.mobile");
dojo.require("dojox.mobile._ScrollableMixin");
dojo.declare("dojox.mobile.FlippableView",[dojox.mobile.View,dojox.mobile._ScrollableMixin],{scrollDir:"f",weight:1.2,buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"mblFlippableView");
this.containerNode=this.domNode;
this.containerNode.style.position="absolute";
},onTouchStart:function(e){
var _1=this._nextView(this.domNode);
if(_1){
_1.stopAnimation();
}
var _2=this._previousView(this.domNode);
if(_2){
_2.stopAnimation();
}
this.inherited(arguments);
},_nextView:function(_3){
for(var n=_3.nextSibling;n;n=n.nextSibling){
if(n.nodeType==1){
return dijit.byNode(n);
}
}
return null;
},_previousView:function(_4){
for(var n=_4.previousSibling;n;n=n.previousSibling){
if(n.nodeType==1){
return dijit.byNode(n);
}
}
return null;
},scrollTo:function(to){
if(!this._beingFlipped){
var _5,x;
if(to.x<0){
_5=this._nextView(this.domNode);
x=to.x+this.domNode.offsetWidth;
}else{
_5=this._previousView(this.domNode);
x=to.x-this.domNode.offsetWidth;
}
if(_5){
_5.domNode.style.display="";
_5._beingFlipped=true;
_5.scrollTo({x:x});
_5._beingFlipped=false;
}
}
this.inherited(arguments);
},slideTo:function(to,_6,_7){
if(!this._beingFlipped){
var w=this.domNode.offsetWidth;
var _8=this.getPos();
var _9,_a;
if(_8.x<0){
_9=this._nextView(this.domNode);
if(_8.x<-w/4){
if(_9){
to.x=-w;
_a=0;
}
}else{
if(_9){
_a=w;
}
}
}else{
_9=this._previousView(this.domNode);
if(_8.x>w/4){
if(_9){
to.x=w;
_a=0;
}
}else{
if(_9){
_a=-w;
}
}
}
if(_9){
_9._beingFlipped=true;
_9.slideTo({x:_a},_6,_7);
_9._beingFlipped=false;
if(_a===0){
dojox.mobile.currentView=_9;
}
}
}
this.inherited(arguments);
},onFlickAnimationEnd:function(e){
var _b=this.domNode.parentNode.childNodes;
for(var i=0;i<_b.length;i++){
var c=_b[i];
if(c.nodeType==1&&c!=dojox.mobile.currentView.domNode){
c.style.display="none";
}
}
this.inherited(arguments);
}});
}
