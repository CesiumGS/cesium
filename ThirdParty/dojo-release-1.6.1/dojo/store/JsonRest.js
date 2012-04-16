/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.store.JsonRest"]){
dojo._hasResource["dojo.store.JsonRest"]=true;
dojo.provide("dojo.store.JsonRest");
dojo.require("dojo.store.util.QueryResults");
dojo.declare("dojo.store.JsonRest",null,{constructor:function(_1){
dojo.mixin(this,_1);
},target:"",idProperty:"id",get:function(id,_2){
var _3=_2||{};
_3.Accept="application/javascript, application/json";
return dojo.xhrGet({url:this.target+id,handleAs:"json",headers:_3});
},getIdentity:function(_4){
return _4[this.idProperty];
},put:function(_5,_6){
_6=_6||{};
var id=("id" in _6)?_6.id:this.getIdentity(_5);
var _7=typeof id!="undefined";
return dojo.xhr(_7&&!_6.incremental?"PUT":"POST",{url:_7?this.target+id:this.target,postData:dojo.toJson(_5),handleAs:"json",headers:{"Content-Type":"application/json","If-Match":_6.overwrite===true?"*":null,"If-None-Match":_6.overwrite===false?"*":null}});
},add:function(_8,_9){
_9=_9||{};
_9.overwrite=false;
return this.put(_8,_9);
},remove:function(id){
return dojo.xhrDelete({url:this.target+id});
},query:function(_a,_b){
var _c={Accept:"application/javascript, application/json"};
_b=_b||{};
if(_b.start>=0||_b.count>=0){
_c.Range="items="+(_b.start||"0")+"-"+(("count" in _b&&_b.count!=Infinity)?(_b.count+(_b.start||0)-1):"");
}
if(dojo.isObject(_a)){
_a=dojo.objectToQuery(_a);
_a=_a?"?"+_a:"";
}
if(_b&&_b.sort){
_a+=(_a?"&":"?")+"sort(";
for(var i=0;i<_b.sort.length;i++){
var _d=_b.sort[i];
_a+=(i>0?",":"")+(_d.descending?"-":"+")+encodeURIComponent(_d.attribute);
}
_a+=")";
}
var _e=dojo.xhrGet({url:this.target+(_a||""),handleAs:"json",headers:_c});
_e.total=_e.then(function(){
var _f=_e.ioArgs.xhr.getResponseHeader("Content-Range");
return _f&&(_f=_f.match(/\/(.*)/))&&+_f[1];
});
return dojo.store.util.QueryResults(_e);
}});
}
