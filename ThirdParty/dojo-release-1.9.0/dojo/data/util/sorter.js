/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/util/sorter",["../../_base/lang"],function(_1){
var _2={};
_1.setObject("dojo.data.util.sorter",_2);
_2.basicComparator=function(a,b){
var r=-1;
if(a===null){
a=undefined;
}
if(b===null){
b=undefined;
}
if(a==b){
r=0;
}else{
if(a>b||a==null){
r=1;
}
}
return r;
};
_2.createSortFunction=function(_3,_4){
var _5=[];
function _6(_7,_8,_9,s){
return function(_a,_b){
var a=s.getValue(_a,_7);
var b=s.getValue(_b,_7);
return _8*_9(a,b);
};
};
var _c;
var _d=_4.comparatorMap;
var bc=_2.basicComparator;
for(var i=0;i<_3.length;i++){
_c=_3[i];
var _e=_c.attribute;
if(_e){
var _f=(_c.descending)?-1:1;
var _10=bc;
if(_d){
if(typeof _e!=="string"&&("toString" in _e)){
_e=_e.toString();
}
_10=_d[_e]||bc;
}
_5.push(_6(_e,_f,_10,_4));
}
}
return function(_11,_12){
var i=0;
while(i<_5.length){
var ret=_5[i++](_11,_12);
if(ret!==0){
return ret;
}
}
return 0;
};
};
return _2;
});
