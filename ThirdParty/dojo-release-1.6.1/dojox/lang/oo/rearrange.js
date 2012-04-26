/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.oo.rearrange"]){
dojo._hasResource["dojox.lang.oo.rearrange"]=true;
dojo.provide("dojox.lang.oo.rearrange");
(function(){
var _1=dojo._extraNames,_2=_1.length,_3=Object.prototype.toString,_4={};
dojox.lang.oo.rearrange=function(_5,_6){
var _7,_8,_9,i,t;
for(_7 in _6){
_8=_6[_7];
if(!_8||_3.call(_8)=="[object String]"){
_9=_5[_7];
if(!(_7 in _4)||_4[_7]!==_9){
if(!(delete _5[_7])){
_5[_7]=undefined;
}
if(_8){
_5[_8]=_9;
}
}
}
}
if(_2){
for(i=0;i<_2;++i){
_7=_1[i];
_8=_6[_7];
if(!_8||_3.call(_8)=="[object String]"){
_9=_5[_7];
if(!(_7 in _4)||_4[_7]!==_9){
if(!(delete _5[_7])){
_5[_7]=undefined;
}
if(_8){
_5[_8]=_9;
}
}
}
}
}
return _5;
};
})();
}
