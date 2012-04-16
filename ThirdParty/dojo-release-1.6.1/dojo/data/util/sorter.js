/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.data.util.sorter"]){
dojo._hasResource["dojo.data.util.sorter"]=true;
dojo.provide("dojo.data.util.sorter");
dojo.getObject("data.util.sorter",true,dojo);
dojo.data.util.sorter.basicComparator=function(a,b){
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
dojo.data.util.sorter.createSortFunction=function(_1,_2){
var _3=[];
function _4(_5,_6,_7,s){
return function(_8,_9){
var a=s.getValue(_8,_5);
var b=s.getValue(_9,_5);
return _6*_7(a,b);
};
};
var _a;
var _b=_2.comparatorMap;
var bc=dojo.data.util.sorter.basicComparator;
for(var i=0;i<_1.length;i++){
_a=_1[i];
var _c=_a.attribute;
if(_c){
var _d=(_a.descending)?-1:1;
var _e=bc;
if(_b){
if(typeof _c!=="string"&&("toString" in _c)){
_c=_c.toString();
}
_e=_b[_c]||bc;
}
_3.push(_4(_c,_d,_e,_2));
}
}
return function(_f,_10){
var i=0;
while(i<_3.length){
var ret=_3[i++](_f,_10);
if(ret!==0){
return ret;
}
}
return 0;
};
};
}
