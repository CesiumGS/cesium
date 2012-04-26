/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.wire.ml.Invocation"]){
dojo._hasResource["dojox.wire.ml.Invocation"]=true;
dojo.provide("dojox.wire.ml.Invocation");
dojo.require("dojox.wire.ml.Action");
dojo.declare("dojox.wire.ml.Invocation",dojox.wire.ml.Action,{object:"",method:"",topic:"",parameters:"",result:"",error:"",_run:function(){
if(this.topic){
var _1=this._getParameters(arguments);
try{
dojo.publish(this.topic,_1);
this.onComplete();
}
catch(e){
this.onError(e);
}
}else{
if(this.method){
var _2=(this.object?dojox.wire.ml._getValue(this.object):dojo.global);
if(!_2){
return;
}
var _1=this._getParameters(arguments);
var _3=_2[this.method];
if(!_3){
_3=_2.callMethod;
if(!_3){
return;
}
_1=[this.method,_1];
}
try{
var _4=false;
if(_2.getFeatures){
var _5=_2.getFeatures();
if((this.method=="fetch"&&_5["dojo.data.api.Read"])||(this.method=="save"&&_5["dojo.data.api.Write"])){
var _6=_1[0];
if(!_6.onComplete){
_6.onComplete=function(){
};
}
this.connect(_6,"onComplete","onComplete");
if(!_6.onError){
_6.onError=function(){
};
}
this.connect(_6,"onError","onError");
_4=true;
}
}
var r=_3.apply(_2,_1);
if(!_4){
if(r&&(r instanceof dojo.Deferred)){
var _7=this;
r.addCallbacks(function(_8){
_7.onComplete(_8);
},function(_9){
_7.onError(_9);
});
}else{
this.onComplete(r);
}
}
}
catch(e){
this.onError(e);
}
}
}
},onComplete:function(_a){
if(this.result){
dojox.wire.ml._setValue(this.result,_a);
}
if(this.error){
dojox.wire.ml._setValue(this.error,"");
}
},onError:function(_b){
if(this.error){
if(_b&&_b.message){
_b=_b.message;
}
dojox.wire.ml._setValue(this.error,_b);
}
},_getParameters:function(_c){
if(!this.parameters){
return _c;
}
var _d=[];
var _e=this.parameters.split(",");
if(_e.length==1){
var _f=dojox.wire.ml._getValue(dojo.trim(_e[0]),_c);
if(dojo.isArray(_f)){
_d=_f;
}else{
_d.push(_f);
}
}else{
for(var i in _e){
_d.push(dojox.wire.ml._getValue(dojo.trim(_e[i]),_c));
}
}
return _d;
}});
}
