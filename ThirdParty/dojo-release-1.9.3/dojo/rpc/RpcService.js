/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/rpc/RpcService",["../_base/array","../_base/declare","../_base/Deferred","../_base/kernel","../_base/lang","../_base/url","../_base/xhr"],function(_1,_2,_3,_4,_5,_6,_7){
return _2("dojo.rpc.RpcService",null,{constructor:function(_8){
if(_8){
if((_5.isString(_8))||(_8 instanceof _6)){
if(_8 instanceof _6){
var _9=_8+"";
}else{
_9=_8;
}
var _a=_7.get({url:_9,handleAs:"json-comment-optional",sync:true});
_a.addCallback(this,"processSmd");
_a.addErrback(function(){
throw new Error("Unable to load SMD from "+_8);
});
}else{
if(_8.smdStr){
this.processSmd(_4.eval("("+_8.smdStr+")"));
}else{
if(_8.serviceUrl){
this.serviceUrl=_8.serviceUrl;
}
this.timeout=_8.timeout||0;
if("strictArgChecks" in _8){
this.strictArgChecks=_8.strictArgChecks;
}
this.processSmd(_8);
}
}
}
},strictArgChecks:true,serviceUrl:"",parseResults:function(_b){
return _b;
},errorCallback:function(_c){
return function(_d){
_c.errback(_d.message);
};
},resultCallback:function(_e){
return _5.hitch(this,function(_f){
if(_f.error!=null){
var err;
if(typeof _f.error=="object"){
err=new Error(_f.error.message);
err.code=_f.error.code;
err.error=_f.error.error;
}else{
err=new Error(_f.error);
}
err.id=_f.id;
err.errorObject=_f;
_e.errback(err);
}else{
_e.callback(this.parseResults(_f));
}
});
},generateMethod:function(_10,_11,url){
return _5.hitch(this,function(){
var _12=new _3();
if((this.strictArgChecks)&&(_11!=null)&&(arguments.length!=_11.length)){
throw new Error("Invalid number of parameters for remote method.");
}else{
this.bind(_10,_5._toArray(arguments),_12,url);
}
return _12;
});
},processSmd:function(_13){
if(_13.methods){
_1.forEach(_13.methods,function(m){
if(m&&m.name){
this[m.name]=this.generateMethod(m.name,m.parameters,m.url||m.serviceUrl||m.serviceURL);
if(!_5.isFunction(this[m.name])){
throw new Error("RpcService: Failed to create"+m.name+"()");
}
}
},this);
}
this.serviceUrl=_13.serviceUrl||_13.serviceURL;
this.required=_13.required;
this.smd=_13;
}});
});
