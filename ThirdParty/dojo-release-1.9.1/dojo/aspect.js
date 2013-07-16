/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/aspect",[],function(){
"use strict";
var _1,_2=0;
function _3(_4,_5,_6,_7){
var _8=_4[_5];
var _9=_5=="around";
var _a;
if(_9){
var _b=_6(function(){
return _8.advice(this,arguments);
});
_a={remove:function(){
if(_b){
_b=_4=_6=null;
}
},advice:function(_c,_d){
return _b?_b.apply(_c,_d):_8.advice(_c,_d);
}};
}else{
_a={remove:function(){
if(_a.advice){
var _e=_a.previous;
var _f=_a.next;
if(!_f&&!_e){
delete _4[_5];
}else{
if(_e){
_e.next=_f;
}else{
_4[_5]=_f;
}
if(_f){
_f.previous=_e;
}
}
_4=_6=_a.advice=null;
}
},id:_2++,advice:_6,receiveArguments:_7};
}
if(_8&&!_9){
if(_5=="after"){
while(_8.next&&(_8=_8.next)){
}
_8.next=_a;
_a.previous=_8;
}else{
if(_5=="before"){
_4[_5]=_a;
_a.next=_8;
_8.previous=_a;
}
}
}else{
_4[_5]=_a;
}
return _a;
};
function _10(_11){
return function(_12,_13,_14,_15){
var _16=_12[_13],_17;
if(!_16||_16.target!=_12){
_12[_13]=_17=function(){
var _18=_2;
var _19=arguments;
var _1a=_17.before;
while(_1a){
_19=_1a.advice.apply(this,_19)||_19;
_1a=_1a.next;
}
if(_17.around){
var _1b=_17.around.advice(this,_19);
}
var _1c=_17.after;
while(_1c&&_1c.id<_18){
if(_1c.receiveArguments){
var _1d=_1c.advice.apply(this,_19);
_1b=_1d===_1?_1b:_1d;
}else{
_1b=_1c.advice.call(this,_1b,_19);
}
_1c=_1c.next;
}
return _1b;
};
if(_16){
_17.around={advice:function(_1e,_1f){
return _16.apply(_1e,_1f);
}};
}
_17.target=_12;
}
var _20=_3((_17||_16),_11,_14,_15);
_14=null;
return _20;
};
};
var _21=_10("after");
var _22=_10("before");
var _23=_10("around");
return {before:_22,around:_23,after:_21};
});
