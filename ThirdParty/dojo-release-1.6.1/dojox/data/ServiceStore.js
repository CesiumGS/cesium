/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.ServiceStore"]){
dojo._hasResource["dojox.data.ServiceStore"]=true;
dojo.provide("dojox.data.ServiceStore");
dojo.declare("dojox.data.ServiceStore",dojox.data.ClientFilter||null,{service:null,constructor:function(_1){
this.byId=this.fetchItemByIdentity;
this._index={};
if(_1){
dojo.mixin(this,_1);
}
this.idAttribute=(_1&&_1.idAttribute)||(this.schema&&this.schema._idAttr);
},schema:null,idAttribute:"id",labelAttribute:"label",syncMode:false,estimateCountFactor:1,getSchema:function(){
return this.schema;
},loadLazyValues:true,getValue:function(_2,_3,_4){
var _5=_2[_3];
return _5||(_3 in _2?_5:_2._loadObject?(dojox.rpc._sync=true)&&arguments.callee.call(this,dojox.data.ServiceStore.prototype.loadItem({item:_2})||{},_3,_4):_4);
},getValues:function(_6,_7){
var _8=this.getValue(_6,_7);
if(_8 instanceof Array){
return _8;
}
if(!this.isItemLoaded(_8)){
dojox.rpc._sync=true;
_8=this.loadItem({item:_8});
}
return _8 instanceof Array?_8:_8===undefined?[]:[_8];
},getAttributes:function(_9){
var _a=[];
for(var i in _9){
if(_9.hasOwnProperty(i)&&!(i.charAt(0)=="_"&&i.charAt(1)=="_")){
_a.push(i);
}
}
return _a;
},hasAttribute:function(_b,_c){
return _c in _b;
},containsValue:function(_d,_e,_f){
return dojo.indexOf(this.getValues(_d,_e),_f)>-1;
},isItem:function(_10){
return (typeof _10=="object")&&_10&&!(_10 instanceof Date);
},isItemLoaded:function(_11){
return _11&&!_11._loadObject;
},loadItem:function(_12){
var _13;
if(_12.item._loadObject){
_12.item._loadObject(function(_14){
_13=_14;
delete _13._loadObject;
var _15=_14 instanceof Error?_12.onError:_12.onItem;
if(_15){
_15.call(_12.scope,_14);
}
});
}else{
if(_12.onItem){
_12.onItem.call(_12.scope,_12.item);
}
}
return _13;
},_currentId:0,_processResults:function(_16,_17){
if(_16&&typeof _16=="object"){
var id=_16.__id;
if(!id){
if(this.idAttribute){
id=_16[this.idAttribute];
}else{
id=this._currentId++;
}
if(id!==undefined){
var _18=this._index[id];
if(_18){
for(var j in _18){
delete _18[j];
}
_16=dojo.mixin(_18,_16);
}
_16.__id=id;
this._index[id]=_16;
}
}
for(var i in _16){
_16[i]=this._processResults(_16[i],_17).items;
}
var _19=_16.length;
}
return {totalCount:_17.request.count==_19?(_17.request.start||0)+_19*this.estimateCountFactor:_19,items:_16};
},close:function(_1a){
return _1a&&_1a.abort&&_1a.abort();
},fetch:function(_1b){
_1b=_1b||{};
if("syncMode" in _1b?_1b.syncMode:this.syncMode){
dojox.rpc._sync=true;
}
var _1c=this;
var _1d=_1b.scope||_1c;
var _1e=this.cachingFetch?this.cachingFetch(_1b):this._doQuery(_1b);
_1e.request=_1b;
_1e.addCallback(function(_1f){
if(_1b.clientFetch){
_1f=_1c.clientSideFetch({query:_1b.clientFetch,sort:_1b.sort,start:_1b.start,count:_1b.count},_1f);
}
var _20=_1c._processResults(_1f,_1e);
_1f=_1b.results=_20.items;
if(_1b.onBegin){
_1b.onBegin.call(_1d,_20.totalCount,_1b);
}
if(_1b.onItem){
for(var i=0;i<_1f.length;i++){
_1b.onItem.call(_1d,_1f[i],_1b);
}
}
if(_1b.onComplete){
_1b.onComplete.call(_1d,_1b.onItem?null:_1f,_1b);
}
return _1f;
});
_1e.addErrback(_1b.onError&&function(err){
return _1b.onError.call(_1d,err,_1b);
});
_1b.abort=function(){
_1e.cancel();
};
_1b.store=this;
return _1b;
},_doQuery:function(_21){
var _22=typeof _21.queryStr=="string"?_21.queryStr:_21.query;
return this.service(_22);
},getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Identity":true,"dojo.data.api.Schema":this.schema};
},getLabel:function(_23){
return this.getValue(_23,this.labelAttribute);
},getLabelAttributes:function(_24){
return [this.labelAttribute];
},getIdentity:function(_25){
return _25.__id;
},getIdentityAttributes:function(_26){
return [this.idAttribute];
},fetchItemByIdentity:function(_27){
var _28=this._index[(_27._prefix||"")+_27.identity];
if(_28){
if(_28._loadObject){
_27.item=_28;
return this.loadItem(_27);
}else{
if(_27.onItem){
_27.onItem.call(_27.scope,_28);
}
}
}else{
return this.fetch({query:_27.identity,onComplete:_27.onItem,onError:_27.onError,scope:_27.scope}).results;
}
return _28;
}});
}
