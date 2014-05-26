/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/touch",["./_base/kernel","./aspect","./dom","./dom-class","./_base/lang","./on","./has","./mouse","./domReady","./_base/window"],function(_1,_2,_3,_4,_5,on,_6,_7,_8,_9){
var _a=_6("touch");
var _b=_6("ios")<5;
var _c=navigator.pointerEnabled||navigator.msPointerEnabled,_d=(function(){
var _e={};
for(var _f in {down:1,move:1,up:1,cancel:1,over:1,out:1}){
_e[_f]=!navigator.pointerEnabled?"MSPointer"+_f.charAt(0).toUpperCase()+_f.slice(1):"pointer"+_f;
}
return _e;
})();
var _10,_11,_12,_13,_14,_15,_16,_17;
var _18;
function _19(_1a,_1b,_1c){
if(_c&&_1c){
return function(_1d,_1e){
return on(_1d,_1c,_1e);
};
}else{
if(_a){
return function(_1f,_20){
var _21=on(_1f,_1b,_20),_22=on(_1f,_1a,function(evt){
if(!_18||(new Date()).getTime()>_18+1000){
_20.call(this,evt);
}
});
return {remove:function(){
_21.remove();
_22.remove();
}};
};
}else{
return function(_23,_24){
return on(_23,_1a,_24);
};
}
}
};
function _25(_26){
do{
if(_26.dojoClick!==undefined){
return _26.dojoClick;
}
}while(_26=_26.parentNode);
};
function _27(e,_28,_29){
_11=!e.target.disabled&&_25(e.target);
if(_11){
_12=e.target;
_13=e.touches?e.touches[0].pageX:e.clientX;
_14=e.touches?e.touches[0].pageY:e.clientY;
_15=(typeof _11=="object"?_11.x:(typeof _11=="number"?_11:0))||4;
_16=(typeof _11=="object"?_11.y:(typeof _11=="number"?_11:0))||4;
if(!_10){
_10=true;
_9.doc.addEventListener(_28,function(e){
_11=_11&&e.target==_12&&Math.abs((e.touches?e.touches[0].pageX:e.clientX)-_13)<=_15&&Math.abs((e.touches?e.touches[0].pageY:e.clientY)-_14)<=_16;
},true);
_9.doc.addEventListener(_29,function(e){
if(_11){
_17=(new Date()).getTime();
var _2a=e.target;
if(_2a.tagName==="LABEL"){
_2a=_3.byId(_2a.getAttribute("for"))||_2a;
}
setTimeout(function(){
on.emit(_2a,"click",{bubbles:true,cancelable:true,_dojo_click:true});
});
}
},true);
function _2b(_2c){
_9.doc.addEventListener(_2c,function(e){
if(!e._dojo_click&&(new Date()).getTime()<=_17+1000&&!(e.target.tagName=="INPUT"&&_4.contains(e.target,"dijitOffScreen"))){
e.stopPropagation();
e.stopImmediatePropagation&&e.stopImmediatePropagation();
if(_2c=="click"&&(e.target.tagName!="INPUT"||e.target.type=="radio"||e.target.type=="checkbox")&&e.target.tagName!="TEXTAREA"&&e.target.tagName!="AUDIO"&&e.target.tagName!="VIDEO"){
e.preventDefault();
}
}
},true);
};
_2b("click");
_2b("mousedown");
_2b("mouseup");
}
}
};
var _2d;
if(_a){
if(_c){
_8(function(){
_9.doc.addEventListener(_d.down,function(evt){
_27(evt,_d.move,_d.up);
},true);
});
}else{
_8(function(){
_2d=_9.body();
_9.doc.addEventListener("touchstart",function(evt){
_18=(new Date()).getTime();
var _2e=_2d;
_2d=evt.target;
on.emit(_2e,"dojotouchout",{relatedTarget:_2d,bubbles:true});
on.emit(_2d,"dojotouchover",{relatedTarget:_2e,bubbles:true});
_27(evt,"touchmove","touchend");
},true);
function _2f(evt){
var _30=_5.delegate(evt,{bubbles:true});
if(_6("ios")>=6){
_30.touches=evt.touches;
_30.altKey=evt.altKey;
_30.changedTouches=evt.changedTouches;
_30.ctrlKey=evt.ctrlKey;
_30.metaKey=evt.metaKey;
_30.shiftKey=evt.shiftKey;
_30.targetTouches=evt.targetTouches;
}
return _30;
};
on(_9.doc,"touchmove",function(evt){
_18=(new Date()).getTime();
var _31=_9.doc.elementFromPoint(evt.pageX-(_b?0:_9.global.pageXOffset),evt.pageY-(_b?0:_9.global.pageYOffset));
if(_31){
if(_2d!==_31){
on.emit(_2d,"dojotouchout",{relatedTarget:_31,bubbles:true});
on.emit(_31,"dojotouchover",{relatedTarget:_2d,bubbles:true});
_2d=_31;
}
if(!on.emit(_31,"dojotouchmove",_2f(evt))){
evt.preventDefault();
}
}
});
on(_9.doc,"touchend",function(evt){
_18=(new Date()).getTime();
var _32=_9.doc.elementFromPoint(evt.pageX-(_b?0:_9.global.pageXOffset),evt.pageY-(_b?0:_9.global.pageYOffset))||_9.body();
on.emit(_32,"dojotouchend",_2f(evt));
});
});
}
}
var _33={press:_19("mousedown","touchstart",_d.down),move:_19("mousemove","dojotouchmove",_d.move),release:_19("mouseup","dojotouchend",_d.up),cancel:_19(_7.leave,"touchcancel",_a?_d.cancel:null),over:_19("mouseover","dojotouchover",_d.over),out:_19("mouseout","dojotouchout",_d.out),enter:_7._eventHandler(_19("mouseover","dojotouchover",_d.over)),leave:_7._eventHandler(_19("mouseout","dojotouchout",_d.out))};
1&&(_1.touch=_33);
return _33;
});
