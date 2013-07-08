/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/store/Memory",["../_base/declare","./util/QueryResults","./util/SimpleQueryEngine"],function(_1,_2,_3){
var _4=null;
return _1("dojo.store.Memory",_4,{constructor:function(_5){
for(var i in _5){
this[i]=_5[i];
}
this.setData(this.data||[]);
},data:null,idProperty:"id",index:null,queryEngine:_3,get:function(id){
return this.data[this.index[id]];
},getIdentity:function(_6){
return _6[this.idProperty];
},put:function(_7,_8){
var _9=this.data,_a=this.index,_b=this.idProperty;
var id=_7[_b]=(_8&&"id" in _8)?_8.id:_b in _7?_7[_b]:Math.random();
if(id in _a){
if(_8&&_8.overwrite===false){
throw new Error("Object already exists");
}
_9[_a[id]]=_7;
}else{
_a[id]=_9.push(_7)-1;
}
return id;
},add:function(_c,_d){
(_d=_d||{}).overwrite=false;
return this.put(_c,_d);
},remove:function(id){
var _e=this.index;
var _f=this.data;
if(id in _e){
_f.splice(_e[id],1);
this.setData(_f);
return true;
}
},query:function(_10,_11){
return _2(this.queryEngine(_10,_11)(this.data));
},setData:function(_12){
if(_12.items){
this.idProperty=_12.identifier;
_12=this.data=_12.items;
}else{
this.data=_12;
}
this.index={};
for(var i=0,l=_12.length;i<l;i++){
this.index[_12[i][this.idProperty]]=i;
}
}});
});
