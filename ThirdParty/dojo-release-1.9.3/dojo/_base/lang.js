/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/lang",["./kernel","../has","../sniff"],function(_1,_2){
_2.add("bug-for-in-skips-shadowed",function(){
for(var i in {toString:1}){
return 0;
}
return 1;
});
var _3=_2("bug-for-in-skips-shadowed")?"hasOwnProperty.valueOf.isPrototypeOf.propertyIsEnumerable.toLocaleString.toString.constructor".split("."):[],_4=_3.length,_5=function(_6,_7,_8){
var p,i=0,_9=_1.global;
if(!_8){
if(!_6.length){
return _9;
}else{
p=_6[i++];
try{
_8=_1.scopeMap[p]&&_1.scopeMap[p][1];
}
catch(e){
}
_8=_8||(p in _9?_9[p]:(_7?_9[p]={}:undefined));
}
}
while(_8&&(p=_6[i++])){
_8=(p in _8?_8[p]:(_7?_8[p]={}:undefined));
}
return _8;
},_a=Object.prototype.toString,_b=function(_c,_d,_e){
return (_e||[]).concat(Array.prototype.slice.call(_c,_d||0));
},_f=/\{([^\}]+)\}/g;
var _10={_extraNames:_3,_mixin:function(_11,_12,_13){
var _14,s,i,_15={};
for(_14 in _12){
s=_12[_14];
if(!(_14 in _11)||(_11[_14]!==s&&(!(_14 in _15)||_15[_14]!==s))){
_11[_14]=_13?_13(s):s;
}
}
if(_2("bug-for-in-skips-shadowed")){
if(_12){
for(i=0;i<_4;++i){
_14=_3[i];
s=_12[_14];
if(!(_14 in _11)||(_11[_14]!==s&&(!(_14 in _15)||_15[_14]!==s))){
_11[_14]=_13?_13(s):s;
}
}
}
}
return _11;
},mixin:function(_16,_17){
if(!_16){
_16={};
}
for(var i=1,l=arguments.length;i<l;i++){
_10._mixin(_16,arguments[i]);
}
return _16;
},setObject:function(_18,_19,_1a){
var _1b=_18.split("."),p=_1b.pop(),obj=_5(_1b,true,_1a);
return obj&&p?(obj[p]=_19):undefined;
},getObject:function(_1c,_1d,_1e){
return _5(_1c.split("."),_1d,_1e);
},exists:function(_1f,obj){
return _10.getObject(_1f,false,obj)!==undefined;
},isString:function(it){
return (typeof it=="string"||it instanceof String);
},isArray:function(it){
return it&&(it instanceof Array||typeof it=="array");
},isFunction:function(it){
return _a.call(it)==="[object Function]";
},isObject:function(it){
return it!==undefined&&(it===null||typeof it=="object"||_10.isArray(it)||_10.isFunction(it));
},isArrayLike:function(it){
return it&&it!==undefined&&!_10.isString(it)&&!_10.isFunction(it)&&!(it.tagName&&it.tagName.toLowerCase()=="form")&&(_10.isArray(it)||isFinite(it.length));
},isAlien:function(it){
return it&&!_10.isFunction(it)&&/\{\s*\[native code\]\s*\}/.test(String(it));
},extend:function(_20,_21){
for(var i=1,l=arguments.length;i<l;i++){
_10._mixin(_20.prototype,arguments[i]);
}
return _20;
},_hitchArgs:function(_22,_23){
var pre=_10._toArray(arguments,2);
var _24=_10.isString(_23);
return function(){
var _25=_10._toArray(arguments);
var f=_24?(_22||_1.global)[_23]:_23;
return f&&f.apply(_22||this,pre.concat(_25));
};
},hitch:function(_26,_27){
if(arguments.length>2){
return _10._hitchArgs.apply(_1,arguments);
}
if(!_27){
_27=_26;
_26=null;
}
if(_10.isString(_27)){
_26=_26||_1.global;
if(!_26[_27]){
throw (["lang.hitch: scope[\"",_27,"\"] is null (scope=\"",_26,"\")"].join(""));
}
return function(){
return _26[_27].apply(_26,arguments||[]);
};
}
return !_26?_27:function(){
return _27.apply(_26,arguments||[]);
};
},delegate:(function(){
function TMP(){
};
return function(obj,_28){
TMP.prototype=obj;
var tmp=new TMP();
TMP.prototype=null;
if(_28){
_10._mixin(tmp,_28);
}
return tmp;
};
})(),_toArray:_2("ie")?(function(){
function _29(obj,_2a,_2b){
var arr=_2b||[];
for(var x=_2a||0;x<obj.length;x++){
arr.push(obj[x]);
}
return arr;
};
return function(obj){
return ((obj.item)?_29:_b).apply(this,arguments);
};
})():_b,partial:function(_2c){
var arr=[null];
return _10.hitch.apply(_1,arr.concat(_10._toArray(arguments)));
},clone:function(src){
if(!src||typeof src!="object"||_10.isFunction(src)){
return src;
}
if(src.nodeType&&"cloneNode" in src){
return src.cloneNode(true);
}
if(src instanceof Date){
return new Date(src.getTime());
}
if(src instanceof RegExp){
return new RegExp(src);
}
var r,i,l;
if(_10.isArray(src)){
r=[];
for(i=0,l=src.length;i<l;++i){
if(i in src){
r.push(_10.clone(src[i]));
}
}
}else{
r=src.constructor?new src.constructor():{};
}
return _10._mixin(r,src,_10.clone);
},trim:String.prototype.trim?function(str){
return str.trim();
}:function(str){
return str.replace(/^\s\s*/,"").replace(/\s\s*$/,"");
},replace:function(_2d,map,_2e){
return _2d.replace(_2e||_f,_10.isFunction(map)?map:function(_2f,k){
return _10.getObject(k,false,map);
});
}};
1&&_10.mixin(_1,_10);
return _10;
});
