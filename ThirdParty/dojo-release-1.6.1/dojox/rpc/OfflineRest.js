/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.rpc.OfflineRest"]){
dojo._hasResource["dojox.rpc.OfflineRest"]=true;
dojo.provide("dojox.rpc.OfflineRest");
dojo.require("dojox.data.ClientFilter");
dojo.require("dojox.rpc.Rest");
dojo.require("dojox.storage");
var Rest=dojox.rpc.Rest;
var namespace="dojox_rpc_OfflineRest";
var loaded;
var index=Rest._index;
dojox.storage.manager.addOnLoad(function(){
loaded=dojox.storage.manager.available;
for(var i in index){
saveObject(index[i],i);
}
});
var dontSave;
function getStorageKey(_1){
return _1.replace(/[^0-9A-Za-z_]/g,"_");
};
function saveObject(_2,id){
if(loaded&&!dontSave&&(id||(_2&&_2.__id))){
dojox.storage.put(getStorageKey(id||_2.__id),typeof _2=="object"?dojox.json.ref.toJson(_2):_2,function(){
},namespace);
}
};
function isNetworkError(_3){
return _3 instanceof Error&&(_3.status==503||_3.status>12000||!_3.status);
};
function sendChanges(){
if(loaded){
var _4=dojox.storage.get("dirty",namespace);
if(_4){
for(var _5 in _4){
commitDirty(_5,_4);
}
}
}
};
var OfflineRest;
function sync(){
OfflineRest.sendChanges();
OfflineRest.downloadChanges();
};
var syncId=setInterval(sync,15000);
dojo.connect(document,"ononline",sync);
OfflineRest=dojox.rpc.OfflineRest={turnOffAutoSync:function(){
clearInterval(syncId);
},sync:sync,sendChanges:sendChanges,downloadChanges:function(){
},addStore:function(_6,_7){
OfflineRest.stores.push(_6);
_6.fetch({queryOptions:{cache:true},query:_7,onComplete:function(_8,_9){
_6._localBaseResults=_8;
_6._localBaseFetch=_9;
}});
}};
OfflineRest.stores=[];
var defaultGet=Rest._get;
Rest._get=function(_a,id){
try{
sendChanges();
if(window.navigator&&navigator.onLine===false){
throw new Error();
}
var _b=defaultGet(_a,id);
}
catch(e){
_b=new dojo.Deferred();
_b.errback(e);
}
var _c=dojox.rpc._sync;
_b.addCallback(function(_d){
saveObject(_d,_a._getRequest(id).url);
return _d;
});
_b.addErrback(function(_e){
if(loaded){
if(isNetworkError(_e)){
var _f={};
var _10=function(id,_11){
if(_f[id]){
return _11;
}
var _12=dojo.fromJson(dojox.storage.get(getStorageKey(id),namespace))||_11;
_f[id]=_12;
for(var i in _12){
var val=_12[i];
id=val&&val.$ref;
if(id){
if(id.substring&&id.substring(0,4)=="cid:"){
id=id.substring(4);
}
_12[i]=_10(id,val);
}
}
if(_12 instanceof Array){
for(i=0;i<_12.length;i++){
if(_12[i]===undefined){
_12.splice(i--,1);
}
}
}
return _12;
};
dontSave=true;
var _13=_10(_a._getRequest(id).url);
if(!_13){
return _e;
}
dontSave=false;
return _13;
}else{
return _e;
}
}else{
if(_c){
return new Error("Storage manager not loaded, can not continue");
}
_b=new dojo.Deferred();
_b.addCallback(arguments.callee);
dojox.storage.manager.addOnLoad(function(){
_b.callback();
});
return _b;
}
});
return _b;
};
function changeOccurred(_14,_15,_16,_17,_18){
if(_14=="delete"){
dojox.storage.remove(getStorageKey(_15),namespace);
}else{
dojox.storage.put(getStorageKey(_16),_17,function(){
},namespace);
}
var _19=_18&&_18._store;
if(_19){
_19.updateResultSet(_19._localBaseResults,_19._localBaseFetch);
dojox.storage.put(getStorageKey(_18._getRequest(_19._localBaseFetch.query).url),dojox.json.ref.toJson(_19._localBaseResults),function(){
},namespace);
}
};
dojo.addOnLoad(function(){
dojo.connect(dojox.data,"restListener",function(_1a){
var _1b=_1a.channel;
var _1c=_1a.event.toLowerCase();
var _1d=dojox.rpc.JsonRest&&dojox.rpc.JsonRest.getServiceAndId(_1b).service;
changeOccurred(_1c,_1b,_1c=="post"?_1b+_1a.result.id:_1b,dojo.toJson(_1a.result),_1d);
});
});
var defaultChange=Rest._change;
Rest._change=function(_1e,_1f,id,_20){
if(!loaded){
return defaultChange.apply(this,arguments);
}
var _21=_1f._getRequest(id).url;
changeOccurred(_1e,_21,dojox.rpc.JsonRest._contentId,_20,_1f);
var _22=dojox.storage.get("dirty",namespace)||{};
if(_1e=="put"||_1e=="delete"){
var _23=_21;
}else{
_23=0;
for(var i in _22){
if(!isNaN(parseInt(i))){
_23=i;
}
}
_23++;
}
_22[_23]={method:_1e,id:_21,content:_20};
return commitDirty(_23,_22);
};
function commitDirty(_24,_25){
var _26=_25[_24];
var _27=dojox.rpc.JsonRest.getServiceAndId(_26.id);
var _28=defaultChange(_26.method,_27.service,_27.id,_26.content);
_25[_24]=_26;
dojox.storage.put("dirty",_25,function(){
},namespace);
_28.addBoth(function(_29){
if(isNetworkError(_29)){
return null;
}
var _2a=dojox.storage.get("dirty",namespace)||{};
delete _2a[_24];
dojox.storage.put("dirty",_2a,function(){
},namespace);
return _29;
});
return _28;
};
dojo.connect(index,"onLoad",saveObject);
dojo.connect(index,"onUpdate",saveObject);
}
