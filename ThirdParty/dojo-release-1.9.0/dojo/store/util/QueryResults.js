/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/store/util/QueryResults",["../../_base/array","../../_base/lang","../../when"],function(_1,_2,_3){
var _4=function(_5){
if(!_5){
return _5;
}
if(_5.then){
_5=_2.delegate(_5);
}
function _6(_7){
if(!_5[_7]){
_5[_7]=function(){
var _8=arguments;
return _3(_5,function(_9){
Array.prototype.unshift.call(_8,_9);
return _4(_1[_7].apply(_1,_8));
});
};
}
};
_6("forEach");
_6("filter");
_6("map");
if(!_5.total){
_5.total=_3(_5,function(_a){
return _a.length;
});
}
return _5;
};
_2.setObject("dojo.store.util.QueryResults",_4);
return _4;
});
