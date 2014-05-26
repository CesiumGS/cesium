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
var _6=!!_5.then;
if(_6){
_5=_2.delegate(_5);
}
function _7(_8){
_5[_8]=function(){
var _9=arguments;
var _a=_3(_5,function(_b){
Array.prototype.unshift.call(_9,_b);
return _4(_1[_8].apply(_1,_9));
});
if(_8!=="forEach"||_6){
return _a;
}
};
};
_7("forEach");
_7("filter");
_7("map");
if(_5.total==null){
_5.total=_3(_5,function(_c){
return _c.length;
});
}
return _5;
};
_2.setObject("dojo.store.util.QueryResults",_4);
return _4;
});
