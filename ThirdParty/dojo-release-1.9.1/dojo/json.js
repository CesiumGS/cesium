/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/json",["./has"],function(_1){
"use strict";
var _2=typeof JSON!="undefined";
_1.add("json-parse",_2);
_1.add("json-stringify",_2&&JSON.stringify({a:0},function(k,v){
return v||1;
})=="{\"a\":1}");
if(_1("json-stringify")){
return JSON;
}else{
var _3=function(_4){
return ("\""+_4.replace(/(["\\])/g,"\\$1")+"\"").replace(/[\f]/g,"\\f").replace(/[\b]/g,"\\b").replace(/[\n]/g,"\\n").replace(/[\t]/g,"\\t").replace(/[\r]/g,"\\r");
};
return {parse:_1("json-parse")?JSON.parse:function(_5,_6){
if(_6&&!/^([\s\[\{]*(?:"(?:\\.|[^"])*"|-?\d[\d\.]*(?:[Ee][+-]?\d+)?|null|true|false|)[\s\]\}]*(?:,|:|$))+$/.test(_5)){
throw new SyntaxError("Invalid characters in JSON");
}
return eval("("+_5+")");
},stringify:function(_7,_8,_9){
var _a;
if(typeof _8=="string"){
_9=_8;
_8=null;
}
function _b(it,_c,_d){
if(_8){
it=_8(_d,it);
}
var _e,_f=typeof it;
if(_f=="number"){
return isFinite(it)?it+"":"null";
}
if(_f=="boolean"){
return it+"";
}
if(it===null){
return "null";
}
if(typeof it=="string"){
return _3(it);
}
if(_f=="function"||_f=="undefined"){
return _a;
}
if(typeof it.toJSON=="function"){
return _b(it.toJSON(_d),_c,_d);
}
if(it instanceof Date){
return "\"{FullYear}-{Month+}-{Date}T{Hours}:{Minutes}:{Seconds}Z\"".replace(/\{(\w+)(\+)?\}/g,function(t,_10,_11){
var num=it["getUTC"+_10]()+(_11?1:0);
return num<10?"0"+num:num;
});
}
if(it.valueOf()!==it){
return _b(it.valueOf(),_c,_d);
}
var _12=_9?(_c+_9):"";
var sep=_9?" ":"";
var _13=_9?"\n":"";
if(it instanceof Array){
var itl=it.length,res=[];
for(_d=0;_d<itl;_d++){
var obj=it[_d];
_e=_b(obj,_12,_d);
if(typeof _e!="string"){
_e="null";
}
res.push(_13+_12+_e);
}
return "["+res.join(",")+_13+_c+"]";
}
var _14=[];
for(_d in it){
var _15;
if(it.hasOwnProperty(_d)){
if(typeof _d=="number"){
_15="\""+_d+"\"";
}else{
if(typeof _d=="string"){
_15=_3(_d);
}else{
continue;
}
}
_e=_b(it[_d],_12,_d);
if(typeof _e!="string"){
continue;
}
_14.push(_13+_12+_15+":"+sep+_e);
}
}
return "{"+_14.join(",")+_13+_c+"}";
};
return _b(_7,"","");
}};
}
});
