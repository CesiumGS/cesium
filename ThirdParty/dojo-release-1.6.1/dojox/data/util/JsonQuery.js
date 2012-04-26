/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.util.JsonQuery"]){
dojo._hasResource["dojox.data.util.JsonQuery"]=true;
dojo.provide("dojox.data.util.JsonQuery");
dojo.declare("dojox.data.util.JsonQuery",null,{useFullIdInQueries:false,_toJsonQuery:function(_1,_2){
var _3=true;
var _4=this;
function _5(_6,_7){
var _8=_7.__id;
if(_8){
var _9={};
_9[_4.idAttribute]=_4.useFullIdInQueries?_7.__id:_7[_4.idAttribute];
_7=_9;
}
for(var i in _7){
var _a=_7[i];
var _b=_6+(/^[a-zA-Z_][\w_]*$/.test(i)?"."+i:"["+dojo._escapeString(i)+"]");
if(_a&&typeof _a=="object"){
_5(_b,_a);
}else{
if(_a!="*"){
_c+=(_3?"":"&")+_b+((!_8&&typeof _a=="string"&&_1.queryOptions&&_1.queryOptions.ignoreCase)?"~":"=")+(_4.simplifiedQuery?encodeURIComponent(_a):dojo.toJson(_a));
_3=false;
}
}
}
};
if(_1.query&&typeof _1.query=="object"){
var _c="[?(";
_5("@",_1.query);
if(!_3){
_c+=")]";
}else{
_c="";
}
_1.queryStr=_c.replace(/\\"|"/g,function(t){
return t=="\""?"'":t;
});
}else{
if(!_1.query||_1.query=="*"){
_1.query="";
}
}
var _d=_1.sort;
if(_d){
_1.queryStr=_1.queryStr||(typeof _1.query=="string"?_1.query:"");
_3=true;
for(i=0;i<_d.length;i++){
_1.queryStr+=(_3?"[":",")+(_d[i].descending?"\\":"/")+"@["+dojo._escapeString(_d[i].attribute)+"]";
_3=false;
}
_1.queryStr+="]";
}
if(_2&&(_1.start||_1.count)){
_1.queryStr=(_1.queryStr||(typeof _1.query=="string"?_1.query:""))+"["+(_1.start||"")+":"+(_1.count?(_1.start||0)+_1.count:"")+"]";
}
if(typeof _1.queryStr=="string"){
_1.queryStr=_1.queryStr.replace(/\\"|"/g,function(t){
return t=="\""?"'":t;
});
return _1.queryStr;
}
return _1.query;
},jsonQueryPagination:true,fetch:function(_e){
this._toJsonQuery(_e,this.jsonQueryPagination);
return this.inherited(arguments);
},isUpdateable:function(){
return true;
},matchesQuery:function(_f,_10){
_10._jsonQuery=_10._jsonQuery||dojox.json.query(this._toJsonQuery(_10));
return _10._jsonQuery([_f]).length;
},clientSideFetch:function(_11,_12){
_11._jsonQuery=_11._jsonQuery||dojox.json.query(this._toJsonQuery(_11));
return this.clientSidePaging(_11,_11._jsonQuery(_12));
},querySuperSet:function(_13,_14){
if(!_13.query){
return _14.query;
}
return this.inherited(arguments);
}});
}
