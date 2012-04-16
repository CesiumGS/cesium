/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.manager.Canvas"]){
dojo._hasResource["dojox.drawing.manager.Canvas"]=true;
dojo.provide("dojox.drawing.manager.Canvas");
(function(){
dojox.drawing.manager.Canvas=dojox.drawing.util.oo.declare(function(_1){
dojo.mixin(this,_1);
var _2=dojo.contentBox(this.srcRefNode);
this.height=this.parentHeight=_2.h;
this.width=this.parentWidth=_2.w;
this.domNode=dojo.create("div",{id:"canvasNode"},this.srcRefNode);
dojo.style(this.domNode,{width:this.width,height:"auto"});
dojo.setSelectable(this.domNode,false);
this.id=this.id||this.util.uid("surface");
this.gfxSurface=dojox.gfx.createSurface(this.domNode,this.width,this.height);
this.gfxSurface.whenLoaded(this,function(){
setTimeout(dojo.hitch(this,function(){
this.surfaceReady=true;
if(dojo.isIE){
}else{
if(dojox.gfx.renderer=="silverlight"){
this.id=this.domNode.firstChild.id;
}else{
}
}
this.underlay=this.gfxSurface.createGroup();
this.surface=this.gfxSurface.createGroup();
this.overlay=this.gfxSurface.createGroup();
this.surface.setTransform({dx:0,dy:0,xx:1,yy:1});
this.gfxSurface.getDimensions=dojo.hitch(this.gfxSurface,"getDimensions");
if(_1.callback){
_1.callback(this.domNode);
}
}),500);
});
this._mouseHandle=this.mouse.register(this);
},{zoom:1,useScrollbars:true,baseClass:"drawingCanvas",resize:function(_3,_4){
this.parentWidth=_3;
this.parentHeight=_4;
this.setDimensions(_3,_4);
},setDimensions:function(_5,_6,_7,_8){
var sw=this.getScrollWidth();
this.width=Math.max(_5,this.parentWidth);
this.height=Math.max(_6,this.parentHeight);
if(this.height>this.parentHeight){
this.width-=sw;
}
if(this.width>this.parentWidth){
this.height-=sw;
}
this.mouse.resize(this.width,this.height);
this.gfxSurface.setDimensions(this.width,this.height);
this.domNode.parentNode.scrollTop=_8||0;
this.domNode.parentNode.scrollLeft=_7||0;
if(this.useScrollbars){
dojo.style(this.domNode.parentNode,{overflowY:this.height>this.parentHeight?"scroll":"hidden",overflowX:this.width>this.parentWidth?"scroll":"hidden"});
}else{
dojo.style(this.domNode.parentNode,{overflowY:"hidden",overflowX:"hidden"});
}
},setZoom:function(_9){
this.zoom=_9;
this.surface.setTransform({xx:_9,yy:_9});
this.setDimensions(this.width*_9,this.height*_9);
},onScroll:function(){
},getScrollOffset:function(){
return {top:this.domNode.parentNode.scrollTop,left:this.domNode.parentNode.scrollLeft};
},getScrollWidth:function(){
var p=dojo.create("div");
p.innerHTML="<div style=\"width:50px;height:50px;overflow:hidden;position:absolute;top:0;left:-1000px;\"><div style=\"height:100px;\"></div>";
var _a=p.firstChild;
dojo.body().appendChild(_a);
var _b=dojo.contentBox(_a).h;
dojo.style(_a,"overflow","scroll");
var _c=_b-dojo.contentBox(_a).h;
dojo.destroy(_a);
this.getScrollWidth=function(){
return _c;
};
return _c;
}});
})();
}
