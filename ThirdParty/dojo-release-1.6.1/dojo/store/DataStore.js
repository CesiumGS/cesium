/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.store.DataStore"]){
dojo._hasResource["dojo.store.DataStore"]=true;
dojo.provide("dojo.store.DataStore");
dojo.require("dojo.store.util.QueryResults");
dojo.declare("dojo.store.DataStore",null,{target:"",constructor:function(_1){
dojo.mixin(this,_1);
},_objectConverter:function(_2){
var _3=this.store;
return function(_4){
var _5={};
var _6=_3.getAttributes(_4);
for(var i=0;i<_6.length;i++){
_5[_6[i]]=_3.getValue(_4,_6[i]);
}
return _2(_5);
};
},get:function(id,_7){
var _8,_9;
var _a=new dojo.Deferred();
this.store.fetchItemByIdentity({identity:id,onItem:this._objectConverter(function(_b){
_a.resolve(_8=_b);
}),onError:function(_c){
_a.reject(_9=_c);
}});
if(_8){
return _8;
}
if(_9){
throw _9;
}
return _a.promise;
},put:function(_d,_e){
var id=_e&&typeof _e.id!="undefined"||this.getIdentity(_d);
var _f=this.store;
if(typeof id=="undefined"){
_f.newItem(_d);
}else{
_f.fetchItemByIdentity({identity:id,onItem:function(_10){
if(_10){
for(var i in _d){
if(_f.getValue(_10,i)!=_d[i]){
_f.setValue(_10,i,_d[i]);
}
}
}else{
_f.newItem(_d);
}
}});
}
},remove:function(id){
var _11=this.store;
this.store.fetchItemByIdentity({identity:id,onItem:function(_12){
_11.deleteItem(_12);
}});
},query:function(_13,_14){
var _15,_16;
var _17=new dojo.Deferred();
_17.total=new dojo.Deferred();
var _18=this._objectConverter(function(_19){
return _19;
});
this.store.fetch(dojo.mixin({query:_13,onBegin:function(_1a){
_17.total.resolve(_1a);
},onComplete:function(_1b){
_17.resolve(dojo.map(_1b,_18));
},onError:function(_1c){
_17.reject(_1c);
}},_14));
return dojo.store.util.QueryResults(_17);
},getIdentity:function(_1d){
return _1d[this.idProperty||this.store.getIdentityAttributes()[0]];
}});
}
