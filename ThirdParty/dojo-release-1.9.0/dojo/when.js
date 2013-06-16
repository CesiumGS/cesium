/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/when",["./Deferred","./promise/Promise"],function(_1,_2){
"use strict";
return function when(_3,_4,_5,_6){
var _7=_3&&typeof _3.then==="function";
var _8=_7&&_3 instanceof _2;
if(!_7){
if(arguments.length>1){
return _4?_4(_3):_3;
}else{
return new _1().resolve(_3);
}
}else{
if(!_8){
var _9=new _1(_3.cancel);
_3.then(_9.resolve,_9.reject,_9.progress);
_3=_9.promise;
}
}
if(_4||_5||_6){
return _3.then(_4,_5,_6);
}
return _3;
};
});
