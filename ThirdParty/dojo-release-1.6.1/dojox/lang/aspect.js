/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.aspect"]){
dojo._hasResource["dojox.lang.aspect"]=true;
dojo.provide("dojox.lang.aspect");
(function(){
var d=dojo,_1=dojox.lang.aspect,ap=Array.prototype,_2=[],_3;
var _4=function(){
this.next_before=this.prev_before=this.next_around=this.prev_around=this.next_afterReturning=this.prev_afterReturning=this.next_afterThrowing=this.prev_afterThrowing=this;
this.counter=0;
};
d.extend(_4,{add:function(_5){
var _6=d.isFunction(_5),_7={advice:_5,dynamic:_6};
this._add(_7,"before","",_6,_5);
this._add(_7,"around","",_6,_5);
this._add(_7,"after","Returning",_6,_5);
this._add(_7,"after","Throwing",_6,_5);
++this.counter;
return _7;
},_add:function(_8,_9,_a,_b,_c){
var _d=_9+_a;
if(_b||_c[_9]||(_a&&_c[_d])){
var _e="next_"+_d,_f="prev_"+_d;
(_8[_f]=this[_f])[_e]=_8;
(_8[_e]=this)[_f]=_8;
}
},remove:function(_10){
this._remove(_10,"before");
this._remove(_10,"around");
this._remove(_10,"afterReturning");
this._remove(_10,"afterThrowing");
--this.counter;
},_remove:function(_11,_12){
var _13="next_"+_12,_14="prev_"+_12;
if(_11[_13]){
_11[_13][_14]=_11[_14];
_11[_14][_13]=_11[_13];
}
},isEmpty:function(){
return !this.counter;
}});
var _15=function(){
return function(){
var _16=arguments.callee,_17=_16.advices,ret,i,a,e,t;
if(_3){
_2.push(_3);
}
_3={instance:this,joinPoint:_16,depth:_2.length,around:_17.prev_around,dynAdvices:[],dynIndex:0};
try{
for(i=_17.prev_before;i!=_17;i=i.prev_before){
if(i.dynamic){
_3.dynAdvices.push(a=new i.advice(_3));
if(t=a.before){
t.apply(a,arguments);
}
}else{
t=i.advice;
t.before.apply(t,arguments);
}
}
try{
ret=(_17.prev_around==_17?_16.target:_1.proceed).apply(this,arguments);
}
catch(e){
_3.dynIndex=_3.dynAdvices.length;
for(i=_17.next_afterThrowing;i!=_17;i=i.next_afterThrowing){
a=i.dynamic?_3.dynAdvices[--_3.dynIndex]:i.advice;
if(t=a.afterThrowing){
t.call(a,e);
}
if(t=a.after){
t.call(a);
}
}
throw e;
}
_3.dynIndex=_3.dynAdvices.length;
for(i=_17.next_afterReturning;i!=_17;i=i.next_afterReturning){
a=i.dynamic?_3.dynAdvices[--_3.dynIndex]:i.advice;
if(t=a.afterReturning){
t.call(a,ret);
}
if(t=a.after){
t.call(a);
}
}
var ls=_16._listeners;
for(i in ls){
if(!(i in ap)){
ls[i].apply(this,arguments);
}
}
}
finally{
for(i=0;i<_3.dynAdvices.length;++i){
a=_3.dynAdvices[i];
if(a.destroy){
a.destroy();
}
}
_3=_2.length?_2.pop():null;
}
return ret;
};
};
_1.advise=function(obj,_18,_19){
if(typeof obj!="object"){
obj=obj.prototype;
}
var _1a=[];
if(!(_18 instanceof Array)){
_18=[_18];
}
for(var j=0;j<_18.length;++j){
var t=_18[j];
if(t instanceof RegExp){
for(var i in obj){
if(d.isFunction(obj[i])&&t.test(i)){
_1a.push(i);
}
}
}else{
if(d.isFunction(obj[t])){
_1a.push(t);
}
}
}
if(!d.isArray(_19)){
_19=[_19];
}
return _1.adviseRaw(obj,_1a,_19);
};
_1.adviseRaw=function(obj,_1b,_1c){
if(!_1b.length||!_1c.length){
return null;
}
var m={},al=_1c.length;
for(var i=_1b.length-1;i>=0;--i){
var _1d=_1b[i],o=obj[_1d],ao=new Array(al),t=o.advices;
if(!t){
var x=obj[_1d]=_15();
x.target=o.target||o;
x.targetName=_1d;
x._listeners=o._listeners||[];
x.advices=new _4;
t=x.advices;
}
for(var j=0;j<al;++j){
ao[j]=t.add(_1c[j]);
}
m[_1d]=ao;
}
return [obj,m];
};
_1.unadvise=function(_1e){
if(!_1e){
return;
}
var obj=_1e[0],_1f=_1e[1];
for(var _20 in _1f){
var o=obj[_20],t=o.advices,ao=_1f[_20];
for(var i=ao.length-1;i>=0;--i){
t.remove(ao[i]);
}
if(t.isEmpty()){
var _21=true,ls=o._listeners;
if(ls.length){
for(i in ls){
if(!(i in ap)){
_21=false;
break;
}
}
}
if(_21){
obj[_20]=o.target;
}else{
var x=obj[_20]=d._listener.getDispatcher();
x.target=o.target;
x._listeners=ls;
}
}
}
};
_1.getContext=function(){
return _3;
};
_1.getContextStack=function(){
return _2;
};
_1.proceed=function(){
var _22=_3.joinPoint,_23=_22.advices;
for(var c=_3.around;c!=_23;c=_3.around){
_3.around=c.prev_around;
if(c.dynamic){
var a=_3.dynAdvices[_3.dynIndex++],t=a.around;
if(t){
return t.apply(a,arguments);
}
}else{
return c.advice.around.apply(c.advice,arguments);
}
}
return _22.target.apply(_3.instance,arguments);
};
})();
}
