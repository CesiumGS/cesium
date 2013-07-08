/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/Deferred",["./kernel","../Deferred","../promise/Promise","../errors/CancelError","../has","./lang","../when"],function(_1,_2,_3,_4,_5,_6,_7){
var _8=function(){
};
var _9=Object.freeze||function(){
};
var _a=_1.Deferred=function(_b){
var _c,_d,_e,_f,_10,_11,_12;
var _13=(this.promise=new _3());
function _14(_15){
if(_d){
throw new Error("This deferred has already been resolved");
}
_c=_15;
_d=true;
_16();
};
function _16(){
var _17;
while(!_17&&_12){
var _18=_12;
_12=_12.next;
if((_17=(_18.progress==_8))){
_d=false;
}
var _19=(_10?_18.error:_18.resolved);
if(_5("config-useDeferredInstrumentation")){
if(_10&&_2.instrumentRejected){
_2.instrumentRejected(_c,!!_19);
}
}
if(_19){
try{
var _1a=_19(_c);
if(_1a&&typeof _1a.then==="function"){
_1a.then(_6.hitch(_18.deferred,"resolve"),_6.hitch(_18.deferred,"reject"),_6.hitch(_18.deferred,"progress"));
continue;
}
var _1b=_17&&_1a===undefined;
if(_17&&!_1b){
_10=_1a instanceof Error;
}
_18.deferred[_1b&&_10?"reject":"resolve"](_1b?_c:_1a);
}
catch(e){
_18.deferred.reject(e);
}
}else{
if(_10){
_18.deferred.reject(_c);
}else{
_18.deferred.resolve(_c);
}
}
}
};
this.isResolved=_13.isResolved=function(){
return _f==0;
};
this.isRejected=_13.isRejected=function(){
return _f==1;
};
this.isFulfilled=_13.isFulfilled=function(){
return _f>=0;
};
this.isCanceled=_13.isCanceled=function(){
return _e;
};
this.resolve=this.callback=function(_1c){
this.fired=_f=0;
this.results=[_1c,null];
_14(_1c);
};
this.reject=this.errback=function(_1d){
_10=true;
this.fired=_f=1;
if(_5("config-useDeferredInstrumentation")){
if(_2.instrumentRejected){
_2.instrumentRejected(_1d,!!_12);
}
}
_14(_1d);
this.results=[null,_1d];
};
this.progress=function(_1e){
var _1f=_12;
while(_1f){
var _20=_1f.progress;
_20&&_20(_1e);
_1f=_1f.next;
}
};
this.addCallbacks=function(_21,_22){
this.then(_21,_22,_8);
return this;
};
_13.then=this.then=function(_23,_24,_25){
var _26=_25==_8?this:new _a(_13.cancel);
var _27={resolved:_23,error:_24,progress:_25,deferred:_26};
if(_12){
_11=_11.next=_27;
}else{
_12=_11=_27;
}
if(_d){
_16();
}
return _26.promise;
};
var _28=this;
_13.cancel=this.cancel=function(){
if(!_d){
var _29=_b&&_b(_28);
if(!_d){
if(!(_29 instanceof Error)){
_29=new _4(_29);
}
_29.log=false;
_28.reject(_29);
}
}
_e=true;
};
_9(_13);
};
_6.extend(_a,{addCallback:function(_2a){
return this.addCallbacks(_6.hitch.apply(_1,arguments));
},addErrback:function(_2b){
return this.addCallbacks(null,_6.hitch.apply(_1,arguments));
},addBoth:function(_2c){
var _2d=_6.hitch.apply(_1,arguments);
return this.addCallbacks(_2d,_2d);
},fired:-1});
_a.when=_1.when=_7;
return _a;
});
