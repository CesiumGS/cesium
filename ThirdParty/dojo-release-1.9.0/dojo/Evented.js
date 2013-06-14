/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/Evented",["./aspect","./on"],function(_1,on){
"use strict";
var _2=_1.after;
function _3(){
};
_3.prototype={on:function(_4,_5){
return on.parse(this,_4,_5,function(_6,_7){
return _2(_6,"on"+_7,_5,true);
});
},emit:function(_8,_9){
var _a=[this];
_a.push.apply(_a,arguments);
return on.emit.apply(on,_a);
}};
return _3;
});
