/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/promise/Promise",["../_base/lang"],function(_1){
"use strict";
function _2(){
throw new TypeError("abstract");
};
return _1.extend(function Promise(){
},{then:function(_3,_4,_5){
_2();
},cancel:function(_6,_7){
_2();
},isResolved:function(){
_2();
},isRejected:function(){
_2();
},isFulfilled:function(){
_2();
},isCanceled:function(){
_2();
},always:function(_8){
return this.then(_8,_8);
},otherwise:function(_9){
return this.then(null,_9);
},trace:function(){
return this;
},traceRejected:function(){
return this;
},toString:function(){
return "[object Promise]";
}});
});
