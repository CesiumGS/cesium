/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/NodeList-data",["./_base/kernel","./query","./_base/lang","./_base/array","./dom-attr"],function(_1,_2,_3,_4,_5){
var _6=_2.NodeList;
var _7={},x=0,_8="data-dojo-dataid",_9=function(_a){
var _b=_5.get(_a,_8);
if(!_b){
_b="pid"+(x++);
_5.set(_a,_8,_b);
}
return _b;
};
var _c=_1._nodeData=function(_d,_e,_f){
var pid=_9(_d),r;
if(!_7[pid]){
_7[pid]={};
}
if(arguments.length==1){
r=_7[pid];
}
if(typeof _e=="string"){
if(arguments.length>2){
_7[pid][_e]=_f;
}else{
r=_7[pid][_e];
}
}else{
r=_3.mixin(_7[pid],_e);
}
return r;
};
var _10=_1._removeNodeData=function(_11,key){
var pid=_9(_11);
if(_7[pid]){
if(key){
delete _7[pid][key];
}else{
delete _7[pid];
}
}
};
_6._gcNodeData=_1._gcNodeData=function(){
var _12=_2("["+_8+"]").map(_9);
for(var i in _7){
if(_4.indexOf(_12,i)<0){
delete _7[i];
}
}
};
_3.extend(_6,{data:_6._adaptWithCondition(_c,function(a){
return a.length===0||a.length==1&&(typeof a[0]=="string");
}),removeData:_6._adaptAsForEach(_10)});
return _6;
});
