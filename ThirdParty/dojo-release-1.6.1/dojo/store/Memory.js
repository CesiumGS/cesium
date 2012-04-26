/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.store.Memory"]){
dojo._hasResource["dojo.store.Memory"]=true;
dojo.provide("dojo.store.Memory");
dojo.require("dojo.store.util.QueryResults");
dojo.require("dojo.store.util.SimpleQueryEngine");
dojo.declare("dojo.store.Memory",null,{constructor:function(_1){
this.index={};
dojo.mixin(this,_1);
this.setData(this.data||[]);
},data:null,idProperty:"id",index:null,queryEngine:dojo.store.util.SimpleQueryEngine,get:function(id){
return this.index[id];
},getIdentity:function(_2){
return _2[this.idProperty];
},put:function(_3,_4){
var id=_4&&_4.id||_3[this.idProperty]||Math.random();
this.index[id]=_3;
var _5=this.data,_6=this.idProperty;
for(var i=0,l=_5.length;i<l;i++){
if(_5[i][_6]==id){
_5[i]=_3;
return id;
}
}
this.data.push(_3);
return id;
},add:function(_7,_8){
if(this.index[_8&&_8.id||_7[this.idProperty]]){
throw new Error("Object already exists");
}
return this.put(_7,_8);
},remove:function(id){
delete this.index[id];
var _9=this.data,_a=this.idProperty;
for(var i=0,l=_9.length;i<l;i++){
if(_9[i][_a]==id){
_9.splice(i,1);
return;
}
}
},query:function(_b,_c){
return dojo.store.util.QueryResults(this.queryEngine(_b,_c)(this.data));
},setData:function(_d){
if(_d.items){
this.idProperty=_d.identifier;
_d=this.data=_d.items;
}else{
this.data=_d;
}
for(var i=0,l=_d.length;i<l;i++){
var _e=_d[i];
this.index[_e[this.idProperty]]=_e;
}
}});
}
