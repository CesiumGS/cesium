/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/notify",["../Evented","../_base/lang","./util"],function(_1,_2,_3){
var _4=0,_5=[].slice;
var _6=_2.mixin(new _1,{onsend:function(_7){
if(!_4){
this.emit("start");
}
_4++;
},_onload:function(_8){
this.emit("done",_8);
},_onerror:function(_9){
this.emit("done",_9);
},_ondone:function(_a){
if(--_4<=0){
_4=0;
this.emit("stop");
}
},emit:function(_b,_c){
var _d=_1.prototype.emit.apply(this,arguments);
if(this["_on"+_b]){
this["_on"+_b].apply(this,_5.call(arguments,1));
}
return _d;
}});
function _e(_f,_10){
return _6.on(_f,_10);
};
_e.emit=function(_11,_12,_13){
return _6.emit(_11,_12,_13);
};
return _3.notify=_e;
});
