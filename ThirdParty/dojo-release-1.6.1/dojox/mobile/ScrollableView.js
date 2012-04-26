/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.ScrollableView"]){
dojo._hasResource["dojox.mobile.ScrollableView"]=true;
dojo.provide("dojox.mobile.ScrollableView");
dojo.require("dijit._WidgetBase");
dojo.require("dojox.mobile");
dojo.require("dojox.mobile._ScrollableMixin");
dojo.declare("dojox.mobile.ScrollableView",[dojox.mobile.View,dojox.mobile._ScrollableMixin],{flippable:false,buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"mblScrollableView");
this.domNode.style.overflow="hidden";
this.domNode.style.top="0px";
this.domNode.style.height="100%";
this.containerNode=dojo.create("DIV",{className:"mblScrollableViewContainer"},this.domNode);
this.containerNode.style.position="absolute";
if(this.scrollDir==="v"||this.flippable){
this.containerNode.style.width="100%";
}
this.reparent();
this.findAppBars();
},addChild:function(_1){
var c=_1.domNode;
var _2=this._checkFixedBar(c,true);
if(_2){
this.domNode.appendChild(c);
if(_2==="top"){
this.fixedHeaderHeight=c.offsetHeight;
this.containerNode.style.paddingTop=this.fixedHeaderHeight+"px";
}else{
if(_2==="bottom"){
this.fixedFooterHeight=c.offsetHeight;
this.isLocalFooter=true;
c.style.bottom="0px";
}
}
this.resizeView();
}else{
this.containerNode.appendChild(c);
}
},reparent:function(){
var i,_3,_4,c;
for(i=0,_3=0,_4=this.domNode.childNodes.length;i<_4;i++){
c=this.domNode.childNodes[_3];
if(c===this.containerNode||this._checkFixedBar(c,true)){
_3++;
continue;
}
this.containerNode.appendChild(this.domNode.removeChild(c));
}
},findAppBars:function(){
var i,_5,c;
for(i=0,_5=dojo.body().childNodes.length;i<_5;i++){
c=dojo.body().childNodes[i];
this._checkFixedBar(c,false);
}
if(this.domNode.parentNode){
for(i=0,_5=this.domNode.parentNode.childNodes.length;i<_5;i++){
c=this.domNode.parentNode.childNodes[i];
this._checkFixedBar(c,false);
}
}
this.fixedHeaderHeight=this.fixedHeader?this.fixedHeader.offsetHeight:0;
this.fixedFooterHeight=this.fixedFooter?this.fixedFooter.offsetHeight:0;
},_checkFixedBar:function(_6){
if(_6.nodeType===1){
var _7=_6.getAttribute("fixed")||(dijit.byNode(_6)&&dijit.byNode(_6).fixed);
if(_7){
dojo.style(_6,{position:"absolute",width:"100%",zIndex:1});
}
if(_7==="top"){
_6.style.top="0px";
this.fixedHeader=_6;
return _7;
}else{
if(_7==="bottom"){
this.fixedFooter=_6;
return _7;
}
}
}
return null;
},onAfterTransitionIn:function(_8,_9,_a,_b,_c){
this.flashScrollBar();
}});
}
