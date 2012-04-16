/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Standby"]){
dojo._hasResource["dojox.widget.Standby"]=true;
dojo.provide("dojox.widget.Standby");
dojo.require("dojo.window");
dojo.require("dojo.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.experimental("dojox.widget.Standby");
dojo.declare("dojox.widget.Standby",[dijit._Widget,dijit._Templated],{templateString:"<div>"+"<div style=\"display: none; opacity: 0; z-index: 9999; "+"position: absolute; cursor:wait;\" dojoAttachPoint=\"_underlayNode\"></div>"+"<img src=\"${image}\" style=\"opacity: 0; display: none; z-index: -10000; "+"position: absolute; top: 0px; left: 0px; cursor:wait;\" "+"dojoAttachPoint=\"_imageNode\">"+"<div style=\"opacity: 0; display: none; z-index: -10000; position: absolute; "+"top: 0px;\" dojoAttachPoint=\"_textNode\"></div>"+"</div>",_underlayNode:null,_imageNode:null,_textNode:null,_centerNode:null,image:dojo.moduleUrl("dojox","widget/Standby/images/loading.gif").toString(),imageText:"Please Wait...",text:"Please wait...",centerIndicator:"image",_displayed:false,_resizeCheck:null,target:"",color:"#C0C0C0",duration:500,_started:false,_parent:null,zIndex:"auto",startup:function(_1){
if(!this._started){
if(typeof this.target==="string"){
var w=dijit.byId(this.target);
if(w){
this.target=w.domNode;
}else{
this.target=dojo.byId(this.target);
}
}
if(this.text){
this._textNode.innerHTML=this.text;
}
if(this.centerIndicator==="image"){
this._centerNode=this._imageNode;
dojo.attr(this._imageNode,"src",this.image);
dojo.attr(this._imageNode,"alt",this.imageText);
}else{
this._centerNode=this._textNode;
}
dojo.style(this._underlayNode,{display:"none",backgroundColor:this.color});
dojo.style(this._centerNode,"display","none");
this.connect(this._underlayNode,"onclick","_ignore");
if(this.domNode.parentNode&&this.domNode.parentNode!=dojo.body()){
dojo.body().appendChild(this.domNode);
}
if(dojo.isIE==7){
this._ieFixNode=dojo.doc.createElement("div");
dojo.style(this._ieFixNode,{opacity:"0",zIndex:"-1000",position:"absolute",top:"-1000px"});
dojo.body().appendChild(this._ieFixNode);
}
}
},show:function(){
if(!this._displayed){
if(this._anim){
this._anim.stop();
delete this._anim;
}
this._displayed=true;
this._size();
this._disableOverflow();
this._fadeIn();
}
},hide:function(){
if(this._displayed){
if(this._anim){
this._anim.stop();
delete this._anim;
}
this._size();
this._fadeOut();
this._displayed=false;
if(this._resizeCheck!==null){
clearInterval(this._resizeCheck);
this._resizeCheck=null;
}
}
},isVisible:function(){
return this._displayed;
},onShow:function(){
},onHide:function(){
},uninitialize:function(){
this._displayed=false;
if(this._resizeCheck){
clearInterval(this._resizeCheck);
}
dojo.style(this._centerNode,"display","none");
dojo.style(this._underlayNode,"display","none");
if(dojo.isIE==7){
dojo.body().removeChild(this._ieFixNode);
delete this._ieFixNode;
}
if(this._anim){
this._anim.stop();
delete this._anim;
}
this.target=null;
this._imageNode=null;
this._textNode=null;
this._centerNode=null;
this.inherited(arguments);
},_size:function(){
if(this._displayed){
var _2=dojo.attr(dojo.body(),"dir");
if(_2){
_2=_2.toLowerCase();
}
var _3;
var _4=this._scrollerWidths();
var _5=this.target;
var _6=dojo.style(this._centerNode,"display");
dojo.style(this._centerNode,"display","block");
var _7=dojo.position(_5,true);
if(_5===dojo.body()||_5===dojo.doc){
_7=dojo.window.getBox();
_7.x=_7.l;
_7.y=_7.t;
}
var _8=dojo.marginBox(this._centerNode);
dojo.style(this._centerNode,"display",_6);
if(this._ieFixNode){
_3=-this._ieFixNode.offsetTop/1000;
_7.x=Math.floor((_7.x+0.9)/_3);
_7.y=Math.floor((_7.y+0.9)/_3);
_7.w=Math.floor((_7.w+0.9)/_3);
_7.h=Math.floor((_7.h+0.9)/_3);
}
var zi=dojo.style(_5,"zIndex");
var _9=zi;
var _a=zi;
if(this.zIndex==="auto"){
if(zi!="auto"){
_9=parseInt(_9,10)+1;
_a=parseInt(_a,10)+2;
}else{
var _b=_5.parentNode;
var _c=-100000;
while(_b&&_b!==dojo.body()){
zi=dojo.style(_b,"zIndex");
if(!zi||zi==="auto"){
_b=_b.parentNode;
}else{
var _d=parseInt(zi,10);
if(_c<_d){
_c=_d;
_9=_d+1;
_a=_d+2;
}
_b=_b.parentNode;
}
}
}
}else{
_9=parseInt(this.zIndex,10)+1;
_a=parseInt(this.zIndex,10)+2;
}
dojo.style(this._centerNode,"zIndex",_a);
dojo.style(this._underlayNode,"zIndex",_9);
var pn=_5.parentNode;
if(pn&&pn!==dojo.body()&&_5!==dojo.body()&&_5!==dojo.doc){
var _e=_7.h;
var _f=_7.w;
var _10=dojo.position(pn,true);
if(this._ieFixNode){
_3=-this._ieFixNode.offsetTop/1000;
_10.x=Math.floor((_10.x+0.9)/_3);
_10.y=Math.floor((_10.y+0.9)/_3);
_10.w=Math.floor((_10.w+0.9)/_3);
_10.h=Math.floor((_10.h+0.9)/_3);
}
_10.w-=pn.scrollHeight>pn.clientHeight&&pn.clientHeight>0?_4.v:0;
_10.h-=pn.scrollWidth>pn.clientWidth&&pn.clientWidth>0?_4.h:0;
if(_2==="rtl"){
if(dojo.isOpera){
_7.x+=pn.scrollHeight>pn.clientHeight&&pn.clientHeight>0?_4.v:0;
_10.x+=pn.scrollHeight>pn.clientHeight&&pn.clientHeight>0?_4.v:0;
}else{
if(dojo.isIE){
_10.x+=pn.scrollHeight>pn.clientHeight&&pn.clientHeight>0?_4.v:0;
}else{
if(dojo.isWebKit){
}
}
}
}
if(_10.w<_7.w){
_7.w=_7.w-_10.w;
}
if(_10.h<_7.h){
_7.h=_7.h-_10.h;
}
var _11=_10.y;
var _12=_10.y+_10.h;
var _13=_7.y;
var _14=_7.y+_e;
var _15=_10.x;
var _16=_10.x+_10.w;
var _17=_7.x;
var _18=_7.x+_f;
var _19;
if(_14>_11&&_13<_11){
_7.y=_10.y;
_19=_11-_13;
var _1a=_e-_19;
if(_1a<_10.h){
_7.h=_1a;
}else{
_7.h-=2*(pn.scrollWidth>pn.clientWidth&&pn.clientWidth>0?_4.h:0);
}
}else{
if(_13<_12&&_14>_12){
_7.h=_12-_13;
}else{
if(_14<=_11||_13>=_12){
_7.h=0;
}
}
}
if(_18>_15&&_17<_15){
_7.x=_10.x;
_19=_15-_17;
var _1b=_f-_19;
if(_1b<_10.w){
_7.w=_1b;
}else{
_7.w-=2*(pn.scrollHeight>pn.clientHeight&&pn.clientHeight>0?_4.w:0);
}
}else{
if(_17<_16&&_18>_16){
_7.w=_16-_17;
}else{
if(_18<=_15||_17>=_16){
_7.w=0;
}
}
}
}
if(_7.h>0&&_7.w>0){
dojo.style(this._underlayNode,{display:"block",width:_7.w+"px",height:_7.h+"px",top:_7.y+"px",left:_7.x+"px"});
var _1c=["borderRadius","borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius"];
this._cloneStyles(_1c);
if(!dojo.isIE){
_1c=["MozBorderRadius","MozBorderRadiusTopleft","MozBorderRadiusTopright","MozBorderRadiusBottomleft","MozBorderRadiusBottomright","WebkitBorderRadius","WebkitBorderTopLeftRadius","WebkitBorderTopRightRadius","WebkitBorderBottomLeftRadius","WebkitBorderBottomRightRadius"];
this._cloneStyles(_1c,this);
}
var _1d=(_7.h/2)-(_8.h/2);
var _1e=(_7.w/2)-(_8.w/2);
if(_7.h>=_8.h&&_7.w>=_8.w){
dojo.style(this._centerNode,{top:(_1d+_7.y)+"px",left:(_1e+_7.x)+"px",display:"block"});
}else{
dojo.style(this._centerNode,"display","none");
}
}else{
dojo.style(this._underlayNode,"display","none");
dojo.style(this._centerNode,"display","none");
}
if(this._resizeCheck===null){
var _1f=this;
this._resizeCheck=setInterval(function(){
_1f._size();
},100);
}
}
},_cloneStyles:function(_20){
dojo.forEach(_20,function(_21){
dojo.style(this._underlayNode,_21,dojo.style(this.target,_21));
},this);
},_fadeIn:function(){
var _22=this;
var _23=dojo.animateProperty({duration:_22.duration,node:_22._underlayNode,properties:{opacity:{start:0,end:0.75}}});
var _24=dojo.animateProperty({duration:_22.duration,node:_22._centerNode,properties:{opacity:{start:0,end:1}},onEnd:function(){
_22.onShow();
delete _22._anim;
}});
this._anim=dojo.fx.combine([_23,_24]);
this._anim.play();
},_fadeOut:function(){
var _25=this;
var _26=dojo.animateProperty({duration:_25.duration,node:_25._underlayNode,properties:{opacity:{start:0.75,end:0}},onEnd:function(){
dojo.style(this.node,{"display":"none","zIndex":"-1000"});
}});
var _27=dojo.animateProperty({duration:_25.duration,node:_25._centerNode,properties:{opacity:{start:1,end:0}},onEnd:function(){
dojo.style(this.node,{"display":"none","zIndex":"-1000"});
_25.onHide();
_25._enableOverflow();
delete _25._anim;
}});
this._anim=dojo.fx.combine([_26,_27]);
this._anim.play();
},_ignore:function(_28){
if(_28){
dojo.stopEvent(_28);
}
},_scrollerWidths:function(){
var div=dojo.doc.createElement("div");
dojo.style(div,{position:"absolute",opacity:0,overflow:"hidden",width:"50px",height:"50px",zIndex:"-100",top:"-200px",left:"-200px",padding:"0px",margin:"0px"});
var _29=dojo.doc.createElement("div");
dojo.style(_29,{width:"200px",height:"10px"});
div.appendChild(_29);
dojo.body().appendChild(div);
var b=dojo.contentBox(div);
dojo.style(div,"overflow","scroll");
var a=dojo.contentBox(div);
dojo.body().removeChild(div);
return {v:b.w-a.w,h:b.h-a.h};
},_setTextAttr:function(_2a){
this._textNode.innerHTML=_2a;
this.text=_2a;
},_setColorAttr:function(c){
dojo.style(this._underlayNode,"backgroundColor",c);
this.color=c;
},_setImageTextAttr:function(_2b){
dojo.attr(this._imageNode,"alt",_2b);
this.imageText=_2b;
},_setImageAttr:function(url){
dojo.attr(this._imageNode,"src",url);
this.image=url;
},_setCenterIndicatorAttr:function(_2c){
this.centerIndicator=_2c;
if(_2c==="image"){
this._centerNode=this._imageNode;
dojo.style(this._textNode,"display","none");
}else{
this._centerNode=this._textNode;
dojo.style(this._imageNode,"display","none");
}
},_disableOverflow:function(){
if(this.target===dojo.body()||this.target===dojo.doc){
this._overflowDisabled=true;
var _2d=dojo.body();
if(_2d.style&&_2d.style.overflow){
this._oldOverflow=dojo.style(_2d,"overflow");
}else{
this._oldOverflow="";
}
if(dojo.isIE&&!dojo.isQuirks){
if(_2d.parentNode&&_2d.parentNode.style&&_2d.parentNode.style.overflow){
this._oldBodyParentOverflow=_2d.parentNode.style.overflow;
}else{
try{
this._oldBodyParentOverflow=dojo.style(_2d.parentNode,"overflow");
}
catch(e){
this._oldBodyParentOverflow="scroll";
}
}
dojo.style(_2d.parentNode,"overflow","hidden");
}
dojo.style(_2d,"overflow","hidden");
}
},_enableOverflow:function(){
if(this._overflowDisabled){
delete this._overflowDisabled;
var _2e=dojo.body();
if(dojo.isIE&&!dojo.isQuirks){
_2e.parentNode.style.overflow=this._oldBodyParentOverflow;
delete this._oldBodyParentOverflow;
}
dojo.style(_2e,"overflow",this._oldOverflow);
if(dojo.isWebKit){
var div=dojo.create("div",{style:{height:"2px"}});
_2e.appendChild(div);
setTimeout(function(){
_2e.removeChild(div);
},0);
}
delete this._oldOverflow;
}
}});
}
