/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/behavior",["./_base/kernel","./_base/lang","./_base/array","./_base/connect","./query","./domReady"],function(_1,_2,_3,_4,_5,_6){
_1.deprecated("dojo.behavior","Use dojo/on with event delegation (on.selector())");
var _7=function(){
function _8(_9,_a){
if(!_9[_a]){
_9[_a]=[];
}
return _9[_a];
};
var _b=0;
function _c(_d,_e,_f){
var _10={};
for(var x in _d){
if(typeof _10[x]=="undefined"){
if(!_f){
_e(_d[x],x);
}else{
_f.call(_e,_d[x],x);
}
}
}
};
this._behaviors={};
this.add=function(_11){
_c(_11,this,function(_12,_13){
var _14=_8(this._behaviors,_13);
if(typeof _14["id"]!="number"){
_14.id=_b++;
}
var _15=[];
_14.push(_15);
if((_2.isString(_12))||(_2.isFunction(_12))){
_12={found:_12};
}
_c(_12,function(_16,_17){
_8(_15,_17).push(_16);
});
});
};
var _18=function(_19,_1a,_1b){
if(_2.isString(_1a)){
if(_1b=="found"){
_4.publish(_1a,[_19]);
}else{
_4.connect(_19,_1b,function(){
_4.publish(_1a,arguments);
});
}
}else{
if(_2.isFunction(_1a)){
if(_1b=="found"){
_1a(_19);
}else{
_4.connect(_19,_1b,_1a);
}
}
}
};
this.apply=function(){
_c(this._behaviors,function(_1c,id){
_5(id).forEach(function(_1d){
var _1e=0;
var bid="_dj_behavior_"+_1c.id;
if(typeof _1d[bid]=="number"){
_1e=_1d[bid];
if(_1e==(_1c.length)){
return;
}
}
for(var x=_1e,_1f;_1f=_1c[x];x++){
_c(_1f,function(_20,_21){
if(_2.isArray(_20)){
_3.forEach(_20,function(_22){
_18(_1d,_22,_21);
});
}
});
}
_1d[bid]=_1c.length;
});
});
};
};
_1.behavior=new _7();
_6(function(){
_1.behavior.apply();
});
return _1.behavior;
});
