/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/TimedMoveable",["../_base/declare","./Moveable"],function(_1,_2){
var _3=_2.prototype.onMove;
return _1("dojo.dnd.TimedMoveable",_2,{timeout:40,constructor:function(_4,_5){
if(!_5){
_5={};
}
if(_5.timeout&&typeof _5.timeout=="number"&&_5.timeout>=0){
this.timeout=_5.timeout;
}
},onMoveStop:function(_6){
if(_6._timer){
clearTimeout(_6._timer);
_3.call(this,_6,_6._leftTop);
}
_2.prototype.onMoveStop.apply(this,arguments);
},onMove:function(_7,_8){
_7._leftTop=_8;
if(!_7._timer){
var _9=this;
_7._timer=setTimeout(function(){
_7._timer=null;
_3.call(_9,_7,_7._leftTop);
},this.timeout);
}
}});
});
