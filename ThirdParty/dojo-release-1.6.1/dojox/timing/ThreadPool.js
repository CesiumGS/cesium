/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.timing.ThreadPool"]){
dojo._hasResource["dojox.timing.ThreadPool"]=true;
dojo.provide("dojox.timing.ThreadPool");
dojo.require("dojox.timing");
dojo.experimental("dojox.timing.ThreadPool");
(function(){
var t=dojox.timing;
t.threadStates={UNSTARTED:"unstarted",STOPPED:"stopped",PENDING:"pending",RUNNING:"running",SUSPENDED:"suspended",WAITING:"waiting",COMPLETE:"complete",ERROR:"error"};
t.threadPriorities={LOWEST:1,BELOWNORMAL:2,NORMAL:3,ABOVENORMAL:4,HIGHEST:5};
t.Thread=function(fn,_1){
var _2=this;
this.state=t.threadStates.UNSTARTED;
this.priority=_1||t.threadPriorities.NORMAL;
this.lastError=null;
this.func=fn;
this.invoke=function(){
_2.state=t.threadStates.RUNNING;
try{
fn(this);
_2.state=t.threadStates.COMPLETE;
}
catch(e){
_2.lastError=e;
_2.state=t.threadStates.ERROR;
}
};
};
t.ThreadPool=new (function(_3,_4){
var _5=this;
var _6=_3;
var _7=_6;
var _8=_4;
var _9=Math.floor((_8/2)/_6);
var _a=[];
var _b=new Array(_6+1);
var _c=new dojox.timing.Timer();
var _d=function(){
var _e=_b[0]={};
for(var i=0;i<_b.length;i++){
window.clearTimeout(_b[i]);
var _f=_a.shift();
if(typeof (_f)=="undefined"){
break;
}
_e["thread-"+i]=_f;
_b[i]=window.setTimeout(_f.invoke,(_9*i));
}
_7=_6-(i-1);
};
this.getMaxThreads=function(){
return _6;
};
this.getAvailableThreads=function(){
return _7;
};
this.getTickInterval=function(){
return _8;
};
this.queueUserWorkItem=function(fn){
var _10=fn;
if(_10 instanceof Function){
_10=new t.Thread(_10);
}
var idx=_a.length;
for(var i=0;i<_a.length;i++){
if(_a[i].priority<_10.priority){
idx=i;
break;
}
}
if(idx<_a.length){
_a.splice(idx,0,_10);
}else{
_a.push(_10);
}
return true;
};
this.removeQueuedUserWorkItem=function(_11){
if(_11 instanceof Function){
var idx=-1;
for(var i=0;i<_a.length;i++){
if(_a[i].func==_11){
idx=i;
break;
}
}
if(idx>-1){
_a.splice(idx,1);
return true;
}
return false;
}
var idx=-1;
for(var i=0;i<_a.length;i++){
if(_a[i]==_11){
idx=i;
break;
}
}
if(idx>-1){
_a.splice(idx,1);
return true;
}
return false;
};
this.start=function(){
_c.start();
};
this.stop=function(){
_c.stop();
};
this.abort=function(){
this.stop();
for(var i=1;i<_b.length;i++){
if(_b[i]){
window.clearTimeout(_b[i]);
}
}
for(var _12 in _b[0]){
this.queueUserWorkItem(_12);
}
_b[0]={};
};
this.reset=function(){
this.abort();
_a=[];
};
this.sleep=function(_13){
_c.stop();
window.setTimeout(_c.start,_13);
};
_c.onTick=_5.invoke;
})(16,5000);
})();
}
