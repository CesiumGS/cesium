/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.scrollable"]){
dojo._hasResource["dojox.mobile.scrollable"]=true;
if(typeof dojo!="undefined"&&dojo.provide){
dojo.provide("dojox.mobile.scrollable");
}else{
dojo={doc:document,global:window,isWebKit:navigator.userAgent.indexOf("WebKit")!=-1};
dojox={mobile:{}};
}
dojox.mobile.scrollable=function(){
this.fixedHeaderHeight=0;
this.fixedFooterHeight=0;
this.isLocalFooter=false;
this.scrollBar=true;
this.scrollDir="v";
this.weight=0.6;
this.fadeScrollBar=true;
this.disableFlashScrollBar=false;
this.threshold=0;
this.init=function(_1){
if(_1){
for(var p in _1){
if(_1.hasOwnProperty(p)){
this[p]=((p=="domNode"||p=="containerNode")&&typeof _1[p]=="string")?dojo.doc.getElementById(_1[p]):_1[p];
}
}
}
this._v=(this.scrollDir.indexOf("v")!=-1);
this._h=(this.scrollDir.indexOf("h")!=-1);
this._f=(this.scrollDir=="f");
this._ch=[];
this._ch.push(dojo.connect(this.containerNode,dojox.mobile.hasTouch?"touchstart":"onmousedown",this,"onTouchStart"));
if(dojo.isWebKit){
this._ch.push(dojo.connect(this.domNode,"webkitAnimationEnd",this,"onFlickAnimationEnd"));
this._ch.push(dojo.connect(this.domNode,"webkitAnimationStart",this,"onFlickAnimationStart"));
}
if(dojo.global.onorientationchange!==undefined){
this._ch.push(dojo.connect(dojo.global,"onorientationchange",this,"resizeView"));
}else{
this._ch.push(dojo.connect(dojo.global,"onresize",this,"resizeView"));
}
this.resizeView();
var _2=this;
setTimeout(function(){
_2.flashScrollBar();
},600);
};
this.cleanup=function(){
for(var i=0;i<this._ch.length;i++){
dojo.disconnect(this._ch[i]);
}
this._ch=null;
};
this.resizeView=function(e){
this._appFooterHeight=(this.fixedFooterHeight&&!this.isLocalFooter)?this.fixedFooterHeight:0;
this.containerNode.style.paddingTop=this.fixedHeaderHeight+"px";
var c=0;
var _3=this;
var id=setInterval(function(){
_3.domNode.style.height=(dojo.global.innerHeight||dojo.doc.documentElement.clientHeight)-_3._appFooterHeight+"px";
_3.resetScrollBar();
if(c++>=4){
clearInterval(id);
}
},300);
};
this.onFlickAnimationStart=function(e){
dojo.stopEvent(e);
};
this.onFlickAnimationEnd=function(e){
if(e&&e.srcElement){
dojo.stopEvent(e);
}
this.stopAnimation();
if(this._bounce){
var _4=this;
var _5=_4._bounce;
setTimeout(function(){
_4.slideTo(_5,0.3,"ease-out");
},0);
_4._bounce=undefined;
}else{
this.hideScrollBar();
this.removeCover();
}
};
this.onTouchStart=function(e){
if(this._conn&&(new Date()).getTime()-this.startTime<500){
return;
}
if(!this._conn){
this._conn=[];
this._conn.push(dojo.connect(dojo.doc,dojox.mobile.hasTouch?"touchmove":"onmousemove",this,"onTouchMove"));
this._conn.push(dojo.connect(dojo.doc,dojox.mobile.hasTouch?"touchend":"onmouseup",this,"onTouchEnd"));
}
this._aborted=false;
if(dojo.hasClass(this.containerNode,"mblScrollableScrollTo2")){
this.abort();
}
this.touchStartX=e.touches?e.touches[0].pageX:e.clientX;
this.touchStartY=e.touches?e.touches[0].pageY:e.clientY;
this.startTime=(new Date()).getTime();
this.startPos=this.getPos();
this._dim=this.getDim();
this._time=[0];
this._posX=[this.touchStartX];
this._posY=[this.touchStartY];
if(e.target.nodeType!=1||(e.target.tagName!="SELECT"&&e.target.tagName!="INPUT"&&e.target.tagName!="TEXTAREA")){
dojo.stopEvent(e);
}
};
this.onTouchMove=function(e){
var x=e.touches?e.touches[0].pageX:e.clientX;
var y=e.touches?e.touches[0].pageY:e.clientY;
var dx=x-this.touchStartX;
var dy=y-this.touchStartY;
var to={x:this.startPos.x+dx,y:this.startPos.y+dy};
var _6=this._dim;
if(this._time.length==1){
if(dx<this.threshold&&dy<this.threshold){
return;
}
this.addCover();
this.showScrollBar();
}
var _7=this.weight;
if(this._v){
if(to.y>0){
to.y=Math.round(to.y*_7);
}else{
if(to.y<-_6.o.h){
if(_6.c.h<_6.d.h){
to.y=Math.round(to.y*_7);
}else{
to.y=-_6.o.h-Math.round((-_6.o.h-to.y)*_7);
}
}
}
}
if(this._h||this._f){
if(to.x>0){
to.x=Math.round(to.x*_7);
}else{
if(to.x<-_6.o.w){
if(_6.c.w<_6.d.w){
to.x=Math.round(to.x*_7);
}else{
to.x=-_6.o.w-Math.round((-_6.o.w-to.x)*_7);
}
}
}
}
this.scrollTo(to);
var _8=10;
var n=this._time.length;
if(n>=2){
var d0,d1;
if(this._v&&!this._h){
d0=this._posY[n-1]-this._posY[n-2];
d1=y-this._posY[n-1];
}else{
if(!this._v&&this._h){
d0=this._posX[n-1]-this._posX[n-2];
d1=x-this._posX[n-1];
}
}
if(d0*d1<0){
this._time=[this._time[n-1]];
this._posX=[this._posX[n-1]];
this._posY=[this._posY[n-1]];
n=1;
}
}
if(n==_8){
this._time.shift();
this._posX.shift();
this._posY.shift();
}
this._time.push((new Date()).getTime()-this.startTime);
this._posX.push(x);
this._posY.push(y);
};
this.onTouchEnd=function(e){
if(!this._conn){
return;
}
for(var i=0;i<this._conn.length;i++){
dojo.disconnect(this._conn[i]);
}
this._conn=null;
var n=this._time.length;
var _9=false;
if(!this._aborted){
if(n<=1){
_9=true;
}else{
if(n==2&&Math.abs(this._posY[1]-this._posY[0])<4){
_9=true;
}
}
}
if(_9){
this.hideScrollBar();
this.removeCover();
if(dojox.mobile.hasTouch){
var _a=e.target;
if(_a.nodeType!=1){
_a=_a.parentNode;
}
var ev=dojo.doc.createEvent("MouseEvents");
ev.initEvent("click",true,true);
_a.dispatchEvent(ev);
}
return;
}
var _b={x:0,y:0};
if(n>=2&&(new Date()).getTime()-this.startTime-this._time[n-1]<500){
var dy=this._posY[n-(n>3?2:1)]-this._posY[(n-6)>=0?n-6:0];
var dx=this._posX[n-(n>3?2:1)]-this._posX[(n-6)>=0?n-6:0];
var dt=this._time[n-(n>3?2:1)]-this._time[(n-6)>=0?n-6:0];
_b.y=this.calcSpeed(dy,dt);
_b.x=this.calcSpeed(dx,dt);
}
var _c=this.getPos();
var to={};
var _d=this._dim;
if(this._v){
to.y=_c.y+_b.y;
}
if(this._h||this._f){
to.x=_c.x+_b.x;
}
if(this.scrollDir=="v"&&_d.c.h<=_d.d.h){
this.slideTo({y:0},0.3,"ease-out");
return;
}else{
if(this.scrollDir=="h"&&_d.c.w<=_d.d.w){
this.slideTo({x:0},0.3,"ease-out");
return;
}else{
if(this._v&&this._h&&_d.c.h<=_d.d.h&&_d.c.w<=_d.d.w){
this.slideTo({x:0,y:0},0.3,"ease-out");
return;
}
}
}
var _e,_f="ease-out";
var _10={};
if(this._v){
if(to.y>0){
if(_c.y>0){
_e=0.3;
to.y=0;
}else{
to.y=Math.min(to.y,20);
_f="linear";
_10.y=0;
}
}else{
if(-_b.y>_d.o.h-(-_c.y)){
if(_c.y<-_d.o.h){
_e=0.3;
to.y=_d.c.h<=_d.d.h?0:-_d.o.h;
}else{
to.y=Math.max(to.y,-_d.o.h-20);
_f="linear";
_10.y=-_d.o.h;
}
}
}
}
if(this._h||this._f){
if(to.x>0){
if(_c.x>0){
_e=0.3;
to.x=0;
}else{
to.x=Math.min(to.x,20);
_f="linear";
_10.x=0;
}
}else{
if(-_b.x>_d.o.w-(-_c.x)){
if(_c.x<-_d.o.w){
_e=0.3;
to.x=_d.c.w<=_d.d.w?0:-_d.o.w;
}else{
to.x=Math.max(to.x,-_d.o.w-20);
_f="linear";
_10.x=-_d.o.w;
}
}
}
}
this._bounce=(_10.x!==undefined||_10.y!==undefined)?_10:undefined;
if(_e===undefined){
var _11,_12;
if(this._v&&this._h){
_12=Math.sqrt(_b.x+_b.x+_b.y*_b.y);
_11=Math.sqrt(Math.pow(to.y-_c.y,2)+Math.pow(to.x-_c.x,2));
}else{
if(this._v){
_12=_b.y;
_11=to.y-_c.y;
}else{
if(this._h){
_12=_b.x;
_11=to.x-_c.x;
}
}
}
_e=_12!==0?Math.abs(_11/_12):0.01;
}
this.slideTo(to,_e,_f);
};
this.abort=function(){
this.scrollTo(this.getPos());
this.stopAnimation();
this._aborted=true;
};
this.stopAnimation=function(){
dojo.removeClass(this.containerNode,"mblScrollableScrollTo2");
if(this._scrollBarV){
this._scrollBarV.className="";
}
if(this._scrollBarH){
this._scrollBarH.className="";
}
};
this.calcSpeed=function(d,t){
return Math.round(d/t*100)*4;
};
this.scrollTo=function(to,_13){
var s=this.containerNode.style;
if(dojo.isWebKit){
s.webkitTransform=this.makeTranslateStr(to);
}else{
if(this._v){
s.top=to.y+"px";
}
if(this._h||this._f){
s.left=to.x+"px";
}
}
if(!_13){
this.scrollScrollBarTo(this.calcScrollBarPos(to));
}
};
this.slideTo=function(to,_14,_15){
this._runSlideAnimation(this.getPos(),to,_14,_15,this.containerNode,2);
this.slideScrollBarTo(to,_14,_15);
};
this.makeTranslateStr=function(to){
var y=this._v&&typeof to.y=="number"?to.y+"px":"0px";
var x=(this._h||this._f)&&typeof to.x=="number"?to.x+"px":"0px";
return dojox.mobile.hasTranslate3d?"translate3d("+x+","+y+",0px)":"translate("+x+","+y+")";
};
this.getPos=function(){
if(dojo.isWebKit){
var m=dojo.doc.defaultView.getComputedStyle(this.containerNode,"")["-webkit-transform"];
if(m&&m.indexOf("matrix")===0){
var arr=m.split(/[,\s\)]+/);
return {y:arr[5]-0,x:arr[4]-0};
}
return {x:0,y:0};
}else{
return {y:this.containerNode.offsetTop,x:this.containerNode.offsetLeft};
}
};
this.getDim=function(){
var d={};
d.c={h:this.containerNode.offsetHeight-this.fixedHeaderHeight,w:this.containerNode.offsetWidth};
d.v={h:this.domNode.offsetHeight+this._appFooterHeight,w:this.domNode.offsetWidth};
d.d={h:d.v.h-this.fixedHeaderHeight-this.fixedFooterHeight,w:d.v.w};
d.o={h:d.c.h-d.v.h+this.fixedHeaderHeight+this.fixedFooterHeight,w:d.c.w-d.v.w};
return d;
};
this.showScrollBar=function(){
if(!this.scrollBar){
return;
}
var dim=this._dim;
if(this.scrollDir=="v"&&dim.c.h<=dim.d.h){
return;
}
if(this.scrollDir=="h"&&dim.c.w<=dim.d.w){
return;
}
if(this._v&&this._h&&dim.c.h<=dim.d.h&&dim.c.w<=dim.d.w){
return;
}
var _16=function(_17,dir){
var bar=_17["_scrollBarNode"+dir];
if(!bar){
var _18=dojo.create("div",null,_17.domNode);
var _19={position:"absolute",overflow:"hidden"};
if(dir=="V"){
_19.right="2px";
_19.width="5px";
}else{
_19.bottom=(_17.isLocalFooter?_17.fixedFooterHeight:0)+2+"px";
_19.height="5px";
}
dojo.style(_18,_19);
_18.className="mblScrollBarWrapper";
_17["_scrollBarWrapper"+dir]=_18;
bar=dojo.create("div",null,_18);
dojo.style(bar,{opacity:0.6,position:"absolute",backgroundColor:"#606060",fontSize:"1px",webkitBorderRadius:"2px",MozBorderRadius:"2px",webkitTransformOrigin:"0 0",zIndex:2147483647});
dojo.style(bar,dir=="V"?{width:"5px"}:{height:"5px"});
_17["_scrollBarNode"+dir]=bar;
}
return bar;
};
if(this._v&&!this._scrollBarV){
this._scrollBarV=_16(this,"V");
}
if(this._h&&!this._scrollBarH){
this._scrollBarH=_16(this,"H");
}
this.resetScrollBar();
};
this.hideScrollBar=function(){
var _1a;
if(this.fadeScrollBar&&dojo.isWebKit){
if(!dojox.mobile._fadeRule){
var _1b=dojo.create("style",null,dojo.doc.getElementsByTagName("head")[0]);
_1b.textContent=".mblScrollableFadeOutScrollBar{"+"  -webkit-animation-duration: 1s;"+"  -webkit-animation-name: scrollableViewFadeOutScrollBar;}"+"@-webkit-keyframes scrollableViewFadeOutScrollBar{"+"  from { opacity: 0.6; }"+"  50% { opacity: 0.6; }"+"  to { opacity: 0; }}";
dojox.mobile._fadeRule=_1b.sheet.cssRules[1];
}
_1a=dojox.mobile._fadeRule;
}
if(!this.scrollBar){
return;
}
var f=function(bar){
dojo.style(bar,{opacity:0,webkitAnimationDuration:""});
bar.className="mblScrollableFadeOutScrollBar";
};
if(this._scrollBarV){
f(this._scrollBarV);
this._scrollBarV=null;
}
if(this._scrollBarH){
f(this._scrollBarH);
this._scrollBarH=null;
}
};
this.calcScrollBarPos=function(to){
var pos={};
var dim=this._dim;
var f=function(_1c,_1d,t,d,c){
var y=Math.round((d-_1d-8)/(d-c)*t);
if(y<-_1d+5){
y=-_1d+5;
}
if(y>_1c-5){
y=_1c-5;
}
return y;
};
if(typeof to.y=="number"&&this._scrollBarV){
pos.y=f(this._scrollBarWrapperV.offsetHeight,this._scrollBarV.offsetHeight,to.y,dim.d.h,dim.c.h);
}
if(typeof to.x=="number"&&this._scrollBarH){
pos.x=f(this._scrollBarWrapperH.offsetWidth,this._scrollBarH.offsetWidth,to.x,dim.d.w,dim.c.w);
}
return pos;
};
this.scrollScrollBarTo=function(to){
if(!this.scrollBar){
return;
}
if(this._v&&this._scrollBarV&&typeof to.y=="number"){
if(dojo.isWebKit){
this._scrollBarV.style.webkitTransform=this.makeTranslateStr({y:to.y});
}else{
this._scrollBarV.style.top=to.y+"px";
}
}
if(this._h&&this._scrollBarH&&typeof to.x=="number"){
if(dojo.isWebKit){
this._scrollBarH.style.webkitTransform=this.makeTranslateStr({x:to.x});
}else{
this._scrollBarH.style.left=to.x+"px";
}
}
};
this.slideScrollBarTo=function(to,_1e,_1f){
if(!this.scrollBar){
return;
}
var _20=this.calcScrollBarPos(this.getPos());
var _21=this.calcScrollBarPos(to);
if(this._v&&this._scrollBarV){
this._runSlideAnimation({y:_20.y},{y:_21.y},_1e,_1f,this._scrollBarV,0);
}
if(this._h&&this._scrollBarH){
this._runSlideAnimation({x:_20.x},{x:_21.x},_1e,_1f,this._scrollBarH,1);
}
};
this._runSlideAnimation=function(_22,to,_23,_24,_25,idx){
if(dojo.isWebKit){
this.setKeyframes(_22,to,idx);
dojo.style(_25,{webkitAnimationDuration:_23+"s",webkitAnimationTimingFunction:_24});
dojo.addClass(_25,"mblScrollableScrollTo"+idx);
if(idx==2){
this.scrollTo(to,true);
}else{
this.scrollScrollBarTo(to);
}
}else{
if(dojo.fx&&dojo.fx.easing){
var s=dojo.fx.slideTo({node:_25,duration:_23*1000,left:to.x,top:to.y,easing:(_24=="ease-out")?dojo.fx.easing.quadOut:dojo.fx.easing.linear}).play();
if(idx==2){
dojo.connect(s,"onEnd",this,"onFlickAnimationEnd");
}
}else{
if(idx==2){
this.scrollTo(to);
this.onFlickAnimationEnd();
}else{
this.scrollScrollBarTo(to);
}
}
}
};
this.resetScrollBar=function(){
var f=function(_26,bar,d,c,hd,v){
if(!bar){
return;
}
var _27={};
_27[v?"top":"left"]=hd+4+"px";
_27[v?"height":"width"]=d-8+"px";
dojo.style(_26,_27);
var l=Math.round(d*d/c);
l=Math.min(Math.max(l-8,5),d-8);
bar.style[v?"height":"width"]=l+"px";
dojo.style(bar,{"opacity":0.6});
};
var dim=this.getDim();
f(this._scrollBarWrapperV,this._scrollBarV,dim.d.h,dim.c.h,this.fixedHeaderHeight,true);
f(this._scrollBarWrapperH,this._scrollBarH,dim.d.w,dim.c.w,0);
this.createMask();
};
this.createMask=function(){
if(!dojo.isWebKit){
return;
}
var ctx;
if(this._scrollBarWrapperV){
var h=this._scrollBarWrapperV.offsetHeight;
ctx=dojo.doc.getCSSCanvasContext("2d","scrollBarMaskV",5,h);
ctx.fillStyle="rgba(0,0,0,0.5)";
ctx.fillRect(1,0,3,2);
ctx.fillRect(0,1,5,1);
ctx.fillRect(0,h-2,5,1);
ctx.fillRect(1,h-1,3,2);
ctx.fillStyle="rgb(0,0,0)";
ctx.fillRect(0,2,5,h-4);
this._scrollBarWrapperV.style.webkitMaskImage="-webkit-canvas(scrollBarMaskV)";
}
if(this._scrollBarWrapperH){
var w=this._scrollBarWrapperH.offsetWidth;
ctx=dojo.doc.getCSSCanvasContext("2d","scrollBarMaskH",w,5);
ctx.fillStyle="rgba(0,0,0,0.5)";
ctx.fillRect(0,1,2,3);
ctx.fillRect(1,0,1,5);
ctx.fillRect(w-2,0,1,5);
ctx.fillRect(w-1,1,2,3);
ctx.fillStyle="rgb(0,0,0)";
ctx.fillRect(2,0,w-4,5);
this._scrollBarWrapperH.style.webkitMaskImage="-webkit-canvas(scrollBarMaskH)";
}
};
this.flashScrollBar=function(){
if(this.disableFlashScrollBar){
return;
}
this._dim=this.getDim();
if(this._dim.d.h<=0){
return;
}
this.showScrollBar();
var _28=this;
setTimeout(function(){
_28.hideScrollBar();
},300);
};
this.addCover=function(){
if(!dojox.mobile.hasTouch&&!this.noCover){
if(!this._cover){
this._cover=dojo.create("div",null,dojo.doc.body);
dojo.style(this._cover,{backgroundColor:"#ffff00",opacity:0,position:"absolute",top:"0px",left:"0px",width:"100%",height:"100%",zIndex:2147483647});
this._ch.push(dojo.connect(this._cover,dojox.mobile.hasTouch?"touchstart":"onmousedown",this,"onTouchEnd"));
}else{
this._cover.style.display="";
}
}
this.setSelectable(this.domNode,false);
var sel;
if(dojo.global.getSelection){
sel=dojo.global.getSelection();
sel.collapse(dojo.doc.body,0);
}else{
sel=dojo.doc.selection.createRange();
sel.setEndPoint("EndToStart",sel);
sel.select();
}
};
this.removeCover=function(){
if(!dojox.mobile.hasTouch&&this._cover){
this._cover.style.display="none";
}
this.setSelectable(this.domNode,true);
};
this.setKeyframes=function(_29,to,idx){
if(!dojox.mobile._rule){
dojox.mobile._rule=[];
}
if(!dojox.mobile._rule[idx]){
var _2a=dojo.create("style",null,dojo.doc.getElementsByTagName("head")[0]);
_2a.textContent=".mblScrollableScrollTo"+idx+"{-webkit-animation-name: scrollableViewScroll"+idx+";}"+"@-webkit-keyframes scrollableViewScroll"+idx+"{}";
dojox.mobile._rule[idx]=_2a.sheet.cssRules[1];
}
var _2b=dojox.mobile._rule[idx];
if(_2b){
if(_29){
_2b.deleteRule("from");
_2b.insertRule("from { -webkit-transform: "+this.makeTranslateStr(_29)+"; }");
}
if(to){
if(to.x===undefined){
to.x=_29.x;
}
if(to.y===undefined){
to.y=_29.y;
}
_2b.deleteRule("to");
_2b.insertRule("to { -webkit-transform: "+this.makeTranslateStr(to)+"; }");
}
}
};
this.setSelectable=function(_2c,_2d){
_2c.style.KhtmlUserSelect=_2d?"auto":"none";
_2c.style.MozUserSelect=_2d?"":"none";
_2c.onselectstart=_2d?null:function(){
return false;
};
_2c.unselectable=_2d?"":"on";
};
};
(function(){
if(dojo.isWebKit){
var _2e=dojo.doc.createElement("div");
_2e.style.webkitTransform="translate3d(0px,1px,0px)";
dojo.doc.documentElement.appendChild(_2e);
var v=dojo.doc.defaultView.getComputedStyle(_2e,"")["-webkit-transform"];
dojox.mobile.hasTranslate3d=v&&v.indexOf("matrix")===0;
dojo.doc.documentElement.removeChild(_2e);
dojox.mobile.hasTouch=(typeof dojo.doc.documentElement.ontouchstart!="undefined"&&navigator.appVersion.indexOf("Mobile")!=-1);
}
})();
}
