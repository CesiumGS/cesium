/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/rpc/JsonService",["../_base/declare","../_base/Deferred","../_base/json","../_base/lang","../_base/xhr","./RpcService"],function(_1,_2,_3,_4,_5,_6){
return _1("dojo.rpc.JsonService",_6,{bustCache:false,contentType:"application/json-rpc",lastSubmissionId:0,callRemote:function(_7,_8){
var _9=new _2();
this.bind(_7,_8,_9);
return _9;
},bind:function(_a,_b,_c,_d){
var _e=_5.post({url:_d||this.serviceUrl,postData:this.createRequest(_a,_b),contentType:this.contentType,timeout:this.timeout,handleAs:"json-comment-optional"});
_e.addCallbacks(this.resultCallback(_c),this.errorCallback(_c));
},createRequest:function(_f,_10){
var req={"params":_10,"method":_f,"id":++this.lastSubmissionId};
return _3.toJson(req);
},parseResults:function(obj){
if(_4.isObject(obj)){
if("result" in obj){
return obj.result;
}
if("Result" in obj){
return obj.Result;
}
if("ResultSet" in obj){
return obj.ResultSet;
}
}
return obj;
}});
});
