/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app._event"]){
dojo._hasResource["dojox.mobile.app._event"]=true;
dojo.provide("dojox.mobile.app._event");
dojo.experimental("dojox.mobile.app._event.js");
dojo.mixin(dojox.mobile.app,{eventMap:{},connectFlick:function(_1,_2,_3){
var _4;
var _5;
var _6=false;
var _7;
var _8;
var _9;
var _a;
var _b;
var _c;
var _d=dojo.connect("onmousedown",_1,function(_e){
_6=false;
_4=_e.targetTouches?_e.targetTouches[0].clientX:_e.clientX;
_5=_e.targetTouches?_e.targetTouches[0].clientY:_e.clientY;
_c=(new Date()).getTime();
_9=dojo.connect(_1,"onmousemove",_f);
_a=dojo.connect(_1,"onmouseup",_10);
});
var _f=function(_11){
dojo.stopEvent(_11);
_7=_11.targetTouches?_11.targetTouches[0].clientX:_11.clientX;
_8=_11.targetTouches?_11.targetTouches[0].clientY:_11.clientY;
if(Math.abs(Math.abs(_7)-Math.abs(_4))>15){
_6=true;
_b=(_7>_4)?"ltr":"rtl";
}else{
if(Math.abs(Math.abs(_8)-Math.abs(_5))>15){
_6=true;
_b=(_8>_5)?"ttb":"btt";
}
}
};
var _10=function(_12){
dojo.stopEvent(_12);
_9&&dojo.disconnect(_9);
_a&&dojo.disconnect(_a);
if(_6){
var _13={target:_1,direction:_b,duration:(new Date()).getTime()-_c};
if(_2&&_3){
_2[_3](_13);
}else{
_3(_13);
}
}
};
}});
dojox.mobile.app.isIPhone=(dojo.isSafari&&(navigator.userAgent.indexOf("iPhone")>-1||navigator.userAgent.indexOf("iPod")>-1));
dojox.mobile.app.isWebOS=(navigator.userAgent.indexOf("webOS")>-1);
dojox.mobile.app.isAndroid=(navigator.userAgent.toLowerCase().indexOf("android")>-1);
if(dojox.mobile.app.isIPhone||dojox.mobile.app.isAndroid){
dojox.mobile.app.eventMap={onmousedown:"ontouchstart",mousedown:"ontouchstart",onmouseup:"ontouchend",mouseup:"ontouchend",onmousemove:"ontouchmove",mousemove:"ontouchmove"};
}
dojo._oldConnect=dojo._connect;
dojo._connect=function(obj,_14,_15,_16,_17){
_14=dojox.mobile.app.eventMap[_14]||_14;
if(_14=="flick"||_14=="onflick"){
if(dojo.global["Mojo"]){
_14=Mojo.Event.flick;
}else{
return dojox.mobile.app.connectFlick(obj,_15,_16);
}
}
return dojo._oldConnect(obj,_14,_15,_16,_17);
};
}
