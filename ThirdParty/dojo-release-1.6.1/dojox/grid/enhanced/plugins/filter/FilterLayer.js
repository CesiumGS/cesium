/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterLayer"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterLayer"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter.FilterLayer");
dojo.require("dojox.grid.enhanced.plugins.filter._FilterExpr");
dojo.require("dojox.grid.enhanced.plugins._StoreLayer");
(function(){
var ns=dojox.grid.enhanced.plugins,_1="filter",_2="clear",_3=function(_4,_5){
return _5?dojo.hitch(_4||dojo.global,_5):function(){
};
},_6=function(_7){
var _8={};
if(_7&&dojo.isObject(_7)){
for(var _9 in _7){
_8[_9]=_7[_9];
}
}
return _8;
};
dojo.declare("dojox.grid.enhanced.plugins.filter._FilterLayerMixin",null,{tags:["sizeChange"],name:function(){
return "filter";
},onFilterDefined:function(_a){
},onFiltered:function(_b,_c){
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.ServerSideFilterLayer",[ns._ServerSideLayer,ns.filter._FilterLayerMixin],{constructor:function(_d){
this._onUserCommandLoad=_d.setupFilterQuery||this._onUserCommandLoad;
this.filterDef(null);
},filterDef:function(_e){
if(_e){
this._filter=_e;
var _f=_e.toObject();
this.command(_1,this._isStateful?dojo.toJson(_f):_f);
this.command(_2,null);
this.useCommands(true);
this.onFilterDefined(_e);
}else{
if(_e===null){
this._filter=null;
this.command(_1,null);
this.command(_2,true);
this.useCommands(true);
this.onFilterDefined(null);
}
}
return this._filter;
},onCommandLoad:function(_10,_11){
this.inherited(arguments);
var _12=_11.onBegin;
if(this._isStateful){
var _13;
if(_10){
this.command(_1,null);
this.command(_2,null);
this.useCommands(false);
var _14=_10.split(",");
if(_14.length>=2){
_13=this._filteredSize=parseInt(_14[0],10);
this.onFiltered(_13,parseInt(_14[1],10));
}else{
return;
}
}else{
_13=this._filteredSize;
}
if(this.enabled()){
_11.onBegin=function(_15,req){
_3(_11.scope,_12)(_13,req);
};
}
}else{
var _16=this;
_11.onBegin=function(_17,req){
if(!_16._filter){
_16._storeSize=_17;
}
_16.onFiltered(_17,_16._storeSize||_17);
req.onBegin=_12;
_3(_11.scope,_12)(_17,req);
};
}
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.ClientSideFilterLayer",[ns._StoreLayer,ns.filter._FilterLayerMixin],{_storeSize:-1,_fetchAll:true,constructor:function(_18){
this.filterDef(null);
_18=dojo.isObject(_18)?_18:{};
this.fetchAllOnFirstFilter(_18.fetchAll);
this._getter=dojo.isFunction(_18.getter)?_18.getter:this._defaultGetter;
},_defaultGetter:function(_19,_1a,_1b,_1c){
return _1c.getValue(_19,_1a);
},filterDef:function(_1d){
if(_1d!==undefined){
this._filter=_1d;
this.invalidate();
this.onFilterDefined(_1d);
}
return this._filter;
},setGetter:function(_1e){
if(dojo.isFunction(_1e)){
this._getter=_1e;
}
},fetchAllOnFirstFilter:function(_1f){
if(_1f!==undefined){
this._fetchAll=!!_1f;
}
return this._fetchAll;
},invalidate:function(){
this._items=[];
this._nextUnfetchedIdx=0;
this._result=[];
this._indexMap=[];
this._resultStartIdx=0;
},_fetch:function(_20,_21){
if(!this._filter){
var _22=_20.onBegin,_23=this;
_20.onBegin=function(_24,r){
_3(_20.scope,_22)(_24,r);
_23.onFiltered(_24,_24);
};
this.originFetch(_20);
return _20;
}
try{
var _25=_21?_21._nextResultItemIdx:_20.start;
_25=_25||0;
if(!_21){
this._result=[];
this._resultStartIdx=_25;
var _26;
if(dojo.isArray(_20.sort)&&_20.sort.length>0&&(_26=dojo.toJson(_20.sort))!=this._lastSortInfo){
this.invalidate();
this._lastSortInfo=_26;
}
}
var end=typeof _20.count=="number"?_25+_20.count-this._result.length:this._items.length;
if(this._result.length){
this._result=this._result.concat(this._items.slice(_25,end));
}else{
this._result=this._items.slice(_20.start,typeof _20.count=="number"?_20.start+_20.count:this._items.length);
}
if(this._result.length>=_20.count||this._hasReachedStoreEnd()){
this._completeQuery(_20);
}else{
if(!_21){
_21=_6(_20);
_21.onBegin=dojo.hitch(this,this._onFetchBegin);
_21.onComplete=dojo.hitch(this,function(_27,req){
this._nextUnfetchedIdx+=_27.length;
this._doFilter(_27,req.start,_20);
this._fetch(_20,req);
});
}
_21.start=this._nextUnfetchedIdx;
if(this._fetchAll){
delete _21.count;
}
_21._nextResultItemIdx=end<this._items.length?end:this._items.length;
this.originFetch(_21);
}
}
catch(e){
if(_20.onError){
_3(_20.scope,_20.onError)(e,_20);
}else{
throw e;
}
}
return _20;
},_hasReachedStoreEnd:function(){
return this._storeSize>=0&&this._nextUnfetchedIdx>=this._storeSize;
},_applyFilter:function(_28,_29){
var g=this._getter,s=this._store;
try{
return !!(this._filter.applyRow(_28,function(_2a,arg){
return g(_2a,arg,_29,s);
}).getValue());
}
catch(e){
console.warn("FilterLayer._applyFilter() error: ",e);
return false;
}
},_doFilter:function(_2b,_2c,_2d){
for(var i=0,cnt=0;i<_2b.length;++i){
if(this._applyFilter(_2b[i],_2c+i)){
_3(_2d.scope,_2d.onItem)(_2b[i],_2d);
cnt+=this._addCachedItems(_2b[i],this._items.length);
this._indexMap.push(_2c+i);
}
}
},_onFetchBegin:function(_2e,req){
this._storeSize=_2e;
},_completeQuery:function(_2f){
var _30=this._items.length;
if(this._nextUnfetchedIdx<this._storeSize){
_30++;
}
_3(_2f.scope,_2f.onBegin)(_30,_2f);
this.onFiltered(this._items.length,this._storeSize);
_3(_2f.scope,_2f.onComplete)(this._result,_2f);
},_addCachedItems:function(_31,_32){
if(!dojo.isArray(_31)){
_31=[_31];
}
for(var k=0;k<_31.length;++k){
this._items[_32+k]=_31[k];
}
return _31.length;
},onRowMappingChange:function(_33){
if(this._filter){
var m=dojo.clone(_33),_34={};
for(var r in m){
r=parseInt(r,10);
_33[this._indexMap[r]]=this._indexMap[m[r]];
if(!_34[this._indexMap[r]]){
_34[this._indexMap[r]]=true;
}
if(!_34[r]){
_34[r]=true;
delete _33[r];
}
}
}
}});
})();
}
