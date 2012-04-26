/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.RailsStore"]){
dojo._hasResource["dojox.data.RailsStore"]=true;
dojo.provide("dojox.data.RailsStore");
dojo.require("dojox.data.JsonRestStore");
dojo.declare("dojox.data.RailsStore",dojox.data.JsonRestStore,{constructor:function(){
},preamble:function(_1){
if(typeof _1.target=="string"&&!_1.service){
var _2=_1.target.replace(/\/$/g,"");
var _3=function(id,_4){
_4=_4||{};
var _5=_2;
var _6;
var _7;
if(dojo.isObject(id)){
_7="";
_6="?"+dojo.objectToQuery(id);
}else{
if(_4.queryStr&&_4.queryStr.indexOf("?")!=-1){
_7=_4.queryStr.replace(/\?.*/,"");
_6=_4.queryStr.replace(/[^?]*\?/g,"?");
}else{
if(dojo.isString(_4.query)&&_4.query.indexOf("?")!=-1){
_7=_4.query.replace(/\?.*/,"");
_6=_4.query.replace(/[^?]*\?/g,"?");
}else{
_7=id?id.toString():"";
_6="";
}
}
}
if(_7.indexOf("=")!=-1){
_6=_7;
_7="";
}
if(_7){
_5=_5+"/"+_7+".json"+_6;
}else{
_5=_5+".json"+_6;
}
var _8=dojox.rpc._sync;
dojox.rpc._sync=false;
return {url:_5,handleAs:"json",contentType:"application/json",sync:_8,headers:{Accept:"application/json,application/javascript",Range:_4&&(_4.start>=0||_4.count>=0)?"items="+(_4.start||"0")+"-"+((_4.count&&(_4.count+(_4.start||0)-1))||""):undefined}};
};
_1.service=dojox.rpc.Rest(this.target,true,null,_3);
}
},fetch:function(_9){
_9=_9||{};
function _a(_b){
function _c(){
if(_9.queryStr==null){
_9.queryStr="";
}
if(dojo.isObject(_9.query)){
_9.queryStr="?"+dojo.objectToQuery(_9.query);
}else{
if(dojo.isString(_9.query)){
_9.queryStr=_9.query;
}
}
};
function _d(){
if(_9.queryStr.indexOf("?")==-1){
return "?";
}else{
return "&";
}
};
if(_9.queryStr==null){
_c();
}
_9.queryStr=_9.queryStr+_d()+dojo.objectToQuery(_b);
};
if(_9.start||_9.count){
if((_9.start||0)%_9.count){
throw new Error("The start parameter must be a multiple of the count parameter");
}
_a({page:((_9.start||0)/_9.count)+1,per_page:_9.count});
}
if(_9.sort){
var _e={sortBy:[],sortDir:[]};
dojo.forEach(_9.sort,function(_f){
_e.sortBy.push(_f.attribute);
_e.sortDir.push(!!_f.descending?"DESC":"ASC");
});
_a(_e);
delete _9.sort;
}
return this.inherited(arguments);
},_processResults:function(_10,_11){
var _12;
if((typeof this.rootAttribute=="undefined")&&_10[0]){
if(_10[0][this.idAttribute]){
this.rootAttribute=false;
}else{
for(var _13 in _10[0]){
if(_10[0][_13][this.idAttribute]){
this.rootAttribute=_13;
}
}
}
}
if(this.rootAttribute){
_12=dojo.map(_10,function(_14){
return _14[this.rootAttribute];
},this);
}else{
_12=_10;
}
var _15=_10.length;
return {totalCount:_11.fullLength||(_11.request.count==_15?(_11.request.start||0)+_15*2:_15),items:_12};
}});
}
