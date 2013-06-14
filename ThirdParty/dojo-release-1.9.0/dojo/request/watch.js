/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/watch",["./util","../errors/RequestTimeoutError","../errors/CancelError","../_base/array","../_base/window","../has!host-browser?dom-addeventlistener?:../on:"],function(_1,_2,_3,_4,_5,on){
var _6=null,_7=[];
function _8(){
var _9=+(new Date);
for(var i=0,_a;i<_7.length&&(_a=_7[i]);i++){
var _b=_a.response,_c=_b.options;
if((_a.isCanceled&&_a.isCanceled())||(_a.isValid&&!_a.isValid(_b))){
_7.splice(i--,1);
_d._onAction&&_d._onAction();
}else{
if(_a.isReady&&_a.isReady(_b)){
_7.splice(i--,1);
_a.handleResponse(_b);
_d._onAction&&_d._onAction();
}else{
if(_a.startTime){
if(_a.startTime+(_c.timeout||0)<_9){
_7.splice(i--,1);
_a.cancel(new _2("Timeout exceeded",_b));
_d._onAction&&_d._onAction();
}
}
}
}
}
_d._onInFlight&&_d._onInFlight(_a);
if(!_7.length){
clearInterval(_6);
_6=null;
}
};
function _d(_e){
if(_e.response.options.timeout){
_e.startTime=+(new Date);
}
if(_e.isFulfilled()){
return;
}
_7.push(_e);
if(!_6){
_6=setInterval(_8,50);
}
if(_e.response.options.sync){
_8();
}
};
_d.cancelAll=function cancelAll(){
try{
_4.forEach(_7,function(_f){
try{
_f.cancel(new _3("All requests canceled."));
}
catch(e){
}
});
}
catch(e){
}
};
if(_5&&on&&_5.doc.attachEvent){
on(_5.global,"unload",function(){
_d.cancelAll();
});
}
return _d;
});
