/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.array"]){
dojo._hasResource["dojo._base.array"]=true;
dojo.provide("dojo._base.array");
dojo.require("dojo._base.lang");
(function(){
var _1=function(_2,_3,cb){
return [(typeof _2=="string")?_2.split(""):_2,_3||dojo.global,(typeof cb=="string")?new Function("item","index","array",cb):cb];
};
var _4=function(_5,_6,_7,_8){
var _9=_1(_6,_8,_7);
_6=_9[0];
for(var i=0,l=_6.length;i<l;++i){
var _a=!!_9[2].call(_9[1],_6[i],i,_6);
if(_5^_a){
return _a;
}
}
return _5;
};
dojo.mixin(dojo,{indexOf:function(_b,_c,_d,_e){
var _f=1,end=_b.length||0,i=0;
if(_e){
i=end-1;
_f=end=-1;
}
if(_d!=undefined){
i=_d;
}
if((_e&&i>end)||i<end){
for(;i!=end;i+=_f){
if(_b[i]==_c){
return i;
}
}
}
return -1;
},lastIndexOf:function(_10,_11,_12){
return dojo.indexOf(_10,_11,_12,true);
},forEach:function(arr,_13,_14){
if(!arr||!arr.length){
return;
}
var _15=_1(arr,_14,_13);
arr=_15[0];
for(var i=0,l=arr.length;i<l;++i){
_15[2].call(_15[1],arr[i],i,arr);
}
},every:function(arr,_16,_17){
return _4(true,arr,_16,_17);
},some:function(arr,_18,_19){
return _4(false,arr,_18,_19);
},map:function(arr,_1a,_1b){
var _1c=_1(arr,_1b,_1a);
arr=_1c[0];
var _1d=(arguments[3]?(new arguments[3]()):[]);
for(var i=0,l=arr.length;i<l;++i){
_1d.push(_1c[2].call(_1c[1],arr[i],i,arr));
}
return _1d;
},filter:function(arr,_1e,_1f){
var _20=_1(arr,_1f,_1e);
arr=_20[0];
var _21=[];
for(var i=0,l=arr.length;i<l;++i){
if(_20[2].call(_20[1],arr[i],i,arr)){
_21.push(arr[i]);
}
}
return _21;
}});
})();
}
