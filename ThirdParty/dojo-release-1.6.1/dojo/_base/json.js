/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.json"]){
dojo._hasResource["dojo._base.json"]=true;
dojo.provide("dojo._base.json");
dojo.fromJson=function(_1){
return eval("("+_1+")");
};
dojo._escapeString=function(_2){
return ("\""+_2.replace(/(["\\])/g,"\\$1")+"\"").replace(/[\f]/g,"\\f").replace(/[\b]/g,"\\b").replace(/[\n]/g,"\\n").replace(/[\t]/g,"\\t").replace(/[\r]/g,"\\r");
};
dojo.toJsonIndentStr="\t";
dojo.toJson=function(it,_3,_4){
if(it===undefined){
return "undefined";
}
var _5=typeof it;
if(_5=="number"||_5=="boolean"){
return it+"";
}
if(it===null){
return "null";
}
if(dojo.isString(it)){
return dojo._escapeString(it);
}
var _6=arguments.callee;
var _7;
_4=_4||"";
var _8=_3?_4+dojo.toJsonIndentStr:"";
var tf=it.__json__||it.json;
if(dojo.isFunction(tf)){
_7=tf.call(it);
if(it!==_7){
return _6(_7,_3,_8);
}
}
if(it.nodeType&&it.cloneNode){
throw new Error("Can't serialize DOM nodes");
}
var _9=_3?" ":"";
var _a=_3?"\n":"";
if(dojo.isArray(it)){
var _b=dojo.map(it,function(_c){
var _d=_6(_c,_3,_8);
if(typeof _d!="string"){
_d="undefined";
}
return _a+_8+_d;
});
return "["+_b.join(","+_9)+_a+_4+"]";
}
if(_5=="function"){
return null;
}
var _e=[],_f;
for(_f in it){
var _10,val;
if(typeof _f=="number"){
_10="\""+_f+"\"";
}else{
if(typeof _f=="string"){
_10=dojo._escapeString(_f);
}else{
continue;
}
}
val=_6(it[_f],_3,_8);
if(typeof val!="string"){
continue;
}
_e.push(_a+_8+_10+":"+_9+val);
}
return "{"+_e.join(","+_9)+_a+_4+"}";
};
}
