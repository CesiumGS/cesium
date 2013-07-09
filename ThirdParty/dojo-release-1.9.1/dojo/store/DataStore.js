/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/store/DataStore",["../_base/lang","../_base/declare","../Deferred","../_base/array","./util/QueryResults","./util/SimpleQueryEngine"],function(_1,_2,_3,_4,_5,_6){
var _7=null;
return _2("dojo.store.DataStore",_7,{target:"",constructor:function(_8){
_1.mixin(this,_8);
if(!"idProperty" in _8){
var _9;
try{
_9=this.store.getIdentityAttributes();
}
catch(e){
}
this.idProperty=(!_9||!idAttributes[0])||this.idProperty;
}
var _a=this.store.getFeatures();
if(!_a["dojo.data.api.Read"]){
this.get=null;
}
if(!_a["dojo.data.api.Identity"]){
this.getIdentity=null;
}
if(!_a["dojo.data.api.Write"]){
this.put=this.add=null;
}
},idProperty:"id",store:null,queryEngine:_6,_objectConverter:function(_b){
var _c=this.store;
var _d=this.idProperty;
function _e(_f){
var _10={};
var _11=_c.getAttributes(_f);
for(var i=0;i<_11.length;i++){
var _12=_11[i];
var _13=_c.getValues(_f,_12);
if(_13.length>1){
for(var j=0;j<_13.length;j++){
var _14=_13[j];
if(typeof _14=="object"&&_c.isItem(_14)){
_13[j]=_e(_14);
}
}
_14=_13;
}else{
var _14=_c.getValue(_f,_12);
if(typeof _14=="object"&&_c.isItem(_14)){
_14=_e(_14);
}
}
_10[_11[i]]=_14;
}
if(!(_d in _10)&&_c.getIdentity){
_10[_d]=_c.getIdentity(_f);
}
return _10;
};
return function(_15){
return _b(_e(_15));
};
},get:function(id,_16){
var _17,_18;
var _19=new _3();
this.store.fetchItemByIdentity({identity:id,onItem:this._objectConverter(function(_1a){
_19.resolve(_17=_1a);
}),onError:function(_1b){
_19.reject(_18=_1b);
}});
if(_17){
return _17;
}
if(_18){
throw _18;
}
return _19.promise;
},put:function(_1c,_1d){
var id=_1d&&typeof _1d.id!="undefined"||this.getIdentity(_1c);
var _1e=this.store;
var _1f=this.idProperty;
if(typeof id=="undefined"){
_1e.newItem(_1c);
_1e.save();
}else{
_1e.fetchItemByIdentity({identity:id,onItem:function(_20){
if(_20){
for(var i in _1c){
if(i!=_1f&&_1e.getValue(_20,i)!=_1c[i]){
_1e.setValue(_20,i,_1c[i]);
}
}
}else{
_1e.newItem(_1c);
}
_1e.save();
}});
}
},remove:function(id){
var _21=this.store;
this.store.fetchItemByIdentity({identity:id,onItem:function(_22){
_21.deleteItem(_22);
_21.save();
}});
},query:function(_23,_24){
var _25;
var _26=new _3(function(){
_25.abort&&_25.abort();
});
_26.total=new _3();
var _27=this._objectConverter(function(_28){
return _28;
});
_25=this.store.fetch(_1.mixin({query:_23,onBegin:function(_29){
_26.total.resolve(_29);
},onComplete:function(_2a){
_26.resolve(_4.map(_2a,_27));
},onError:function(_2b){
_26.reject(_2b);
}},_24));
return _5(_26);
},getIdentity:function(_2c){
return _2c[this.idProperty];
}});
});
