/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.utils"]){
dojo._hasResource["dojox.lang.utils"]=true;
dojo.provide("dojox.lang.utils");
(function(){
var _1={},du=dojox.lang.utils,_2=Object.prototype.toString;
var _3=function(o){
if(o){
switch(_2.call(o)){
case "[object Array]":
return o.slice(0);
case "[object Object]":
return dojo.delegate(o);
}
}
return o;
};
dojo.mixin(du,{coerceType:function(_4,_5){
switch(typeof _4){
case "number":
return Number(eval("("+_5+")"));
case "string":
return String(_5);
case "boolean":
return Boolean(eval("("+_5+")"));
}
return eval("("+_5+")");
},updateWithObject:function(_6,_7,_8){
if(!_7){
return _6;
}
for(var x in _6){
if(x in _7&&!(x in _1)){
var t=_6[x];
if(t&&typeof t=="object"){
du.updateWithObject(t,_7[x],_8);
}else{
_6[x]=_8?du.coerceType(t,_7[x]):_3(_7[x]);
}
}
}
return _6;
},updateWithPattern:function(_9,_a,_b,_c){
if(!_a||!_b){
return _9;
}
for(var x in _b){
if(x in _a&&!(x in _1)){
_9[x]=_c?du.coerceType(_b[x],_a[x]):_3(_a[x]);
}
}
return _9;
},merge:function(_d,_e){
if(_e){
var _f=_2.call(_d),_10=_2.call(_e),t,i,l,m;
switch(_10){
case "[object Array]":
if(_10==_f){
t=new Array(Math.max(_d.length,_e.length));
for(i=0,l=t.length;i<l;++i){
t[i]=du.merge(_d[i],_e[i]);
}
return t;
}
return _e.slice(0);
case "[object Object]":
if(_10==_f&&_d){
t=dojo.delegate(_d);
for(i in _e){
if(i in _d){
l=_d[i];
m=_e[i];
if(m!==l){
t[i]=du.merge(l,m);
}
}else{
t[i]=dojo.clone(_e[i]);
}
}
return t;
}
return dojo.clone(_e);
}
}
return _e;
}});
})();
}
