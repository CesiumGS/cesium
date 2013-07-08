/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/promise/tracer",["../_base/lang","./Promise","../Evented"],function(_1,_2,_3){
"use strict";
var _4=new _3;
var _5=_4.emit;
_4.emit=null;
function _6(_7){
setTimeout(function(){
_5.apply(_4,_7);
},0);
};
_2.prototype.trace=function(){
var _8=_1._toArray(arguments);
this.then(function(_9){
_6(["resolved",_9].concat(_8));
},function(_a){
_6(["rejected",_a].concat(_8));
},function(_b){
_6(["progress",_b].concat(_8));
});
return this;
};
_2.prototype.traceRejected=function(){
var _c=_1._toArray(arguments);
this.otherwise(function(_d){
_6(["rejected",_d].concat(_c));
});
return this;
};
return _4;
});
