/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/on",["./has!dom-addeventlistener?:./aspect","./_base/kernel","./sniff"],function(_1,_2,_3){
"use strict";
if(1){
var _4=window.ScriptEngineMajorVersion;
_3.add("jscript",_4&&(_4()+ScriptEngineMinorVersion()/10));
_3.add("event-orientationchange",_3("touch")&&!_3("android"));
_3.add("event-stopimmediatepropagation",window.Event&&!!window.Event.prototype&&!!window.Event.prototype.stopImmediatePropagation);
_3.add("event-focusin",function(_5,_6,_7){
return !!_7.attachEvent;
});
}
var on=function(_8,_9,_a,_b){
if(typeof _8.on=="function"&&typeof _9!="function"&&!_8.nodeType){
return _8.on(_9,_a);
}
return on.parse(_8,_9,_a,_c,_b,this);
};
on.pausable=function(_d,_e,_f,_10){
var _11;
var _12=on(_d,_e,function(){
if(!_11){
return _f.apply(this,arguments);
}
},_10);
_12.pause=function(){
_11=true;
};
_12.resume=function(){
_11=false;
};
return _12;
};
on.once=function(_13,_14,_15,_16){
var _17=on(_13,_14,function(){
_17.remove();
return _15.apply(this,arguments);
});
return _17;
};
on.parse=function(_18,_19,_1a,_1b,_1c,_1d){
if(_19.call){
return _19.call(_1d,_18,_1a);
}
if(_19.indexOf(",")>-1){
var _1e=_19.split(/\s*,\s*/);
var _1f=[];
var i=0;
var _20;
while(_20=_1e[i++]){
_1f.push(_1b(_18,_20,_1a,_1c,_1d));
}
_1f.remove=function(){
for(var i=0;i<_1f.length;i++){
_1f[i].remove();
}
};
return _1f;
}
return _1b(_18,_19,_1a,_1c,_1d);
};
var _21=/^touch/;
function _c(_22,_23,_24,_25,_26){
var _27=_23.match(/(.*):(.*)/);
if(_27){
_23=_27[2];
_27=_27[1];
return on.selector(_27,_23).call(_26,_22,_24);
}
if(_3("touch")){
if(_21.test(_23)){
_24=_28(_24);
}
if(!_3("event-orientationchange")&&(_23=="orientationchange")){
_23="resize";
_22=window;
_24=_28(_24);
}
}
if(_29){
_24=_29(_24);
}
if(_22.addEventListener){
var _2a=_23 in _2b,_2c=_2a?_2b[_23]:_23;
_22.addEventListener(_2c,_24,_2a);
return {remove:function(){
_22.removeEventListener(_2c,_24,_2a);
}};
}
_23="on"+_23;
if(_2d&&_22.attachEvent){
return _2d(_22,_23,_24);
}
throw new Error("Target must be an event emitter");
};
on.selector=function(_2e,_2f,_30){
return function(_31,_32){
var _33=typeof _2e=="function"?{matches:_2e}:this,_34=_2f.bubble;
function _35(_36){
_33=_33&&_33.matches?_33:_2.query;
while(!_33.matches(_36,_2e,_31)){
if(_36==_31||_30===false||!(_36=_36.parentNode)||_36.nodeType!=1){
return;
}
}
return _36;
};
if(_34){
return on(_31,_34(_35),_32);
}
return on(_31,_2f,function(_37){
var _38=_35(_37.target);
return _38&&_32.call(_38,_37);
});
};
};
function _39(){
this.cancelable=false;
this.defaultPrevented=true;
};
function _3a(){
this.bubbles=false;
};
var _3b=[].slice,_3c=on.emit=function(_3d,_3e,_3f){
var _40=_3b.call(arguments,2);
var _41="on"+_3e;
if("parentNode" in _3d){
var _42=_40[0]={};
for(var i in _3f){
_42[i]=_3f[i];
}
_42.preventDefault=_39;
_42.stopPropagation=_3a;
_42.target=_3d;
_42.type=_3e;
_3f=_42;
}
do{
_3d[_41]&&_3d[_41].apply(_3d,_40);
}while(_3f&&_3f.bubbles&&(_3d=_3d.parentNode));
return _3f&&_3f.cancelable&&_3f;
};
var _2b=_3("event-focusin")?{}:{focusin:"focus",focusout:"blur"};
if(!_3("event-stopimmediatepropagation")){
var _43=function(){
this.immediatelyStopped=true;
this.modified=true;
};
var _29=function(_44){
return function(_45){
if(!_45.immediatelyStopped){
_45.stopImmediatePropagation=_43;
return _44.apply(this,arguments);
}
};
};
}
if(_3("dom-addeventlistener")){
on.emit=function(_46,_47,_48){
if(_46.dispatchEvent&&document.createEvent){
var _49=_46.ownerDocument.createEvent("HTMLEvents");
_49.initEvent(_47,!!_48.bubbles,!!_48.cancelable);
for(var i in _48){
if(!(i in _49)){
_49[i]=_48[i];
}
}
return _46.dispatchEvent(_49)&&_49;
}
return _3c.apply(on,arguments);
};
}else{
on._fixEvent=function(evt,_4a){
if(!evt){
var w=_4a&&(_4a.ownerDocument||_4a.document||_4a).parentWindow||window;
evt=w.event;
}
if(!evt){
return evt;
}
try{
if(_4b&&evt.type==_4b.type&&evt.srcElement==_4b.target){
evt=_4b;
}
}
catch(e){
}
if(!evt.target){
evt.target=evt.srcElement;
evt.currentTarget=(_4a||evt.srcElement);
if(evt.type=="mouseover"){
evt.relatedTarget=evt.fromElement;
}
if(evt.type=="mouseout"){
evt.relatedTarget=evt.toElement;
}
if(!evt.stopPropagation){
evt.stopPropagation=_4c;
evt.preventDefault=_4d;
}
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
_4e(evt);
break;
}
}
return evt;
};
var _4b,_4f=function(_50){
this.handle=_50;
};
_4f.prototype.remove=function(){
delete _dojoIEListeners_[this.handle];
};
var _51=function(_52){
return function(evt){
evt=on._fixEvent(evt,this);
var _53=_52.call(this,evt);
if(evt.modified){
if(!_4b){
setTimeout(function(){
_4b=null;
});
}
_4b=evt;
}
return _53;
};
};
var _2d=function(_54,_55,_56){
_56=_51(_56);
if(((_54.ownerDocument?_54.ownerDocument.parentWindow:_54.parentWindow||_54.window||window)!=top||_3("jscript")<5.8)&&!_3("config-_allow_leaks")){
if(typeof _dojoIEListeners_=="undefined"){
_dojoIEListeners_=[];
}
var _57=_54[_55];
if(!_57||!_57.listeners){
var _58=_57;
_57=Function("event","var callee = arguments.callee; for(var i = 0; i<callee.listeners.length; i++){var listener = _dojoIEListeners_[callee.listeners[i]]; if(listener){listener.call(this,event);}}");
_57.listeners=[];
_54[_55]=_57;
_57.global=this;
if(_58){
_57.listeners.push(_dojoIEListeners_.push(_58)-1);
}
}
var _59;
_57.listeners.push(_59=(_57.global._dojoIEListeners_.push(_56)-1));
return new _4f(_59);
}
return _1.after(_54,_55,_56,true);
};
var _4e=function(evt){
evt.keyChar=evt.charCode?String.fromCharCode(evt.charCode):"";
evt.charOrCode=evt.keyChar||evt.keyCode;
};
var _4c=function(){
this.cancelBubble=true;
};
var _4d=on._preventDefault=function(){
this.bubbledKeyCode=this.keyCode;
if(this.ctrlKey){
try{
this.keyCode=0;
}
catch(e){
}
}
this.defaultPrevented=true;
this.returnValue=false;
this.modified=true;
};
}
if(_3("touch")){
var _5a=function(){
};
var _5b=window.orientation;
var _28=function(_5c){
return function(_5d){
var _5e=_5d.corrected;
if(!_5e){
var _5f=_5d.type;
try{
delete _5d.type;
}
catch(e){
}
if(_5d.type){
if(_3("mozilla")){
var _5e={};
for(var _60 in _5d){
_5e[_60]=_5d[_60];
}
}else{
_5a.prototype=_5d;
var _5e=new _5a;
}
_5e.preventDefault=function(){
_5d.preventDefault();
};
_5e.stopPropagation=function(){
_5d.stopPropagation();
};
}else{
_5e=_5d;
_5e.type=_5f;
}
_5d.corrected=_5e;
if(_5f=="resize"){
if(_5b==window.orientation){
return null;
}
_5b=window.orientation;
_5e.type="orientationchange";
return _5c.call(this,_5e);
}
if(!("rotation" in _5e)){
_5e.rotation=0;
_5e.scale=1;
}
var _61=_5e.changedTouches[0];
for(var i in _61){
delete _5e[i];
_5e[i]=_61[i];
}
}
return _5c.call(this,_5e);
};
};
}
return on;
});
