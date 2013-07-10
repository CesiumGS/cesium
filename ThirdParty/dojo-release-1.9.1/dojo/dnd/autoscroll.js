/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/autoscroll",["../_base/lang","../sniff","../_base/window","../dom-geometry","../dom-style","../window"],function(_1,_2,_3,_4,_5,_6){
var _7={};
_1.setObject("dojo.dnd.autoscroll",_7);
_7.getViewport=_6.getBox;
_7.V_TRIGGER_AUTOSCROLL=32;
_7.H_TRIGGER_AUTOSCROLL=32;
_7.V_AUTOSCROLL_VALUE=16;
_7.H_AUTOSCROLL_VALUE=16;
var _8,_9=_3.doc,_a=Infinity,_b=Infinity;
_7.autoScrollStart=function(d){
_9=d;
_8=_6.getBox(_9);
var _c=_3.body(_9).parentNode;
_a=Math.max(_c.scrollHeight-_8.h,0);
_b=Math.max(_c.scrollWidth-_8.w,0);
};
_7.autoScroll=function(e){
var v=_8||_6.getBox(_9),_d=_3.body(_9).parentNode,dx=0,dy=0;
if(e.clientX<_7.H_TRIGGER_AUTOSCROLL){
dx=-_7.H_AUTOSCROLL_VALUE;
}else{
if(e.clientX>v.w-_7.H_TRIGGER_AUTOSCROLL){
dx=Math.min(_7.H_AUTOSCROLL_VALUE,_b-_d.scrollLeft);
}
}
if(e.clientY<_7.V_TRIGGER_AUTOSCROLL){
dy=-_7.V_AUTOSCROLL_VALUE;
}else{
if(e.clientY>v.h-_7.V_TRIGGER_AUTOSCROLL){
dy=Math.min(_7.V_AUTOSCROLL_VALUE,_a-_d.scrollTop);
}
}
window.scrollBy(dx,dy);
};
_7._validNodes={"div":1,"p":1,"td":1};
_7._validOverflow={"auto":1,"scroll":1};
_7.autoScrollNodes=function(e){
var b,t,w,h,rx,ry,dx=0,dy=0,_e,_f;
for(var n=e.target;n;){
if(n.nodeType==1&&(n.tagName.toLowerCase() in _7._validNodes)){
var s=_5.getComputedStyle(n),_10=(s.overflow.toLowerCase() in _7._validOverflow),_11=(s.overflowX.toLowerCase() in _7._validOverflow),_12=(s.overflowY.toLowerCase() in _7._validOverflow);
if(_10||_11||_12){
b=_4.getContentBox(n,s);
t=_4.position(n,true);
}
if(_10||_11){
w=Math.min(_7.H_TRIGGER_AUTOSCROLL,b.w/2);
rx=e.pageX-t.x;
if(_2("webkit")||_2("opera")){
rx+=_3.body().scrollLeft;
}
dx=0;
if(rx>0&&rx<b.w){
if(rx<w){
dx=-w;
}else{
if(rx>b.w-w){
dx=w;
}
}
_e=n.scrollLeft;
n.scrollLeft=n.scrollLeft+dx;
}
}
if(_10||_12){
h=Math.min(_7.V_TRIGGER_AUTOSCROLL,b.h/2);
ry=e.pageY-t.y;
if(_2("webkit")||_2("opera")){
ry+=_3.body().scrollTop;
}
dy=0;
if(ry>0&&ry<b.h){
if(ry<h){
dy=-h;
}else{
if(ry>b.h-h){
dy=h;
}
}
_f=n.scrollTop;
n.scrollTop=n.scrollTop+dy;
}
}
if(dx||dy){
return;
}
}
try{
n=n.parentNode;
}
catch(x){
n=null;
}
}
_7.autoScroll(e);
};
return _7;
});
