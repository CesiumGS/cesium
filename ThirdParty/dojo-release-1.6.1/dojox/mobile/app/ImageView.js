/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.ImageView"]){
dojo._hasResource["dojox.mobile.app.ImageView"]=true;
dojo.provide("dojox.mobile.app.ImageView");
dojo.experimental("dojox.mobile.app.ImageView");
dojo.require("dojox.mobile.app._Widget");
dojo.require("dojo.fx.easing");
dojo.declare("dojox.mobile.app.ImageView",dojox.mobile.app._Widget,{zoom:1,zoomCenterX:0,zoomCenterY:0,maxZoom:5,autoZoomLevel:3,disableAutoZoom:false,disableSwipe:false,autoZoomEvent:null,_leftImg:null,_centerImg:null,_rightImg:null,_leftSmallImg:null,_centerSmallImg:null,_rightSmallImg:null,constructor:function(){
this.panX=0;
this.panY=0;
this.handleLoad=dojo.hitch(this,this.handleLoad);
this._updateAnimatedZoom=dojo.hitch(this,this._updateAnimatedZoom);
this._updateAnimatedPan=dojo.hitch(this,this._updateAnimatedPan);
this._onAnimPanEnd=dojo.hitch(this,this._onAnimPanEnd);
},buildRendering:function(){
this.inherited(arguments);
this.canvas=dojo.create("canvas",{},this.domNode);
dojo.addClass(this.domNode,"mblImageView");
},postCreate:function(){
this.inherited(arguments);
this.size=dojo.marginBox(this.domNode);
dojo.style(this.canvas,{width:this.size.w+"px",height:this.size.h+"px"});
this.canvas.height=this.size.h;
this.canvas.width=this.size.w;
var _1=this;
this.connect(this.domNode,"onmousedown",function(_2){
if(_1.isAnimating()){
return;
}
if(_1.panX){
_1.handleDragEnd();
}
_1.downX=_2.targetTouches?_2.targetTouches[0].clientX:_2.clientX;
_1.downY=_2.targetTouches?_2.targetTouches[0].clientY:_2.clientY;
});
this.connect(this.domNode,"onmousemove",function(_3){
if(_1.isAnimating()){
return;
}
if((!_1.downX&&_1.downX!==0)||(!_1.downY&&_1.downY!==0)){
return;
}
if((!_1.disableSwipe&&_1.zoom==1)||(!_1.disableAutoZoom&&_1.zoom!=1)){
var x=_3.targetTouches?_3.targetTouches[0].clientX:_3.pageX;
var y=_3.targetTouches?_3.targetTouches[0].clientY:_3.pageY;
_1.panX=x-_1.downX;
_1.panY=y-_1.downY;
if(_1.zoom==1){
if(Math.abs(_1.panX)>10){
_1.render();
}
}else{
if(Math.abs(_1.panX)>10||Math.abs(_1.panY)>10){
_1.render();
}
}
}
});
this.connect(this.domNode,"onmouseout",function(_4){
if(!_1.isAnimating()&&_1.panX){
_1.handleDragEnd();
}
});
this.connect(this.domNode,"onmouseover",function(_5){
_1.downX=_1.downY=null;
});
this.connect(this.domNode,"onclick",function(_6){
if(_1.isAnimating()){
return;
}
if(_1.downX==null||_1.downY==null){
return;
}
var x=(_6.targetTouches?_6.targetTouches[0].clientX:_6.pageX);
var y=(_6.targetTouches?_6.targetTouches[0].clientY:_6.pageY);
if(Math.abs(_1.panX)>14||Math.abs(_1.panY)>14){
_1.downX=_1.downY=null;
_1.handleDragEnd();
return;
}
_1.downX=_1.downY=null;
if(!_1.disableAutoZoom){
if(!_1._centerImg||!_1._centerImg._loaded){
return;
}
if(_1.zoom!=1){
_1.set("animatedZoom",1);
return;
}
var _7=dojo._abs(_1.domNode);
var _8=_1.size.w/_1._centerImg.width;
var _9=_1.size.h/_1._centerImg.height;
_1.zoomTo(((x-_7.x)/_8)-_1.panX,((y-_7.y)/_9)-_1.panY,_1.autoZoomLevel);
}
});
dojo.connect(this.domNode,"flick",this,"handleFlick");
},isAnimating:function(){
return this._anim&&this._anim.status()=="playing";
},handleDragEnd:function(){
this.downX=this.downY=null;
if(this.zoom==1){
if(!this.panX){
return;
}
var _a=(this._leftImg&&this._leftImg._loaded)||(this._leftSmallImg&&this._leftSmallImg._loaded);
var _b=(this._rightImg&&this._rightImg._loaded)||(this._rightSmallImg&&this._rightSmallImg._loaded);
var _c=!(Math.abs(this.panX)<this._centerImg._baseWidth/2)&&((this.panX>0&&_a?1:0)||(this.panX<0&&_b?1:0));
if(!_c){
this._animPanTo(0,dojo.fx.easing.expoOut,700);
}else{
this.moveTo(this.panX);
}
}else{
if(!this.panX&&!this.panY){
return;
}
this.zoomCenterX-=(this.panX/this.zoom);
this.zoomCenterY-=(this.panY/this.zoom);
this.panX=this.panY=0;
}
},handleFlick:function(_d){
if(this.zoom==1&&_d.duration<500){
if(_d.direction=="ltr"){
this.moveTo(1);
}else{
if(_d.direction=="rtl"){
this.moveTo(-1);
}
}
this.downX=this.downY=null;
}
},moveTo:function(_e){
_e=_e>0?1:-1;
var _f;
if(_e<1){
if(this._rightImg&&this._rightImg._loaded){
_f=this._rightImg;
}else{
if(this._rightSmallImg&&this._rightSmallImg._loaded){
_f=this._rightSmallImg;
}
}
}else{
if(this._leftImg&&this._leftImg._loaded){
_f=this._leftImg;
}else{
if(this._leftSmallImg&&this._leftSmallImg._loaded){
_f=this._leftSmallImg;
}
}
}
this._moveDir=_e;
var _10=this;
if(_f&&_f._loaded){
this._animPanTo(this.size.w*_e,null,500,function(){
_10.panX=0;
_10.panY=0;
if(_e<0){
_10._switchImage("left","right");
}else{
_10._switchImage("right","left");
}
_10.render();
_10.onChange(_e*-1);
});
}else{
this._animPanTo(0,dojo.fx.easing.expoOut,700);
}
},_switchImage:function(_11,_12){
var _13="_"+_11+"SmallImg";
var _14="_"+_11+"Img";
var _15="_"+_12+"SmallImg";
var _16="_"+_12+"Img";
this[_14]=this._centerImg;
this[_13]=this._centerSmallImg;
this[_14]._type=_11;
if(this[_13]){
this[_13]._type=_11;
}
this._centerImg=this[_16];
this._centerSmallImg=this[_15];
this._centerImg._type="center";
if(this._centerSmallImg){
this._centerSmallImg._type="center";
}
this[_16]=this[_15]=null;
},_animPanTo:function(to,_17,_18,_19){
this._animCallback=_19;
this._anim=new dojo.Animation({curve:[this.panX,to],onAnimate:this._updateAnimatedPan,duration:_18||500,easing:_17,onEnd:this._onAnimPanEnd});
this._anim.play();
return this._anim;
},onChange:function(_1a){
},_updateAnimatedPan:function(_1b){
this.panX=_1b;
this.render();
},_onAnimPanEnd:function(){
this.panX=this.panY=0;
if(this._animCallback){
this._animCallback();
}
},zoomTo:function(_1c,_1d,_1e){
this.set("zoomCenterX",_1c);
this.set("zoomCenterY",_1d);
this.set("animatedZoom",_1e);
},render:function(){
var cxt=this.canvas.getContext("2d");
cxt.clearRect(0,0,this.canvas.width,this.canvas.height);
this._renderImg(this._centerSmallImg,this._centerImg,this.zoom==1?(this.panX<0?1:this.panX>0?-1:0):0);
if(this.zoom==1&&this.panX!=0){
if(this.panX>0){
this._renderImg(this._leftSmallImg,this._leftImg,1);
}else{
this._renderImg(this._rightSmallImg,this._rightImg,-1);
}
}
},_renderImg:function(_1f,_20,_21){
var img=(_20&&_20._loaded)?_20:_1f;
if(!img||!img._loaded){
return;
}
var cxt=this.canvas.getContext("2d");
var _22=img._baseWidth;
var _23=img._baseHeight;
var _24=_22*this.zoom;
var _25=_23*this.zoom;
var _26=Math.min(this.size.w,_24);
var _27=Math.min(this.size.h,_25);
var _28=this.dispWidth=img.width*(_26/_24);
var _29=this.dispHeight=img.height*(_27/_25);
var _2a=this.zoomCenterX-(this.panX/this.zoom);
var _2b=this.zoomCenterY-(this.panY/this.zoom);
var _2c=Math.floor(Math.max(_28/2,Math.min(img.width-_28/2,_2a)));
var _2d=Math.floor(Math.max(_29/2,Math.min(img.height-_29/2,_2b)));
var _2e=Math.max(0,Math.round((img.width-_28)/2+(_2c-img._centerX)));
var _2f=Math.max(0,Math.round((img.height-_29)/2+(_2d-img._centerY)));
var _30=Math.round(Math.max(0,this.canvas.width-_26)/2);
var _31=Math.round(Math.max(0,this.canvas.height-_27)/2);
var _32=_26;
var _33=_28;
if(this.zoom==1&&_21&&this.panX){
if(this.panX<0){
if(_21>0){
_26-=Math.abs(this.panX);
_30=0;
}else{
if(_21<0){
_26=Math.max(1,Math.abs(this.panX)-5);
_30=this.size.w-_26;
}
}
}else{
if(_21>0){
_26=Math.max(1,Math.abs(this.panX)-5);
_30=0;
}else{
if(_21<0){
_26-=Math.abs(this.panX);
_30=this.size.w-_26;
}
}
}
_28=Math.max(1,Math.floor(_28*(_26/_32)));
if(_21>0){
_2e=(_2e+_33)-(_28);
}
_2e=Math.floor(_2e);
}
try{
cxt.drawImage(img,Math.max(0,_2e),_2f,Math.min(_33,_28),_29,_30,_31,Math.min(_32,_26),_27);
}
catch(e){
}
},_setZoomAttr:function(_34){
this.zoom=Math.min(this.maxZoom,Math.max(1,_34));
if(this.zoom==1&&this._centerImg&&this._centerImg._loaded){
if(!this.isAnimating()){
this.zoomCenterX=this._centerImg.width/2;
this.zoomCenterY=this._centerImg.height/2;
}
this.panX=this.panY=0;
}
this.render();
},_setZoomCenterXAttr:function(_35){
if(_35!=this.zoomCenterX){
if(this._centerImg&&this._centerImg._loaded){
_35=Math.min(this._centerImg.width,_35);
}
this.zoomCenterX=Math.max(0,Math.round(_35));
}
},_setZoomCenterYAttr:function(_36){
if(_36!=this.zoomCenterY){
if(this._centerImg&&this._centerImg._loaded){
_36=Math.min(this._centerImg.height,_36);
}
this.zoomCenterY=Math.max(0,Math.round(_36));
}
},_setZoomCenterAttr:function(_37){
if(_37.x!=this.zoomCenterX||_37.y!=this.zoomCenterY){
this.set("zoomCenterX",_37.x);
this.set("zoomCenterY",_37.y);
this.render();
}
},_setAnimatedZoomAttr:function(_38){
if(this._anim&&this._anim.status()=="playing"){
return;
}
this._anim=new dojo.Animation({curve:[this.zoom,_38],onAnimate:this._updateAnimatedZoom,onEnd:this._onAnimEnd});
this._anim.play();
},_updateAnimatedZoom:function(_39){
this._setZoomAttr(_39);
},_setCenterUrlAttr:function(_3a){
this._setImage("center",_3a);
},_setLeftUrlAttr:function(_3b){
this._setImage("left",_3b);
},_setRightUrlAttr:function(_3c){
this._setImage("right",_3c);
},_setImage:function(_3d,_3e){
var _3f=null;
var _40=null;
if(dojo.isString(_3e)){
_40=_3e;
}else{
_40=_3e.large;
_3f=_3e.small;
}
if(this["_"+_3d+"Img"]&&this["_"+_3d+"Img"]._src==_40){
return;
}
var _41=this["_"+_3d+"Img"]=new Image();
_41._type=_3d;
_41._loaded=false;
_41._src=_40;
_41._conn=dojo.connect(_41,"onload",this.handleLoad);
if(_3f){
var _42=this["_"+_3d+"SmallImg"]=new Image();
_42._type=_3d;
_42._loaded=false;
_42._conn=dojo.connect(_42,"onload",this.handleLoad);
_42._isSmall=true;
_42._src=_3f;
_42.src=_3f;
}
_41.src=_40;
},handleLoad:function(evt){
var img=evt.target;
img._loaded=true;
dojo.disconnect(img._conn);
var _43=img._type;
switch(_43){
case "center":
this.zoomCenterX=img.width/2;
this.zoomCenterY=img.height/2;
break;
}
var _44=img.height;
var _45=img.width;
if(_45/this.size.w<_44/this.size.h){
img._baseHeight=this.canvas.height;
img._baseWidth=_45/(_44/this.size.h);
}else{
img._baseWidth=this.canvas.width;
img._baseHeight=_44/(_45/this.size.w);
}
img._centerX=_45/2;
img._centerY=_44/2;
this.render();
this.onLoad(img._type,img._src,img._isSmall);
},onLoad:function(_46,url,_47){
}});
}
