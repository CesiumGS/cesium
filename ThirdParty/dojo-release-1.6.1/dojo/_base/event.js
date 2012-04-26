/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.event"]){
dojo._hasResource["dojo._base.event"]=true;
dojo.provide("dojo._base.event");
dojo.require("dojo._base.connect");
(function(){
var _1=(dojo._event_listener={add:function(_2,_3,fp){
if(!_2){
return;
}
_3=_1._normalizeEventName(_3);
fp=_1._fixCallback(_3,fp);
if(!dojo.isIE&&(_3=="mouseenter"||_3=="mouseleave")){
var _4=fp;
_3=(_3=="mouseenter")?"mouseover":"mouseout";
fp=function(e){
if(!dojo.isDescendant(e.relatedTarget,_2)){
return _4.call(this,e);
}
};
}
_2.addEventListener(_3,fp,false);
return fp;
},remove:function(_5,_6,_7){
if(_5){
_6=_1._normalizeEventName(_6);
if(!dojo.isIE&&(_6=="mouseenter"||_6=="mouseleave")){
_6=(_6=="mouseenter")?"mouseover":"mouseout";
}
_5.removeEventListener(_6,_7,false);
}
},_normalizeEventName:function(_8){
return _8.slice(0,2)=="on"?_8.slice(2):_8;
},_fixCallback:function(_9,fp){
return _9!="keypress"?fp:function(e){
return fp.call(this,_1._fixEvent(e,this));
};
},_fixEvent:function(_a,_b){
switch(_a.type){
case "keypress":
_1._setKeyChar(_a);
break;
}
return _a;
},_setKeyChar:function(_c){
_c.keyChar=_c.charCode>=32?String.fromCharCode(_c.charCode):"";
_c.charOrCode=_c.keyChar||_c.keyCode;
},_punctMap:{106:42,111:47,186:59,187:43,188:44,189:45,190:46,191:47,192:96,219:91,220:92,221:93,222:39}});
dojo.fixEvent=function(_d,_e){
return _1._fixEvent(_d,_e);
};
dojo.stopEvent=function(_f){
_f.preventDefault();
_f.stopPropagation();
};
var _10=dojo._listener;
dojo._connect=function(obj,_11,_12,_13,_14){
var _15=obj&&(obj.nodeType||obj.attachEvent||obj.addEventListener);
var lid=_15?(_14?2:1):0,l=[dojo._listener,_1,_10][lid];
var h=l.add(obj,_11,dojo.hitch(_12,_13));
return [obj,_11,h,lid];
};
dojo._disconnect=function(obj,_16,_17,_18){
([dojo._listener,_1,_10][_18]).remove(obj,_16,_17);
};
dojo.keys={BACKSPACE:8,TAB:9,CLEAR:12,ENTER:13,SHIFT:16,CTRL:17,ALT:18,META:dojo.isSafari?91:224,PAUSE:19,CAPS_LOCK:20,ESCAPE:27,SPACE:32,PAGE_UP:33,PAGE_DOWN:34,END:35,HOME:36,LEFT_ARROW:37,UP_ARROW:38,RIGHT_ARROW:39,DOWN_ARROW:40,INSERT:45,DELETE:46,HELP:47,LEFT_WINDOW:91,RIGHT_WINDOW:92,SELECT:93,NUMPAD_0:96,NUMPAD_1:97,NUMPAD_2:98,NUMPAD_3:99,NUMPAD_4:100,NUMPAD_5:101,NUMPAD_6:102,NUMPAD_7:103,NUMPAD_8:104,NUMPAD_9:105,NUMPAD_MULTIPLY:106,NUMPAD_PLUS:107,NUMPAD_ENTER:108,NUMPAD_MINUS:109,NUMPAD_PERIOD:110,NUMPAD_DIVIDE:111,F1:112,F2:113,F3:114,F4:115,F5:116,F6:117,F7:118,F8:119,F9:120,F10:121,F11:122,F12:123,F13:124,F14:125,F15:126,NUM_LOCK:144,SCROLL_LOCK:145,copyKey:dojo.isMac&&!dojo.isAIR?(dojo.isSafari?91:224):17};
var _19=dojo.isMac?"metaKey":"ctrlKey";
dojo.isCopyKey=function(e){
return e[_19];
};
if(dojo.isIE<9||(dojo.isIE&&dojo.isQuirks)){
dojo.mouseButtons={LEFT:1,MIDDLE:4,RIGHT:2,isButton:function(e,_1a){
return e.button&_1a;
},isLeft:function(e){
return e.button&1;
},isMiddle:function(e){
return e.button&4;
},isRight:function(e){
return e.button&2;
}};
}else{
dojo.mouseButtons={LEFT:0,MIDDLE:1,RIGHT:2,isButton:function(e,_1b){
return e.button==_1b;
},isLeft:function(e){
return e.button==0;
},isMiddle:function(e){
return e.button==1;
},isRight:function(e){
return e.button==2;
}};
}
if(dojo.isIE){
var _1c=function(e,_1d){
try{
return (e.keyCode=_1d);
}
catch(e){
return 0;
}
};
var iel=dojo._listener;
var _1e=(dojo._ieListenersName="_"+dojo._scopeName+"_listeners");
if(!dojo.config._allow_leaks){
_10=iel=dojo._ie_listener={handlers:[],add:function(_1f,_20,_21){
_1f=_1f||dojo.global;
var f=_1f[_20];
if(!f||!f[_1e]){
var d=dojo._getIeDispatcher();
d.target=f&&(ieh.push(f)-1);
d[_1e]=[];
f=_1f[_20]=d;
}
return f[_1e].push(ieh.push(_21)-1);
},remove:function(_22,_23,_24){
var f=(_22||dojo.global)[_23],l=f&&f[_1e];
if(f&&l&&_24--){
delete ieh[l[_24]];
delete l[_24];
}
}};
var ieh=iel.handlers;
}
dojo.mixin(_1,{add:function(_25,_26,fp){
if(!_25){
return;
}
_26=_1._normalizeEventName(_26);
if(_26=="onkeypress"){
var kd=_25.onkeydown;
if(!kd||!kd[_1e]||!kd._stealthKeydownHandle){
var h=_1.add(_25,"onkeydown",_1._stealthKeyDown);
kd=_25.onkeydown;
kd._stealthKeydownHandle=h;
kd._stealthKeydownRefs=1;
}else{
kd._stealthKeydownRefs++;
}
}
return iel.add(_25,_26,_1._fixCallback(fp));
},remove:function(_27,_28,_29){
_28=_1._normalizeEventName(_28);
iel.remove(_27,_28,_29);
if(_28=="onkeypress"){
var kd=_27.onkeydown;
if(--kd._stealthKeydownRefs<=0){
iel.remove(_27,"onkeydown",kd._stealthKeydownHandle);
delete kd._stealthKeydownHandle;
}
}
},_normalizeEventName:function(_2a){
return _2a.slice(0,2)!="on"?"on"+_2a:_2a;
},_nop:function(){
},_fixEvent:function(evt,_2b){
if(!evt){
var w=_2b&&(_2b.ownerDocument||_2b.document||_2b).parentWindow||window;
evt=w.event;
}
if(!evt){
return (evt);
}
evt.target=evt.srcElement;
evt.currentTarget=(_2b||evt.srcElement);
evt.layerX=evt.offsetX;
evt.layerY=evt.offsetY;
var se=evt.srcElement,doc=(se&&se.ownerDocument)||document;
var _2c=((dojo.isIE<6)||(doc["compatMode"]=="BackCompat"))?doc.body:doc.documentElement;
var _2d=dojo._getIeDocumentElementOffset();
evt.pageX=evt.clientX+dojo._fixIeBiDiScrollLeft(_2c.scrollLeft||0)-_2d.x;
evt.pageY=evt.clientY+(_2c.scrollTop||0)-_2d.y;
if(evt.type=="mouseover"){
evt.relatedTarget=evt.fromElement;
}
if(evt.type=="mouseout"){
evt.relatedTarget=evt.toElement;
}
if(dojo.isIE<9||dojo.isQuirks){
evt.stopPropagation=_1._stopPropagation;
evt.preventDefault=_1._preventDefault;
}
return _1._fixKeys(evt);
},_fixKeys:function(evt){
switch(evt.type){
case "keypress":
var c=("charCode" in evt?evt.charCode:evt.keyCode);
if(c==10){
c=0;
evt.keyCode=13;
}else{
if(c==13||c==27){
c=0;
}else{
if(c==3){
c=99;
}
}
}
evt.charCode=c;
_1._setKeyChar(evt);
break;
}
return evt;
},_stealthKeyDown:function(evt){
var kp=evt.currentTarget.onkeypress;
if(!kp||!kp[_1e]){
return;
}
var k=evt.keyCode;
var _2e=(k!=13||(dojo.isIE>=9&&!dojo.isQuirks))&&k!=32&&k!=27&&(k<48||k>90)&&(k<96||k>111)&&(k<186||k>192)&&(k<219||k>222);
if(_2e||evt.ctrlKey){
var c=_2e?0:k;
if(evt.ctrlKey){
if(k==3||k==13){
return;
}else{
if(c>95&&c<106){
c-=48;
}else{
if((!evt.shiftKey)&&(c>=65&&c<=90)){
c+=32;
}else{
c=_1._punctMap[c]||c;
}
}
}
}
var _2f=_1._synthesizeEvent(evt,{type:"keypress",faux:true,charCode:c});
kp.call(evt.currentTarget,_2f);
if(dojo.isIE<9||(dojo.isIE&&dojo.isQuirks)){
evt.cancelBubble=_2f.cancelBubble;
}
evt.returnValue=_2f.returnValue;
_1c(evt,_2f.keyCode);
}
},_stopPropagation:function(){
this.cancelBubble=true;
},_preventDefault:function(){
this.bubbledKeyCode=this.keyCode;
if(this.ctrlKey){
_1c(this,0);
}
this.returnValue=false;
}});
dojo.stopEvent=(dojo.isIE<9||dojo.isQuirks)?function(evt){
evt=evt||window.event;
_1._stopPropagation.call(evt);
_1._preventDefault.call(evt);
}:dojo.stopEvent;
}
_1._synthesizeEvent=function(evt,_30){
var _31=dojo.mixin({},evt,_30);
_1._setKeyChar(_31);
_31.preventDefault=function(){
evt.preventDefault();
};
_31.stopPropagation=function(){
evt.stopPropagation();
};
return _31;
};
if(dojo.isOpera){
dojo.mixin(_1,{_fixEvent:function(evt,_32){
switch(evt.type){
case "keypress":
var c=evt.which;
if(c==3){
c=99;
}
c=c<41&&!evt.shiftKey?0:c;
if(evt.ctrlKey&&!evt.shiftKey&&c>=65&&c<=90){
c+=32;
}
return _1._synthesizeEvent(evt,{charCode:c});
}
return evt;
}});
}
if(dojo.isWebKit){
_1._add=_1.add;
_1._remove=_1.remove;
dojo.mixin(_1,{add:function(_33,_34,fp){
if(!_33){
return;
}
var _35=_1._add(_33,_34,fp);
if(_1._normalizeEventName(_34)=="keypress"){
_35._stealthKeyDownHandle=_1._add(_33,"keydown",function(evt){
var k=evt.keyCode;
var _36=k!=13&&k!=32&&(k<48||k>90)&&(k<96||k>111)&&(k<186||k>192)&&(k<219||k>222);
if(_36||evt.ctrlKey){
var c=_36?0:k;
if(evt.ctrlKey){
if(k==3||k==13){
return;
}else{
if(c>95&&c<106){
c-=48;
}else{
if(!evt.shiftKey&&c>=65&&c<=90){
c+=32;
}else{
c=_1._punctMap[c]||c;
}
}
}
}
var _37=_1._synthesizeEvent(evt,{type:"keypress",faux:true,charCode:c});
fp.call(evt.currentTarget,_37);
}
});
}
return _35;
},remove:function(_38,_39,_3a){
if(_38){
if(_3a._stealthKeyDownHandle){
_1._remove(_38,"keydown",_3a._stealthKeyDownHandle);
}
_1._remove(_38,_39,_3a);
}
},_fixEvent:function(evt,_3b){
switch(evt.type){
case "keypress":
if(evt.faux){
return evt;
}
var c=evt.charCode;
c=c>=32?c:0;
return _1._synthesizeEvent(evt,{charCode:c,faux:true});
}
return evt;
}});
}
})();
if(dojo.isIE){
dojo._ieDispatcher=function(_3c,_3d){
var ap=Array.prototype,h=dojo._ie_listener.handlers,c=_3c.callee,ls=c[dojo._ieListenersName],t=h[c.target];
var r=t&&t.apply(_3d,_3c);
var lls=[].concat(ls);
for(var i in lls){
var f=h[lls[i]];
if(!(i in ap)&&f){
f.apply(_3d,_3c);
}
}
return r;
};
dojo._getIeDispatcher=function(){
return new Function(dojo._scopeName+"._ieDispatcher(arguments, this)");
};
dojo._event_listener._fixCallback=function(fp){
var f=dojo._event_listener._fixEvent;
return function(e){
return fp.call(this,f(e,this));
};
};
}
}
