/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.oo.mixin"]){
dojo._hasResource["dojox.lang.oo.mixin"]=true;
dojo.provide("dojox.lang.oo.mixin");
dojo.experimental("dojox.lang.oo.mixin");
dojo.require("dojox.lang.oo.Filter");
dojo.require("dojox.lang.oo.Decorator");
(function(){
var oo=dojox.lang.oo,_1=oo.Filter,_2=oo.Decorator,_3={},_4=function(_5){
return _5;
},_6=function(_7,_8,_9){
return _8;
},_a=function(_b,_c,_d,_e){
_b[_c]=_d;
},_f={},_10=dojo._extraNames,_11=_10.length,_12=oo.applyDecorator=function(_13,_14,_15,_16){
if(_15 instanceof _2){
var d=_15.decorator;
_15=_12(_13,_14,_15.value,_16);
return d(_14,_15,_16);
}
return _13(_14,_15,_16);
};
oo.__mixin=function(_17,_18,_19,_1a,_1b){
var _1c,_1d,_1e,_1f,_20,i;
for(_1c in _18){
_1e=_18[_1c];
if(!(_1c in _3)||_3[_1c]!==_1e){
_1d=_1a(_1c,_17,_18,_1e);
if(_1d&&(!(_1d in _17)||!(_1d in _3)||_3[_1d]!==_1e)){
_20=_17[_1d];
_1f=_12(_19,_1d,_1e,_20);
if(_20!==_1f){
_1b(_17,_1d,_1f,_20);
}
}
}
}
if(_11){
for(i=0;i<_11;++i){
_1c=_10[i];
_1e=_18[_1c];
if(!(_1c in _3)||_3[_1c]!==_1e){
_1d=_1a(_1c,_17,_18,_1e);
if(_1d&&(!(_1d in _17)||!(_1d in _3)||_3[_1d]!==_1e)){
_20=_17[_1d];
_1f=_12(_19,_1d,_1e,_20);
if(_20!==_1f){
_1b(_17,_1d,_1f,_20);
}
}
}
}
}
return _17;
};
oo.mixin=function(_21,_22){
var _23,_24,i=1,l=arguments.length;
for(;i<l;++i){
_22=arguments[i];
if(_22 instanceof _1){
_24=_22.filter;
_22=_22.bag;
}else{
_24=_4;
}
if(_22 instanceof _2){
_23=_22.decorator;
_22=_22.value;
}else{
_23=_6;
}
oo.__mixin(_21,_22,_23,_24,_a);
}
return _21;
};
})();
}
