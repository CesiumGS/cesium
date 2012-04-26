/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.xhr"]){
dojo._hasResource["dojo._base.xhr"]=true;
dojo.provide("dojo._base.xhr");
dojo.require("dojo._base.Deferred");
dojo.require("dojo._base.json");
dojo.require("dojo._base.lang");
dojo.require("dojo._base.query");
(function(){
var _1=dojo,_2=_1.config;
function _3(_4,_5,_6){
if(_6===null){
return;
}
var _7=_4[_5];
if(typeof _7=="string"){
_4[_5]=[_7,_6];
}else{
if(_1.isArray(_7)){
_7.push(_6);
}else{
_4[_5]=_6;
}
}
};
dojo.fieldToObject=function(_8){
var _9=null;
var _a=_1.byId(_8);
if(_a){
var _b=_a.name;
var _c=(_a.type||"").toLowerCase();
if(_b&&_c&&!_a.disabled){
if(_c=="radio"||_c=="checkbox"){
if(_a.checked){
_9=_a.value;
}
}else{
if(_a.multiple){
_9=[];
_1.query("option",_a).forEach(function(_d){
if(_d.selected){
_9.push(_d.value);
}
});
}else{
_9=_a.value;
}
}
}
}
return _9;
};
dojo.formToObject=function(_e){
var _f={};
var _10="file|submit|image|reset|button|";
_1.forEach(dojo.byId(_e).elements,function(_11){
var _12=_11.name;
var _13=(_11.type||"").toLowerCase();
if(_12&&_13&&_10.indexOf(_13)==-1&&!_11.disabled){
_3(_f,_12,_1.fieldToObject(_11));
if(_13=="image"){
_f[_12+".x"]=_f[_12+".y"]=_f[_12].x=_f[_12].y=0;
}
}
});
return _f;
};
dojo.objectToQuery=function(map){
var enc=encodeURIComponent;
var _14=[];
var _15={};
for(var _16 in map){
var _17=map[_16];
if(_17!=_15[_16]){
var _18=enc(_16)+"=";
if(_1.isArray(_17)){
for(var i=0;i<_17.length;i++){
_14.push(_18+enc(_17[i]));
}
}else{
_14.push(_18+enc(_17));
}
}
}
return _14.join("&");
};
dojo.formToQuery=function(_19){
return _1.objectToQuery(_1.formToObject(_19));
};
dojo.formToJson=function(_1a,_1b){
return _1.toJson(_1.formToObject(_1a),_1b);
};
dojo.queryToObject=function(str){
var ret={};
var qp=str.split("&");
var dec=decodeURIComponent;
_1.forEach(qp,function(_1c){
if(_1c.length){
var _1d=_1c.split("=");
var _1e=dec(_1d.shift());
var val=dec(_1d.join("="));
if(typeof ret[_1e]=="string"){
ret[_1e]=[ret[_1e]];
}
if(_1.isArray(ret[_1e])){
ret[_1e].push(val);
}else{
ret[_1e]=val;
}
}
});
return ret;
};
dojo._blockAsync=false;
var _1f=_1._contentHandlers=dojo.contentHandlers={text:function(xhr){
return xhr.responseText;
},json:function(xhr){
return _1.fromJson(xhr.responseText||null);
},"json-comment-filtered":function(xhr){
if(!dojo.config.useCommentedJson){
console.warn("Consider using the standard mimetype:application/json."+" json-commenting can introduce security issues. To"+" decrease the chances of hijacking, use the standard the 'json' handler and"+" prefix your json with: {}&&\n"+"Use djConfig.useCommentedJson=true to turn off this message.");
}
var _20=xhr.responseText;
var _21=_20.indexOf("/*");
var _22=_20.lastIndexOf("*/");
if(_21==-1||_22==-1){
throw new Error("JSON was not comment filtered");
}
return _1.fromJson(_20.substring(_21+2,_22));
},javascript:function(xhr){
return _1.eval(xhr.responseText);
},xml:function(xhr){
var _23=xhr.responseXML;
if(_1.isIE&&(!_23||!_23.documentElement)){
var ms=function(n){
return "MSXML"+n+".DOMDocument";
};
var dp=["Microsoft.XMLDOM",ms(6),ms(4),ms(3),ms(2)];
_1.some(dp,function(p){
try{
var dom=new ActiveXObject(p);
dom.async=false;
dom.loadXML(xhr.responseText);
_23=dom;
}
catch(e){
return false;
}
return true;
});
}
return _23;
},"json-comment-optional":function(xhr){
if(xhr.responseText&&/^[^{\[]*\/\*/.test(xhr.responseText)){
return _1f["json-comment-filtered"](xhr);
}else{
return _1f["json"](xhr);
}
}};
dojo._ioSetArgs=function(_24,_25,_26,_27){
var _28={args:_24,url:_24.url};
var _29=null;
if(_24.form){
var _2a=_1.byId(_24.form);
var _2b=_2a.getAttributeNode("action");
_28.url=_28.url||(_2b?_2b.value:null);
_29=_1.formToObject(_2a);
}
var _2c=[{}];
if(_29){
_2c.push(_29);
}
if(_24.content){
_2c.push(_24.content);
}
if(_24.preventCache){
_2c.push({"dojo.preventCache":new Date().valueOf()});
}
_28.query=_1.objectToQuery(_1.mixin.apply(null,_2c));
_28.handleAs=_24.handleAs||"text";
var d=new _1.Deferred(_25);
d.addCallbacks(_26,function(_2d){
return _27(_2d,d);
});
var ld=_24.load;
if(ld&&_1.isFunction(ld)){
d.addCallback(function(_2e){
return ld.call(_24,_2e,_28);
});
}
var err=_24.error;
if(err&&_1.isFunction(err)){
d.addErrback(function(_2f){
return err.call(_24,_2f,_28);
});
}
var _30=_24.handle;
if(_30&&_1.isFunction(_30)){
d.addBoth(function(_31){
return _30.call(_24,_31,_28);
});
}
if(_2.ioPublish&&_1.publish&&_28.args.ioPublish!==false){
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
d.ioArgs=_28;
return d;
};
var _32=function(dfd){
dfd.canceled=true;
var xhr=dfd.ioArgs.xhr;
var _33=typeof xhr.abort;
if(_33=="function"||_33=="object"||_33=="unknown"){
xhr.abort();
}
var err=dfd.ioArgs.error;
if(!err){
err=new Error("xhr cancelled");
err.dojoType="cancel";
}
return err;
};
var _34=function(dfd){
var ret=_1f[dfd.ioArgs.handleAs](dfd.ioArgs.xhr);
return ret===undefined?null:ret;
};
var _35=function(_36,dfd){
if(!dfd.ioArgs.args.failOk){
console.error(_36);
}
return _36;
};
var _37=null;
var _38=[];
var _39=0;
var _3a=function(dfd){
if(_39<=0){
_39=0;
if(_2.ioPublish&&_1.publish&&(!dfd||dfd&&dfd.ioArgs.args.ioPublish!==false)){
_1.publish("/dojo/io/stop");
}
}
};
var _3b=function(){
var now=(new Date()).getTime();
if(!_1._blockAsync){
for(var i=0,tif;i<_38.length&&(tif=_38[i]);i++){
var dfd=tif.dfd;
var _3c=function(){
if(!dfd||dfd.canceled||!tif.validCheck(dfd)){
_38.splice(i--,1);
_39-=1;
}else{
if(tif.ioCheck(dfd)){
_38.splice(i--,1);
tif.resHandle(dfd);
_39-=1;
}else{
if(dfd.startTime){
if(dfd.startTime+(dfd.ioArgs.args.timeout||0)<now){
_38.splice(i--,1);
var err=new Error("timeout exceeded");
err.dojoType="timeout";
dfd.errback(err);
dfd.cancel();
_39-=1;
}
}
}
}
};
if(dojo.config.debugAtAllCosts){
_3c.call(this);
}else{
try{
_3c.call(this);
}
catch(e){
dfd.errback(e);
}
}
}
}
_3a(dfd);
if(!_38.length){
clearInterval(_37);
_37=null;
return;
}
};
dojo._ioCancelAll=function(){
try{
_1.forEach(_38,function(i){
try{
i.dfd.cancel();
}
catch(e){
}
});
}
catch(e){
}
};
if(_1.isIE){
_1.addOnWindowUnload(_1._ioCancelAll);
}
_1._ioNotifyStart=function(dfd){
if(_2.ioPublish&&_1.publish&&dfd.ioArgs.args.ioPublish!==false){
if(!_39){
_1.publish("/dojo/io/start");
}
_39+=1;
_1.publish("/dojo/io/send",[dfd]);
}
};
_1._ioWatch=function(dfd,_3d,_3e,_3f){
var _40=dfd.ioArgs.args;
if(_40.timeout){
dfd.startTime=(new Date()).getTime();
}
_38.push({dfd:dfd,validCheck:_3d,ioCheck:_3e,resHandle:_3f});
if(!_37){
_37=setInterval(_3b,50);
}
if(_40.sync){
_3b();
}
};
var _41="application/x-www-form-urlencoded";
var _42=function(dfd){
return dfd.ioArgs.xhr.readyState;
};
var _43=function(dfd){
return 4==dfd.ioArgs.xhr.readyState;
};
var _44=function(dfd){
var xhr=dfd.ioArgs.xhr;
if(_1._isDocumentOk(xhr)){
dfd.callback(dfd);
}else{
var err=new Error("Unable to load "+dfd.ioArgs.url+" status:"+xhr.status);
err.status=xhr.status;
err.responseText=xhr.responseText;
dfd.errback(err);
}
};
dojo._ioAddQueryToUrl=function(_45){
if(_45.query.length){
_45.url+=(_45.url.indexOf("?")==-1?"?":"&")+_45.query;
_45.query=null;
}
};
dojo.xhr=function(_46,_47,_48){
var dfd=_1._ioSetArgs(_47,_32,_34,_35);
var _49=dfd.ioArgs;
var xhr=_49.xhr=_1._xhrObj(_49.args);
if(!xhr){
dfd.cancel();
return dfd;
}
if("postData" in _47){
_49.query=_47.postData;
}else{
if("putData" in _47){
_49.query=_47.putData;
}else{
if("rawBody" in _47){
_49.query=_47.rawBody;
}else{
if((arguments.length>2&&!_48)||"POST|PUT".indexOf(_46.toUpperCase())==-1){
_1._ioAddQueryToUrl(_49);
}
}
}
}
xhr.open(_46,_49.url,_47.sync!==true,_47.user||undefined,_47.password||undefined);
if(_47.headers){
for(var hdr in _47.headers){
if(hdr.toLowerCase()==="content-type"&&!_47.contentType){
_47.contentType=_47.headers[hdr];
}else{
if(_47.headers[hdr]){
xhr.setRequestHeader(hdr,_47.headers[hdr]);
}
}
}
}
xhr.setRequestHeader("Content-Type",_47.contentType||_41);
if(!_47.headers||!("X-Requested-With" in _47.headers)){
xhr.setRequestHeader("X-Requested-With","XMLHttpRequest");
}
_1._ioNotifyStart(dfd);
if(dojo.config.debugAtAllCosts){
xhr.send(_49.query);
}else{
try{
xhr.send(_49.query);
}
catch(e){
_49.error=e;
dfd.cancel();
}
}
_1._ioWatch(dfd,_42,_43,_44);
xhr=null;
return dfd;
};
dojo.xhrGet=function(_4a){
return _1.xhr("GET",_4a);
};
dojo.rawXhrPost=dojo.xhrPost=function(_4b){
return _1.xhr("POST",_4b,true);
};
dojo.rawXhrPut=dojo.xhrPut=function(_4c){
return _1.xhr("PUT",_4c,true);
};
dojo.xhrDelete=function(_4d){
return _1.xhr("DELETE",_4d);
};
})();
}
