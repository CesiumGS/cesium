/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.lang"]){
dojo._hasResource["dojo._base.lang"]=true;
dojo.provide("dojo._base.lang");
(function(){
var d=dojo,_1=Object.prototype.toString;
dojo.isString=function(it){
return (typeof it=="string"||it instanceof String);
};
dojo.isArray=function(it){
return it&&(it instanceof Array||typeof it=="array");
};
dojo.isFunction=function(it){
return _1.call(it)==="[object Function]";
};
dojo.isObject=function(it){
return it!==undefined&&(it===null||typeof it=="object"||d.isArray(it)||d.isFunction(it));
};
dojo.isArrayLike=function(it){
return it&&it!==undefined&&!d.isString(it)&&!d.isFunction(it)&&!(it.tagName&&it.tagName.toLowerCase()=="form")&&(d.isArray(it)||isFinite(it.length));
};
dojo.isAlien=function(it){
return it&&!d.isFunction(it)&&/\{\s*\[native code\]\s*\}/.test(String(it));
};
dojo.extend=function(_2,_3){
for(var i=1,l=arguments.length;i<l;i++){
d._mixin(_2.prototype,arguments[i]);
}
return _2;
};
dojo._hitchArgs=function(_4,_5){
var _6=d._toArray(arguments,2);
var _7=d.isString(_5);
return function(){
var _8=d._toArray(arguments);
var f=_7?(_4||d.global)[_5]:_5;
return f&&f.apply(_4||this,_6.concat(_8));
};
};
dojo.hitch=function(_9,_a){
if(arguments.length>2){
return d._hitchArgs.apply(d,arguments);
}
if(!_a){
_a=_9;
_9=null;
}
if(d.isString(_a)){
_9=_9||d.global;
if(!_9[_a]){
throw (["dojo.hitch: scope[\"",_a,"\"] is null (scope=\"",_9,"\")"].join(""));
}
return function(){
return _9[_a].apply(_9,arguments||[]);
};
}
return !_9?_a:function(){
return _a.apply(_9,arguments||[]);
};
};
dojo.delegate=dojo._delegate=(function(){
function _b(){
};
return function(_c,_d){
_b.prototype=_c;
var _e=new _b();
_b.prototype=null;
if(_d){
d._mixin(_e,_d);
}
return _e;
};
})();
var _f=function(obj,_10,_11){
return (_11||[]).concat(Array.prototype.slice.call(obj,_10||0));
};
var _12=function(obj,_13,_14){
var arr=_14||[];
for(var x=_13||0;x<obj.length;x++){
arr.push(obj[x]);
}
return arr;
};
dojo._toArray=d.isIE?function(obj){
return ((obj.item)?_12:_f).apply(this,arguments);
}:_f;
dojo.partial=function(_15){
var arr=[null];
return d.hitch.apply(d,arr.concat(d._toArray(arguments)));
};
var _16=d._extraNames,_17=_16.length,_18={};
dojo.clone=function(o){
if(!o||typeof o!="object"||d.isFunction(o)){
return o;
}
if(o.nodeType&&"cloneNode" in o){
return o.cloneNode(true);
}
if(o instanceof Date){
return new Date(o.getTime());
}
if(o instanceof RegExp){
return new RegExp(o);
}
var r,i,l,s,_19;
if(d.isArray(o)){
r=[];
for(i=0,l=o.length;i<l;++i){
if(i in o){
r.push(d.clone(o[i]));
}
}
}else{
r=o.constructor?new o.constructor():{};
}
for(_19 in o){
s=o[_19];
if(!(_19 in r)||(r[_19]!==s&&(!(_19 in _18)||_18[_19]!==s))){
r[_19]=d.clone(s);
}
}
if(_17){
for(i=0;i<_17;++i){
_19=_16[i];
s=o[_19];
if(!(_19 in r)||(r[_19]!==s&&(!(_19 in _18)||_18[_19]!==s))){
r[_19]=s;
}
}
}
return r;
};
dojo.trim=String.prototype.trim?function(str){
return str.trim();
}:function(str){
return str.replace(/^\s\s*/,"").replace(/\s\s*$/,"");
};
var _1a=/\{([^\}]+)\}/g;
dojo.replace=function(_1b,map,_1c){
return _1b.replace(_1c||_1a,d.isFunction(map)?map:function(_1d,k){
return d.getObject(k,false,map);
});
};
})();
}
