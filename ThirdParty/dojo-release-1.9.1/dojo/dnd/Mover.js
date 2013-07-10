/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/Mover",["../_base/array","../_base/declare","../_base/lang","../sniff","../_base/window","../dom","../dom-geometry","../dom-style","../Evented","../on","../touch","./common","./autoscroll"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,on,_a,_b,_c){
return _2("dojo.dnd.Mover",[_9],{constructor:function(_d,e,_e){
this.node=_6.byId(_d);
this.marginBox={l:e.pageX,t:e.pageY};
this.mouseButton=e.button;
var h=(this.host=_e),d=_d.ownerDocument;
function _f(e){
e.preventDefault();
e.stopPropagation();
};
this.events=[on(d,_a.move,_3.hitch(this,"onFirstMove")),on(d,_a.move,_3.hitch(this,"onMouseMove")),on(d,_a.release,_3.hitch(this,"onMouseUp")),on(d,"dragstart",_f),on(d.body,"selectstart",_f)];
_c.autoScrollStart(d);
if(h&&h.onMoveStart){
h.onMoveStart(this);
}
},onMouseMove:function(e){
_c.autoScroll(e);
var m=this.marginBox;
this.host.onMove(this,{l:m.l+e.pageX,t:m.t+e.pageY},e);
e.preventDefault();
e.stopPropagation();
},onMouseUp:function(e){
if(_4("webkit")&&_4("mac")&&this.mouseButton==2?e.button==0:this.mouseButton==e.button){
this.destroy();
}
e.preventDefault();
e.stopPropagation();
},onFirstMove:function(e){
var s=this.node.style,l,t,h=this.host;
switch(s.position){
case "relative":
case "absolute":
l=Math.round(parseFloat(s.left))||0;
t=Math.round(parseFloat(s.top))||0;
break;
default:
s.position="absolute";
var m=_7.getMarginBox(this.node);
var b=_5.doc.body;
var bs=_8.getComputedStyle(b);
var bm=_7.getMarginBox(b,bs);
var bc=_7.getContentBox(b,bs);
l=m.l-(bc.l-bm.l);
t=m.t-(bc.t-bm.t);
break;
}
this.marginBox.l=l-this.marginBox.l;
this.marginBox.t=t-this.marginBox.t;
if(h&&h.onFirstMove){
h.onFirstMove(this,e);
}
this.events.shift().remove();
},destroy:function(){
_1.forEach(this.events,function(_10){
_10.remove();
});
var h=this.host;
if(h&&h.onMoveStop){
h.onMoveStop(this);
}
this.events=this.node=this.host=null;
}});
});
