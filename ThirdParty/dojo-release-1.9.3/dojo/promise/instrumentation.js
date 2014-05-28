/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/promise/instrumentation",["./tracer","../has","../_base/lang","../_base/array"],function(_1,_2,_3,_4){
function _5(_6,_7,_8){
var _9="";
if(_6&&_6.stack){
_9+=_6.stack;
}
if(_7&&_7.stack){
_9+="\n    ----------------------------------------\n    rejected"+_7.stack.split("\n").slice(1).join("\n").replace(/^\s+/," ");
}
if(_8&&_8.stack){
_9+="\n    ----------------------------------------\n"+_8.stack;
}
console.error(_6,_9);
};
function _a(_b,_c,_d,_e){
if(!_c){
_5(_b,_d,_e);
}
};
var _f=[];
var _10=false;
var _11=1000;
function _12(_13,_14,_15,_16){
if(_14){
_4.some(_f,function(obj,ix){
if(obj.error===_13){
_f.splice(ix,1);
return true;
}
});
}else{
if(!_4.some(_f,function(obj){
return obj.error===_13;
})){
_f.push({error:_13,rejection:_15,deferred:_16,timestamp:new Date().getTime()});
}
}
if(!_10){
_10=setTimeout(_17,_11);
}
};
function _17(){
var now=new Date().getTime();
var _18=now-_11;
_f=_4.filter(_f,function(obj){
if(obj.timestamp<_18){
_5(obj.error,obj.rejection,obj.deferred);
return false;
}
return true;
});
if(_f.length){
_10=setTimeout(_17,_f[0].timestamp+_11-now);
}else{
_10=false;
}
};
return function(_19){
var _1a=_2("config-useDeferredInstrumentation");
if(_1a){
_1.on("resolved",_3.hitch(console,"log","resolved"));
_1.on("rejected",_3.hitch(console,"log","rejected"));
_1.on("progress",_3.hitch(console,"log","progress"));
var _1b=[];
if(typeof _1a==="string"){
_1b=_1a.split(",");
_1a=_1b.shift();
}
if(_1a==="report-rejections"){
_19.instrumentRejected=_a;
}else{
if(_1a==="report-unhandled-rejections"||_1a===true||_1a===1){
_19.instrumentRejected=_12;
_11=parseInt(_1b[0],10)||_11;
}else{
throw new Error("Unsupported instrumentation usage <"+_1a+">");
}
}
}
};
});
