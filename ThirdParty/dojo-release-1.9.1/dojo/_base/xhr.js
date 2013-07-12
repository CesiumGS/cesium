/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/xhr",["./kernel","./sniff","require","../io-query","../dom","../dom-form","./Deferred","./config","./json","./lang","./array","../on","../aspect","../request/watch","../request/xhr","../request/util"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,on,_c,_d,_e,_f){
_1._xhrObj=_e._create;
var cfg=_1.config;
_1.objectToQuery=_4.objectToQuery;
_1.queryToObject=_4.queryToObject;
_1.fieldToObject=_6.fieldToObject;
_1.formToObject=_6.toObject;
_1.formToQuery=_6.toQuery;
_1.formToJson=_6.toJson;
_1._blockAsync=false;
var _10=_1._contentHandlers=_1.contentHandlers={"text":function(xhr){
return xhr.responseText;
},"json":function(xhr){
return _9.fromJson(xhr.responseText||null);
},"json-comment-filtered":function(xhr){
if(!_8.useCommentedJson){
console.warn("Consider using the standard mimetype:application/json."+" json-commenting can introduce security issues. To"+" decrease the chances of hijacking, use the standard the 'json' handler and"+" prefix your json with: {}&&\n"+"Use djConfig.useCommentedJson=true to turn off this message.");
}
var _11=xhr.responseText;
var _12=_11.indexOf("/*");
var _13=_11.lastIndexOf("*/");
if(_12==-1||_13==-1){
throw new Error("JSON was not comment filtered");
}
return _9.fromJson(_11.substring(_12+2,_13));
},"javascript":function(xhr){
return _1.eval(xhr.responseText);
},"xml":function(xhr){
var _14=xhr.responseXML;
if(_14&&_2("dom-qsa2.1")&&!_14.querySelectorAll&&_2("dom-parser")){
_14=new DOMParser().parseFromString(xhr.responseText,"application/xml");
}
if(_2("ie")){
if((!_14||!_14.documentElement)){
var ms=function(n){
return "MSXML"+n+".DOMDocument";
};
var dp=["Microsoft.XMLDOM",ms(6),ms(4),ms(3),ms(2)];
_b.some(dp,function(p){
try{
var dom=new ActiveXObject(p);
dom.async=false;
dom.loadXML(xhr.responseText);
_14=dom;
}
catch(e){
return false;
}
return true;
});
}
}
return _14;
},"json-comment-optional":function(xhr){
if(xhr.responseText&&/^[^{\[]*\/\*/.test(xhr.responseText)){
return _10["json-comment-filtered"](xhr);
}else{
return _10["json"](xhr);
}
}};
_1._ioSetArgs=function(_15,_16,_17,_18){
var _19={args:_15,url:_15.url};
var _1a=null;
if(_15.form){
var _1b=_5.byId(_15.form);
var _1c=_1b.getAttributeNode("action");
_19.url=_19.url||(_1c?_1c.value:null);
_1a=_6.toObject(_1b);
}
var _1d=[{}];
if(_1a){
_1d.push(_1a);
}
if(_15.content){
_1d.push(_15.content);
}
if(_15.preventCache){
_1d.push({"dojo.preventCache":new Date().valueOf()});
}
_19.query=_4.objectToQuery(_a.mixin.apply(null,_1d));
_19.handleAs=_15.handleAs||"text";
var d=new _7(function(dfd){
dfd.canceled=true;
_16&&_16(dfd);
var err=dfd.ioArgs.error;
if(!err){
err=new Error("request cancelled");
err.dojoType="cancel";
dfd.ioArgs.error=err;
}
return err;
});
d.addCallback(_17);
var ld=_15.load;
if(ld&&_a.isFunction(ld)){
d.addCallback(function(_1e){
return ld.call(_15,_1e,_19);
});
}
var err=_15.error;
if(err&&_a.isFunction(err)){
d.addErrback(function(_1f){
return err.call(_15,_1f,_19);
});
}
var _20=_15.handle;
if(_20&&_a.isFunction(_20)){
d.addBoth(function(_21){
return _20.call(_15,_21,_19);
});
}
d.addErrback(function(_22){
return _18(_22,d);
});
if(cfg.ioPublish&&_1.publish&&_19.args.ioPublish!==false){
d.addCallbacks(function(res){
_1.publish("/dojo/io/load",[d,res]);
return res;
},function(res){
_1.publish("/dojo/io/error",[d,res]);
return res;
});
d.addBoth(function(res){
_1.publish("/dojo/io/done",[d,res]);
return res;
});
}
d.ioArgs=_19;
return d;
};
var _23=function(dfd){
var ret=_10[dfd.ioArgs.handleAs](dfd.ioArgs.xhr);
return ret===undefined?null:ret;
};
var _24=function(_25,dfd){
if(!dfd.ioArgs.args.failOk){
console.error(_25);
}
return _25;
};
var _26=function(dfd){
if(_27<=0){
_27=0;
if(cfg.ioPublish&&_1.publish&&(!dfd||dfd&&dfd.ioArgs.args.ioPublish!==false)){
_1.publish("/dojo/io/stop");
}
}
};
var _27=0;
_c.after(_d,"_onAction",function(){
_27-=1;
});
_c.after(_d,"_onInFlight",_26);
_1._ioCancelAll=_d.cancelAll;
_1._ioNotifyStart=function(dfd){
if(cfg.ioPublish&&_1.publish&&dfd.ioArgs.args.ioPublish!==false){
if(!_27){
_1.publish("/dojo/io/start");
}
_27+=1;
_1.publish("/dojo/io/send",[dfd]);
}
};
_1._ioWatch=function(dfd,_28,_29,_2a){
var _2b=dfd.ioArgs.options=dfd.ioArgs.args;
_a.mixin(dfd,{response:dfd.ioArgs,isValid:function(_2c){
return _28(dfd);
},isReady:function(_2d){
return _29(dfd);
},handleResponse:function(_2e){
return _2a(dfd);
}});
_d(dfd);
_26(dfd);
};
var _2f="application/x-www-form-urlencoded";
_1._ioAddQueryToUrl=function(_30){
if(_30.query.length){
_30.url+=(_30.url.indexOf("?")==-1?"?":"&")+_30.query;
_30.query=null;
}
};
_1.xhr=function(_31,_32,_33){
var _34;
var dfd=_1._ioSetArgs(_32,function(dfd){
_34&&_34.cancel();
},_23,_24);
var _35=dfd.ioArgs;
if("postData" in _32){
_35.query=_32.postData;
}else{
if("putData" in _32){
_35.query=_32.putData;
}else{
if("rawBody" in _32){
_35.query=_32.rawBody;
}else{
if((arguments.length>2&&!_33)||"POST|PUT".indexOf(_31.toUpperCase())===-1){
_1._ioAddQueryToUrl(_35);
}
}
}
}
var _36={method:_31,handleAs:"text",timeout:_32.timeout,withCredentials:_32.withCredentials,ioArgs:_35};
if(typeof _32.headers!=="undefined"){
_36.headers=_32.headers;
}
if(typeof _32.contentType!=="undefined"){
if(!_36.headers){
_36.headers={};
}
_36.headers["Content-Type"]=_32.contentType;
}
if(typeof _35.query!=="undefined"){
_36.data=_35.query;
}
if(typeof _32.sync!=="undefined"){
_36.sync=_32.sync;
}
_1._ioNotifyStart(dfd);
try{
_34=_e(_35.url,_36,true);
}
catch(e){
dfd.cancel();
return dfd;
}
dfd.ioArgs.xhr=_34.response.xhr;
_34.then(function(){
dfd.resolve(dfd);
}).otherwise(function(_37){
_35.error=_37;
if(_37.response){
_37.status=_37.response.status;
_37.responseText=_37.response.text;
_37.xhr=_37.response.xhr;
}
dfd.reject(_37);
});
return dfd;
};
_1.xhrGet=function(_38){
return _1.xhr("GET",_38);
};
_1.rawXhrPost=_1.xhrPost=function(_39){
return _1.xhr("POST",_39,true);
};
_1.rawXhrPut=_1.xhrPut=function(_3a){
return _1.xhr("PUT",_3a,true);
};
_1.xhrDelete=function(_3b){
return _1.xhr("DELETE",_3b);
};
_1._isDocumentOk=function(x){
return _f.checkStatus(x.status);
};
_1._getText=function(url){
var _3c;
_1.xhrGet({url:url,sync:true,load:function(_3d){
_3c=_3d;
}});
return _3c;
};
_a.mixin(_1.xhr,{_xhrObj:_1._xhrObj,fieldToObject:_6.fieldToObject,formToObject:_6.toObject,objectToQuery:_4.objectToQuery,formToQuery:_6.toQuery,formToJson:_6.toJson,queryToObject:_4.queryToObject,contentHandlers:_10,_ioSetArgs:_1._ioSetArgs,_ioCancelAll:_1._ioCancelAll,_ioNotifyStart:_1._ioNotifyStart,_ioWatch:_1._ioWatch,_ioAddQueryToUrl:_1._ioAddQueryToUrl,_isDocumentOk:_1._isDocumentOk,_getText:_1._getText,get:_1.xhrGet,post:_1.xhrPost,put:_1.xhrPut,del:_1.xhrDelete});
return _1.xhr;
});
