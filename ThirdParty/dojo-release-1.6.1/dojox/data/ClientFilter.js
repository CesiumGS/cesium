/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.ClientFilter"]){
dojo._hasResource["dojox.data.ClientFilter"]=true;
dojo.provide("dojox.data.ClientFilter");
dojo.require("dojo.data.util.filter");
(function(){
var cf;
var _1=function(_2,_3,_4){
return function(_5){
_2._updates.push({create:_3&&_5,remove:_4&&_5});
cf.onUpdate();
};
};
cf=dojo.declare("dojox.data.ClientFilter",null,{cacheByDefault:false,constructor:function(){
this.onSet=_1(this,true,true);
this.onNew=_1(this,true,false);
this.onDelete=_1(this,false,true);
this._updates=[];
this._fetchCache=[];
},clearCache:function(){
this._fetchCache=[];
},updateResultSet:function(_6,_7){
if(this.isUpdateable(_7)){
for(var i=_7._version||0;i<this._updates.length;i++){
var _8=this._updates[i].create;
var _9=this._updates[i].remove;
if(_9){
for(var j=0;j<_6.length;j++){
if(this.getIdentity(_6[j])==this.getIdentity(_9)){
_6.splice(j--,1);
var _a=true;
}
}
}
if(_8&&this.matchesQuery(_8,_7)&&dojo.indexOf(_6,_8)==-1){
_6.push(_8);
_a=true;
}
}
if(_7.sort&&_a){
_6.sort(this.makeComparator(_7.sort.concat()));
}
_6._fullLength=_6.length;
if(_7.count&&_a&&_7.count!==Infinity){
_6.splice(_7.count,_6.length);
}
_7._version=this._updates.length;
return _a?2:1;
}
return 0;
},querySuperSet:function(_b,_c){
if(_b.query==_c.query){
return {};
}
if(!(_c.query instanceof Object&&(!_b.query||typeof _b.query=="object"))){
return false;
}
var _d=dojo.mixin({},_c.query);
for(var i in _b.query){
if(_d[i]==_b.query[i]){
delete _d[i];
}else{
if(!(typeof _b.query[i]=="string"&&dojo.data.util.filter.patternToRegExp(_b.query[i]).test(_d[i]))){
return false;
}
}
}
return _d;
},serverVersion:0,cachingFetch:function(_e){
var _f=this;
for(var i=0;i<this._fetchCache.length;i++){
var _10=this._fetchCache[i];
var _11=this.querySuperSet(_10,_e);
if(_11!==false){
var _12=_10._loading;
if(!_12){
_12=new dojo.Deferred();
_12.callback(_10.cacheResults);
}
_12.addCallback(function(_13){
_13=_f.clientSideFetch(dojo.mixin(dojo.mixin({},_e),{query:_11}),_13);
_12.fullLength=_13._fullLength;
return _13;
});
_e._version=_10._version;
break;
}
}
if(!_12){
var _14=dojo.mixin({},_e);
var _15=(_e.queryOptions||0).cache;
var _16=this._fetchCache;
if(_15===undefined?this.cacheByDefault:_15){
if(_e.start||_e.count){
delete _14.start;
delete _14.count;
_e.clientQuery=dojo.mixin(_e.clientQuery||{},{start:_e.start,count:_e.count});
}
_e=_14;
_16.push(_e);
}
_12=_e._loading=this._doQuery(_e);
_12.addErrback(function(){
_16.splice(dojo.indexOf(_16,_e),1);
});
}
var _17=this.serverVersion;
_12.addCallback(function(_18){
delete _e._loading;
if(_18){
_e._version=typeof _e._version=="number"?_e._version:_17;
_f.updateResultSet(_18,_e);
_e.cacheResults=_18;
if(!_e.count||_18.length<_e.count){
_12.fullLength=((_e.start)?_e.start:0)+_18.length;
}
}
return _18;
});
return _12;
},isUpdateable:function(_19){
return typeof _19.query=="object";
},clientSideFetch:function(_1a,_1b){
if(_1a.queryOptions&&_1a.queryOptions.results){
_1b=_1a.queryOptions.results;
}
if(_1a.query){
var _1c=[];
for(var i=0;i<_1b.length;i++){
var _1d=_1b[i];
if(_1d&&this.matchesQuery(_1d,_1a)){
_1c.push(_1b[i]);
}
}
}else{
_1c=_1a.sort?_1b.concat():_1b;
}
if(_1a.sort){
_1c.sort(this.makeComparator(_1a.sort.concat()));
}
return this.clientSidePaging(_1a,_1c);
},clientSidePaging:function(_1e,_1f){
var _20=_1e.start||0;
var _21=(_20||_1e.count)?_1f.slice(_20,_20+(_1e.count||_1f.length)):_1f;
_21._fullLength=_1f.length;
return _21;
},matchesQuery:function(_22,_23){
var _24=_23.query;
var _25=_23.queryOptions&&_23.queryOptions.ignoreCase;
for(var i in _24){
var _26=_24[i];
var _27=this.getValue(_22,i);
if((typeof _26=="string"&&(_26.match(/[\*\.]/)||_25))?!dojo.data.util.filter.patternToRegExp(_26,_25).test(_27):_27!=_26){
return false;
}
}
return true;
},makeComparator:function(_28){
var _29=_28.shift();
if(!_29){
return function(){
return 0;
};
}
var _2a=_29.attribute;
var _2b=!!_29.descending;
var _2c=this.makeComparator(_28);
var _2d=this;
return function(a,b){
var av=_2d.getValue(a,_2a);
var bv=_2d.getValue(b,_2a);
if(av!=bv){
return av<bv==_2b?1:-1;
}
return _2c(a,b);
};
}});
cf.onUpdate=function(){
};
})();
}
