/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/DeferredList",["./_base/kernel","./_base/Deferred","./_base/array"],function(_1,_2,_3){
_1.DeferredList=function(_4,_5,_6,_7,_8){
var _9=[];
_2.call(this);
var _a=this;
if(_4.length===0&&!_5){
this.resolve([0,[]]);
}
var _b=0;
_3.forEach(_4,function(_c,i){
_c.then(function(_d){
if(_5){
_a.resolve([i,_d]);
}else{
_e(true,_d);
}
},function(_f){
if(_6){
_a.reject(_f);
}else{
_e(false,_f);
}
if(_7){
return null;
}
throw _f;
});
function _e(_10,_11){
_9[i]=[_10,_11];
_b++;
if(_b===_4.length){
_a.resolve(_9);
}
};
});
};
_1.DeferredList.prototype=new _2();
_1.DeferredList.prototype.gatherResults=function(_12){
var d=new _1.DeferredList(_12,false,true,false);
d.addCallback(function(_13){
var ret=[];
_3.forEach(_13,function(_14){
ret.push(_14[1]);
});
return ret;
});
return d;
};
return _1.DeferredList;
});
