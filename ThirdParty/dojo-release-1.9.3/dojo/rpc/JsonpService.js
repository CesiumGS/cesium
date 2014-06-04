/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/rpc/JsonpService",["../_base/array","../_base/declare","../_base/lang","./RpcService","../io/script"],function(_1,_2,_3,_4,_5){
return _2("dojo.rpc.JsonpService",_4,{constructor:function(_6,_7){
if(this.required){
if(_7){
_3.mixin(this.required,_7);
}
_1.forEach(this.required,function(_8){
if(_8==""||_8==undefined){
throw new Error("Required Service Argument not found: "+_8);
}
});
}
},strictArgChecks:false,bind:function(_9,_a,_b,_c){
var _d=_5.get({url:_c||this.serviceUrl,callbackParamName:this.callbackParamName||"callback",content:this.createRequest(_a),timeout:this.timeout,handleAs:"json",preventCache:true});
_d.addCallbacks(this.resultCallback(_b),this.errorCallback(_b));
},createRequest:function(_e){
var _f=(_3.isArrayLike(_e)&&_e.length==1)?_e[0]:{};
_3.mixin(_f,this.required);
return _f;
}});
});
