/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.rpc.JsonRest"]){
dojo._hasResource["dojox.rpc.JsonRest"]=true;
dojo.provide("dojox.rpc.JsonRest");
dojo.require("dojox.json.ref");
dojo.require("dojox.rpc.Rest");
var dirtyObjects=[];
var Rest=dojox.rpc.Rest;
var jr;
function resolveJson(_1,_2,_3,_4){
var _5=_2.ioArgs&&_2.ioArgs.xhr&&_2.ioArgs.xhr.getResponseHeader("Last-Modified");
if(_5&&Rest._timeStamps){
Rest._timeStamps[_4]=_5;
}
var _6=_1._schema&&_1._schema.hrefProperty;
if(_6){
dojox.json.ref.refAttribute=_6;
}
_3=_3&&dojox.json.ref.resolveJson(_3,{defaultId:_4,index:Rest._index,timeStamps:_5&&Rest._timeStamps,time:_5,idPrefix:_1.servicePath.replace(/[^\/]*$/,""),idAttribute:jr.getIdAttribute(_1),schemas:jr.schemas,loader:jr._loader,idAsRef:_1.idAsRef,assignAbsoluteIds:true});
dojox.json.ref.refAttribute="$ref";
return _3;
};
jr=dojox.rpc.JsonRest={serviceClass:dojox.rpc.Rest,conflictDateHeader:"If-Unmodified-Since",commit:function(_7){
_7=_7||{};
var _8=[];
var _9={};
var _a=[];
for(var i=0;i<dirtyObjects.length;i++){
var _b=dirtyObjects[i];
var _c=_b.object;
var _d=_b.old;
var _e=false;
if(!(_7.service&&(_c||_d)&&(_c||_d).__id.indexOf(_7.service.servicePath))&&_b.save){
delete _c.__isDirty;
if(_c){
if(_d){
var _f;
if((_f=_c.__id.match(/(.*)#.*/))){
_c=Rest._index[_f[1]];
}
if(!(_c.__id in _9)){
_9[_c.__id]=_c;
if(_7.incrementalUpdates&&!_f){
var _10=(typeof _7.incrementalUpdates=="function"?_7.incrementalUpdates:function(){
_10={};
for(var j in _c){
if(_c.hasOwnProperty(j)){
if(_c[j]!==_d[j]){
_10[j]=_c[j];
}
}else{
if(_d.hasOwnProperty(j)){
return null;
}
}
}
return _10;
})(_c,_d);
}
if(_10){
_8.push({method:"post",target:_c,content:_10});
}else{
_8.push({method:"put",target:_c,content:_c});
}
}
}else{
var _11=jr.getServiceAndId(_c.__id).service;
var _12=jr.getIdAttribute(_11);
if((_12 in _c)&&!_7.alwaysPostNewItems){
_8.push({method:"put",target:_c,content:_c});
}else{
_8.push({method:"post",target:{__id:_11.servicePath},content:_c});
}
}
}else{
if(_d){
_8.push({method:"delete",target:_d});
}
}
_a.push(_b);
dirtyObjects.splice(i--,1);
}
}
dojo.connect(_7,"onError",function(){
if(_7.revertOnError!==false){
var _13=dirtyObjects;
dirtyObjects=_a;
var _14=0;
jr.revert();
dirtyObjects=_13;
}else{
dirtyObjects=dirtyObject.concat(_a);
}
});
jr.sendToServer(_8,_7);
return _8;
},sendToServer:function(_15,_16){
var _17;
var _18=dojo.xhr;
var _19=_15.length;
var i,_1a;
var _1b;
var _1c=this.conflictDateHeader;
dojo.xhr=function(_1d,_1e){
_1e.headers=_1e.headers||{};
_1e.headers["Transaction"]=_15.length-1==i?"commit":"open";
if(_1c&&_1b){
_1e.headers[_1c]=_1b;
}
if(_1a){
_1e.headers["Content-ID"]="<"+_1a+">";
}
return _18.apply(dojo,arguments);
};
for(i=0;i<_15.length;i++){
var _1f=_15[i];
dojox.rpc.JsonRest._contentId=_1f.content&&_1f.content.__id;
var _20=_1f.method=="post";
_1b=_1f.method=="put"&&Rest._timeStamps[_1f.content.__id];
if(_1b){
Rest._timeStamps[_1f.content.__id]=(new Date())+"";
}
_1a=_20&&dojox.rpc.JsonRest._contentId;
var _21=jr.getServiceAndId(_1f.target.__id);
var _22=_21.service;
var dfd=_1f.deferred=_22[_1f.method](_21.id.replace(/#/,""),dojox.json.ref.toJson(_1f.content,false,_22.servicePath,true));
(function(_23,dfd,_24){
dfd.addCallback(function(_25){
try{
var _26=dfd.ioArgs.xhr&&dfd.ioArgs.xhr.getResponseHeader("Location");
if(_26){
var _27=_26.match(/(^\w+:\/\/)/)&&_26.indexOf(_24.servicePath);
_26=_27>0?_26.substring(_27):(_24.servicePath+_26).replace(/^(.*\/)?(\w+:\/\/)|[^\/\.]+\/\.\.\/|^.*\/(\/)/,"$2$3");
_23.__id=_26;
Rest._index[_26]=_23;
}
_25=resolveJson(_24,dfd,_25,_23&&_23.__id);
}
catch(e){
}
if(!(--_19)){
if(_16.onComplete){
_16.onComplete.call(_16.scope,_15);
}
}
return _25;
});
})(_1f.content,dfd,_22);
dfd.addErrback(function(_28){
_19=-1;
_16.onError.call(_16.scope,_28);
});
}
dojo.xhr=_18;
},getDirtyObjects:function(){
return dirtyObjects;
},revert:function(_29){
for(var i=dirtyObjects.length;i>0;){
i--;
var _2a=dirtyObjects[i];
var _2b=_2a.object;
var old=_2a.old;
var _2c=dojox.data._getStoreForItem(_2b||old);
if(!(_29&&(_2b||old)&&(_2b||old).__id.indexOf(_29.servicePath))){
if(_2b&&old){
for(var j in old){
if(old.hasOwnProperty(j)&&_2b[j]!==old[j]){
if(_2c){
_2c.onSet(_2b,j,_2b[j],old[j]);
}
_2b[j]=old[j];
}
}
for(j in _2b){
if(!old.hasOwnProperty(j)){
if(_2c){
_2c.onSet(_2b,j,_2b[j]);
}
delete _2b[j];
}
}
}else{
if(!old){
if(_2c){
_2c.onDelete(_2b);
}
}else{
if(_2c){
_2c.onNew(old);
}
}
}
delete (_2b||old).__isDirty;
dirtyObjects.splice(i,1);
}
}
},changing:function(_2d,_2e){
if(!_2d.__id){
return;
}
_2d.__isDirty=true;
for(var i=0;i<dirtyObjects.length;i++){
var _2f=dirtyObjects[i];
if(_2d==_2f.object){
if(_2e){
_2f.object=false;
if(!this._saveNotNeeded){
_2f.save=true;
}
}
return;
}
}
var old=_2d instanceof Array?[]:{};
for(i in _2d){
if(_2d.hasOwnProperty(i)){
old[i]=_2d[i];
}
}
dirtyObjects.push({object:!_2e&&_2d,old:old,save:!this._saveNotNeeded});
},deleteObject:function(_30){
this.changing(_30,true);
},getConstructor:function(_31,_32){
if(typeof _31=="string"){
var _33=_31;
_31=new dojox.rpc.Rest(_31,true);
this.registerService(_31,_33,_32);
}
if(_31._constructor){
return _31._constructor;
}
_31._constructor=function(_34){
var _35=this;
var _36=arguments;
var _37;
var _38;
function _39(_3a){
if(_3a){
_39(_3a["extends"]);
_37=_3a.properties;
for(var i in _37){
var _3b=_37[i];
if(_3b&&(typeof _3b=="object")&&("default" in _3b)){
_35[i]=_3b["default"];
}
}
}
if(_3a&&_3a.prototype&&_3a.prototype.initialize){
_38=true;
_3a.prototype.initialize.apply(_35,_36);
}
};
_39(_31._schema);
if(!_38&&_34&&typeof _34=="object"){
dojo.mixin(_35,_34);
}
var _3c=jr.getIdAttribute(_31);
Rest._index[this.__id=this.__clientId=_31.servicePath+(this[_3c]||Math.random().toString(16).substring(2,14)+"@"+((dojox.rpc.Client&&dojox.rpc.Client.clientId)||"client"))]=this;
if(dojox.json.schema&&_37){
dojox.json.schema.mustBeValid(dojox.json.schema.validate(this,_31._schema));
}
dirtyObjects.push({object:this,save:true});
};
return dojo.mixin(_31._constructor,_31._schema,{load:_31});
},fetch:function(_3d){
var _3e=jr.getServiceAndId(_3d);
return this.byId(_3e.service,_3e.id);
},getIdAttribute:function(_3f){
var _40=_3f._schema;
var _41;
if(_40){
if(!(_41=_40._idAttr)){
for(var i in _40.properties){
if(_40.properties[i].identity||(_40.properties[i].link=="self")){
_40._idAttr=_41=i;
}
}
}
}
return _41||"id";
},getServiceAndId:function(_42){
var _43="";
for(var _44 in jr.services){
if((_42.substring(0,_44.length)==_44)&&(_44.length>=_43.length)){
_43=_44;
}
}
if(_43){
return {service:jr.services[_43],id:_42.substring(_43.length)};
}
var _45=_42.match(/^(.*\/)([^\/]*)$/);
return {service:new jr.serviceClass(_45[1],true),id:_45[2]};
},services:{},schemas:{},registerService:function(_46,_47,_48){
_47=_46.servicePath=_47||_46.servicePath;
_46._schema=jr.schemas[_47]=_48||_46._schema||{};
jr.services[_47]=_46;
},byId:function(_49,id){
var _4a,_4b=Rest._index[(_49.servicePath||"")+id];
if(_4b&&!_4b._loadObject){
_4a=new dojo.Deferred();
_4a.callback(_4b);
return _4a;
}
return this.query(_49,id);
},query:function(_4c,id,_4d){
var _4e=_4c(id,_4d);
_4e.addCallback(function(_4f){
if(_4f.nodeType&&_4f.cloneNode){
return _4f;
}
return resolveJson(_4c,_4e,_4f,typeof id!="string"||(_4d&&(_4d.start||_4d.count))?undefined:id);
});
return _4e;
},_loader:function(_50){
var _51=jr.getServiceAndId(this.__id);
var _52=this;
jr.query(_51.service,_51.id).addBoth(function(_53){
if(_53==_52){
delete _53.$ref;
delete _53._loadObject;
}else{
_52._loadObject=function(_54){
_54(_53);
};
}
_50(_53);
});
},isDirty:function(_55){
if(!_55){
return !!dirtyObjects.length;
}
return _55.__isDirty;
}};
}
