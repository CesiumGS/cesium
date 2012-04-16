/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


define([],function(){
dojo.declare("dojo.store.api.Store",null,{idProperty:"id",queryEngine:null,get:function(id){
},getIdentity:function(_1){
},put:function(_2,_3){
},add:function(_4,_5){
},remove:function(id){
delete this.index[id];
var _6=this.data,_7=this.idProperty;
for(var i=0,l=_6.length;i<l;i++){
if(_6[i][_7]==id){
_6.splice(i,1);
return;
}
}
},query:function(_8,_9){
},transaction:function(){
},getChildren:function(_a,_b){
},getMetadata:function(_c){
}});
dojo.store.api.Store.PutDirectives=function(id,_d,_e,_f){
this.id=id;
this.before=_d;
this.parent=_e;
this.overwrite=_f;
};
dojo.store.api.Store.SortInformation=function(_10,_11){
this.attribute=_10;
this.descending=_11;
};
dojo.store.api.Store.QueryOptions=function(_12,_13,_14){
this.sort=_12;
this.start=_13;
this.count=_14;
};
dojo.declare("dojo.store.api.Store.QueryResults",null,{forEach:function(_15,_16){
},filter:function(_17,_18){
},map:function(_19,_1a){
},then:function(_1b,_1c){
},observe:function(_1d,_1e){
},total:0});
dojo.declare("dojo.store.api.Store.Transaction",null,{commit:function(){
},abort:function(_1f,_20){
}});
});
