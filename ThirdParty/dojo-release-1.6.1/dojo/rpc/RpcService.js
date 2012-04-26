/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.rpc.RpcService"]){
dojo._hasResource["dojo.rpc.RpcService"]=true;
dojo.provide("dojo.rpc.RpcService");
dojo.declare("dojo.rpc.RpcService",null,{constructor:function(_1){
if(_1){
if((dojo.isString(_1))||(_1 instanceof dojo._Url)){
if(_1 instanceof dojo._Url){
var _2=_1+"";
}else{
_2=_1;
}
var _3=dojo.xhrGet({url:_2,handleAs:"json-comment-optional",sync:true});
_3.addCallback(this,"processSmd");
_3.addErrback(function(){
throw new Error("Unable to load SMD from "+_1);
});
}else{
if(_1.smdStr){
this.processSmd(dojo.eval("("+_1.smdStr+")"));
}else{
if(_1.serviceUrl){
this.serviceUrl=_1.serviceUrl;
}
this.timeout=_1.timeout||3000;
if("strictArgChecks" in _1){
this.strictArgChecks=_1.strictArgChecks;
}
this.processSmd(_1);
}
}
}
},strictArgChecks:true,serviceUrl:"",parseResults:function(_4){
return _4;
},errorCallback:function(_5){
return function(_6){
_5.errback(_6.message);
};
},resultCallback:function(_7){
var tf=dojo.hitch(this,function(_8){
if(_8.error!=null){
var _9;
if(typeof _8.error=="object"){
_9=new Error(_8.error.message);
_9.code=_8.error.code;
_9.error=_8.error.error;
}else{
_9=new Error(_8.error);
}
_9.id=_8.id;
_9.errorObject=_8;
_7.errback(_9);
}else{
_7.callback(this.parseResults(_8));
}
});
return tf;
},generateMethod:function(_a,_b,_c){
return dojo.hitch(this,function(){
var _d=new dojo.Deferred();
if((this.strictArgChecks)&&(_b!=null)&&(arguments.length!=_b.length)){
throw new Error("Invalid number of parameters for remote method.");
}else{
this.bind(_a,dojo._toArray(arguments),_d,_c);
}
return _d;
});
},processSmd:function(_e){
if(_e.methods){
dojo.forEach(_e.methods,function(m){
if(m&&m.name){
this[m.name]=this.generateMethod(m.name,m.parameters,m.url||m.serviceUrl||m.serviceURL);
if(!dojo.isFunction(this[m.name])){
throw new Error("RpcService: Failed to create"+m.name+"()");
}
}
},this);
}
this.serviceUrl=_e.serviceUrl||_e.serviceURL;
this.required=_e.required;
this.smd=_e;
}});
}
