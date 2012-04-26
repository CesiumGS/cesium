/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.contrib.data"]){
dojo._hasResource["dojox.dtl.contrib.data"]=true;
dojo.provide("dojox.dtl.contrib.data");
dojo.require("dojox.dtl._base");
(function(){
var dd=dojox.dtl;
var _1=dd.contrib.data;
var _2=true;
_1._BoundItem=dojo.extend(function(_3,_4){
this.item=_3;
this.store=_4;
},{get:function(_5){
var _6=this.store;
var _7=this.item;
if(_5=="getLabel"){
return _6.getLabel(_7);
}else{
if(_5=="getAttributes"){
return _6.getAttributes(_7);
}else{
if(_5=="getIdentity"){
if(_6.getIdentity){
return _6.getIdentity(_7);
}
return "Store has no identity API";
}else{
if(!_6.hasAttribute(_7,_5)){
if(_5.slice(-1)=="s"){
if(_2){
_2=false;
dojo.deprecated("You no longer need an extra s to call getValues, it can be figured out automatically");
}
_5=_5.slice(0,-1);
}
if(!_6.hasAttribute(_7,_5)){
return;
}
}
var _8=_6.getValues(_7,_5);
if(!_8){
return;
}
if(!dojo.isArray(_8)){
return new _1._BoundItem(_8,_6);
}
_8=dojo.map(_8,function(_9){
if(dojo.isObject(_9)&&_6.isItem(_9)){
return new _1._BoundItem(_9,_6);
}
return _9;
});
_8.get=_1._get;
return _8;
}
}
}
}});
_1._BoundItem.prototype.get.safe=true;
_1.BindDataNode=dojo.extend(function(_a,_b,_c,_d){
this.items=_a&&new dd._Filter(_a);
this.query=_b&&new dd._Filter(_b);
this.store=new dd._Filter(_c);
this.alias=_d;
},{render:function(_e,_f){
var _10=this.items&&this.items.resolve(_e);
var _11=this.query&&this.query.resolve(_e);
var _12=this.store.resolve(_e);
if(!_12||!_12.getFeatures){
throw new Error("data_bind didn't receive a store");
}
if(_11){
var _13=false;
_12.fetch({query:_11,sync:true,scope:this,onComplete:function(it){
_13=true;
_10=it;
}});
if(!_13){
throw new Error("The bind_data tag only works with a query if the store executed synchronously");
}
}
var _14=[];
if(_10){
for(var i=0,_15;_15=_10[i];i++){
_14.push(new _1._BoundItem(_15,_12));
}
}
_e[this.alias]=_14;
return _f;
},unrender:function(_16,_17){
return _17;
},clone:function(){
return this;
}});
dojo.mixin(_1,{_get:function(key){
if(this.length){
return (this[0] instanceof _1._BoundItem)?this[0].get(key):this[0][key];
}
},bind_data:function(_18,_19){
var _1a=_19.contents.split();
if(_1a[2]!="to"||_1a[4]!="as"||!_1a[5]){
throw new Error("data_bind expects the format: 'data_bind items to store as varName'");
}
return new _1.BindDataNode(_1a[1],null,_1a[3],_1a[5]);
},bind_query:function(_1b,_1c){
var _1d=_1c.contents.split();
if(_1d[2]!="to"||_1d[4]!="as"||!_1d[5]){
throw new Error("data_bind expects the format: 'bind_query query to store as varName'");
}
return new _1.BindDataNode(null,_1d[1],_1d[3],_1d[5]);
}});
_1._get.safe=true;
dd.register.tags("dojox.dtl.contrib",{"data":["bind_data","bind_query"]});
})();
}
