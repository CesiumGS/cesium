/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/promise/first",["../_base/array","../Deferred","../when"],function(_1,_2,_3){
"use strict";
var _4=_1.forEach;
return function first(_5){
var _6;
if(_5 instanceof Array){
_6=_5;
}else{
if(_5&&typeof _5==="object"){
_6=[];
for(var _7 in _5){
if(Object.hasOwnProperty.call(_5,_7)){
_6.push(_5[_7]);
}
}
}
}
if(!_6||!_6.length){
return new _2().resolve();
}
var _8=new _2();
_4(_6,function(_9){
_3(_9,_8.resolve,_8.reject);
});
return _8.promise;
};
});
