/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/node",["require","./util","./handlers","../errors/RequestTimeoutError","../node!http","../node!https","../node!url","../node!stream"],function(_1,_2,_3,_4,_5,_6,_7,_8){
var _9=_8.Stream,_a;
var _b={method:"GET",query:null,data:_a,headers:{}};
function _c(_d,_e){
var _f=_2.parseArgs(_d,_2.deepCreate(_b,_e),_e&&_e.data instanceof _9);
_d=_f.url;
_e=_f.options;
var def=_2.deferred(_f,function(dfd,_10){
_10.clientRequest.abort();
});
_d=_7.parse(_d);
var _11=_f.requestOptions={hostname:_d.hostname,port:_d.port,socketPath:_e.socketPath,method:_e.method,headers:_e.headers,agent:_e.agent,pfx:_e.pfx,key:_e.key,passphrase:_e.passphrase,cert:_e.cert,ca:_e.ca,ciphers:_e.ciphers,rejectUnauthorized:_e.rejectUnauthorized===false?false:true};
if(_d.path){
_11.path=_d.path;
}
if(_e.user||_e.password){
_11.auth=(_e.user||"")+":"+(_e.password||"");
}
var req=_f.clientRequest=(_d.protocol==="https:"?_6:_5).request(_11);
if(_e.socketOptions){
if("timeout" in _e.socketOptions){
req.setTimeout(_e.socketOptions.timeout);
}
if("noDelay" in _e.socketOptions){
req.setNoDelay(_e.socketOptions.noDelay);
}
if("keepAlive" in _e.socketOptions){
var _12=_e.socketOptions.keepAlive;
req.setKeepAlive(_12>=0,_12||0);
}
}
req.on("socket",function(){
_f.hasSocket=true;
def.progress(_f);
});
req.on("response",function(_13){
_f.clientResponse=_13;
_f.status=_13.statusCode;
_f.getHeader=function(_14){
return _13.headers[_14.toLowerCase()]||null;
};
var _15=[];
_13.on("data",function(_16){
_15.push(_16);
});
_13.on("end",function(){
if(_17){
clearTimeout(_17);
}
_f.text=_15.join("");
try{
_3(_f);
def.resolve(_f);
}
catch(error){
def.reject(error);
}
});
});
req.on("error",def.reject);
if(_e.data){
if(typeof _e.data==="string"){
req.end(_e.data);
}else{
_e.data.pipe(req);
}
}else{
req.end();
}
if(_e.timeout){
var _17=setTimeout(function(){
def.cancel(new _4(_f));
},_e.timeout);
}
return def.promise;
};
_2.addCommonMethods(_c);
return _c;
});
