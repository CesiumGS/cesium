/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.rpc.Service"]){
dojo._hasResource["dojox.rpc.Service"]=true;
dojo.provide("dojox.rpc.Service");
dojo.require("dojo.AdapterRegistry");
dojo.declare("dojox.rpc.Service",null,{constructor:function(_1,_2){
var _3;
var _4=this;
function _5(_6){
_6._baseUrl=new dojo._Url((dojo.isBrowser?location.href:dojo.config.baseUrl),_3||".")+"";
_4._smd=_6;
for(var _7 in _4._smd.services){
var _8=_7.split(".");
var _9=_4;
for(var i=0;i<_8.length-1;i++){
_9=_9[_8[i]]||(_9[_8[i]]={});
}
_9[_8[_8.length-1]]=_4._generateService(_7,_4._smd.services[_7]);
}
};
if(_1){
if((dojo.isString(_1))||(_1 instanceof dojo._Url)){
if(_1 instanceof dojo._Url){
_3=_1+"";
}else{
_3=_1;
}
var _a=dojo._getText(_3);
if(!_a){
throw new Error("Unable to load SMD from "+_1);
}else{
_5(dojo.fromJson(_a));
}
}else{
_5(_1);
}
}
this._options=(_2?_2:{});
this._requestId=0;
},_generateService:function(_b,_c){
if(this[_c]){
throw new Error("WARNING: "+_b+" already exists for service. Unable to generate function");
}
_c.name=_b;
var _d=dojo.hitch(this,"_executeMethod",_c);
var _e=dojox.rpc.transportRegistry.match(_c.transport||this._smd.transport);
if(_e.getExecutor){
_d=_e.getExecutor(_d,_c,this);
}
var _f=_c.returns||(_c._schema={});
var _10="/"+_b+"/";
_f._service=_d;
_d.servicePath=_10;
_d._schema=_f;
_d.id=dojox.rpc.Service._nextId++;
return _d;
},_getRequest:function(_11,_12){
var smd=this._smd;
var _13=dojox.rpc.envelopeRegistry.match(_11.envelope||smd.envelope||"NONE");
var _14=(_11.parameters||[]).concat(smd.parameters||[]);
if(_13.namedParams){
if((_12.length==1)&&dojo.isObject(_12[0])){
_12=_12[0];
}else{
var _15={};
for(var i=0;i<_11.parameters.length;i++){
if(typeof _12[i]!="undefined"||!_11.parameters[i].optional){
_15[_11.parameters[i].name]=_12[i];
}
}
_12=_15;
}
if(_11.strictParameters||smd.strictParameters){
for(i in _12){
var _16=false;
for(var j=0;j<_14.length;j++){
if(_14[i].name==i){
_16=true;
}
}
if(!_16){
delete _12[i];
}
}
}
for(i=0;i<_14.length;i++){
var _17=_14[i];
if(!_17.optional&&_17.name&&!_12[_17.name]){
if(_17["default"]){
_12[_17.name]=_17["default"];
}else{
if(!(_17.name in _12)){
throw new Error("Required parameter "+_17.name+" was omitted");
}
}
}
}
}else{
if(_14&&_14[0]&&_14[0].name&&(_12.length==1)&&dojo.isObject(_12[0])){
if(_13.namedParams===false){
_12=dojox.rpc.toOrdered(_14,_12);
}else{
_12=_12[0];
}
}
}
if(dojo.isObject(this._options)){
_12=dojo.mixin(_12,this._options);
}
var _18=_11._schema||_11.returns;
var _19=_13.serialize.apply(this,[smd,_11,_12]);
_19._envDef=_13;
var _1a=(_11.contentType||smd.contentType||_19.contentType);
return dojo.mixin(_19,{sync:dojox.rpc._sync,contentType:_1a,headers:_11.headers||smd.headers||_19.headers||{},target:_19.target||dojox.rpc.getTarget(smd,_11),transport:_11.transport||smd.transport||_19.transport,envelope:_11.envelope||smd.envelope||_19.envelope,timeout:_11.timeout||smd.timeout,callbackParamName:_11.callbackParamName||smd.callbackParamName,rpcObjectParamName:_11.rpcObjectParamName||smd.rpcObjectParamName,schema:_18,handleAs:_19.handleAs||"auto",preventCache:_11.preventCache||smd.preventCache,frameDoc:this._options.frameDoc||undefined});
},_executeMethod:function(_1b){
var _1c=[];
var i;
for(i=1;i<arguments.length;i++){
_1c.push(arguments[i]);
}
var _1d=this._getRequest(_1b,_1c);
var _1e=dojox.rpc.transportRegistry.match(_1d.transport).fire(_1d);
_1e.addBoth(function(_1f){
return _1d._envDef.deserialize.call(this,_1f);
});
return _1e;
}});
dojox.rpc.getTarget=function(smd,_20){
var _21=smd._baseUrl;
if(smd.target){
_21=new dojo._Url(_21,smd.target)+"";
}
if(_20.target){
_21=new dojo._Url(_21,_20.target)+"";
}
return _21;
};
dojox.rpc.toOrdered=function(_22,_23){
if(dojo.isArray(_23)){
return _23;
}
var _24=[];
for(var i=0;i<_22.length;i++){
_24.push(_23[_22[i].name]);
}
return _24;
};
dojox.rpc.transportRegistry=new dojo.AdapterRegistry(true);
dojox.rpc.envelopeRegistry=new dojo.AdapterRegistry(true);
dojox.rpc.envelopeRegistry.register("URL",function(str){
return str=="URL";
},{serialize:function(smd,_25,_26){
var d=dojo.objectToQuery(_26);
return {data:d,transport:"POST"};
},deserialize:function(_27){
return _27;
},namedParams:true});
dojox.rpc.envelopeRegistry.register("JSON",function(str){
return str=="JSON";
},{serialize:function(smd,_28,_29){
var d=dojo.toJson(_29);
return {data:d,handleAs:"json",contentType:"application/json"};
},deserialize:function(_2a){
return _2a;
}});
dojox.rpc.envelopeRegistry.register("PATH",function(str){
return str=="PATH";
},{serialize:function(smd,_2b,_2c){
var i;
var _2d=dojox.rpc.getTarget(smd,_2b);
if(dojo.isArray(_2c)){
for(i=0;i<_2c.length;i++){
_2d+="/"+_2c[i];
}
}else{
for(i in _2c){
_2d+="/"+i+"/"+_2c[i];
}
}
return {data:"",target:_2d};
},deserialize:function(_2e){
return _2e;
}});
dojox.rpc.transportRegistry.register("POST",function(str){
return str=="POST";
},{fire:function(r){
r.url=r.target;
r.postData=r.data;
return dojo.rawXhrPost(r);
}});
dojox.rpc.transportRegistry.register("GET",function(str){
return str=="GET";
},{fire:function(r){
r.url=r.target+(r.data?"?"+((r.rpcObjectParamName)?r.rpcObjectParamName+"=":"")+r.data:"");
return dojo.xhrGet(r);
}});
dojox.rpc.transportRegistry.register("JSONP",function(str){
return str=="JSONP";
},{fire:function(r){
r.url=r.target+((r.target.indexOf("?")==-1)?"?":"&")+((r.rpcObjectParamName)?r.rpcObjectParamName+"=":"")+r.data;
r.callbackParamName=r.callbackParamName||"callback";
return dojo.io.script.get(r);
}});
dojox.rpc.Service._nextId=1;
dojo._contentHandlers.auto=function(xhr){
var _2f=dojo._contentHandlers;
var _30=xhr.getResponseHeader("Content-Type");
var _31=!_30?_2f.text(xhr):_30.match(/\/.*json/)?_2f.json(xhr):_30.match(/\/javascript/)?_2f.javascript(xhr):_30.match(/\/xml/)?_2f.xml(xhr):_2f.text(xhr);
return _31;
};
}
