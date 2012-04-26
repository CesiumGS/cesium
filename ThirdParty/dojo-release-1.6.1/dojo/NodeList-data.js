/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.NodeList-data"]){
dojo._hasResource["dojo.NodeList-data"]=true;
dojo.provide("dojo.NodeList-data");
(function(d){
var _1={},x=0,_2="data-dojo-dataid",nl=d.NodeList,_3=function(_4){
var _5=d.attr(_4,_2);
if(!_5){
_5="pid"+(x++);
d.attr(_4,_2,_5);
}
return _5;
};
var _6=d._nodeData=function(_7,_8,_9){
var _a=_3(_7),r;
if(!_1[_a]){
_1[_a]={};
}
if(arguments.length==1){
r=_1[_a];
}
if(typeof _8=="string"){
if(arguments.length>2){
_1[_a][_8]=_9;
}else{
r=_1[_a][_8];
}
}else{
r=d._mixin(_1[_a],_8);
}
return r;
};
var _b=d._removeNodeData=function(_c,_d){
var _e=_3(_c);
if(_1[_e]){
if(_d){
delete _1[_e][_d];
}else{
delete _1[_e];
}
}
};
d._gcNodeData=function(){
var _f=dojo.query("["+_2+"]").map(_3);
for(var i in _1){
if(dojo.indexOf(_f,i)<0){
delete _1[i];
}
}
};
d.extend(nl,{data:nl._adaptWithCondition(_6,function(a){
return a.length===0||a.length==1&&(typeof a[0]=="string");
}),removeData:nl._adaptAsForEach(_b)});
})(dojo);
}
