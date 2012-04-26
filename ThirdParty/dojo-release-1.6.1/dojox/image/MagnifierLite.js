/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.image.MagnifierLite"]){
dojo._hasResource["dojox.image.MagnifierLite"]=true;
dojo.provide("dojox.image.MagnifierLite");
dojo.experimental("dojox.image.MagnifierLite");
dojo.require("dijit._Widget");
dojo.declare("dojox.image.MagnifierLite",dijit._Widget,{glassSize:125,scale:6,postCreate:function(){
this.inherited(arguments);
this._adjustScale();
this._createGlass();
this.connect(this.domNode,"onmouseenter","_showGlass");
this.connect(this.glassNode,"onmousemove","_placeGlass");
this.connect(this.img,"onmouseout","_hideGlass");
this.connect(window,"onresize","_adjustScale");
},_createGlass:function(){
var _1=this.glassNode=dojo.create("div",{style:{height:this.glassSize+"px",width:this.glassSize+"px"},className:"glassNode"},dojo.body());
this.surfaceNode=_1.appendChild(dojo.create("div"));
this.img=dojo.place(dojo.clone(this.domNode),_1);
dojo.style(this.img,{position:"relative",top:0,left:0,width:this._zoomSize.w+"px",height:this._zoomSize.h+"px"});
},_adjustScale:function(){
this.offset=dojo.coords(this.domNode,true);
this._imageSize={w:this.offset.w,h:this.offset.h};
this._zoomSize={w:this._imageSize.w*this.scale,h:this._imageSize.h*this.scale};
},_showGlass:function(e){
this._placeGlass(e);
dojo.style(this.glassNode,{visibility:"visible",display:""});
},_hideGlass:function(e){
dojo.style(this.glassNode,{visibility:"hidden",display:"none"});
},_placeGlass:function(e){
this._setImage(e);
var _2=Math.floor(this.glassSize/2);
dojo.style(this.glassNode,{top:Math.floor(e.pageY-_2)+"px",left:Math.floor(e.pageX-_2)+"px"});
},_setImage:function(e){
var _3=(e.pageX-this.offset.l)/this.offset.w,_4=(e.pageY-this.offset.t)/this.offset.h,x=(this._zoomSize.w*_3*-1)+(this.glassSize*_3),y=(this._zoomSize.h*_4*-1)+(this.glassSize*_4);
dojo.style(this.img,{top:y+"px",left:x+"px"});
},destroy:function(_5){
dojo.destroy(this.glassNode);
this.inherited(arguments);
}});
}
