/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.image.LightboxNano"]){
dojo._hasResource["dojox.image.LightboxNano"]=true;
dojo.provide("dojox.image.LightboxNano");
dojo.require("dojo.fx");
var abs="absolute",vis="visibility",getViewport=function(){
var _1=(dojo.doc.compatMode=="BackCompat")?dojo.body():dojo.doc.documentElement,_2=dojo._docScroll();
return {w:_1.clientWidth,h:_1.clientHeight,l:_2.x,t:_2.y};
};
dojo.declare("dojox.image.LightboxNano",null,{href:"",duration:500,preloadDelay:5000,constructor:function(p,n){
var _3=this;
dojo.mixin(_3,p);
n=_3._node=dojo.byId(n);
if(n){
if(!/a/i.test(n.tagName)){
var a=dojo.create("a",{href:_3.href,"class":n.className},n,"after");
n.className="";
a.appendChild(n);
n=a;
}
dojo.style(n,"position","relative");
_3._createDiv("dojoxEnlarge",n);
dojo.setSelectable(n,false);
_3._onClickEvt=dojo.connect(n,"onclick",_3,"_load");
}
if(_3.href){
setTimeout(function(){
(new Image()).src=_3.href;
_3._hideLoading();
},_3.preloadDelay);
}
},destroy:function(){
var a=this._connects||[];
a.push(this._onClickEvt);
dojo.forEach(a,dojo.disconnect);
dojo.destroy(this._node);
},_createDiv:function(_4,_5,_6){
return dojo.create("div",{"class":_4,style:{position:abs,display:_6?"":"none"}},_5);
},_load:function(e){
var _7=this;
e&&dojo.stopEvent(e);
if(!_7._loading){
_7._loading=true;
_7._reset();
var i=_7._img=dojo.create("img",{style:{visibility:"hidden",cursor:"pointer",position:abs,top:0,left:0,zIndex:9999999}},dojo.body()),ln=_7._loadingNode,n=dojo.query("img",_7._node)[0]||_7._node,a=dojo.position(n,true),c=dojo.contentBox(n),b=dojo._getBorderExtents(n);
if(ln==null){
_7._loadingNode=ln=_7._createDiv("dojoxLoading",_7._node,true);
var l=dojo.marginBox(ln);
dojo.style(ln,{left:parseInt((c.w-l.w)/2)+"px",top:parseInt((c.h-l.h)/2)+"px"});
}
c.x=a.x-10+b.l;
c.y=a.y-10+b.t;
_7._start=c;
_7._connects=[dojo.connect(i,"onload",_7,"_show")];
i.src=_7.href;
}
},_hideLoading:function(){
if(this._loadingNode){
dojo.style(this._loadingNode,"display","none");
}
this._loadingNode=false;
},_show:function(){
var _8=this,vp=getViewport(),w=_8._img.width,h=_8._img.height,_9=parseInt((vp.w-20)*0.9),_a=parseInt((vp.h-20)*0.9),dd=dojo.doc,bg=_8._bg=dojo.create("div",{style:{backgroundColor:"#000",opacity:0,position:abs,zIndex:9999998}},dojo.body()),ln=_8._loadingNode;
if(_8._loadingNode){
_8._hideLoading();
}
dojo.style(_8._img,{border:"10px solid #fff",visibility:"visible"});
dojo.style(_8._node,vis,"hidden");
_8._loading=false;
_8._connects=_8._connects.concat([dojo.connect(dd,"onmousedown",_8,"_hide"),dojo.connect(dd,"onkeypress",_8,"_key"),dojo.connect(window,"onresize",_8,"_sizeBg")]);
if(w>_9){
h=h*_9/w;
w=_9;
}
if(h>_a){
w=w*_a/h;
h=_a;
}
_8._end={x:(vp.w-20-w)/2+vp.l,y:(vp.h-20-h)/2+vp.t,w:w,h:h};
_8._sizeBg();
dojo.fx.combine([_8._anim(_8._img,_8._coords(_8._start,_8._end)),_8._anim(bg,{opacity:0.5})]).play();
},_sizeBg:function(){
var dd=dojo.doc.documentElement;
dojo.style(this._bg,{top:0,left:0,width:dd.scrollWidth+"px",height:dd.scrollHeight+"px"});
},_key:function(e){
dojo.stopEvent(e);
this._hide();
},_coords:function(s,e){
return {left:{start:s.x,end:e.x},top:{start:s.y,end:e.y},width:{start:s.w,end:e.w},height:{start:s.h,end:e.h}};
},_hide:function(){
var _b=this;
dojo.forEach(_b._connects,dojo.disconnect);
_b._connects=[];
dojo.fx.combine([_b._anim(_b._img,_b._coords(_b._end,_b._start),"_reset"),_b._anim(_b._bg,{opacity:0})]).play();
},_reset:function(){
dojo.style(this._node,vis,"visible");
dojo.destroy(this._img);
dojo.destroy(this._bg);
this._img=this._bg=null;
this._node.focus();
},_anim:function(_c,_d,_e){
return dojo.animateProperty({node:_c,duration:this.duration,properties:_d,onEnd:_e?dojo.hitch(this,_e):null});
},show:function(_f){
_f=_f||{};
this.href=_f.href||this.href;
var n=dojo.byId(_f.origin),vp=getViewport();
this._node=n||dojo.create("div",{style:{position:abs,width:0,hieght:0,left:(vp.l+(vp.w/2))+"px",top:(vp.t+(vp.h/2))+"px"}},dojo.body());
this._load();
if(!n){
dojo.destroy(this._node);
}
}});
}
