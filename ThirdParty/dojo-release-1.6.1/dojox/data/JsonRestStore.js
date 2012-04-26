/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.JsonRestStore"]){
dojo._hasResource["dojox.data.JsonRestStore"]=true;
dojo.provide("dojox.data.JsonRestStore");
dojo.require("dojox.rpc.JsonRest");
dojo.require("dojox.data.ServiceStore");
dojo.declare("dojox.data.JsonRestStore",dojox.data.ServiceStore,{constructor:function(_1){
dojo.connect(dojox.rpc.Rest._index,"onUpdate",this,function(_2,_3,_4,_5){
var _6=this.service.servicePath;
if(!_2.__id){
}else{
if(_2.__id.substring(0,_6.length)==_6){
this.onSet(_2,_3,_4,_5);
}
}
});
this.idAttribute=this.idAttribute||"id";
if(typeof _1.target=="string"){
_1.target=_1.target.match(/\/$/)||this.allowNoTrailingSlash?_1.target:(_1.target+"/");
if(!this.service){
this.service=dojox.rpc.JsonRest.services[_1.target]||dojox.rpc.Rest(_1.target,true);
}
}
dojox.rpc.JsonRest.registerService(this.service,_1.target,this.schema);
this.schema=this.service._schema=this.schema||this.service._schema||{};
this.service._store=this;
this.service.idAsRef=this.idAsRef;
this.schema._idAttr=this.idAttribute;
var _7=dojox.rpc.JsonRest.getConstructor(this.service);
var _8=this;
this._constructor=function(_9){
_7.call(this,_9);
_8.onNew(this);
};
this._constructor.prototype=_7.prototype;
this._index=dojox.rpc.Rest._index;
},loadReferencedSchema:true,idAsRef:false,referenceIntegrity:true,target:"",allowNoTrailingSlash:false,newItem:function(_a,_b){
_a=new this._constructor(_a);
if(_b){
var _c=this.getValue(_b.parent,_b.attribute,[]);
_c=_c.concat([_a]);
_a.__parent=_c;
this.setValue(_b.parent,_b.attribute,_c);
}
return _a;
},deleteItem:function(_d){
var _e=[];
var _f=dojox.data._getStoreForItem(_d)||this;
if(this.referenceIntegrity){
dojox.rpc.JsonRest._saveNotNeeded=true;
var _10=dojox.rpc.Rest._index;
var _11=function(_12){
var _13;
_e.push(_12);
_12.__checked=1;
for(var i in _12){
if(i.substring(0,2)!="__"){
var _14=_12[i];
if(_14==_d){
if(_12!=_10){
if(_12 instanceof Array){
(_13=_13||[]).push(i);
}else{
(dojox.data._getStoreForItem(_12)||_f).unsetAttribute(_12,i);
}
}
}else{
if((typeof _14=="object")&&_14){
if(!_14.__checked){
_11(_14);
}
if(typeof _14.__checked=="object"&&_12!=_10){
(dojox.data._getStoreForItem(_12)||_f).setValue(_12,i,_14.__checked);
}
}
}
}
}
if(_13){
i=_13.length;
_12=_12.__checked=_12.concat();
while(i--){
_12.splice(_13[i],1);
}
return _12;
}
return null;
};
_11(_10);
dojox.rpc.JsonRest._saveNotNeeded=false;
var i=0;
while(_e[i]){
delete _e[i++].__checked;
}
}
dojox.rpc.JsonRest.deleteObject(_d);
_f.onDelete(_d);
},changing:function(_15,_16){
dojox.rpc.JsonRest.changing(_15,_16);
},setValue:function(_17,_18,_19){
var old=_17[_18];
var _1a=_17.__id?dojox.data._getStoreForItem(_17):this;
if(dojox.json.schema&&_1a.schema&&_1a.schema.properties){
dojox.json.schema.mustBeValid(dojox.json.schema.checkPropertyChange(_19,_1a.schema.properties[_18]));
}
if(_18==_1a.idAttribute){
throw new Error("Can not change the identity attribute for an item");
}
_1a.changing(_17);
_17[_18]=_19;
if(_19&&!_19.__parent){
_19.__parent=_17;
}
_1a.onSet(_17,_18,old,_19);
},setValues:function(_1b,_1c,_1d){
if(!dojo.isArray(_1d)){
throw new Error("setValues expects to be passed an Array object as its value");
}
this.setValue(_1b,_1c,_1d);
},unsetAttribute:function(_1e,_1f){
this.changing(_1e);
var old=_1e[_1f];
delete _1e[_1f];
this.onSet(_1e,_1f,old,undefined);
},save:function(_20){
if(!(_20&&_20.global)){
(_20=_20||{}).service=this.service;
}
if("syncMode" in _20?_20.syncMode:this.syncMode){
dojox.rpc._sync=true;
}
var _21=dojox.rpc.JsonRest.commit(_20);
this.serverVersion=this._updates&&this._updates.length;
return _21;
},revert:function(_22){
dojox.rpc.JsonRest.revert(_22&&_22.global&&this.service);
},isDirty:function(_23){
return dojox.rpc.JsonRest.isDirty(_23);
},isItem:function(_24,_25){
return _24&&_24.__id&&(_25||this.service==dojox.rpc.JsonRest.getServiceAndId(_24.__id).service);
},_doQuery:function(_26){
var _27=typeof _26.queryStr=="string"?_26.queryStr:_26.query;
var _28=dojox.rpc.JsonRest.query(this.service,_27,_26);
var _29=this;
if(this.loadReferencedSchema){
_28.addCallback(function(_2a){
var _2b=_28.ioArgs&&_28.ioArgs.xhr&&_28.ioArgs.xhr.getResponseHeader("Content-Type");
var _2c=_2b&&_2b.match(/definedby\s*=\s*([^;]*)/);
if(_2b&&!_2c){
_2c=_28.ioArgs.xhr.getResponseHeader("Link");
_2c=_2c&&_2c.match(/<([^>]*)>;\s*rel="?definedby"?/);
}
_2c=_2c&&_2c[1];
if(_2c){
var _2d=dojox.rpc.JsonRest.getServiceAndId((_29.target+_2c).replace(/^(.*\/)?(\w+:\/\/)|[^\/\.]+\/\.\.\/|^.*\/(\/)/,"$2$3"));
var _2e=dojox.rpc.JsonRest.byId(_2d.service,_2d.id);
_2e.addCallbacks(function(_2f){
dojo.mixin(_29.schema,_2f);
return _2a;
},function(_30){
console.error(_30);
return _2a;
});
return _2e;
}
return undefined;
});
}
return _28;
},_processResults:function(_31,_32){
var _33=_31.length;
return {totalCount:_32.fullLength||(_32.request.count==_33?(_32.request.start||0)+_33*2:_33),items:_31};
},getConstructor:function(){
return this._constructor;
},getIdentity:function(_34){
var id=_34.__clientId||_34.__id;
if(!id){
return id;
}
var _35=this.service.servicePath.replace(/[^\/]*$/,"");
return id.substring(0,_35.length)!=_35?id:id.substring(_35.length);
},fetchItemByIdentity:function(_36){
var id=_36.identity;
var _37=this;
if(id.toString().match(/^(\w*:)?\//)){
var _38=dojox.rpc.JsonRest.getServiceAndId(id);
_37=_38.service._store;
_36.identity=_38.id;
}
_36._prefix=_37.service.servicePath.replace(/[^\/]*$/,"");
return _37.inherited(arguments);
},onSet:function(){
},onNew:function(){
},onDelete:function(){
},getFeatures:function(){
var _39=this.inherited(arguments);
_39["dojo.data.api.Write"]=true;
_39["dojo.data.api.Notification"]=true;
return _39;
},getParent:function(_3a){
return _3a&&_3a.__parent;
}});
dojox.data.JsonRestStore.getStore=function(_3b,_3c){
if(typeof _3b.target=="string"){
_3b.target=_3b.target.match(/\/$/)||_3b.allowNoTrailingSlash?_3b.target:(_3b.target+"/");
var _3d=(dojox.rpc.JsonRest.services[_3b.target]||{})._store;
if(_3d){
return _3d;
}
}
return new (_3c||dojox.data.JsonRestStore)(_3b);
};
dojox.data._getStoreForItem=function(_3e){
if(_3e.__id){
var _3f=dojox.rpc.JsonRest.getServiceAndId(_3e.__id);
if(_3f&&_3f.service._store){
return _3f.service._store;
}else{
var _40=_3e.__id.toString().match(/.*\//)[0];
return new dojox.data.JsonRestStore({target:_40});
}
}
return null;
};
dojox.json.ref._useRefs=true;
}
