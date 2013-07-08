/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/errors/create",["../_base/lang"],function(_1){
return function(_2,_3,_4,_5){
_4=_4||Error;
var _6=function(_7){
if(_4===Error){
if(Error.captureStackTrace){
Error.captureStackTrace(this,_6);
}
var _8=Error.call(this,_7),_9;
for(_9 in _8){
if(_8.hasOwnProperty(_9)){
this[_9]=_8[_9];
}
}
this.message=_7;
this.stack=_8.stack;
}else{
_4.apply(this,arguments);
}
if(_3){
_3.apply(this,arguments);
}
};
_6.prototype=_1.delegate(_4.prototype,_5);
_6.prototype.name=_2;
_6.prototype.constructor=_6;
return _6;
};
});
