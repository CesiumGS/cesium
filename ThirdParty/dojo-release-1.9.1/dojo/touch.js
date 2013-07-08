/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/touch",["./_base/kernel","./aspect","./dom","./dom-class","./_base/lang","./on","./has","./mouse","./domReady","./_base/window"],function(_1,_2,_3,_4,_5,on,_6,_7,_8,_9){
var _a=_6("touch");
var _b=_6("ios")<5;
var _c=navigator.msPointerEnabled;
var _d,_e,_f,_10,_11,_12,_13,_14;
var _15;
function _16(_17,_18,_19){
if(_c&&_19){
return function(_1a,_1b){
return on(_1a,_19,_1b);
};
}else{
if(_a){
return function(_1c,_1d){
var _1e=on(_1c,_18,_1d),_1f=on(_1c,_17,function(evt){
if(!_15||(new Date()).getTime()>_15+1000){
_1d.call(this,evt);
}
});
return {remove:function(){
_1e.remove();
_1f.remove();
}};
};
}else{
return function(_20,_21){
return on(_20,_17,_21);
};
}
}
};
function _22(_23){
do{
if(_23.dojoClick){
return _23.dojoClick;
}
}while(_23=_23.parentNode);
};
function _24(e,_25,_26){
_e=!e.target.disabled&&_22(e.target);
if(_e){
_f=e.target;
_10=e.touches?e.touches[0].pageX:e.clientX;
_11=e.touches?e.touches[0].pageY:e.clientY;
_12=(typeof _e=="object"?_e.x:(typeof _e=="number"?_e:0))||4;
_13=(typeof _e=="object"?_e.y:(typeof _e=="number"?_e:0))||4;
if(!_d){
_d=true;
_9.doc.addEventListener(_25,function(e){
_e=_e&&e.target==_f&&Math.abs((e.touches?e.touches[0].pageX:e.clientX)-_10)<=_12&&Math.abs((e.touches?e.touches[0].pageY:e.clientY)-_11)<=_13;
},true);
_9.doc.addEventListener(_26,function(e){
if(_e){
_14=(new Date()).getTime();
var _27=e.target;
if(_27.tagName==="LABEL"){
_27=_3.byId(_27.getAttribute("for"))||_27;
}
setTimeout(function(){
on.emit(_27,"click",{bubbles:true,cancelable:true,_dojo_click:true});
});
}
},true);
function _28(_29){
_9.doc.addEventListener(_29,function(e){
if(!e._dojo_click&&(new Date()).getTime()<=_14+1000&&!(e.target.tagName=="INPUT"&&_4.contains(e.target,"dijitOffScreen"))){
e.stopPropagation();
e.stopImmediatePropagation&&e.stopImmediatePropagation();
if(_29=="click"&&(e.target.tagName!="INPUT"||e.target.type=="radio"||e.target.type=="checkbox")&&e.target.tagName!="TEXTAREA"&&e.target.tagName!="AUDIO"&&e.target.tagName!="VIDEO"){
e.preventDefault();
}
}
},true);
};
_28("click");
_28("mousedown");
_28("mouseup");
}
}
};
var _2a;
if(_a){
if(_c){
_8(function(){
_9.doc.addEventListener("MSPointerDown",function(evt){
_24(evt,"MSPointerMove","MSPointerUp");
},true);
});
}else{
_8(function(){
_2a=_9.body();
_9.doc.addEventListener("touchstart",function(evt){
_15=(new Date()).getTime();
var _2b=_2a;
_2a=evt.target;
on.emit(_2b,"dojotouchout",{relatedTarget:_2a,bubbles:true});
on.emit(_2a,"dojotouchover",{relatedTarget:_2b,bubbles:true});
_24(evt,"touchmove","touchend");
},true);
function _2c(evt){
var _2d=_5.delegate(evt,{bubbles:true});
if(_6("ios")>=6){
_2d.touches=evt.touches;
_2d.altKey=evt.altKey;
_2d.changedTouches=evt.changedTouches;
_2d.ctrlKey=evt.ctrlKey;
_2d.metaKey=evt.metaKey;
_2d.shiftKey=evt.shiftKey;
_2d.targetTouches=evt.targetTouches;
}
return _2d;
};
on(_9.doc,"touchmove",function(evt){
_15=(new Date()).getTime();
var _2e=_9.doc.elementFromPoint(evt.pageX-(_b?0:_9.global.pageXOffset),evt.pageY-(_b?0:_9.global.pageYOffset));
if(_2e){
if(_2a!==_2e){
on.emit(_2a,"dojotouchout",{relatedTarget:_2e,bubbles:true});
on.emit(_2e,"dojotouchover",{relatedTarget:_2a,bubbles:true});
_2a=_2e;
}
on.emit(_2e,"dojotouchmove",_2c(evt));
}
});
on(_9.doc,"touchend",function(evt){
_15=(new Date()).getTime();
var _2f=_9.doc.elementFromPoint(evt.pageX-(_b?0:_9.global.pageXOffset),evt.pageY-(_b?0:_9.global.pageYOffset))||_9.body();
on.emit(_2f,"dojotouchend",_2c(evt));
});
});
}
}
var _30={press:_16("mousedown","touchstart","MSPointerDown"),move:_16("mousemove","dojotouchmove","MSPointerMove"),release:_16("mouseup","dojotouchend","MSPointerUp"),cancel:_16(_7.leave,"touchcancel",_a?"MSPointerCancel":null),over:_16("mouseover","dojotouchover","MSPointerOver"),out:_16("mouseout","dojotouchout","MSPointerOut"),enter:_7._eventHandler(_16("mouseover","dojotouchover","MSPointerOver")),leave:_7._eventHandler(_16("mouseout","dojotouchout","MSPointerOut"))};
1&&(_1.touch=_30);
return _30;
});
