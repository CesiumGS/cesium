/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.dnd.TimedMoveable"]){
dojo._hasResource["dojo.dnd.TimedMoveable"]=true;
dojo.provide("dojo.dnd.TimedMoveable");
dojo.require("dojo.dnd.Moveable");
(function(){
var _1=dojo.dnd.Moveable.prototype.onMove;
dojo.declare("dojo.dnd.TimedMoveable",dojo.dnd.Moveable,{timeout:40,constructor:function(_2,_3){
if(!_3){
_3={};
}
if(_3.timeout&&typeof _3.timeout=="number"&&_3.timeout>=0){
this.timeout=_3.timeout;
}
},markupFactory:function(_4,_5){
return new dojo.dnd.TimedMoveable(_5,_4);
},onMoveStop:function(_6){
if(_6._timer){
clearTimeout(_6._timer);
_1.call(this,_6,_6._leftTop);
}
dojo.dnd.Moveable.prototype.onMoveStop.apply(this,arguments);
},onMove:function(_7,_8){
_7._leftTop=_8;
if(!_7._timer){
var _9=this;
_7._timer=setTimeout(function(){
_7._timer=null;
_1.call(_9,_7,_7._leftTop);
},this.timeout);
}
}});
})();
}
