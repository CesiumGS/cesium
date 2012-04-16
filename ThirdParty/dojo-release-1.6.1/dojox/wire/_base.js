/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire._base"]){
dojo._hasResource["dojox.wire._base"]=true;
dojo.provide("dojox.wire._base");
dojox.wire._defaultWireClass="dojox.wire.Wire";
dojox.wire._wireClasses={"attribute":"dojox.wire.DataWire","path":"dojox.wire.XmlWire","children":"dojox.wire.CompositeWire","columns":"dojox.wire.TableAdapter","nodes":"dojox.wire.TreeAdapter","segments":"dojox.wire.TextAdapter"};
dojox.wire.register=function(_1,_2){
if(!_1||!_2){
return;
}
if(dojox.wire._wireClasses[_2]){
return;
}
dojox.wire._wireClasses[_2]=_1;
};
dojox.wire._getClass=function(_3){
dojo["require"](_3);
return dojo.getObject(_3);
};
dojox.wire.create=function(_4){
if(!_4){
_4={};
}
var _5=_4.wireClass;
if(_5){
if(dojo.isString(_5)){
_5=dojox.wire._getClass(_5);
}
}else{
for(var _6 in _4){
if(!_4[_6]){
continue;
}
_5=dojox.wire._wireClasses[_6];
if(_5){
if(dojo.isString(_5)){
_5=dojox.wire._getClass(_5);
dojox.wire._wireClasses[_6]=_5;
}
break;
}
}
}
if(!_5){
if(dojo.isString(dojox.wire._defaultWireClass)){
dojox.wire._defaultWireClass=dojox.wire._getClass(dojox.wire._defaultWireClass);
}
_5=dojox.wire._defaultWireClass;
}
return new _5(_4);
};
dojox.wire.isWire=function(_7){
return (_7&&_7._wireClass);
};
dojox.wire.transfer=function(_8,_9,_a,_b){
if(!_8||!_9){
return;
}
if(!dojox.wire.isWire(_8)){
_8=dojox.wire.create(_8);
}
if(!dojox.wire.isWire(_9)){
_9=dojox.wire.create(_9);
}
var _c=_8.getValue(_a);
_9.setValue(_c,(_b||_a));
};
dojox.wire.connect=function(_d,_e,_f){
if(!_d||!_e||!_f){
return;
}
var _10={topic:_d.topic};
if(_d.topic){
_10.handle=dojo.subscribe(_d.topic,function(){
dojox.wire.transfer(_e,_f,arguments);
});
}else{
if(_d.event){
_10.handle=dojo.connect(_d.scope,_d.event,function(){
dojox.wire.transfer(_e,_f,arguments);
});
}
}
return _10;
};
dojox.wire.disconnect=function(_11){
if(!_11||!_11.handle){
return;
}
if(_11.topic){
dojo.unsubscribe(_11.handle);
}else{
dojo.disconnect(_11.handle);
}
};
}
