/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.secure.sandbox"]){
dojo._hasResource["dojox.secure.sandbox"]=true;
dojo.provide("dojox.secure.sandbox");
dojo.require("dojox.secure.DOM");
dojo.require("dojox.secure.capability");
dojo.require("dojo.NodeList-fx");
(function(){
var _1=setTimeout;
var _2=setInterval;
if({}.__proto__){
var _3=function(_4){
var _5=Array.prototype[_4];
if(_5&&!_5.fixed){
(Array.prototype[_4]=function(){
if(this==window){
throw new TypeError("Called with wrong this");
}
return _5.apply(this,arguments);
}).fixed=true;
}
};
_3("concat");
_3("reverse");
_3("sort");
_3("slice");
_3("forEach");
_3("filter");
_3("reduce");
_3("reduceRight");
_3("every");
_3("map");
_3("some");
}
var _6=function(){
return dojo.xhrGet.apply(dojo,arguments);
};
dojox.secure.sandbox=function(_7){
var _8=dojox.secure.DOM(_7);
_7=_8(_7);
var _9=_7.ownerDocument;
var _a,_b=dojox.secure._safeDojoFunctions(_7,_8);
var _c=[];
var _d=["isNaN","isFinite","parseInt","parseFloat","escape","unescape","encodeURI","encodeURIComponent","decodeURI","decodeURIComponent","alert","confirm","prompt","Error","EvalError","RangeError","ReferenceError","SyntaxError","TypeError","Date","RegExp","Number","Object","Array","String","Math","setTimeout","setInterval","clearTimeout","clearInterval","dojo","get","set","forEach","load","evaluate"];
for(var i in _b){
_d.push(i);
_c.push("var "+i+"=dojo."+i);
}
eval(_c.join(";"));
function _e(_f,_10){
_10=""+_10;
if(dojox.secure.badProps.test(_10)){
throw new Error("bad property access");
}
if(_f.__get__){
return _f.__get__(_10);
}
return _f[_10];
};
function set(obj,_11,_12){
_11=""+_11;
_e(obj,_11);
if(obj.__set){
return obj.__set(_11);
}
obj[_11]=_12;
return _12;
};
function _13(obj,fun){
if(typeof fun!="function"){
throw new TypeError();
}
if("length" in obj){
if(obj.__get__){
var len=obj.__get__("length");
for(var i=0;i<len;i++){
if(i in obj){
fun.call(obj,obj.__get__(i),i,obj);
}
}
}else{
len=obj.length;
for(i=0;i<len;i++){
if(i in obj){
fun.call(obj,obj[i],i,obj);
}
}
}
}else{
for(i in obj){
fun.call(obj,_e(obj,i),i,obj);
}
}
};
function _14(_15,_16,_17){
var _18,_19,_1a;
var arg;
for(var i=0,l=arguments.length;typeof (arg=arguments[i])=="function"&&i<l;i++){
if(_18){
_a(_18,arg.prototype);
}else{
_19=arg;
var F=function(){
};
F.prototype=arg.prototype;
_18=new F;
}
}
if(arg){
for(var j in arg){
var _1b=arg[j];
if(typeof _1b=="function"){
arg[j]=function(){
if(this instanceof _14){
return arguments.callee.__rawMethod__.apply(this,arguments);
}
throw new Error("Method called on wrong object");
};
arg[j].__rawMethod__=_1b;
}
}
if(arg.hasOwnProperty("constructor")){
_1a=arg.constructor;
}
}
_18=_18?_a(_18,arg):arg;
function _14(){
if(_19){
_19.apply(this,arguments);
}
if(_1a){
_1a.apply(this,arguments);
}
};
_a(_14,arguments[i]);
_18.constructor=_14;
_14.prototype=_18;
return _14;
};
function _1c(_1d){
if(typeof _1d!="function"){
throw new Error("String is not allowed in setTimeout/setInterval");
}
};
function _1e(_1f,_20){
_1c(_1f);
return _1(_1f,_20);
};
function _21(_22,_23){
_1c(_22);
return _2(_22,_23);
};
function _24(_25){
return _8.evaluate(_25);
};
var _26=_8.load=function(url){
if(url.match(/^[\w\s]*:/)){
throw new Error("Access denied to cross-site requests");
}
return _6({url:(new _b._Url(_8.rootUrl,url))+"",secure:true});
};
_8.evaluate=function(_27){
dojox.secure.capability.validate(_27,_d,{document:1,element:1});
if(_27.match(/^\s*[\[\{]/)){
var _28=eval("("+_27+")");
}else{
eval(_27);
}
};
return {loadJS:function(url){
_8.rootUrl=url;
return _6({url:url,secure:true}).addCallback(function(_29){
_24(_29,_7);
});
},loadHTML:function(url){
_8.rootUrl=url;
return _6({url:url,secure:true}).addCallback(function(_2a){
_7.innerHTML=_2a;
});
},evaluate:function(_2b){
return _8.evaluate(_2b);
}};
};
})();
dojox.secure._safeDojoFunctions=function(_2c,_2d){
var _2e=["mixin","require","isString","isArray","isFunction","isObject","isArrayLike","isAlien","hitch","delegate","partial","trim","disconnect","subscribe","unsubscribe","Deferred","toJson","style","attr"];
var doc=_2c.ownerDocument;
var _2f=dojox.secure.unwrap;
dojo.NodeList.prototype.addContent.safetyCheck=function(_30){
_2d.safeHTML(_30);
};
dojo.NodeList.prototype.style.safetyCheck=function(_31,_32){
if(_31=="behavior"){
throw new Error("Can not set behavior");
}
_2d.safeCSS(_32);
};
dojo.NodeList.prototype.attr.safetyCheck=function(_33,_34){
if(_34&&(_33=="src"||_33=="href"||_33=="style")){
throw new Error("Illegal to set "+_33);
}
};
var _35={query:function(_36,_37){
return _2d(dojo.query(_36,_2f(_37||_2c)));
},connect:function(el,_38){
var obj=el;
arguments[0]=_2f(el);
if(obj!=arguments[0]&&_38.substring(0,2)!="on"){
throw new Error("Invalid event name for element");
}
return dojo.connect.apply(dojo,arguments);
},body:function(){
return _2c;
},byId:function(id){
return _2c.ownerDocument.getElementById(id);
},fromJson:function(str){
dojox.secure.capability.validate(str,[],{});
return dojo.fromJson(str);
}};
for(var i=0;i<_2e.length;i++){
_35[_2e[i]]=dojo[_2e[i]];
}
return _35;
};
}
