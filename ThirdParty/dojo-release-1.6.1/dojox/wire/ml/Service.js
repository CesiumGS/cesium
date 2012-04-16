/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.ml.Service"]){
dojo._hasResource["dojox.wire.ml.Service"]=true;
dojo.provide("dojox.wire.ml.Service");
dojo.provide("dojox.wire.ml.RestHandler");
dojo.provide("dojox.wire.ml.XmlHandler");
dojo.provide("dojox.wire.ml.JsonHandler");
dojo.require("dijit._Widget");
dojo.require("dojox.xml.parser");
dojo.require("dojox.wire._base");
dojo.require("dojox.wire.ml.util");
dojo.declare("dojox.wire.ml.Service",dijit._Widget,{url:"",serviceUrl:"",serviceType:"",handlerClass:"",preventCache:true,postCreate:function(){
this.handler=this._createHandler();
},_handlerClasses:{"TEXT":"dojox.wire.ml.RestHandler","XML":"dojox.wire.ml.XmlHandler","JSON":"dojox.wire.ml.JsonHandler","JSON-RPC":"dojo.rpc.JsonService"},_createHandler:function(){
if(this.url){
var _1=this;
var d=dojo.xhrGet({url:this.url,handleAs:"json",sync:true});
d.addCallback(function(_2){
_1.smd=_2;
});
if(this.smd&&!this.serviceUrl){
this.serviceUrl=(this.smd.serviceUrl||this.smd.serviceURL);
}
}
var _3=undefined;
if(this.handlerClass){
_3=dojox.wire._getClass(this.handlerClass);
}else{
if(this.serviceType){
_3=this._handlerClasses[this.serviceType];
if(_3&&dojo.isString(_3)){
_3=dojox.wire._getClass(_3);
this._handlerClasses[this.serviceType]=_3;
}
}else{
if(this.smd&&this.smd.serviceType){
_3=this._handlerClasses[this.smd.serviceType];
if(_3&&dojo.isString(_3)){
_3=dojox.wire._getClass(_3);
this._handlerClasses[this.smd.serviceType]=_3;
}
}
}
}
if(!_3){
return null;
}
return new _3();
},callMethod:function(_4,_5){
var _6=new dojo.Deferred();
this.handler.bind(_4,_5,_6,this.serviceUrl);
return _6;
}});
dojo.declare("dojox.wire.ml.RestHandler",null,{contentType:"text/plain",handleAs:"text",bind:function(_7,_8,_9,_a){
_7=_7.toUpperCase();
var _b=this;
var _c={url:this._getUrl(_7,_8,_a),contentType:this.contentType,handleAs:this.handleAs,headers:this.headers,preventCache:this.preventCache};
var d=null;
if(_7=="POST"){
_c.postData=this._getContent(_7,_8);
d=dojo.rawXhrPost(_c);
}else{
if(_7=="PUT"){
_c.putData=this._getContent(_7,_8);
d=dojo.rawXhrPut(_c);
}else{
if(_7=="DELETE"){
d=dojo.xhrDelete(_c);
}else{
d=dojo.xhrGet(_c);
}
}
}
d.addCallbacks(function(_d){
_9.callback(_b._getResult(_d));
},function(_e){
_9.errback(_e);
});
},_getUrl:function(_f,_10,url){
var _11;
if(_f=="GET"||_f=="DELETE"){
if(_10.length>0){
_11=_10[0];
}
}else{
if(_10.length>1){
_11=_10[1];
}
}
if(_11){
var _12="";
for(var _13 in _11){
var _14=_11[_13];
if(_14){
_14=encodeURIComponent(_14);
var _15="{"+_13+"}";
var _16=url.indexOf(_15);
if(_16>=0){
url=url.substring(0,_16)+_14+url.substring(_16+_15.length);
}else{
if(_12){
_12+="&";
}
_12+=(_13+"="+_14);
}
}
}
if(_12){
url+="?"+_12;
}
}
return url;
},_getContent:function(_17,_18){
if(_17=="POST"||_17=="PUT"){
return (_18?_18[0]:null);
}else{
return null;
}
},_getResult:function(_19){
return _19;
}});
dojo.declare("dojox.wire.ml.XmlHandler",dojox.wire.ml.RestHandler,{contentType:"text/xml",handleAs:"xml",_getContent:function(_1a,_1b){
var _1c=null;
if(_1a=="POST"||_1a=="PUT"){
var p=_1b[0];
if(p){
if(dojo.isString(p)){
_1c=p;
}else{
var _1d=p;
if(_1d instanceof dojox.wire.ml.XmlElement){
_1d=_1d.element;
}else{
if(_1d.nodeType===9){
_1d=_1d.documentElement;
}
}
var _1e="<?xml version=\"1.0\"?>";
_1c=_1e+dojox.xml.parser.innerXML(_1d);
}
}
}
return _1c;
},_getResult:function(_1f){
if(_1f){
_1f=new dojox.wire.ml.XmlElement(_1f);
}
return _1f;
}});
dojo.declare("dojox.wire.ml.JsonHandler",dojox.wire.ml.RestHandler,{contentType:"text/json",handleAs:"json",headers:{"Accept":"*/json"},_getContent:function(_20,_21){
var _22=null;
if(_20=="POST"||_20=="PUT"){
var p=(_21?_21[0]:undefined);
if(p){
if(dojo.isString(p)){
_22=p;
}else{
_22=dojo.toJson(p);
}
}
}
return _22;
}});
}
