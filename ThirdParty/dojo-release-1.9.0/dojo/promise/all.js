/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/promise/all",["../_base/array","../Deferred","../when"],function(_1,_2,_3){
"use strict";
var _4=_1.some;
return function all(_5){
var _6,_1;
if(_5 instanceof Array){
_1=_5;
}else{
if(_5&&typeof _5==="object"){
_6=_5;
}
}
var _7;
var _8=[];
if(_6){
_1=[];
for(var _9 in _6){
if(Object.hasOwnProperty.call(_6,_9)){
_8.push(_9);
_1.push(_6[_9]);
}
}
_7={};
}else{
if(_1){
_7=[];
}
}
if(!_1||!_1.length){
return new _2().resolve(_7);
}
var _a=new _2();
_a.promise.always(function(){
_7=_8=null;
});
var _b=_1.length;
_4(_1,function(_c,_d){
if(!_6){
_8.push(_d);
}
_3(_c,function(_e){
if(!_a.isFulfilled()){
_7[_8[_d]]=_e;
if(--_b===0){
_a.resolve(_7);
}
}
},_a.reject);
return _a.isFulfilled();
});
return _a.promise;
};
});
