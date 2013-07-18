/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/util/simpleFetch",["../../_base/lang","../../_base/kernel","./sorter"],function(_1,_2,_3){
var _4={};
_1.setObject("dojo.data.util.simpleFetch",_4);
_4.errorHandler=function(_5,_6){
if(_6.onError){
var _7=_6.scope||_2.global;
_6.onError.call(_7,_5,_6);
}
};
_4.fetchHandler=function(_8,_9){
var _a=_9.abort||null,_b=false,_c=_9.start?_9.start:0,_d=(_9.count&&(_9.count!==Infinity))?(_c+_9.count):_8.length;
_9.abort=function(){
_b=true;
if(_a){
_a.call(_9);
}
};
var _e=_9.scope||_2.global;
if(!_9.store){
_9.store=this;
}
if(_9.onBegin){
_9.onBegin.call(_e,_8.length,_9);
}
if(_9.sort){
_8.sort(_3.createSortFunction(_9.sort,this));
}
if(_9.onItem){
for(var i=_c;(i<_8.length)&&(i<_d);++i){
var _f=_8[i];
if(!_b){
_9.onItem.call(_e,_f,_9);
}
}
}
if(_9.onComplete&&!_b){
var _10=null;
if(!_9.onItem){
_10=_8.slice(_c,_d);
}
_9.onComplete.call(_e,_10,_9);
}
};
_4.fetch=function(_11){
_11=_11||{};
if(!_11.store){
_11.store=this;
}
this._fetchItems(_11,_1.hitch(this,"fetchHandler"),_1.hitch(this,"errorHandler"));
return _11;
};
return _4;
});
