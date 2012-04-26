/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.store.util.QueryResults"]){
dojo._hasResource["dojo.store.util.QueryResults"]=true;
dojo.provide("dojo.store.util.QueryResults");
dojo.getObject("store.util",true,dojo);
dojo.store.util.QueryResults=function(_1){
if(!_1){
return _1;
}
if(_1.then){
_1=dojo.delegate(_1);
}
function _2(_3){
if(!_1[_3]){
_1[_3]=function(){
var _4=arguments;
return dojo.when(_1,function(_5){
Array.prototype.unshift.call(_4,_5);
return dojo.store.util.QueryResults(dojo[_3].apply(dojo,_4));
});
};
}
};
_2("forEach");
_2("filter");
_2("map");
if(!_1.total){
_1.total=dojo.when(_1,function(_6){
return _6.length;
});
}
return _1;
};
}
