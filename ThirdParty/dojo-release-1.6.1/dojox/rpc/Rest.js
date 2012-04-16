/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.rpc.Rest"]){
dojo._hasResource["dojox.rpc.Rest"]=true;
dojo.provide("dojox.rpc.Rest");
if(dojox.rpc&&dojox.rpc.transportRegistry){
dojox.rpc.transportRegistry.register("REST",function(_1){
return _1=="REST";
},{getExecutor:function(_2,_3,_4){
return new dojox.rpc.Rest(_3.name,(_3.contentType||_4._smd.contentType||"").match(/json|javascript/),null,function(id,_5){
var _6=_4._getRequest(_3,[id]);
_6.url=_6.target+(_6.data?"?"+_6.data:"");
if(_5&&(_5.start>=0||_5.count>=0)){
_6.headers=_6.headers||{};
_6.headers.Range="items="+(_5.start||"0")+"-"+(("count" in _5&&_5.count!=Infinity)?(_5.count+(_5.start||0)-1):"");
}
return _6;
});
}});
}
var drr;
function index(_7,_8,_9,id){
_7.addCallback(function(_a){
if(_7.ioArgs.xhr&&_9){
_9=_7.ioArgs.xhr.getResponseHeader("Content-Range");
_7.fullLength=_9&&(_9=_9.match(/\/(.*)/))&&parseInt(_9[1]);
}
return _a;
});
return _7;
};
drr=dojox.rpc.Rest=function(_b,_c,_d,_e){
var _f;
_f=function(id,_10){
return drr._get(_f,id,_10);
};
_f.isJson=_c;
_f._schema=_d;
_f.cache={serialize:_c?((dojox.json&&dojox.json.ref)||dojo).toJson:function(_11){
return _11;
}};
_f._getRequest=_e||function(id,_12){
if(dojo.isObject(id)){
id=dojo.objectToQuery(id);
id=id?"?"+id:"";
}
if(_12&&_12.sort&&!_12.queryStr){
id+=(id?"&":"?")+"sort(";
for(var i=0;i<_12.sort.length;i++){
var _13=_12.sort[i];
id+=(i>0?",":"")+(_13.descending?"-":"+")+encodeURIComponent(_13.attribute);
}
id+=")";
}
var _14={url:_b+(id==null?"":id),handleAs:_c?"json":"text",contentType:_c?"application/json":"text/plain",sync:dojox.rpc._sync,headers:{Accept:_c?"application/json,application/javascript":"*/*"}};
if(_12&&(_12.start>=0||_12.count>=0)){
_14.headers.Range="items="+(_12.start||"0")+"-"+(("count" in _12&&_12.count!=Infinity)?(_12.count+(_12.start||0)-1):"");
}
dojox.rpc._sync=false;
return _14;
};
function _15(_16){
_f[_16]=function(id,_17){
return drr._change(_16,_f,id,_17);
};
};
_15("put");
_15("post");
_15("delete");
_f.servicePath=_b;
return _f;
};
drr._index={};
drr._timeStamps={};
drr._change=function(_18,_19,id,_1a){
var _1b=_19._getRequest(id);
_1b[_18+"Data"]=_1a;
return index(dojo.xhr(_18.toUpperCase(),_1b,true),_19);
};
drr._get=function(_1c,id,_1d){
_1d=_1d||{};
return index(dojo.xhrGet(_1c._getRequest(id,_1d)),_1c,(_1d.start>=0||_1d.count>=0),id);
};
}
