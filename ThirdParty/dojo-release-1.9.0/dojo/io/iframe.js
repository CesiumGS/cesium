/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/io/iframe",["../_base/config","../_base/json","../_base/kernel","../_base/lang","../_base/xhr","../sniff","../_base/window","../dom","../dom-construct","../query","require","../aspect","../request/iframe"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d){
_3.deprecated("dojo/io/iframe","Use dojo/request/iframe.","2.0");
var _e=_d._iframeName;
_e=_e.substring(0,_e.lastIndexOf("_"));
var _f=_4.delegate(_d,{create:function(){
return _f._frame=_d.create.apply(_d,arguments);
},get:null,post:null,send:function(_10){
var _11;
var dfd=_5._ioSetArgs(_10,function(dfd){
_11&&_11.cancel();
},function(dfd){
var _12=null,_13=dfd.ioArgs;
try{
var _14=_13.handleAs;
if(_14==="xml"||_14==="html"){
_12=_11.response.data;
}else{
_12=_11.response.text;
if(_14==="json"){
_12=_2.fromJson(_12);
}else{
if(_14==="javascript"){
_12=_3.eval(_12);
}
}
}
}
catch(e){
_12=e;
}
return _12;
},function(_15,dfd){
dfd.ioArgs._hasError=true;
return _15;
});
var _16=dfd.ioArgs;
var _17="GET",_18=_8.byId(_10.form);
if(_10.method&&_10.method.toUpperCase()==="POST"&&_18){
_17="POST";
}
var _19={method:_17,handleAs:_10.handleAs==="json"||_10.handleAs==="javascript"?"text":_10.handleAs,form:_10.form,query:_18?null:_10.content,data:_18?_10.content:null,timeout:_10.timeout,ioArgs:_16};
if(_19.method){
_19.method=_19.method.toUpperCase();
}
if(_1.ioPublish&&_3.publish&&_16.args.ioPublish!==false){
var _1a=_c.after(_d,"_notifyStart",function(_1b){
if(_1b.options.ioArgs===_16){
_1a.remove();
_5._ioNotifyStart(dfd);
}
},true);
}
_11=_d(_16.url,_19,true);
_16._callNext=_11._callNext;
_11.then(function(){
dfd.resolve(dfd);
}).otherwise(function(_1c){
dfd.ioArgs.error=_1c;
dfd.reject(_1c);
});
return dfd;
},_iframeOnload:_7.global[_e+"_onload"]});
_4.setObject("dojo.io.iframe",_f);
return _f;
});
