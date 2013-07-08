/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/array",["./kernel","../has","./lang"],function(_1,_2,_3){
var _4={},u;
function _5(fn){
return _4[fn]=new Function("item","index","array",fn);
};
function _6(_7){
var _8=!_7;
return function(a,fn,o){
var i=0,l=a&&a.length||0,_9;
if(l&&typeof a=="string"){
a=a.split("");
}
if(typeof fn=="string"){
fn=_4[fn]||_5(fn);
}
if(o){
for(;i<l;++i){
_9=!fn.call(o,a[i],i,a);
if(_7^_9){
return !_9;
}
}
}else{
for(;i<l;++i){
_9=!fn(a[i],i,a);
if(_7^_9){
return !_9;
}
}
}
return _8;
};
};
function _a(up){
var _b=1,_c=0,_d=0;
if(!up){
_b=_c=_d=-1;
}
return function(a,x,_e,_f){
if(_f&&_b>0){
return _10.lastIndexOf(a,x,_e);
}
var l=a&&a.length||0,end=up?l+_d:_c,i;
if(_e===u){
i=up?_c:l+_d;
}else{
if(_e<0){
i=l+_e;
if(i<0){
i=_c;
}
}else{
i=_e>=l?l+_d:_e;
}
}
if(l&&typeof a=="string"){
a=a.split("");
}
for(;i!=end;i+=_b){
if(a[i]==x){
return i;
}
}
return -1;
};
};
var _10={every:_6(false),some:_6(true),indexOf:_a(true),lastIndexOf:_a(false),forEach:function(arr,_11,_12){
var i=0,l=arr&&arr.length||0;
if(l&&typeof arr=="string"){
arr=arr.split("");
}
if(typeof _11=="string"){
_11=_4[_11]||_5(_11);
}
if(_12){
for(;i<l;++i){
_11.call(_12,arr[i],i,arr);
}
}else{
for(;i<l;++i){
_11(arr[i],i,arr);
}
}
},map:function(arr,_13,_14,Ctr){
var i=0,l=arr&&arr.length||0,out=new (Ctr||Array)(l);
if(l&&typeof arr=="string"){
arr=arr.split("");
}
if(typeof _13=="string"){
_13=_4[_13]||_5(_13);
}
if(_14){
for(;i<l;++i){
out[i]=_13.call(_14,arr[i],i,arr);
}
}else{
for(;i<l;++i){
out[i]=_13(arr[i],i,arr);
}
}
return out;
},filter:function(arr,_15,_16){
var i=0,l=arr&&arr.length||0,out=[],_17;
if(l&&typeof arr=="string"){
arr=arr.split("");
}
if(typeof _15=="string"){
_15=_4[_15]||_5(_15);
}
if(_16){
for(;i<l;++i){
_17=arr[i];
if(_15.call(_16,_17,i,arr)){
out.push(_17);
}
}
}else{
for(;i<l;++i){
_17=arr[i];
if(_15(_17,i,arr)){
out.push(_17);
}
}
}
return out;
},clearCache:function(){
_4={};
}};
1&&_3.mixin(_1,_10);
return _10;
});
